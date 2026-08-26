/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syLabels.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { syPaletteColor, syShortLabel, SY_PALETTE } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syLabels.js';

void test('the palette reproduces the 10-color cycle measured across the 30 groups', () => {
  assert.deepEqual(SY_PALETTE, ['violet', 'emerald', 'amber', 'rose', 'sky', 'indigo', 'purple', 'teal', 'orange', 'pink']);
});

void test('paletteColor cycles every 10 — index 12 reuses index 2', () => {
  assert.equal(syPaletteColor(0), 'violet');
  assert.equal(syPaletteColor(9), 'pink');
  assert.equal(syPaletteColor(10), 'violet');
  assert.equal(syPaletteColor(12), syPaletteColor(2));
});

void test('a known acronym stays fully upper-case: ml-cpf-input -> CPF Input, not Cpf Input', () => {
  assert.equal(syShortLabel('groupentertext--ml-cpf-input'), 'CPF Input');
});

void test('a plain multi-word tag is title-cased word by word', () => {
  assert.equal(syShortLabel('groupentertext--ml-address-field'), 'Address Field');
  assert.equal(syShortLabel('groupentertext--ml-floating-text-input'), 'Floating Text Input');
});

void test('works without a group prefix too', () => {
  assert.equal(syShortLabel('ml-number-stepper'), 'Number Stepper');
});

void test('other known acronyms in real molecule names', () => {
  assert.equal(syShortLabel('grouprateitem--ml-ces-scale'), 'CES Scale');
  assert.equal(syShortLabel('grouprateitem--ml-csat-rating'), 'CSAT Rating');
});
