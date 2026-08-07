/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/widgetInheritChoiceLogic.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyInheritMember,
  applyInheritWhere,
  buildInheritResult,
  canConfirmInherit,
  inheritBlockingIssues,
  isExpensiveOverride,
  offerableMembers,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/widgetInheritChoiceLogic.js';

const MEMBERS = [
  { name: 'portalWidgetName', kind: 'property' as const, cost: 1 },
  { name: 'getTriggerTemplate', kind: 'method' as const, cost: 10 },
  { name: 'render', kind: 'method' as const, cost: 100 },
];

const VALUE = { overridableMembers: MEMBERS, hasLess: true, ownMembers: ['portalWidgetName'] };

test('switching away from override CLEARS the member', () => {
  // Without this, picking override → render → less submits { where: 'less', member: 'render' },
  // and inherit.json records a member nobody chose.
  const picked = applyInheritMember({ where: 'override', member: '' }, 'render');
  assert.deepEqual(applyInheritWhere(picked, 'less'), { where: 'less', member: '' });
  assert.deepEqual(applyInheritWhere(picked, 'parent'), { where: 'parent', member: '' });
});

test('picking a member implies override', () => {
  assert.deepEqual(applyInheritMember({ where: 'less', member: '' }, 'getTriggerTemplate'), {
    where: 'override',
    member: 'getTriggerTemplate',
  });
});

test('override with no member cannot be confirmed', () => {
  assert.deepEqual(inheritBlockingIssues({ where: 'override', member: '' }, VALUE), ['no_member']);
  assert.equal(canConfirmInherit({ where: 'override', member: '' }, VALUE), false);
});

test('override of a member the parent does not have cannot be confirmed', () => {
  assert.deepEqual(inheritBlockingIssues({ where: 'override', member: 'invented' }, VALUE), ['unknown_member']);
});

test('when the parent is unreadable, any member name is accepted', () => {
  // overridableMembers comes back empty and the widget offers free text. Refusing everything
  // would leave the user with no way to answer a question they were still asked.
  const blind = { overridableMembers: [], hasLess: true };
  assert.deepEqual(inheritBlockingIssues({ where: 'override', member: 'whatever' }, blind), []);
});

test('less is not offered when the molecule has no stylesheet', () => {
  assert.deepEqual(inheritBlockingIssues({ where: 'less', member: '' }, { ...VALUE, hasLess: false }), ['no_less']);
});

test("'parent' is always confirmable — it is an answer, just not an executable one", () => {
  assert.equal(canConfirmInherit({ where: 'parent', member: '' }, VALUE), true);
  assert.equal(canConfirmInherit({ where: 'parent', member: '' }, { ...VALUE, hasLess: false }), true);
});

test('the result drops the member on every choice but override', () => {
  assert.deepEqual(buildInheritResult({ where: 'less', member: 'render' }, 'continue'), {
    where: 'less', member: '', action: 'continue',
  });
  assert.deepEqual(buildInheritResult({ where: 'override', member: ' render ' }, 'continue'), {
    where: 'override', member: 'render', action: 'continue',
  });
});

test('render() is flagged as the expensive override', () => {
  // 0 of the 84 real shells override it. The widget has to say what it costs.
  assert.equal(isExpensiveOverride('render'), true);
  assert.equal(isExpensiveOverride('getTriggerTemplate'), false);
});

test('a member the shell already overrides is marked, not hidden', () => {
  const offered = offerableMembers(VALUE);
  assert.equal(offered.length, 3);
  assert.equal(offered.find(m => m.name === 'portalWidgetName')?.alreadyOverridden, true);
  assert.equal(offered.find(m => m.name === 'render')?.alreadyOverridden, false);
});
