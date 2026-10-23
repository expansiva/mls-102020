/// <mls fileReference="_102020_/l2/agentAssistant/steps/answer/agentAsAnswer.test.ts" enhancement="_blank"/>

// answer is a checkpoint step whose model call also writes the answer. Static checks: the human
// prompt carries the question and the data, the answer is read back from the clarification json,
// and the task row title stays one short line.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkClarificationPayload, readAnswerFromJson } from '/_102020_/l2/agentAssistant/helpers/asIds.js';
import { createState } from '/_102020_/l2/agentAssistant/helpers/asPlan.js';
import { answerStepTitle, buildAnswerHumanPrompt, buildManualHumanPrompt } from '/_102020_/l2/agentAssistant/steps/answer/answerPrompt.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('the human prompt carries language, question, the query that ran, its params and its data', () => {
  const state = {
    ...createState(102047, 'qual o valor total da comanda 4?', 'pt-BR', '', [], 'question'),
    results: [{
      route: 'm.fechamento.buscarComandasAbertas', title: 'Consultar a comanda 4', params: { number: 4, page: 1, pageSize: 50 },
      summary: [], ok: true, data: { openComandas: { items: [{ number: 4, details: { totalComanda: '57.90' } }] } }, error: null,
    }],
  };
  const human = buildAnswerHumanPrompt(state, 'Busca as comandas abertas.');
  assert.match(human, /## Language\npt-BR/);
  assert.match(human, /## Question\nqual o valor total da comanda 4\?/);
  assert.match(human, /m\.fechamento\.buscarComandasAbertas — Busca as comandas abertas\./);
  assert.match(human, /"number":4/);
  assert.match(human, /"totalComanda":"57\.90"/);
});

test('the answer is read from the clarification json; the envelope is checked like any round', () => {
  const payload = { type: 'clarification', json: { planId: 'answer', answer: ' O total da comanda 4 é R$ 57,90. ' } };
  assert.equal(checkClarificationPayload(payload, 'answer'), '');
  assert.equal(readAnswerFromJson(payload.json), 'O total da comanda 4 é R$ 57,90.');
  assert.equal(readAnswerFromJson('{"planId":"answer","answer":"x"}'), 'x');
  assert.equal(readAnswerFromJson({ planId: 'answer' }), '');
});

test('the task row title is the first line of the answer, kept short', () => {
  assert.equal(answerStepTitle('\nO total é R$ 57,90.\nDetalhes...'), 'O total é R$ 57,90.');
  assert.equal(answerStepTitle('x'.repeat(200)).length, 120);
});

test('a manual answer gets language, question and only the chosen documentation', () => {
  const state = createState(102047, 'como fecho uma comanda?', 'pt-BR', '', []);
  const human = buildManualHumanPrompt(state, '{"modules":[{"title":"Comanda"}]}');
  assert.match(human, /## Language\npt-BR/);
  assert.match(human, /## Question\ncomo fecho uma comanda\?/);
  assert.match(human, /## App documentation\n\{"modules"/);
});

test('the manual prompt forbids invented screens and markdown', () => {
  const prompt = readFileSync(path.join(HERE, 'manual.md'), 'utf8');
  assert.match(prompt, /Never invent screens, buttons, fields, options or steps/);
  assert.match(prompt, /Plain text only: no markdown/);
});

test('all prompts of the step carry the planId placeholder', () => {
  for (const file of ['prompt.md', 'envelope.md', 'manual.md']) {
    assert.match(readFileSync(path.join(HERE, file), 'utf8'), /"planId": "\{\{planId\}\}"/, file);
  }
});
