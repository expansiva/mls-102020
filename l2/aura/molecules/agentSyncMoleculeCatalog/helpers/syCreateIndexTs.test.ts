/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syCreateIndexTs.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { syResolveCreationScenarios } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syCreateIndexTs.js';

const MOLECULES = [
  { shortName: 'ml-datetime-picker', tag: 'groupenterdatetime--ml-datetime-picker' },
  { shortName: 'ml-enter-datetime-masked-input', tag: 'groupenterdatetime--ml-enter-datetime-masked-input' },
];

void test('resolves short molecule names to their full group-prefixed tags', () => {
  const result = syResolveCreationScenarios(
    [{ scenario: 'Free typing with a mask', recommended: ['ml-enter-datetime-masked-input'] }],
    MOLECULES,
  );
  assert.deepEqual(result.scenarios, [
    { scenario: 'Free typing with a mask', recommended: ['groupenterdatetime--ml-enter-datetime-masked-input'] },
  ]);
  assert.deepEqual(result.droppedNames, []);
});

void test('drops an invented name instead of guessing or throwing', () => {
  const result = syResolveCreationScenarios(
    [{ scenario: 'Pick a date range', recommended: ['ml-datetime-picker', 'ml-date-range-picker'] }],
    MOLECULES,
  );
  assert.deepEqual(result.scenarios, [
    { scenario: 'Pick a date range', recommended: ['groupenterdatetime--ml-datetime-picker'] },
  ]);
  assert.deepEqual(result.droppedNames, ['ml-date-range-picker']);
});

void test('drops a scenario with no readable text', () => {
  const result = syResolveCreationScenarios(
    [{ scenario: '   ', recommended: ['ml-datetime-picker'] }, { scenario: 'Real one', recommended: [] }],
    MOLECULES,
  );
  assert.deepEqual(result.scenarios, [{ scenario: 'Real one', recommended: [] }]);
});

void test('handles null/undefined/non-array input without throwing', () => {
  assert.deepEqual(syResolveCreationScenarios(null, MOLECULES), { scenarios: [], droppedNames: [] });
  assert.deepEqual(syResolveCreationScenarios(undefined, MOLECULES), { scenarios: [], droppedNames: [] });
  assert.deepEqual(syResolveCreationScenarios([{ scenario: 'x', recommended: 'not-an-array' as unknown as string[] }], MOLECULES), {
    scenarios: [{ scenario: 'x', recommended: [] }],
    droppedNames: [],
  });
});
