/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/widgetDefinitionChoiceLogic.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefinitionResult,
  canConfirmDefinition,
  changeLabelKey,
  definitionBlockingIssues,
  definitionMessageKey,
  initialSelection,
  selectedChanges,
  toggleSelection,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/widgetDefinitionChoiceLogic.js';
import { ImDefinitionChange } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const CHANGES: ImDefinitionChange[] = [
  { kind: 'slot', op: 'add', name: 'Footer', purpose: 'aparece abaixo da árvore' },
  { kind: 'event', op: 'add', name: 'expand', purpose: 'avisa quando um nó abre' },
];

test('everything the model proposed starts accepted — the human drops, rather than picks', () => {
  assert.deepEqual(initialSelection(CHANGES), [true, true]);
  assert.deepEqual(selectedChanges(CHANGES, initialSelection(CHANGES)), CHANGES);
});

test('a line can be dropped without cancelling the run', () => {
  // The reason the checkpoint is a list and not a yes/no: a request often implies more than the
  // person meant, and dropping one line is cheaper than starting over.
  const selection = toggleSelection(initialSelection(CHANGES), 1);
  assert.deepEqual(selection, [true, false]);
  assert.deepEqual(selectedChanges(CHANGES, selection).map(c => c.name), ['Footer']);
  assert.equal(canConfirmDefinition(CHANGES, selection), true);
});

test('dropping EVERY line is a cancellation, not a confirmation', () => {
  // Confirming here would write an empty decision and instruct i3-edit to change the definition to
  // itself. The widget says so instead of letting it through.
  const none = CHANGES.map(() => false);
  assert.deepEqual(definitionBlockingIssues(CHANGES, none), ['no_change']);
  assert.equal(canConfirmDefinition(CHANGES, none), false);
});

test('the result carries only what stayed selected, and the action', () => {
  const selection = toggleSelection(initialSelection(CHANGES), 0);
  const result = buildDefinitionResult(CHANGES, selection, 'continue');
  assert.deepEqual(result.changes.map(c => c.name), ['expand']);
  assert.equal(result.action, 'continue');
});

test('cancelling carries the action through even with lines selected', () => {
  const result = buildDefinitionResult(CHANGES, initialSelection(CHANGES), 'cancel');
  assert.equal(result.action, 'cancel');
});

test('the label key pairs kind with op, so the wording is translated with the rest', () => {
  assert.equal(changeLabelKey(CHANGES[0]), 'slot_add');
  assert.equal(changeLabelKey({ kind: 'property', op: 'rename', name: 'x', previousName: 'y', purpose: 'z' }), 'property_rename');
});

test("the chrome follows the RUN's language, not the document's", () => {
  assert.equal(definitionMessageKey('pt', ['en', 'pt'], 'en'), 'pt');
  assert.equal(definitionMessageKey('pt-BR', ['en', 'pt'], 'en'), 'pt');
  assert.equal(definitionMessageKey('de', ['en', 'pt'], 'en'), 'en');
});
