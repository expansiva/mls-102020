import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = '/Volumes/WagnerSSD1/collab/mls-base';
const repo20 = path.join(base, 'mls-102020');
const repo47 = path.join(base, 'mls-102047');
const evidence = path.dirname(fileURLToPath(import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const walk = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(folder, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const inventory = (root, files) => files.sort().map(file => {
  const content = readFileSync(file); const stat = statSync(file);
  return { path: path.relative(root, file).replaceAll(path.sep, '/'), sha256: sha256(content), bytes: stat.size, mtimeMs: stat.mtimeMs };
});
const hashInventory = rows => sha256(JSON.stringify(rows.map(({ path: name, sha256: hash, bytes }) => ({ path: name, sha256: hash, bytes }))));
const pagesOf = tree => tree.flatMap(item => [...(item.kind === 'page' ? [item] : []), ...pagesOf(Array.isArray(item.children) ? item.children : [])]);
const head = repo => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const status = repo => execFileSync('git', ['status', '--short'], { cwd: repo, encoding: 'utf8' }).trim().split('\n').filter(Boolean);

mkdirSync(evidence, { recursive: true });
const menuFile = path.join(repo47, 'l4/agendaClinica/pool/l2/web/menu.json');
const backendFile = path.join(repo47, 'l4/agendaClinica/pool/l2/web/backend.json');
const menu = JSON.parse(readFileSync(menuFile, 'utf8'));
const backend = JSON.parse(readFileSync(backendFile, 'utf8'));
const pages = pagesOf(menu.tree);
const organismCount = pages.reduce((sum, page) => sum + (page.organisms?.length || 0), 0);
const sourceFiles = walk(path.join(repo47, 'l4/agendaClinica/pool')).filter(file => statSync(file).isFile());
const categoryFiles = [path.join(repo20, 'l4/collabux/templates/categoryList.json'), ...walk(path.join(repo20, 'l2/agentDefsL2/skills/pageCategories')), path.join(repo20, 'l2/agentDefsL2/skills/genD2PageRenderTs.ts')];
const schemaFiles = walk(path.join(repo20, 'l2/agentDefsL2/schemas')).filter(file => /pagesJudgmentV[123]\.json$/u.test(file));
const codeFiles = [...walk(path.join(repo20, 'l2/agentDefsL2')), path.join(repo20, 'l2/molecules/ml-scenary.ts'), path.join(repo20, 'l2/molecules/ml-scenary.defs.ts')].filter(file => statSync(file).isFile());
const destinationRoot = path.join(repo47, 'l2/agendaClinica');
const destinationFiles = walk(destinationRoot).filter(file => file.endsWith('.defs.ts'));
const moleculeIndexes = walk(path.join(base, 'mls-102040/l2/molecules')).filter(file => file.endsWith('/index.defs.ts'));
const moleculeUsages = walk(path.join(repo20, 'l2/aura/molecules/skills')).filter(file => file.endsWith('/usage.ts'));
const sourceInventory = inventory(repo47, sourceFiles);
const categoryInventory = inventory(repo20, categoryFiles);
const schemaInventory = inventory(repo20, schemaFiles);
const codeInventory = inventory(repo20, codeFiles);
const destinationInventory = inventory(repo47, destinationFiles);
const moleculeInventory = inventory(base, [...moleculeIndexes, ...moleculeUsages]);
const report = {
  capturedAt: new Date().toISOString(),
  repositories: { 'mls-102020': { head: head(repo20), status: status(repo20) }, 'mls-102047': { head: head(repo47), status: status(repo47) } },
  sources: { hash: hashInventory(sourceInventory), files: sourceInventory, pages: pages.map(page => ({ pageId: page.id, organisms: page.organisms || [] })), pageCount: pages.length, organismCount, endpoints: backend.endpoints.length, uniqueRoutes: new Set(backend.endpoints.map(item => item.route)).size, usecases: backend.usecases.length, uniqueUsecaseIds: new Set(backend.usecases.map(item => item.usecaseId)).size },
  categorySkills: { hash: hashInventory(categoryInventory), files: categoryInventory },
  schemas: { hash: hashInventory(schemaInventory), files: schemaInventory },
  generatorCode: { hash: hashInventory(codeInventory), files: codeInventory.length },
  moleculeCatalog: { hash: hashInventory(moleculeInventory), indexes: moleculeIndexes.length, usages: moleculeUsages.length, files: moleculeInventory.length },
  destinationBefore: { hash: hashInventory(destinationInventory), defs: destinationInventory.length, files: destinationInventory },
  expectedFromCurrentSources: { defs: pages.length * 4, pageDefs: pages.length * 2, organismDescriptions: organismCount * 2, materializationItems: pages.length * 3 },
  limits: { runBySupervisor: true, maxCostUsd: 6, collabmsgByExecutor: false, materializeTs: false, commit: false, push: false },
};
writeFileSync(path.join(evidence, 'preflight.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`preflight pages=${pages.length} organisms=${organismCount} defsBefore=${destinationInventory.length} sourceHash=${report.sources.hash}`);
