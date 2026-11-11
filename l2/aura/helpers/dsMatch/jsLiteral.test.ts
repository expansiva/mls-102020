/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/jsLiteral.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseJsLiteral } from './jsLiteral.js';
import { renderDesignSystemSource, themesFromSource } from './buildDesignSystemTs.js';

test('parseJsLiteral: the shapes an editor leaves in a data file', () => {
  assert.deepEqual(parseJsLiteral(`[
    // a comment
    { themeName: "Default", 'quoted-key': 'single', n: -1.5e2, ok: true, none: null, list: [400, 700,], },
    /* block */ { "json": "style", esc: "a\\"b\\n", t: \`plain\` },
  ]`), [
    { themeName: 'Default', 'quoted-key': 'single', n: -150, ok: true, none: null, list: [400, 700] },
    { json: 'style', esc: 'a"b\n', t: 'plain' },
  ]);
});

test('parseJsLiteral refuses anything that is not a plain literal', () => {
  assert.throws(() => parseJsLiteral('[ foo() ]'));
  assert.throws(() => parseJsLiteral('{ a: someVar }'));
  assert.throws(() => parseJsLiteral('[ `x ${1}` ]'));
  assert.throws(() => parseJsLiteral('[1, 2] extra'));
});

test('themesFromSource reads what renderDesignSystemSource writes (JSON style)', () => {
  const themes = [
    { themeName: 'Default', description: '', color: { 'primary-bg': '#111', '_dark-primary-bg': '#eee' }, typography: {}, global: { 'ml-border-width': '2px' }, dsIndex: '1' },
    { themeName: 'Natal', description: 'x', color: {}, typography: {}, global: {}, dsIndex: '2', fonts: [{ name: 'body', family: 'Inter', weights: [400, 700] }], components: { 'groupentertext--ml-a': { 'ml-border-width': '3px' } } },
  ];
  assert.deepEqual(themesFromSource(renderDesignSystemSource(999999, themes as any)), themes);
});

test('themesFromSource reads the real designSystem.ts files of the repo (editor formatting)', () => {
  for (const project of [102047, 102041, 102051]) {
    const path = fileURLToPath(new URL(`../../../../../mls-${project}/l2/designSystem.ts`, import.meta.url));
    if (!existsSync(path)) continue;
    const themes = themesFromSource(readFileSync(path, 'utf8'));
    assert.ok(themes && themes.length > 0, `mls-${project}: entries read`);
    for (const t of themes!) assert.equal(typeof t.themeName, 'string', `mls-${project}: themeName`);
  }
});

test('themesFromSource: no tokens array, or not a literal → null', () => {
  assert.equal(themesFromSource('export const x = 1;'), null);
  assert.equal(themesFromSource('export const tokens: IDesignSystemTokens[] = [ build() ];'), null);
});
