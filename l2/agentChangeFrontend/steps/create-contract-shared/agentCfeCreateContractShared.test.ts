/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-contract-shared/agentCfeCreateContractShared.test.ts" enhancement="_blank"/>

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = 102049;
const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

function stubRuntime(): void {
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'pt-BR' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  if (!g.mls) g.mls = { actualProject: PROJECT, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
}

void test('agentCfeCreateContractShared declares the contract/shared step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateContractShared.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCfeCreateContractShared/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCfeCreateContractShared"/);
});

void test('a create-contract-shared item failure is a degradation, not a silent completed', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateContractShared.ts'), 'utf8');
  assert.match(src, /recordCfeDegradation\(/);
  assert.match(src, /'create-contract-shared-failed'/);
  assert.match(src, /CREATE-CONTRACT-SHARED-FAILED/);
  assert.match(src, /createUpdateStatusIntent\(context, parentStep, step, hookSequential, 'completed', `CREATE-CONTRACT-SHARED-FAILED:/);
  assert.doesNotMatch(src, /createUpdateStatusIntent\([^;]*'failed'/);
});

void test('a missing moduleName records create-contract-shared-failed and keeps the slot completed', async () => {
  stubRuntime();
  const { createAgent } = await import('/_102020_/l2/agentChangeFrontend/steps/create-contract-shared/agentCfeCreateContractShared.js');
  const { takeCfeDegradations } = await import('/_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.js');
  const agent = createAgent();
  const args = JSON.stringify({ pageId: 'landing', runId: 'r1' });
  const intents = await agent.beforePromptStep!(
    { agentName: 'agentCfeCreateContractShared' } as any,
    { message: { orderAt: '1', threadId: 't' }, task: { PK: 'pk' } } as any,
    { stepId: 'parent' } as any,
    { stepId: 'child', prompt: args } as any,
    0,
    args,
  );
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'update-status');
  assert.equal((intents[0] as { status: string }).status, 'completed');
  assert.match((intents[0] as { traceMsg: string }).traceMsg, /CREATE-CONTRACT-SHARED-FAILED/);
  const degradations = await takeCfeDegradations('');
  assert.ok(degradations.some(item => item.kind === 'create-contract-shared-failed'), JSON.stringify(degradations));
});
