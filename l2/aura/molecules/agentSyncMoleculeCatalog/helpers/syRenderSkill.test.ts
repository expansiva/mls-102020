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

void test('markdown: one "### group (N moléculas)" section per group, purpose then Moléculas line', () => {
  const text = syRenderProjectSkill(INPUT);
  assert.match(text, /### groupEnterNumber \(3 moléculas\)\nAllows the user to input numeric values\.\nMoléculas: ml-floating-number-input, ml-number-input, ml-number-stepper/);
});

void test('the title names the actual group count generated, not a fixed pilot number', () => {
  const text = syRenderProjectSkill(INPUT);
  assert.match(text, /# Molecules — catálogo do projeto mls-102040 \(2 grupos\)/);
});

void test('ends with "Este projeto não tem tema local." after a blank line', () => {
  const text = syRenderProjectSkill(INPUT);
  assert.ok(text.includes('\n\nEste projeto não tem tema local.\n'));
});

void test('a single group gets singular wording ("1 grupo")', () => {
  const text = syRenderProjectSkill({ ...INPUT, groups: [INPUT.groups[0]] });
  assert.match(text, /\(1 grupo\)/);
});
