/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsTokenSearch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTokenQuery, rowMatchesQuery } from './dsTokenSearch.js';

test('parseTokenQuery: name by default, value with a leading =', () => {
  assert.deepEqual(parseTokenQuery(' Focus '), { mode: 'name', text: 'focus' });
  assert.deepEqual(parseTokenQuery('= #1273D4'), { mode: 'value', text: '#1273d4' });
  assert.equal(parseTokenQuery(''), null);
  assert.equal(parseTokenQuery('   '), null);
  assert.equal(parseTokenQuery('='), null);
});

test('name mode matches a substring of the name only', () => {
  const row = { name: 'button-primary-bg-focus', light: '#1273d4', dark: '' };
  assert.equal(rowMatchesQuery(row, parseTokenQuery('FOCUS')), true);
  assert.equal(rowMatchesQuery(row, parseTokenQuery('1273')), false);
});

test('value mode matches light, dark or the single value, case-insensitively', () => {
  assert.equal(rowMatchesQuery({ name: 'a', light: '#FFFFFF', dark: '#111' }, parseTokenQuery('=#ffffff')), true);
  assert.equal(rowMatchesQuery({ name: 'a', light: '#000', dark: '#ABCDEF' }, parseTokenQuery('=abcdef')), true);
  assert.equal(rowMatchesQuery({ name: 'space-md', value: '.75rem' }, parseTokenQuery('=rem')), true);
  assert.equal(rowMatchesQuery({ name: 'rem-thing', value: '4px' }, parseTokenQuery('=rem')), false);
});

test('no query matches everything', () => {
  assert.equal(rowMatchesQuery({ name: 'x' }, null), true);
});
