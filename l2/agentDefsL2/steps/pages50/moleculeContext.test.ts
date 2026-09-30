/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildD2MoleculeInventory, moleculeGroupPrompt, readD2MoleculeShortlist, type D2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { gateD2MoleculeRoles, moleculeDecisionContext, parseD2MoleculeGroupJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';

void test('molecular research reads only selected groups and validates exact tags by organism role', async () => {
  const reads: string[] = [];
  const port: D2MoleculeCatalogPort = {
    discover: async () => ({ catalogProject: 102040, selectedBy: 'dependency', directDependencies: [102040], source: 'catalog-v1', groups: [
      { groupId: 'groupViewTable', purpose: 'Tabular records', count: 2, indexReference: '/_102040_/l2/molecules/groupviewtable/index.defs' },
      { groupId: 'groupEnterText', purpose: 'Text entry', count: 1, indexReference: '/_102040_/l2/molecules/groupentertext/index.defs' },
    ] }),
    readGroup: async summary => { reads.push(summary.groupId); return { groupId: summary.groupId, purpose: summary.purpose, indexReference: summary.indexReference,
      usageReference: `${summary.indexReference}/usage`, tags: summary.groupId === 'groupViewTable' ? ['groupviewtable--ml-responsive-data-table'] : ['groupentertext--ml-enter-text'],
      scenarios: [], indexSource: 'source', indexText: 'index', usageSource: 'usage source', usageText: 'usage' }; },
  };
  const inventory = await buildD2MoleculeInventory(port, 102047);
  const phaseOne = moleculeGroupPrompt(inventory, [{ id: 'organism1', kind: 'list', text: 'Products' }]);
  assert.equal(phaseOne.includes('groupviewtable--ml-responsive-data-table'), false);
  const judgment = parseD2MoleculeGroupJudgment({ organisms: [{ organismId: 'organism1', groups: [
    { groupId: 'groupViewTable', relevant: true, reason: 'The organism lists records.' },
    { groupId: 'groupEnterText', relevant: false, reason: 'The organism does not edit text.' },
  ] }] }, ['organism1'], inventory);
  const selected = judgment.selected;
  const shortlist = await readD2MoleculeShortlist(port, inventory, selected);
  assert.deepEqual(reads, ['groupViewTable']);
  assert.equal(moleculeDecisionContext(selected, shortlist.groups).includes('groupviewtable--ml-responsive-data-table'), true);
  assert.deepEqual(gateD2MoleculeRoles({ lista: [{ role: 'list', preferred: 'groupviewtable--ml-responsive-data-table' }] }, { lista: ['groupViewTable'] }, shortlist.groups), []);
  assert.equal(gateD2MoleculeRoles({ lista: [{ role: 'text', preferred: 'groupentertext--ml-enter-text' }] }, { lista: ['groupViewTable'] }, shortlist.groups).length, 1);
  assert.throws(() => parseD2MoleculeGroupJudgment({ organisms: [{ organismId: 'organism1', groups: [{ groupId: 'groupViewTable', relevant: true, reason: 'Fits.' }] }] }, ['organism1'], inventory), /D2_MOLECULE_GROUP_COVERAGE/u);
  await assert.rejects(() => readD2MoleculeShortlist(port, inventory, { organism1: ['invented'] }), /D2_MOLECULE_GROUP_UNKNOWN/u);
});
