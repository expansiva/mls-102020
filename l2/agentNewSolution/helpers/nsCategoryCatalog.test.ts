/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsCategoryCatalog.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  parseNsCategoryCatalog,
  summarizeNsCatalogForPrompt,
  validateNsCatalogIntegrity,
} from '/_102020_/l2/agentNewSolution/helpers/nsCategoryCatalog.js';

const here = dirname(fileURLToPath(import.meta.url));
// The REAL catalog — the single source of truth. Reading it here is what keeps the helper honest:
// a category added to the JSON must flow through parse/summary with no code change.
const REAL_CATALOG_PATH = resolve(here, '../../../l4/collabux/templates/categoryList.json');

test('parseNsCategoryCatalog reads the real categoryList.json', () => {
  const catalog = parseNsCategoryCatalog(readFileSync(REAL_CATALOG_PATH, 'utf8'));
  assert.ok(catalog, 'catalog must parse');
  // No hard-coded count: the catalog grows. Assert the SHAPE holds for every entry.
  assert.ok(catalog.categories.length > 0);
  for (const category of catalog.categories) {
    assert.match(category.categoryId, /^[a-z][A-Za-z0-9]*$/, `bad id: ${category.categoryId}`);
    assert.ok(category.name, `missing name: ${category.categoryId}`);
    assert.ok(category.description, `missing description: ${category.categoryId}`);
  }
  assert.equal(catalog.byId.size, catalog.categories.length);
});

test('the real categoryList.json passes the integrity check', () => {
  const catalog = parseNsCategoryCatalog(readFileSync(REAL_CATALOG_PATH, 'utf8'))!;
  assert.deepEqual(validateNsCatalogIntegrity(catalog).map(issue => issue.code), []);
});

test('parseNsCategoryCatalog returns null for absent/unusable input instead of throwing', () => {
  assert.equal(parseNsCategoryCatalog(''), null);
  assert.equal(parseNsCategoryCatalog('not json'), null);
  assert.equal(parseNsCategoryCatalog(null), null);
  assert.equal(parseNsCategoryCatalog({ categories: [] }), null);
  assert.equal(parseNsCategoryCatalog({ categories: [{ name: 'no id' }] }), null);
});

test('validateNsCatalogIntegrity rejects duplicated ids and dangling parentCategory', () => {
  const duplicated = parseNsCategoryCatalog({
    categories: [
      { categoryId: 'a', name: 'A', description: 'x' },
      { categoryId: 'a', name: 'A again', description: 'x' },
    ],
  })!;
  assert.deepEqual(validateNsCatalogIntegrity(duplicated).map(issue => issue.code), ['catalog.category.duplicate']);

  const dangling = parseNsCategoryCatalog({
    categories: [{ categoryId: 'child', name: 'Child', description: 'x', parentCategory: 'ghost' }],
  })!;
  assert.deepEqual(validateNsCatalogIntegrity(dangling).map(issue => issue.code), ['catalog.parent.unknown']);
});

test('summarizeNsCatalogForPrompt is built from the file and flags the child preference', () => {
  const catalog = parseNsCategoryCatalog({
    categories: [
      { categoryId: 'processWizard', name: 'Process Wizard', description: 'Multi-step flow.', typicalEntities: ['Case'], commonOperations: ['next', 'submit'] },
      { categoryId: 'importMappingWizard', name: 'Import Mapping Wizard', description: 'Upload and map.', parentCategory: 'processWizard' },
    ],
  })!;
  const summary = summarizeNsCatalogForPrompt(catalog);
  assert.match(summary, /- processWizard: Process Wizard/);
  assert.match(summary, /typical entities: Case/);
  assert.match(summary, /common operations: next, submit/);
  assert.match(summary, /- importMappingWizard: Import Mapping Wizard \(child of processWizard — prefer this one when both fit\)/);
});

test('a category added to the catalog needs no code change to be classifiable', () => {
  const catalog = parseNsCategoryCatalog({
    categories: [{ categoryId: 'brandNewShape', name: 'Brand New Shape', description: 'Invented for this test.' }],
  })!;
  assert.ok(catalog.byId.has('brandNewShape'));
  assert.match(summarizeNsCatalogForPrompt(catalog), /brandNewShape/);
  assert.deepEqual(validateNsCatalogIntegrity(catalog), []);
});

test('minimumRequired is carried through when present (T4 lint input)', () => {
  const catalog = parseNsCategoryCatalog({
    categories: [
      { categoryId: 'withContract', name: 'W', description: 'x', minimumRequired: { query: { outputKind: 'paginated' } } },
      { categoryId: 'without', name: 'X', description: 'x' },
    ],
  })!;
  assert.deepEqual(catalog.byId.get('withContract')!.minimumRequired, { query: { outputKind: 'paginated' } });
  assert.equal(catalog.byId.get('without')!.minimumRequired, undefined);
});
