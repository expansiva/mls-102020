import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = '/Volumes/WagnerSSD1/collab/mls-base';
const repo20 = path.join(base, 'mls-102020');
const repo47 = path.join(base, 'mls-102047');
const evidence = path.dirname(fileURLToPath(import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const walk = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => { const full = path.join(folder, entry.name); return entry.isDirectory() ? walk(full) : [full]; });
const inventory = (root, files) => files.filter(existsSync).sort().map(file => { const content = readFileSync(file); const stat = statSync(file); return { path: path.relative(root, file).replaceAll(path.sep, '/'), sha256: sha256(content), bytes: stat.size, mtimeMs: stat.mtimeMs }; });
const hashInventory = rows => sha256(JSON.stringify(rows.map(({ path: name, sha256: hash, bytes }) => ({ path: name, sha256: hash, bytes }))));
const pagesOf = tree => tree.flatMap(item => [...(item.kind === 'page' ? [item] : []), ...pagesOf(Array.isArray(item.children) ? item.children : [])]);
const git = (repo, args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const status = repo => git(repo, ['status', '--short']).split('\n').filter(Boolean);
const json = file => JSON.parse(readFileSync(file, 'utf8'));

const accepted = ['558b15e5', '298c070f', 'bc9a1f2b'];
for (const commit of accepted) {
  try { git(repo20, ['cat-file', '-e', `${commit}^{commit}`]); } catch { fail(`accepted generator commit is missing: ${commit}`); }
}

const menu = json(path.join(repo47, 'l4/agendaClinica/pool/l2/web/menu.json'));
const backend = json(path.join(repo47, 'l4/agendaClinica/pool/l2/web/backend.json'));
const config = json(path.join(repo47, 'l5/config.json'));
const manifest = json(path.join(repo47, 'mlsDep.json'));
const pages = pagesOf(menu.tree);
const organisms = pages.reduce((sum, page) => sum + (page.organisms?.length || 0), 0);
const sourceFiles = walk(path.join(repo47, 'l4/agendaClinica/pool')).filter(file => statSync(file).isFile());
const l1Files = walk(path.join(repo47, 'l1')).filter(file => statSync(file).isFile());
const destinationRoot = path.join(repo47, 'l2/agendaClinica');
const destinationFiles = walk(destinationRoot).filter(file => file.endsWith('.defs.ts') || file.includes('/pipeline/agentDefsL2/'));
const generatorFiles = walk(path.join(repo20, 'l2/agentDefsL2')).filter(file => statSync(file).isFile());
const categoryFiles = [path.join(repo20, 'l4/collabux/templates/categoryList.json'), ...walk(path.join(repo20, 'l2/agentDefsL2/skills/pageCategories')), path.join(repo20, 'l2/agentDefsL2/skills/genD2PageRenderTs.ts')];
const sharedSkillFiles = [path.join(repo20, 'l2/agentDefsL2/skills/genD2SharedTs.ts')];
const runtimeFiles = ['stateLitElement.ts', 'collabLitElement.ts', 'bffClient.ts', 'collabState.ts', 'interactionRuntime.ts'].map(name => path.join(base, 'mls-102029/l2', name));
const designSystemFiles = [path.join(repo47, 'l2/designSystem.ts')];
const moleculeFiles = [path.join(base, 'mls-102040/l2/molecules/skill.ts'), ...walk(path.join(base, 'mls-102040/l2/molecules')).filter(file => file.endsWith('/index.defs.ts')), ...walk(path.join(repo20, 'l2/aura/molecules/skills')).filter(file => file.endsWith('/usage.ts'))];

const sourceInventory = inventory(repo47, sourceFiles);
const l1Inventory = inventory(repo47, l1Files);
const destinationInventory = inventory(repo47, destinationFiles);
const generatorInventory = inventory(repo20, generatorFiles);
const runtimeInventory = inventory(base, runtimeFiles);
const designSystemInventory = inventory(repo47, designSystemFiles);
const sharedSkillInventory = inventory(repo20, sharedSkillFiles);
const categoryInventory = inventory(repo20, categoryFiles);
const moleculeInventory = inventory(base, moleculeFiles);
const directDeps = config.workspaceDependencies.map(Number).filter(project => project !== 102047);
const candidates = [102047, ...directDeps].filter(project => existsSync(path.join(base, `mls-${project}/l2/molecules/skill.ts`)));
if (directDeps.filter(project => project === 102040).length !== 1 || manifest.workspaceDependencies.filter(project => Number(project) === 102040).length !== 1) fail('102040 must be one direct dependency in config and manifest');
if (JSON.stringify(candidates) !== JSON.stringify([102040])) fail(`productive molecule candidates changed: ${JSON.stringify(candidates)}`);
if (!directDeps.includes(102029)) fail('runtime 102029 is not a direct dependency of 102047');
if (!designSystemInventory.length || !runtimeInventory.length || !sharedSkillInventory.length) fail('effective consumer context is incomplete');

const report = {
  capturedAt: new Date().toISOString(),
  repositories: {
    'mls-102020': { head: git(repo20, ['rev-parse', 'HEAD']), acceptedGeneratorCommits: accepted, status: status(repo20) },
    'mls-102047': { head: git(repo47, ['rev-parse', 'HEAD']), status: status(repo47) },
  },
  plan: {
    module: 'agendaClinica', pages: pages.map(page => page.id).sort(), pageCount: pages.length,
    sourceOrganisms: organisms, expectedDescriptions: organisms * 2, expectedDefs: pages.length * 4,
    expectedPageDefs: pages.length * 2, expectedMaterializationItems: pages.length * 3,
    endpoints: backend.endpoints.length, uniqueRoutes: new Set(backend.endpoints.map(item => item.route)).size,
    usecaseOccurrences: backend.usecases.length, uniqueUsecaseIds: new Set(backend.usecases.map(item => item.usecaseId)).size,
  },
  discovery: { activeProject: 102047, directDeps, candidates, project: 102040, selectedBy: 'dependency', configProject: config.projects['102040'], manifestHas102040: true },
  sources: { hash: hashInventory(sourceInventory), files: sourceInventory },
  l1Before: { hash: hashInventory(l1Inventory), files: l1Inventory.length, inventoryFile: 'l1-before.json' },
  generator: { hash: hashInventory(generatorInventory), files: generatorInventory.length },
  consumerContext: {
    sharedSkill: { hash: hashInventory(sharedSkillInventory), files: sharedSkillInventory },
    runtime102029: { logicalRef: '_102029_.d.ts', hash: hashInventory(runtimeInventory), files: runtimeInventory },
    designSystem: { logicalRef: 'l2/designSystem.ts', hash: hashInventory(designSystemInventory), files: designSystemInventory },
    pageSkills: { hash: hashInventory(categoryInventory), files: categoryInventory },
    moleculeCatalog: { hash: hashInventory(moleculeInventory), files: moleculeInventory.length, indexes: moleculeFiles.filter(file => file.endsWith('/index.defs.ts')).length, usages: moleculeFiles.filter(file => file.endsWith('/usage.ts')).length },
  },
  destinationBefore: { hash: hashInventory(destinationInventory), files: destinationInventory.length, inventoryFile: 'inventory-before.json' },
  limits: { liveBySupervisor: true, noopBySupervisor: true, collabmsgByExecutor: false, materializeTs: false, preserveL1: true, preserveServiceBehavior: true, commit: false, push: false },
};

writeFileSync(path.join(evidence, 'l1-before.json'), `${JSON.stringify(l1Inventory, null, 2)}\n`);
writeFileSync(path.join(evidence, 'inventory-before.json'), `${JSON.stringify(destinationInventory, null, 2)}\n`);
writeFileSync(path.join(evidence, 'preflight.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`preflight pages=${pages.length} sourceOrganisms=${organisms} defs=${pages.length * 4} items=${pages.length * 3} catalog=${candidates[0]} l1=${l1Inventory.length}`);
