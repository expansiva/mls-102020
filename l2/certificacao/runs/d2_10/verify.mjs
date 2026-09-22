import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = '/Volumes/WagnerSSD1/collab/mls-base/mls-102047';
const web = path.join(root, 'l2/agendaClinica/web');
const backendPath = path.join(root, 'l4/agendaClinica/pool/l2/web/backend.json');
const reportPath = path.join(root, 'l2/agendaClinica/pipeline/agentDefsL2/finalize60/report.json');
const evidence = path.dirname(new URL(import.meta.url).pathname);
const expectedPages = ['consultas_profissional', 'consultas_recepcionista', 'dados_profissional', 'dados_recepcionista', 'pacientes', 'profissionais'];
const fail = (message) => { throw new Error(message); };
const walk = (folder) => readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(folder, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const files = walk(web).sort();
const defs = files.filter(file => file.endsWith('.defs.ts'));
const unexpectedTs = files.filter(file => file.endsWith('.ts') && !file.endsWith('.defs.ts'));
const rel = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const sha256 = (source) => createHash('sha256').update(source).digest('hex');
const byFolder = Object.fromEntries(['contracts', 'shared', 'desktop/page11', 'mobile/page11'].map(folder => [folder,
  defs.filter(file => rel(file).includes(`/web/${folder}/`)).map(file => path.basename(file, '.defs.ts')).sort(),
]));
for (const [folder, pages] of Object.entries(byFolder)) {
  if (JSON.stringify(pages) !== JSON.stringify(expectedPages)) fail(`${folder} page set mismatch: ${JSON.stringify(pages)}`);
}
if (defs.length !== 24) fail(`expected 24 defs, got ${defs.length}`);
if (unexpectedTs.length) fail(`unexpected materialized .ts: ${unexpectedTs.map(rel).join(', ')}`);
if (defs.some(file => /cadastro_(?:profissional|recepcionista)\.defs\.ts$/.test(file))) fail('old proof page id found');

const backend = JSON.parse(readFileSync(backendPath, 'utf8'));
const backendRoutes = [...new Set(backend.endpoints.map(item => item.route))].sort();
const contractRoutes = defs.filter(file => rel(file).includes('/web/contracts/')).flatMap(file => {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/export const \w+Route = ["']([^"']+)["'] as const;/g)].map(match => match[1]);
}).sort();
if (JSON.stringify(contractRoutes) !== JSON.stringify(backendRoutes)) fail(`contract routes mismatch: ${contractRoutes.length}/${backendRoutes.length}`);

const pipelineItems = [];
for (const file of defs.filter(file => rel(file).includes('/web/shared/') || rel(file).includes('/web/desktop/page11/') || rel(file).includes('/web/mobile/page11/'))) {
  const source = readFileSync(file, 'utf8');
  const exports = [...source.matchAll(/^export const (\w+)\s*=/gm)].map(match => match[1]).sort();
  if (rel(file).includes('/page11/') && JSON.stringify(exports) !== JSON.stringify(['descriptions', 'pipeline'])) fail(`page exports mismatch: ${rel(file)} ${exports.join(',')}`);
  const match = /export const pipeline = ([\s\S]*?) as const;/.exec(source);
  if (!match) fail(`pipeline missing: ${rel(file)}`);
  const parsed = JSON.parse(match[1]);
  pipelineItems.push(...(Array.isArray(parsed) ? parsed : [parsed]));
}
const ids = pipelineItems.map(item => item.id);
if (pipelineItems.length !== 18 || new Set(ids).size !== 18) fail(`materialization graph mismatch: ${pipelineItems.length}/${new Set(ids).size}`);
const known = new Set(ids);
for (const item of pipelineItems) for (const dependency of item.dependsOn || []) if (!known.has(dependency)) fail(`unknown dependency ${dependency} from ${item.id}`);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
if (report.status !== 'complete' || report.pending.length || report.artifactPaths.length !== 24) fail('finalize report is not complete');
const inventory = defs.map(file => {
  const source = readFileSync(file);
  const stat = statSync(file);
  return { path: rel(file), sha256: sha256(source), bytes: stat.size, mtimeMs: stat.mtimeMs };
});
writeFileSync(path.join(evidence, process.argv[2] || 'inventory-generation.json'), `${JSON.stringify(inventory, null, 2)}\n`);
writeFileSync(path.join(evidence, process.argv[3] || 'verification-generation.json'), `${JSON.stringify({
  root, defs: defs.length, byFolder, backendRoutes: backendRoutes.length, contractRoutes: contractRoutes.length,
  materializationItems: pipelineItems.length, uniqueMaterializationIds: new Set(ids).size,
  pageExports: ['descriptions', 'pipeline'], unexpectedMaterializedTs: unexpectedTs.map(rel),
  report: { status: report.status, pending: report.pending, snapshotHash: report.snapshotHash, artifactPaths: report.artifactPaths.length },
}, null, 2)}\n`);
console.log(`verified ${defs.length} defs, ${contractRoutes.length} routes, ${pipelineItems.length} materialization items`);
