/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetThemeConfirmationLogic.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColorToRgb, readableTextOn } from '/_102020_/l2/aura/molecules/shared/widgetThemeConfirmationLogic.js';

test('parseColorToRgb handles #rgb, #rrggbb and rgb()/rgba()', () => {
  assert.deepEqual(parseColorToRgb('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(parseColorToRgb('#000000'), { r: 0, g: 0, b: 0 });
  assert.deepEqual(parseColorToRgb('#6C5CE7'), { r: 108, g: 92, b: 231 });
  assert.deepEqual(parseColorToRgb('rgb(30, 27, 75)'), { r: 30, g: 27, b: 75 });
  assert.deepEqual(parseColorToRgb('rgba(255,255,255,0.1)'), { r: 255, g: 255, b: 255 });
  assert.equal(parseColorToRgb('linear-gradient(...)'), null);
});

test('readableTextOn picks black on light, white on dark', () => {
  assert.equal(readableTextOn('#ffffff'), '#000000');
  assert.equal(readableTextOn('#f5f5f5'), '#000000');
  assert.equal(readableTextOn('#000000'), '#ffffff');
  assert.equal(readableTextOn('rgb(30,27,75)'), '#ffffff');
  assert.equal(readableTextOn('nonsense'), '#000000'); // safe default
});
