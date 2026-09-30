/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts30/contracts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import {
  D2ContractDerivationError,
  buildD2ContractsCatalog,
  collectD2EntityFields,
  type D2ContractField,
  type D2ContractsSources,
} from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import { assertD2RenderedContract, renderD2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/render.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HEAD = path.join(HERE, 'fixtures', 'head');
void test('canonical head fixture remains byte-pinned independently from renamed behavior fixtures', () => {
  const provenance = JSON.parse(readFileSync(path.join(HEAD, 'provenance.json'), 'utf8')) as { commit: string; sha256: Record<string, string> };
  assert.equal(provenance.commit, 'a2f929ed8778c9d8240ac445d6206d401434fdc9');
  for (const [relative, expected] of Object.entries(provenance.sha256)) {
    assert.equal(createHash('sha256').update(readFileSync(path.join(HEAD, 'l4', relative))).digest('hex'), expected, relative);
  }
});
void test('nested catalog preserves paths, metadata, enum codes, references and collections', () => {
  const fields = collectD2EntityFields(syntheticNestedEntity());
  const flat = flatten(fields);
  assert.ok(flat.some(field => field.path === 'Example.left.code'));
  assert.ok(flat.some(field => field.path === 'Example.right.code'));
  assert.equal(new Set(flat.map(field => field.path)).size, flat.length);
  const status = flat.find(field => field.path === 'Example.status')!;
  assert.deepEqual(status.enumValues, ['open', 'closed']);
  assert.deepEqual(status.enumOptions, [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]);
  assert.equal(status.tsType, '"open" | "closed"');
  assert.equal(status.required, true);
  const named = flat.find(field => field.path === 'Example.left.code')!;
  assert.equal(named.title, 'Public code');
  assert.equal(named.description, 'A human-readable code.');
  const stringOptions = flat.find(field => field.path === 'Example.mode')!;
  assert.deepEqual(stringOptions.enumValues, ['quiet', 'active']);
  assert.deepEqual(stringOptions.enumOptions, [{ value: 'quiet', label: 'quiet' }, { value: 'active', label: 'active' }]);
  const reference = flat.find(field => field.path === 'Example.ownerId')!;
  assert.deepEqual(reference.referenceTo, ['Owner']);
  const tags = flat.find(field => field.path === 'Example.tags')!;
  assert.equal(tags.collection, true);
});

void test('renamed fixture contracts obey canonical writable derivation, grants and exact routes', () => {
    const pages = buildD2ContractsCatalog(renamedFixtureSources());
  assert.equal(pages.length, 5);
  assert.equal(pages.flatMap(page => page.calls).length, 7);
  const professional = pages.find(page => page.pageId === 'team_records')!;
  const receptionist = pages.find(page => page.pageId === 'staff_records')!;
  const receptionistRegistration = pages.find(page => page.pageId === 'staff_registration')!;
  const list = professional.calls.find(call => call.callName === 'listRecord')!;
  assert.equal(list.outputShape, 'array');
  assert.ok(flatten(list.input).filter(field => field.name !== 'page').every(field => field.indexed));
  assert.ok(flatten(list.input).filter(field => field.name !== 'page').every(field => !field.required), 'list filters are optional unless an operation binding requires them');
  assert.ok(flatten(list.input).some(field => field.name === 'page'));
  const status = flatten(list.output).find(field => field.path === 'Record.state')!;
  assert.equal(status.tsType, '"ready" | "closed"');
  assert.equal(status.required, true);
  assert.deepEqual(list.relationships.map(item => [item.relationshipId, item.to, item.collection]), [['recordOwner', 'Owner', false]]);
  assert.ok(flatten(list.output).some(field => field.path === 'recordOwner.id'));
  assert.ok(flatten(list.output).some(field => field.path === 'recordOwner.label'));
  const professionalTransition = professional.calls.find(call => call.callName === 'closeRecord')!;
  assert.ok(flatten(professionalTransition.input).some(field => field.path === 'Record.details.eventNote'));
  const receptionistPaths = receptionist.calls.flatMap(call => flatten(call.output).map(field => field.path));
  assert.equal(receptionistPaths.includes('Record.details.eventNote'), true);
  const create = receptionistRegistration.calls.find(call => call.callName === 'createRecord')!;
  assert.equal(flatten(create.input).some(field => field.derived), false);
  const update = receptionistRegistration.calls.find(call => call.callName === 'updateRecord')!;
  assert.ok(flatten(update.input).some(field => field.name === 'id' && field.derived));
  assert.ok(pages.flatMap(page => page.calls).every(call => call.route === `sample.${pages.find(page => page.calls.includes(call))!.pageId}.${call.route.startsWith(`sample.${pages.find(page => page.calls.includes(call))!.pageId}.qry`) ? 'qry' : 'cmd'}${call.callPascal}`));
});

void test('renamed record fixture emits operation DTOs, optional filters, server assignment and deny boundaries', () => {
  const sources = genericOperationSources();
  const calls = buildD2ContractsCatalog(sources)[0].calls;
  const flattenPaths = (name: string) => flatten(calls.find(call => call.callName === name)!.input).map(field => field.path);
  const list = calls.find(call => call.callName === 'listRecord')!;
  assert.ok(flatten(list.input).filter(field => field.name !== 'page').every(field => !field.required));
  assert.deepEqual(flattenPaths('getRecord'), ['Record.id']);
  assert.deepEqual(flattenPaths('createRecord').sort(), ['Record.details', 'Record.details.publicName', 'Record.ownerId']);
  assert.equal(flatten(calls.find(call => call.callName === 'createRecord')!.input).find(field => field.path === 'Record.ownerId')?.required, true);
  assert.equal(flatten(calls.find(call => call.callName === 'createRecord')!.input).find(field => field.path === 'Record.details.publicName')?.required, true);
  assert.deepEqual(flattenPaths('updateRecord').sort(), ['Record.details', 'Record.details.publicName', 'Record.id', 'Record.revision']);
  assert.deepEqual(flattenPaths('completeRecord').sort(), ['Record.details', 'Record.details.eventNote', 'Record.id', 'Record.revision']);
  assert.equal(calls.flatMap(call => flatten(call.output)).some(field => field.path === 'Record.details.privateFlag'), false);
  const deniedBinding = structuredClone(sources);
  deniedBinding.pages[0].operationBindings.find(item => item.route.endsWith('cmdCreateRecord'))!.inputFields.push({ path: 'Record.details.privateFlag', origin: 'actor', required: false });
  assert.throws(() => buildD2ContractsCatalog(deniedBinding), (error: unknown) => error instanceof D2ContractDerivationError
    && error.issues.some(issue => issue.code === 'D2_CONTRACT_OPERATION_PATH_FORBIDDEN' && issue.path === 'Record.details.privateFlag'));
});

void test('optional object ancestors keep required descendants conditional in the rendered DTO', () => {
  const sources = genericOperationSources();
  const record = sources.entities.Record as unknown as Record<string, unknown>;
  const fields = rec(rec(record.record).fields);
  const details = rec(fields.details);
  details.required = false;
  rec(details.fields).telephoneConfirmation = { type: 'object', fields: { confirmedAt: { type: 'timestamp', required: true } } };
  fields.entries = { type: 'array', collection: true, fields: { code: { type: 'string', required: true } } };
  fields.mandatory = { type: 'object', required: true, fields: { value: { type: 'string', required: true } } };
  const page = sources.pages[0];
  const createEndpoint = page.endpoints.find(endpoint => endpoint.usecaseRef === 'createRecord')!;
  const binding = page.operationBindings.find(item => item.route === createEndpoint.route)!;
  binding.inputFields.push(
    { path: 'Record.details.telephoneConfirmation.confirmedAt', origin: 'actor', required: true },
    { path: 'Record.entries.code', origin: 'actor', required: true },
    { path: 'Record.mandatory.value', origin: 'actor', required: true },
  );

  const call = buildD2ContractsCatalog(sources)[0].calls.find(item => item.callName === 'createRecord')!;
  const byPath = new Map(flatten(call.input).map(field => [field.path, field]));
  assert.equal(byPath.get('Record.details')?.required, false);
  assert.equal(byPath.get('Record.details.telephoneConfirmation')?.required, false);
  assert.equal(byPath.get('Record.details.telephoneConfirmation.confirmedAt')?.required, true);
  assert.equal(byPath.get('Record.entries')?.required, false);
  assert.equal(byPath.get('Record.entries.code')?.required, true);
  assert.equal(byPath.get('Record.mandatory')?.required, true);

  const rendered = renderD2PageContract({ pageId: 'records', calls: [call] });
  assert.match(rendered, /"details"\?: \{[\s\S]*"telephoneConfirmation"\?: \{[\s\S]*"confirmedAt": string/);
  assert.match(rendered, /"entries"\?: Array<\{[\s\S]*"code": string/);
  assert.match(rendered, /"mandatory": \{[\s\S]*"value": string/);

  const folder = mkdtempSync(path.join(tmpdir(), 'd2-conditional-contract-'));
  try {
    writeFileSync(path.join(folder, 'records.defs.ts'), rendered);
    writeFileSync(path.join(folder, 'consumer.ts'), [
      "import type { CreateRecordInput } from './records.defs.js';",
      "const omitted: CreateRecordInput = { ownerId: 'owner', mandatory: { value: 'y' } };",
      "const complete: CreateRecordInput = { ownerId: 'owner', details: { publicName: 'name', telephoneConfirmation: { confirmedAt: 'now' } }, entries: [{ code: 'x' }], mandatory: { value: 'y' } };",
      'void omitted; void complete;',
    ].join('\n'));
    const tsc = path.resolve(HERE, '../../../../..', 'node_modules', '.bin', 'tsc');
    const valid = spawnSync(tsc, ['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.ts', 'records.defs.ts'], { cwd: folder, encoding: 'utf8' });
    assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
    writeFileSync(path.join(folder, 'consumer.ts'), [
      "import type { CreateRecordInput } from './records.defs.js';",
      "const invalid: CreateRecordInput = { ownerId: 'owner', details: { publicName: 'name', telephoneConfirmation: {} }, mandatory: { value: 'y' } };",
      'void invalid;',
    ].join('\n'));
    const invalid = spawnSync(tsc, ['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.ts', 'records.defs.ts'], { cwd: folder, encoding: 'utf8' });
    assert.notEqual(invalid.status, 0, 'an included optional parent still enforces its required child');
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

void test('canonical index controls distinct relation keys to the same target and target grants', () => {
  const sources = renamedFixtureSources();
  sources.pages = sources.pages.filter(page => page.pageId === 'team_records');
  const index = sources.ontologyIndex as { relationships: Array<Record<string, unknown>> };
  index.relationships.push({ relationshipId: 'recordReviewers', from: 'Record', to: 'Owner', type: 'oneToMany', required: true, field: 'Record.ownerId' });
  const list = () => buildD2ContractsCatalog(sources).find(page => page.pageId === 'team_records')!.calls.find(call => call.callName === 'listRecord')!;
  assert.deepEqual(list().relationships.map(item => [item.relationshipId, item.collection]), [['recordOwner', false], ['recordReviewers', true]]);
  assert.deepEqual(list().output.filter(field => field.referenceTo.includes('Owner') && field.children.length).map(field => [field.name, field.collection, field.children.map(child => child.name)]), [
    ['recordOwner', false, ['id', 'label']], ['recordReviewers', true, ['id', 'label']],
  ]);
  const rendered = renderD2PageContract({ pageId: 'team_records', calls: [list()] });
  assert.match(rendered, /"recordReviewers"\?: Array<\{/);
  assert.match(rendered, /"recordOwner"\?: \{/);
  index.relationships[0].required = false;
  assert.deepEqual(list().relationships.map(item => item.relationshipId), ['recordReviewers']);
  assert.equal(list().output.some(field => field.name === 'recordOwner'), false);
  const grant = rows(rec(sources.access).grants).find(item => item.grantId === 'ownerGrant')!;
  rec(grant.disclosure).deniedFields = ['Owner.label'];
  assert.deepEqual(list().relationships, []);
  assert.equal(list().output.some(field => field.name === 'recordReviewers'), false);
  rec(grant.disclosure).deniedFields = ['Owner.id'];
  assert.deepEqual(list().relationships, []);
});

void test('list honors an explicit required filter binding and remains optional without one', () => {
  const sources = genericOperationSources();
  const listInput = () => flatten(buildD2ContractsCatalog(sources)[0].calls.find(call => call.callName === 'listRecord')!.input);
  assert.ok(listInput().filter(field => field.name !== 'page').every(field => !field.required));
  const binding = structuredClone(sources.pages[0].operationBindings[0]);
  binding.route = sources.pages[0].endpoints.find(endpoint => endpoint.usecaseRef === 'listRecord')!.route;
  binding.operation = 'list';
  binding.inputFields = [{ path: 'Record.ownerId', origin: 'actor', required: true }];
  sources.pages[0].operationBindings.push(binding);
  assert.equal(listInput().find(field => field.path === 'Record.ownerId')?.required, true);
  assert.ok(listInput().filter(field => field.path !== 'Record.ownerId').every(field => !field.required));
  binding.actorRef = 'unselected';
  assertCode(() => buildD2ContractsCatalog(sources), 'D2_CONTRACT_OPERATION_BINDING_AMBIGUOUS');
});

void test('write preconditions are metadata-driven and remain separate from writable payloads', () => {
  const sources = renamedFixtureSources();
  const pages = buildD2ContractsCatalog(sources);
  const calls = pages.find(page => page.pageId === 'staff_registration')!.calls;
  const create = calls.find(call => call.callName === 'createRecord')!;
  const update = calls.find(call => call.callName === 'updateRecord')!;
  const token = flatten(update.input).find(field => field.path === 'Record.revision');
  assert.equal(token?.writePrecondition, true);
  assert.equal(token?.required, true);
  assert.equal(flatten(create.input).some(field => field.writePrecondition), false);
  assert.equal(flatten(update.input).filter(field => field.path === 'Record.revision').length, 1);
  const transition = pages.find(page => page.pageId === 'team_records')!.calls.find(call => call.callName === 'closeRecord')!;
  assert.deepEqual(flatten(transition.input).filter(field => field.writePrecondition).map(field => field.path), ['Record.revision']);
  assert.ok(flatten(transition.input).some(field => field.path === 'Record.details.eventNote'));
  const renderedUpdate = renderD2PageContract({ pageId: 'staff_registration', calls: [update] });
  assert.match(renderedUpdate, /"revision": number;/);
  assert.doesNotMatch(renderedUpdate, /privateFlag/);
});

void test('missing or invalid payload, unsupported types, invalid grants and changed routes are identified', () => {
  const missingPayload = renamedFixtureSources();
  const missingEntity = structuredClone(missingPayload.entities.Record) as unknown as Record<string, unknown>;
  delete rows(missingEntity.transitions)[0].payload;
  missingPayload.entities.Record = missingEntity as unknown as Ns5OntologyAnyEntity;
  assert.throws(() => buildD2ContractsCatalog(missingPayload), (error: unknown) => error instanceof D2ContractDerivationError
    && error.issues.some(issue => issue.code === 'D2_CONTRACT_TRANSITION_PAYLOAD_MISSING' && issue.path === 'Record.transitions.closeRecord'));

  const badType = renamedFixtureSources();
  const record = structuredClone(badType.entities.Record) as unknown as Record<string, unknown>;
  rec(rec(rec(record.record).fields).details).fields = { quantum: { type: 'quantum' } };
  badType.entities.Record = record as unknown as Ns5OntologyAnyEntity;
  assertCode(() => buildD2ContractsCatalog(badType), 'D2_CONTRACT_TYPE_UNSUPPORTED');

  const badPayload = renamedFixtureSources();
  const payloadEntity = structuredClone(badPayload.entities.Record) as unknown as Record<string, unknown>;
  rows(payloadEntity.transitions)[0].payload = ['details.missing'];
  badPayload.entities.Record = payloadEntity as unknown as Ns5OntologyAnyEntity;
  const badBinding = badPayload.pages.find(page => page.pageId === 'team_records')!.operationBindings.find(binding => binding.operation === 'transition')!;
  badBinding.transition!.payload = ['details.missing'];
  assertCode(() => buildD2ContractsCatalog(badPayload), 'D2_CONTRACT_TRANSITION_PATH_INVALID');

  const badGrant = renamedFixtureSources();
  const access = structuredClone(badGrant.access) as Record<string, unknown>;
  const grant = rows(access.grants).find(item => item.grantId === 'recordGrant')!;
  rec(grant.disclosure).allowedFields = ['Record.missing'];
  rec(grant.disclosure).mode = 'fieldsOnly';
  badGrant.access = access;
  assertCode(() => buildD2ContractsCatalog(badGrant), 'D2_CONTRACT_GRANT_PATH_INVALID');

  const changedRoute = renamedFixtureSources();
  changedRoute.pages[0].endpoints[0].route = 'sample.changed.route';
  assertCode(() => buildD2ContractsCatalog(changedRoute), 'D2_CONTRACT_ROUTE_CHANGED');

  const ambiguousActor = renamedFixtureSources();
  ambiguousActor.pages.find(page => page.pageId === 'staff_records')!.actors.push('secondOperator');
  (ambiguousActor.access as { grants: Array<Record<string, unknown>> }).grants.push({
    grantId: 'recordGrantSecond', actorRef: 'secondOperator', entityRefs: ['Record'],
    disclosure: { mode: 'fullRecord', allowedFields: [], deniedFields: [] },
  });
  assertCode(() => buildD2ContractsCatalog(ambiguousActor), 'D2_CONTRACT_GRANT_AMBIGUOUS');
});

void test('rendered defs are safe, static pages are empty and a .defs.js consumer compiles', () => {
  const contract = buildD2ContractsCatalog(renamedFixtureSources()).find(page => page.pageId === 'team_records')!;
  const source = renderD2PageContract(contract);
  assertD2RenderedContract(source, contract);
  assert.doesNotMatch(source, /\bany\b|\bunknown\b|items:|pageSize:|total:/);
  assert.equal(source.includes('pipeline'), false);
  assert.equal(renderD2PageContract({ pageId: 'static', calls: [] }), 'export {};\n');

  const folder = mkdtempSync(path.join(tmpdir(), 'd2-contract-'));
  try {
    writeFileSync(path.join(folder, 'team_records.defs.ts'), source);
    writeFileSync(path.join(folder, 'consumer.ts'), [
      "import { listRecordRoute } from './team_records.defs.js';",
      "import type { ListRecordOutput, CloseRecordInput } from './team_records.defs.js';",
      "const route: 'sample.team_records.qryListRecord' = listRecordRoute;",
      'const output: ListRecordOutput = [];',
      'const input: CloseRecordInput | null = null;',
      'void route; void output; void input;',
    ].join('\n'));
    const tsc = path.resolve(HERE, '../../../../..', 'node_modules', '.bin', 'tsc');
    const result = spawnSync(tsc, ['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.ts', 'team_records.defs.ts'], { cwd: folder, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

void test('contracts30 core has no LLM, live persistence or materialization pipeline', () => {
  const source = ['contracts.ts', 'render.ts'].map(name => readFileSync(path.join(HERE, name), 'utf8')).join('\n');
  assert.doesNotMatch(source, /getBestModel|callLLM|createAgent|writeJson|writeSourceText|deleteFile|l2_contract/);
});

function renamedFixtureSources(): D2ContractsSources {
  const entity = (entityId: string, displayField: string, fields: Record<string, unknown>, relationships: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: 'sample', entityId, title: entityId, description: 'Fixture entity.', displayField,
    kind: 'entity', class: 'core', storage: { target: 'moduleDatabase', table: `sample_${entityId.toLowerCase()}`, kind: 'relational' }, relationships, capabilities: {}, rules: [],
    record: { fields }, uniqueKeys: [], lifecycleStates: [], transitions: [], ...extra,
  }) as unknown as Ns5OntologyAnyEntity;
  const record = entity('Record', 'name', {
    id: { type: 'uuid', required: true, derived: true, indexed: true },
    state: { type: 'enum', required: true, indexed: true, values: ['ready', 'closed'] },
    ownerId: { type: 'record', required: true, indexed: true, to: ['Owner'] },
    name: { type: 'string', required: true }, subtype: { type: 'enum', values: ['RecordType'] },
    revision: { type: 'integer', required: true, derived: true, writePrecondition: true },
    details: { type: 'object', fields: { eventNote: { type: 'string' }, privateFlag: { type: 'boolean' } } },
  }, { owner: { relationshipId: 'recordOwner', to: 'Owner', via: 'Record.ownerId', cardinality: 'N:1', required: 'Always', title: 'Owner' } }, {
    transitions: [{ transitionId: 'closeRecord', from: ['ready'], to: 'closed', by: ['operator'], description: 'Close record.', payload: ['details.eventNote'], ruleRefs: [] }],
    lifecycleStates: [{ state: 'ready', reachedBy: 'actor' }, { state: 'closed', reachedBy: 'actor' }],
  });
  const owner = entity('Owner', 'label', {
    id: { type: 'uuid', required: true, derived: true }, label: { type: 'string', required: true }, privateMemo: { type: 'string' },
  });
  const pages = [
    { pageId: 'team_records', actors: ['operator'], usecases: ['listRecord', 'closeRecord'] },
    { pageId: 'staff_records', actors: ['operator'], usecases: ['listRecord'] },
    { pageId: 'staff_registration', actors: ['operator'], usecases: ['createRecord', 'updateRecord'] },
    { pageId: 'owner_view', actors: ['operator'], usecases: ['getOwner'] },
    { pageId: 'record_detail', actors: ['operator'], usecases: ['getRecord'] },
  ];
  const operations: Record<string, { entity: string; operation: string; kind: string }> = {
    listRecord: { entity: 'Record', operation: 'list', kind: 'qry' }, closeRecord: { entity: 'Record', operation: 'transition', kind: 'cmd' },
    createRecord: { entity: 'Record', operation: 'create', kind: 'cmd' }, updateRecord: { entity: 'Record', operation: 'update', kind: 'cmd' },
    getOwner: { entity: 'Owner', operation: 'get', kind: 'qry' }, getRecord: { entity: 'Record', operation: 'get', kind: 'qry' },
  };
  return {
    module: 'sample', entities: { Record: record, Owner: owner },
    ontologyIndex: { relationships: [{ relationshipId: 'recordOwner', from: 'Record', to: 'Owner', type: 'manyToOne', required: true, field: 'Record.ownerId' }] },
    access: { grants: [
      { grantId: 'recordGrant', actorRef: 'operator', entityRefs: ['Record'], disclosure: { mode: 'fullRecord', allowedFields: [], deniedFields: ['Record.details.privateFlag'] } },
      { grantId: 'ownerGrant', actorRef: 'operator', entityRefs: ['Owner'], disclosure: { mode: 'fieldsOnly', allowedFields: ['Owner.id', 'Owner.label'], deniedFields: [] } },
    ] },
    pages: pages.map(page => {
      const usecases = page.usecases.map(usecaseId => ({ usecaseId, ...operations[usecaseId] }));
      const endpoints = usecases.map(usecase => ({ usecaseRef: usecase.usecaseId, kind: operations[usecase.usecaseId].kind, route: `sample.${page.pageId}.${operations[usecase.usecaseId].kind}${upperFirst(usecase.usecaseId)}` }));
      return { pageId: page.pageId, actors: page.actors, endpoints, usecases, operationBindings: endpoints.flatMap(endpoint => {
        const usecaseId = String(endpoint.usecaseRef);
        const usecase = usecases.find(item => item.usecaseId === usecaseId)!;
        if (!['create', 'update', 'transition'].includes(usecase.operation)) return [];
        const entityId = String(usecase.entity);
        const sourceEntity = rec(record);
        const fields = rec(rec(rec(sourceEntity.record).fields));
        const paths = usecase.operation === 'transition' ? ['details.eventNote'] : usecase.operation === 'create'
          ? ['ownerId', 'name'] : ['state', 'ownerId', 'name', 'details.eventNote'];
        return [{ pageId: page.pageId, route: String(endpoint.route), entityId, operation: String(usecase.operation), actorRef: 'operator', grantRefs: ['recordGrant'], authorities: ['operator'],
          inputFields: paths.map(path => ({ path: `${entityId}.${path}`, origin: 'actor' as const, required: !!rec(path.split('.').reduce((value: unknown, part) => rec(rec(value).fields)[part], fields)).required })),
          ...(usecase.operation === 'transition' ? { transition: { transitionId: usecaseId, from: ['ready'], to: 'closed', by: ['operator'], payload: ['details.eventNote'] } } : {}),
          ruleRefs: [], sourceHashes: [],
        }];
      }) };
    }),
  };
}

function syntheticNestedEntity(): Ns5OntologyAnyEntity {
  return {
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: 'fixture', entityId: 'Example', title: 'Example', description: 'fixture', displayField: 'status',
    kind: 'entity', class: 'core', storage: { target: 'moduleDatabase', table: 'fixture_example', kind: 'relational' }, relationships: {}, capabilities: {}, rules: [],
    record: { fields: {
      id: { type: 'uuid', required: true, derived: true },
      left: { type: 'object', fields: { code: { type: 'string', required: true, title: 'Public code', description: 'A human-readable code.' } } },
      right: { type: 'object', fields: { code: { type: 'string' } } },
      status: { type: 'enum', required: true, values: [{ value: 'open', title: 'Open', description: '' }, { value: 'closed', title: 'Closed', description: '' }] },
      mode: { type: 'enum', values: ['quiet', 'active'] },
      ownerId: { type: 'record', to: ['Owner'] },
      tags: { type: 'array', collection: true, fields: { value: { type: 'string' } } },
    } }, uniqueKeys: [], lifecycleStates: [], transitions: [],
  } as unknown as Ns5OntologyAnyEntity;
}

function genericOperationSources(): D2ContractsSources {
  const entity = {
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: 'example', entityId: 'Record', title: 'Record', description: 'fixture', displayField: 'details.publicName',
    kind: 'entity', class: 'core', storage: { target: 'moduleDatabase', table: 'example_record', kind: 'relational' }, relationships: {}, capabilities: {}, rules: [],
    record: { fields: {
      id: { type: 'uuid', required: true, derived: true, indexed: true },
      revision: { type: 'integer', required: true, derived: true, writePrecondition: true },
      ownerId: { type: 'uuid', required: true, indexed: true },
      state: { type: 'enum', required: true, indexed: true, values: [{ value: 'ready' }, { value: 'done' }] },
      details: { type: 'object', required: true, fields: {
        publicName: { type: 'string', required: true },
        eventNote: { type: 'string' },
        privateFlag: { type: 'boolean' },
      } },
    } },
    transitions: [{ transitionId: 'completeRecord', from: ['ready'], to: 'done', by: ['operator'], description: 'Complete the record.', payload: ['details.eventNote'], ruleRefs: [] }],
    uniqueKeys: [], lifecycleStates: [],
  } as unknown as Ns5OntologyAnyEntity;
  const routes = [
    ['listRecord', 'qry'], ['getRecord', 'qry'], ['createRecord', 'cmd'], ['updateRecord', 'cmd'], ['completeRecord', 'cmd'],
  ] as const;
  const endpoints = routes.map(([usecaseRef, kind]) => ({ usecaseRef, kind, route: `example.records.${kind}${usecaseRef[0].toUpperCase()}${usecaseRef.slice(1)}` }));
  const usecases = routes.map(([usecaseId]) => ({ usecaseId, entity: 'Record', operation: usecaseId === 'completeRecord' ? 'transition' : usecaseId.replace(/Record$/, '').toLowerCase() }));
  const bindings = endpoints.flatMap(endpoint => {
    const usecase = usecases.find(item => item.usecaseId === endpoint.usecaseRef)!;
    const operation = String(usecase.operation);
    if (!['create', 'update', 'transition'].includes(operation)) return [];
    const fields = operation === 'transition' ? ['details.eventNote'] : operation === 'create' ? ['ownerId', 'details.publicName'] : ['details.publicName'];
    return [{
      pageId: 'records', route: endpoint.route, entityId: 'Record', operation, actorRef: 'operator', grantRefs: ['recordAccess'], authorities: ['operator'],
      inputFields: fields.map(path => ({ path: `Record.${path}`, origin: 'actor' as const, required: operation === 'create' || operation === 'transition' })),
      ...(operation === 'transition' ? { transition: { transitionId: 'completeRecord', from: ['ready'], to: 'done', by: ['operator'], payload: ['details.eventNote'] } } : {}),
      ruleRefs: [], sourceHashes: [],
    }];
  });
  return {
    module: 'example', entities: { Record: entity },
    access: { grants: [{ grantId: 'recordAccess', actorRef: 'operator', entityRefs: ['Record'], disclosure: { mode: 'fieldsOnly', allowedFields: ['Record'], deniedFields: ['Record.details.privateFlag'] } }] },
    pages: [{ pageId: 'records', actors: ['operator'], endpoints, usecases, operationBindings: bindings }],
  };
}

function assertCode(run: () => unknown, code: string): void {
  assert.throws(run, (error: unknown) => error instanceof D2ContractDerivationError && error.issues.some(issue => issue.code === code));
}

function flatten(fields: D2ContractField[]): D2ContractField[] { return fields.flatMap(field => [field, ...flatten(field.children)]); }
function upperFirst(value: string): string { return value ? value[0].toUpperCase() + value.slice(1) : value; }
function rec(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.map(rec) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
