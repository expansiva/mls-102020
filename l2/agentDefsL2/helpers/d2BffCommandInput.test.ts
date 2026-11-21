/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2BffCommandInput.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { addD2RecordVersion, buildD2BffDesign, checkD2Bff, cleanVersionDenials, normalizeD2BffDesign, type D2BffCheckContext, type D2BffDesign, type D2BffLeaf } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { loadD2BffContext } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
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

const catalogText = `
export interface CmUpdateAgentInput { agentId: string; name?: string; }
export interface CmDiscardAgentDraftInput { draftId: string; }
export const cm = { "operations": [
  { "operationId": "updateAgent", "direction": "call", "inputType": "CmUpdateAgentInput", "expectsVersion": true },
  { "operationId": "discardAgentDraft", "direction": "call", "inputType": "CmDiscardAgentDraftInput" }
] };
`;
const externalEntities = {
  Agent: { kind: 'external', connectionId: 'cm', record: { fields: { name: { type: 'string' } } } } as Ns5OntologyAnyEntity,
  AgentDraft: { kind: 'external', connectionId: 'cm', record: { fields: {} } } as Ns5OntologyAnyEntity,
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
  catalogs: { cm: catalogText },
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
  assert.match(found[0], /the connection operation updateAgent asks for agentId: add an input leaf named agentId/);
  assert.doesNotMatch(found[0], /Agent\.id|Agent\.version|D2_BFF_ORIGIN_UNKNOWN|Entity\.path/);
});

test('an external command keeps the call names of field leaves; an entity command still takes the field key', () => {
  const record = { fields: { agent: { type: 'string' }, changeRequest: { type: 'string' }, changes: { type: 'object', fields: { changeRef: { type: 'string' } } } } };
  const behavior = {
    kind: 'external' as const, connectionId: 'cm', record,
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

test('normalize adds expectVersion only when the connection call asks for a version', () => {
  const context = externalContext(
    [{ entity: 'Agent', operation: 'update' }, { entity: 'AgentDraft', operation: 'transition', transitionRef: 'discardDraft' }],
    { requestChange: { write: 'Agent.update' }, discardDraft: { write: 'AgentDraft.discardDraft' } },
  );
  const raw = externalDesign([
    { id: 'mudar', when: 'requestChange', writes: 'Agent.update', input: ['agentId'] },
    { id: 'descartar', when: 'discardDraft', writes: 'AgentDraft.discardDraft', input: ['draftId'] },
  ]);
  const facts = { writes: context.need.writes, external: context.external };
  const gained = normalizeD2BffDesign(raw, context.entities, '', facts);
  const version = gained.endpoints.find(item => item.id === 'mudar')?.input.find(item => item.name === 'expectVersion');
  assert.deepEqual(version, { name: 'expectVersion', type: 'number', origin: { kind: 'context', paths: [] } });
  assert.equal(gained.endpoints.find(item => item.id === 'descartar')?.input.some(item => item.name === 'expectVersion'), false);
  assert.deepEqual(issues(context, gained), []);
  const stored = normalizeD2BffDesign(design([{ id: 'estornar', when: 'estorno', writes: 'Recebimento.update', input: ['Recebimento.id'] }]), entities, '', facts);
  const plain = normalizeD2BffDesign(design([{ id: 'estornar', when: 'estorno', writes: 'Recebimento.update', input: ['Recebimento.id'] }]), entities);
  assert.deepEqual(stored, plain);
  assert.equal(stored.endpoints.some(item => item.input.some(leaf => leaf.name === 'expectVersion')), false);
});

/** Reads the frozen tree in `fixtures/d2_207/tree`. A missing file is null. The live project tree is not consulted. */
function readProjectFile(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string | null {
  const disk = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures/d2_207/tree',
    `mls-${info.project}`,
    `l${info.level}`,
    info.folder,
    `${info.shortName}${info.extension}`,
  );
  return existsSync(disk) ? readFileSync(disk, 'utf8') : null;
}

/** The bff context is read through `mls.stor`. Point that at the project files for this test only. */
function withProjectFiles(run: () => Promise<void>): Promise<void> {
  const stor = mls.stor as { files: typeof mls.stor.files; getKeyToFile?: typeof mls.stor.getKeyToFile };
  const previous = { files: stor.files, getKey: stor.getKeyToFile };
  const cache: Record<string, unknown> = {};
  stor.getKeyToFile = ((info: { project: number; level: number; folder: string; shortName: string; extension: string }) => {
    const key = [info.project, info.level, info.folder, info.shortName, info.extension].join('|');
    const content = readProjectFile(info);
    if (content !== null && !cache[key]) {
      cache[key] = { ...info, status: 'unchanged', getValueInfo: async () => ({ content }), getContent: async () => content };
    }
    return key;
  }) as typeof mls.stor.getKeyToFile;
  stor.files = cache as typeof mls.stor.files;
  return run().finally(() => { stor.files = previous.files; stor.getKeyToFile = previous.getKey; });
}

test('the two saved external answers pass the gate once expectVersion is added', async () => {
  await withProjectFiles(async () => {
  for (const pageId of ['agent_behavior', 'my_conduct'] as const) {
    const commandId = pageId === 'agent_behavior' ? 'requestBehaviorChange' : 'sendConductChange';
    const envelope = JSON.parse(readFileSync(new URL(`./fixtures/d2_207/${pageId}-2.json`, import.meta.url), 'utf8')) as { raw: { result: { arguments: unknown } } };
    const context = await loadD2BffContext({ project: 102047, module: 'agents' }, pageId);
    const design = normalizeD2BffDesign(buildD2BffDesign(envelope.raw.result.arguments), context.entities, '', { writes: context.need.writes, external: context.external });
    const command = design.endpoints.find(item => item.id === commandId);
    const leaf = command?.input.find(item => item.name === 'expectVersion');
    assert.deepEqual(leaf, { name: 'expectVersion', type: 'string', origin: { kind: 'context', paths: [] } });
    const input = command?.jsdoc.input ?? '';
    if (pageId === 'agent_behavior') {
      assert.equal(input, 'agentId: the cm id of the agent; changeRequest: what the admin wrote in the box; undoChangeRef: the cm reference of the change to undo. Exactly one of changeRequest or undoChangeRef is given. expectVersion: the version of the record, asked by updateAgent.');
    } else {
      assert.equal(input, 'agentId: the agent whose conduct changes. changeRequest: what the person wrote should change. The conduct is identified by the agent and the signed-in person. expectVersion: the version of the record, asked by updateAgent.');
    }
    assert.equal(command?.jsdoc.output, JSON.parse(readFileSync(new URL(`./fixtures/d2_207/${pageId}-2.json`, import.meta.url), 'utf8')).raw.result.arguments.endpoints.find((item: { id: string }) => item.id === commandId).jsdoc.output);
    assert.deepEqual(checkD2Bff(design, context).map(item => `${item.code}: ${item.message}`), []);
  }
  });
});

test('cleanVersionDenials drops only a denied version, and only on the route that gained the leaf', () => {
  const seen = 'the version the admin saw stays';
  assert.equal(
    cleanVersionDenials(`Before. AgentBehavior declares no version, so none is asked. ${seen}.`, 'updateAgent'),
    `Before. ${seen}. expectVersion: the version of the record, asked by updateAgent.`,
  );
  assert.equal(cleanVersionDenials('Already names expectVersion. AgentBehavior declares no version.', 'updateAgent'), 'Already names expectVersion. AgentBehavior declares no version.');

  const context = externalContext(
    [{ entity: 'Agent', operation: 'update' }, { entity: 'AgentDraft', operation: 'transition', transitionRef: 'discardDraft' }],
    { requestChange: { write: 'Agent.update' }, discardDraft: { write: 'AgentDraft.discardDraft' } },
  );
  const raw = externalDesign([
    { id: 'mudar', when: 'requestChange', writes: 'Agent.update', input: ['agentId'] },
    { id: 'descartar', when: 'discardDraft', writes: 'AgentDraft.discardDraft', input: ['draftId'] },
  ]);
  const mudar = raw.endpoints.find(item => item.id === 'mudar');
  const descartar = raw.endpoints.find(item => item.id === 'descartar');
  if (!mudar || !descartar) throw new Error('missing command');
  mudar.jsdoc = { ...mudar.jsdoc, input: `Notes. ${seen}. Agent declares no version, so none is asked.` };
  const already = 'The call already lists expectVersion. No version leaf is missing.';
  const keptDoc = { ...descartar.jsdoc, input: already };
  descartar.jsdoc = keptDoc;
  const facts = { writes: context.need.writes, external: context.external };
  const gained = normalizeD2BffDesign(raw, context.entities, '', facts);
  assert.equal(gained.endpoints.find(item => item.id === 'mudar')?.jsdoc.input, `Notes. ${seen}. expectVersion: the version of the record, asked by updateAgent.`);
  assert.equal(gained.endpoints.find(item => item.id === 'descartar')?.jsdoc.input, already);
  assert.equal(gained.endpoints.find(item => item.id === 'descartar')?.jsdoc.purpose, 'p');

  const cited = externalDesign([{ id: 'mudar', when: 'requestChange', writes: 'Agent.update', input: ['agentId'] }]);
  const citedCommand = cited.endpoints.find(item => item.id === 'mudar');
  if (!citedCommand) throw new Error('missing command');
  citedCommand.jsdoc = { ...citedCommand.jsdoc, input: 'The box sends expectVersion. Agent declares no version.' };
  const citedOut = normalizeD2BffDesign(cited, context.entities, '', facts);
  assert.equal(citedOut.endpoints.find(item => item.id === 'mudar')?.jsdoc.input, 'The box sends expectVersion. Agent declares no version.');
  assert.equal(citedOut.endpoints.find(item => item.id === 'mudar')?.input.some(item => item.name === 'expectVersion'), true);

  const stored = design([{ id: 'estornar', when: 'estorno', writes: 'Recebimento.update', input: ['Recebimento.id'] }]);
  const moduleCommand = stored.endpoints.find(item => item.id === 'estornar');
  if (!moduleCommand) throw new Error('missing command');
  moduleCommand.jsdoc = { ...moduleCommand.jsdoc, input: 'Recebimento declares no version, so none is asked.' };
  const moduleOut = normalizeD2BffDesign(stored, entities, '', facts);
  assert.equal(moduleOut.endpoints.find(item => item.id === 'estornar')?.jsdoc.input, 'Recebimento declares no version, so none is asked.');
});

const versionLeaf = { name: 'version', type: 'number', origin: { kind: 'context' as const, paths: [] } };
const stringVersionLeaf = { name: 'version', type: 'string', origin: { kind: 'context' as const, paths: [] } };
const versionNote = ' version: the version of the record read, sent back as expectVersion.';

function viewType(name: string, fields: D2BffLeaf[], description = name): D2BffDesign['types'][number] {
  return { name, description, fields };
}

/** A command view, a query that returns it, and a list the query returns. Bindings stay empty. */
function versionDesign(commandOutput: D2BffLeaf[], queryOutput: D2BffLeaf[], writes = 'Agent.update', when = 'requestChange'): D2BffDesign {
  const built = externalDesign([{ id: 'mudar', when, writes, input: ['agentId'] }]);
  const query = built.endpoints.find(item => item.id === 'listar');
  const command = built.endpoints.find(item => item.id === 'mudar');
  if (!query || !command) throw new Error('missing endpoint');
  query.output = queryOutput;
  command.output = commandOutput;
  const names = new Set([...commandOutput, ...queryOutput].flatMap(leaf => {
    const base = leaf.type.replace(/\[\]$/, '');
    return base === leaf.type || leaf.type.endsWith('[]') ? [base] : [];
  }));
  built.types = [...names].map(name => viewType(name, name === 'Already'
    ? [versionLeaf]
    : [{ name: 'label', type: 'string', origin: { kind: 'context', paths: [] } }]));
  return built;
}

test('the saved agent_behavior view gains version when the write returns it', async () => {
  await withProjectFiles(async () => {
    const envelope = JSON.parse(readFileSync(new URL('./fixtures/d2_207/agent_behavior-2.json', import.meta.url), 'utf8')) as { raw: { result: { arguments: unknown } } };
    const context = await loadD2BffContext({ project: 102047, module: 'agents' }, 'agent_behavior');
    const design = normalizeD2BffDesign(buildD2BffDesign(envelope.raw.result.arguments), context.entities, '', { writes: context.need.writes, external: context.external });
    const view = design.types.find(item => item.name === 'AgentBehaviorDetail');
    assert.deepEqual(view?.fields.at(-1), stringVersionLeaf);
    assert.equal(view?.fields.filter(item => item.name === 'version').length, 1);
    assert.equal(view?.description.endsWith(versionNote), true);
    assert.equal(design.types.find(item => item.name === 'BehaviorChange')?.fields.some(item => item.name === 'version'), false);
  });
});

test('a type the page read does not return stays without version', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  const catalog = `
export interface CmUpdateAgentInput { agentId: string; }
export interface CmUpdateAgentOutput { version: string; }
export const cm = { "operations": [ { "operationId": "updateAgent", "direction": "call", "inputType": "CmUpdateAgentInput", "outputType": "CmUpdateAgentOutput", "expectsVersion": true } ] };
`;
  context.external = { ...externalSources, catalogs: { cm: catalog } };
  const raw = versionDesign(
    [{ name: 'seen', type: 'Seen' }, { name: 'aside', type: 'Aside' }, { name: 'rows', type: 'Listed[]' }],
    [{ name: 'seen', type: 'Seen' }, { name: 'rows', type: 'Listed[]' }],
  );
  const out = normalizeD2BffDesign(raw, context.entities, '', { writes: context.need.writes, external: context.external });
  assert.deepEqual(out.types.find(item => item.name === 'Seen')?.fields.at(-1), stringVersionLeaf);
  assert.equal(out.types.find(item => item.name === 'Aside')?.fields.some(item => item.name === 'version'), false);
  assert.equal(out.types.find(item => item.name === 'Listed')?.fields.some(item => item.name === 'version'), false);
});

test('a type that already has version is retyped to the catalog primitive and does not gain another', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  const catalog = `
export interface CmUpdateAgentInput { agentId: string; }
export interface CmUpdateAgentOutput { version: string; }
export const cm = { "operations": [ { "operationId": "updateAgent", "direction": "call", "inputType": "CmUpdateAgentInput", "outputType": "CmUpdateAgentOutput", "expectsVersion": true } ] };
`;
  context.external = { ...externalSources, catalogs: { cm: catalog } };
  const raw = versionDesign([{ name: 'already', type: 'Already' }], [{ name: 'already', type: 'Already' }]);
  const out = normalizeD2BffDesign(raw, context.entities, '', { writes: context.need.writes, external: context.external });
  const view = out.types.find(item => item.name === 'Already');
  assert.equal(view?.fields.filter(item => item.name === 'version').length, 1);
  assert.deepEqual(view?.fields.find(item => item.name === 'version'), stringVersionLeaf);
});

test('a command that does not gain expectVersion leaves the design unchanged', () => {
  const context = externalContext(
    [{ entity: 'AgentDraft', operation: 'transition', transitionRef: 'discardDraft' }],
    { discardDraft: { write: 'AgentDraft.discardDraft' } },
  );
  const raw = versionDesign(
    [{ name: 'seen', type: 'Seen' }],
    [{ name: 'seen', type: 'Seen' }],
    'AgentDraft.discardDraft',
    'discardDraft',
  );
  const out = normalizeD2BffDesign(raw, context.entities, '', { writes: context.need.writes, external: context.external });
  assert.equal(out.endpoints.some(item => item.input.some(leaf => leaf.name === 'expectVersion')), false);
  assert.deepEqual(out.types, raw.types);
  assert.deepEqual(out.endpoints.map(item => item.output), raw.endpoints.map(item => item.output));
});

test('a write whose output has no required version does not add one to the view', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  const without = (output: string) => `
export interface CmUpdateAgentInput { agentId: string; }
export interface CmUpdateAgentOutput { ${output} }
export const cm = { "operations": [ { "operationId": "updateAgent", "direction": "call", "inputType": "CmUpdateAgentInput", "outputType": "CmUpdateAgentOutput", "expectsVersion": true } ] };
`;
  for (const output of ['changeId: string;', 'version?: string;']) {
    context.external = { ...externalSources, catalogs: { cm: without(output) } };
    const raw = versionDesign([{ name: 'seen', type: 'Seen' }], [{ name: 'seen', type: 'Seen' }]);
    const out = normalizeD2BffDesign(raw, context.entities, '', { writes: context.need.writes, external: context.external });
    assert.equal(out.endpoints.find(item => item.id === 'mudar')?.input.some(item => item.name === 'expectVersion'), true);
    assert.equal(out.types.find(item => item.name === 'Seen')?.fields.some(item => item.name === 'version'), false);
  }
});

const expectVersionLeaf = { name: 'expectVersion', type: 'number', origin: { kind: 'context' as const, paths: [] } };

function withExpectVersion(raw: D2BffDesign): D2BffDesign {
  return {
    ...raw,
    endpoints: raw.endpoints.map(endpoint => endpoint.kind === 'cmd'
      ? { ...endpoint, input: [...endpoint.input, expectVersionLeaf] }
      : endpoint),
  };
}

test('a saved agent_behavior design gains version on the view the page already reads', async () => {
  await withProjectFiles(async () => {
    const envelope = JSON.parse(readFileSync(new URL('./fixtures/d2_207/agent_behavior-2.json', import.meta.url), 'utf8')) as { raw: { result: { arguments: unknown } } };
    const context = await loadD2BffContext({ project: 102047, module: 'agents' }, 'agent_behavior');
    const saved = withExpectVersion(buildD2BffDesign(envelope.raw.result.arguments));
    const facts = { writes: context.need.writes, external: context.external };
    assert.equal(saved.types.find(item => item.name === 'AgentBehaviorDetail')?.fields.some(item => item.name === 'version'), false);
    const once = addD2RecordVersion(saved, context.entities, facts);
    const view = once.types.find(item => item.name === 'AgentBehaviorDetail');
    assert.deepEqual(view?.fields.at(-1), stringVersionLeaf);
    assert.equal(view?.description.endsWith(versionNote), true);
    assert.equal(once.types.find(item => item.name === 'BehaviorChange')?.fields.some(item => item.name === 'version'), false);
    const twice = addD2RecordVersion(once, context.entities, facts);
    assert.equal(twice, once);
  });
});

test('addD2RecordVersion leaves a design with no returning version untouched', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  const facts = { writes: context.need.writes, external: context.external };
  const plain = versionDesign([{ name: 'seen', type: 'Seen' }], [{ name: 'seen', type: 'Seen' }], 'Recebimento.update', 'estorno');
  assert.equal(addD2RecordVersion(plain, entities, facts), plain);
  const asked = withExpectVersion(versionDesign([{ name: 'seen', type: 'Seen' }], [{ name: 'seen', type: 'Seen' }]));
  assert.equal(addD2RecordVersion(asked, context.entities, facts), asked);
  assert.equal(JSON.stringify(addD2RecordVersion(asked, context.entities, facts)), JSON.stringify(asked));
});

test('expectVersion written on the input, not added by normalize, still puts version on the view', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  const catalog = `
export interface CmUpdateAgentInput { agentId: string; }
export interface CmUpdateAgentOutput { version: string; }
export const cm = { "operations": [ { "operationId": "updateAgent", "direction": "call", "inputType": "CmUpdateAgentInput", "outputType": "CmUpdateAgentOutput", "expectsVersion": true } ] };
`;
  context.external = { ...externalSources, catalogs: { cm: catalog } };
  const saved = withExpectVersion(versionDesign([{ name: 'seen', type: 'Seen' }], [{ name: 'seen', type: 'Seen' }]));
  const out = addD2RecordVersion(saved, context.entities, { writes: context.need.writes, external: context.external });
  assert.deepEqual(out.types.find(item => item.name === 'Seen')?.fields.at(-1), stringVersionLeaf);
  assert.equal(out.types.find(item => item.name === 'Seen')?.description.endsWith(versionNote), true);
  assert.equal(out.endpoints.find(item => item.id === 'mudar')?.input.find(item => item.name === 'expectVersion')?.type, 'string');
});

function catalogOf(output: string): string {
  return `
export interface CmUpdateAgentInput { agentId: string; }
export interface CmUpdateAgentOutput { ${output} }
export const cm = { "operations": [ { "operationId": "updateAgent", "direction": "call", "inputType": "CmUpdateAgentInput", "outputType": "CmUpdateAgentOutput", "expectsVersion": true } ] };
`;
}

test('an existing number leaf follows a string version in the catalog, and a second pass is the same object', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  context.external = { ...externalSources, catalogs: { cm: catalogOf('version: string;') } };
  const facts = { writes: context.need.writes, external: context.external };
  const saved = withExpectVersion(versionDesign(
    [{ name: 'seen', type: 'Seen' }],
    [{ name: 'seen', type: 'Seen' }],
  ));
  const seen = saved.types.find(item => item.name === 'Seen');
  if (!seen) throw new Error('missing Seen');
  seen.fields = [...seen.fields, versionLeaf];
  const once = addD2RecordVersion(saved, context.entities, facts);
  assert.equal(once.endpoints.find(item => item.id === 'mudar')?.input.find(item => item.name === 'expectVersion')?.type, 'string');
  assert.deepEqual(once.types.find(item => item.name === 'Seen')?.fields.find(item => item.name === 'version'), stringVersionLeaf);
  assert.equal(addD2RecordVersion(once, context.entities, facts), once);
});

test('a number version in the catalog keeps number, including the same reference when the leaf is already number', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  context.external = { ...externalSources, catalogs: { cm: catalogOf('version: number;') } };
  const facts = { writes: context.need.writes, external: context.external };
  const raw = versionDesign([{ name: 'seen', type: 'Seen' }], [{ name: 'seen', type: 'Seen' }]);
  const added = normalizeD2BffDesign(raw, context.entities, '', facts);
  assert.equal(added.endpoints.find(item => item.id === 'mudar')?.input.find(item => item.name === 'expectVersion')?.type, 'number');
  assert.deepEqual(added.types.find(item => item.name === 'Seen')?.fields.at(-1), versionLeaf);
  const saved = withExpectVersion(raw);
  const seen = saved.types.find(item => item.name === 'Seen');
  if (!seen) throw new Error('missing Seen');
  seen.fields = [...seen.fields, versionLeaf];
  assert.equal(addD2RecordVersion(saved, context.entities, facts), saved);
});

test('a catalog version that is not a string or number primitive leaves the design unchanged', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  const facts = { writes: context.need.writes, external: context.external };
  for (const output of ['version: boolean;', 'version: { id: string };']) {
    context.external = { ...externalSources, catalogs: { cm: catalogOf(output) } };
    const saved = withExpectVersion(versionDesign([{ name: 'seen', type: 'Seen' }], [{ name: 'seen', type: 'Seen' }]));
    assert.equal(addD2RecordVersion(saved, context.entities, facts), saved);
  }
});

test('a module entity command keeps version and expectVersion as number', () => {
  const context = externalContext([{ entity: 'Agent', operation: 'update' }], { requestChange: { write: 'Agent.update' } });
  context.external = { ...externalSources, catalogs: { cm: catalogOf('version: string;') } };
  const facts = { writes: context.need.writes, external: context.external };
  const stored = { ...externalEntities.Agent, kind: 'entity' } as Ns5OntologyAnyEntity;
  const saved = withExpectVersion(versionDesign([{ name: 'seen', type: 'Seen' }], [{ name: 'seen', type: 'Seen' }]));
  const seen = saved.types.find(item => item.name === 'Seen');
  if (!seen) throw new Error('missing Seen');
  seen.fields = [...seen.fields, versionLeaf];
  assert.equal(addD2RecordVersion(saved, { Agent: stored }, facts), saved);
});
