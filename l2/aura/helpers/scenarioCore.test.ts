/// <mls fileReference="_102020_/l2/aura/helpers/scenarioCore.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ACTION_STATUS_VALUES,
  NO_VOCABULARY,
  describeAction,
  describeState,
  entityIdsOf,
  enumOfField,
  groupByAction,
  groupBySection,
  inputsWithoutWriter,
  operationIdsOf,
  parseEntity,
  parseOperation,
  parseWorkspace,
  scenarioKeys,
  type IL4Vocabulary,
} from '/_102020_/l2/aura/helpers/scenarioCore.js';

/**
 * A real workspace, trimmed to what these tests need — the shape is exactly the l4 one.
 *
 * `cmdDeleteChangeOrder.changeOrderId` is `selectedEntity` with NO `sourceRef`: nothing is named to
 * select it, which is why the delete button of the real page is disabled forever.
 */
const WORKSPACE = `export const changeOrderCatalogueWorkspace = ${JSON.stringify({
  workspaceId: 'changeOrderCatalogue',
  title: 'Ordem de mudança',
  entity: 'ChangeOrder',
  bffCalls: [
    { bffId: 'qryListChangeOrder', kind: 'query', input: [], output: { kind: 'list', fields: [{ name: 'changeOrderId', type: 'string' }] } },
    {
      bffId: 'cmdUpdateChangeOrder',
      kind: 'command',
      input: [
        { name: 'changeOrderId', type: 'string', required: true, source: 'selectedEntity' },
        { name: 'clientRef', type: 'string', required: true, source: 'selectedEntity', sourceRef: 'qryClientPicker' },
        { name: 'description', type: 'string', required: true, source: 'userInput' },
        { name: 'status', type: 'string', required: true, source: 'systemDefault' },
      ],
      output: { kind: 'object', fields: [{ name: 'changeOrderId', type: 'string' }] },
    },
    {
      bffId: 'cmdDeleteChangeOrder',
      kind: 'command',
      input: [{ name: 'changeOrderId', type: 'string', required: true, source: 'selectedEntity' }],
      output: { kind: 'object', fields: [] },
    },
  ],
  sections: [
    {
      sectionId: 'recordList',
      intent: 'Localizar Ordem de mudança.',
      organisms: [
        { role: 'primarySurface', dataSource: 'qryListChangeOrder' },
        { role: 'contextualAction', action: 'cmdDeleteChangeOrder' },
      ],
    },
    {
      sectionId: 'recordForm',
      intent: 'Criar ou corrigir Ordem de mudança.',
      organisms: [{ role: 'primarySurface', action: 'cmdUpdateChangeOrder' }],
    },
  ],
}, null, 1)};`;

const workspace = parseWorkspace(WORKSPACE);

test('the workspace is read, not evaluated', () => {
  // The object is plain JSON in all 34 real files, so reading one must not run anything.
  assert.ok(workspace);
  assert.equal(workspace.workspaceId, 'changeOrderCatalogue');
  assert.equal(workspace.bffCalls?.length, 3);

  assert.equal(parseWorkspace('export const x = 1;'), null, 'no object, no workspace');
  assert.equal(parseWorkspace('export const x = { notAWorkspace: true };'), null, 'no workspaceId');
  assert.equal(parseWorkspace('export const x = { broken: '), null, 'unparseable is null, not a throw');
});

test('the six key shapes come out of the workspace', () => {
  assert.ok(workspace);
  const keys = scenarioKeys(workspace).map((state) => state.key);

  // The convention, verified against all 34 real pages before this file existed: derived from the l4
  // vs what each page subscribes to, 34/34 match exactly.
  assert.ok(keys.includes('ui.changeOrderCatalogue.status'));
  assert.ok(keys.includes('ui.changeOrderCatalogue.action.qryListChangeOrder.status'));
  assert.ok(keys.includes('ui.changeOrderCatalogue.data.qryListChangeOrder'), 'a query has data');
  assert.ok(keys.includes('ui.changeOrderCatalogue.output.cmdDeleteChangeOrder'), 'a command has output');
  assert.ok(keys.includes('ui.changeOrderCatalogue.action.cmdDeleteChangeOrder.error'), 'and an error');
  assert.ok(keys.includes('ui.changeOrderCatalogue.input.cmdUpdateChangeOrder.clientRef'));

  // A query has no error key and no output key: that is what the l2 subscription says too.
  assert.equal(keys.includes('ui.changeOrderCatalogue.action.qryListChangeOrder.error'), false);
  assert.equal(keys.includes('ui.changeOrderCatalogue.output.qryListChangeOrder'), false);
});

test('each state carries what a control needs to be drawn', () => {
  assert.ok(workspace);
  const states = scenarioKeys(workspace);
  const byKey = new Map(states.map((state) => [state.key, state]));

  const status = byKey.get('ui.changeOrderCatalogue.action.cmdDeleteChangeOrder.status');
  assert.deepEqual(status?.valueSet, ACTION_STATUS_VALUES, 'a closed domain of four');
  assert.equal(status?.editable, true);
  assert.equal(status?.name, 'cmdDeleteChangeOrderState', 'the property the page renders from');

  const input = byKey.get('ui.changeOrderCatalogue.input.cmdUpdateChangeOrder.clientRef');
  assert.equal(input?.name, 'cmdUpdateChangeOrderClientRef');
  assert.equal(input?.source, 'selectedEntity');
  assert.equal(input?.sourceRef, 'qryClientPicker');
  assert.equal(input?.editable, true);

  // The page status has no declared domain — not in the l4 and not in the l2 defs either. A free
  // field is honest; an invented enum would offer values the page never compares against.
  assert.equal(byKey.get('ui.changeOrderCatalogue.status')?.valueSet, undefined);

  // Phase 1 cannot offer a list or an object honestly, but it must not hide them: a state the panel
  // hides is a state the user believes does not exist.
  assert.equal(byKey.get('ui.changeOrderCatalogue.data.qryListChangeOrder')?.editable, false);
  assert.equal(byKey.get('ui.changeOrderCatalogue.output.cmdUpdateChangeOrder')?.editable, false);
});

test('the states are grouped by the page own sections, and nothing is dropped', () => {
  assert.ok(workspace);
  const states = scenarioKeys(workspace);
  const groups = groupBySection(workspace, states);

  const total = groups.reduce((sum, group) => sum + group.states.length, 0);
  assert.equal(total, states.length, 'every state lands in exactly one group');

  const list = groups.find((group) => group.sectionId === 'recordList');
  assert.match(list?.intent ?? '', /Localizar/u);
  const listBffs = new Set(list?.states.map((state) => state.bffId));
  assert.deepEqual([...listBffs].sort(), ['cmdDeleteChangeOrder', 'qryListChangeOrder']);

  // The page's own status belongs to no section: it goes last, in the leftover group.
  const leftover = groups[groups.length - 1];
  assert.equal(leftover.sectionId, '');
  assert.deepEqual(leftover.states.map((state) => state.key), ['ui.changeOrderCatalogue.status']);
});

test('an input nothing on screen fills is reported — and one that IS filled is not', () => {
  assert.ok(workspace);
  const states = scenarioKeys(workspace);

  // The real layout 1: a select for the update id, text inputs for what the user types, and no
  // control at all for the delete id or for clientRef.
  const layout1 = `
    <select .value=\${this.cmdUpdateChangeOrderChangeOrderId} @change=\${this.handleCmdUpdateChangeOrderChangeOrderIdChange}></select>
    <input .value=\${this.cmdUpdateChangeOrderDescription} @input=\${this.handleCmdUpdateChangeOrderDescriptionChange}>
    <button ?disabled=\${!this.cmdDeleteChangeOrderChangeOrderId}>delete</button>
  `;
  const missing = inputsWithoutWriter(states, layout1).map((state) => state.name);
  assert.deepEqual(missing.sort(), ['cmdDeleteChangeOrderChangeOrderId', 'cmdUpdateChangeOrderClientRef']);

  // `systemDefault` is filled by the app by design: flagging it would be noise.
  assert.equal(missing.includes('cmdUpdateChangeOrderStatus'), false);

  // The real layouts 2 and 3 fill the same inputs from a clickable ROW, by calling the generated
  // setters. Without counting that shape the detector cried wolf 74 times instead of 43.
  const layout2 = `
    <button @click=\${() => { this.setCmdUpdateChangeOrderClientRef(String(r['clientRef'])); this.setCmdDeleteChangeOrderChangeOrderId(id); }}></button>
    <input .value=\${this.cmdUpdateChangeOrderDescription}>
  `;
  assert.deepEqual(inputsWithoutWriter(states, layout2).map((state) => state.name), ['cmdUpdateChangeOrderChangeOrderId']);
});

// --- The panel that uses it (source-level guards) ---

const SERVICE = readFileSync(new URL('../services/serviceScenario.ts', import.meta.url), 'utf8');

test('the panel reads the L4, never the l2 defs', () => {
  // The l2 `.defs.ts` is generator output and may change shape or go away; the l4 workspace is the
  // source, and the derivation from it was measured exact on all 34 pages.
  assert.match(SERVICE, /l4\/\$\{module\}`/u, 'the l4 of the page module is the base');
  assert.match(SERVICE, /workspaces\/\$\{page\.shortName\}\.defs\.ts/u);
  assert.equal(/l2\/.*web.*shared.*defs/u.test(SERVICE), false, 'no l2 defs anywhere');
  // The vocabulary is more l4 and only l4: operations and ontology, never a second inventory.
  assert.match(SERVICE, /\$\{l4\}\/operations\/\$\{id\}\.defs\.ts/u);
  assert.match(SERVICE, /\$\{l4\}\/ontology\/\$\{id\}\.defs\.ts/u);
  assert.equal(/l2\/[^`']*\.defs\.ts/u.test(SERVICE), false, 'no l2 defs read at all');
  // And it refuses honestly where there is no workspace instead of guessing.
  assert.match(SERVICE, /_missingWorkspace = true/u);
});

test('restoring puts back what the APP had, not the previous simulation', () => {
  // The original is captured once. Overwriting it on the second change would make "restore" put back
  // the first simulated value — which no one ever asked for.
  const apply = SERVICE.slice(SERVICE.indexOf('private _apply('));
  const body = apply.slice(0, apply.indexOf('\n  }'));
  assert.match(body, /existing \? existing\.original : getState\(state\.key\)/u);
});

test('the simulation is announced outside the panel', () => {
  // Two message <p>s look identical: editing the error branch believing it is the success one is the
  // mistake this makes easy, and the picker is where the user is looking when they make it.
  assert.match(SERVICE, /setState\('aura\.scenario\.simulated', \[\.\.\.this\._simulated\.keys\(\)\]\)/u);

  const panel = readFileSync(new URL('../studio/classPickerPanel.ts', import.meta.url), 'utf8');
  assert.match(panel, /subscribe\(ClassPickerPanel\.SCENARIO_KEY, this\)/u, 'the picker listens');
  assert.match(panel, /unsubscribe\(ClassPickerPanel\.SCENARIO_KEY, this\)/u, 'and stops listening');
  assert.match(panel, /renderScenarioBadge/u);
});

test('what the panel publishes is plain data', () => {
  // Same discipline as `aura.edit`: `setState` keeps every value it is handed in a 10.000-entry log,
  // so anything live parked there is pinned for the session.
  const keys = ['ui.page.action.cmd.status', 'ui.page.input.cmd.field'];
  assert.deepEqual(JSON.parse(JSON.stringify(keys)), keys);
  // The published value is exactly a list of keys — strings, built from a Map's keys.
  assert.match(SERVICE, /setState\('aura\.scenario\.simulated', \[\.\.\.this\._simulated\.keys\(\)\]\)/u);
});

// ── The vocabulary: the words the l4 already has ─────────────────────────────────────────────────
//
// The fixture is a real slice of the 102047 — the `qryListTicket` chain, verbatim in shape: the
// workspace input carries `from` and `enumValues`, the operation carries `fieldRef` and
// `description`, and the ontology carries the field `title` and the `enum` constraint (whose value is
// a JSON array INSIDE A STRING, which is the shape that has to be parsed).

const TICKET_WORKSPACE = `export const ticketHubWorkspace = ${JSON.stringify({
  workspaceId: 'ticketHub',
  title: 'Chamado',
  purpose: 'Painel de Chamado.',
  entity: 'Ticket',
  bffCalls: [
    {
      bffId: 'qryListTicket',
      kind: 'query',
      uses: [{ operationId: 'listTicket' }],
      input: [
        { name: 'search', from: 'listTicket.search', source: 'userInput', type: 'string' },
        { name: 'sortOrder', from: 'listTicket.sortOrder', source: 'userInput', type: 'string', enumValues: ['asc', 'desc'] },
      ],
      output: { kind: 'list', fields: [{ name: 'ticketId', type: 'string' }] },
    },
    {
      bffId: 'cmdCreateTicket',
      kind: 'command',
      uses: [{ operationId: 'createTicket' }],
      input: [
        { name: 'title', from: 'createTicket.title', source: 'userInput', type: 'string' },
        // No domain here: the older generator leaves it to the ontology, and 20 inputs of the 102046
        // have theirs nowhere else.
        { name: 'status', from: 'createTicket.status', source: 'userInput', type: 'string' },
      ],
      output: { kind: 'object', fields: [] },
    },
  ],
  sections: [
    {
      sectionId: 'collection',
      intent: 'Carteira e busca.',
      organisms: [
        { role: 'primarySurface', dataSource: 'qryListTicket' },
        { role: 'contextualAction', action: 'cmdCreateTicket' },
      ],
    },
  ],
  operationIds: ['listTicket', 'createTicket'],
}, null, 1)} as const;`;

const LIST_TICKET = `import type { X } from '/_1_/x.js';

export const operationListTicket = ${JSON.stringify({
  operationId: 'listTicket',
  title: 'Listar Chamado',
  entity: 'Ticket',
  kind: 'query',
  story: { actor: 'atendente', goal: 'Listar Chamado', steps: ['Encontrar o registro.'], outcome: 'Encontrar o registro.' },
  inputs: [
    { inputId: 'search', fieldRef: 'Ticket.title', description: 'Buscar por Título.', source: 'userInput' },
    { inputId: 'sortOrder', fieldRef: 'Ticket.status', description: 'Direção da ordenação.', enumValues: ['asc', 'desc'] },
  ],
}, null, 1)} as const;

export default operationListTicket;`;

const CREATE_TICKET = `export const operationCreateTicket = ${JSON.stringify({
  operationId: 'createTicket',
  title: 'Criar Chamado',
  entity: 'Ticket',
  kind: 'create',
  story: { goal: 'Criar Chamado', outcome: 'Informar os dados do novo registro.' },
  inputs: [
    { inputId: 'title', fieldRef: 'Ticket.title', description: 'Título que identifica a solicitação.' },
    { inputId: 'status', fieldRef: 'Ticket.status', description: 'Situação atual do chamado.' },
    { inputId: 'orphan', description: 'Sem fieldRef nenhum.' },
  ],
}, null, 1)} as const;`;

/** The `{` of the import comes FIRST in the real ontology files — the naive parser died here. */
const TICKET_ENTITY = `import type { Ns4OntologyEntityArtifact } from '/_102020_/l2/agentNewSolution/types.js';

export const controleChamadosEntityTicket = ${JSON.stringify({
  entityId: 'Ticket',
  title: 'Chamado',
  description: 'Registro operacional de uma solicitação de atendimento.',
  userLanguage: 'pt-BR',
  fields: [
    { fieldId: 'ticketId', title: 'Identificador do chamado', type: 'uuid', constraints: [{ kind: 'unique', value: 'true' }] },
    { fieldId: 'title', title: 'Título', type: 'string', description: 'Título que identifica a solicitação.', constraints: [] },
    { fieldId: 'status', title: 'Status', type: 'string', constraints: [{ kind: 'enum', value: '["open","closed"]' }] },
  ],
}, null, 1)} as const satisfies Ns4OntologyEntityArtifact;

export type ControleChamadosEntityTicketType = typeof controleChamadosEntityTicket;

export default controleChamadosEntityTicket;`;

const ticketHub = parseWorkspace(TICKET_WORKSPACE);
assert.ok(ticketHub, 'fixture workspace');
const listTicket = parseOperation(LIST_TICKET);
const createTicket = parseOperation(CREATE_TICKET);
const ticketEntity = parseEntity(TICKET_ENTITY);
assert.ok(listTicket && createTicket && ticketEntity, 'fixture vocabulary');

const VOCABULARY: IL4Vocabulary = {
  operations: { listTicket, createTicket },
  entities: { Ticket: ticketEntity },
};

const stateNamed = (name: string) => {
  const found = scenarioKeys(ticketHub).find((candidate) => candidate.name === name);
  assert.ok(found, name);
  return found;
};

test('an ontology file is read even though its first brace is the import', () => {
  // The naive "first `{` to last `}`" only ever survived the workspace files; every ontology file
  // starts with `import type { … }`, so the slice began inside the import and JSON.parse threw. That
  // is what stopped the first measurement of this analysis from reading anything but workspaces.
  assert.equal(ticketEntity.entityId, 'Ticket');
  assert.equal(ticketEntity.title, 'Chamado');
  // And the trailing `export default` / `export type` lines are not part of the object either.
  assert.equal(ticketEntity.fields?.length, 3);
});

test('a brace inside a description does not end the object', () => {
  const tricky = parseOperation(`export const operationX = ${JSON.stringify({
    operationId: 'x',
    title: 'X',
    story: { outcome: 'Um } que não fecha nada, e um { também.' },
  }, null, 1)} as const;`);
  assert.equal(tricky?.story?.outcome, 'Um } que não fecha nada, e um { também.');
});

test('the domain declared in the workspace becomes chips instead of a text box', () => {
  // This was the defect, and the cheapest half of the whole task: `IWorkspaceInput` had no
  // `enumValues`, so `scenarioKeys` never set `valueSet` for an input and the panel drew
  // `<input placeholder="valor">` next to a declaration saying the only options are `asc` and `desc`.
  assert.deepEqual(stateNamed('qryListTicketSortOrder').valueSet, ['asc', 'desc']);
  // Nothing invented where nothing is declared.
  assert.equal(stateNamed('qryListTicketSearch').valueSet, undefined);
});

test('an input is named by its ontology field, and helped by its operation description', () => {
  const search = describeState(stateNamed('qryListTicketSearch'), ticketHub, VOCABULARY);
  assert.equal(search.label, 'Título', 'through listTicket.search -> Ticket.title -> title');
  assert.equal(search.hint, 'Buscar por Título.');
  assert.equal(search.fromL4, true);
});

test('a closed domain is found in the workspace, in the operation, or in the ontology', () => {
  // Three sources because the two generators put it in different places, and the panel has to cover
  // both: the workspace (9 inputs of the 102047) and the ontology constraint (20 of the 102046).
  const fromWorkspace = describeState(stateNamed('qryListTicketSortOrder'), ticketHub, VOCABULARY);
  assert.deepEqual(fromWorkspace.valueSet, ['asc', 'desc']);

  const fromOntology = describeState(stateNamed('cmdCreateTicketStatus'), ticketHub, VOCABULARY);
  assert.deepEqual(fromOntology.valueSet, ['open', 'closed'], 'the enum constraint, JSON in a string');
  assert.equal(fromOntology.label, 'Status');
});

test('the enum constraint is parsed, and a constraint that is not one is ignored', () => {
  const status = ticketEntity.fields?.find((field) => field.fieldId === 'status') ?? null;
  assert.deepEqual(enumOfField(status), ['open', 'closed']);

  const unique = ticketEntity.fields?.find((field) => field.fieldId === 'ticketId') ?? null;
  assert.equal(enumOfField(unique), undefined, 'a unique constraint is not a domain');
  assert.equal(enumOfField(null), undefined);
  assert.equal(enumOfField({ fieldId: 'x', constraints: [{ kind: 'enum', value: 'não é json' }] }), undefined);
});

test('a status line is named by the action, and a result by its entity and shape', () => {
  const status = describeState(stateNamed('qryListTicketState'), ticketHub, VOCABULARY);
  assert.equal(status.label, 'Listar Chamado');

  const list = describeState(stateNamed('qryListTicketData'), ticketHub, VOCABULARY);
  assert.equal(list.label, 'Chamado');
  assert.equal(list.many, true, 'output.kind is list — the panel says "Lista de Chamado"');

  const object = describeState(stateNamed('cmdCreateTicketOutput'), ticketHub, VOCABULARY);
  assert.equal(object.label, 'Chamado');
  assert.equal(object.many, false);

  const page = describeState(stateNamed('status'), ticketHub, VOCABULARY);
  assert.equal(page.label, 'Chamado');
  assert.equal(page.hint, 'Painel de Chamado.');
});

test('the four status chips survive the describe — every kind keeps its domain', () => {
  // Caught by rendering the real panel and reading it: `describeState` had been returning the label
  // WITHOUT the domain for everything but inputs, and the panel reads the domain from there. The most
  // used control in the tool — idle/loading/success/error — had become a free text box.
  const status = describeState(stateNamed('qryListTicketState'), ticketHub, VOCABULARY);
  assert.deepEqual(status.valueSet, ACTION_STATUS_VALUES);
  assert.deepEqual(
    describeState(stateNamed('qryListTicketState'), ticketHub, NO_VOCABULARY).valueSet,
    ACTION_STATUS_VALUES,
    'and with no vocabulary read at all',
  );

  // What has no domain still has none: nothing is invented to fill the gap.
  for (const name of ['qryListTicketSearch', 'cmdCreateTicketError', 'status']) {
    assert.equal(describeState(stateNamed(name), ticketHub, VOCABULARY).valueSet, undefined, name);
  }
});

test('a result line is named, not explained', () => {
  // The entity's own description says what a Chamado IS — the same paragraph under every result line
  // of that entity, and nothing about THIS state.
  const list = describeState(stateNamed('qryListTicketData'), ticketHub, VOCABULARY);
  assert.equal(list.label, 'Chamado');
  assert.equal(list.hint, undefined);
});

test('the label carries no chrome word, so the panel stays translated', () => {
  // The l4 is written in one language (pt-BR in both projects — the same words the app shows) and the
  // panel is pt/en/es. Composing "situação" or "Lista de" in the core would nail one language into a
  // file that has no i18n, so the core returns the domain words and the renderer adds the rest.
  for (const name of ['qryListTicketState', 'qryListTicketData', 'cmdCreateTicketError', 'status']) {
    const described = describeState(stateNamed(name), ticketHub, VOCABULARY);
    for (const chrome of ['situação', 'situation', 'Lista de', 'List of', 'erro', 'error']) {
      assert.equal(described.label.includes(chrome), false, `${name} must not carry "${chrome}"`);
    }
  }
});

test('the action block is titled by the operation and helped by its outcome', () => {
  const action = describeAction('qryListTicket', ticketHub, VOCABULARY);
  assert.equal(action?.label, 'Listar Chamado');
  // The outcome and NOT the goal: the goal repeats the title in every operation of both projects.
  assert.equal(action?.hint, 'Encontrar o registro.');
  assert.equal(describeAction('nothingLikeThis', ticketHub, VOCABULARY), null);
});

test('with no vocabulary read the panel says the technical name — never a guess', () => {
  // Risk 1 of the task: a plausible invented word is WORSE than the property name, because the
  // property name is at least verifiable against the source. So degradation is one-way.
  for (const name of ['qryListTicketSearch', 'qryListTicketState', 'qryListTicketData']) {
    const described = describeState(stateNamed(name), ticketHub, NO_VOCABULARY);
    assert.equal(described.label, name);
    assert.equal(described.fromL4, false);
  }
  // The domain the WORKSPACE declares survives with no vocabulary at all: it needs no other file.
  assert.deepEqual(describeState(stateNamed('qryListTicketSortOrder'), ticketHub, NO_VOCABULARY).valueSet,
    ['asc', 'desc']);
});

test('the three degradations each fall back to the technical name', () => {
  const noEntity: IL4Vocabulary = { operations: VOCABULARY.operations, entities: {} };
  assert.equal(describeState(stateNamed('qryListTicketSearch'), ticketHub, noEntity).label, 'qryListTicketSearch');
  assert.equal(describeState(stateNamed('qryListTicketData'), ticketHub, noEntity).label, 'qryListTicketData');

  // An input the operation declares with NO fieldRef: nothing names it, so nothing is invented.
  const orphanWorkspace = parseWorkspace(`export const wsX = ${JSON.stringify({
    workspaceId: 'wsX',
    bffCalls: [{
      bffId: 'cmdCreateTicket',
      kind: 'command',
      uses: [{ operationId: 'createTicket' }],
      input: [{ name: 'orphan', from: 'createTicket.orphan', source: 'userInput' }],
    }],
  }, null, 1)};`);
  assert.ok(orphanWorkspace);
  const orphan = scenarioKeys(orphanWorkspace).find((s) => s.name === 'cmdCreateTicketOrphan');
  assert.ok(orphan);
  const described = describeState(orphan, orphanWorkspace, VOCABULARY);
  assert.equal(described.label, 'cmdCreateTicketOrphan');
  assert.equal(described.fromL4, false);
});

test('the files to read are the ones the page cites, and nothing else', () => {
  assert.deepEqual(operationIdsOf(ticketHub), ['listTicket', 'createTicket']);
  // Reached through `uses[]`, so a workspace with no top-level list still resolves.
  const noList = parseWorkspace(`export const wsY = ${JSON.stringify({
    workspaceId: 'wsY',
    bffCalls: [{ bffId: 'a', kind: 'query', uses: [{ operationId: 'listTicket' }] }],
  }, null, 1)};`);
  assert.deepEqual(operationIdsOf(noList!), ['listTicket']);
});

test('the entities come from the operations AND from every fieldRef', () => {
  // Not optional: `recordComment` is an operation on TicketComment whose first input points at
  // `Ticket.ticketId`, so reading only `entity` would leave that line unlabelled.
  const recordComment = parseOperation(`export const operationRecordComment = ${JSON.stringify({
    operationId: 'recordComment',
    title: 'Registrar comentário',
    entity: 'TicketComment',
    inputs: [
      { inputId: 'ticketId', fieldRef: 'Ticket.ticketId' },
      { inputId: 'commentText', fieldRef: 'TicketComment.commentText' },
    ],
  }, null, 1)};`);
  assert.ok(recordComment);
  assert.deepEqual(entityIdsOf([recordComment], { workspaceId: 'x' }), ['TicketComment', 'Ticket']);
});

test('the lines of a section are split into the actions they belong to', () => {
  // What makes a short label honest: `cmdCreateTicket.title` and `cmdUpdateTicket.title` are both
  // "Título", and only the action around them tells them apart.
  const groups = groupBySection(ticketHub, scenarioKeys(ticketHub));
  const blocks = groupByAction(groups[0].states);
  assert.deepEqual(blocks.map((block) => block.bffId), ['qryListTicket', 'cmdCreateTicket']);
  assert.deepEqual(blocks[0].states.map((s) => s.kind), ['actionStatus', 'queryResult', 'input', 'input']);

  // The page's own status belongs to no action, so it stands alone in the leftover group — where it
  // is still LISTED. A state the panel hides is one the user believes does not exist.
  const own = groupByAction(groups[groups.length - 1].states);
  assert.deepEqual(own.map((block) => block.bffId), [null]);
  assert.equal(own[0].states[0].kind, 'pageStatus');
  // Nothing is lost or duplicated by the split.
  assert.equal(blocks.reduce((total, block) => total + block.states.length, 0), groups[0].states.length);
});

test('the naive slice is gone, and the anchor is the export', () => {
  // `source.indexOf('{')` to `source.lastIndexOf('}')` reads a workspace and nothing else: an
  // ontology file's first brace is its `import type { … }`. Keeping the old line anywhere would let
  // the vocabulary silently fail to load and every label degrade to the technical name — which looks
  // exactly like "the l4 has no words for this".
  const CORE = readFileSync(new URL('scenarioCore.ts', import.meta.url), 'utf8');
  const code = CORE.split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'));

  assert.equal(code.some((line) => line.includes("lastIndexOf('}')")), false, 'no naive end');
  assert.equal(code.some((line) => line.includes("source.indexOf('{')")), false, 'no naive start');
  assert.ok(code.some((line) => line.includes("indexOf('export const')")), 'anchored on the export');
});

test('every line keeps the property name next to the human label', () => {
  // Criterion 1 has two halves and the second is as important as the first: the property name is what
  // matches a line to the page source, to the class picker and to `aura.scenario.simulated`. Dropping
  // it would trade one confusion for another.
  const line = SERVICE.slice(SERVICE.indexOf('private _renderState('), SERVICE.indexOf('private _describe('));
  assert.match(line, /<code[^>]*>\$\{item\.name\}<\/code>/u, 'the property name is rendered');
  assert.match(line, /title=\$\{item\.key\}/u, 'and the full state key is reachable');
  assert.match(line, /\$\{label\}/u, 'with the human label leading');
});

test('the chrome words are composed in the panel, in all three languages', () => {
  // The l4 speaks one language (pt-BR in both projects, the same words the app shows); the panel
  // speaks the user's. So "situation"/"List of" live in the catalog and never in the core.
  const CORE = readFileSync(new URL('scenarioCore.ts', import.meta.url), 'utf8');
  const inCode = CORE.split('\n')
    .map((line) => line.trim())
    // Doc comments MENTION the composed forms as examples ("lets the panel say 'Lista de Chamado'"),
    // which is documentation. What must not exist is a line of CODE carrying the word.
    .filter((line) => !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'))
    .join('\n');
  for (const chrome of ['situação', 'Lista de', 'situation', 'List of']) {
    assert.equal(inCode.includes(chrome), false, `"${chrome}" belongs to the panel, not the core`);
  }
  for (const key of ['roleStatus', 'roleError', 'rolePageStatus', 'resultList']) {
    assert.equal((SERVICE.match(new RegExp(`\\b${key}:`, 'gu')) ?? []).length, 3, `${key} in en, pt and es`);
  }
});

test('the panel opens with what it has and refines when the l4 arrives', () => {
  // Risk 3: up to 12 files instead of 1. A panel that waits for all of them before drawing anything
  // is worse than one that improves — and the states are already known from the workspace alone.
  const load = SERVICE.slice(SERVICE.indexOf('private async _load('), SERVICE.indexOf('private async _readVocabulary('));
  assert.ok(load.indexOf('this._groups = groupBySection') < load.indexOf('this._readVocabulary('),
    'the states go on screen before the vocabulary is asked for');
  // And a load that lost the race must not write: the vocabulary of one page on the states of another
  // is a wrong label with no way for the user to tell.
  assert.ok((load.match(/token !== this\._loadToken/gu) ?? []).length >= 3, 'every await is fenced');
  assert.match(SERVICE, /Promise\.all\(/u, 'the reads are parallel');
});
