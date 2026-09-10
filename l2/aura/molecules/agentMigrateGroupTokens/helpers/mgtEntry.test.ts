/// <mls fileReference="_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtEntry.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { mgtParseEntry } from '/_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtEntry.js';

test('a bare group name parses with no starting point', () => {
  const result = mgtParseEntry('groupEnterDateTime');
  assert.deepEqual(result, { group: 'groupEnterDateTime', startFrom: null, error: '' });
});

test("'a partir de <shortName>' is split off and lowercased", () => {
  const result = mgtParseEntry('groupselectmany a partir de ml-tree-multi-select');
  assert.equal(result.group, 'groupselectmany');
  assert.equal(result.startFrom, 'ml-tree-multi-select');
  assert.equal(result.error, '');
});

test('empty text is refused with a readable message, not silently', () => {
  const result = mgtParseEntry('');
  assert.equal(result.group, '');
  assert.match(result.error, /which group/);
});

test("the starting-point phrase needs a group BEFORE it — with none, the whole text is the (invalid) group name", () => {
  // Realistic: this reaches the group-resolution stage next and fails there as an unknown group,
  // with a readable message naming exactly what was typed — not silently dropped here.
  const result = mgtParseEntry('a partir de ml-tree-multi-select');
  assert.equal(result.group, 'a partir de ml-tree-multi-select');
  assert.equal(result.startFrom, null);
  assert.equal(result.error, '');
});

test('whitespace around the group name is trimmed', () => {
  const result = mgtParseEntry('   groupEnterMoney   ');
  assert.equal(result.group, 'groupEnterMoney');
});
