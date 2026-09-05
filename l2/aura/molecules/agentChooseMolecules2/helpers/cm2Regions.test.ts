/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRegions } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Regions.js';

// Fixture: the real shape of _102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs.ts.
const APPROVE_CHANGE_ORDER_DEFINITION = {
  dataBindings: [
    {
      id: 'binding.approveChangeOrder.qryLocateChangeOrder',
      command: 'qryLocateChangeOrder',
      description: 'Localizar a ordem de mudança submetida',
      kind: 'query',
      inputs: [],
    },
    {
      id: 'binding.approveChangeOrder.cmdApproveChangeOrderDecision',
      command: 'cmdApproveChangeOrderDecision',
      description: 'Aprovar a ordem de mudança',
      kind: 'command',
      inputs: [
        { name: 'changeOrderChangeOrderId', source: 'selectedEntity', required: true, presentation: 'selection' },
        { name: 'projectProjectId', source: 'routeParam', required: true, presentation: 'route' },
        { name: 'status', source: 'userInput', required: true, presentation: 'form' },
      ],
    },
  ],
};

const CONTRACT_TYPES = {
  qryLocateChangeOrder: { input: {}, output: { changeOrderId: 'string', status: 'string' } },
  cmdApproveChangeOrderDecision: { input: { status: 'string' }, output: {} },
};

void test('one surface per query, one TRIGGER per command, one entry per form input, one page feedback', () => {
  const regions = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES);
  assert.deepEqual(regions.map(region => region.id), [
    'binding.approveChangeOrder.qryLocateChangeOrder',
    // The command's own trigger comes BEFORE its fields — it is the action they are submitted with.
    'binding.approveChangeOrder.cmdApproveChangeOrderDecision',
    'binding.approveChangeOrder.cmdApproveChangeOrderDecision::status',
    // Last, and page-wide: never tied to a binding.
    'page::feedback',
  ]);
});

void test('the page feedback region names the commands it reports on, and only exists when there are any', () => {
  const feedback = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES).find(region => region.id === 'page::feedback');
  assert.match(feedback!.need, /1 command\(s\) of this page/);
  assert.match(feedback!.need, /Aprovar a ordem de mudança/);
  assert.match(feedback!.need, /ONE surface serves them all/);

  // A page with only a query has nothing to report on.
  const queryOnly = extractRegions({ dataBindings: [{ id: 'b', command: 'qryX', kind: 'query', inputs: [] }] }, {});
  assert.equal(queryOnly.some(region => region.id.startsWith('page::')), false);
});

void test('a command with NO typed field still yields its trigger — it used to vanish entirely', () => {
  // cmdDeleteClient of _102046_ clientCatalogue: its only input is the selected id.
  const regions = extractRegions({
    dataBindings: [{
      id: 'binding.x.cmdDelete',
      command: 'cmdDelete',
      description: 'Excluir Cliente',
      kind: 'command',
      inputs: [{ name: 'clientId', source: 'selectedEntity', required: true, presentation: 'selection' }],
    }],
  }, {});
  // Its trigger, plus the page feedback the command itself makes necessary.
  assert.deepEqual(regions.map(region => region.id), ['binding.x.cmdDelete', 'page::feedback']);
  assert.match(regions[0].need, /ACTIVATES to execute this command/);
  assert.match(regions[0].need, /no typed field of its own/);
  assert.match(regions[0].need, /1 of its input\(s\) come from a row already selected/);
});

void test('a trigger need says it is an action, never a data-entry field', () => {
  const trigger = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES)[1];
  assert.match(trigger.need, /never a data-entry field/);
  assert.match(trigger.need, /1 typed field\(s\) are submitted with it/);
});

void test('a surface whose page feeds a selection is stated to be a SELECTOR, not a passive listing', () => {
  const [surface] = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES);
  // The fixture's command has exactly ONE selection input (changeOrderChangeOrderId); projectProjectId
  // is source 'routeParam', which is context, not a selection.
  assert.match(surface.need, /1 command input\(s\) of this page are populated by selecting a row/);
  assert.match(surface.need, /PICK ONE row/);
  assert.match(surface.need, /SELECTOR, not a passive listing/);
});

void test('a page with no selection input says nothing about selecting — never padded', () => {
  const [surface] = extractRegions({
    dataBindings: [{ id: 'b', command: 'qryX', description: 'List', kind: 'query', inputs: [] }],
  }, {});
  assert.doesNotMatch(surface.need, /PICK ONE row/);
});

void test('a query region need mentions the output fields, from the contract', () => {
  const [queryRegion] = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES);
  assert.match(queryRegion.need, /changeOrderId/);
  assert.match(queryRegion.need, /status/);
});

void test('an entry region need carries the resolved type, never inferred from the field name', () => {
  // [0] surface, [1] trigger, [2] entry — the entry is found by id, not by a positional guess.
  const entryRegion = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES).find(region => region.id.endsWith('::status'));
  assert.match(entryRegion!.need, /type: string/);
});

void test('an entry region need also carries required-ness and how many fields the command types', () => {
  const entryRegion = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES).find(region => region.id.endsWith('::status'));
  // 'status' is the ONLY form input of cmdApproveChangeOrderDecision — the other two are
  // selection/route, which are never entry regions. A one-field command is a single decision, not a form.
  assert.match(entryRegion!.need, /required/);
  assert.match(entryRegion!.need, /1 typed field\(s\) in this command/);
});

void test('a field the contract does not resolve is honestly "unknown", not guessed', () => {
  const regions = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, {});
  const entryRegion = regions.find(region => region.id.endsWith('::status'));
  assert.match(entryRegion!.need, /type: unknown/);
});

void test('a command binding with no inputs at all still contributes its trigger', () => {
  const regions = extractRegions({ dataBindings: [{ id: 'x', command: 'y', kind: 'command', inputs: [] }] }, {});
  assert.deepEqual(regions.map(region => region.id), ['x', 'page::feedback']);
});

void test('a binding of an unknown kind contributes nothing', () => {
  assert.deepEqual(extractRegions({ dataBindings: [{ id: 'x', command: 'y', kind: 'subscription', inputs: [] }] }, {}), []);
});

void test('an empty or malformed definition yields no regions, never throws', () => {
  assert.deepEqual(extractRegions({}, {}), []);
  assert.deepEqual(extractRegions({ dataBindings: 'not-an-array' } as any, {}), []);
});
