/// <mls fileReference="_102020_/l2/agentDefsL2/steps/bff55/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildD2BffDesign } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { beforePromptStep, type D2BffDispatchPort } from '/_102020_/l2/agentDefsL2/steps/bff55/agentD2Bff.js';
import { bffSchemaFor, buildD2BffPrompt, type D2BffContext } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';

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

/** The subset of JSON Schema this tool uses: object, array, string, boolean, null, anyOf. */
function schemaMiss(schema: Record<string, unknown>, value: unknown, path: string): string | undefined {
  const branches = schema.anyOf;
  if (Array.isArray(branches)) {
    const misses = branches.map(branch => schemaMiss(branch as Record<string, unknown>, value, path));
    return misses.some(item => !item) ? undefined : misses.filter(Boolean).join(' | ');
  }
  if (schema.type === 'null') return value === null ? undefined : `${path} is not null`;
  if (schema.type === 'boolean') return typeof value === 'boolean' ? undefined : `${path} is not boolean`;
  if (schema.type === 'string') {
    if (typeof value !== 'string') return `${path} is not string`;
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return `${path} is not in the enum`;
    if (typeof schema.pattern === 'string' && !(new RegExp(schema.pattern, 'u')).test(value)) return `${path} misses the pattern`;
    return undefined;
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return `${path} is not a list`;
    const items = schema.items as Record<string, unknown> | undefined;
    if (!items) return undefined;
    for (let index = 0; index < value.length; index += 1) {
      const miss = schemaMiss(items, value[index], `${path}.${index}`);
      if (miss) return miss;
    }
    return undefined;
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return `${path} is not an object`;
    const row = value as Record<string, unknown>;
    for (const key of (schema.required as string[] | undefined) ?? []) if (!(key in row)) return `${path}.${key} is required`;
    const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(row)) if (!(key in properties)) return `${path}.${key} is not a property`;
    }
    for (const [key, child] of Object.entries(properties)) {
      if (!(key in row)) continue;
      const miss = schemaMiss(child, row[key], `${path}.${key}`);
      if (miss) return miss;
    }
    return undefined;
  }
  return `${path} has no supported schema`;
}

void test('d2_155: inicio with origin null passes the schema and the parser; a missing origin does not', () => {
  const prompt = readFileSync(new URL('./prompt.md', import.meta.url), 'utf8');
  assert.match(prompt, /A leaf that names another type carries origin: null\. A value leaf never carries null\./u);

  const answer = JSON.parse(readFileSync(new URL('./fixtures/inicioOriginNull.json', import.meta.url), 'utf8')) as {
    types: Array<{ fields: Array<Record<string, unknown>> }>;
    endpoints: Array<{ when: string; writes?: string; input: Array<Record<string, unknown>>; output: Array<Record<string, unknown>>; rules: string[] }>;
    bindings: { organisms: Array<{ organism: string }>; journeys: Array<{ step: string; continuesIn?: string }> };
  };
  const organisms = [...new Set(answer.bindings.organisms.map(row => row.organism))];
  const submits = [...new Set(answer.endpoints.map(row => row.when).filter(when => when !== 'onLoad' && when !== 'interaction'))];
  const steps = [...new Set(answer.bindings.journeys.map(row => row.step))];
  const pages = [...new Set(answer.bindings.journeys.flatMap(row => row.continuesIn ? [row.continuesIn] : []))];
  const organism = { intents: submits.map(id => ({ id, kind: 'submit' })) };
  const inicio = {
    ...context,
    pageId: 'inicio',
    page11: {
      desktop: { ...blank, organisms: Object.fromEntries(organisms.map(id => [id, organism])) },
      mobile: { ...blank, organisms: Object.fromEntries(organisms.map(id => [id, organism])) },
    },
    drafts: { desktop: { organisms: {} }, mobile: { organisms: {} } },
    need: {
      pageId: 'inicio', actors: [], reads: steps.map(step => ({ entity: 'Tarefa', from: [`journey:${step}`] })),
      writes: [...new Set(answer.endpoints.flatMap(row => row.writes ? [row.writes] : []))].map(key => {
        const [entity, transitionRef] = key.split('.');
        return { entity, operation: 'transition', transitionRef };
      }),
    },
    menu: {
      tree: pages.map(id => ({ id, kind: 'page' })), authorities: {},
      meta: { journeys: Object.fromEntries([...new Set(steps.map(step => step.split('/')[0]))].map(id => [id, ['inicio']])) },
    },
  } as unknown as D2BffContext;

  const schema = bffSchemaFor(inicio);
  const leaf = (schema.properties as { types: { items: { properties: { fields: { items: { required: string[]; properties: { origin: { anyOf: unknown[] } } } } } } } }).types.items.properties.fields.items;
  assert.deepEqual(leaf.required, ['name', 'type', 'origin']);
  assert.deepEqual(leaf.properties.origin.anyOf[1], { type: 'null' });
  assert.equal(schemaMiss(schema, answer, 'inicio'), undefined);
  buildD2BffDesign(answer);

  const stripped = structuredClone(answer);
  for (const type of stripped.types) for (const field of type.fields) if (field.origin === null) delete field.origin;
  for (const endpoint of stripped.endpoints) for (const field of [...endpoint.input, ...endpoint.output]) if (field.origin === null) delete field.origin;
  assert.match(schemaMiss(schema, stripped, 'inicio') ?? '', /origin is required/u);
});
