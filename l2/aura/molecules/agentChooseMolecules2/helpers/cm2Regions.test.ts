/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { CM2_PAGE_REGION_PREFIX, countSelectionInputs, extractRegions } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.js';
import { Cm2ContractCommand, Cm2SharedDefinition } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Shared.js';

function shared(overrides: Partial<Cm2SharedDefinition>): Cm2SharedDefinition {
  return { dataBindings: [], i18n: {}, destructiveCommandIds: [], contractTsPath: '', ...overrides };
}

// The real bindings of _102047_/l2/controleChamados/web/shared/ticketCatalogue.defs.ts, trimmed to the
// fields this extraction reads. This is the page the v2 measurement was taken on.
const TICKET_CATALOGUE = shared({
  destructiveCommandIds: ['cmdDeleteTicket'],
  i18n: {
    'intent.qryListTicket.list.column.title.label': 'Título',
    'intent.qryListTicket.list.column.status.label': 'Situação',
    'intent.cmdCreateTicket.form.field.title.label': 'Título',
  },
  dataBindings: [
    { id: 'b.qryListTicket', command: 'qryListTicket', description: 'Listar Chamado', kind: 'query', inputs: [
      { name: 'search', source: 'userInput', presentation: 'form', required: false },
    ] },
    { id: 'b.cmdCreateTicket', command: 'cmdCreateTicket', description: 'Criar Chamado', kind: 'command', inputs: [
      { name: 'title', source: 'userInput', presentation: 'form', required: true },
      { name: 'description', source: 'userInput', presentation: 'form', required: true },
      { name: 'status', source: 'systemDefault', presentation: 'form', required: true },
    ] },
    { id: 'b.cmdDeleteTicket', command: 'cmdDeleteTicket', description: 'Excluir Chamado', kind: 'command', inputs: [
      { name: 'ticketId', source: 'selectedEntity', presentation: 'selection', required: true },
    ] },
    { id: 'b.cmdDecideClosure', command: 'cmdDecideClosure', description: 'Confirmar o fechamento', kind: 'command', inputs: [
      { name: 'ticketId', source: 'routeParam', presentation: 'route', required: true },
      { name: 'status', source: 'userInput', presentation: 'form', required: true },
    ] },
  ],
});

const TYPES: Record<string, Cm2ContractCommand> = {
  qryListTicket: { input: { search: 'string' }, output: { ticketId: 'string', title: 'string', status: 'string' } },
  cmdCreateTicket: { input: { title: 'string', description: 'string', status: 'string' }, output: { ticketId: 'string' } },
  cmdDecideClosure: { input: { status: 'string' }, output: { ticketId: 'string' } },
};

void test('one surface per query, one TRIGGER per command, one entry per form input, one page feedback', () => {
  const ids = extractRegions(TICKET_CATALOGUE, TYPES).map(region => region.id);
  assert.deepEqual(ids, [
    'b.qryListTicket',
    'b.qryListTicket::search',
    'b.cmdCreateTicket',
    'b.cmdCreateTicket::title',
    'b.cmdCreateTicket::description',
    'b.cmdCreateTicket::status',
    'b.cmdDeleteTicket',
    'b.cmdDecideClosure',
    'b.cmdDecideClosure::status',
    'page::feedback',
  ]);
});

void test('a command with NO typed field still yields its trigger — it used to vanish entirely', () => {
  const regions = extractRegions(TICKET_CATALOGUE, TYPES);
  const trigger = regions.find(region => region.id === 'b.cmdDeleteTicket');
  assert.ok(trigger, 'cmdDeleteTicket has only a selection input and must still be a region');
  assert.match(trigger!.need, /ACTIVATES/u);
  assert.match(trigger!.need, /submits no typed field of its own/u);
});

void test('a command DECLARED destructive says so — read from the shared, never inferred from its name', () => {
  const regions = extractRegions(TICKET_CATALOGUE, TYPES);
  assert.match(regions.find(region => region.id === 'b.cmdDeleteTicket')!.need, /DECLARED DESTRUCTIVE/u);
  // And a command that is NOT on the list never gets the line, however destructive its name reads.
  assert.equal(regions.find(region => region.id === 'b.cmdDecideClosure')!.need.includes('DESTRUCTIVE'), false);
});

void test('selection/route inputs are never regions, but their existence makes the surface a SELECTOR', () => {
  const regions = extractRegions(TICKET_CATALOGUE, TYPES);
  assert.equal(regions.some(region => region.id.endsWith('::ticketId')), false);
  assert.match(regions[0].need, /PICK ONE row/u);
  assert.equal(countSelectionInputs(TICKET_CATALOGUE.dataBindings), 1);
});

void test('a page with no selection input says nothing about selecting — never padded', () => {
  const regions = extractRegions(shared({
    dataBindings: [{ id: 'b.q', command: 'q', kind: 'query', inputs: [] }],
  }), {});
  assert.equal(regions[0].need.includes('PICK ONE'), false);
});

void test('the surface need carries the contract output fields AND the declared column labels', () => {
  const surface = extractRegions(TICKET_CATALOGUE, TYPES)[0];
  assert.match(surface.need, /returns fields: ticketId, title, status/u);
  assert.match(surface.need, /its declared columns on screen: Título, Situação/u);
});

void test('an entry need carries the resolved type, required-ness, the value source and the declared label', () => {
  const regions = extractRegions(TICKET_CATALOGUE, TYPES);
  const title = regions.find(region => region.id === 'b.cmdCreateTicket::title')!;
  assert.match(title.need, /type: string/u);
  assert.match(title.need, /required/u);
  assert.match(title.need, /3 typed field\(s\) in this command/u);
  assert.match(title.need, /declared label on screen: 'Título'/u);
  // 'userInput' is the norm and is not stated; anything else IS, because it constrains the control.
  assert.equal(title.need.includes('value source'), false);
  assert.match(regions.find(region => region.id === 'b.cmdCreateTicket::status')!.need, /value source: systemDefault/u);
});

void test('a field the contract does not resolve is honestly "unknown", not guessed from its name', () => {
  const regions = extractRegions(shared({
    dataBindings: [{ id: 'b.cmd', command: 'cmd', kind: 'command', inputs: [{ name: 'amount', presentation: 'form', source: 'userInput' }] }],
  }), {});
  assert.match(regions.find(region => region.id === 'b.cmd::amount')!.need, /type: unknown/u);
});

void test('a form input on a QUERY is a region too — it is typed, so something has to serve it', () => {
  const search = extractRegions(TICKET_CATALOGUE, TYPES).find(region => region.id === 'b.qryListTicket::search');
  assert.ok(search, 'a filter the user types is as much a region as a command field');
  assert.match(search!.need, /type: string/u);
  assert.match(search!.need, /optional/u);
});

void test('the page feedback region names the commands it reports on, and only exists when there are any', () => {
  const feedback = extractRegions(TICKET_CATALOGUE, TYPES).find(region => region.id === `${CM2_PAGE_REGION_PREFIX}feedback`)!;
  assert.match(feedback.need, /3 command\(s\)/u);
  assert.match(feedback.need, /Criar Chamado; Excluir Chamado; Confirmar o fechamento/u);
  const queriesOnly = extractRegions(shared({ dataBindings: [{ id: 'b.q', command: 'q', kind: 'query', inputs: [] }] }), {});
  assert.equal(queriesOnly.some(region => region.id.startsWith(CM2_PAGE_REGION_PREFIX)), false);
});

void test('a binding of an unknown kind contributes nothing, and a malformed shared never throws', () => {
  assert.deepEqual(extractRegions(shared({ dataBindings: [{ id: 'b.x', kind: 'somethingElse' }] }), {}), []);
  assert.deepEqual(extractRegions(shared({}), {}), []);
  assert.deepEqual(extractRegions(shared({ dataBindings: [{ kind: 'query' }] }), {}), []);
});
