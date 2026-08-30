/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageRecipe.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseUxVariantsMode,
  pageSlotRecipe,
  pageSlotRecipes,
  primaryGenomeOf,
} from './cfePageRecipe.js';

const THREE = ['page11', 'page21', 'page31'];

test('every category returns the three genomes; category only picks the template of page21/page31', () => {
  const content = pageSlotRecipes('contentLanding');
  const management = pageSlotRecipes('inventoryControl');
  const unknown = pageSlotRecipes('');
  for (const slots of [content, management, unknown]) {
    assert.deepEqual(slots.map(slot => slot.genome), THREE);
    assert.ok(slots.every(slot => slot.defsFormat === 'prose' && slot.splitByOrganism === false));
  }
  assert.ok(content.every(slot => slot.templateMode === 'pinned' && slot.attachExperienceSkill));
  assert.equal(management[0].templateMode, 'pinned');
  assert.equal(management[0].attachExperienceSkill, false);
  assert.equal(management[1].templateMode, 'goal-first');
  assert.equal(management[2].templateMode, 'goal-first');
  assert.equal(unknown[2].templateMode, 'goal-first');
});

test('variants argument does not change the slot set', () => {
  assert.deepEqual(pageSlotRecipes('financialTransactions', 'all').map(slot => slot.genome), THREE);
  assert.deepEqual(pageSlotRecipes('contentLanding', 'default').map(slot => slot.genome), THREE);
});

test('no category may return fewer than 3 slots or split by organism', () => {
  const categories = ['contentLanding', 'inventoryControl', 'financialTransactions', 'operationalList', ''];
  const modes: Array<'default' | 'all'> = ['default', 'all'];
  for (const category of categories) {
    for (const variants of modes) {
      const slots = pageSlotRecipes(category, variants);
      assert.equal(slots.length, 3, `${category}/${variants} must return 3 slots`);
      assert.ok(slots.every(slot => slot.splitByOrganism === false), `${category}/${variants} must not split by organism`);
      assert.ok(slots.every(slot => slot.defsFormat === 'prose'), `${category}/${variants} must use prose defs`);
    }
  }
});

test('slot lookup is by category+genome; definition is always prose', () => {
  const landing21 = pageSlotRecipe('contentLanding', 'page21');
  assert.equal(landing21.defsFormat, 'prose');
  assert.equal(landing21.templateMode, 'pinned');
  const management21 = pageSlotRecipe('inventoryControl', 'page21');
  assert.equal(management21.defsFormat, 'prose');
  assert.equal(management21.templateMode, 'goal-first');
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
