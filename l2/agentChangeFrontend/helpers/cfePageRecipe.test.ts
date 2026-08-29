/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageRecipe.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseUxVariantsMode,
  pageSlotRecipe,
  pageSlotRecipes,
  primaryGenomeOf,
} from './cfePageRecipe.js';

test('default recipe: contentLanding is page11 prose+skill+split; management is page31 goal-first', () => {
  const content = pageSlotRecipes('contentLanding');
  assert.deepEqual(content.map(slot => slot.genome), ['page11']);
  assert.equal(content[0].defsFormat, 'prose');
  assert.equal(content[0].templateMode, 'pinned');
  assert.equal(content[0].attachExperienceSkill, true);
  assert.equal(content[0].splitByOrganism, true);

  const management = pageSlotRecipes('inventoryControl');
  assert.deepEqual(management.map(slot => slot.genome), ['page31']);
  assert.equal(management[0].defsFormat, 'object');
  assert.equal(management[0].templateMode, 'goal-first');
  assert.equal(management[0].attachExperienceSkill, true);
  assert.equal(management[0].splitByOrganism, false);

  const unknown = pageSlotRecipes('');
  assert.deepEqual(unknown.map(slot => slot.genome), ['page31']);
});

test('variants:all restores three slots; management page11 stays bespoke', () => {
  const management = pageSlotRecipes('financialTransactions', 'all');
  assert.deepEqual(management.map(slot => slot.genome), ['page11', 'page21', 'page31']);
  assert.equal(management[0].attachExperienceSkill, false);
  assert.equal(management[0].templateMode, 'pinned');
  assert.equal(management[0].defsFormat, 'prose');
  assert.equal(management[1].templateMode, 'goal-first');
  assert.equal(management[2].templateMode, 'goal-first');

  const content = pageSlotRecipes('contentLanding', 'all');
  assert.deepEqual(content.map(slot => slot.genome), ['page11', 'page21', 'page31']);
  assert.ok(content.every(slot => slot.defsFormat === 'prose' && slot.attachExperienceSkill && slot.splitByOrganism));
});

test('slot lookup is by category+genome, not by which set was generated', () => {
  const prose = pageSlotRecipe('contentLanding', 'page21');
  assert.equal(prose.defsFormat, 'prose');
  const object = pageSlotRecipe('inventoryControl', 'page21');
  assert.equal(object.defsFormat, 'object');
  const page11 = pageSlotRecipe('inventoryControl', 'page11');
  assert.equal(page11.defsFormat, 'prose');
  assert.equal(page11.attachExperienceSkill, false);
});

test('primaryGenomeOf keeps page11 as the unsuffixed route when it exists', () => {
  assert.equal(primaryGenomeOf(['page11', 'page21', 'page31']), 'page11');
  assert.equal(primaryGenomeOf(['page31']), 'page31');
  assert.equal(primaryGenomeOf([]), 'page11');
});

test('parseUxVariantsMode reads the rebuild token and ignores the rest', () => {
  assert.equal(parseUxVariantsMode(['rebuild', 'all', 'variants:all']), 'all');
  assert.equal(parseUxVariantsMode(['/variants=all']), 'all');
  assert.equal(parseUxVariantsMode(['rebuild', 'all', 'todo']), 'default');
});
