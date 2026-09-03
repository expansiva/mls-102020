/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout-phase/agentCfeCreateLayoutPhase.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCfeCreateLayoutPhase declares the layout phase step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateLayoutPhase.ts'), 'utf8');
  assert.match(src, /agentCfeCreateLayoutPhase/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
});

// ── uma falha de LLM num slot não pode matar a task (rodada 7) ────────────────
// msgtask_fe1 (petShop, 21/08/2026): um HTTP 402 no modelo de fallback derrubou a task inteira no meio
// do fan-out — 14 páginas prontas jogadas fora e 8 slots órfãos em in_progress. Com
// onFailure='wait_after_prompt' o slot vai para waiting_after_prompt_with_error, o afterPromptStep do
// agentCfeCreateLayout ainda roda e conclui com 'CREATE-LAYOUT-FAILED', e o gate sequencial decide.
// Os filhos herdam a política do host (addParallelChildStep).
async function loadCreateShared(): Promise<Record<string, any>> {
  const g = globalThis as unknown as Record<string, any>;
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'pt-BR' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  if (!g.mls) g.mls = { actualProject: 102020, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  const loaded = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js') as Record<string, any>;
  return loaded.default || loaded['module.exports'] || loaded;
}

void test('o host do fan-out de layouts carrega onFailure wait_after_prompt', async () => {
  const { createAgentStepPayload } = await loadCreateShared();
  const host = createAgentStepPayload('create-layout-fanout', 'agentCfeCreateLayout', 'Criar layouts',
    { planId: 'create-layout-fanout' }, [], 'parallel_dynamic', 'in_progress', 'wait_after_prompt');
  assert.equal(host.onFailure, 'wait_after_prompt');
  // E é isso que o step realmente monta.
  const src = readFileSync(path.join(HERE, 'agentCfeCreateLayoutPhase.ts'), 'utf8');
  assert.match(src, /'parallel_dynamic',\s*\n\s*'in_progress',[\s\S]{0,400}'wait_after_prompt',\s*\n\s*\);/);
});

void test('step sequencial NÃO herda política nenhuma: onFailure fica ausente', async () => {
  const { createAgentStepPayload } = await loadCreateShared();
  // O reconcile-phase criado ao lado do fan-out: único e obrigatório, falhar a task é o certo.
  const sequential = createAgentStepPayload('create-reconcile-phase', 'agentCfeReconcileSharedPhase',
    'Preparar reconciliação shared', { planId: 'create-reconcile-phase' }, ['create-layout-phase']);
  assert.ok(!('onFailure' in sequential), 'um step sequencial não pode ganhar política de falha por default');
  assert.equal(sequential.onFailure, undefined);
  // O default do parâmetro não pode virar um valor: ausente é ausente.
  const noPolicy = createAgentStepPayload('x', 'a', 't', {}, [], 'parallel_dynamic', 'in_progress');
  assert.ok(!('onFailure' in noPolicy));
});
