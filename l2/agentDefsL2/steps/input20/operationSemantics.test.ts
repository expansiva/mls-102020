/// <mls fileReference="_102020_/l2/agentDefsL2/steps/input20/operationSemantics.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveD2OperationBindings, D2OperationSemanticsError } from '/_102020_/l2/agentDefsL2/steps/input20/operationSemantics.js';
import type { D2SourceDigest } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';

const digests = ['l4/demo/ontology/Record.defs.ts', 'l4/demo/access.defs.ts', 'l4/demo/rules.defs.ts']
  .map(path => ({ path, sha256: `sha:${path}`, bytes: path.length, schemaVersion: 'fixture' })) as D2SourceDigest[];

function sources(deniedFields: string[] = []) {
  return {
    module: 'demo', digests,
    entities: { Record: {
      entityId: 'Record', subtype: 'Person',
      record: { fields: {
        id: { type: 'uuid', derived: true, required: true },
        status: { type: 'enum', required: true, values: ['scheduled', 'done'] },
        revision: { type: 'integer', required: true, derived: true, writePrecondition: true },
        phone: { type: 'text', required: true },
        details: { type: 'object', fields: {
          identity: { type: 'object', fields: {
            name: { type: 'string', required: true }, subtype: { type: 'enum', values: ['Person'] },
          } },
          privateData: { type: 'object', fields: { token: { type: 'string' } } },
        } },
      } },
      lifecycleStates: [{ state: 'scheduled', reachedBy: 'actor' }, { state: 'done', reachedBy: 'actor' }],
      rules: ['recordRule'],
      transitions: [{ transitionId: 'closeRecord', from: ['scheduled'], to: 'done', by: ['operator'], payload: [], ruleRefs: ['closeRule'] }],
    } },
    access: { grants: [{ grantId: 'recordGrant', actorRef: 'operator', entityRefs: ['Record'], disclosure: { mode: 'fieldsOnly', allowedFields: ['Record'], deniedFields } }] },
    rules: { rules: { recordRule: 'Rule on record.', closeRule: 'Rule on closure.' } },
  };
}

function bindings(source = sources()) {
  return resolveD2OperationBindings(source, 'records', [
    { route: 'demo.records.createRecord', usecaseRef: 'createRecord' },
    { route: 'demo.records.updateRecord', usecaseRef: 'updateRecord' },
    { route: 'demo.records.closeRecord', usecaseRef: 'closeRecord' },
  ], [
    { usecaseId: 'createRecord', entity: 'Record', operation: 'create' },
    { usecaseId: 'updateRecord', entity: 'Record', operation: 'update' },
    { usecaseId: 'closeRecord', entity: 'Record', operation: 'transition' },
  ], ['operator']);
}

test('derives writable leaf fields and requiredness, assigning initial state and subtype only on create', () => {
  const result = bindings();
  const create = result.find(item => item.operation === 'create')!;
  const update = result.find(item => item.operation === 'update')!;
  assert.deepEqual(create.inputFields.map(field => field.path), [
    'Record.phone', 'Record.details.identity.name', 'Record.details.privateData.token',
  ]);
  assert.deepEqual(create.inputFields.map(field => field.required), [true, true, false]);
  assert.deepEqual(update.inputFields.map(field => field.path), [
    'Record.phone', 'Record.details.identity.name', 'Record.details.privateData.token',
  ]);
  assert.equal(update.inputFields.some(field => field.path === 'Record.revision'), false);
  assert.ok([create, update].every(binding => binding.inputFields.every(field => !['Record.status', 'Record.details.identity.subtype'].includes(field.path))));
  assert.deepEqual(create.ruleRefs.map(rule => rule.ruleId), ['recordRule']);
  assert.deepEqual(result.find(item => item.transition)?.inputFields, []);
  assert.deepEqual(result.find(item => item.transition)?.ruleRefs.map(rule => rule.ruleId), ['closeRule']);
});

test('grant denial removes derived writable input without parsing the denied field prose', () => {
  const result = bindings(sources(['Record.details.privateData']));
  assert.ok(result.every(binding => binding.inputFields.every(field => !field.path.startsWith('Record.details.privateData'))));
});

test('unresolved transition rules are reported with their canonical source location', () => {
  const source = sources();
  source.entities.Record.transitions[0].ruleRefs = ['absentRule'];
  assert.throws(() => bindings(source), (error: unknown) => error instanceof D2OperationSemanticsError
    && error.code === 'RULE_REF_MISSING' && error.path === 'rules.absentRule');
});
