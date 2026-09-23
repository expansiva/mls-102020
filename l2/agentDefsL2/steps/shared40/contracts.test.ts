/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/contracts.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { buildD2ContractsCatalog, type D2ContractCall, type D2ContractField, type D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import { renderD2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/render.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { D2_SHARED_KEYS, buildD2SharedPipeline, suggestedD2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { assertD2RenderedShared, gateD2Shared, parseD2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/gate.js';
import { parseD2RenderedShared, renderD2Shared } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('positive pinned fixture with explicit transition payload produces five shared defs/items', () => {
  const input = path.resolve(HERE, '..', 'input20', 'fixtures', 'current');
  const head = path.resolve(HERE, '..', 'contracts30', 'fixtures', 'head', 'l4');
  const backend = json(path.join(input, 'backend.json')); const needs = json(path.join(input, 'needs.json'));
  const entities: Record<string, Ns5OntologyAnyEntity> = {};
  for (const name of readdirSync(path.join(head, 'ontology')).filter(name => name !== 'index.defs.ts')) {
    const entity = defs(path.join(head, 'ontology', name)); entities[text(entity.entityId)] = entity as unknown as Ns5OntologyAnyEntity;
  }
  for (const transition of rows((entities.Consulta as unknown as Record<string, unknown>).transitions)) transition.payload = transition.transitionId === 'registrarAtendimento' ? ['details.attendanceNote'] : [];
  const usecases = rows(backend.usecases);
  const pages = rows(needs.pages).map(raw => { const pageId = text(raw.pageId); const endpoints = rows(backend.endpoints).filter(item => item.page === pageId); const ids = new Set(endpoints.map(item => item.usecaseRef)); return { pageId, actors: strings(raw.actors), endpoints, usecases: usecases.filter(item => ids.has(item.usecaseId)) }; });
  const contracts = buildD2ContractsCatalog({ module: 'agendaClinica', entities, access: defs(path.join(input, 'access.defs.ts')), pages });
  const emitted = contracts.map(contract => { const page = selected(contract.pageId); const definition = gateD2Shared('agendaClinica', page, contract, suggestedD2SharedJudgment(page, contract)); const pipeline = buildD2SharedPipeline('agendaClinica', page.pageId); assertD2RenderedShared(renderD2Shared(definition, pipeline)); return { definition, pipeline }; });
  assert.equal(emitted.length, 5); assert.equal(emitted.filter(item => item.pipeline.type === 'l2_shared').length, 5);
  const contract = contracts[0]; const page = selected(contract.pageId); const definition = gateD2Shared('agendaClinica', page, contract, suggestedD2SharedJudgment(page, contract));
  compileConsumer(contract, renderD2Shared(definition, buildD2SharedPipeline('agendaClinica', page.pageId)));
});

void test('five selected pages emit one exact shared definition and one l2_shared item each', () => {
  const emitted = Array.from({ length: 5 }, (_, index) => {
    const page = selected(`page${index}`); const contract = pageContract(page.pageId);
    const judgment = suggestedD2SharedJudgment(page, contract);
    const definition = gateD2Shared('fixture', page, contract, judgment);
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
  const page = selected('records'); const contract = pageContract(page.pageId);
  const definition = gateD2Shared('fixture', page, contract, suggestedD2SharedJudgment(page, contract));
  const item = buildD2SharedPipeline('fixture', page.pageId);
  const source = renderD2Shared(definition, item);
  assert.throws(() => assertD2RenderedShared(source.replace(JSON.stringify([item], null, 2), JSON.stringify(item, null, 2))), /D2_SHARED_CONSUMER_SHAPE/);
  assert.throws(() => assertD2RenderedShared(source.replace(JSON.stringify([item], null, 2), '[]')), /D2_SHARED_PIPELINE_COUNT/);
  assert.throws(() => assertD2RenderedShared(source.replace(JSON.stringify([item], null, 2), JSON.stringify([item, item], null, 2))), /D2_SHARED_PIPELINE_COUNT/);
  assert.throws(() => assertD2RenderedShared(renderD2Shared(definition, { ...item, skills: [] })), /D2_SHARED_PIPELINE_SKILL/);
  assert.throws(() => assertD2RenderedShared(renderD2Shared(definition, { ...item, id: 'orphan__l2_shared' })), /D2_SHARED_PIPELINE_ID/);
});

void test('actions, contracts, states and bindings close and input sources are non-editable for selection', () => {
  const page = selected('records'); const contract = pageContract(page.pageId);
  const definition = gateD2Shared('fixture', page, contract, suggestedD2SharedJudgment(page, contract));
  const ids = new Set(contract.calls.map(call => call.callName));
  assert.ok(definition.actions.filter(item => item.commandRef).every(item => ids.has(item.commandRef!)));
  assert.ok(definition.dataBindings.every(item => ids.has(item.actionId)));
  const selection = definition.states.find(item => item.source === 'selectedEntity')!;
  assert.equal(selection.editable, false); assert.equal(selection.presentation, 'selection');
  assert.ok(definition.states.some(item => item.kind === 'pageStatus' && item.valueSet?.join() === 'idle,loading,empty,success,error'));
});

void test('setter ids use the complete nested path and the gate rejects duplicate state/action ids', () => {
  const page = selected('nested');
  const leaf = (branch: string): D2ContractField => ({ path: `Record.${branch}.code`, name: 'code', scalar: 'string', tsType: 'string', required: false, derived: false, indexed: false, collection: false, enumValues: [], referenceTo: [], children: [] });
  const contract: D2PageContract = { pageId: page.pageId, calls: [call('createRecord', 'CreateRecord', 'create', [leaf('left'), leaf('right')])] };
  const definition = gateD2Shared('fixture', page, contract, suggestedD2SharedJudgment(page, contract));
  assert.ok(definition.actions.some(item => item.actionId === 'setCreateRecordLeftCode'));
  assert.ok(definition.actions.some(item => item.actionId === 'setCreateRecordRightCode'));
  assert.equal(new Set(definition.actions.map(item => item.actionId)).size, definition.actions.length);
  contract.calls[0].input.push(leaf('left'));
  assert.throws(() => gateD2Shared('fixture', page, contract, suggestedD2SharedJudgment(page, contract)), /D2_SHARED_(STATE|ACTION)_ID_DUPLICATE/);
});

void test('initial loads reject required unavailable input and commands; parameterless query starts', () => {
  const page = selected('records'); const contract = pageContract(page.pageId);
  const good = suggestedD2SharedJudgment(page, contract);
  assert.deepEqual(good.initialLoadActionIds, ['listRecord']);
  assert.doesNotThrow(() => gateD2Shared('fixture', page, contract, good));
  assert.throws(() => gateD2Shared('fixture', page, contract, { ...good, initialLoadActionIds: ['getRecord'] }), /D2_SHARED_INITIAL_LOAD_INPUT_UNAVAILABLE/);
  assert.throws(() => gateD2Shared('fixture', page, contract, { ...good, initialLoadActionIds: ['deleteRecord'] }), /D2_SHARED_INITIAL_LOAD_NOT_QUERY/);
});

void test('scenary preconditions cannot borrow an exact stateKey from another action', () => {
  const page = selected('records'); const contract = pageContract(page.pageId);
  const judgment = suggestedD2SharedJudgment(page, contract);
  judgment.scenaries.push({
    value: 'detail',
    kind: 'detail',
    actionId: 'getRecord',
    preconditions: ['ui.records.deleteRecord.input.id'],
  });
  assert.throws(() => gateD2Shared('fixture', page, contract, judgment), /D2_SHARED_PRECONDITION_UNKNOWN/);
});

void test('destructive behavior requires confirmation and invalid/truncated schema is diagnosed', () => {
  const page = selected('records'); const contract = pageContract(page.pageId); const base = suggestedD2SharedJudgment(page, contract);
  const actionBehaviors = base.actionBehaviors.map(item => item.actionId === 'deleteRecord' ? { ...item, confirmation: undefined } : item);
  assert.throws(() => gateD2Shared('fixture', page, contract, { ...base, actionBehaviors }), /D2_SHARED_DESTRUCTIVE_CONFIRMATION/);
  assert.throws(() => parseD2SharedJudgment({ schemaVersion: 'bad' }), /D2_SHARED_SCHEMA_VERSION/);
  assert.throws(() => parseD2SharedJudgment({ schemaVersion: base.schemaVersion, pageId: page.pageId }), /D2_SHARED_SCHEMA_TRUNCATED/);
  assert.throws(() => parseD2SharedJudgment({ ...base, layoutRef: 'x' }), /D2_SHARED_SCHEMA_UNKNOWN_KEY/);
});

void test('skill-compatible shared fixture exposes page behavior and keeps selected entity contextual', () => {
  const source = readFileSync(path.join(HERE, 'fixtures', 'skill', 'records.ts'), 'utf8');
  assert.match(source, /extends StateLitElement/); assert.match(source, /ListRecordsOutput = \[\]/);
  assert.match(source, /execBff<ListRecordsOutput>\(listRecordsRoute, params/);
  assert.match(source, /response\.error\?\.message/); assert.match(source, /listRecordsStatus = 'success'/);
  assert.match(source, /enterDeleteRecordScenario/); assert.match(source, /selectedRecordId/);
  assert.doesNotMatch(source, /setSelectedRecordId|customElement|\brender\s*\(/);
});

function selected(pageId: string): D2SelectedPage { return { pageId, status: 'toCreate', label: `Page ${pageId}`, actors: ['actor'], authorityRefs: [], ancestors: [{ id: 'hub', kind: 'group', label: 'Hub', context: 'selection' }], journeyRefs: [], organisms: [], reads: [], writes: [], endpoints: [], usecases: [], destinations: [] }; }
function pageContract(pageId: string): D2PageContract { return { pageId, calls: [call('listRecord', 'ListRecord', 'list', []), call('getRecord', 'GetRecord', 'get', [field(true)]), call('deleteRecord', 'DeleteRecord', 'transition', [field(true)])] }; }
function call(callName: string, callPascal: string, operation: D2ContractCall['operation'], input: D2ContractField[]): D2ContractCall { return { callName, callPascal, operation, routeName: `${callName}Route`, route: `fixture.records.${operation === 'list' || operation === 'get' ? 'qry' : 'cmd'}${callPascal}`, entityId: 'Record', actors: ['actor'], relationships: [], input, output: [field(false)], outputShape: operation === 'list' ? 'array' : 'object' }; }
function field(required: boolean): D2ContractField { return { path: 'Record.id', name: 'id', scalar: 'string', tsType: 'string', required, derived: true, indexed: true, collection: false, enumValues: [], referenceTo: [], children: [] }; }
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
