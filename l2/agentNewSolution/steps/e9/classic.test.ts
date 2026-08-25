/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e9/classic.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/tiers.js';
import { compileNs4ClassicL4, transposeNs4ClassicOperation } from '/_102020_/l2/agentNewSolution/steps/e9/classic.js';
import { ns4ClassicDefsSource, parseNs4ClassicDefsSource } from '/_102020_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
// The consumers' OWN parsers. If these read the emission, the wave changed nothing in them.
import { parseWorkspaceDefs } from '/_102021_/l2/agentChangeBackend/helpers/cbWorkspace.js';
import { resolveBffProjection } from '/_102021_/l2/agentChangeBackend/helpers/cbContracts.js';
import { bffCallCommandShape, l4OperationInputs, parseWorkspaceBffCalls, parseWorkspaceSections, frontendOutputShapeForOperation } from '/_102020_/l2/agentChangeFrontend/helpers/cfeL4Contract.js';

const run44 = JSON.parse(readFileSync(new URL('../e8/fixtures/run44-tier-model.json', import.meta.url), 'utf8')) as any;
const sources = (): any => structuredClone({
  journeys: run44.journeys, access: run44.access, ontology: run44.ontology,
  useCases: run44.useCases, workflows: run44.workflows,
});
async function compile() {
  const input = sources();
  const model = deriveNs4E8Model(input);
  return { model, input, l4: await compileNs4ClassicL4(model, input.ontology) };
}

test('the backend parses every emitted workspace with its own parser, unchanged', async () => {
  const { model, l4 } = await compile();
  assert.equal(l4.workspaces.length, model.workspaces.length);
  for (const workspace of l4.workspaces) {
    const parsed = parseWorkspaceDefs(workspace as unknown as Record<string, unknown>, model.moduleName);
    assert.ok(parsed, `${workspace.workspaceId} is unreadable by the backend parser`);
    assert.equal(parsed!.workspaceId, workspace.workspaceId);
    assert.equal(parsed!.bffCalls.length, workspace.bffCalls.length);
    // operationIds are the union of uses[]: the backend derives them, we must agree.
    assert.deepEqual([...parsed!.operationIds].sort(), workspace.operationIds);
    for (const call of parsed!.bffCalls) {
      assert.equal(call.route, `${model.moduleName}.${workspace.workspaceId}.${call.bffId}`);
      const projection = resolveBffProjection(call);
      // One call, at most one collection — the item 0 (b) constraint, held by construction.
      assert.ok(projection.kind === 'object' || projection.kind === 'list');
      if (projection.kind === 'list') assert.ok(projection.itemFields.length, `${call.bffId} projects an empty list`);
      else assert.ok(projection.topFields.length || call.kind === 'command');
      const traced = [...projection.itemFields, ...projection.topFields];
      assert.equal(traced.every(field => field.operationId === call.uses[0].operationId), true,
        `${call.bffId} projects a field the backend cannot trace back to its operation`);
    }
  }
});

test('the frontend resolves every input origin through the operation, in the vocabulary it renders by', async () => {
  const { l4 } = await compile();
  const operationInputs = new Map(l4.operations.map(operation => [operation.operationId, l4OperationInputs(operation)]));
  const boundary = new Set(['userInput', 'selectedEntity', 'routeParam']);
  let rendered = 0;
  for (const workspace of l4.workspaces) {
    const calls = parseWorkspaceBffCalls(workspace as unknown as Record<string, unknown>);
    assert.equal(calls.length, workspace.bffCalls.length);
    for (const call of calls) {
      const shape = bffCallCommandShape(call, operationInputs);
      for (const input of shape.input) {
        // The whole item 0 (c) finding: the origin the page renders by comes from the operation.
        // A fallback to 'userInput' would silently turn a foreign key into an editable text box.
        const declared = l4.operations.find(operation => operation.operationId === call.uses[0])
          ?.inputs.find(item => item.inputId === input.name);
        assert.ok(declared, `${call.bffId}.${input.name} is not traceable to its operation input`);
        assert.equal(input.source, declared!.source);
        if (boundary.has(input.source)) { assert.ok(input.presentation); rendered += 1; }
        else assert.equal(input.presentation, null, `${input.source} must never render as a control`);
      }
    }
  }
  assert.ok(rendered > 0, 'the module renders something');
});

test('a query declares the output shape the frontend expects from its access pattern', async () => {
  const { l4 } = await compile();
  for (const operation of l4.operations.filter(item => item.kind === 'query')) {
    const shape = frontendOutputShapeForOperation(operation);
    const call = l4.workspaces.flatMap(workspace => workspace.bffCalls).find(item => item.uses[0].operationId === operation.operationId);
    if (!call) continue;
    const expected = call.output.kind === 'list' ? 'array' : 'object';
    assert.equal(shape, expected, `${operation.operationId} disagrees with its call about the wire shape`);
  }
});

test('the section organisms the frontend parses point at calls the workspace owns', async () => {
  const { l4 } = await compile();
  for (const workspace of l4.workspaces) {
    const sections = parseWorkspaceSections(workspace as unknown as Record<string, unknown>);
    const queries = new Set(workspace.bffCalls.filter(call => call.kind === 'query').map(call => call.bffId));
    const commands = new Set(workspace.bffCalls.filter(call => call.kind === 'command').map(call => call.bffId));
    for (const section of sections) for (const organism of section.organisms) {
      if (organism.dataSource) assert.ok(queries.has(organism.dataSource), `${workspace.workspaceId}.${organism.dataSource}`);
      if (organism.action) assert.ok(commands.has(organism.action), `${workspace.workspaceId}.${organism.action}`);
    }
  }
});

test('the approval of a change order arrives at the page as a closed verb selector', async () => {
  const { l4 } = await compile();
  const decision = l4.operations.find(operation => operation.operationId === 'approveChangeOrder')!;
  const verb = decision.inputs.find(input => input.fieldRef.endsWith('.status'))!;
  assert.equal(verb.source, 'userInput');
  // The union is read from the ontology through this exact fieldRef — the item 0 (d) chain.
  const [entityId, fieldId] = verb.fieldRef.split('.');
  const field = run44.ontology.entities.find((entity: any) => entity.entityId === entityId)
    .fields.find((item: any) => item.fieldId === fieldId);
  assert.deepEqual(field.enum, ['submitted', 'approved', 'rejected']);
  // And the record it decides on arrives from the page context, never as a typed id.
  const identity = decision.inputs.find(input => input.fieldRef === 'ChangeOrder.changeOrderId')!;
  assert.equal(identity.source, 'selectedEntity');
});

test('R6-3: ontology json stays json on classic outputShape and on the TS contract', async () => {
  const ontology = {
    entities: [{
      entityId: 'ServiceExecution',
      fields: [
        { fieldId: 'serviceExecutionId', type: 'uuid', required: true },
        { fieldId: 'beforeImages', type: 'json', required: false },
        { fieldId: 'afterImages', type: 'json', required: false },
      ],
      storage: { idField: 'serviceExecutionId' },
    }],
  };
  const operation = {
    operationId: 'updateServiceExecution',
    title: 'Update service execution',
    entityRef: 'ServiceExecution',
    entityRefs: ['ServiceExecution'],
    kind: 'command',
    useRules: [],
    story: ['Store before/after images'],
    accessPattern: { kind: 'update' },
    inputs: [{
      inputId: 'beforeImages',
      fieldRef: { entityId: 'ServiceExecution', fieldId: 'beforeImages' },
      required: false,
      source: 'userInput',
      description: 'photos',
    }],
  };
  const classic = transposeNs4ClassicOperation({ workspaces: [], moduleName: 'petShop' } as any, operation as any, ontology as any);
  assert.equal(classic.outputShape.fields.find(field => field.name === 'beforeImages')?.type, 'json');
  assert.equal(classic.outputShape.fields.find(field => field.name === 'afterImages')?.type, 'json');
  assert.equal(classic.inputs[0].fieldRef, 'ServiceExecution.beforeImages');
});

test('each bffCall emits one contract file, named and routed the way the consumers expect', async () => {
  const { model, l4 } = await compile();
  const expected = l4.workspaces.flatMap(workspace => workspace.bffCalls.length);
  assert.equal(l4.contracts.length, expected.reduce((total, count) => total + count, 0));
  const contract = l4.contracts.find(item => item.bffId === 'cmdApproveChangeOrder')!;
  assert.equal(contract.route, `${model.moduleName}.approveChangeOrder.cmdApproveChangeOrder`);
  assert.match(contract.source, /GENERATED MECHANICALLY from/);
  assert.match(contract.source, /export interface CmdApproveChangeOrderInput \{/);
  assert.match(contract.source, /export interface CmdApproveChangeOrderOutput \{/);
  assert.match(contract.source, new RegExp(`export const cmdApproveChangeOrderRoute = '${contract.route}' as const;`));
});

test('the site map indexes every place and lands every profile without ever naming a journey', async () => {
  const { model, l4 } = await compile();
  assert.deepEqual(l4.siteMap.workspaceIds, l4.workspaces.map(workspace => workspace.workspaceId));
  assert.equal(l4.siteMap.landings.length, model.landings.length);
  const journeys = new Set(model.workspaces.filter(workspace => workspace.tier === 'journey').map(workspace => workspace.workspaceId));
  assert.equal(l4.siteMap.landings.some(landing => journeys.has(landing.workspaceId)), false);
  // A journey is reachable: the hub edges are how you get there.
  assert.ok(l4.siteMap.navigationEdges.some(edge => journeys.has(edge.to)));
});

test('the transposition is canonical: the same approved model emits byte-identical L4', async () => {
  const first = await compile();
  const second = await compile();
  assert.deepEqual(second.l4.workspaces, first.l4.workspaces);
  assert.deepEqual(second.l4.operations, first.l4.operations);
  assert.deepEqual(second.l4.contracts.map(item => item.source), first.l4.contracts.map(item => item.source));
  assert.deepEqual(second.l4.siteMap, first.l4.siteMap);
});

test('a contract types its inputs from the ontology, not from a lucky match on an output path', async () => {
  const { l4 } = await compile();
  const numeric = l4.operations.flatMap(operation => operation.inputs
    .filter(input => run44.ontology.entities.find((entity: any) => entity.entityId === input.fieldRef.split('.')[0])
      ?.fields.find((field: any) => field.fieldId === input.fieldRef.split('.')[1])?.type === 'number')
    .map(input => ({ operationId: operation.operationId, inputId: input.inputId })));
  assert.ok(numeric.length, 'the module has a numeric input to type');

  const call = l4.workspaces.flatMap(workspace => workspace.bffCalls)
    .find(item => item.uses[0].operationId === numeric[0].operationId)!;
  const input = call.input.find(item => item.name === numeric[0].inputId)!;
  assert.equal(input.type, 'number');
  const contract = l4.contracts.find(item => item.bffId === call.bffId)!;
  assert.match(contract.source, new RegExp(`${input.name}\\??: number;`));
});

test('every route names the workspace that owns the call, even when two journeys share a step id', async () => {
  const { model, l4 } = await compile();
  const repeated = new Map<string, number>();
  model.workspaces.forEach(workspace => workspace.bffCalls.forEach(call =>
    repeated.set(call.bffId, (repeated.get(call.bffId) || 0) + 1)));
  assert.ok([...repeated.values()].some(count => count > 1), 'the module reuses a bffId across workspaces');
  for (const workspace of l4.workspaces) {
    for (const call of workspace.bffCalls) {
      assert.equal(call.route, `${model.moduleName}.${workspace.workspaceId}.${call.bffId}`);
    }
  }
  assert.equal(new Set(l4.workspaces.flatMap(workspace => workspace.bffCalls.map(call => call.route))).size,
    l4.workspaces.reduce((total, workspace) => total + workspace.bffCalls.length, 0), 'every route is unique');
});

test('what E9 writes is what E10 reads back: the defs round trip, not an in-memory shortcut', async () => {
  const { l4 } = await compile();
  const fileInfo = { project: 102046, level: 4 as const, folder: 'buildFlowFsm44/workspaces', shortName: 'x', extension: '.defs.ts' };

  // E9 writes an untyped defs file; E10 reads it with the same extractor readNs4DefsJson uses.
  for (const workspace of l4.workspaces) {
    const source = ns4ClassicDefsSource({ ...fileInfo, shortName: workspace.workspaceId }, `${workspace.workspaceId}Workspace`, workspace);
    assert.match(source, /^\/\/\/ <mls fileReference=/);
    assert.deepEqual(parseNs4ClassicDefsSource(source), workspace, `${workspace.workspaceId} does not survive the write/read round trip`);
  }
  for (const operation of l4.operations.slice(0, 5)) {
    const source = ns4ClassicDefsSource({ ...fileInfo, folder: 'buildFlowFsm44/operations', shortName: operation.operationId }, `operation${operation.operationId}`, operation);
    assert.deepEqual(parseNs4ClassicDefsSource(source), operation);
  }
  const siteMap = ns4ClassicDefsSource({ ...fileInfo, folder: 'buildFlowFsm44', shortName: 'siteMap' }, 'siteMap', l4.siteMap);
  assert.deepEqual(parseNs4ClassicDefsSource(siteMap), l4.siteMap);

  // A contract file is raw TypeScript source, read as text and never parsed as defs data.
  assert.equal(parseNs4ClassicDefsSource(l4.contracts[0].source), null);
});

test('the mdm block survives to the classic operation without breaking either consumer parser', async () => {
  const { model, l4 } = await compile();
  const classicOf = (operationId: string) => l4.operations.find(operation => operation.operationId === operationId)!;

  // The lifecycle pair keeps a kind the consumer already understands; the meaning
  // rides in the mdm block.
  const inactivate = classicOf('inactivateClient');
  assert.equal(inactivate.accessPattern.kind, 'update');
  assert.equal(inactivate.kind, 'update');
  assert.deepEqual(inactivate.mdm, { lifecycle: 'inactivate' });
  assert.deepEqual(classicOf('reactivateClient').mdm, { lifecycle: 'reactivate' });
  assert.deepEqual(classicOf('listClient').mdm, { activeFilterInput: 'includeInactive', situationOutput: 'active' });

  // No delete of master data reaches the emission at all.
  assert.equal(l4.operations.some(operation => operation.operationId === 'deleteClient'), false);
  // And an entity outside master data emits no block.
  assert.equal(classicOf('deleteChangeOrder').mdm, undefined);
  assert.equal(classicOf('listChangeOrder').mdm, undefined);

  // The block survives the write/read round trip, which is how the consumers
  // actually receive it — not an in-memory shortcut.
  const fileInfo = { project: 102046, level: 4 as const, folder: 'buildFlowFsm44/operations', shortName: 'x', extension: '.defs.ts' };
  const source = ns4ClassicDefsSource({ ...fileInfo, shortName: inactivate.operationId }, `operation${inactivate.operationId}`, inactivate);
  assert.deepEqual(parseNs4ClassicDefsSource(source), inactivate);

  // The consumers' OWN parsers still read the emission: an optional field they do
  // not know about must not change what they resolve.
  const workspace = l4.workspaces.find(item => item.workspaceId === 'clientCatalogue')!;
  const parsed = parseWorkspaceDefs(workspace as unknown as Record<string, unknown>, model.moduleName);
  assert.ok(parsed, 'the backend parser still reads the master-data catalogue');
  assert.equal(parsed!.bffCalls.length, workspace.bffCalls.length);
  const calls = parseWorkspaceBffCalls(workspace as never);
  assert.ok(calls.some(call => call.bffId === 'cmdInactivateClient'), 'the frontend parser sees the new command');
  assert.equal(calls.some(call => call.bffId === 'cmdDeleteClient'), false);
  assert.ok(parseWorkspaceSections(workspace as never).length, 'the frontend parser still reads the sections');
  assert.equal(l4OperationInputs(inactivate as never).length, 1, 'the lifecycle command takes the identity only');
});

test('a catalogue list contract types search as string and sortBy as a closed enum', async () => {
  const { l4 } = await compile();
  const listClient = l4.operations.find(operation => operation.operationId === 'listClient')!;
  assert.equal(listClient.inputs.find(input => input.inputId === 'search')?.fieldRef, 'Client.name');
  const clientCall = l4.workspaces.flatMap(workspace => workspace.bffCalls)
    .find(call => call.bffId === 'qryListClient' && call.route.includes('clientCatalogue'))!;
  assert.equal(clientCall.input.find(input => input.name === 'search')?.type, 'string');
  const clientContract = l4.contracts.find(item => item.bffId === 'qryListClient' && item.workspaceId === 'clientCatalogue')!;
  assert.match(clientContract.source, /search\?: string;/);

  const listChangeOrder = l4.operations.find(operation => operation.operationId === 'listChangeOrder')!;
  assert.deepEqual(listChangeOrder.inputs.find(input => input.inputId === 'sortBy')?.enumValues, ['submittedAt', 'status', 'decidedAt']);
  const changeContract = l4.contracts.find(item => item.bffId === 'qryListChangeOrder' && item.workspaceId === 'changeOrderCatalogue')!;
  assert.match(changeContract.source, /sortBy\?: 'submittedAt' \| 'status' \| 'decidedAt';/);
  assert.match(changeContract.source, /sortOrder\?: 'asc' \| 'desc';/);
  const workspace = l4.workspaces.find(item => item.workspaceId === 'changeOrderCatalogue')!;
  const recordList = workspace.sections.find(section => section.sectionId === 'recordList')!;
  assert.equal(recordList.organisms.find(organism => organism.role === 'filterControl')?.attachTo, 'qryListChangeOrder');
});
