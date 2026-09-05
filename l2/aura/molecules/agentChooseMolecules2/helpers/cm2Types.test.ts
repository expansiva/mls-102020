/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cm2ComponentReference,
  cm2DoneAnchor,
  cm2GroupDoneAnchor,
  cm2GroupFolder,
  cm2GroupPlanId,
  cm2ParseStepArgs,
  cm2PipelineRef,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.js';

void test('cm2PipelineRef turns the IMPORT form the catalog publishes into the PIPELINE form materialize reads', () => {
  // usageContract, exactly as a group's index.defs.ts publishes it.
  assert.equal(
    cm2PipelineRef('/_102020_/l2/aura/molecules/skills/groupEnterMoney/usage'),
    '_102020_/l2/aura/molecules/skills/groupEnterMoney/usage.ts',
  );
});

void test('cm2PipelineRef leaves an already-correct reference untouched (idempotent)', () => {
  const ref = '_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts';
  assert.equal(cm2PipelineRef(ref), ref);
  assert.equal(cm2PipelineRef(cm2PipelineRef(ref)), ref);
});

void test('cm2PipelineRef keeps a non-.ts full extension as it is', () => {
  assert.equal(cm2PipelineRef('_102020_/l4/collabux/templates/approvalWorkflow/page21.md'), '_102020_/l4/collabux/templates/approvalWorkflow/page21.md');
});

void test("cm2PipelineRef treats '.defs' as the HALF extension it is", () => {
  assert.equal(cm2PipelineRef('/_102040_/l2/molecules/groupenterdate/index.defs'), '_102040_/l2/molecules/groupenterdate/index.defs.ts');
});

void test('cm2PipelineRef on empty input yields empty, never a bare ".ts"', () => {
  assert.equal(cm2PipelineRef(''), '');
  assert.equal(cm2PipelineRef('   '), '');
});

void test('cm2ComponentReference emits PIPELINE form — no leading slash, with .ts', () => {
  assert.equal(
    cm2ComponentReference(102040, 'groupselectone--ml-select-one-autocomplete'),
    '_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.ts',
  );
  assert.equal(cm2ComponentReference(102040, 'groupviewtable--ml-view-table').startsWith('/'), false);
});

void test('the fixed anchors follow the family convention, and every group gets its OWN c2 anchor', () => {
  assert.equal(cm2DoneAnchor('c1-groups'), 'c1-done');
  assert.equal(cm2GroupFolder('groupViewTable'), 'groupviewtable');
  assert.equal(cm2GroupPlanId('groupSelectOne'), 'c2-groupselectone');
  assert.notEqual(cm2GroupDoneAnchor('groupSelectOne'), cm2GroupDoneAnchor('groupViewTable'));
});

void test('cm2ParseStepArgs reads the fields the steps thread through the prompt, ignoring the rest', () => {
  const parsed = cm2ParseStepArgs(JSON.stringify({ planId: 'c2-groupselectone', catalogProject: 102040, target: '_102046_/l2/m/web/desktop/page21/x.defs', group: 'groupSelectOne', junk: 1 }));
  assert.equal(parsed.catalogProject, 102040);
  assert.equal(parsed.group, 'groupSelectOne');
  assert.equal(parsed.retryAttempt, undefined);
  assert.deepEqual(cm2ParseStepArgs('not json'), {});
});
