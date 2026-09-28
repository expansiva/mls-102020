/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/contracts.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { buildD2ContractsCatalog, type D2ContractCall, type D2ContractField, type D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import { renderD2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/render.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { D2_SHARED_KEYS, buildD2SharedPipeline, captureD2SelectedSnapshot, missingD2SnapshotPreconditions, suggestedD2SharedJudgment, type D2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { assertD2RenderedShared, gateD2Shared, parseD2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/gate.js';
import { parseD2RenderedShared, renderD2Shared } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';
import { parseDefs } from '/_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeCore.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('pinned fixture without d2_23 operation bindings reports the missing binding', () => {
  const input = path.resolve(HERE, '..', 'input20', 'fixtures', 'v1_2');
  const head = path.resolve(HERE, '..', 'contracts30', 'fixtures', 'head', 'l4');
  const backend = json(path.join(input, 'backend.json')); const needs = json(path.join(input, 'needs.json'));
  const entities: Record<string, Ns5OntologyAnyEntity> = {};
  for (const name of readdirSync(path.join(head, 'ontology')).filter(name => name !== 'index.defs.ts')) {
    const entity = defs(path.join(head, 'ontology', name)); entities[text(entity.entityId)] = entity as unknown as Ns5OntologyAnyEntity;
  }
  for (const transition of rows((entities.Consulta as unknown as Record<string, unknown>).transitions)) transition.payload = transition.transitionId === 'registrarAtendimento' ? ['details.attendanceNote'] : [];
  const usecases = rows(backend.usecases);
  const pages = rows(needs.pages).map(raw => { const pageId = text(raw.pageId); const endpoints = rows(backend.endpoints).filter(item => item.page === pageId); const ids = new Set(endpoints.map(item => item.usecaseRef)); return { pageId, actors: strings(raw.actors), endpoints, usecases: usecases.filter(item => ids.has(item.usecaseId)), operationBindings: [] }; });
  assert.throws(
    () => buildD2ContractsCatalog({ module: 'agendaClinica', entities, access: defs(path.join(input, 'access.defs.ts')), pages }),
    /D2_CONTRACT_OPERATION_BINDING_MISSING/,
  );
});

void test('five selected pages emit one exact shared definition and one l2_shared item each', () => {
  const emitted = Array.from({ length: 5 }, (_, index) => {
    const page = selected(`catalog${index}`); const contract = pageContract(page.pageId);
    const judgment = suggestedD2SharedJudgment(page, contract);
    const definition = gated(page, contract, judgment);
    const pipeline = buildD2SharedPipeline('fixture', page.pageId);
    const source = renderD2Shared(definition, pipeline); assertD2RenderedShared(source);
    assert.deepEqual(Object.keys(definition), [...D2_SHARED_KEYS]);
    assert.equal(pipeline.type, 'l2_shared');
    assert.deepEqual(pipeline.dependsFiles, [`l2/fixture/web/contracts/${page.pageId}.defs.ts`, '_102029_.d.ts']);
    assert.deepEqual(pipeline.skills, ['_102020_/l2/agentDefsL2/skills/genD2SharedTs.ts']);
    assert.equal(parseD2RenderedShared(source).pipeline.length, 1);
    assert.equal(Object.hasOwn(pipeline, 'agent'), false);
    assert.match(source, /\.defs\.ts/); assert.doesNotMatch(source, /layoutRef|sections/);
    return { definition, pipeline };
  });
  assert.equal(new Set(emitted.map(item => item.definition.pageId)).size, 5);
  assert.equal(new Set(emitted.map(item => item.pipeline.id)).size, 5);
  for (const item of emitted) { const consumer = { desktop: item.definition, mobile: item.definition }; assert.strictEqual(consumer.desktop, consumer.mobile); }
});

void test('shared parser rejects legacy, empty, multiple, missing skill and orphan id pipelines', () => {
  const page = selected('catalog'); const contract = pageContract(page.pageId);
  const definition = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  const item = buildD2SharedPipeline('fixture', page.pageId);
  const source = renderD2Shared(definition, item);
  assert.throws(() => assertD2RenderedShared(source.replace(JSON.stringify([item], null, 2), JSON.stringify(item, null, 2))), /D2_SHARED_CONSUMER_SHAPE/);
  assert.throws(() => assertD2RenderedShared(source.replace(JSON.stringify([item], null, 2), '[]')), /D2_SHARED_PIPELINE_COUNT/);
  assert.throws(() => assertD2RenderedShared(source.replace(JSON.stringify([item], null, 2), JSON.stringify([item, item], null, 2))), /D2_SHARED_PIPELINE_COUNT/);
  assert.throws(() => assertD2RenderedShared(renderD2Shared(definition, { ...item, skills: [] })), /D2_SHARED_PIPELINE_SKILL/);
  assert.throws(() => assertD2RenderedShared(renderD2Shared(definition, { ...item, id: 'orphan__l2_shared' })), /D2_SHARED_PIPELINE_ID/);
});

void test('actions, contracts, states and bindings close and input sources are non-editable for selection', () => {
  const page = selected('catalog'); const contract = pageContract(page.pageId);
  const definition = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  const ids = new Set(contract.calls.map(call => call.callName));
  assert.ok(definition.actions.filter(item => item.commandRef).every(item => ids.has(item.commandRef!)));
  assert.ok(definition.dataBindings.every(item => ids.has(item.actionId)));
  const selection = definition.states.find(item => item.source === 'selectedEntity')!;
  assert.equal(selection.editable, false); assert.equal(selection.presentation, 'selection');
  assert.equal(definition.actions.find(item => item.actionId === 'deleteRecord')?.operationBinding?.grantRefs[0], 'fixtureGrant');
  assert.ok(definition.actions.find(item => item.actionId === 'deleteRecord')?.operationBinding?.sourceHashes.length);
  assert.ok(definition.states.some(item => item.kind === 'pageStatus' && item.valueSet?.join() === 'idle,loading,empty,success,error'));
});

void test('optional list reference filters need no selection source; command references still do', () => {
  const page = selected('renamedRecords');
  const optionalReference: D2ContractField = { ...field(false), path: 'Record.details.ownerId', name: 'ownerId', derived: false, referenceTo: ['Owner'], children: [] };
  const requiredReference: D2ContractField = { ...optionalReference, path: 'Record.details.requiredOwnerId', name: 'requiredOwnerId', required: true };
  const list = call('listRecords', 'ListRecords', 'list', [optionalReference]);
  const ownerList = call('listOwners', 'ListOwners', 'list', []);
  ownerList.entityId = 'Owner'; ownerList.output = [{ ...field(false), path: 'Owner.id' }];
  const contract: D2PageContract = { pageId: page.pageId, calls: [list] };
  const withoutSource = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  const optionalState = withoutSource.states.find(state => state.ontologyRef === optionalReference.path)!;
  assert.equal(optionalState.source, 'userInput');
  assert.equal(optionalState.required, false);
  assert.equal(withoutSource.actions.some(action => action.kind === 'selection' && action.stateKey === optionalState.stateKey), false);

  const requiredList: D2PageContract = { pageId: page.pageId, calls: [call('listRequiredRecords', 'ListRequiredRecords', 'list', [requiredReference])] };
  assert.throws(() => gated(page, requiredList, suggestedD2SharedJudgment(page, requiredList)), /D2_SHARED_SELECTION_SOURCE_MISSING/);
  const withSource: D2PageContract = { pageId: page.pageId, calls: [list, ownerList] };
  ownerList.output = [{ ...field(false), path: 'Owner.id', derived: true }];
  const sourced = gated(page, withSource, suggestedD2SharedJudgment(page, withSource));
  assert.ok(sourced.actions.some(action => action.kind === 'selection' && action.selection?.sourceActionId === 'listOwners'));

  const update = call('updateRecords', 'UpdateRecords', 'update', [{ ...field(true), path: 'Record.id' }]);
  const commandContract: D2PageContract = { pageId: page.pageId, calls: [update] };
  assert.throws(() => gated(page, commandContract, suggestedD2SharedJudgment(page, commandContract)), /D2_SHARED_SELECTION_SOURCE_MISSING/);
});

void test('DTO paths stay nested, enum values and operational payload provenance are preserved', () => {
  const page = selected('catalog');
  const name: D2ContractField = { ...field(false), path: 'Record.details.name', name: 'name', derived: false, enumValues: ['short', 'full'], children: [] };
  const transitionInput = { ...field(false), path: 'Record.details.eventNote', name: 'eventNote', derived: false, children: [] };
  const create = call('createRecord', 'CreateRecord', 'create', [name]);
  const transition = call('completeRecord', 'CompleteRecord', 'transition', [transitionInput]);
  const contract: D2PageContract = { pageId: page.pageId, calls: [create, transition] };
  const definition = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  const dtoState = definition.states.find(item => item.actionRef === 'createRecord' && item.name === 'name')!;
  assert.deepEqual({ memberName: dtoState.memberName, dtoPath: dtoState.dtoPath, ontologyRef: dtoState.ontologyRef, contractRef: dtoState.contractRef, valueSet: dtoState.valueSet }, {
    memberName: 'stateCreateRecordDetailsName', dtoPath: 'details.name', ontologyRef: 'Record.details.name', contractRef: 'CreateRecordInput.details.name', valueSet: ['short', 'full'],
  });
  const binding = definition.actions.find(item => item.actionId === 'completeRecord')?.operationBinding!;
  assert.deepEqual(binding.transition?.payload, ['Record.details.eventNote']);
  assert.deepEqual(binding.ruleRefs, [{ ruleId: 'fixtureRule', file: 'l4/example/access.defs.ts', symbol: 'canCompleteRecord', description: 'fixture rule' }]);
});

void test('write precondition captures the selected snapshot, stays frozen on refresh and blocks missing or invalid tokens', () => {
  const page = selected('catalog');
  const identity = field(true);
  const token: D2ContractField = { ...field(true), path: 'Record.revisionToken', name: 'revisionToken', scalar: 'number', tsType: 'number', indexed: false, writePrecondition: true };
  const editable: D2ContractField = { ...field(false), path: 'Record.details.name', name: 'name', derived: false, indexed: false };
  const query = call('listRecord', 'ListRecord', 'list', []); query.output = [identity, token, editable];
  const update = call('updateRecord', 'UpdateRecord', 'update', [identity, token, editable]); update.output = [identity, token, editable];
  const contract: D2PageContract = { pageId: page.pageId, calls: [query, update] };
  const definition = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  const state = definition.states.find(item => item.stateKey.endsWith('.updateRecord.input.revisionToken'))!;
  assert.deepEqual({ source: state.source, presentation: state.presentation, editable: state.editable, required: state.required, value: state.defaultValue }, { source: 'selectedEntity', presentation: 'hidden', editable: false, required: true, value: null });
  assert.equal(definition.actions.some(item => item.kind === 'stateSetter' && item.stateKey === state.stateKey), false);
  const binding = definition.dataBindings.find(item => item.actionId === 'updateRecord')!.snapshotPreconditions![0];
  const rows = [{ id: 'A', revisionToken: 4 }, { id: 'B', revisionToken: 9 }];
  assert.equal(captureD2SelectedSnapshot(binding, 'A', rows), 4);
  assert.equal(captureD2SelectedSnapshot(binding, 'A', [{ id: 'A', revisionToken: 5 }], { selectedIdentity: 'A', value: 4 }), 4, 'refresh does not replace the edit token');
  assert.equal(captureD2SelectedSnapshot(binding, 'B', rows, { selectedIdentity: 'A', value: 4 }), 9, 'selection change captures the new record');
  assert.equal(captureD2SelectedSnapshot(binding, null, rows, { selectedIdentity: 'B', value: 9 }), null, 'clearing selection invalidates the token');
  assert.equal(captureD2SelectedSnapshot(binding, 'A', [{ id: 'A', revisionToken: 'bad' }]), null, 'invalid token blocks the command');
  assert.equal(captureD2SelectedSnapshot(binding, 'missing', rows), null, 'missing token blocks the command');
  const actionBinding = definition.dataBindings.find(item => item.actionId === 'updateRecord')!;
  assert.deepEqual(missingD2SnapshotPreconditions(actionBinding, {}), [state.stateKey]);
  assert.deepEqual(missingD2SnapshotPreconditions(actionBinding, { [state.stateKey]: 4 }), [], 'a valid captured token permits request construction');
});

void test('setter ids use the complete nested path and the gate rejects duplicate state/action ids', () => {
  const page = selected('nested');
  const leaf = (branch: string): D2ContractField => ({ path: `Record.${branch}.code`, name: 'code', scalar: 'string', tsType: 'string', required: false, derived: false, writePrecondition: false, indexed: false, collection: false, enumValues: [], referenceTo: [], children: [] });
  const contract: D2PageContract = { pageId: page.pageId, calls: [call('createRecord', 'CreateRecord', 'create', [leaf('left'), leaf('right')])] };
  const definition = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  assert.ok(definition.actions.some(item => item.methodName === 'setCreateRecordLeftCode'));
  assert.ok(definition.actions.some(item => item.methodName === 'setCreateRecordRightCode'));
  assert.notEqual(definition.actions.find(item => item.actionId === 'createRecord')?.methodName, definition.actions.find(item => item.actionId === 'updateRecord')?.methodName);
  assert.equal(new Set(definition.actions.map(item => item.actionId)).size, definition.actions.length);
  contract.calls[0].input.push(leaf('left'));
  assert.throws(() => gated(page, contract, suggestedD2SharedJudgment(page, contract)), /D2_SHARED_(STATE|ACTION)_ID_DUPLICATE/);
});

void test('paths distinct in DTO but equal after public-name normalization get stable unique public names', () => {
  const page = selected('catalog');
  const leaf = (path: string): D2ContractField => ({ ...field(false), path: `Record.details.${path}`, name: path, derived: false });
  const contract: D2PageContract = { pageId: page.pageId, calls: [call('createRecord', 'CreateRecord', 'create', [leaf('a-b'), leaf('a_b')])] };
  const first = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  contract.calls[0].input.reverse();
  const second = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  const members = (definition: typeof first) => Object.fromEntries(definition.states.filter(state => state.dtoPath).map(state => [state.dtoPath!, state.memberName]));
  assert.deepEqual(members(first), members(second));
  assert.equal(new Set(first.states.map(state => state.memberName)).size, first.states.length);
  assert.equal(new Set(first.actions.map(action => action.methodName)).size, first.actions.length);
});

void test('initial loads reject required unavailable input and commands; parameterless query starts', () => {
  const page = selected('catalog'); const contract = pageContract(page.pageId);
  const good = suggestedD2SharedJudgment(page, contract);
  assert.deepEqual(good.initialLoadActionIds, ['listRecord']);
  assert.doesNotThrow(() => gated(page, contract, good));
  assert.throws(() => gated(page, contract, { ...good, initialLoadActionIds: ['getRecord'] }), /D2_SHARED_INITIAL_LOAD_INPUT_UNAVAILABLE/);
  assert.throws(() => gated(page, contract, { ...good, initialLoadActionIds: ['deleteRecord'] }), /D2_SHARED_INITIAL_LOAD_NOT_QUERY/);
});

void test('scenary preconditions cannot borrow an exact stateKey from another action', () => {
  const page = selected('catalog'); const contract = pageContract(page.pageId);
  const judgment = suggestedD2SharedJudgment(page, contract);
  judgment.scenaries.push({
    value: 'detail',
    kind: 'detail',
    actionId: 'getRecord',
    preconditions: ['ui.catalog.deleteRecord.input.id'],
  });
  assert.throws(() => gated(page, contract, judgment), /D2_SHARED_PRECONDITION_UNKNOWN/);
});

void test('destructive behavior requires confirmation and invalid/truncated schema is diagnosed', () => {
  const page = selected('catalog'); const contract = pageContract(page.pageId); const base = suggestedD2SharedJudgment(page, contract);
  const actionBehaviors = base.actionBehaviors.map(item => item.actionId === 'deleteRecord' ? { ...item, confirmation: undefined } : item);
  assert.throws(() => gated(page, contract, { ...base, actionBehaviors }), /D2_SHARED_DESTRUCTIVE_CONFIRMATION/);
  assert.throws(() => parseD2SharedJudgment({ schemaVersion: 'bad' }), /D2_SHARED_SCHEMA_VERSION/);
  assert.throws(() => parseD2SharedJudgment({ schemaVersion: base.schemaVersion, pageId: page.pageId }), /D2_SHARED_SCHEMA_TRUNCATED/);
  assert.throws(() => parseD2SharedJudgment({ ...base, layoutRef: 'x' }), /D2_SHARED_SCHEMA_UNKNOWN_KEY/);
});

void test('skill-compatible shared fixture exposes page behavior and keeps selected entity contextual', () => {
  const source = readFileSync(path.join(HERE, 'fixtures', 'skill', 'items.ts'), 'utf8');
  const contract = readFileSync(path.join(HERE, 'fixtures', 'skill', 'items.defs.ts'), 'utf8');
  assert.match(source, /extends StateLitElement/); assert.match(contract, /ListItemsOutput = ItemRow\[\]/);
  assert.match(source, /execBff<ListItemsOutput>\(listItemsRoute, params/);
  assert.match(source, /stateListItemsError = response\.error/); assert.match(source, /stateListItemsStatus = 'success'/);
  assert.match(source, /enterDeleteItemScenario/); assert.match(source, /selectedItemId/);
  assert.match(source, /setListItemsDetailsName/); assert.match(contract, /ListItemsInput \{ details\?: \{ name\?: string \}; \}/);
  assert.doesNotMatch(source, /setSelectedItemId|customElement|\brender\s*\(/);
});

void test('productive reader retains coverage, labels and public API across renamed fixtures', () => {
  for (const pageId of ['catalog', 'inventory']) {
    const page = selected(pageId); page.organisms = [{ kind: 'list', text: 'Show authorised rows' }, { kind: 'list', text: 'Show related rows' }];
    const contract = pageContract(pageId);
    const definition = gated(page, contract, suggestedD2SharedJudgment(page, contract));
    const parsed = parseDefs(renderD2Shared(definition, buildD2SharedPipeline('fixture', pageId)));
    assert.equal(parsed.items[0].type, 'l2_shared');
    assert.deepEqual((parsed.data as typeof definition).coverage.map(item => [item.organismId, item.contentRef]), [['organism.list.1', 'content.list'], ['organism.list.2', 'content.list']]);
    assert.ok(definition.coverage.every(item => Object.hasOwn(item.outputFieldsByCapability, 'listRecord')));
    assert.equal(definition.actions.find(action => action.actionId === 'set:scenario')?.methodName, 'setScenario');
  }
});

void test('renamed coverage rejects an undeclared capability instead of dropping it', () => {
  const page = selected('renamedInventory');
  page.organisms = [{ organismId: 'inventory.rows', kind: 'list', text: 'Browse records.', capabilityRefs: ['inventedCapability'] }];
  const contract = pageContract(page.pageId);
  assert.throws(() => gated(page, contract, suggestedD2SharedJudgment(page, contract)), /D2_SHARED_COVERAGE_CAPABILITY_UNKNOWN: inventory\.rows/);
});

void test('renamed output coverage resolves ontology fields and declared relation DTO paths without ambiguity', () => {
  const page = selected('renamedLedger');
  page.organisms = [{ organismId: 'ledger.rows', kind: 'list', text: 'Browse authorised records.', capabilityRefs: ['listRecord'] }];
  const list = call('listRecord', 'ListRecord', 'list', []);
  list.relationships = [{ relationshipId: 'recordOwner', to: 'Owner', via: 'Record.ownerId', cardinality: 'N:1', collection: false }];
  const projection: D2ContractField = { ...field(false), path: 'recordOwner', name: 'recordOwner', scalar: 'object', tsType: 'object', derived: false, children: [
    { ...field(true), path: 'recordOwner.id' }, { ...field(true), path: 'recordOwner.label', name: 'label', derived: false },
  ] };
  list.output.push(projection);
  const contract = { pageId: page.pageId, calls: [list] };
  const definition = () => gated(page, contract, suggestedD2SharedJudgment(page, contract));
  assert.deepEqual(definition().coverage[0].outputFieldsByCapability.listRecord.map(item => item.path), ['id', 'recordOwner', 'recordOwner.id', 'recordOwner.label']);
  list.output.push({ ...field(true), path: 'Record.recordOwner', name: 'recordOwner' });
  assert.throws(definition, /D2_SHARED_DTO_PATH_AMBIGUOUS: recordOwner/);
  list.output.pop();
  projection.children[1].path = 'Owner.label';
  assert.throws(definition, /D2_SHARED_DTO_PATH_INVALID: Owner.label/);
  projection.children[1].path = 'recordOwner.label';
  list.relationships = [];
  assert.throws(definition, /D2_SHARED_DTO_PATH_INVALID: recordOwner/);
});

void test('shared accepts structural reads, preserves all actor bindings and omits parent DTO containers', () => {
  const page = selected('catalog');
  const list = call('listRecord', 'ListRecord', 'list', []);
  const name = { ...field(false), path: 'Record.details.name', name: 'name', derived: false, title: 'Display name', description: 'The visible name', enumValues: ['short', 'full'], enumOptions: [{ value: 'short', label: 'Compact' }, { value: 'full', label: 'Complete' }] };
  const parent: D2ContractField = { ...name, path: 'Record.details', name: 'details', scalar: 'object', tsType: 'object', children: [name] };
  const create = call('createRecord', 'CreateRecord', 'create', [parent]);
  const contract = { pageId: page.pageId, calls: [list, create] };
  const binding = { pageId: page.pageId, route: create.route, entityId: create.entityId, operation: create.operation, actorRef: 'one', grantRefs: ['grantOne'], authorities: ['one'], inputFields: [{ path: name.path, origin: 'actor' as const, required: false }], ruleRefs: [], sourceHashes: ['hashOne'] };
  page.operationBindings = [binding, { ...binding, actorRef: 'two', grantRefs: ['grantTwo'], sourceHashes: ['hashTwo'] }];
  const definition = gateD2Shared('fixture', page, contract, suggestedD2SharedJudgment(page, contract));
  assert.equal(definition.states.some(state => state.dtoPath === 'details'), false);
  const state = definition.states.find(state => state.dtoPath === 'details.name')!;
  assert.equal(state.title, 'Display name'); assert.deepEqual(state.enumOptions, name.enumOptions);
  assert.deepEqual(definition.actions.find(action => action.actionId === 'createRecord')!.operationBindings!.map(item => item.actorRef), ['one', 'two']);
  assert.deepEqual(definition.initialLoads.map(item => item.actionId), ['listRecord']);
});

void test('shared keeps a required leaf conditional under absent nested optional objects', () => {
  const page = selected('conditional');
  const leaf: D2ContractField = { ...field(true), path: 'Record.envelope.confirmation.confirmedAt', name: 'confirmedAt', derived: false };
  const confirmation: D2ContractField = { ...leaf, path: 'Record.envelope.confirmation', name: 'confirmation', scalar: 'object', tsType: 'object', required: false, children: [leaf] };
  const envelope: D2ContractField = { ...confirmation, path: 'Record.envelope', name: 'envelope', children: [confirmation] };
  const create = call('createRecord', 'CreateRecord', 'create', [envelope]);
  const contract: D2PageContract = { pageId: page.pageId, calls: [create] };
  const definition = gated(page, contract, suggestedD2SharedJudgment(page, contract));
  const state = definition.states.find(item => item.dtoPath === 'envelope.confirmation.confirmedAt')!;
  assert.equal(state.defaultValue, null);
  assert.equal(state.required, false, 'the input is required only when its optional parent is present');
  assert.equal(definition.states.some(item => item.dtoPath === 'envelope' || item.dtoPath === 'envelope.confirmation'), false);
  const actionBinding = definition.dataBindings.find(item => item.actionId === 'createRecord')!;
  assert.deepEqual(actionBinding.inputStateKeys, [state.stateKey]);

  const source = renderD2Shared(definition, buildD2SharedPipeline('fixture', page.pageId));
  const materialized = parseDefs(source).data as typeof definition;
  assert.equal(materialized.states.find(item => item.dtoPath === state.dtoPath)?.required, false);
  assert.deepEqual(materialized.dataBindings.find(item => item.actionId === 'createRecord')?.inputStateKeys, [state.stateKey]);
  const dto = renderD2PageContract(contract);
  assert.match(dto, /"envelope"\?: \{[\s\S]*"confirmation"\?: \{[\s\S]*"confirmedAt": string/);
});

void test('materialized fixture executes nested requests, selection snapshots, busy, refresh and error preservation through runtime', async () => {
  const host = globalThis as typeof globalThis & { window?: Window; collabBffTransport?: unknown };
  const savedWindow = host.window;
  const savedDocument = globalThis.document;
  Reflect.deleteProperty(globalThis, 'document');
  host.window = new EventTarget() as unknown as Window;
  const bundleFolder = mkdtempSync(path.join(tmpdir(), 'd2-shared-runtime-'));
  try {
    const { build } = await import('esbuild');
    const bundled = await build({ entryPoints: [path.join(HERE, 'fixtures/skill/items.ts')], bundle: true, write: false, format: 'esm', platform: 'node', tsconfigRaw: { compilerOptions: { experimentalDecorators: true } }, plugins: [{ name: 'project-imports', setup(builder) {
      builder.onResolve({ filter: /^\/_\d+_\// }, args => ({ path: path.resolve(HERE, '../../../../..', args.path.replace(/^\/_([0-9]+)_\//, 'mls-$1/').replace(/\.js$/, '.ts')) }));
    } }] });
    const bundlePath = path.join(bundleFolder, 'fixture.mjs'); writeFileSync(bundlePath, bundled.outputFiles[0].text);
    const { ItemsShared } = await import(pathToFileURL(bundlePath).href);
    const page = new ItemsShared();
    const requests: Array<{ routine: string; params: unknown }> = [];
    let revision = 4; let fail = false; let failList = false;
    let release: (() => void) | undefined;
    host.collabBffTransport = { async execBff(request: { routine: string; params: unknown }) {
      requests.push(request);
      if (request.routine.endsWith('qryListItems')) return failList ? { ok: false, data: null, error: { code: 'READ_DENIED', message: 'Read is not available.', details: { grant: 'fixtureGrant' } } } : { ok: true, data: [{ id: 'real-id', name: 'existing', revision }], error: null };
      if (release === undefined) await new Promise<void>(resolve => { release = resolve; });
      return fail ? { ok: false, data: null, error: { code: 'CONFLICT', message: 'Refresh and select again.', details: { expectedRevision: 4, actualRevision: 8 } } } : { ok: true, data: { id: 'real-id', name: 'edited', revision: 5 }, error: null };
    } };
    await page.runListItems(); assert.deepEqual(requests[0].params, {});
    page.selectUpdateItemId('real-id'); page.setUpdateItemDetailsName('edited'); page.setScenario('updateItem');
    const write = page.runUpdateItem(); await Promise.resolve(); await Promise.resolve();
    await page.runUpdateItem();
    assert.equal(requests.filter(request => request.routine.endsWith('cmdUpdateItem')).length, 1);
    release!(); await write;
    assert.deepEqual(requests.find(request => request.routine.endsWith('cmdUpdateItem'))!.params, { id: 'real-id', revision: 4, details: { name: 'edited' } });
    assert.equal(page.scenary, 'base'); assert.equal(requests.filter(request => request.routine.endsWith('qryListItems')).length, 2);
    revision = 8; await page.runListItems(); assert.equal(page.stateUpdateItemRevision, 4);
    page.setListItemsDetailsName('filter'); await page.runListItems();
    assert.deepEqual(requests.at(-1)!.params, { details: { name: 'filter' } });
    assert.equal(page.stateUpdateItemDetailsName, 'edited');
    fail = true; page.setUpdateItemDetailsName('still edited'); await page.runUpdateItem();
    assert.equal(page.stateUpdateItemDetailsName, 'still edited'); assert.equal(page.stateUpdateItemRevision, 4);
    assert.deepEqual(page.stateUpdateItemError, { code: 'CONFLICT', message: 'Refresh and select again.', details: { expectedRevision: 4, actualRevision: 8 } });
    page.selectUpdateItemId(null); const before = requests.length; await page.runUpdateItem(); assert.equal(requests.length, before);
    const currentScenario = page.scenary;
    page.setScenario('deleteItem');
    assert.equal(page.scenary, currentScenario); assert.equal(page.stateUpdateItemDetailsName, 'still edited');
    assert.deepEqual(page.stateDeleteItemError, { code: 'SELECTION_REQUIRED', message: 'Select an item first.' });
    page.setScenario('updateItem');
    assert.deepEqual(page.stateUpdateItemError, { code: 'SELECTION_REQUIRED', message: 'Select an item first.' });
    failList = true; const savedRows = page.stateListItemsResult; await page.runListItems();
    assert.deepEqual(page.stateListItemsError, { code: 'READ_DENIED', message: 'Read is not available.', details: { grant: 'fixtureGrant' } });
    assert.strictEqual(page.stateListItemsResult, savedRows); assert.equal(page.stateListItemsDetailsName, 'filter'); assert.equal(page.pageStatus, 'error');
    failList = false; page.selectUpdateItemId('real-id'); page.setScenario('deleteItem'); release = undefined;
    const deleteWrite = page.runDeleteItem();
    assert.equal(page.stateDeleteItemStatus, 'loading');
    await page.runDeleteItem(); await Promise.resolve(); await Promise.resolve();
    assert.equal(requests.filter(request => request.routine.endsWith('cmdDeleteItem')).length, 1);
    const countBeforeRelease = requests.length; release!(); await deleteWrite;
    assert.equal(requests.length, countBeforeRelease, 'failed delete must not refresh');
    assert.deepEqual(page.stateDeleteItemError, { code: 'CONFLICT', message: 'Refresh and select again.', details: { expectedRevision: 4, actualRevision: 8 } });
    assert.equal(page.selectedItemId, 'real-id'); assert.equal(page.stateUpdateItemDetailsName, 'still edited');
  } finally { host.window = savedWindow; Object.assign(globalThis, { document: savedDocument }); delete host.collabBffTransport; rmSync(bundleFolder, { recursive: true, force: true }); }
});

function selected(pageId: string): D2SelectedPage { return { pageId, status: 'toCreate', label: `Page ${pageId}`, actors: ['actor'], authorityRefs: [], ancestors: [{ id: 'hub', kind: 'group', label: 'Hub', context: 'selection' }], journeyRefs: [], organisms: [], reads: [], writes: [], endpoints: [], usecases: [], destinations: [] }; }
function gated(page: D2SelectedPage, contract: D2PageContract, judgment: D2SharedJudgment) {
  const operationBindings = contract.calls.map(call => ({
    pageId: page.pageId, route: call.route, entityId: call.entityId, operation: call.operation, actorRef: 'operator', grantRefs: ['fixtureGrant'], authorities: ['operator'],
    inputFields: flatten(call.input).map(field => ({ path: field.path, origin: field.writePrecondition ? 'server' as const : 'actor' as const, required: field.required })),
    ...(call.operation === 'transition' ? { transition: { transitionId: call.callName, from: ['ready'], to: 'complete', by: ['operator'], payload: flatten(call.input).filter(field => !field.derived).map(field => field.path) } } : {}),
    ruleRefs: [{ ruleId: 'fixtureRule', file: 'l4/example/access.defs.ts', symbol: `can${call.callPascal}`, description: 'fixture rule' }], sourceHashes: ['fixture-source-hash'],
  }));
  return gateD2Shared('fixture', { ...page, operationBindings }, contract, judgment);
}
function pageContract(pageId: string): D2PageContract { return { pageId, calls: [call('listRecord', 'ListRecord', 'list', []), call('getRecord', 'GetRecord', 'get', [field(true)]), call('deleteRecord', 'DeleteRecord', 'transition', [field(true)])] }; }
function call(callName: string, callPascal: string, operation: D2ContractCall['operation'], input: D2ContractField[]): D2ContractCall { return { callName, callPascal, operation, routeName: `${callName}Route`, route: `fixture.records.${operation === 'list' || operation === 'get' ? 'qry' : 'cmd'}${callPascal}`, entityId: 'Record', actors: ['actor'], relationships: [], input, output: [field(false)], outputShape: operation === 'list' ? 'array' : 'object' }; }
function field(required: boolean): D2ContractField { return { path: 'Record.id', name: 'id', scalar: 'string', tsType: 'string', required, derived: true, writePrecondition: false, indexed: true, collection: false, enumValues: [], referenceTo: [], children: [] }; }
function flatten(fields: D2ContractField[]): D2ContractField[] { return fields.flatMap(field => [field, ...flatten(field.children)]); }
function json(file: string): Record<string, unknown> { return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>; }
function defs(file: string): Record<string, unknown> { const parsed = parseNs4ClassicDefsSource<Record<string, unknown>>(readFileSync(file, 'utf8')); assert.ok(parsed); return parsed; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
function compileConsumer(contract: D2PageContract, sharedSource: string): void {
  const folder = mkdtempSync(path.join(tmpdir(), 'd2-shared-consumer-'));
  try {
    writeFileSync(path.join(folder, `${contract.pageId}.contract.defs.ts`), renderD2PageContract(contract));
    writeFileSync(path.join(folder, `${contract.pageId}.shared.defs.ts`), sharedSource);
    const call = contract.calls[0];
    writeFileSync(path.join(folder, 'consumer.ts'), [`import { definition } from './${contract.pageId}.shared.defs.js';`, `import { ${call.routeName} } from './${contract.pageId}.contract.defs.js';`, `import type { ${call.callPascal}Input, ${call.callPascal}Output } from './${contract.pageId}.contract.defs.js';`, `const route: string = ${call.routeName};`, `const inputRef: '${call.callPascal}Input' = definition.contractRef.calls[0].inputType;`, `const outputRef: '${call.callPascal}Output' = definition.contractRef.calls[0].outputType;`, `let input: ${call.callPascal}Input | null = null; let output: ${call.callPascal}Output | null = null;`, 'void route; void inputRef; void outputRef; void input; void output;'].join('\n'));
    const tsc = path.resolve(HERE, '../../../../..', 'node_modules', '.bin', 'tsc');
    const result = spawnSync(tsc, ['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.ts', `${contract.pageId}.contract.defs.ts`, `${contract.pageId}.shared.defs.ts`], { cwd: folder, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(folder, { recursive: true, force: true }); }
}
