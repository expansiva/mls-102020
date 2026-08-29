/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syRenderSkill.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { syRenderProjectSkill, SyRenderSkillInput } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syRenderSkill.js';

const INPUT: SyRenderSkillInput = {
  project: 102040,
  generatedAt: '2026-08-25T12:00:00.000Z',
  groups: [
    { canonical: 'groupEnterNumber', folder: 'groupenternumber', purpose: 'Allows the user to input numeric values.', moleculeShortTags: ['ml-floating-number-input', 'ml-number-input', 'ml-number-stepper'] },
    { canonical: 'groupEnterText', folder: 'groupentertext', purpose: 'Allows the user to input free-form text.', moleculeShortTags: ['ml-address-field', 'ml-cpf-input'] },
  ],
};

void test('the fileReference line names the project skill.ts', () => {
  const text = syRenderProjectSkill(INPUT);
  assert.equal(text.split('\n')[0], '/// <mls fileReference="_102040_/l2/molecules/skill.ts" enhancement="_blank"/>');
});

void test('groups array: name, molecule count and indexDefs reference, in input order', () => {
  const text = syRenderProjectSkill(INPUT);
  assert.match(text, /\{ name: 'groupEnterNumber', molecules: 3, indexDefs: '\/_102040_\/l2\/molecules\/groupenternumber\/index\.defs' \},/);
  assert.match(text, /\{ name: 'groupEnterText', molecules: 2, indexDefs: '\/_102040_\/l2\/molecules\/groupentertext\/index\.defs' \},/);
  const numberIdx = text.indexOf("name: 'groupEnterNumber'");
  const textIdx = text.indexOf("name: 'groupEnterText'");
  assert.ok(numberIdx < textIdx, 'groups array preserves the given (skills/index.ts) order');
});

void test('markdown: one "### group (N molecules)" section per group, purpose then Molecules line', () => {
  const text = syRenderProjectSkill(INPUT);
  assert.match(text, /### groupEnterNumber \(3 molecules\)\nAllows the user to input numeric values\.\nMolecules: ml-floating-number-input, ml-number-input, ml-number-stepper/);
});

void test('the title names the actual group count generated, not a fixed pilot number', () => {
  const text = syRenderProjectSkill(INPUT);
  assert.match(text, /# Molecules — catalog of project mls-102040 \(2 groups\)/);
});

void test('ends with "This project has no local theme." after a blank line', () => {
  const text = syRenderProjectSkill(INPUT);
  assert.ok(text.includes('\n\nThis project has no local theme.\n'));
});

void test('a single group gets singular wording ("1 group")', () => {
  const text = syRenderProjectSkill({ ...INPUT, groups: [INPUT.groups[0]] });
  assert.match(text, /\(1 group\)/);
});

// ⚠️ THE REGRESSION OF 2026-08-26. groupSelectOne's description in skills/index.ts contains markdown
// inline code — "Layout is chosen via the `variant` property" — and its first backtick CLOSED the
// generated template literal 29 lines early, so a real skill.ts stopped being valid TypeScript. It
// wrote and synced without complaint; only the editor showed it. Backticks in prose are normal.
void test('a backtick in the group description does not break out of the generated template literal', () => {
  const source = syRenderProjectSkill({
    project: 102053,
    generatedAt: '2026-08-26T00:00:00.000Z',
    groups: [{ canonical: 'groupSelectOne', folder: 'groupselectone', purpose: 'Layout is chosen via the `variant` property: dropdown, radio group.', moleculeShortTags: ['ml-select'] }],
  });

  const body = source.slice(source.indexOf('export const skill = `') + 'export const skill = `'.length);
  const closing = body.lastIndexOf('`');
  const inner = body.slice(0, closing);
  // everything before the closing delimiter must be ESCAPED backticks only — never a bare one
  assert.equal(inner.includes('\\`'), true, 'the prose backticks must be escaped');
  assert.equal((inner.match(/\\`/g) || []).length, (inner.match(/`/g) || []).length, 'every inner backtick is escaped');
  assert.match(source, /\\`variant\\`/);
  // and the literal must close exactly once, at the end
  assert.match(source, /`;\n?$/);
});

void test('a ${ in the prose cannot become an interpolation', () => {
  const source = syRenderProjectSkill({
    project: 102053,
    generatedAt: '2026-08-26T00:00:00.000Z',
    groups: [{ canonical: 'groupX', folder: 'groupx', purpose: 'Use ${value} as the placeholder.', moleculeShortTags: ['ml-x'] }],
  });
  assert.match(source, /\\\$\{value\}/);
});
