/// <mls fileReference="_102020_/l2/aura/helpers/pageCombination.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { combinationName, pageFolderName, sitesPageNumber, withUxFolder } from './pageCombination.js';

test('the folder comes from the UX only; the UI never picks one', () => {
  assert.equal(pageFolderName(1), 'page11');
  assert.equal(pageFolderName(3), 'page31');
  assert.equal(pageFolderName('2'), 'page21');
});

test('the combination keeps its name (page12 = UX 1, UI 2)', () => {
  assert.equal(combinationName(1, 2), 'page12');
  assert.equal(combinationName(3, 1), 'page31');
  assert.equal(combinationName(2, null), 'page21');
  assert.equal(combinationName(2), 'page21');
});

test('withUxFolder swaps only the variation segment', () => {
  assert.equal(withUxFolder('cafeFlow/web/desktop/page12', 1), 'cafeFlow/web/desktop/page11');
  assert.equal(withUxFolder('cafeFlow/web/mobile/page11/sub', 3), 'cafeFlow/web/mobile/page31/sub');
  assert.equal(withUxFolder('cafeFlow/web/desktop', 2), 'cafeFlow/web/desktop', 'no segment, no change');
});

test('sitesPageNumber: the shell page of a UX', () => {
  assert.equal(sitesPageNumber(1), 11);
  assert.equal(sitesPageNumber(3), 31);
});
