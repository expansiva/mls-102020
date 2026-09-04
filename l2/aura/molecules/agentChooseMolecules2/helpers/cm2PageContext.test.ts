/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2PageContext.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPageContext, formatPageContext } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2PageContext.js';

// The shape of a goal-first genome (page21/page31) — the real _102046_ approveChangeOrder, trimmed.
const PAGE21_DEFINITION = {
  purpose: 'Decidir favoravelmente uma ordem de mudança recebida e encaminhá-la ao faturamento.',
  presentation: { categoryRef: 'approvalWorkflow' },
  pageObjective: {
    jobToBeDone: 'Revisar a ordem de mudança pendente, aprová-la e encaminhá-la ao faturamento.',
    primaryDecision: 'Aprovar a ordem de mudança selecionada.',
    usageFrequency: 'Operacional e recorrente.',
    decisiveInfo: ['status atual da ordem', 'valor da alteração'],
    informationHierarchy: ['ordem selecionada e status atual', 'ação de aprovação'],
    antiPatterns: ['select livre para status', 'campo manual para changeOrderId'],
    criticalActions: [
      { action: 'Localizar e selecionar a ordem pendente', presentation: 'master-detail com superfície dominante' },
      { action: 'Aprovar a ordem selecionada', presentation: 'contextual-transition-actions' },
    ],
  },
  dataBindings: [
    { id: 'b1', kind: 'query', inputs: [] },
    {
      id: 'b2',
      kind: 'command',
      inputs: [
        { name: 'changeOrderId', source: 'selectedEntity', presentation: 'selection' },
        { name: 'clientId', source: 'selectedEntity', presentation: 'selection' },
        { name: 'status', source: 'userInput', presentation: 'form' },
      ],
    },
  ],
};

// The shape of the baseline genome (page11): no pageObjective at all.
const PAGE11_DEFINITION = {
  purpose: 'Decidir favoravelmente uma ordem de mudança recebida.',
  presentation: { categoryRef: 'approvalWorkflow' },
  dataBindings: [{ id: 'b1', kind: 'query', inputs: [] }],
};

void test('extracts every declared page-level fact of a goal-first genome', () => {
  const context = extractPageContext(PAGE21_DEFINITION);
  assert.equal(context.categoryRef, 'approvalWorkflow');
  assert.match(context.jobToBeDone, /Revisar a ordem/);
  assert.equal(context.usageFrequency, 'Operacional e recorrente.');
  assert.deepEqual(context.decisiveInfo, ['status atual da ordem', 'valor da alteração']);
  assert.deepEqual(context.antiPatterns, ['select livre para status', 'campo manual para changeOrderId']);
  assert.equal(context.criticalActions.length, 2);
  assert.equal(context.criticalActions[1].presentation, 'contextual-transition-actions');
});

void test('counts the command inputs fed by a row selection — a structural fact, not an inference', () => {
  assert.equal(extractPageContext(PAGE21_DEFINITION).selectionInputCount, 2);
  assert.equal(extractPageContext(PAGE11_DEFINITION).selectionInputCount, 0);
});

void test('the formatted section carries the two facts that decide a tie: declared presentation and anti-patterns', () => {
  const section = formatPageContext(extractPageContext(PAGE21_DEFINITION));
  assert.match(section, /master-detail com superfície dominante/);
  assert.match(section, /select livre para status/);
  assert.match(section, /2 command input\(s\).*SELECTING a row/);
});

void test('page11 (no pageObjective) degrades to purpose + category, never padded with a guess', () => {
  const section = formatPageContext(extractPageContext(PAGE11_DEFINITION));
  assert.match(section, /approvalWorkflow/);
  assert.doesNotMatch(section, /Job to be done/);
  assert.doesNotMatch(section, /Anti-patterns/);
  assert.doesNotMatch(section, /SELECTING a row/);
});

void test('a definition that declares none of it yields no section at all', () => {
  assert.equal(formatPageContext(extractPageContext({})), '');
  assert.equal(formatPageContext(extractPageContext({ dataBindings: 'not-an-array' } as any)), '');
});

void test('malformed pageObjective entries are dropped, never thrown on', () => {
  const context = extractPageContext({
    pageObjective: { decisiveInfo: ['ok', '', 42, null], criticalActions: [{ presentation: 'no action name' }, 'nope', { action: 'kept' }] },
  } as any);
  assert.deepEqual(context.decisiveInfo, ['ok']);
  assert.deepEqual(context.criticalActions, [{ action: 'kept', presentation: '' }]);
});
