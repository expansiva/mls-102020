/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/guard.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { checkAfterDefs, snapshotOf } from '/_102020_/l2/agentNewReleaseL2/helpers/guard.js';

const INSIDE = 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts';
const OUTSIDE = 'l2/tarefas/web/shared/minhas_tarefas.defs.ts';
const PIPELINE = 'l2/tarefas/pipeline/agentDefsL2/shared60/minhas_tarefas.json';

test('a product change outside the planned pages is reported and pipeline is ignored', async () => {
  const before = await snapshotOf([
    { path: INSIDE, bytes: 'contract-a' },
    { path: OUTSIDE, bytes: 'shared-a' },
    { path: PIPELINE, bytes: 'receipt-a' },
  ]);
  const after = await snapshotOf([
    { path: INSIDE, bytes: 'contract-b' },
    { path: OUTSIDE, bytes: 'shared-b' },
    { path: PIPELINE, bytes: 'receipt-b' },
  ]);
  assert.equal(PIPELINE in before, false);
  assert.deepEqual(checkAfterDefs(before, after, ['tarefas_equipe']), {
    created: [],
    changed: [INSIDE, OUTSIDE],
    deleted: [],
    outside: [OUTSIDE],
  });
});
