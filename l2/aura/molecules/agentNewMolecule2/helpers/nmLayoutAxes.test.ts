/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmLayoutAxes.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nmAxisGovernsGroup,
  nmCandidateAxes,
  nmIsPageWideAxis,
  nmLayoutConfigSummary,
  nmNormalizeLayoutConfig,
  runNmLayoutConfigGate,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmLayoutAxes.js';

test('the candidate axes of a group come from the vocabulary', () => {
  assert.deepEqual(nmCandidateAxes('groupViewMetric').map(axis => axis.key), ['metric']);
  assert.deepEqual(nmCandidateAxes('groupViewMetric')[0].values, ['big-number', 'gauge', 'sparkline']);
  assert.deepEqual(nmCandidateAxes('groupExpandContent').map(axis => axis.key), ['expand', 'accordionMode']);
});

test('a labeled-input group also gets the three input-transversal axes', () => {
  const keys = nmCandidateAxes('groupEnterText').map(axis => axis.key);
  assert.deepEqual(keys, ['labelPlacement', 'validation', 'requiredMark']);
  assert.ok(nmCandidateAxes('groupEnterText').every(axis => axis.transversal));

  const bool = nmCandidateAxes('groupEnterBoolean').map(axis => axis.key);
  assert.deepEqual(bool, ['labelPlacement', 'validation', 'requiredMark', 'boolean']);
});

// The 5 groups measured as legitimately empty in mls-102040.
test('the groups with no governing axis return no candidate', () => {
  for (const group of ['groupEnterNumberInterval', 'groupLocatePosition', 'groupPlayMedia', 'groupViewChart', 'groupScanCode']) {
    assert.deepEqual(nmCandidateAxes(group), [], `${group} should have no axis`);
  }
});

// skills/index.ts spells it groupEnterDateTimeInterval, the vocabulary spells it
// groupEnterDatetimeInterval, and the .defs corpus carries BOTH. An exact match would reject a
// legitimate declaration.
test('the group comparison is case-insensitive (real spelling divergence in the codebase)', () => {
  assert.ok(nmAxisGovernsGroup('intervalInput', 'groupEnterDateTimeInterval'));
  assert.ok(nmAxisGovernsGroup('intervalInput', 'groupEnterDatetimeInterval'));
  assert.deepEqual(
    nmCandidateAxes('groupEnterDateTimeInterval').map(axis => axis.key),
    nmCandidateAxes('groupEnterDatetimeInterval').map(axis => axis.key),
  );
});

test('only density and motion are page-wide', () => {
  assert.ok(nmIsPageWideAxis('density'));
  assert.ok(nmIsPageWideAxis('motion'));
  assert.ok(!nmIsPageWideAxis('metric'));
  assert.ok(!nmIsPageWideAxis('listOverflow'), 'listOverflow declares groups — it is not page-wide');
});

test('normalization drops non-strings and treats the wildcard marker as absence', () => {
  const { config, dropped } = nmNormalizeLayoutConfig({ metric: ' gauge ', density: '', motion: null, extra: undefined });
  assert.deepEqual(config, { metric: 'gauge' });
  assert.ok(dropped.some(item => item.includes('motion')));
  assert.deepEqual(nmNormalizeLayoutConfig(null).config, {});
  assert.deepEqual(nmNormalizeLayoutConfig(['metric']).config, {});
});

// ---- the gate: 4 codes, each with 0 counterexamples in the 146 real .defs.ts ----

test('a declaration matching the real ml-metric-card passes', () => {
  assert.deepEqual(runNmLayoutConfigGate({ metric: 'big-number' }, 'groupViewMetric'), []);
});

test('the real groupViewTable declarations pass, page-wide axis included', () => {
  // ml-data-table / ml-data-table-minimal use density as a deliberate discriminator.
  assert.deepEqual(runNmLayoutConfigGate({ recordsView: 'table', density: 'comfortable' }, 'groupViewTable'), []);
  assert.deepEqual(runNmLayoutConfigGate({ recordsView: 'table', density: 'compact' }, 'groupViewTable'), []);
});

test('a 4-axis labeled input passes (the most common shape in the corpus)', () => {
  assert.deepEqual(
    runNmLayoutConfigGate({ labelPlacement: 'top', validation: 'inline-below', requiredMark: 'asterisk', dateInput: 'compact' }, 'groupEnterDate'),
    [],
  );
});

test('an unknown axis is rejected — the DS catalog would drop it silently', () => {
  const issues = runNmLayoutConfigGate({ metricc: 'gauge', metric: 'gauge' }, 'groupViewMetric');
  assert.deepEqual(issues.map(issue => issue.code), ['axis_unknown']);
  assert.ok(issues[0].message.includes('console.warn'));
});

test('a value outside the axis enum is rejected', () => {
  const issues = runNmLayoutConfigGate({ metric: 'big_number' }, 'groupViewMetric');
  assert.ok(issues.some(issue => issue.code === 'axis_value'));
  assert.ok(issues.find(issue => issue.code === 'axis_value')?.message.includes('big-number'));
});

test('an axis that does not govern the group is rejected', () => {
  const issues = runNmLayoutConfigGate({ metric: 'gauge', recordsView: 'grid' }, 'groupViewMetric');
  assert.deepEqual(issues.map(issue => issue.code), ['axis_not_governing']);
});

test('a governed group with nothing declared is rejected — it would become the fallback wildcard', () => {
  const issues = runNmLayoutConfigGate({}, 'groupViewMetric');
  assert.deepEqual(issues.map(issue => issue.code), ['axis_required']);
  assert.ok(issues[0].message.includes('alphabetical'));
});

test('declaring ONLY a page-wide axis does not satisfy axis_required', () => {
  const issues = runNmLayoutConfigGate({ density: 'compact' }, 'groupViewTable');
  assert.deepEqual(issues.map(issue => issue.code), ['axis_required']);
});

test('an empty declaration is CORRECT for a group with no governing axis', () => {
  for (const group of ['groupViewChart', 'groupPlayMedia', 'groupScanCode']) {
    assert.deepEqual(runNmLayoutConfigGate({}, group), [], `${group} should accept an empty bag`);
  }
});

test('a group with no governing axis may not declare a group-scoped axis', () => {
  const issues = runNmLayoutConfigGate({ metric: 'gauge' }, 'groupViewChart');
  assert.deepEqual(issues.map(issue => issue.code), ['axis_not_governing']);
});

test('the summary reads as a one-liner', () => {
  assert.equal(nmLayoutConfigSummary({ metric: 'gauge' }), 'metric: gauge');
  assert.equal(nmLayoutConfigSummary({}), '(any)');
});
