/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsColorGroups.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { groupColorRows, splitState } from './dsColorGroups.js';

const rows = (...names: string[]) => names.map(name => ({ name }));
const shape = (groups: ReturnType<typeof groupColorRows<{ name: string }>>) =>
  groups.map(g => [g.base.row.name, ...g.states.map(s => `${s.state}@${s.index}`)]);

test('splitState strips a state suffix only', () => {
  assert.deepEqual(splitState('page-bg-hover'), { base: 'page-bg', state: 'hover' });
  assert.deepEqual(splitState(' x-disabled '), { base: 'x', state: 'disabled' });
  assert.equal(splitState('page-bg'), null);
  assert.equal(splitState('-hover'), null);
});

test('a mandatory role groups with its three states, in state order', () => {
  const g = groupColorRows(rows('page-bg', 'page-bg-disabled', 'page-bg-hover', 'page-bg-focus'));
  assert.deepEqual(shape(g), [['page-bg', 'hover@2', 'focus@3', 'disabled@1']]);
});

test('custom tokens group too; a state without its base stays loose', () => {
  const g = groupColorRows(rows('brand', 'brand-hover', 'ghost-focus', 'plain'));
  assert.deepEqual(shape(g), [['brand', 'hover@1'], ['ghost-focus'], ['plain']]);
});

test('group order follows the base position, even when a state comes first', () => {
  const g = groupColorRows(rows('b-hover', 'a', 'b', 'a-focus'));
  assert.deepEqual(shape(g), [['a', 'focus@3'], ['b', 'hover@0']]);
});

test('a duplicate state name is kept as a loose row, never hidden', () => {
  const g = groupColorRows(rows('a', 'a-hover', 'a-hover'));
  assert.deepEqual(shape(g), [['a', 'hover@1'], ['a-hover']]);
});

test('empty names (a freshly added row) are loose rows', () => {
  const g = groupColorRows(rows('a', ''));
  assert.deepEqual(shape(g), [['a'], ['']]);
});
