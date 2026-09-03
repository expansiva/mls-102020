/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAbsoluteMlClasses, extractGeometryByClass, normalizeOriginPage, parseOriginRef, parseVariantEntry } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.js';

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

// T11: geometry conservation (Strategy D). Fixture mirrors the real
// ml-number-range-slider.less that lost its rail in the brutal variant.
const originSheet = `
groupenternumberinterval--ml-number-range-slider {
  .ml-nrs-readonly {
    .ml-nrs-track-area,
    .ml-nrs-handle { cursor: default; }
  }
  .ml-nrs-error {
    .ml-nrs-track-fill { background: var(--ml-error, #ef4444); }
  }
  .ml-nrs-track { height: var(--ml-nrs-handle-size, 20px); }
  .ml-nrs-track-base {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: var(--ml-nrs-track-height, 6px);
    transform: translateY(-50%);
    background: var(--ml-surface-dim, #f5f5f5);
    border-radius: var(--ml-radius-full, 9999px);
  }
  .ml-nrs-handle { width: var(--ml-nrs-handle-size, 20px); height: var(--ml-nrs-handle-size, 20px); }
  .ml-nrs-handle-active {
    .ml-nrs-handle-knob { transform: scale(1.15); }
  }
  .ml-button:hover:not(.ml-disabled) { transform: translate(2px, 2px); }
  @keyframes ml-nrs-spin { to { transform: rotate(360deg); } }
}
`;

test('extractGeometryByClass keeps only layout props, per selector SUBJECT', () => {
  const map = extractGeometryByClass(originSheet);
  assert.deepEqual(map['ml-nrs-track-base'], {
    position: 'absolute',
    top: '50%',
    left: '0',
    right: '0',
    height: 'var(--ml-nrs-track-height, 6px)',
    transform: 'translateY(-50%)',
  });
  assert.deepEqual(map['ml-nrs-track'], { height: 'var(--ml-nrs-handle-size, 20px)' });
  assert.deepEqual(map['ml-nrs-handle'], { width: 'var(--ml-nrs-handle-size, 20px)', height: 'var(--ml-nrs-handle-size, 20px)' });
  // nested child rule belongs to the CHILD, not to .ml-nrs-handle-active
  assert.deepEqual(map['ml-nrs-handle-knob'], { transform: 'scale(1.15)' });
  assert.equal(map['ml-nrs-handle-active'], undefined);
  // appearance-only and cursor-only blocks contribute nothing
  assert.equal(map['ml-nrs-track-fill'], undefined);
  assert.equal(map['ml-nrs-track-area'], undefined);
  // `:not(.ml-disabled)` is never the subject — the transform belongs to .ml-button
  assert.deepEqual(map['ml-button'], { transform: 'translate(2px, 2px)' });
  assert.equal(map['ml-disabled'], undefined);
});

test('extractGeometryByClass ignores comments and keyframes', () => {
  const map = extractGeometryByClass(`
    tag {
      // .ml-fake { position: absolute; }
      /* .ml-fake2 { top: 0; } */
      .ml-real { position: relative; }
    }
  `);
  assert.deepEqual(Object.keys(map), ['ml-real']);
});

// A2: mention entry. Stand-in for mls.common.safeParseArgs — tolerates JS-object syntax,
// THROWS on anything else (the real one raises 'Invalid args format, cannot parse.').
const VARIANT_AGENT = 'agentNewMoleculeVariant';
const fakeParseArgs = (raw: string): Record<string, unknown> => {
  if (!/^\{[\s\S]*\}$/.test(raw.trim())) throw new Error('Invalid args format, cannot parse.');
  const out: Record<string, unknown> = {};
  for (const m of raw.matchAll(/([a-zA-Z]+)\s*:\s*'((?:[^'\\]|\\.)*)'/g)) out[m[1]] = m[2];
  if (!Object.keys(out).length) throw new Error('Invalid args format, cannot parse.');
  return out;
};

test('parseVariantEntry: object mention and preview payload', () => {
  assert.deepEqual(
    parseVariantEntry("{ page: '_102040_/l2/molecules/grouptriggeraction/ml-button-standard', prompt: 'bordas grossas' }", VARIANT_AGENT, fakeParseArgs),
    { page: '_102040_/l2/molecules/grouptriggeraction/ml-button-standard', notes: 'bordas grossas' },
  );
  // the preview sends fullName + the mention itself as `prompt`
  assert.deepEqual(
    parseVariantEntry("{ fullName: '_102040_/l2/molecules/groupselectone/ ml-combobox', prompt: '@@NewMoleculeVariant' }", VARIANT_AGENT, fakeParseArgs),
    { page: '_102040_/l2/molecules/groupselectone/ ml-combobox', notes: '' },
  );
});

test('parseVariantEntry: a BARE reference no longer dies in the arg parser', () => {
  assert.deepEqual(
    parseVariantEntry('_102040_/l2/molecules/groupenternumber/ml-range-slider', VARIANT_AGENT, fakeParseArgs),
    { page: '_102040_/l2/molecules/groupenternumber/ml-range-slider', notes: '' },
  );
  // reference followed by notes
  assert.deepEqual(
    parseVariantEntry('_102040_/l2/molecules/g/ml-x deixe as bordas mais grossas', VARIANT_AGENT, fakeParseArgs),
    { page: '_102040_/l2/molecules/g/ml-x', notes: 'deixe as bordas mais grossas' },
  );
  // a pasted fullName keeps its space before the molecule name — glue it back
  assert.deepEqual(
    parseVariantEntry('_102040_/l2/molecules/groupselectone/ ml-combobox', VARIANT_AGENT, fakeParseArgs),
    { page: '_102040_/l2/molecules/groupselectone/ml-combobox', notes: '' },
  );
  // '@@ agentNewMoleculeVariant <ref>' still carries the agent name (runtime strips only '@@')
  assert.equal(parseVariantEntry(`${VARIANT_AGENT} _102040_/l2/molecules/g/ml-x`, VARIANT_AGENT, fakeParseArgs).page, '_102040_/l2/molecules/g/ml-x');
});

test('parseVariantEntry: no reference means no page (caller fails readable)', () => {
  assert.deepEqual(parseVariantEntry('', VARIANT_AGENT, fakeParseArgs), { page: '', notes: '' });
  assert.deepEqual(parseVariantEntry('@@someOtherAgent', VARIANT_AGENT, fakeParseArgs), { page: '', notes: '' });
  assert.deepEqual(parseVariantEntry('crie uma variante bonita', VARIANT_AGENT, fakeParseArgs), { page: '', notes: 'crie uma variante bonita' });
  // malformed object: no reference to find, so the caller reports the missing ref
  assert.equal(parseVariantEntry("{ page: '_102040_", VARIANT_AGENT, fakeParseArgs).page, '_102040_');
});
