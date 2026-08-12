/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4Resolve.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';

test('Type B records the generator implicit choice without changing the artifact', () => {
  const artifact = { includeApprovedChanges: false };
  const result = resolveNs4Findings(artifact, [{
    classification: 'B', findingRef: 'approvedChangeOrdersNotIncludedInProjectCostControl', stage: 'e2',
    question: 'Should approved change orders enter the project cost view?',
    defaultChoice: 'no, billing only', alternatives: ['yes, include in project cost', 'no, billing only'],
    changeHint: 'Add a project-cost journey if this choice is revisited.',
  }]);
  assert.equal(result.artifact, artifact);
  assert.equal(result.unresolved.length, 0);
  assert.deepEqual(result.systemDecisions[0], {
    decisionId: 'approvedChangeOrdersNotIncludedInProjectCostControl', stage: 'e2',
    question: 'Should approved change orders enter the project cost view?', chosen: 'no, billing only',
    alternatives: ['no, billing only', 'yes, include in project cost'], decidedBy: 'system',
    findingRef: 'approvedChangeOrdersNotIncludedInProjectCostControl',
    changeHint: 'Add a project-cost journey if this choice is revisited.',
  });
});

test('Type C applies a deterministic patch and records it', () => {
  const result = resolveNs4Findings({ states: ['draft', 'unused', 'done'] }, [{
    classification: 'C', findingRef: 'WorkTask.unused', stage: 'e7',
    question: 'How should the unoperated WorkTask.unused state be handled?',
    deterministicChoice: 'shrinkLifecycle', alternatives: ['operateState'],
    changeHint: 'Add an E2 operation before restoring this state to the workflow.',
    apply: artifact => ({ ...artifact, states: artifact.states.filter(state => state !== 'unused') }),
  }]);
  assert.deepEqual(result.artifact.states, ['draft', 'done']);
  assert.equal(result.systemDecisions[0]?.chosen, 'shrinkLifecycle');
});

test('Type A is returned unresolved and never becomes a system decision', () => {
  const result = resolveNs4Findings({ refs: [] as string[] }, [{
    classification: 'A', findingRef: 'brokenUseCaseRef', stage: 'e7',
    question: 'Can the broken use-case reference be resolved?', alternatives: [],
    changeHint: 'Repair the invalid reference and rerun E7.',
  }]);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.systemDecisions.length, 0);
});
