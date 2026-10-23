/// <mls fileReference="_102020_/l2/agentAssistant/steps/ask/agentAsAsk.test.ts" enhancement="_blank"/>

// ask is a checkpoint step: its model call only emits the envelope. What can break is mechanical —
// the envelope check, the round ids, and the questions matching the shared widget's contract.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askPlanId, checkClarificationPayload, readPlanIdFromJson, roundOfPlanId } from '/_102020_/l2/agentAssistant/helpers/asIds.js';
import { buildCatalog } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { createState, planNext } from '/_102020_/l2/agentAssistant/helpers/asPlan.js';
import { allDecisionAnswered, buildDecisionResult, initialDecisionAnswers } from '/_102020_/l2/aura/molecules/shared/widgetDecisionClarificationLogic.js';
import { fakeBff, fixtureModule } from '/_102020_/l2/agentAssistant/helpers/asFixture.test.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('round ids round-trip and nothing else is a round', () => {
  assert.equal(askPlanId(3), 'ask-3');
  assert.equal(roundOfPlanId('ask-3'), 3);
  assert.equal(roundOfPlanId('interpret'), 0);
  assert.equal(roundOfPlanId('ask-3-answer'), 0);
});

test('the envelope must be a clarification carrying THIS round planId', () => {
  assert.equal(checkClarificationPayload({ type: 'clarification', json: { planId: 'ask-1' } }, 'ask-1'), '');
  assert.equal(checkClarificationPayload({ type: 'flexible', result: '{"type":"clarification","json":"{\\"planId\\":\\"ask-1\\"}"}' }, 'ask-1'), '');
  assert.match(checkClarificationPayload({ type: 'clarification', json: { planId: 'ask-2' } }, 'ask-1'), /does not carry planId ask-1/);
  assert.match(checkClarificationPayload({ type: 'flexible', result: 'hello' }, 'ask-1'), /no payload object/);
  assert.equal(checkClarificationPayload({ type: 'result', result: 'provider down' }, 'ask-1'), 'provider down');
});

test('the planId is read from the clarification json, string or object', () => {
  assert.equal(readPlanIdFromJson('{"planId":"ask-2"}'), 'ask-2');
  assert.equal(readPlanIdFromJson({ planId: 'ask-2' }), 'ask-2');
  assert.equal(readPlanIdFromJson('nope'), '');
});

test('the envelope prompt has the planId placeholder the agent fills', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /"planId": "\{\{planId\}\}"/);
});

test('a planned round is something the shared widget can complete and answer', async () => {
  const catalog = buildCatalog([fixtureModule()]);
  const { next } = await planNext(createState(1, 'cadastre uma salada', 'pt-BR', '', [{
    route: 'resto.cardapio.cadastrarItemCardapio', title: 'Cadastrar salada', reason: '', values: { name: 'Salada' }, refs: {},
  }]), catalog, fakeBff().call);
  assert.equal(next.kind, 'ask');
  if (next.kind !== 'ask') return;
  const questions = next.pending.questions;
  const local = initialDecisionAnswers(questions);
  // an open field starts unanswered: the user must type it
  assert.equal(allDecisionAnswered(questions, local), false);
  local[questions[0].id] = { optionId: '', notes: '19,90' };
  assert.equal(allDecisionAnswered(questions, local), true);
  assert.deepEqual(buildDecisionResult(questions, local), [{ id: 'val:details.details.precoVigente', optionId: '', label: '', notes: '19,90' }]);
});
