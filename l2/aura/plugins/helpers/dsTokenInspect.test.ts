/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsTokenInspect.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { declRefs, isInheritedProp, reverseGraph } from './dsTokenInspect.js';
import { effectiveSelector, expandRefs, tokenGraph } from './dsUsedTokens.js';

function fakeStyle(decls: Record<string, string>) {
  const props = Object.keys(decls);
  return { length: props.length, item: (i: number) => props[i], getPropertyValue: (p: string) => decls[p] ?? '' };
}

test('reverseGraph: from a DS token to the tokens that read it (reconciliation)', () => {
  const graph = tokenGraph(':root{--primary:#123;--ml-primary:var(--primary);--ml-accent:var(--ml-primary);}');
  const rev = reverseGraph(graph);
  assert.deepEqual([...expandRefs(['primary'], rev)].sort(), ['ml-accent', 'ml-primary', 'primary']);
  assert.deepEqual([...expandRefs(['unused'], rev)], ['unused']);
});

test('isInheritedProp: text/font props inherit, box props do not', () => {
  for (const p of ['color', 'font-family', 'font-size', 'line-height', 'letter-spacing']) assert.equal(isInheritedProp(p), true, p);
  for (const p of ['background-color', 'border-color', 'padding', 'border-radius', 'box-shadow']) assert.equal(isInheritedProp(p), false, p);
});

test('declRefs: every var ref, or only through inherited properties', () => {
  const style = fakeStyle({
    'background-color': 'var(--surface-bg,transparent)',
    color: 'var(--text-default, var(--fallback))',
    padding: '4px',
  });
  assert.deepEqual(declRefs(style, false), ['surface-bg', 'text-default', 'fallback']);
  assert.deepEqual(declRefs(style, true), ['text-default', 'fallback']);
});

test('effectiveSelector resolves CSS nesting against the parent', () => {
  assert.equal(effectiveSelector('.a', null), '.a');
  assert.equal(effectiveSelector('&:hover', '.btn'), ':is(.btn):hover');
  assert.equal(effectiveSelector('&:where(.dark, .dark *)', '.x, .y'), ':is(.x, .y):where(.dark, .dark *)');
  assert.equal(effectiveSelector('.child', '.parent'), ':is(.parent) .child');
});
