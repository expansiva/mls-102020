/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3StepFailure.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { failM3Step, m3ErrorCode, type M3FailurePort } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3StepFailure.js';
import type { M3RunSummary } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.js';

test('m3ErrorCode takes the M3_ prefix or falls back', () => {
  assert.equal(m3ErrorCode('M3_DEFS_DRIFT: x expected a got b'), 'M3_DEFS_DRIFT');
  assert.equal(m3ErrorCode('boom'), 'M3_STEP_FAILED');
});

test('failM3Step records the degradation, then saves a failed summary, and returns the reason', async () => {
  const calls: string[] = [];
  let saved: M3RunSummary | null = null;
  const port: M3FailurePort = {
    recordDegradation: async (kind, reason) => { calls.push(`record:${kind}:${reason}`); },
    saveSummary: async summary => { calls.push('save'); saved = summary; return 'p'; },
    readRun: async () => ({ startedAt: '2026-10-01T14:59:00.000Z', command: '@@agentMaterializeL2v3 m /pages p' }),
    now: () => new Date(Date.UTC(2026, 9, 1, 15, 0, 0)),
  };
  const reason = await failM3Step(port, { module: 'm', runDir: 'run_20261001150000', stepId: 'input20' }, 'M3_DEFS_SCOPE: x');
  assert.equal(reason, 'M3_DEFS_SCOPE: x');
  assert.deepEqual(calls, ['record:M3_DEFS_SCOPE:M3_DEFS_SCOPE: x', 'save']);
  const summary = saved as unknown as M3RunSummary;
  assert.equal(summary.verdict, 'failed');
  assert.equal(summary.startedAt, '2026-10-01T14:59:00.000Z');
  assert.equal(summary.command, '@@agentMaterializeL2v3 m /pages p');
  assert.equal(summary.finishedAt, '2026-10-01T15:00:00.000Z');
  assert.deepEqual(summary.counts, { failedStep: 'input20' });
  assert.equal(summary.degradations[0].kind, 'M3_DEFS_SCOPE');
});

test('failM3Step survives a port that throws', async () => {
  const port: M3FailurePort = {
    recordDegradation: async () => { throw new Error('x'); },
    saveSummary: async () => { throw new Error('y'); },
    readRun: async () => { throw new Error('z'); },
    now: () => new Date(),
  };
  assert.equal(await failM3Step(port, { module: 'm', runDir: 'r', stepId: 's' }, 'M3_A: b'), 'M3_A: b');
});

test('failM3Step without run.json leaves startedAt null and command empty', async () => {
  let saved: M3RunSummary | null = null;
  const port: M3FailurePort = {
    recordDegradation: async () => undefined,
    saveSummary: async summary => { saved = summary; return 'p'; },
    readRun: async () => null,
    now: () => new Date(),
  };
  await failM3Step(port, { module: 'm', runDir: 'r', stepId: 'entry10' }, 'M3_A: b');
  const summary = saved as unknown as M3RunSummary;
  assert.equal(summary.startedAt, null);
  assert.equal(summary.command, '');
});

test('failM3Step still saves the summary when readRun throws', async () => {
  let saved: M3RunSummary | null = null;
  const port: M3FailurePort = {
    recordDegradation: async () => undefined,
    saveSummary: async summary => { saved = summary; return 'p'; },
    readRun: async () => { throw new Error('boom'); },
    now: () => new Date(),
  };
  assert.equal(await failM3Step(port, { module: 'm', runDir: 'r', stepId: 's' }, 'M3_A: b'), 'M3_A: b');
  const summary = saved as unknown as M3RunSummary;
  assert.equal(summary.startedAt, null);
  assert.equal(summary.command, '');
});
