/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { D2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { parseD2MoleculeGroupJudgment, type D2MoleculeGroupJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';

const inventory = { groups: [{ groupId: 'groupViewTable' }, { groupId: 'groupEnterText' }] } as D2MoleculeInventory;

void test('group response keeps only the relevant ids and reads an old receipt', () => {
  const parsed = parseD2MoleculeGroupJudgment({ organisms: [{ organismId: 'organism1', groups: ['groupViewTable'] }] }, ['organism1', 'organism2'], inventory);
  assert.deepEqual(parsed.selected, { organism1: ['groupViewTable'], organism2: [] });
  assert.deepEqual(parsed.assessments, [{ organismId: 'organism1', groups: [{ groupId: 'groupViewTable', relevant: true }] }]);
  assert.equal(Object.hasOwn(parsed.assessments[0].groups[0], 'reason'), false);

  assert.throws(() => parseD2MoleculeGroupJudgment({ organisms: [{ organismId: 'organism1', groups: ['missing'] }] }, ['organism1'], inventory), /D2_MOLECULE_GROUP_RESPONSE/u);
  assert.throws(() => parseD2MoleculeGroupJudgment({ organisms: [{ organismId: 'organism1', groups: [] }, { organismId: 'organism1', groups: [] }] }, ['organism1'], inventory), /D2_MOLECULE_GROUP_RESPONSE/u);

  const stored: D2MoleculeGroupJudgment = { organismId: 'organism1', groups: [
    { groupId: 'groupViewTable', relevant: true, reason: 'The organism lists records.' },
    { groupId: 'groupEnterText', relevant: false, reason: 'The organism does not edit text.' },
  ] };
  assert.deepEqual(stored.groups.filter(group => group.relevant).map(group => group.groupId), ['groupViewTable']);
});
