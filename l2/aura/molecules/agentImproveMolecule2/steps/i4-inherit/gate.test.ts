/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImInheritGateInputs,
  isExecutableChoice,
  runImInheritGate,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/gate.js';

const MEMBERS = [
  { name: 'portalWidgetName', kind: 'property' as const, cost: 1 },
  { name: 'getTriggerTemplate', kind: 'method' as const, cost: 10 },
  { name: 'render', kind: 'method' as const, cost: 100 },
];

function inputs(over: Partial<ImInheritGateInputs> & { answer?: Partial<ImInheritGateInputs['answer']> } = {}): ImInheritGateInputs {
  return {
    isShell: true,
    overridableMembers: MEMBERS,
    hasLess: true,
    fromModel: false,
    ...over,
    answer: { where: 'less', ...(over.answer || {}) },
  };
}

test('a style-only answer passes', () => {
  assert.deepEqual(runImInheritGate(inputs()), { ok: true, errors: [] });
});

test('reaching this step for a molecule that is not a shell is refused', () => {
  const result = runImInheritGate(inputs({ isShell: false }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^not_a_shell: /);
});

test('an override names a real member of the parent', () => {
  assert.equal(runImInheritGate(inputs({ answer: { where: 'override', member: 'getTriggerTemplate' } })).ok, true);

  const invented = runImInheritGate(inputs({ answer: { where: 'override', member: 'doTheThing' } }));
  assert.equal(invented.ok, false);
  assert.match(invented.errors[0], /^member_unknown: /);
  assert.match(invented.errors[0], /getTriggerTemplate/);
});

test('an override with no member is refused', () => {
  assert.match(runImInheritGate(inputs({ answer: { where: 'override', member: '' } })).errors[0], /^member_missing: /);
});

test('when the parent is unreadable, any member name is accepted', () => {
  // imInherit returns an empty map across an unreachable project. Refusing everything would leave
  // the user unable to answer a question they were still asked.
  assert.equal(runImInheritGate(inputs({ overridableMembers: [], answer: { where: 'override', member: 'whatever' } })).ok, true);
});

test("'parent' is a VALID answer and NOT an executable one", () => {
  // The whole point of the step: the user may conclude the base is wrong, and this agent still
  // will not touch it.
  assert.equal(runImInheritGate(inputs({ answer: { where: 'parent' } })).ok, true);
  assert.equal(isExecutableChoice('parent'), false);
  assert.equal(isExecutableChoice('less'), true);
  assert.equal(isExecutableChoice('override'), true);
});

test('a member named on a choice that does not target one is refused', () => {
  const result = runImInheritGate(inputs({ answer: { where: 'parent', member: 'render' } }));
  assert.match(result.errors[0], /^member_off_choice: /);
});

test('a choice outside the three is refused alone', () => {
  const result = runImInheritGate(inputs({ answer: { where: 'rewrite-the-base' } }));
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /^where_invalid: /);
});

test('.less on a molecule that has none is refused', () => {
  const result = runImInheritGate(inputs({ hasLess: false }));
  assert.match(result.errors[0], /^no_less: /);
});

test("THE MODEL's suggestion must say why; the HUMAN's answer need not", () => {
  // It arrives pre-selected in the widget. An unexplained pre-selection is a nudge with no
  // argument, and a hurried user clicks through it.
  const unexplained = runImInheritGate(inputs({ fromModel: true }));
  assert.equal(unexplained.ok, false);
  assert.match(unexplained.errors[0], /^reason_missing: /);

  assert.equal(runImInheritGate(inputs({ fromModel: true, answer: { where: 'less', reason: 'a spacing fix fits the shell sheet' } })).ok, true);
  assert.equal(runImInheritGate(inputs({ fromModel: false })).ok, true);
});
