import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chExtractCatalogModule } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chExtract.js';
import type { ChGroupCatalog, ChLevel1 } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { assertD2MoleculeReceiptIntegrity, buildD2MoleculeReceipt, prepareD2MoleculeContext, resolveD2MoleculeSelection, type D2MoleculeCatalogPort, type D2MoleculeDiscoveryReceipt, type D2MoleculeReceipt, type D2UsageContractRead } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';

const base = '/Volumes/WagnerSSD1/collab/mls-base';
const repo20 = path.join(base, 'mls-102020');
const repo47 = path.join(base, 'mls-102047');
const evidence = path.dirname(fileURLToPath(import.meta.url));
const pipeline = path.join(repo47, 'l2/agendaClinica/pipeline/agentDefsL2');
const config = JSON.parse(readFileSync(path.join(repo47, 'l5/config.json'), 'utf8')) as { workspaceDependencies: string[] };
const localDirectDeps = config.workspaceDependencies.map(Number).filter(project => project !== 102047);
const localCandidates = [102047, ...localDirectDeps].filter(project => exists(project, 'l2/molecules/skill.ts'));
const fail = (message: string): never => { throw new Error(message); };
const source = (reference: string): string => readFileSync(referencePath(reference), 'utf8');
let productiveDiscovery: D2MoleculeDiscoveryReceipt | null = null;
let productiveCatalogProject: number | null = null;
let productiveSelectedBy: string | null = null;

const port: D2MoleculeCatalogPort = {
  async discover() {
    if (!productiveDiscovery) fail('D2_MOLECULE_DISCOVERY_PREIMAGE_MISSING');
    return { activeProject: 102047, ...productiveDiscovery, project: productiveCatalogProject, selectedBy: productiveSelectedBy as 'arg' | 'local' | 'dependency' | null, error: '', warnings: [] };
  },
  async readLevel1(project) {
    const reference = `/_${project}_/l2/molecules/skill`;
    const module = chExtractCatalogModule(source(reference)).module;
    if (!module?.groups?.length || !module.skill?.trim()) return { level1: null, error: `${reference} is unreadable` };
    const level1: ChLevel1 = { project, reference, groups: module.groups, skill: module.skill, theme: module.theme ?? null, via: 'stor' };
    return { level1, error: '' };
  },
  async readGroup(reference) {
    const module = chExtractCatalogModule(source(reference)).module;
    if (!module?.group || !module.molecules?.length || !module.skill?.trim()) return { catalog: null, error: `${reference} is unreadable` };
    const catalog: ChGroupCatalog = { reference, via: 'stor', group: module.group, usageContract: module.usageContract || '', molecules: module.molecules, scenarios: module.scenarios || [], skill: module.skill };
    return { catalog, error: '' };
  },
  async readUsageContract(reference) {
    const skill = chExtractCatalogModule(source(reference)).module?.skill || '';
    const contract: D2UsageContractRead | null = skill.trim() ? { reference, via: 'stor', skill } : null;
    return { contract, error: contract ? '' : `${reference} is unreadable` };
  },
};

async function main(): Promise<void> {
  const pages = JSON.parse(readFileSync(path.join(pipeline, 'pages.json'), 'utf8')) as { units: Array<{ pageId: string; moleculeReceipt?: D2MoleculeReceipt }> };
  if (!pages.units.length || !pages.units[0].moleculeReceipt) fail('moleculeReceipt missing from first page');
  const first = pages.units[0].moleculeReceipt;
  await assertD2MoleculeReceiptIntegrity(first);
  productiveDiscovery = first.discovery;
  productiveCatalogProject = first.catalogProject;
  productiveSelectedBy = first.selectedBy;
  if (JSON.stringify(productiveDiscovery.candidates) !== JSON.stringify(localCandidates)) fail(`productive/local molecule candidates differ: ${JSON.stringify(productiveDiscovery.candidates)} / ${JSON.stringify(localCandidates)}`);
  if (first.catalogProject !== 102040 || !localDirectDeps.includes(first.catalogProject)) fail('productive catalog is not a declared local dependency');
  for (const unit of pages.units) {
    if (!unit.moleculeReceipt) fail(`${unit.pageId}: moleculeReceipt missing`);
    await assertD2MoleculeReceiptIntegrity(unit.moleculeReceipt);
    if (JSON.stringify(unit.moleculeReceipt.discovery) !== JSON.stringify(productiveDiscovery)) fail(`${unit.pageId}: productive discovery preimage differs between units`);
  }
  const prepared = await prepareD2MoleculeContext(port);
  if (prepared.receipt.consumerProject !== 102047 || prepared.receipt.catalogProject !== 102040 || prepared.receipt.selectedBy !== 'dependency') fail('productive discovery did not select 102040 by dependency');
  const verified = [];
  for (const unit of pages.units) {
    if (!unit.moleculeReceipt) fail(`${unit.pageId}: moleculeReceipt missing`);
    const selection = await resolveD2MoleculeSelection(port, prepared.inventory, unit.moleculeReceipt.selectedGroupIds, prepared.candidates);
    const expected = await buildD2MoleculeReceipt(prepared.inventory, prepared.candidates, selection);
    if (JSON.stringify(unit.moleculeReceipt) !== JSON.stringify(expected)) {
      const fields = Object.keys(expected).filter(key => JSON.stringify(unit.moleculeReceipt?.[key as keyof typeof expected]) !== JSON.stringify(expected[key as keyof typeof expected]));
      writeFileSync(path.join(evidence, 'molecular-mismatch-v3.json'), `${JSON.stringify({ pageId: unit.pageId, fields, persisted: unit.moleculeReceipt, recomputed: expected }, null, 2)}\n`);
      fail(`${unit.pageId}: molecular receipt differs from current sources in ${fields.join(', ')} (${unit.moleculeReceipt.contextHash}/${expected.contextHash})`);
    }
    verified.push({ pageId: unit.pageId, outcome: expected.outcome, code: expected.code, selectedGroupIds: expected.selectedGroupIds, groupCount: expected.groupCount, candidateCount: expected.candidateCount, discoveryHash: expected.discoveryHash, contextHash: expected.contextHash, sources: expected.sources });
  }
  const output = { consumerProject: prepared.receipt.consumerProject, catalogProject: prepared.receipt.catalogProject, selectedBy: prepared.receipt.selectedBy, productiveDiscovery, localDiscovery: { directDeps: localDirectDeps, candidates: localCandidates }, groupCount: prepared.receipt.groupCount, candidateCount: prepared.receipt.candidateCount, preflightContextHash: prepared.receipt.contextHash, pages: verified };
  writeFileSync(path.join(evidence, process.argv[2] || 'molecular-verification.json'), `${JSON.stringify(output, null, 2)}\n`);
  console.log(`molecular receipts=${verified.length} catalog=${output.catalogProject} groups=${output.groupCount} candidates=${output.candidateCount}`);
}

void main();

function exists(project: number, relative: string): boolean { try { readFileSync(path.join(base, `mls-${project}`, relative)); return true; } catch { return false; } }
function referencePath(reference: string): string {
  const match = /^\/?_(\d+)_\/(.+?)(?:\.(?:js|ts))?$/u.exec(reference);
  if (!match) fail(`invalid reference ${reference}`);
  const raw = path.join(base, `mls-${match[1]}`, match[2]);
  for (const candidate of [raw, `${raw}.ts`, raw.replace(/\.js$/u, '.ts')]) { try { readFileSync(candidate); return candidate; } catch { /* try next */ } }
  fail(`missing reference ${reference}`);
}
