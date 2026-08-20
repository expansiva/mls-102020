/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CH_CHARS_PER_TOKEN,
  chCanonicalGroup,
  chFileRefFromImport,
  chDoneAnchor,
  chEstTokens,
  chGroupArg,
  chGroupDoneAnchor,
  chGroupFolder,
  chGroupPlanId,
  chIsNone,
  chMeasurePrompt,
  chParseModelType,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

void test('the fixed anchors follow the family convention', () => {
  assert.equal(chDoneAnchor('c1-groups'), 'c1-done');
  assert.equal(chDoneAnchor('c3-report'), 'c3-done');
});

void test('every group gets its OWN c2 anchor — a shared one would unlock the report early', () => {
  assert.equal(chGroupPlanId('groupSelectOne'), 'c2-groupselectone');
  assert.equal(chGroupDoneAnchor('groupSelectOne'), 'c2-groupselectone-done');
  assert.notEqual(chGroupDoneAnchor('groupSelectOne'), chGroupDoneAnchor('groupViewTable'));
  assert.equal(chGroupFolder('groupViewTable'), 'groupviewtable');
});

void test('a group is matched case-insensitively and reported in the catalog spelling', () => {
  const known = ['groupSelectOne', 'groupViewTable'];
  assert.equal(chCanonicalGroup('groupselectone', known), 'groupSelectOne');
  assert.equal(chCanonicalGroup('  GROUPVIEWTABLE ', known), 'groupViewTable');
  assert.equal(chCanonicalGroup('groupViewChart', known), '');
  assert.equal(chCanonicalGroup('', known), '');
});

void test('the "nothing fits" sentinel is accepted in both languages the prompts are answered in', () => {
  for (const word of ['none', 'None', ' NULL ', 'nenhum', 'nenhuma', '', 'n/a']) assert.equal(chIsNone(word), true, word);
  for (const word of ['groupSelectOne', 'ml-combobox', 'nenhumaideia']) assert.equal(chIsNone(word), false, word);
});

void test('the token estimate is chars / 4, rounded up', () => {
  assert.equal(CH_CHARS_PER_TOKEN, 4);
  assert.equal(chEstTokens(0), 0);
  assert.equal(chEstTokens(1), 1);
  assert.equal(chEstTokens(1547), 387);
  assert.equal(chEstTokens(-10), 0);
});

void test('the prompt measurement separates the catalog from the instructions and the input', () => {
  const catalog = 'C'.repeat(400);
  const systemPrompt = `<!-- modelType: reasoning -->${'I'.repeat(100)}${catalog}`;
  const humanPrompt = 'H'.repeat(40);
  const size = chMeasurePrompt({ planId: 'c1-groups', attempt: 2, systemPrompt, catalog, humanPrompt });

  assert.equal(size.catalogChars, 400);
  assert.equal(size.instructionChars, systemPrompt.length - 400);
  assert.equal(size.inputChars, 40);
  assert.equal(size.totalChars, systemPrompt.length + 40);
  assert.equal(size.totalTokensEst, Math.ceil((systemPrompt.length + 40) / 4));
  assert.equal(size.modelType, 'reasoning');
  assert.equal(size.attempt, 2);
});

void test('the modelType marker is reported from the prompt that actually shipped', () => {
  assert.equal(chParseModelType('<!-- modelType: classifier -->\nx'), 'classifier');
  assert.equal(chParseModelType('<!--modelType:reasoning-->'), 'reasoning');
  assert.equal(chParseModelType('no marker here'), '');
});

void test('the group travels in the step args, and a step planted without one says so', () => {
  assert.equal(chGroupArg(JSON.stringify({ planId: 'c2-groupselectone', runKey: 'r', group: 'groupSelectOne' })), 'groupSelectOne');
  assert.equal(chGroupArg({ group: ' groupViewTable ' }), 'groupViewTable');
  assert.equal(chGroupArg(JSON.stringify({ planId: 'c1-groups' })), '');
  assert.equal(chGroupArg('not json'), '');
  assert.equal(chGroupArg(undefined), '');
});

void test('an import reference maps to the stor file behind it — .defs is an extension, not a name', () => {
  assert.deepEqual(chFileRefFromImport('/_102040_/l2/molecules/groupenterdate/index.defs'), {
    project: 102040,
    level: 2,
    folder: 'molecules/groupenterdate',
    shortName: 'index',
    extension: '.defs.ts',
  });
  assert.deepEqual(chFileRefFromImport('/_102040_/l2/molecules/skill'), {
    project: 102040,
    level: 2,
    folder: 'molecules',
    shortName: 'skill',
    extension: '.ts',
  });
  // The trailing .ts is tolerated: the same reference is written both ways across the codebase.
  assert.equal(chFileRefFromImport('_102040_/l2/molecules/skill.ts')?.shortName, 'skill');
});

void test('anything that is not a project reference is refused instead of guessed', () => {
  for (const bad of ['', 'https://on.collab.codes/x.js', '/_abc_/l2/x', '/_102040_/molecules/x', '/_102040_/l2/']) {
    assert.equal(chFileRefFromImport(bad), null, bad);
  }
});
