/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/definition.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { D2DefinitionDocument } from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';
import type { D2ContractCall, D2ContractField, D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import { renderD2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/render.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2SharedDefinitionDocument, parseD2SharedDefinitionDocument, validateD2SharedDefinitionAgainstContract } from '/_102020_/l2/agentDefsL2/steps/shared40/definition.js';
import { gateD2SharedDefinitionDocument } from '/_102020_/l2/agentDefsL2/steps/shared40/gate.js';
import { parseD2RenderedSharedDefinitionDocument, renderD2SharedDefinitionDocument } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';

void test('public shared document deduplicates contents and keeps only semantic contract refs', () => {
  const { page, contract, judgment } = fixture();
  const { document, symbols } = buildD2SharedDefinitionDocument('inventory', page, contract, judgment);
  const source = renderD2SharedDefinitionDocument(document);
  const parsed = parseD2RenderedSharedDefinitionDocument(source, symbols);
  assert.deepEqual(parsed, document);
  assert.equal(document.contents.length, 1, 'two organisms share the same content definition');
  assert.equal(document.actions.filter(action => action.id === 'listRecord').length, 1);
  assert.equal(document.scenarios[0].contentRefs.length, 1);
  assert.equal('pipeline' in document, false);
  assert.equal('coverage' in document, false);
  assert.equal('sourceHashes' in document, false);
  assert.equal(JSON.stringify(document).includes('outputFieldsByCapability'), false);
  assert.equal(document.actions.find(action => action.id === 'updateRecord')?.inputs.length, 3);
  assert.equal(document.references.length, 0, 'contract authority is represented once by contractRef');
  const snapshot = document.states.find(state => state.snapshot);
  assert.ok(snapshot);
  assert.equal('initialValue' in snapshot, false, 'write precondition is a selected hidden snapshot, not an editable default');
  assert.equal(snapshot.required, true);
  assert.equal(snapshot.snapshot?.capture, 'onSelection');
  assert.equal(snapshot.snapshot?.missing, 'blockCommandPreserveEdit');
  assert.ok(document.actions.find(action => action.id === 'updateRecord')?.authorityRefs?.some(ref => ref.purpose === 'grant manageRecords'));
  const contractSource = renderD2PageContract(contract);
  for (const action of document.actions) {
    if (!action.callRef) continue;
    assert.ok(contractSource.includes(`export const ${action.callRef.fragment} =`), `callRef must resolve a real contract export: ${action.id}`);
  }
});

void test('gate rejects invented refs, denied fields, and removed selection preconditions', () => {
  const { page, contract, judgment } = fixture();
  const { document, symbols } = buildD2SharedDefinitionDocument('inventory', page, contract, judgment);
  const invented = structuredClone(document);
  invented.contractRef.fragment = 'inventedCall';
  assert.throws(() => parseD2SharedDefinitionDocument(invented, symbols), /D2_DEFINITION_REFERENCE_MISSING/);

  const denied: D2ContractField = { ...field('Record.denied', 'denied', 'boolean', false), required: false };
  const blockedContract = structuredClone(contract);
  blockedContract.calls.find(call => call.callName === 'updateRecord')!.input.push(denied);
  assert.throws(() => gateD2SharedDefinitionDocument('inventory', page, blockedContract, judgment), /D2_SHARED_FIELD_NOT_AUTHORIZED/);

  const removed = structuredClone(judgment);
  removed.scenaries.find(scene => scene.value === 'update')!.preconditions = [];
  assert.throws(() => gateD2SharedDefinitionDocument('inventory', page, contract, removed), /D2_SHARED_PRECONDITION_REMOVED/);
});

void test('contract driven field metadata preserves false, zero, enum values, and per-operation required', () => {
  const { page, contract, judgment } = fixture();
  const quantity = field('Record.details.quantity', 'quantity', 'number', false);
  quantity.enumValues = [];
  const enabled = field('Record.details.enabled', 'enabled', 'boolean', false);
  const create = call('createRecord', 'CreateRecord', 'create', [quantity, enabled]);
  const createContract: D2PageContract = { pageId: page.pageId, calls: [...contract.calls, create] };
  const createBinding = {
    pageId: page.pageId, route: create.route, entityId: create.entityId, operation: create.operation,
    actorRef: 'operator', grantRefs: [], authorities: ['operator'],
    inputFields: [
      { path: quantity.path, origin: 'actor' as const, required: true },
      { path: enabled.path, origin: 'actor' as const, required: false },
    ], ruleRefs: [], sourceHashes: [],
  };
  const createPage: D2SelectedPage = { ...page, operationBindings: [...(page.operationBindings ?? []), createBinding] };
  const createJudgment = {
    ...judgment,
    actionBehaviors: [...judgment.actionBehaviors, { actionId: 'createRecord', refreshActionIds: ['listRecord'], destructive: false }],
  };
  const document = gateD2SharedDefinitionDocument('inventory', createPage, createContract, createJudgment);
  const quantityState = document.states.find(state => state.typeRef?.fragment === 'CreateRecordInput.details.quantity')!;
  const enabledState = document.states.find(state => state.typeRef?.fragment === 'CreateRecordInput.details.enabled')!;
  assert.equal(quantityState.required, true);
  assert.equal(enabledState.required, false);
  assert.deepEqual(parseD2SharedDefinitionDocument({ ...document, states: [{ ...quantityState, initialValue: 0 }, { ...enabledState, initialValue: false }, ...document.states.filter(state => state !== quantityState && state !== enabledState)] }, buildD2SharedDefinitionDocument('inventory', createPage, createContract, createJudgment).symbols).states.slice(0, 2).map(state => state.initialValue), [0, false]);
});

function fixture(): { page: D2SelectedPage; contract: D2PageContract; judgment: { schemaVersion: '2026-09-21-agent-defs-l2-shared-judgment-v1'; pageId: string; scenaries: Array<{ value: string; kind: 'base' | 'command'; actionId: string; preconditions: string[] }>; initialLoadActionIds: string[]; actionBehaviors: Array<{ actionId: string; refreshActionIds: string[]; destructive: boolean; confirmation?: { title: string; description: string } }> } } {
  const pageId = 'records';
  const list = call('listRecord', 'ListRecord', 'list', []);
  list.output = [field('Record.id', 'id', 'string', true, true), field('Record.revision', 'revision', 'number', true, true)];
  const update = call('updateRecord', 'UpdateRecord', 'update', [
    field('Record.id', 'id', 'string', true, true),
    { ...field('Record.revision', 'revision', 'number', true), writePrecondition: true },
    field('Record.details.name', 'name', 'string', false),
  ]);
  const contract: D2PageContract = { pageId, calls: [list, update] };
  const page: D2SelectedPage = {
    pageId, status: 'toCreate', label: 'Records', actors: ['operator'], authorityRefs: [], ancestors: [], journeyRefs: [],
    organisms: [
      { organismId: 'table', kind: 'table', contentRef: 'content.records', text: 'Show current records.' },
      { organismId: 'summary', kind: 'summary', contentRef: 'content.records', text: 'Show current records.' },
    ], reads: [], writes: [], endpoints: [], usecases: [], destinations: [],
    operationBindings: [{
      pageId, route: update.route, entityId: 'Record', operation: 'update', actorRef: 'operator', grantRefs: ['manageRecords'], authorities: ['operator'],
      inputFields: [
        { path: 'Record.id', origin: 'actor', required: true },
        { path: 'Record.revision', origin: 'server', required: true },
        { path: 'Record.details.name', origin: 'actor', required: false },
      ],
      ruleRefs: [{ ruleId: 'recordWritable', file: 'l4/inventory/rules.defs.ts', symbol: 'rules.recordWritable', description: 'Only writable records may change.' }],
      sourceHashes: ['private-hash'],
    }],
  };
  const judgment = {
    schemaVersion: '2026-09-21-agent-defs-l2-shared-judgment-v1' as const,
    pageId,
    scenaries: [
      { value: 'base', kind: 'base' as const, actionId: 'listRecord', preconditions: [] },
      { value: 'update', kind: 'command' as const, actionId: 'updateRecord', preconditions: ['ui.records.updateRecord.input.id'] },
    ],
    initialLoadActionIds: ['listRecord'],
    actionBehaviors: [
      { actionId: 'listRecord', refreshActionIds: [], destructive: false },
      { actionId: 'updateRecord', refreshActionIds: ['listRecord'], destructive: false },
    ],
  };
  return { page, contract, judgment };
}

function call(callName: string, callPascal: string, operation: D2ContractCall['operation'], input: D2ContractField[]): D2ContractCall {
  return { callName, callPascal, operation, routeName: `${callName}Route`, route: `records.${callName}`, entityId: 'Record', actors: ['operator'], relationships: [], input, output: [], outputShape: operation === 'list' ? 'array' : 'object' };
}
function field(path: string, name: string, scalar: D2ContractField['scalar'], required: boolean, derived = false): D2ContractField {
  return { path, name, scalar, tsType: scalar, required, derived, writePrecondition: false, indexed: false, collection: false, enumValues: [], referenceTo: [], children: [] };
}
