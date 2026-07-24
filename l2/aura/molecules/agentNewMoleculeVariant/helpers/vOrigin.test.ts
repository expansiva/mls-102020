/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAbsoluteMlClasses, normalizeOriginPage, parseOriginRef } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.js';

const CANON = '_102040_/l2/molecules/groupselectone/ml-combobox';

test('collab-messages form is accepted', () => {
  const { ref } = parseOriginRef('_102040_/l2/molecules/groupenterboolean/ml-boolean-segmented');
  assert.ok(ref);
  assert.equal(ref!.tag, 'groupenterboolean--ml-boolean-segmented');
  assert.equal(ref!.project, 102040);
});

test('preview `page` (missing /l2/) normalizes and is accepted', () => {
  // preview: { page: "_102040_molecules/groupselectone/ml-combobox" }
  assert.equal(normalizeOriginPage('_102040_molecules/groupselectone/ml-combobox'), CANON);
  const { ref } = parseOriginRef('_102040_molecules/groupselectone/ml-combobox');
  assert.ok(ref);
  assert.equal(ref!.tag, 'groupselectone--ml-combobox');
});

test('preview `fullName` (stray space) normalizes and is accepted', () => {
  // preview: { fullName: "_102040_/l2/molecules/groupselectone/ ml-combobox" }
  assert.equal(normalizeOriginPage('_102040_/l2/molecules/groupselectone/ ml-combobox'), CANON);
  const { ref } = parseOriginRef('_102040_/l2/molecules/groupselectone/ ml-combobox');
  assert.ok(ref);
  assert.equal(ref!.shortName, 'ml-combobox');
});

test('normalization is idempotent', () => {
  assert.equal(normalizeOriginPage(CANON), CANON);
  assert.equal(normalizeOriginPage(normalizeOriginPage('_102040_molecules/groupselectone/ ml-combobox')), CANON);
});

test('a non-molecule reference is still rejected', () => {
  const { ref, error } = parseOriginRef('just some text');
  assert.equal(ref, null);
  assert.ok(error);
});

test('leading slash and .ts suffix are tolerated', () => {
  const { ref } = parseOriginRef('/_102040_/l2/molecules/groupselectone/ml-combobox.ts');
  assert.ok(ref);
  assert.equal(ref!.tag, 'groupselectone--ml-combobox');
});

test('extractAbsoluteMlClasses collects ml-* from array builders and inline class strings that carry absolute/fixed', () => {
  // Mirrors the discrete-slider render: get*Classes() arrays (absolute + ml-* as
  // separate elements) and inline class="absolute ... ml-*" strings.
  const ts = `
    private getStopClasses() {
      return [
        'absolute -translate-y-1/2 -translate-x-1/2',
        'w-4 h-4 rounded-full border-2',
        isBlue ? 'ml-slider-mark-active' : 'ml-slider-mark',
      ].filter(Boolean).join(' ');
    }
    private getIndicatorClasses() {
      return ['absolute -top-8', 'ml-slider-thumb', 'after:absolute ml-slider-thumb-arrow'].join(' ');
    }
    render() {
      return html\`<div class="absolute top-0 left-0 h-full ml-slider-filled"></div>
        <button class="relative inline-flex ml-button"></button>\`;
    }
  `;
  const absolute = extractAbsoluteMlClasses(ts);
  assert.ok(absolute.includes('ml-slider-mark'));
  assert.ok(absolute.includes('ml-slider-mark-active'));
  assert.ok(absolute.includes('ml-slider-thumb'));
  assert.ok(absolute.includes('ml-slider-thumb-arrow'));
  assert.ok(absolute.includes('ml-slider-filled'));
  // a merely `relative`/`inline-flex` element is NOT collected
  assert.ok(!absolute.includes('ml-button'));
});
