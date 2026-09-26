/// <mls fileReference="_102020_/l2/agentDefsL2/steps/input20/operationSemantics.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveD2OperationBindings, D2OperationSemanticsError } from '/_102020_/l2/agentDefsL2/steps/input20/operationSemantics.js';
import type { D2SourceDigest } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';

const digests = [
  'l4/demo/ontology/Record.defs.ts', 'l4/demo/access.defs.ts', 'l4/demo/rules.defs.ts',
].map(path => ({ path, sha256: `sha:${path}`, bytes: path.length, schemaVersion: 'test' })) as D2SourceDigest[];

function sources(overrides: { operations?: unknown; rules?: unknown; deniedFields?: string[]; transitions?: unknown } = {}) {
  return {
    module: 'demo', digests,
    entities: { Record: {
      entityId: 'Record',
      record: { fields: {
        id: { type: 'uuid', derived: true },
        status: { type: 'enum', values: ['scheduled', 'done'] },
        note: { type: 'text' },
        phone: { type: 'text' },
        details: { type: 'object', fields: {
          identification: { type: 'object', fields: {
            name: { type: 'string' },
            docType: { type: 'enum', values: ['NationalId', 'Passport'] },
            docId: { type: 'string' },
            countryCode: { type: 'string' },
            subtype: { type: 'enum', values: ['Person'] },
          } },
          person: { type: 'object', fields: { privacyConsent: { type: 'object' } } },
        } },
      } },
      operations: overrides.operations ?? { create: { writable: ['status'], required: ['status'], assigned: { status: 'scheduled' }, ruleRefs: ['initial'] }, update: { writable: ['phone'], required: ['phone'] } },
      transitions: overrides.transitions ?? [{ transitionId: 'finish', from: ['scheduled'], to: 'done', by: ['operator'], payload: ['note'], ruleRefs: ['requiredOnFinish'] }],
    } },
    access: { grants: [{ grantId: 'operatorGrant', actorRef: 'operator', entityRefs: ['Record'], disclosure: { mode: 'fieldsOnly', allowedFields: ['Record.id', 'Record.status', 'Record.note', 'Record.phone'], deniedFields: overrides.deniedFields || [] } }] },
    rules: { rules: overrides.rules ?? { initial: 'Initial state', requiredOnFinish: 'Requires note' } },
  };
}

function bindings(source = sources()) {
  return resolveD2OperationBindings(source, 'recordPage', [
    { route: 'demo.recordPage.cmdCreate', usecaseRef: 'createRecord' },
    { route: 'demo.recordPage.cmdUpdate', usecaseRef: 'updateRecord' },
    { route: 'demo.recordPage.cmdFinish', usecaseRef: 'finish' },
  ], [
    { usecaseId: 'createRecord', entity: 'Record', operation: 'create' },
    { usecaseId: 'updateRecord', entity: 'Record', operation: 'update' },
    { usecaseId: 'finish', entity: 'Record', operation: 'transition' },
  ], ['operator']);
}

test('resolved operation semantics distinguish server initial values and transition-only requirements', () => {
  const result = bindings();
  assert.deepEqual(result.find(item => item.operation === 'create')?.inputFields, []); // server assignment never becomes actor input
  assert.deepEqual(result.find(item => item.operation === 'update')?.inputFields, [{ path: 'Record.phone', origin: 'actor', required: true }]);
  assert.deepEqual(result.find(item => item.transition)?.inputFields, [{ path: 'Record.note', origin: 'actor', required: true }]);
  assert.equal(result.find(item => item.transition)?.transition?.to, 'done');
  assert.deepEqual(result.find(item => item.transition)?.ruleRefs.map(item => item.ruleId), ['requiredOnFinish']);
  assert.deepEqual(result.find(item => item.transition)?.authorities, ['operator']);
  assert.match(result[0].sourceHashes[0], /sha:/);
});

test('missing field and rule refs fail with exact source location', () => {
  assert.throws(() => bindings(sources({ operations: { create: { writable: ['ghost'] } } })), (error: unknown) =>
    error instanceof D2OperationSemanticsError && error.code === 'FIELD_REF_MISSING' && error.path === 'Record.ghost');
  assert.throws(() => bindings(sources({ operations: { create: { writable: [], ruleRefs: ['ghostRule'] }, update: { writable: ['phone'] } } })), (error: unknown) =>
    error instanceof D2OperationSemanticsError && error.code === 'RULE_REF_MISSING' && error.path === 'rules.ghostRule');
});

test('deny overrides field disclosure and a renamed transition id still resolves structurally', () => {
  const fixture = sources({ deniedFields: ['Record.phone'], transitions: [{ transitionId: 'completeVisit', from: ['scheduled'], to: 'done', by: ['operator'], payload: ['phone'], ruleRefs: ['requiredOnFinish'] }] });
  const endpoints = [{ route: 'demo.recordPage.cmdCompleteVisit', usecaseRef: 'completeVisit' }];
  const usecases = [{ usecaseId: 'completeVisit', entity: 'Record', operation: 'transition' }];
  const result = resolveD2OperationBindings(fixture, 'recordPage', endpoints, usecases, ['operator']);
  assert.deepEqual(result[0].inputFields, []); // denial wins over the declared payload
  assert.equal(result[0].transition?.transitionId, 'completeVisit');
});

test('create requires explicit writable declarations when required fields are present', () => {
  assert.throws(() => bindings(sources({ operations: { create: { required: ['status'] }, update: { writable: ['phone'] } } })), (error: unknown) =>
    error instanceof D2OperationSemanticsError && error.code === 'REQUIRED_FIELD_NOT_WRITABLE');
});

test('server-assigned enum values remain server-originated and are not user inputs', () => {
  const source = sources({ operations: { create: { assigned: { status: 'scheduled' } }, update: { writable: ['phone'] } } });
  assert.deepEqual(bindings(source).find(item => item.operation === 'create')?.inputFields, []);
});

test('renamed create fields preserve only declared writable identity paths', () => {
  const source = sources({
    operations: {
      create: {
        writable: ['details.identification.name', 'details.identification.docType', 'details.identification.docId', 'details.identification.countryCode'],
        required: ['details.identification.name', 'details.identification.countryCode'],
        assigned: { 'details.identification.subtype': 'Person' },
      },
      update: { writable: ['phone'] },
    },
    deniedFields: ['Record.details.person'],
  });
  const create = bindings(source).find(item => item.operation === 'create');
  assert.deepEqual(create?.inputFields, [
    { path: 'Record.details.identification.name', origin: 'actor', required: true },
    { path: 'Record.details.identification.docType', origin: 'actor', required: false },
    { path: 'Record.details.identification.docId', origin: 'actor', required: false },
    { path: 'Record.details.identification.countryCode', origin: 'actor', required: true },
  ]);
  assert.equal(create?.inputFields.some(item => item.path === 'Record.details.identification.subtype'), false);
  assert.equal(create?.inputFields.some(item => item.path.startsWith('Record.details.person')), false);
});

test('operation without semantics reports named ontology and symbol', () => {
  const source = sources({ operations: { update: { writable: ['phone'] } } });
  const endpoint = [{ route: 'demo.recordPage.cmdCreate', usecaseRef: 'createRecord' }];
  const usecase = [{ usecaseId: 'createRecord', entity: 'Record', operation: 'create' }];
  assert.throws(() => resolveD2OperationBindings(source, 'recordPage', endpoint, usecase, ['operator']), (error: unknown) =>
    error instanceof D2OperationSemanticsError && error.code === 'OPERATION_SEMANTICS_MISSING' && error.file === 'l4/demo/ontology/Record.defs.ts' && error.path === 'operations.create');
});
