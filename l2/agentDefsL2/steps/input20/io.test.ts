/// <mls fileReference="_102020_/l2/agentDefsL2/steps/input20/io.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { D2_INPUT_VERSION, type D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { assertD2InputSourcesStable, d2InputFile, d2InputReportFile, readD2InputProblems, writeAcceptedD2Input, writeRefusedD2Input } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';

const identity: D2RunIdentity = { project: 102047, module: 'agendaClinica' };
type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
type Stored = Info & { status: string; versionRef: string; content: string; getValueInfo: () => Promise<{ content: string }>; getContent: () => Promise<string> };
const keyOf = (info: Info) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

function installHost(): { files: Record<string, Stored>; writes: string[]; seed: (info: Info, content?: string) => Stored } {
  const files: Record<string, Stored> = {};
  const writes: string[] = [];
  const seed = (info: Info, content = '') => {
    const file: Stored = { ...info, status: 'changed', versionRef: '1', content, getValueInfo: async () => ({ content: file.content }), getContent: async () => file.content };
    files[keyOf(info)] = file; return file;
  };
  (globalThis as unknown as { mls: unknown }).mls = { actualProject: identity.project, stor: { files, getKeyToFile: keyOf, localStor: { setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; writes.push(keyOf(file)); } } } };
  return { files, writes, seed };
}

function snapshot(hash = `sha256:${'b'.repeat(64)}`): D2InputSnapshot {
  return {
    ...identity, schemaVersion: D2_INPUT_VERSION, device: 'web', snapshotHash: hash, releaseIdentity: null,
    sources: [], l4: {} as D2InputSnapshot['l4'],
    selection: { pages: [], writePageIds: [], preservePageIds: [], remove: [], counts: { pages: 0, endpoints: 0, usecases: 0, destinations: 0, materializationItems: 0 } },
    normalizations: [], problems: [{ severity: 'info', code: 'NO_COMMON_RELEASE_IDENTITY', file: 'input20', message: 'hash-only coherence' }],
  };
}

void test('restart reuses the exact accepted input snapshot and the named reader exposes findings', async () => {
  const host = installHost();
  const input = host.seed(d2InputFile(identity));
  host.seed(d2InputReportFile(identity));
  assert.deepEqual(await writeAcceptedD2Input(identity, snapshot()), { reused: false });
  const firstBytes = input.content;
  const inputWrites = host.writes.filter(key => key === keyOf(d2InputFile(identity))).length;
  assert.deepEqual(await writeAcceptedD2Input(identity, snapshot()), { reused: true });
  assert.equal(input.content, firstBytes);
  assert.equal(host.writes.filter(key => key === keyOf(d2InputFile(identity))).length, inputWrites);
  assert.deepEqual((await readD2InputProblems(identity)).map(item => item.code), ['NO_COMMON_RELEASE_IDENTITY']);
});

void test('refusal writes only the structured report and never replaces a previous accepted input', async () => {
  const host = installHost();
  const accepted = snapshot();
  const input = host.seed(d2InputFile(identity), `${JSON.stringify(accepted)}\n`);
  host.seed(d2InputReportFile(identity));
  const original = input.content;
  await writeRefusedD2Input(identity, [{ severity: 'error', code: 'TOTALS_MISMATCH', file: 'effort.json', message: 'bad total' }]);
  assert.equal(input.content, original);
  assert.deepEqual(host.writes, [keyOf(d2InputReportFile(identity))]);
  const report = JSON.parse(host.files[keyOf(d2InputReportFile(identity))].content) as { outcome: string; problems: Array<{ code: string }> };
  assert.equal(report.outcome, 'refused');
  assert.deepEqual(report.problems.map(item => item.code), ['TOTALS_MISMATCH']);
  assert.deepEqual((await readD2InputProblems(identity)).map(item => item.code), ['TOTALS_MISMATCH']);
});

void test('source stability reread detects a byte change before input20 is released', async () => {
  const host = installHost();
  const info: Info = { project: identity.project, level: 4, folder: identity.module, shortName: 'module', extension: '.defs.ts' };
  const file = host.seed(info, 'original bytes');
  const hash = `sha256:${createHash('sha256').update(file.content).digest('hex')}`;
  const bundle = { artifacts: {} as never, files: [{ info, digest: { path: `l4/${identity.module}/module.defs.ts`, sha256: hash, bytes: file.content.length, schemaVersion: 'v' } }] };
  await assertD2InputSourcesStable(bundle);
  file.content = 'changed bytes';
  await assert.rejects(() => assertD2InputSourcesStable(bundle), /SOURCE_CHANGED_DURING_INPUT/);
});
