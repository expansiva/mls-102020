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

void test('one region per query binding, and one per form input — never selection/route', () => {
  const regions = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES);
  assert.deepEqual(regions.map(region => region.id), [
    'binding.approveChangeOrder.qryLocateChangeOrder',
    'binding.approveChangeOrder.cmdApproveChangeOrderDecision::status',
  ]);
});

void test('a query region need mentions the output fields, from the contract', () => {
  const [queryRegion] = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES);
  assert.match(queryRegion.need, /changeOrderId/);
  assert.match(queryRegion.need, /status/);
});

void test('an entry region need carries the resolved type, never inferred from the field name', () => {
  const [, entryRegion] = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, CONTRACT_TYPES);
  assert.match(entryRegion.need, /type: string/);
});

void test('a field the contract does not resolve is honestly "unknown", not guessed', () => {
  const regions = extractRegions(APPROVE_CHANGE_ORDER_DEFINITION, {});
  const entryRegion = regions.find(region => region.id.endsWith('::status'));
  assert.match(entryRegion!.need, /type: unknown/);
});

void test('a binding with no inputs and no kind "query" contributes no region', () => {
  const regions = extractRegions({ dataBindings: [{ id: 'x', command: 'y', kind: 'command', inputs: [] }] }, {});
  assert.deepEqual(regions, []);
});

void test('an empty or malformed definition yields no regions, never throws', () => {
  assert.deepEqual(extractRegions({}, {}), []);
  assert.deepEqual(extractRegions({ dataBindings: 'not-an-array' } as any, {}), []);
});
