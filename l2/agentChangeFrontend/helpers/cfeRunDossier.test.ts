/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeRunDossier.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRunStepRecords } from '/_102020_/l2/agentChangeFrontend/helpers/cfeRunSteps.js';

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
