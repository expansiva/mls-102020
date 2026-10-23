/// <mls fileReference="_102020_/l2/serviceAvatar/svaView.test.ts" enhancement="_blank"/>

// What the floating chat shows for each moment of an agentAssistant task.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allSteps, taskView } from '/_102020_/l2/serviceAvatar/svaView.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const step = (stepId: number, type: string, status: string, extra: Record<string, unknown> = {}) => ({ stepId, type, status, nextSteps: [], interaction: null, ...extra });

const root = (children: unknown[], status = 'in_progress') => ({ ...step(1, 'agent', status, { stepTitle: 'agentAssistant' }), nextSteps: children });

test('while an agent step runs, the chat is thinking and shows that step title', () => {
  const task = { status: 'in progress', iaCompressed: { nextSteps: [root([step(2, 'agent', 'pending', { stepTitle: 'Entender o pedido' })])] } };
  assert.deepEqual(taskView(task), { kind: 'thinking', text: 'Entender o pedido', stepId: 0 });
});

test('a clarification emitted in an agent payload is what the chat mounts', () => {
  const ask = { ...step(4, 'agent', 'in_progress', { stepTitle: 'Confirme a ação' }), interaction: { payload: [step(5, 'clarification', 'pending')] } };
  const task = { status: 'in progress', iaCompressed: { nextSteps: [root([step(2, 'agent', 'completed'), ask])] } };
  assert.deepEqual(taskView(task), { kind: 'waiting', text: '', stepId: 5 });
});

test('a finished task shows its most recent result', () => {
  const task = {
    status: 'done',
    iaCompressed: { nextSteps: [root([
      step(2, 'agent', 'completed'),
      step(6, 'result', 'completed', { stepTitle: 'Respostas registradas' }),
      step(9, 'result', 'completed', { stepTitle: 'Feito: Abrir comanda para a mesa 2' }),
    ], 'completed')] },
  };
  assert.deepEqual(taskView(task), { kind: 'done', text: 'Feito: Abrir comanda para a mesa 2', stepId: 0 });
});

test('a failed task shows the reason it carries', () => {
  const task = { status: 'failed', iaCompressed: { nextSteps: [root([step(3, 'agent', 'failed', { traceMsg: 'ask-1: invalid payload type result' })], 'failed')] } };
  assert.deepEqual(taskView(task), { kind: 'failed', text: 'ask-1: invalid payload type result', stepId: 0 });
});

test('steps are found in nextSteps and in interaction payloads', () => {
  const task = { status: 'in progress', iaCompressed: { nextSteps: [root([{ ...step(2, 'agent', 'in_progress'), interaction: { payload: [step(3, 'clarification', 'pending')] } }])] } };
  assert.deepEqual(allSteps(task).map(item => item.stepId), [1, 2, 3]);
});

test('the service is registered for level 7 with the widget path it is served from', () => {
  const index = readFileSync(path.resolve(HERE, '../pluginCollabCoreIndex.ts'), 'utf8');
  assert.match(index, /scope: \['l7ServicesLeft'\],[\s\S]{0,80}widget: '_102020_\/l2\/serviceAvatar\/serviceAvatar'/);
  const service = readFileSync(path.join(HERE, 'serviceAvatar.ts'), 'utf8');
  assert.match(service, /widget: '_102020_\/l2\/serviceAvatar\/serviceAvatar'/);
  assert.match(service, /level: \[7\]/);
  // the tag must follow convertFileNameToTag(folder 'serviceAvatar', shortName 'serviceAvatar', 102020)
  assert.match(service, /@customElement\('service-avatar--service-avatar-102020'\)/);
});
