/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/run.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { D2_INPUT_VERSION, type D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { d2InputFile } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { D2_CONTRACTS_VERSION, sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { d2ContractFile, d2ContractsManifestFile } from '/_102020_/l2/agentDefsL2/steps/contracts30/io.js';
import { d2SharedFile, d2SharedManifestFile, d2SharedResultFile, readD2SharedManifest, readD2SharedResult } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';
import { finalizeD2SharedBarrier, persistD2SharedUnit } from '/_102020_/l2/agentDefsL2/steps/shared40/run.js';

const IDENTITY: D2RunIdentity = { project: 102047, module: 'fixture' };
const PAGE = 'records';
const RECEIPT = { contextHash: 'fixture-context', skillHash: 'fixture-skill' };
type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
type Stored = Info & { status: string; versionRef: string; content: string; getValueInfo: () => Promise<{ content: string }>; getContent: () => Promise<string> };

void test('tampered persisted contract cannot produce an approved shared result or barrier', async () => {
  const host = await installHost();
  host.seed(d2ContractFile(IDENTITY, PAGE), 'export const changed = true;\n');
  await assert.rejects(() => persistD2SharedUnit(IDENTITY, host.snapshot, PAGE, sharedSource(), 1, RECEIPT), /D2_SHARED_CONTRACT_HASH_MISMATCH/);
  assert.equal(await readD2SharedResult(IDENTITY, PAGE), null);
  assert.equal(await readD2SharedManifest(IDENTITY), null);

  host.seed(d2ContractFile(IDENTITY, PAGE), host.contractSource);
  await persistD2SharedUnit(IDENTITY, host.snapshot, PAGE, sharedSource(), 1, RECEIPT);
  host.seed(d2ContractFile(IDENTITY, PAGE), 'export const changedAgain = true;\n');
  await assert.rejects(() => finalizeD2SharedBarrier(IDENTITY, host.snapshot), /D2_SHARED_CONTRACT_HASH_MISMATCH/);
  assert.equal(await readD2SharedManifest(IDENTITY), null);
});

void test('snapshot switched after shared write cannot produce an approved result or barrier', async () => {
  const host = await installHost(); let checks = 0;
  const verify = async () => {
    checks += 1;
    if (checks === 3) host.seed(d2InputFile(IDENTITY), JSON.stringify({ ...host.snapshot, snapshotHash: `sha256:${'f'.repeat(64)}` }));
  };
  await assert.rejects(() => persistD2SharedUnit(IDENTITY, host.snapshot, PAGE, sharedSource(), 1, RECEIPT, verify), /D2_SHARED_STALE_RUN/);
  assert.match(host.files[keyOf(d2SharedFile(IDENTITY, PAGE))].content, /export const definition/);
  assert.equal(await readD2SharedResult(IDENTITY, PAGE), null);
  assert.equal(await readD2SharedManifest(IDENTITY), null);
});

void test('identical receipt is a no-op while changed context or legacy receipt invalidates reuse', async () => {
  const host = await installHost(); const source = sharedSource();
  const receiptA = { contextHash: 'context-a', skillHash: 'skill-a' };
  const receiptB = { contextHash: 'context-b', skillHash: 'skill-b' };
  await persistD2SharedUnit(IDENTITY, host.snapshot, PAGE, source, 1, receiptA);
  host.writes.length = 0;
  const reused = await persistD2SharedUnit(IDENTITY, host.snapshot, PAGE, source, 2, receiptA);
  assert.equal(reused.attempts, 1); assert.deepEqual(host.writes, []);
  const refreshed = await persistD2SharedUnit(IDENTITY, host.snapshot, PAGE, source, 2, receiptB);
  assert.equal(refreshed.contextHash, 'context-b');
  assert.equal(host.writes.includes(keyOf(d2SharedFile(IDENTITY, PAGE))), false, 'identical source is not rewritten');
  host.seed(d2SharedResultFile(IDENTITY, PAGE), JSON.stringify({ ...refreshed, schemaVersion: 'legacy-v1' }));
  const upgraded = await persistD2SharedUnit(IDENTITY, host.snapshot, PAGE, source, 2, receiptB);
  assert.notEqual(upgraded.schemaVersion, 'legacy-v1');
});

async function installHost() {
  const files: Record<string, Stored> = {};
  const writes: string[] = [];
  const snapshot: D2InputSnapshot = { ...IDENTITY, schemaVersion: D2_INPUT_VERSION, device: 'web', snapshotHash: `sha256:${'a'.repeat(64)}`, releaseIdentity: null, sources: [], l4: {} as D2InputSnapshot['l4'], selection: { pages: [], writePageIds: [PAGE], preservePageIds: [], remove: [], counts: { pages: 1, endpoints: 1, usecases: 1, destinations: 2, materializationItems: 1 } }, normalizations: [], problems: [] };
  const contractSource = 'export const listRecordRoute = "fixture.records.qryListRecord" as const;\n';
  const contractHash = await sha256Text(contractSource);
  const seed = (info: Info, content = '') => { const file: Stored = { ...info, status: 'changed', versionRef: '1', content, getValueInfo: async () => ({ content: file.content }), getContent: async () => file.content }; files[keyOf(info)] = file; return file; };
  seed(d2InputFile(IDENTITY), JSON.stringify(snapshot));
  seed(d2ContractFile(IDENTITY, PAGE), contractSource);
  seed(d2ContractsManifestFile(IDENTITY), JSON.stringify({ schemaVersion: D2_CONTRACTS_VERSION, ...IDENTITY, status: 'approved', snapshotHash: snapshot.snapshotHash, units: [{ schemaVersion: D2_CONTRACTS_VERSION, ...IDENTITY, pageId: PAGE, mode: 'create', status: 'approved', snapshotHash: snapshot.snapshotHash, artifactPath: `l2/${IDENTITY.module}/web/contracts/${PAGE}.defs.ts`, sourceHash: contractHash, routes: ['fixture.records.qryListRecord'], normalizations: [] }] }));
  seed(d2SharedFile(IDENTITY, PAGE)); seed(d2SharedResultFile(IDENTITY, PAGE)); seed(d2SharedManifestFile(IDENTITY));
  (globalThis as unknown as { mls: unknown }).mls = { actualProject: IDENTITY.project, stor: { files, getKeyToFile: keyOf, localStor: { setContent: async (file: Stored, value: { content: string }) => { writes.push(keyOf(file)); file.content = value.content; } } } };
  return { files, snapshot, contractSource, seed, writes };
}
function sharedSource(): string { return 'export const definition = {"schemaVersion":"test"} as const;\nexport const pipeline = {"type":"l2_shared"} as const;\n'; }
function keyOf(info: Info): string { return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`; }
