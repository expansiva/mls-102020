/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c2-clarify/gate.test.ts" enhancement="_blank"/>

// The checkpoint's decision logic, without a DOM. What is protected: the options offered per
// mode (rename is single-only), the rename validation (a rename onto another existing molecule
// is not a fix), and what each choice DOES to the context.

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CopyContext, CopyItem, CopyMode } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { itemsToWrite } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import {
  BATCH_OPTIONS,
  SINGLE_OPTIONS,
  applyCancelToContext,
  applyChoiceToContext,
  collisionLines,
  collisionSummary,
  optionsFor,
  renameAllowed,
  runClarifyGate,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c2-clarify/gate.js';

function item(shortName: string, colliding: boolean, copiedFrom?: string): CopyItem {
  return {
    origin: {
      ref: `_102040_/l2/molecules/groupviewtable/${shortName}`,
      project: 102040,
      group: 'groupviewtable',
      shortName,
      tag: `groupviewtable--${shortName}`,
      className: 'X',
      chain: { isShell: false },
    },
    destination: {
      group: 'groupviewtable',
      files: {
        ts: `l2/molecules/groupviewtable/${shortName}.ts`,
        defs: `l2/molecules/groupviewtable/${shortName}.defs.ts`,
        less: `l2/molecules/groupviewtable/${shortName}.less`,
        html: `l2/molecules/groupviewtable/${shortName}.html`,
      },
    },
    collision: colliding ? { files: [`l2/molecules/groupviewtable/${shortName}.ts`], ...(copiedFrom ? { copiedFrom } : {}) } : null,
    rename: null,
    skip: false,
  };
}

function ctx(mode: CopyMode, items: CopyItem[]): CopyContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-08-19T00:00:00.000Z',
    runKey: 'run-1',
    destProject: 102053,
    mode,
    userLanguage: 'pt',
    userNotes: '',
    copiedFromDate: '2026-08-19',
    items,
  };
}

test('opções por modo: renomear só existe com uma molécula', () => {
  assert.deepEqual([...optionsFor('single')], [...SINGLE_OPTIONS]);
  assert.deepEqual([...optionsFor('group')], [...BATCH_OPTIONS]);
  assert.deepEqual([...optionsFor('list')], [...BATCH_OPTIONS]);
  assert.equal(renameAllowed('single'), true);
  assert.equal(renameAllowed('group'), false);
  assert.equal(renameAllowed('list'), false);
});

test('checkpoint sem colisão é incoerência (não deveria ter perguntado)', () => {
  const issues = runClarifyGate({ context: ctx('single', [item('ml-a', false)]), answer: { choice: 'replace' }, existingShortNames: [] });
  assert.ok(issues.some(issue => issue.code === 'no_collision'));
});

test('escolha de outro modo é rejeitada', () => {
  const single = runClarifyGate({ context: ctx('single', [item('ml-a', true)]), answer: { choice: 'replace-all' }, existingShortNames: [] });
  assert.ok(single.some(issue => issue.code === 'choice'));
  const batch = runClarifyGate({ context: ctx('list', [item('ml-a', true)]), answer: { choice: 'rename', newShortName: 'ml-b' }, existingShortNames: [] });
  assert.ok(batch.some(issue => issue.code === 'choice'));
});

test('substituir e ignorar passam sem exigir nada mais', () => {
  assert.deepEqual(runClarifyGate({ context: ctx('single', [item('ml-a', true)]), answer: { choice: 'replace' }, existingShortNames: [] }), []);
  assert.deepEqual(runClarifyGate({ context: ctx('list', [item('ml-a', true)]), answer: { choice: 'ignore-existing' }, existingShortNames: [] }), []);
});

test('renomear: exige nome, formato ml-kebab, diferente da origem e sem nova colisão', () => {
  const base = ctx('single', [item('ml-inline-edit-table', true)]);
  const empty = runClarifyGate({ context: base, answer: { choice: 'rename' }, existingShortNames: [] });
  assert.ok(empty.some(issue => issue.code === 'rename_empty'));

  const badFormat = runClarifyGate({ context: base, answer: { choice: 'rename', newShortName: 'InlineEdit' }, existingShortNames: [] });
  assert.ok(badFormat.some(issue => issue.code === 'rename_format'));

  const same = runClarifyGate({ context: base, answer: { choice: 'rename', newShortName: 'ml-inline-edit-table' }, existingShortNames: [] });
  assert.ok(same.some(issue => issue.code === 'rename_same'));

  const collides = runClarifyGate({ context: base, answer: { choice: 'rename', newShortName: 'ml-outra' }, existingShortNames: ['ml-outra'] });
  assert.ok(collides.some(issue => issue.code === 'rename_collision'));

  assert.deepEqual(runClarifyGate({ context: base, answer: { choice: 'rename', newShortName: 'ml-inline-edit-table-app' }, existingShortNames: ['ml-outra'] }), []);
});

test('ignorar já existentes: só as colididas ficam de fora, as novas seguem', () => {
  const before = ctx('list', [item('ml-a', true), item('ml-b', false), item('ml-c', true)]);
  const after = applyChoiceToContext(before, { choice: 'ignore-existing' });
  assert.deepEqual(after.items.map(entry => entry.skip), [true, false, true]);
  assert.deepEqual(itemsToWrite(after).map(entry => entry.origin.shortName), ['ml-b']);
  // o contexto original não é mutado
  assert.deepEqual(before.items.map(entry => entry.skip), [false, false, false]);
});

test('substituir todas: nada é pulado (a cópia passa por cima)', () => {
  const after = applyChoiceToContext(ctx('list', [item('ml-a', true), item('ml-b', true)]), { choice: 'replace-all' });
  assert.deepEqual(after.items.map(entry => entry.skip), [false, false]);
  assert.equal(itemsToWrite(after).length, 2);
});

test('renomear grava o novo nome apenas no item colidido', () => {
  const after = applyChoiceToContext(ctx('single', [item('ml-a', true)]), { choice: 'rename', newShortName: 'ml-a-app' });
  assert.equal(after.items[0].rename, 'ml-a-app');
  assert.equal(after.items[0].skip, false);
});

test('as linhas mostradas ao usuário nomeiam o arquivo e a data da cópia em risco', () => {
  const lines = collisionLines(ctx('list', [item('ml-a', true, '_102040_/l2/molecules/groupviewtable/ml-a @ 2026-07-01'), item('ml-b', false)]));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /ml-a\.ts/);
  assert.match(lines[0], /2026-07-01/);
});

test('resumo do step diz quantas colidiram e o que foi escolhido', () => {
  assert.match(collisionSummary(ctx('list', [item('ml-a', true), item('ml-b', true)]), 'ignore-existing'), /2 colis/);
  assert.equal(collisionSummary(ctx('list', [item('ml-a', false)]), 'x'), 'sem colisão');
});

// Regressão do T2 (Studio, 2026-08-20): cancelar precisa ser TERMINAL e VISÍVEL. Antes o step
// falhava sem emitir a âncora, e c3/c4/c5/c6 ficavam plantados esperando para sempre — o usuário
// não via nada acontecer. Agora o contexto fica marcado como cancelado, o que faz os steps
// seguintes no-op COM âncora até o summary fechar o run.

test('cancelar: marca o contexto e nenhum item é escrito', () => {
  const before = ctx('list', [item('ml-a', true), item('ml-b', false)]);
  const after = applyCancelToContext(before);
  assert.equal(after.cancelled, true);
  assert.deepEqual(after.items.map(entry => entry.skip), [true, true]);
  assert.equal(itemsToWrite(after).length, 0);
  // o contexto original não é mutado
  assert.equal(before.cancelled, undefined);
  assert.equal(itemsToWrite(before).length, 2);
});

test('itemsToWrite: um contexto cancelado não escreve nem os itens sem colisão', () => {
  const cancelled = { ...ctx('list', [item('ml-a', false), item('ml-b', false)]), cancelled: true };
  assert.equal(itemsToWrite(cancelled).length, 0);
});
