/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsActors.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readActors } from '/_102020_/l2/agentNewSolution/helpers/nsActors.js';

void test('readActors returns the new plural actors[] when present', () => {
  assert.deepEqual(readActors({ actors: ['attendant', 'kitchen'] }), ['attendant', 'kitchen']);
});

void test('readActors is back-compat: an old l4 def with singular actor resolves to a one-element array', () => {
  assert.deepEqual(readActors({ actor: 'attendant' }), ['attendant']);
  // plural wins when both are present (a migrated def)
  assert.deepEqual(readActors({ actor: 'attendant', actors: ['manager'] }), ['manager']);
});

void test('readActors normalizes: trims, drops blanks, dedupes, and handles missing/invalid input', () => {
  assert.deepEqual(readActors({ actors: [' attendant ', '', 'attendant', 'kitchen'] }), ['attendant', 'kitchen']);
  assert.deepEqual(readActors({ actor: '  ' }), []);
  assert.deepEqual(readActors({}), []);
  assert.deepEqual(readActors(null), []);
  assert.deepEqual(readActors(undefined), []);
});
