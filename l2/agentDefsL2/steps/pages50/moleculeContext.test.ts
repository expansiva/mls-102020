/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { chExtractCatalogModule } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chExtract.js';
import type { ChDiscovery, ChGroupCatalog, ChLevel1 } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { d2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';
import {
  buildD2MoleculeInventory,
  buildD2MoleculeCandidateContext,
  assertD2MoleculeCandidates,
  buildD2MoleculeReceipt,
  assertD2MoleculeReceiptIntegrity,
  D2MoleculeContextError,
  normalizeD2MlsReference,
  resolveD2MoleculeSelection,
  type D2MoleculeCatalogPort,
  type D2UsageContractRead,
} from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const CATALOG = path.join(MLS_BASE, 'mls-102040', 'l2', 'molecules');
const USAGE = path.join(MLS_BASE, 'mls-102020', 'l2', 'aura', 'molecules', 'skills');

void test('pinned 102040 HEAD proves 31 groups/154 variants and a compact level-1-only inventory', async () => {
  const provenance = json(path.join(HERE, 'fixtures', 'molecules', 'provenance.json')) as {
    commit: string; expectedGroups: number; expectedVariants: number; sha256: Record<string, string>;
  };
  assert.equal(provenance.commit, 'f5845db580f3199c5f68e6ff4d5207aaa35705f5');
  for (const [relative, expected] of Object.entries(provenance.sha256)) {
    assert.equal(sha(readFileSync(path.join(CATALOG, relative))), expected, relative);
  }
  const fixture = fixturePort();
  const inventory = await buildD2MoleculeInventory(fixture.port);
  assert.equal(inventory.groups.length, provenance.expectedGroups);
  assert.equal(inventory.groups.reduce((sum, group) => sum + group.moleculeCount, 0), provenance.expectedVariants);
  assert.equal(inventory.metrics.reads.length, 1);
  assert.equal(fixture.calls.join(','), 'level1');
  assert.equal(inventory.metrics.inventoryBytes, Buffer.byteLength(inventory.context));
  assert.equal(inventory.metrics.inventoryBytes, 16_225);
  assert.doesNotMatch(inventory.context, /export const|static styles|\.less|\.html|molecules\s*:/u);
  assert.ok(inventory.groups.every(group => group.purpose && group.indexReference.endsWith('/index.defs')));
});

void test('selection reads only chosen date groups, preserves literal tags/contracts and records actual bytes', async () => {
  const fixture = fixturePort();
  const inventory = await buildD2MoleculeInventory(fixture.port);
  const pageContract = { fields: [{ path: 'Appointment.date', tsType: 'string' }, { path: 'Contact.value', tsType: 'string' }] };
  const original = structuredClone(pageContract);
  const selected = await resolveD2MoleculeSelection(fixture.port, inventory, [
    'groupEnterDate', 'groupenterdatetime', 'groupEnterDate',
  ]);

  assert.deepEqual(selected.groups.map(group => group.groupId), ['groupEnterDate', 'groupEnterDatetime']);
  assert.deepEqual(pageContract, original);
  assert.equal(selected.groups[0].usageContractReference, '/_102020_/l2/aura/molecules/skills/groupEnterDate/usage');
  assert.equal(selected.groups[1].usageContractReference, '/_102020_/l2/aura/molecules/skills/groupEnterDateTime/usage');
  assert.notEqual(selected.groups[0].usageSkill, selected.groups[1].usageSkill);
  assert.match(selected.groups[0].usageSkill, /date only \(no time\)/u);
  assert.match(selected.groups[1].usageSkill, /date and time together/u);
  assert.equal(selected.groups[0].molecules[0].tag, 'groupenterdate--ml-compact-calendar');
  assert.equal(selected.pipelineSkills.length, 4);
  assert.ok(selected.pipelineSkills.every(reference => reference.endsWith('.ts')));
  assert.equal(selected.metrics.reads.length, 5);
  assert.equal(fixture.calls.join(','), 'level1,groupEnterDate,usageDate,groupEnterDatetime,usageDatetime');
  assert.equal(selected.metrics.selectedBytes, Buffer.byteLength(selected.context));
  assert.equal(selected.metrics.selectedBytes, 17_738);
  assert.equal(selected.metrics.totalBytes, selected.metrics.inventoryBytes + selected.metrics.selectedBytes);
  assert.doesNotMatch(selected.context, /emailAddress|phoneNumber|contactApi/u);
});

void test('empty catalog has a reason; invalid/unknown/ambiguous refs are diagnostics and equivalent refs dedupe', async () => {
  const absent = fixturePort();
  absent.port.discover = async () => discovery(null, [], 'no catalog here');
  const empty = await buildD2MoleculeInventory(absent.port);
  assert.deepEqual(empty.groups, []);
  assert.equal(empty.metrics.reads.length, 0);
  assert.match(empty.reason ?? '', /no catalog/u);

  const ambiguous = fixturePort();
  ambiguous.port.discover = async () => discovery(null, [101, 202], 'more than one catalog is reachable: 101, 202');
  await assert.rejects(() => buildD2MoleculeInventory(ambiguous.port), errorCode('D2_MOLECULE_CATALOG_AMBIGUOUS'));

  const fixture = fixturePort();
  const inventory = await buildD2MoleculeInventory(fixture.port);
  await assert.rejects(() => resolveD2MoleculeSelection(fixture.port, inventory, ['missing']), errorCode('D2_MOLECULE_GROUP_UNKNOWN'));
  assert.throws(() => normalizeD2MlsReference('https://example.test/usage'), errorCode('D2_MOLECULE_REF_INVALID'));
  assert.throws(() => normalizeD2MlsReference('/_102020_/l2/molecules/../usage'), errorCode('D2_MOLECULE_REF_INVALID'));

  const missingIndex = fixturePort();
  const missingIndexInventory = await buildD2MoleculeInventory(missingIndex.port);
  missingIndex.port.readGroup = async () => ({ catalog: null, error: 'not found' });
  await assert.rejects(() => resolveD2MoleculeSelection(missingIndex.port, missingIndexInventory, ['groupEnterDate']), errorCode('D2_MOLECULE_INDEX_UNREADABLE'));

  const missingUsage = fixturePort();
  const missingUsageInventory = await buildD2MoleculeInventory(missingUsage.port);
  missingUsage.port.readUsageContract = async () => ({ contract: null, error: 'not found' });
  await assert.rejects(() => resolveD2MoleculeSelection(missingUsage.port, missingUsageInventory, ['groupEnterDate']), errorCode('D2_MOLECULE_USAGE_UNREADABLE'));

  const undocumented = fixturePort();
  undocumented.port.readLevel1 = async project => ({ level1: {
    project, reference: '/_102040_/l2/molecules/skill', via: 'stor', theme: null, skill: '# no group purposes',
    groups: [{ name: 'groupMystery', molecules: 1, indexDefs: '/_102040_/l2/molecules/groupmystery/index.defs' }],
  }, error: '' });
  await assert.rejects(() => buildD2MoleculeInventory(undocumented.port), errorCode('D2_MOLECULE_PURPOSE_MISSING'));

  fixture.port.readGroup = async reference => {
    const loaded = fixtureGroup(reference);
    if (!loaded.catalog) return loaded;
    loaded.catalog.usageContract = loaded.catalog.reference.includes('datetime')
      ? '/_102020_/l2/aura/molecules/skills/groupEnterDate/usage.ts'
      : '/_102020_/l2/aura/molecules/skills/groupEnterDate/usage';
    return loaded;
  };
  const deduped = await resolveD2MoleculeSelection(fixture.port, inventory, ['groupEnterDate', 'groupEnterDatetime']);
  assert.equal(deduped.pipelineSkills.length, 3);
});

void test('candidate context exposes only real scenario recommendations and rejects an invented tag', async () => {
  const fixture = fixturePort(); const inventory = await buildD2MoleculeInventory(fixture.port);
  inventory.groups = inventory.groups.filter(item => item.groupId === 'groupEnterDate' || item.groupId === 'groupEnterDatetime');
  const candidates = await buildD2MoleculeCandidateContext(fixture.port, inventory);
  assert.equal(candidates.groups.length, 2);
  assert.ok(candidates.groups.flatMap(group => group.scenarios.flatMap(item => item.candidates)).every(tag => tag.includes('--ml-')));
  assert.match(candidates.context, /never claim the catalog is empty when groups are listed/u);
  const selected = await resolveD2MoleculeSelection(fixture.port, inventory, ['groupEnterDate']);
  assert.doesNotThrow(() => assertD2MoleculeCandidates(selected, [{ groupId: 'groupEnterDate', candidates: ['groupenterdate--ml-date-picker'] }]));
  assert.throws(() => assertD2MoleculeCandidates(selected, [{ groupId: 'groupEnterDate', candidates: ['invented--tag'] }]), errorCode('D2_MOLECULE_CANDIDATE_UNKNOWN'));
});

void test('molecular receipt distinguishes honest absence, valid no-match and selected provenance', async () => {
  const absentFixture = fixturePort();
  absentFixture.port.discover = async () => discovery(null, [], 'no molecule catalog found in the consumer or its dependencies');
  const absentInventory = await buildD2MoleculeInventory(absentFixture.port);
  const absentCandidates = await buildD2MoleculeCandidateContext(absentFixture.port, absentInventory);
  const absent = await buildD2MoleculeReceipt(absentInventory, absentCandidates);
  assert.equal(absent.outcome, 'catalog-absent');
  assert.equal(absent.code, 'D2_MOLECULE_CATALOG_ABSENT');
  assert.equal(absent.catalogProject, null);
  assert.equal(absent.sources.length, 0);

  const fixture = fixturePort();
  const inventory = await buildD2MoleculeInventory(fixture.port);
  inventory.groups = inventory.groups.filter(item => item.groupId === 'groupEnterDate');
  const candidates = await buildD2MoleculeCandidateContext(fixture.port, inventory);
  const none = await resolveD2MoleculeSelection(fixture.port, inventory, [], candidates);
  const noMatch = await buildD2MoleculeReceipt(inventory, candidates, none);
  assert.equal(noMatch.outcome, 'catalog-valid-no-match');
  assert.equal(noMatch.code, 'D2_MOLECULE_VALID_NO_MATCH');
  assert.equal(noMatch.groupCount, 1);
  assert.ok(noMatch.candidateCount > 0);
  assert.deepEqual(noMatch.sources.map(source => source.role), ['group-index', 'inventory']);

  const selected = await resolveD2MoleculeSelection(fixture.port, inventory, ['groupEnterDate'], candidates);
  const receipt = await buildD2MoleculeReceipt(inventory, candidates, selected);
  assert.equal(receipt.outcome, 'catalog-selection');
  assert.equal(receipt.consumerProject, 999);
  assert.equal(receipt.catalogProject, 102040);
  assert.equal(receipt.selectedBy, 'dependency');
  assert.ok(receipt.sources.some(source => source.role === 'usage-contract' && source.sha256.startsWith('sha256:')));
  assert.deepEqual(receipt.discovery, { directDeps: [102040], resolvedDeps: [102040], candidates: [102040] });
  await assert.doesNotReject(() => assertD2MoleculeReceiptIntegrity(receipt));

  const directDrift = structuredClone(receipt); directDrift.discovery.directDeps.push(102099);
  await assert.rejects(() => assertD2MoleculeReceiptIntegrity(directDrift), errorCode('D2_MOLECULE_DISCOVERY_HASH'));
  const resolvedDrift = structuredClone(receipt); resolvedDrift.discovery.resolvedDeps.push(102099);
  await assert.rejects(() => assertD2MoleculeReceiptIntegrity(resolvedDrift), errorCode('D2_MOLECULE_DISCOVERY_HASH'));
  const candidateDrift = structuredClone(receipt); candidateDrift.discovery.candidates.push(102099);
  await assert.rejects(() => assertD2MoleculeReceiptIntegrity(candidateDrift), errorCode('D2_MOLECULE_DISCOVERY_SELECTION'));
  const contextDrift = structuredClone(receipt); contextDrift.sources[0].sha256 = `sha256:${'0'.repeat(64)}`;
  await assert.rejects(() => assertD2MoleculeReceiptIntegrity(contextDrift), errorCode('D2_MOLECULE_RECEIPT_HASH'));
});

void test('receipt canonicalizes runtime discovery self entries and duplicates without changing dependency selection', async () => {
  const fixture = fixturePort();
  const inventory = await buildD2MoleculeInventory(fixture.port);
  inventory.groups = inventory.groups.filter(item => item.groupId === 'groupEnterDate');
  inventory.directDeps = [999, 102040, 102040, 999];
  inventory.resolvedDeps = [999, 102040, 999, 102040];
  inventory.candidates = [102040, 102040];
  const raw = structuredClone({ directDeps: inventory.directDeps, resolvedDeps: inventory.resolvedDeps, candidates: inventory.candidates });
  const candidates = await buildD2MoleculeCandidateContext(fixture.port, inventory);
  const selection = await resolveD2MoleculeSelection(fixture.port, inventory, ['groupEnterDate'], candidates);
  const receipt = await buildD2MoleculeReceipt(inventory, candidates, selection);

  assert.deepEqual(receipt.discovery, { directDeps: [102040], resolvedDeps: [102040], candidates: [102040] });
  assert.equal(receipt.catalogProject, 102040);
  assert.equal(receipt.selectedBy, 'dependency');
  await assert.doesNotReject(() => assertD2MoleculeReceiptIntegrity(receipt));
  assert.deepEqual({ directDeps: inventory.directDeps, resolvedDeps: inventory.resolvedDeps, candidates: inventory.candidates }, raw, 'receipt creation does not mutate observed runtime vectors');
});

void test('production discovery stays on own/direct dependency catalogs and never falls through to 102040', async () => {
  const own = installDiscoveryHost(700, [701], [700]);
  const ownChoice = await d2MoleculeCatalogPort.discover(null);
  assert.equal(ownChoice.project, 700);
  assert.deepEqual(ownChoice.candidates, [700]);

  own.setCandidates([701]);
  const dependencyChoice = await d2MoleculeCatalogPort.discover(null);
  assert.equal(dependencyChoice.project, 701);
  assert.deepEqual(dependencyChoice.candidates, [701]);
  assert.equal(dependencyChoice.candidates.includes(102040), false);
});

void test('agendaClinica declares 102040 directly in all three runtime dependency surfaces', async () => {
  const root = path.resolve(HERE, '../../../../..');
  const config = json(path.join(root, 'mls-102047', 'l5', 'config.json')) as {
    workspaceDependencies: string[];
    projects: Record<string, { root: string; type: string }>;
  };
  const manifest = json(path.join(root, 'mls-102047', 'mlsDep.json')) as { workspaceDependencies: string[] };
  assert.equal(config.workspaceDependencies.filter(id => id === '102040').length, 1);
  assert.deepEqual(config.projects['102040'], { root: '../mls-102040', type: 'lib' });
  assert.equal(manifest.workspaceDependencies.filter(id => id === '102040').length, 1);

  installDiscoveryHost(102047, config.workspaceDependencies.map(Number), [102040]);
  const choice = await d2MoleculeCatalogPort.discover(null);
  assert.equal(choice.project, 102040);
  assert.equal(choice.selectedBy, 'dependency');
  assert.deepEqual(choice.candidates, [102040]);

  const inventory = await buildD2MoleculeInventory(fixturePort().port);
  assert.equal(inventory.catalogProject, 102040);
  assert.equal(inventory.groups.length, 31);
});

function fixturePort(): { port: D2MoleculeCatalogPort; calls: string[] } {
  const calls: string[] = [];
  const extracted = chExtractCatalogModule(readFileSync(path.join(CATALOG, 'skill.ts'), 'utf8')).module!;
  const level1: ChLevel1 = {
    project: 102040,
    reference: '/_102040_/l2/molecules/skill',
    groups: extracted.groups!,
    skill: extracted.skill!,
    theme: null,
    via: 'stor',
  };
  const port: D2MoleculeCatalogPort = {
    discover: async () => discovery(102040, [102040], ''),
    readLevel1: async () => { calls.push('level1'); return { level1, error: '' }; },
    readGroup: async reference => {
      const loaded = fixtureGroup(reference);
      calls.push(loaded.catalog?.group ?? 'badGroup');
      return loaded;
    },
    readUsageContract: async reference => {
      const dateTime = reference.includes('DateTime');
      calls.push(dateTime ? 'usageDatetime' : 'usageDate');
      const source = readFileSync(path.join(USAGE, dateTime ? 'groupEnterDateTime' : 'groupEnterDate', 'usage.ts'), 'utf8');
      const skill = chExtractCatalogModule(source).module?.skill ?? '';
      const contract: D2UsageContractRead = { reference, via: 'stor', skill };
      return { contract, error: '' };
    },
  };
  return { port, calls };
}

function fixtureGroup(reference: string): { catalog: ChGroupCatalog | null; error: string } {
  const dateTime = reference.includes('datetime');
  const source = readFileSync(path.join(CATALOG, dateTime ? 'groupenterdatetime' : 'groupenterdate', 'index.defs.ts'), 'utf8');
  const mod = chExtractCatalogModule(source).module!;
  return { catalog: {
    reference,
    via: 'stor',
    group: mod.group!,
    usageContract: mod.usageContract!,
    molecules: mod.molecules!,
    scenarios: mod.scenarios!,
    skill: mod.skill!,
  }, error: '' };
}

function discovery(project: number | null, candidates: number[], error: string): ChDiscovery {
  return { activeProject: 999, directDeps: [...candidates], resolvedDeps: [...candidates], candidates, project, selectedBy: project === null ? null : 'dependency', error, warnings: [] };
}

function installDiscoveryHost(activeProject: number, deps: number[], initialCandidates: number[]): { setCandidates(value: number[]): void } {
  const files: Record<string, { status: string }> = {};
  const key = (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
  const setCandidates = (projects: number[]) => {
    for (const existing of Object.keys(files)) delete files[existing];
    for (const project of projects) files[key({ project, level: 2, folder: 'molecules', shortName: 'skill', extension: '.ts' })] = { status: 'changed' };
  };
  setCandidates(initialCandidates);
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: activeProject,
    stor: { files, getKeyToFile: key, loadProjectdependenciesInfoIfNeed: async () => undefined },
    l5: { getProjectDetails: () => ({ prj_dependencies: deps }), getProjectDependencies: () => deps },
  };
  return { setCandidates };
}

function errorCode(code: string): (error: unknown) => boolean {
  return error => error instanceof D2MoleculeContextError && error.code === code;
}
function sha(value: Buffer): string { return createHash('sha256').update(value).digest('hex'); }
function json(file: string): unknown { return JSON.parse(readFileSync(file, 'utf8')) as unknown; }
