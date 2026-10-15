/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsDiff.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { colorRowsToMap, countByKind, diffMaps, diffTokens, sameValue, tokenStatus, valueRowsToMap } from './dsDiff.js';

const maps = (color: Record<string, string>, typography: Record<string, string> = {}, global: Record<string, string> = {}) => ({ color, typography, global });

test('sameValue: trims, and compares hex case-insensitively only', () => {
  assert.equal(sameValue('#ABCDEF', '#abcdef'), true);
  assert.equal(sameValue(' 1rem ', '1rem'), true);
  assert.equal(sameValue('Inter', 'inter'), false);
  assert.equal(sameValue(undefined, ''), true);
});

test('rows → maps: dark only when filled, first duplicate wins, empty names skipped', () => {
  assert.deepEqual(colorRowsToMap([
    { name: 'a', light: '#111', dark: '#222' }, { name: 'b', light: '#333', dark: ' ' },
    { name: 'a', light: '#999', dark: '' }, { name: ' ', light: '#000', dark: '' },
  ]), { a: '#111', '_dark-a': '#222', b: '#333' });
  assert.deepEqual(valueRowsToMap([{ name: 'space-md', value: '.75rem' }, { name: '', value: 'x' }]), { 'space-md': '.75rem' });
});

test('diffMaps classifies changed / removed / added, in saved order then added', () => {
  const saved = { a: '#111', '_dark-a': '#222', b: '#333', c: '#444' };
  const current = { a: '#111', '_dark-a': '#2A2A2A', c: '#444', d: '#555' };
  assert.deepEqual(diffMaps('color', saved, current).map(c => `${c.kind}:${c.key}`),
    ['changed:_dark-a', 'removed:b', 'added:d']);
  assert.deepEqual(diffMaps('color', { a: '#ABCDEF' }, { a: '#abcdef ' }), []);
});

test('tokenStatus counts TOKENS: only the dark value appearing = one changed token', () => {
  const saved = maps({ a: '#111', b: '#333' }, { 'font-size-16': '1rem' });
  const current = maps({ a: '#111', '_dark-a': '#000', c: '#555', '_dark-c': '#666' }, { 'font-size-16': '1.1rem' });
  const changes = diffTokens(saved, current);
  const status = tokenStatus(saved, changes);
  assert.equal(status.color.get('a'), 'changed');
  assert.equal(status.color.get('b'), 'removed');
  assert.equal(status.color.get('c'), 'added');
  assert.equal(status.typography.get('font-size-16'), 'changed');
  assert.deepEqual(countByKind(status), { changed: 2, added: 1, removed: 1 });
});

test('no difference → nothing to report', () => {
  const m = maps({ a: '#111' }, { t: '1' }, { g: '2' });
  assert.deepEqual(diffTokens(m, maps({ a: '#111' }, { t: '1' }, { g: '2' })), []);
});
