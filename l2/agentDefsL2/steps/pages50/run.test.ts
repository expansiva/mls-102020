/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { D2_INPUT_VERSION, type D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { d2InputFile } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { D2_SHARED_VERSION } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { d2SharedFile, d2SharedManifestFile } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';
import { d2PageFile, d2PagesManifestFile, d2PagesResultFile, readD2PagesManifest, readD2PagesResult } from '/_102020_/l2/agentDefsL2/steps/pages50/io.js';
import { finalizeD2PagesBarrier, findReusableD2PagesUnits, persistD2PagesUnit } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { buildD2MoleculeReceipt, resolveD2MoleculeSelection, type D2MoleculePreparedContext, type D2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';

const IDENTITY: D2RunIdentity = { project: 102047, module: 'fixture' };
const PAGES = ['alpha', 'beta'];
type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
type Stored = Info & { status: string; content: string; getContent: () => Promise<string> };

void test('one failed page leaves its approved sibling untouched and barrier waits for both device defs', async () => {
  const host = await installHost();
  const molecular = await molecularFixture(); const receipt = await pageReceipt(molecular, 'direct-test-context');
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 1, receipt);
  const alphaDesktop = keyOf(d2PageFile(IDENTITY, 'alpha', 'desktop')); const alphaMobile = keyOf(d2PageFile(IDENTITY, 'alpha', 'mobile'));
  const alphaWrites = host.writes.filter(key => key === alphaDesktop || key === alphaMobile).length;
  assert.equal(await finalizeD2PagesBarrier(IDENTITY, host.snapshot, async () => undefined, undefined, molecular), null);

  host.failKey = keyOf(d2PageFile(IDENTITY, 'beta', 'mobile'));
  await assert.rejects(() => persistD2PagesUnit(IDENTITY, host.snapshot, 'beta', sources('beta'), ['beta__desktop__page11', 'beta__mobile__page11'], 1, receipt), /simulated write failure/);
  assert.equal(host.writes.filter(key => key === alphaDesktop || key === alphaMobile).length, alphaWrites);
  assert.equal(await readD2PagesManifest(IDENTITY), null);

  host.failKey = '';
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'beta', sources('beta'), ['beta__desktop__page11', 'beta__mobile__page11'], 2, receipt);
  const alphaShared = host.files[keyOf(d2SharedFile(IDENTITY, 'alpha'))]; const originalShared = alphaShared.content;
  alphaShared.content = 'tampered shared';
  await assert.rejects(() => finalizeD2PagesBarrier(IDENTITY, host.snapshot, async () => undefined, undefined, molecular), /D2_PAGES_SHARED_HASH_MISMATCH/);
  assert.equal(await readD2PagesManifest(IDENTITY), null);
  alphaShared.content = originalShared;
  const manifest = await finalizeD2PagesBarrier(IDENTITY, host.snapshot, async () => undefined, undefined, molecular);
  assert.equal(manifest?.units.length, 2);
  assert.equal(manifest?.units.flatMap(unit => Object.values(unit.artifactPaths)).length, 4);
  assert.equal(host.writes.filter(key => key === alphaDesktop || key === alphaMobile).length, alphaWrites);
});

void test('partial resume reuses four valid pages and redispatches missing or corrupted units', async () => {
  const pages = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const host = await installHost(pages);
  const molecular = await molecularFixture(); const receipt = await pageReceipt(molecular, 'direct-test-context');
  for (const pageId of pages.slice(0, 4)) {
    await persistD2PagesUnit(IDENTITY, host.snapshot, pageId, sources(pageId), [`${pageId}__desktop__page11`, `${pageId}__mobile__page11`], 1, receipt);
  }

  const reusable = await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, undefined, molecular);
  assert.deepEqual(reusable.map(unit => unit.pageId), ['alpha', 'beta', 'delta', 'gamma']);
  assert.deepEqual(pages.filter(pageId => !reusable.some(unit => unit.pageId === pageId)), ['epsilon']);
  host.files[keyOf(d2PageFile(IDENTITY, 'beta', 'mobile'))].content = 'corrupted mobile artifact';
  const afterCorruption = await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, undefined, molecular);
  assert.deepEqual(afterCorruption.map(unit => unit.pageId), ['alpha', 'delta', 'gamma']);
  assert.deepEqual(pages.filter(pageId => !afterCorruption.some(unit => unit.pageId === pageId)), ['beta', 'epsilon']);
  assert.equal(await finalizeD2PagesBarrier(IDENTITY, host.snapshot, async () => undefined, undefined, molecular), null);
});

void test('changing shared A invalidates both devices of A while page B stays reusable without writes', async () => {
  const host = await installHost(['alpha', 'beta']);
  const molecular = await molecularFixture(); const receipt = await pageReceipt(molecular, 'direct-test-context');
  for (const pageId of ['alpha', 'beta']) {
    await persistD2PagesUnit(IDENTITY, host.snapshot, pageId, sources(pageId), [`${pageId}__desktop__page11`, `${pageId}__mobile__page11`], 1, receipt);
  }
  const betaResultKey = keyOf(d2PagesResultFile(IDENTITY, 'beta'));
  const betaDesktopKey = keyOf(d2PageFile(IDENTITY, 'beta', 'desktop'));
  const betaMobileKey = keyOf(d2PageFile(IDENTITY, 'beta', 'mobile'));
  const betaBefore = [host.files[betaResultKey].content, host.files[betaDesktopKey].content, host.files[betaMobileKey].content];
  const writesBefore = host.writes.length;

  const alphaShared = host.files[keyOf(d2SharedFile(IDENTITY, 'alpha'))];
  alphaShared.content = `${alphaShared.content}// shared A v2\n`;
  const sharedManifest = JSON.parse(host.files[keyOf(d2SharedManifestFile(IDENTITY))].content) as { units: Array<{ pageId: string; sourceHash: string }> };
  sharedManifest.units.find(unit => unit.pageId === 'alpha')!.sourceHash = await sha256Text(alphaShared.content);
  host.files[keyOf(d2SharedManifestFile(IDENTITY))].content = JSON.stringify(sharedManifest);

  const reusable = await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, undefined, molecular);
  assert.deepEqual(reusable.map(unit => unit.pageId), ['beta'], 'only A is dispatched, and its worker regenerates desktop plus mobile');
  assert.equal(host.writes.length, writesBefore, 'reuse discovery performs no page writes or model work');
  assert.deepEqual([host.files[betaResultKey].content, host.files[betaDesktopKey].content, host.files[betaMobileKey].content], betaBefore, 'B receipt and both artifacts remain byte-identical');
});

void test('unchanged context is a byte no-op while discovery or skill context drift invalidates reuse', async () => {
  const host = await installHost(['alpha']); const molecular = await molecularFixture(); const receipt = (hash: string) => pageReceipt(molecular, hash);
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 1, await receipt('context-a'));
  const desktop = keyOf(d2PageFile(IDENTITY, 'alpha', 'desktop')); const mobile = keyOf(d2PageFile(IDENTITY, 'alpha', 'mobile'));
  const artifactWrites = () => host.writes.filter(item => item === desktop || item === mobile).length;
  const before = artifactWrites();
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 2, await receipt('context-a'));
  assert.equal(artifactWrites(), before);
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', molecular)).length, 1);

  const unrelatedResolvedDependency = await changedMolecular(molecular, prepared => { prepared.inventory.resolvedDeps = [102040, 102099]; });
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', unrelatedResolvedDependency)).length, 0, 'the persisted discovery preimage detects resolved dependency drift');
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-b', molecular)).length, 0);
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 2, await receipt('context-b'));
  assert.equal(artifactWrites(), before, 'context regeneration preserves identical artifact bytes');
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-b', molecular)).length, 1);
});

void test('an unselected usage contract does not invalidate a valid no-match unit', async () => {
  const host = await installHost(['alpha']); const molecular = await molecularFixture();
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 1, await pageReceipt(molecular, 'context-a'));
  molecular.state.usageSkill = 'Changed but never selected.';
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', molecular)).length, 1);
});

void test('an older receipt never approves the current page dependency contract', async () => {
  const host = await installHost(['alpha']);
  const molecular = await molecularFixture();
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 1, await pageReceipt(molecular, 'direct-test-context'));
  const resultKey = keyOf(d2PagesResultFile(IDENTITY, 'alpha'));
  const old = JSON.parse(host.files[resultKey].content) as Record<string, unknown>;
  old.schemaVersion = '2026-09-23-agent-defs-l2-pages-v3';
  host.files[resultKey].content = JSON.stringify(old);
  const before = host.writes.length;
  const changed = { desktop: `${sources('alpha').desktop}// v4\n`, mobile: `${sources('alpha').mobile}// v4\n` };
  const approved = await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', changed, ['alpha__desktop__page11', 'alpha__mobile__page11'], 2, await pageReceipt(molecular, 'direct-test-context'));
  assert.equal(approved.schemaVersion, '2026-09-23-agent-defs-l2-pages-v6');
  assert.ok(host.writes.length > before, 'old receipt triggers a new persistence pass');
});

void test('dependency, candidate index and selected usage drift each invalidate molecular reuse', async () => {
  const host = await installHost(['alpha']); const molecular = await molecularFixture();
  const receipt = await pageReceipt(molecular, 'context-a', ['groupFixture']);
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 1, receipt);
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', molecular)).length, 1);

  const dependency = await changedMolecular(molecular, prepared => { prepared.inventory.directDeps = [102040, 102099]; });
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', dependency)).length, 0);

  const candidate = await changedMolecular(molecular, prepared => { prepared.candidates.reads[0].sha256 = `sha256:${'9'.repeat(64)}`; });
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', candidate)).length, 0);

  molecular.state.usageSkill = 'Changed selected usage contract.';
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', molecular)).length, 0);
  molecular.state.usageSkill = 'Use the fixture molecule.';
  const artifactKeys = new Set([keyOf(d2PageFile(IDENTITY, 'alpha', 'desktop')), keyOf(d2PageFile(IDENTITY, 'alpha', 'mobile'))]);
  const artifactWrites = host.writes.filter(key => artifactKeys.has(key)).length;
  const changedReceipt = await pageReceipt(candidate, 'context-a', ['groupFixture']);
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 2, changedReceipt);
  assert.equal(host.writes.filter(key => artifactKeys.has(key)).length, artifactWrites, 'context regeneration preserves identical artifact mtimes');
  assert.equal((await readD2PagesResult(IDENTITY, 'alpha'))?.moleculeReceipt.contextHash, changedReceipt.moleculeReceipt.contextHash);
});

void test('a catalog appearing after an approved honest absence invalidates reuse', async () => {
  const host = await installHost(['alpha']); const available = await molecularFixture();
  const absent = await changedMolecular(available, prepared => {
    prepared.inventory.catalogProject = null; prepared.inventory.selectedBy = null; prepared.inventory.candidates = []; prepared.inventory.groups = []; prepared.inventory.metrics.reads = [];
    prepared.candidates = { groups: [], context: '{}', catalogs: [], reads: [] };
  });
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 1, await pageReceipt(absent, 'context-a'));
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', absent)).length, 1);
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a', available)).length, 0);
});

async function installHost(pages = PAGES) {
  const files: Record<string, Stored> = {}; const writes: string[] = []; const state = { failKey: '' };
  const snapshot: D2InputSnapshot = { ...IDENTITY, schemaVersion: D2_INPUT_VERSION, device: 'web', snapshotHash: `sha256:${'a'.repeat(64)}`, releaseIdentity: null, sources: [], l4: {} as D2InputSnapshot['l4'], selection: { pages: [], writePageIds: pages, preservePageIds: [], remove: [], counts: { pages: pages.length, endpoints: 0, usecases: 0, destinations: pages.length * 2, materializationItems: pages.length * 2 } }, normalizations: [], problems: [] };
  const seed = (info: Info, content = '') => { const file: Stored = { ...info, status: 'changed', content, getContent: async () => file.content }; files[keyOf(info)] = file; return file; };
  seed(d2InputFile(IDENTITY), JSON.stringify(snapshot));
  const units = [];
  for (const pageId of pages) { const source = `export const definition = {"pageId":"${pageId}"} as const;\nexport const pipeline = [] as const;\n`; const sourceHash = await sha256Text(source); seed(d2SharedFile(IDENTITY, pageId), source); units.push({ schemaVersion: D2_SHARED_VERSION, ...IDENTITY, pageId, status: 'approved', snapshotHash: snapshot.snapshotHash, contractHash: 'fixture', contextHash: 'fixture-context', skillHash: 'fixture-skill', sourceHash, artifactPath: `l2/fixture/web/shared/${pageId}.defs.ts`, pipelineItemId: `${pageId}__l2_shared`, attempts: 1 }); for (const device of ['desktop', 'mobile'] as const) seed(d2PageFile(IDENTITY, pageId, device)); seed(d2PagesResultFile(IDENTITY, pageId)); }
  seed(d2SharedManifestFile(IDENTITY), JSON.stringify({ schemaVersion: D2_SHARED_VERSION, ...IDENTITY, status: 'approved', snapshotHash: snapshot.snapshotHash, units })); seed(d2PagesManifestFile(IDENTITY));
  (globalThis as unknown as { mls: unknown }).mls = { actualProject: IDENTITY.project, stor: { files, getKeyToFile: keyOf, localStor: { setContent: async (file: Stored, value: { content: string }) => { const key = keyOf(file); if (key === state.failKey) throw new Error('simulated write failure'); file.content = value.content; writes.push(key); } } } };
  return { snapshot, files, writes, get failKey() { return state.failKey; }, set failKey(value: string) { state.failKey = value; } };
}
function sources(pageId: string) { return { desktop: `export const descriptions = ["${pageId} desktop"] as const;\nexport const pipeline = [] as const;\n`, mobile: `export const descriptions = ["${pageId} mobile"] as const;\nexport const pipeline = [] as const;\n` }; }
async function molecularFixture() {
  const catalog = { reference: '/_102040_/l2/molecules/groupfixture/index.defs', via: 'stor' as const, group: 'groupFixture', usageContract: '/_102020_/l2/aura/molecules/skills/groupFixture/usage', molecules: [{ tag: 'groupfixture--ml-card', defs: '/_102040_/l2/molecules/groupfixture/ml-card.defs' }], scenarios: [{ scenario: 'show', recommended: ['groupfixture--ml-card'] }], skill: 'Fixture group.' };
  const inventory = { consumerProject: 102047, catalogProject: 102040, selectedBy: 'dependency', directDeps: [102040], resolvedDeps: [102040], candidates: [102040], reason: null, groups: [{ groupId: 'groupFixture', purpose: 'Fixture.', moleculeCount: 1, indexReference: catalog.reference }], context: '{}', metrics: { inventoryBytes: 2, totalBytes: 2, reads: [{ role: 'inventory' as const, reference: '/_102040_/l2/molecules/skill', via: 'stor' as const, sha256: `sha256:${'1'.repeat(64)}` }] } };
  const candidates = { groups: [{ groupId: 'groupFixture', scenarios: [{ scenario: 'show', candidates: ['groupfixture--ml-card'] }] }], context: '{}', catalogs: [catalog], reads: [{ role: 'group-index' as const, reference: catalog.reference, via: 'stor' as const, sha256: `sha256:${'2'.repeat(64)}` }] };
  const state = { usageSkill: 'Use the fixture molecule.' };
  const port: D2MoleculeCatalogPort = { discover: async () => ({ activeProject: 102047, directDeps: [102040], resolvedDeps: [102040], candidates: [102040], project: 102040, selectedBy: 'dependency', error: '', warnings: [] }), readLevel1: async () => ({ level1: null, error: 'unused' }), readGroup: async () => ({ catalog, error: '' }), readUsageContract: async reference => ({ contract: { reference, via: 'stor', skill: state.usageSkill }, error: '' }) };
  const prepared: D2MoleculePreparedContext = { inventory, candidates, receipt: await buildD2MoleculeReceipt(inventory, candidates) };
  return { port, prepared, state };
}
async function pageReceipt(molecular: Awaited<ReturnType<typeof molecularFixture>>, contextHash: string, groups: string[] = []) { const selection = await resolveD2MoleculeSelection(molecular.port, molecular.prepared.inventory, groups, molecular.prepared.candidates); return { contextHash, catalogHash: 'catalog', skillHashes: { technical: contextHash }, categoryRef: 'calendarScheduling', categoryReason: 'Scheduling capability.', categoryEvidenceRefs: ['list'], organismIds: ['organism.list.1'], moleculeReasons: { desktop: 'none', mobile: 'none' }, moleculeReceipt: await buildD2MoleculeReceipt(molecular.prepared.inventory, molecular.prepared.candidates, selection) }; }
async function changedMolecular(source: Awaited<ReturnType<typeof molecularFixture>>, mutate: (prepared: D2MoleculePreparedContext) => void) { const prepared = structuredClone(source.prepared); mutate(prepared); prepared.receipt = await buildD2MoleculeReceipt(prepared.inventory, prepared.candidates); return { port: source.port, prepared, state: source.state }; }
function keyOf(info: Info): string { return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`; }
