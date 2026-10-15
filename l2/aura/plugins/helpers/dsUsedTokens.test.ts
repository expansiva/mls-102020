/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsUsedTokens.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanSelector, expandRefs, tokenGraph, varRefs } from './dsUsedTokens.js';

test('varRefs reads every var(--name), fallbacks included', () => {
  assert.deepEqual(
    varRefs('color: var(--text-muted,currentColor); border: 1px solid var( --border-default , var(--fallback))'),
    ['text-muted', 'border-default', 'fallback'],
  );
  assert.deepEqual(varRefs('color: red'), []);
});

test('cleanSelector drops states and pseudo-elements, keeps structure', () => {
  assert.equal(cleanSelector('.btn:hover'), '.btn');
  assert.equal(cleanSelector('.hover\\:bg-x:hover, .a::before'), '.hover\\:bg-x, .a');
  assert.equal(cleanSelector('li:first-child:focus-visible'), 'li:first-child');
  assert.equal(cleanSelector('.x:not(.y)'), '.x:not(.y)');
  assert.equal(cleanSelector('::selection'), '');
  assert.equal(cleanSelector('input::-webkit-inner-spin-button'), 'input');
});

test('cleanSelector keeps Tailwind arbitrary values whole (escaped commas, escaped colons)', () => {
  assert.equal(cleanSelector('.bg-\\[var\\(--page-bg\\,transparent\\)\\]'), '.bg-\\[var\\(--page-bg\\,transparent\\)\\]');
  assert.equal(cleanSelector('.md\\:hover\\:bg-x:hover'), '.md\\:hover\\:bg-x');
  assert.equal(cleanSelector(':is(.a, .b) .c, .d:focus'), ':is(.a, .b) .c, .d');
});

test('tokenGraph + expandRefs follow reconciliation and calc indirections', () => {
  const css = `:root{--primary:#123;--font-base-unit:.25rem;--font-size-16:calc(var(--font-base-unit) * 4);}
[data-theme="dark"], :root.dark{--primary:#abc;}
:root{--ml-primary:var(--primary);--ml-text:var(--text-strong);}`;
  const graph = tokenGraph(css);
  assert.deepEqual([...expandRefs(['ml-primary', 'font-size-16'], graph)].sort(),
    ['font-base-unit', 'font-size-16', 'ml-primary', 'primary']);
  // A name not in the graph is kept (it may still be a DS token read directly).
  assert.deepEqual([...expandRefs(['surface-bg'], graph)], ['surface-bg']);
});

test('expandRefs survives cycles', () => {
  const graph = tokenGraph(':root{--a:var(--b);--b:var(--a);}');
  assert.deepEqual([...expandRefs(['a'], graph)].sort(), ['a', 'b']);
});
