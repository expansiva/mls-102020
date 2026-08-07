/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i5-playground/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { ImPlaygroundGateInputs, runImPlaygroundGate } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i5-playground/gate.js';
import { ImSurfaceDiff, slotIsExercised } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';

const NO_DIFF: ImSurfaceDiff = {
  addedSlots: [], removedSlots: [], addedProperties: [], removedProperties: [],
  addedEvents: [], removedEvents: [], changed: false,
};

const PAGE = `<div class="p-6">
  <aura--molecules--playground--widget-playground-state-102020 state='playgroundDinamicState'></aura--molecules--playground--widget-playground-state-102020>
  <groupviewtable--ml-data-table>
    <div slot="Caption">Customers</div>
  </groupviewtable--ml-data-table>
</div>`;

function inputs(over: Partial<ImPlaygroundGateInputs> = {}): ImPlaygroundGateInputs {
  return {
    shouldChange: true,
    playgroundChanged: true,
    before: PAGE,
    after: PAGE,
    tag: 'groupviewtable--ml-data-table',
    diff: NO_DIFF,
    ...over,
  };
}

test('a no-op run that wrote nothing passes', () => {
  assert.deepEqual(runImPlaygroundGate(inputs({ shouldChange: false, playgroundChanged: false })), { ok: true, errors: [] });
});

test('a no-op run that REWROTE the page is refused', () => {
  // It produces a diff the user has to review and claims work that was not needed.
  const result = runImPlaygroundGate(inputs({ shouldChange: false, playgroundChanged: true }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^should_be_noop: /);
});

test('a moved surface with an untouched page is refused', () => {
  const result = runImPlaygroundGate(inputs({ playgroundChanged: false }));
  assert.match(result.errors[0], /^not_updated: /);
});

test('THE 2026-08-05 CHECK: an added slot that no example uses is refused', () => {
  const diff = { ...NO_DIFF, addedSlots: ['Detail'], changed: true };
  const result = runImPlaygroundGate(inputs({ diff }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^slot_missing: /);
  assert.match(result.errors[0], /Detail/);
});

test('an added slot that the page exercises passes, in either spelling', () => {
  const diff = { ...NO_DIFF, addedSlots: ['Detail'], changed: true };
  const asAttribute = PAGE.replace('</groupviewtable--ml-data-table>', '<div slot="Detail">x</div></groupviewtable--ml-data-table>');
  assert.equal(runImPlaygroundGate(inputs({ diff, after: asAttribute })).ok, true);

  const asElement = PAGE.replace('</groupviewtable--ml-data-table>', '<Detail>x</Detail></groupviewtable--ml-data-table>');
  assert.equal(runImPlaygroundGate(inputs({ diff, after: asElement })).ok, true);
});

test('THE DELTA RULE: a slot the page NEVER exercised does not block', () => {
  // Pre-existing debt. i7 reports it; refusing here would freeze the agent on a playground nobody
  // asked to repair.
  const diff = { ...NO_DIFF, addedProperties: ['dense'], changed: true };
  const result = runImPlaygroundGate(inputs({ diff, after: PAGE.replace('Customers', 'Clients') }));
  assert.equal(result.ok, true);
});

test('removing the state widget is refused — every binding depends on it', () => {
  const diff = { ...NO_DIFF, addedProperties: ['dense'], changed: true };
  const after = PAGE.replace(/<aura--molecules--playground[\s\S]*?<\/aura--molecules--playground--widget-playground-state-102020>/, '');
  const result = runImPlaygroundGate(inputs({ diff, after }));
  assert.ok(result.errors.some(e => /^state_widget: /.test(e)));
});

test('a page that stops instantiating the molecule is refused', () => {
  const diff = { ...NO_DIFF, addedProperties: ['dense'], changed: true };
  const result = runImPlaygroundGate(inputs({ diff, after: '<div class="p-6">nothing here</div>' }));
  assert.ok(result.errors.some(e => /^tag_missing: /.test(e)));
});

test('a full HTML document is refused — the playground is a fragment', () => {
  const diff = { ...NO_DIFF, addedProperties: ['dense'], changed: true };
  const result = runImPlaygroundGate(inputs({ diff, after: `<html><body>${PAGE}</body></html>` }));
  assert.ok(result.errors.some(e => /^document: /.test(e)));
});

test('a binding to a property the molecule no longer has is refused', () => {
  const diff = { ...NO_DIFF, removedProperties: ['pageSize'], changed: true };
  const after = PAGE.replace('<groupviewtable--ml-data-table>', '<groupviewtable--ml-data-table page-size="{{playground.ex1.pageSize}}">');
  const result = runImPlaygroundGate(inputs({ diff, after }));
  assert.ok(result.errors.some(e => /^binding_stale: /.test(e)));
});

test('slotIsExercised accepts both spellings and rejects a mere mention', () => {
  assert.equal(slotIsExercised('<div slot="Detail">x</div>', 'Detail'), true);
  assert.equal(slotIsExercised('<Detail>x</Detail>', 'Detail'), true);
  assert.equal(slotIsExercised('<!-- the Detail slot goes here -->', 'Detail'), false);
});
