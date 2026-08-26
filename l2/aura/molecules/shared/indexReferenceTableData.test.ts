/// <mls fileReference="_102020_/l2/aura/molecules/shared/indexReferenceTableData.test.ts" enhancement="_blank"/>

// This file, not indexReferenceTable.ts, carries the tests: merely IMPORTING 'lit' at module scope
// reaches for `document.createTreeWalker` during lit-html's own initialization, which this repo's
// node:test environment does not provide (confirmed by running it — a real DOM error, not a guess, and
// true even without ever calling `html` — see indexReferenceTableData.ts's header). This is why every
// molecule's own `.test.ts` in this codebase is a stub rather than an output assertion.
// `buildReferenceTableData` carries every decision the table makes (column order, color, which rows
// survive D-E3) and imports nothing from 'lit'; indexReferenceTable.ts is a thin, mechanical map from
// this data into markup, verified by hand and by the migrated pages compiling — see
// agentSyncMoleculeCatalog's E8a acceptance record.

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReferenceTableData } from '/_102020_/l2/aura/molecules/shared/indexReferenceTableData.js';

const MOLECULES = [
  { tag: 'groupfoo--ml-alpha' },
  { tag: 'groupfoo--ml-beta' },
  { tag: 'groupfoo--ml-gamma' },
];

const SCENARIOS = [
  { scenario: 'Alpha and beta case', recommended: ['groupfoo--ml-alpha', 'groupfoo--ml-beta'] },
  { scenario: 'Nothing local fits', recommended: [] },
  { scenario: 'Gamma only', recommended: ['groupfoo--ml-gamma'] },
];

void test('one header per molecule, in the given (alphabetical) order, with a short label and a real Tailwind color class', () => {
  const { headers } = buildReferenceTableData(MOLECULES, SCENARIOS);
  assert.deepEqual(headers, [
    { tag: 'groupfoo--ml-alpha', label: 'Alpha', cls: 'text-violet-600 dark:text-violet-400' },
    { tag: 'groupfoo--ml-beta', label: 'Beta', cls: 'text-emerald-600 dark:text-emerald-400' },
    { tag: 'groupfoo--ml-gamma', label: 'Gamma', cls: 'text-amber-600 dark:text-amber-400' },
  ]);
});

void test('D-E3: a scenario with no in-group recommendation is OMITTED from rows, not rendered empty', () => {
  const { rows } = buildReferenceTableData(MOLECULES, SCENARIOS);
  assert.equal(rows.length, 2);
  assert.ok(!rows.some(row => row.scenario === 'Nothing local fits'));
});

void test('each row has one boolean cell per molecule, true only where recommended', () => {
  const { rows } = buildReferenceTableData(MOLECULES, SCENARIOS);
  const alphaBeta = rows.find(row => row.scenario === 'Alpha and beta case')!;
  assert.deepEqual(alphaBeta.cells, [true, true, false]);
  const gammaOnly = rows.find(row => row.scenario === 'Gamma only')!;
  assert.deepEqual(gammaOnly.cells, [false, false, true]);
});

void test('colors cycle through the same 10-color palette as the rest of the catalog', () => {
  const manyMolecules = Array.from({ length: 11 }, (_, i) => ({ tag: `groupfoo--ml-item-${i}` }));
  const { headers } = buildReferenceTableData(manyMolecules, []);
  // index 0 and index 10 (the 11th item) both land on 'violet' — the cycle-of-10 wrapping.
  assert.equal(headers[0].cls, headers[10].cls);
  assert.equal(headers[0].cls, 'text-violet-600 dark:text-violet-400');
});

void test('every palette color used maps to an ACTUAL Tailwind class, never undefined', () => {
  const tenMolecules = Array.from({ length: 10 }, (_, i) => ({ tag: `groupfoo--ml-item-${i}` }));
  const { headers } = buildReferenceTableData(tenMolecules, []);
  for (const header of headers) {
    assert.equal(typeof header.cls, 'string');
    assert.match(header.cls, /^text-[a-z]+-600 dark:text-[a-z]+-400$/);
  }
});

void test('no molecules and no scenarios yields empty headers/rows, not a crash', () => {
  const data = buildReferenceTableData([], []);
  assert.deepEqual(data, { headers: [], rows: [] });
});

void test('a molecule with no scenario at all still gets a header column', () => {
  const { headers } = buildReferenceTableData(MOLECULES, []);
  assert.equal(headers.length, 3);
});
