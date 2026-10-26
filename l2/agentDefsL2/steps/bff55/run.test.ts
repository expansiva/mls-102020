/// <mls fileReference="_102020_/l2/agentDefsL2/steps/bff55/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { beforePromptStep, type D2BffDispatchPort } from '/_102020_/l2/agentDefsL2/steps/bff55/agentD2Bff.js';
import { buildD2BffPrompt, type D2BffContext } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';

const blank = { template: { category: 'list', experience: 'consultar' }, intent: 'consultar', sections: [{ id: 's', priority: 1, purpose: 'x'.repeat(4000), organisms: [] }], organisms: {} };
const context = {
  identity: { project: 102020, module: 'mod' }, inputHash: 'h', pageId: 'pageA', userLanguage: 'en',
  page11: { desktop: blank, mobile: blank }, page11Text: { desktop: '', mobile: '' },
  drafts: { desktop: { organisms: {} }, mobile: { organisms: {} } }, draftText: { desktop: '{}', mobile: '{}' },
  need: { pageId: 'pageA', actors: [], reads: [], writes: [] }, menu: { tree: [], authorities: {} },
  entities: {}, grants: [], rules: {}, journeys: [], prompt: 'prompt', approved: null,
} as unknown as D2BffContext;

void test('d2_153: a bff55 repair keeps the full request and the previous piece', () => {
  const previous = { types: [{ name: 'Row', fields: [{ name: 'kept' }, { name: 'broken' }] }], endpoints: [{ id: 'load' }] };
  const first = buildD2BffPrompt(context);
  const repair = buildD2BffPrompt(context, { diagnostic: 'D2_BFF_FORMAT: types.0.fields.1.name: broken leaf', previous });
  assert.equal(repair.systemPrompt, first.systemPrompt);
  assert.ok(repair.humanPrompt.includes('x'.repeat(4000)));
  const body = JSON.parse(repair.humanPrompt) as { repair: { diagnostic: string; previous: unknown } | null };
  assert.equal(body.repair?.diagnostic, 'D2_BFF_FORMAT: types.0.fields.1.name: broken leaf');
  assert.deepEqual(body.repair?.previous, previous);
  assert.equal((JSON.parse(first.humanPrompt) as { repair: unknown }).repair, null);
});

void test('d2_153: bffPages skips pages whose contract stays and still designs a page with no approved design', async () => {
  const designs = new Map<string, unknown>([['a', { types: [], endpoints: [] }], ['b', { types: [], endpoints: [] }]]);
  const port = {
    readInput: async () => ({ selection: { writePageIds: ['b', 'a'] }, snapshotHash: 'h' }),
    reusable: async () => false,
    readApproved: async (_identity: { project: number; module: string }, pageId: string) => designs.get(pageId) ?? null,
    readPipeline: async () => null,
    markApproved: async () => undefined,
    markFailed: async () => undefined,
  } as unknown as D2BffDispatchPort;
  const stepOf = (prompt: string) => ({
    type: 'agent', stepId: 4, interaction: null, stepTitle: 'bff', status: 'waiting_human_input', nextSteps: [],
    agentName: 'agentD2Bff', prompt, rags: [], planning: { planId: 'bff55', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  }) as mls.msg.AIAgentStep;
  const parent = { ...stepOf(''), stepId: 1 } as mls.msg.AIAgentStep;
  const execution = { message: { orderAt: 'm', threadId: 't' }, task: { PK: 'task' }, isTest: true } as mls.msg.ExecutionContext;
  const agent = { agentName: 'agentD2Bff' } as Parameters<typeof beforePromptStep>[0];
  const workersOf = (intents: mls.msg.AgentIntent[]) => intents.filter(item => item.type === 'add-step').map(item => JSON.parse((item as { step: { prompt: string } }).step.prompt).pageId as string);
  const traceOf = (intents: mls.msg.AgentIntent[]) => (intents.find(item => item.type === 'update-status') as { traceMsg: string }).traceMsg;

  const listed = await beforePromptStep(agent, execution, parent, stepOf(JSON.stringify({ project: 102020, module: 'mod', scope: 'all', bffPages: ['b'] })), 1, port);
  assert.deepEqual(workersOf(listed), ['b']);
  assert.match(traceOf(listed), /1 skipped, contract kept/u);

  designs.set('a', null);
  const missing = await beforePromptStep(agent, execution, parent, stepOf(JSON.stringify({ project: 102020, module: 'mod', scope: 'all', bffPages: ['b'] })), 1, port);
  assert.deepEqual(workersOf(missing).sort(), ['a', 'b']);
  assert.match(traceOf(missing), /Ran for missing approved design: a/u);

  const today = await beforePromptStep(agent, execution, parent, stepOf(JSON.stringify({ project: 102020, module: 'mod', scope: 'all' })), 1, port);
  assert.deepEqual(workersOf(today).sort(), ['a', 'b']);
  assert.match(traceOf(today), /^Dispatched 2 BFF worker\(s\); 0 reused\.$/u);
});
