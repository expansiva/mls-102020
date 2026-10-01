/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/entry10/run.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { executeM3Entry, type M3EntryPort } from '/_102020_/l2/agentMaterializeL2v3/steps/entry10/run.js';

const identity = { project: 102047, module: 'controleEstoque', pages: ['produtos'], devices: ['desktop' as const, 'mobile' as const], runDir: 'run_20261001143205' };

function port(existing: string[]) {
  const writes: Array<{ info: any; value: any }> = [];
  const failures: string[] = [];
  const fake: M3EntryPort = {
    listRunDirs: () => existing,
    writeJson: async (info, value) => { writes.push({ info, value }); },
    now: () => new Date(Date.UTC(2026, 9, 1, 14, 32, 6)),
    failure: {
      recordDegradation: async (kind) => { failures.push(`record:${kind}`); },
      saveSummary: async summary => { failures.push(`summary:${summary.verdict}`); return null; },
      readRun: async () => null,
      now: () => new Date(),
    },
  };
  return { fake, writes, failures };
}

test('writes run.json in the run folder', async () => {
  const { fake, writes, failures } = port(['run_20260101000000']);
  const result = await executeM3Entry(fake, identity, '@@agentMaterializeL2v3 controleEstoque /pages produtos');
  assert.equal(result.status, 'completed');
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].info, { project: 102047, level: 2, folder: 'controleEstoque/pipeline/trace/agentMaterializeL2v3/run_20261001143205', shortName: 'run', extension: '.json' });
  assert.deepEqual(writes[0].value, {
    schemaVersion: '2026-10-01-m3-run-v1', project: 102047, module: 'controleEstoque', pages: ['produtos'], devices: ['desktop', 'mobile'],
    runDir: 'run_20261001143205', startedAt: '2026-10-01T14:32:06.000Z', command: '@@agentMaterializeL2v3 controleEstoque /pages produtos',
  });
  assert.deepEqual(failures, []);
});

test('refuses an occupied runDir, writes nothing and leaves the failure records', async () => {
  const { fake, writes, failures } = port(['run_20261001143205']);
  const result = await executeM3Entry(fake, identity, '');
  assert.deepEqual(result, { status: 'failed', reason: 'M3_RUN_DIR_TAKEN: run_20261001143205' });
  assert.equal(writes.length, 0);
  assert.deepEqual(failures, ['record:M3_RUN_DIR_TAKEN', 'summary:failed']);
});
