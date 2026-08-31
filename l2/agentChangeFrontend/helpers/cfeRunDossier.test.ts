/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeRunDossier.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRunStepRecords } from '/_102020_/l2/agentChangeFrontend/helpers/cfeRunSteps.js';
import { buildCfRunReport, cfRunLatestMlsPath, cfRunSnapshotMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeRunReport.js';

test('collectRunStepRecords keeps title, status and last trace of nested steps', () => {
  const records = collectRunStepRecords([
    {
      stepId: 1, type: 'agent', stepTitle: 'Scan', status: 'completed', agentName: 'agentCfeCreateScanL4',
      nextSteps: [
        { stepId: 2, type: 'agent', stepTitle: 'Finalize', status: 'completed', agentName: 'agentCfeCreateFinalize',
          interaction: { trace: ['moduleCompile=8 file(s) clean', 'Agent build: 102020@def'] } },
      ],
    },
  ]);
  assert.equal(records.length, 2);
  assert.equal(records[1].lastTrace, 'Agent build: 102020@def');
  assert.equal(records[1].agentName, 'agentCfeCreateFinalize');
});

test('the last finalize dossier is distinguishable and has a stable path', () => {
  const repairing = buildCfRunReport({
    moduleName: 'petShop',
    attempt: 1,
    final: false,
    repairRounds: 0,
    pagesDone: ['recordInStoreServiceAttendance'],
    ownersDone: [],
    skippedPages: [],
    gate: { checked: 95, errors: ['TS2339'], repairing: true },
    agentBuild: { buildRef: 'abc' },
    steps: [],
    summary: 'MODULE-COMPILE-FAILED -> repair round 1',
  });
  assert.equal(repairing.final, false);
  assert.equal(repairing.attempt, 1);
  assert.equal(repairing.repairRounds, 0);

  const last = buildCfRunReport({
    moduleName: 'petShop',
    attempt: 2,
    final: true,
    repairRounds: 1,
    pagesDone: ['recordInStoreServiceAttendance'],
    ownersDone: [],
    skippedPages: [],
    gate: { checked: 95, errors: [] },
    agentBuild: { buildRef: 'abc' },
    steps: [],
    summary: 'moduleCompile=95 file(s) with no Monaco errors; repaired in 1 round(s)',
  });
  assert.equal(last.final, true);
  assert.equal(last.attempt, 2);
  assert.equal(last.repairRounds, 1);
  assert.equal(cfRunLatestMlsPath(102047, 'petShop'), '_102047_/l4/petShop/pipeline/trace/l2/cf-run.json');
  assert.match(cfRunSnapshotMlsPath(102047, 'petShop', '2026-08-22T20-39-54-548Z'), /cf-run-2026-08-22T20-39-54-548Z\.json$/);
});
