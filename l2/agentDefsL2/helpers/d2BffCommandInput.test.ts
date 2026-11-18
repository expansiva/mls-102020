/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2BffCommandInput.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { checkD2Bff, normalizeD2BffDesign, type D2BffCheckContext, type D2BffDesign, type D2BffLeaf } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { resolveD2OperationBindings } from '/_102020_/l2/helpers/defsInput/operationSemantics.js';
import type { D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';

const jsdoc = { purpose: 'p', input: 'i', processing: 'c', output: 'o' };
const organism = (id: string, kind: 'submit' | 'navigate' = 'submit'): D2Page11Definition['organisms'][string] => ({ kind: 'form', text: id, intents: [{ id, kind }] });

function page(organisms: D2Page11Definition['organisms']): D2Page11Definition {
  return { template: { category: 'c', experience: 'e' }, intent: 'i', sections: [], organisms, molecules: {} };
}

function needs(organisms: D2Page11Needs['organisms']): D2Page11Needs {
  return { organisms };
}

function leaf(path: string): D2BffLeaf {
  return { name: path.split('.').pop() ?? path, type: 'string', origin: { kind: 'field', paths: [path] } };
}

function design(commands: Array<{ id: string; when: string; writes: string; input: string[] }>): D2BffDesign {
  return {
    types: [],
    endpoints: [
      { id: 'listar', kind: 'qry', when: 'onLoad', input: [], output: [], rules: [], jsdoc },
      ...commands.map(command => ({ id: command.id, kind: 'cmd' as const, when: command.when, writes: command.writes, input: command.input.map(leaf), output: [], rules: [], jsdoc })),
    ],
    bindings: {
      organisms: [],
      commands: commands.map(command => ({ endpoint: command.id, refreshes: ['listar'] })),
      selections: [],
      journeys: [],
      updates: [],
    },
  };
}

function issues(context: D2BffCheckContext, built: D2BffDesign): string[] {
  return checkD2Bff(built, context).filter(item => item.code === 'D2_BFF_COMMAND_INPUT').map(item => item.message);
}

const entities = { Recebimento: {} as Ns5OntologyAnyEntity };
const base = { menu: { tree: [], authorities: {} }, entities, grants: [], rules: {} };

test('create asks only for the edits of the organisms that submit it, on both devices', () => {
  const context: D2BffCheckContext = {
    ...base,
    page11: {
      desktop: page({ registroRecebimento: organism('registroRecebimento'), estornoRecebimento: organism('estornoRecebimento') }),
      mobile: page({ registroRecebimento: organism('registroRecebimento') }),
    },
    drafts: {
      desktop: needs({
        registroRecebimento: { reads: [], edits: ['Recebimento.tituloId', 'Recebimento.formaPagamento'], selects: '', submits: [{ intentId: 'registroRecebimento', write: 'Recebimento.create' }] },
        estornoRecebimento: { reads: [], edits: ['Recebimento.details.estorno.motivo'], selects: '', submits: [{ intentId: 'estornoRecebimento', write: 'Recebimento.update' }] },
      }),
      mobile: needs({
        registroRecebimento: { reads: [], edits: ['Recebimento.details.valor', 'Recebimento.details.observacao'], selects: '', submits: [{ intentId: 'registroRecebimento', write: 'Recebimento.create' }] },
      }),
    },
    need: { pageId: 'caixa', actors: [], reads: [], writes: [{ entity: 'Recebimento', operation: 'create' }, { entity: 'Recebimento', operation: 'update' }] },
  };
  const found = issues(context, design([
    { id: 'criar', when: 'registroRecebimento', writes: 'Recebimento.create', input: ['Recebimento.tituloId', 'Recebimento.formaPagamento', 'Recebimento.details.valor', 'Recebimento.details.observacao'] },
    { id: 'estornar', when: 'estornoRecebimento', writes: 'Recebimento.update', input: ['Recebimento.details.estorno.motivo', 'Recebimento.id', 'Recebimento.version'] },
  ]));
  assert.deepEqual(found, []);
});

test('a submit whose organisms edit nothing of the write entity still asks for the page edits', () => {
  const context: D2BffCheckContext = {
    ...base,
    page11: {
      desktop: page({ confirmar: organism('confirmar'), valores: organism('valores', 'navigate') }),
      mobile: page({}),
    },
    drafts: {
      desktop: needs({
        confirmar: { reads: [], edits: ['Outra.campo'], selects: '', submits: [{ intentId: 'confirmar', write: 'Recebimento.create' }] },
        valores: { reads: [], edits: ['Recebimento.details.valor'], selects: '', submits: [] },
      }),
      mobile: needs({}),
    },
    need: { pageId: 'caixa', actors: [], reads: [], writes: [{ entity: 'Recebimento', operation: 'create' }] },
  };
  const found = issues(context, design([
    { id: 'criar', when: 'confirmar', writes: 'Recebimento.create', input: [] },
  ]));
  assert.equal(found.length, 1);
  assert.match(found[0], /Recebimento\.details\.valor/);
});

const relatedEntities = {
  A: { relationships: { b: { to: 'B', via: 'A.bId', required: true } } } as Ns5OntologyAnyEntity,
  B: {} as Ns5OntologyAnyEntity,
};

function createOfA(input: string[]): { context: D2BffCheckContext; built: D2BffDesign } {
  const context: D2BffCheckContext = {
    ...base,
    entities: relatedEntities,
    page11: { desktop: page({ criarA: organism('criarA') }), mobile: page({}) },
    drafts: {
      desktop: needs({
        criarA: { reads: [], edits: ['B.details.email'], selects: '', submits: [{ intentId: 'criarA', write: 'A.create' }] },
      }),
      mobile: needs({}),
    },
    need: { pageId: 'pagina', actors: [], reads: [], writes: [{ entity: 'A', operation: 'create' }] },
  };
  return { context, built: design([{ id: 'criar', when: 'criarA', writes: 'A.create', input }]) };
}

test('create covers a required foreign key when the command carries a field of the related entity', () => {
  const { context, built } = createOfA(['B.details.email']);
  assert.deepEqual(issues(context, built), []);
});

test('create still asks for the required foreign key when the command carries nothing of the related entity', () => {
  const { context, built } = createOfA([]);
  const found = issues(context, built);
  assert.equal(found.length, 1);
  assert.match(found[0], /A\.bId/);
});

const catalogSource = '/_102034_/l4/ontology/connections/cm.defs.ts';
const catalogText = `
export interface CmUpdateAgentInput { agentId: string; name?: string; }
export interface CmDiscardAgentDraftInput { draftId: string; }
export const cm = { "operations": [
  { "operationId": "updateAgent", "direction": "call", "inputType": "CmUpdateAgentInput", "expectsVersion": true },
  { "operationId": "discardAgentDraft", "direction": "call", "inputType": "CmDiscardAgentDraftInput" }
] };
`;
const externalEntities = {
  Agent: { kind: 'external', source: catalogSource, record: { fields: { name: { type: 'string' } } } } as Ns5OntologyAnyEntity,
  AgentDraft: { kind: 'external', source: catalogSource, record: { fields: {} } } as Ns5OntologyAnyEntity,
};
const externalSources = {
  connections: [
    { connectionId: 'cm', operationId: 'updateAgent', direction: 'call', usedBy: ['changeAgentBehavior.requestChange'], effect: 'update' },
    { connectionId: 'cm', operationId: 'discardAgentDraft', direction: 'call', usedBy: ['reviewAgentDraft.discardDraft'], effect: 'update' },
  ],
  journeys: {
    changeAgentBehavior: { business: { steps: [{ stepId: 'requestChange', kind: 'act', entity: 'Agent', effect: 'update' }] } },
    reviewAgentDraft: { business: { steps: [{ stepId: 'discardDraft', kind: 'act', entity: 'AgentDraft', effect: 'transition', transitionRef: 'discardDraft' }] } },
  },
  catalogs: { [catalogSource]: catalogText },
};

function contextLeaf(name: string): D2BffLeaf {
  return { name, type: 'string', origin: { kind: 'context', paths: [] } };
}

function externalDesign(commands: Array<{ id: string; when: string; writes: string; input: string[] }>): D2BffDesign {
  const built = design(commands.map(command => ({ ...command, input: [] })));
  for (const command of commands) {
    const endpoint = built.endpoints.find(item => item.id === command.id);
    if (endpoint) endpoint.input = command.input.map(contextLeaf);
  }
  return built;
}

function externalContext(writes: D2BffCheckContext['need']['writes'], submits: Record<string, { write: string }>): D2BffCheckContext {
  return {
    ...base,
    entities: externalEntities,
    external: externalSources,
    page11: { desktop: page(Object.fromEntries(Object.keys(submits).map(id => [id, organism(id)]))), mobile: page({}) },
    drafts: {
      desktop: needs(Object.fromEntries(Object.entries(submits).map(([id, row]) => [id, { reads: [], edits: [], selects: '', submits: [{ intentId: id, write: row.write }] }]))),
      mobile: needs({}),
    },
    need: { pageId: 'review', actors: [], reads: [], writes },
  };
}

test('an external update asks for the call input and expectVersion, and a transition without the mark does not', () => {
  const context = externalContext(
    [{ entity: 'Agent', operation: 'update' }, { entity: 'AgentDraft', operation: 'transition', transitionRef: 'discardDraft' }],
    { requestChange: { write: 'Agent.update' }, discardDraft: { write: 'AgentDraft.discardDraft' } },
  );
  const built = externalDesign([
    { id: 'mudar', when: 'requestChange', writes: 'Agent.update', input: ['agentId', 'expectVersion'] },
    { id: 'descartar', when: 'discardDraft', writes: 'AgentDraft.discardDraft', input: ['draftId'] },
  ]);
  assert.deepEqual(issues(context, built), []);
  assert.equal(checkD2Bff(built, context).some(item => item.code === 'D2_BFF_ORIGIN_UNKNOWN'), false);
});

test('an external write with no call line is D2_EXTERNAL_CALL_UNRESOLVED', () => {
  const context = externalContext(
    [{ entity: 'Agent', operation: 'update' }],
    { requestChange: { write: 'Agent.update' } },
  );
  context.external = { ...externalSources, connections: externalSources.connections.filter(row => row.operationId !== 'updateAgent') };
  const built = externalDesign([{ id: 'mudar', when: 'requestChange', writes: 'Agent.update', input: ['name'] }]);
  const found = checkD2Bff(built, context).filter(item => item.code === 'D2_EXTERNAL_CALL_UNRESOLVED');
  assert.equal(found.length, 1);
  assert.match(found[0].message, /call line/);
  assert.match(found[0].message, /usedBy/);
  assert.equal(checkD2Bff(built, context).some(item => item.code === 'D2_BFF_ORIGIN_UNKNOWN'), false);
});

test('an external command missing a call input is D2_BFF_COMMAND_INPUT and does not invent Entity.id', () => {
  const context = externalContext(
    [{ entity: 'Agent', operation: 'update' }],
    { requestChange: { write: 'Agent.update' } },
  );
  const built = externalDesign([{ id: 'mudar', when: 'requestChange', writes: 'Agent.update', input: ['expectVersion'] }]);
  const found = issues(context, built);
  assert.equal(found.length, 1);
  assert.match(found[0], /agentId/);
  assert.doesNotMatch(found[0], /Agent\.id|Agent\.version|D2_BFF_ORIGIN_UNKNOWN/);
});

test('an external command keeps the call names of field leaves; an entity command still takes the field key', () => {
  const record = { fields: { agent: { type: 'string' }, changeRequest: { type: 'string' }, changes: { type: 'object', fields: { changeRef: { type: 'string' } } } } };
  const behavior = {
    kind: 'external' as const, source: catalogSource, record,
  } as Ns5OntologyAnyEntity;
  const fieldLeaf = (name: string, path: string, optional = false): D2BffLeaf => ({
    name, type: 'string', ...(optional ? { optional: true } : {}), origin: { kind: 'field', paths: [path] },
  });
  const raw = design([{ id: 'sendBehaviorChange', when: 'requestChange', writes: 'AgentBehavior.update', input: [] }]);
  const endpoint = raw.endpoints.find(item => item.id === 'sendBehaviorChange');
  if (!endpoint) throw new Error('missing command');
  endpoint.input = [
    fieldLeaf('agentId', 'AgentBehavior.agent'),
    { name: 'expectVersion', type: 'number', origin: { kind: 'context', paths: [] } },
    fieldLeaf('undoChangeRef', 'AgentBehavior.changes.changeRef', true),
  ];
  const context = externalContext(
    [{ entity: 'AgentBehavior', operation: 'update' }],
    { requestChange: { write: 'AgentBehavior.update' } },
  );
  context.entities = { ...externalEntities, AgentBehavior: behavior };
  context.external = {
    ...externalSources,
    connections: [...externalSources.connections, { connectionId: 'cm', operationId: 'updateAgent', direction: 'call', usedBy: ['changeAgentBehavior.requestChange'], effect: 'update' }],
    journeys: {
      ...externalSources.journeys,
      changeAgentBehavior: { business: { steps: [{ stepId: 'requestChange', kind: 'act', entity: 'AgentBehavior', effect: 'update' }] } },
    },
  };
  const kept = normalizeD2BffDesign(raw, context.entities);
  assert.deepEqual(kept.endpoints.find(item => item.id === 'sendBehaviorChange')?.input.map(item => item.name), ['agentId', 'expectVersion', 'undoChangeRef']);
  assert.deepEqual(issues(context, kept), []);

  endpoint.input = endpoint.input.filter(item => item.name !== 'agentId');
  const missing = normalizeD2BffDesign(raw, context.entities);
  const found = issues(context, missing);
  assert.equal(found.length, 1);
  assert.match(found[0], /agentId/);

  const stored = { ...behavior, kind: 'entity' } as Ns5OntologyAnyEntity;
  endpoint.input = [
    fieldLeaf('agentId', 'AgentBehavior.agent'),
    { name: 'expectVersion', type: 'number', origin: { kind: 'context', paths: [] } },
    fieldLeaf('undoChangeRef', 'AgentBehavior.changes.changeRef', true),
  ];
  const renamed = normalizeD2BffDesign(raw, { AgentBehavior: stored });
  assert.deepEqual(renamed.endpoints.find(item => item.id === 'sendBehaviorChange')?.input.map(item => item.name), ['agent', 'expectVersion', 'changes.changeRef']);
});

test('operation semantics reads the external call instead of entity transitions', () => {
  const bindings = resolveD2OperationBindings({
    module: 'agents',
    entities: { AgentDraft: externalEntities.AgentDraft },
    access: { grants: [] },
    rules: { rules: {} },
    digests: [
      { path: 'l4/agents/ontology/AgentDraft.defs.ts', sha256: 'a', bytes: 1, schemaVersion: '' },
      { path: 'l4/agents/access.defs.ts', sha256: 'b', bytes: 1, schemaVersion: '' },
      { path: 'l4/agents/rules.defs.ts', sha256: 'c', bytes: 1, schemaVersion: '' },
    ],
    external: externalSources,
  }, 'review', [{ route: '/descartar', usecaseRef: 'discardDraft' }], [{ usecaseId: 'discardDraft', entity: 'AgentDraft', operation: 'transition' }], ['companyAdmin']);
  assert.deepEqual(bindings[0]?.inputFields.map(field => field.path), ['draftId']);
});
