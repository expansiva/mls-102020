/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetDefsClarificationLogic.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDefsAxisValue,
  addDefsRequirement,
  applyDefsFieldEdit,
  applyDefsRequirementEdit,
  buildDefsResult,
  canConfirmDefs,
  defsBlockingIssues,
  emptyDefsData,
  groupFromFileReference,
  removeDefsRequirement,
  type DefsAxisOption,
  type DefsClarificationData,
} from '/_102020_/l2/aura/molecules/shared/widgetDefsClarificationLogic.js';

function sample(): DefsClarificationData {
  return {
    fileReference: '_102053_/l2/molecules/groupviewcard/ml-kpi-card-glass.ts',
    description: 'A KPI card with a label, a big value and a variation badge.',
    prompt: 'Create a KPI card molecule...',
    group: 'groupviewcard',
    functionalRequirements: ['Show a label', 'Show a value'],
    visualRequirements: ['Value dominates the label'],
    layoutConfig: { metric: 'big-number' },
  };
}

const AXES: DefsAxisOption[] = [
  { key: 'metric', label: 'Metric', values: ['big-number', 'gauge', 'sparkline'], default: 'big-number' },
];

test('the emitted value carries the DERIVED tag, never an authored one', () => {
  const result = buildDefsResult(sample());
  assert.equal(result.tagName, 'groupviewcard--ml-kpi-card-glass');
});

test('editing the fileReference renames the derived group too', () => {
  const edited = applyDefsFieldEdit(sample(), 'fileReference', '_102053_/l2/molecules/groupviewmetric/ml-kpi-card-glass.ts');
  assert.equal(edited.group, 'groupviewmetric');
  assert.equal(buildDefsResult(edited).tagName, 'groupviewmetric--ml-kpi-card-glass');
});

test('editing another field leaves the group alone', () => {
  const edited = applyDefsFieldEdit(sample(), 'description', 'Other');
  assert.equal(edited.group, 'groupviewcard');
  assert.equal(edited.description, 'Other');
});

test('groupFromFileReference falls back when the reference is malformed', () => {
  assert.equal(groupFromFileReference('nonsense', 'groupviewcard'), 'groupviewcard');
  assert.equal(groupFromFileReference('_102053_/l2/skills/theme.ts', 'fallback'), 'skills');
});

test('requirement edits are immutable and index-safe', () => {
  const data = sample();
  const edited = applyDefsRequirementEdit(data, 'functional', 1, 'Show a formatted value');
  assert.deepEqual(edited.functionalRequirements, ['Show a label', 'Show a formatted value']);
  assert.deepEqual(data.functionalRequirements, ['Show a label', 'Show a value'], 'original untouched');
  assert.equal(applyDefsRequirementEdit(data, 'functional', 9, 'x'), data, 'out-of-range edit is a no-op');
});

test('add and remove operate on the requested list only', () => {
  const added = addDefsRequirement(sample(), 'visual', 'Uppercase label');
  assert.deepEqual(added.visualRequirements, ['Value dominates the label', 'Uppercase label']);
  assert.equal(added.functionalRequirements.length, 2);

  const removed = removeDefsRequirement(added, 'visual', 0);
  assert.deepEqual(removed.visualRequirements, ['Uppercase label']);
});

test('Confirm is blocked until the checkpoint can produce artifacts', () => {
  assert.equal(canConfirmDefs(sample()), true);
  assert.deepEqual(defsBlockingIssues(emptyDefsData()).sort(), ['description', 'fileReference', 'functionalRequirements']);
});

test('a malformed fileReference blocks Confirm — no tag means no artifacts', () => {
  const data = { ...sample(), fileReference: 'molecules/groupviewcard/ml-kpi-card-glass.ts' };
  assert.deepEqual(defsBlockingIssues(data), ['fileReference']);
  assert.equal(canConfirmDefs(data), false);
});

test('a blank requirement line blocks Confirm (it becomes an empty bullet in the .defs.ts)', () => {
  const data = { ...sample(), visualRequirements: ['Value dominates the label', '   '] };
  assert.deepEqual(defsBlockingIssues(data), ['emptyRequirement']);
});

test('buildDefsResult trims requirements and drops blanks', () => {
  const data = { ...sample(), functionalRequirements: ['  Show a label  ', ''] };
  assert.deepEqual(buildDefsResult(data).functionalRequirements, ['Show a label']);
});

// ---- layout axes (decision D7 / option (c): pre-filled by the model, editable here) ----

test('choosing an axis value writes it, immutably', () => {
  const data = sample();
  const edited = applyDefsAxisValue(data, AXES, 'metric', 'gauge');
  assert.deepEqual(edited.layoutConfig, { metric: 'gauge' });
  assert.deepEqual(data.layoutConfig, { metric: 'big-number' }, 'original untouched');
});

test('choosing the wildcard DROPS the axis — omitted means "works under any value"', () => {
  const edited = applyDefsAxisValue(sample(), AXES, 'metric', '');
  assert.deepEqual(edited.layoutConfig, {});
});

test('a value outside the offered enum is ignored — the widget never invents one', () => {
  const data = sample();
  assert.equal(applyDefsAxisValue(data, AXES, 'metric', 'huge-number'), data);
  assert.equal(applyDefsAxisValue(data, AXES, 'notAnAxis', 'gauge'), data);
});

test('Confirm is blocked while an offered axis set has nothing chosen', () => {
  const empty = { ...sample(), layoutConfig: {} };
  assert.deepEqual(defsBlockingIssues(empty, AXES), ['layoutConfig']);
  assert.equal(canConfirmDefs(empty, AXES), false);
  // With no axes offered (a group with no governing axis), an empty bag is correct.
  assert.deepEqual(defsBlockingIssues(empty, []), []);
  assert.equal(canConfirmDefs(empty), true);
});

test('the emitted result drops an axis that is no longer offered (group changed)', () => {
  const stale = { ...sample(), layoutConfig: { metric: 'gauge', cardLayout: 'vertical' } };
  assert.deepEqual(buildDefsResult(stale, AXES).layoutConfig, { metric: 'gauge' });
});
