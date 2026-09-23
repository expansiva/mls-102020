/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared-page/agentD2SharedPage.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { afterPromptStep, buildD2SharedHumanPrompt, unwrapD2SharedToolPayload } from '/_102020_/l2/agentDefsL2/steps/shared-page/agentD2SharedPage.js';

void test('deterministic host schedules the sole repair for a truncated payload', async () => {
  (globalThis as unknown as { mls: unknown }).mls = { actualProject: 102047 };
  const context = { message: { orderAt: 'm1', threadId: 't1' }, task: { PK: 'task' } } as unknown as mls.msg.ExecutionContext;
  const parent = { stepId: 10 } as mls.msg.AIAgentStep;
  const first = step(11, 1);
  const repair = await afterPromptStep({} as never, context, parent, first, 1);
  assert.equal(repair.filter(intent => intent.type === 'add-step').length, 1);
  const added = repair.find(intent => intent.type === 'add-step') as mls.msg.AgentIntentAddStep;
  assert.equal((added.step as mls.msg.AIAgentStep).planning?.planId, 'shared40-repair-page-a2');
  const source = readFileSync(fileURLToPath(new URL('./agentD2SharedPage.ts', import.meta.url)), 'utf8');
  assert.match(source, /parsed\.attempt < 2/);
  assert.doesNotMatch(source, /parsed\.attempt < 3/);
});

void test('initial hook args without feedback stay byte-identical in prompt_ready', () => {
  const raw = '{"project":102047,"module":"fixture","pageId":"page","attempt":1}';
  const normalized = JSON.stringify({ ...JSON.parse(raw), feedback: '' });
  assert.notEqual(normalized, raw, 'the normalization that caused the live hook miss must remain observable');
  const source = readFileSync(fileURLToPath(new URL('./agentD2SharedPage.ts', import.meta.url)), 'utf8');
  assert.match(source, /const rawArgs = args \|\| step\.prompt \|\| '';/);
  assert.match(source, /const parsed = parseArgs\(rawArgs\);/);
  assert.match(source, /type: 'prompt_ready', args: rawArgs,/);
  assert.doesNotMatch(source, /type: 'prompt_ready', args: JSON\.stringify\(parsed\),/);
});

void test('observed flexible tool envelope yields arguments and rejects another tool', () => {
  const args = { schemaVersion: 'v', pageId: 'page' };
  assert.deepEqual(unwrapD2SharedToolPayload({ type: 'flexible', result: { toolName: 'submitD2Shared', arguments: args } }), args);
  assert.deepEqual(unwrapD2SharedToolPayload({ arguments: args }), args, 'direct tool-call format remains accepted');
  assert.deepEqual(unwrapD2SharedToolPayload(args), args, 'direct judgment format remains accepted');
  assert.throws(() => unwrapD2SharedToolPayload({ type: 'flexible', result: { toolName: 'submitD2Pages', arguments: args } }), /D2_SHARED_TOOL_MISMATCH/);
});

void test('repair prompt replaces natural labels, scenary values and actionIds with exact stateKey allowlists', () => {
  const page = { pageId: 'profissionais', label: 'Profissionais', ancestors: [], journeyRefs: [] } as unknown as D2SelectedPage;
  const field = (entity: string) => ({ path: `${entity}.id`, name: 'id', scalar: 'string', tsType: 'string', required: true, derived: true, indexed: true, collection: false, enumValues: [], referenceTo: [], children: [] });
  const contract = { pageId: page.pageId, calls: [
    { callName: 'localizarPaciente', callPascal: 'LocalizarPaciente', operation: 'get', input: [field('Paciente')] },
    { callName: 'localizarProfissional', callPascal: 'LocalizarProfissional', operation: 'get', input: [field('Profissional')] },
  ] } as unknown as D2PageContract;
  const previous = { scenaries: [
    { value: 'paciente', actionId: 'localizarPaciente', preconditions: ['Paciente selecionado'] },
    { value: 'profissional', actionId: 'localizarProfissional', preconditions: ['localizarProfissional'] },
    { value: 'base', actionId: 'localizarPaciente', preconditions: ['base'] },
  ] };
  const prompt = JSON.parse(buildD2SharedHumanPrompt(page, [], contract, {
    feedback: 'D2_SHARED_PRECONDITION_UNKNOWN: localizarProfissional',
    previous,
  })) as Record<string, unknown>;
  assert.deepEqual(prompt.preconditionStateKeysByAction, {
    localizarPaciente: ['ui.profissionais.localizarPaciente.input.id'],
    localizarProfissional: ['ui.profissionais.localizarProfissional.input.id'],
  });
  assert.deepEqual((prompt.repair as { previous: unknown }).previous, previous);
  assert.match(String(prompt.preconditionRule), /only copy exact stateKey strings/);
  assert.match(String(prompt.preconditionRule), /Never use labels, scenary values, or actionIds/);

  const systemPrompt = readFileSync(fileURLToPath(new URL('../shared40/prompt.md', import.meta.url)), 'utf8');
  assert.match(systemPrompt, /preconditionStateKeysByAction\[actionId\]/);
  assert.match(systemPrompt, /Never put a human label, scenary value .* or `actionId`/);
  const schema = JSON.parse(readFileSync(fileURLToPath(new URL('../../schemas/sharedJudgmentV1.json', import.meta.url)), 'utf8')) as any;
  assert.equal(schema.properties.scenaries.items.properties.preconditions.items.pattern, '^ui\\.');
  assert.match(schema.properties.scenaries.items.properties.preconditions.description, /exact stateKey strings/);
});
function step(stepId: number, attempt: number): mls.msg.AIAgentStep { return { type: 'agent', stepId, status: 'waiting_human_input', interaction: { payload: ['{"schemaVersion":'] } as never, nextSteps: [], stepTitle: 'shared', agentName: 'agentD2SharedPage', prompt: JSON.stringify({ project: 102047, module: 'fixture', pageId: 'page', attempt }), rags: [], planning: { planId: 'x', dependsOn: [], executionMode: 'sequential', executionHost: 'client' } }; }
