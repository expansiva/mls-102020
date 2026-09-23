/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { D2_INPUT_VERSION, type D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { d2InputFile } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { D2_SHARED_VERSION } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { d2SharedFile, d2SharedManifestFile } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';
import { d2PageFile, d2PagesManifestFile, d2PagesResultFile, readD2PagesManifest } from '/_102020_/l2/agentDefsL2/steps/pages50/io.js';
import { finalizeD2PagesBarrier, findReusableD2PagesUnits, persistD2PagesUnit } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

const IDENTITY: D2RunIdentity = { project: 102047, module: 'fixture' };
const PAGES = ['alpha', 'beta'];
type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
type Stored = Info & { status: string; content: string; getContent: () => Promise<string> };

void test('one failed page leaves its approved sibling untouched and barrier waits for both device defs', async () => {
  const host = await installHost();
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 1);
  const alphaDesktop = keyOf(d2PageFile(IDENTITY, 'alpha', 'desktop')); const alphaMobile = keyOf(d2PageFile(IDENTITY, 'alpha', 'mobile'));
  const alphaWrites = host.writes.filter(key => key === alphaDesktop || key === alphaMobile).length;
  assert.equal(await finalizeD2PagesBarrier(IDENTITY, host.snapshot), null);

  host.failKey = keyOf(d2PageFile(IDENTITY, 'beta', 'mobile'));
  await assert.rejects(() => persistD2PagesUnit(IDENTITY, host.snapshot, 'beta', sources('beta'), ['beta__desktop__page11', 'beta__mobile__page11'], 1), /simulated write failure/);
  assert.equal(host.writes.filter(key => key === alphaDesktop || key === alphaMobile).length, alphaWrites);
  assert.equal(await readD2PagesManifest(IDENTITY), null);

  host.failKey = '';
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'beta', sources('beta'), ['beta__desktop__page11', 'beta__mobile__page11'], 2);
  const alphaShared = host.files[keyOf(d2SharedFile(IDENTITY, 'alpha'))]; const originalShared = alphaShared.content;
  alphaShared.content = 'tampered shared';
  await assert.rejects(() => finalizeD2PagesBarrier(IDENTITY, host.snapshot), /D2_PAGES_SHARED_HASH_MISMATCH/);
  assert.equal(await readD2PagesManifest(IDENTITY), null);
  alphaShared.content = originalShared;
  const manifest = await finalizeD2PagesBarrier(IDENTITY, host.snapshot);
  assert.equal(manifest?.units.length, 2);
  assert.equal(manifest?.units.flatMap(unit => Object.values(unit.artifactPaths)).length, 4);
  assert.equal(host.writes.filter(key => key === alphaDesktop || key === alphaMobile).length, alphaWrites);
});

void test('partial resume reuses four valid pages and redispatches missing or corrupted units', async () => {
  const pages = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const host = await installHost(pages);
  for (const pageId of pages.slice(0, 4)) {
    await persistD2PagesUnit(IDENTITY, host.snapshot, pageId, sources(pageId), [`${pageId}__desktop__page11`, `${pageId}__mobile__page11`], 1);
  }

  const reusable = await findReusableD2PagesUnits(IDENTITY, host.snapshot);
  assert.deepEqual(reusable.map(unit => unit.pageId), ['alpha', 'beta', 'delta', 'gamma']);
  assert.deepEqual(pages.filter(pageId => !reusable.some(unit => unit.pageId === pageId)), ['epsilon']);
  host.files[keyOf(d2PageFile(IDENTITY, 'beta', 'mobile'))].content = 'corrupted mobile artifact';
  const afterCorruption = await findReusableD2PagesUnits(IDENTITY, host.snapshot);
  assert.deepEqual(afterCorruption.map(unit => unit.pageId), ['alpha', 'delta', 'gamma']);
  assert.deepEqual(pages.filter(pageId => !afterCorruption.some(unit => unit.pageId === pageId)), ['beta', 'epsilon']);
  assert.equal(await finalizeD2PagesBarrier(IDENTITY, host.snapshot), null);
});

void test('unchanged context is a byte no-op while a skill hash invalidates reuse', async () => {
  const host = await installHost(['alpha']); const receipt = (hash: string) => ({ contextHash: hash, catalogHash: 'catalog', skillHashes: { technical: hash }, categoryRef: 'calendarScheduling', categoryReason: 'Scheduling capability.', categoryEvidenceRefs: ['list'], moleculeRecommendations: { desktop: { reason: 'none', recommendations: [] }, mobile: { reason: 'none', recommendations: [] } } });
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 1, undefined, async () => undefined, receipt('context-a'));
  const desktop = keyOf(d2PageFile(IDENTITY, 'alpha', 'desktop')); const mobile = keyOf(d2PageFile(IDENTITY, 'alpha', 'mobile'));
  const artifactWrites = () => host.writes.filter(item => item === desktop || item === mobile).length;
  const before = artifactWrites();
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 2, undefined, async () => undefined, receipt('context-a'));
  assert.equal(artifactWrites(), before);
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-a')).length, 1);
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-b')).length, 0);
  await persistD2PagesUnit(IDENTITY, host.snapshot, 'alpha', sources('alpha'), ['alpha__desktop__page11', 'alpha__mobile__page11'], 2, undefined, async () => undefined, receipt('context-b'));
  assert.equal(artifactWrites(), before, 'context regeneration preserves identical artifact bytes');
  assert.equal((await findReusableD2PagesUnits(IDENTITY, host.snapshot, async () => undefined, 'context-b')).length, 1);
});

async function installHost(pages = PAGES) {
  const files: Record<string, Stored> = {}; const writes: string[] = []; const state = { failKey: '' };
  const snapshot: D2InputSnapshot = { ...IDENTITY, schemaVersion: D2_INPUT_VERSION, device: 'web', snapshotHash: `sha256:${'a'.repeat(64)}`, releaseIdentity: null, sources: [], l4: {} as D2InputSnapshot['l4'], selection: { pages: [], writePageIds: pages, preservePageIds: [], remove: [], counts: { pages: pages.length, endpoints: 0, usecases: 0, destinations: pages.length * 2, materializationItems: pages.length * 2 } }, normalizations: [], problems: [] };
  const seed = (info: Info, content = '') => { const file: Stored = { ...info, status: 'changed', content, getContent: async () => file.content }; files[keyOf(info)] = file; return file; };
  seed(d2InputFile(IDENTITY), JSON.stringify(snapshot));
  const units = [];
  for (const pageId of pages) { const source = `export const definition = {"pageId":"${pageId}"} as const;\nexport const pipeline = {} as const;\n`; const sourceHash = await sha256Text(source); seed(d2SharedFile(IDENTITY, pageId), source); units.push({ schemaVersion: D2_SHARED_VERSION, ...IDENTITY, pageId, status: 'approved', snapshotHash: snapshot.snapshotHash, contractHash: 'fixture', sourceHash, artifactPath: `l2/fixture/web/shared/${pageId}.defs.ts`, pipelineItemId: `${pageId}__l2_shared`, attempts: 1 }); for (const device of ['desktop', 'mobile'] as const) seed(d2PageFile(IDENTITY, pageId, device)); seed(d2PagesResultFile(IDENTITY, pageId)); }
  seed(d2SharedManifestFile(IDENTITY), JSON.stringify({ schemaVersion: D2_SHARED_VERSION, ...IDENTITY, status: 'approved', snapshotHash: snapshot.snapshotHash, units })); seed(d2PagesManifestFile(IDENTITY));
  (globalThis as unknown as { mls: unknown }).mls = { actualProject: IDENTITY.project, stor: { files, getKeyToFile: keyOf, localStor: { setContent: async (file: Stored, value: { content: string }) => { const key = keyOf(file); if (key === state.failKey) throw new Error('simulated write failure'); file.content = value.content; writes.push(key); } } } };
  return { snapshot, files, writes, get failKey() { return state.failKey; }, set failKey(value: string) { state.failKey = value; } };
}
function sources(pageId: string) { return { desktop: `export const descriptions = ["${pageId} desktop"] as const;\nexport const pipeline = [] as const;\n`, mobile: `export const descriptions = ["${pageId} mobile"] as const;\nexport const pipeline = [] as const;\n` }; }
function keyOf(info: Info): string { return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`; }
