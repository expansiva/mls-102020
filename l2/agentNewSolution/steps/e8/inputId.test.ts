/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/inputId.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/tiers.js';

function field(fieldId: string, extra: Record<string, unknown> = {}) {
  return { fieldId, title: fieldId, type: 'string', required: true, description: `${fieldId} field.`, constraints: [], ...extra };
}

function entity(entityId: string, idField: string, extraFields: ReturnType<typeof field>[] = []) {
  return {
    entityId, title: entityId, description: entityId, kind: 'core', ownership: 'moduleOwned', party: 'none',
    sourceRefs: { journeyIds: [], featureIds: [], authorityRefs: [] },
    fields: [field(idField, { type: 'uuid' }), ...extraFields],
    lifecycleStates: [], lifecyclePredicates: [], useRules: [],
    storage: { target: 'moduleDatabase', scope: 'module', idField, notes: '' },
  };
}

test('inspect names the identity the same way the catalogue does: fieldId, not entity+field', () => {
  const model = deriveNs4E8Model({
    journeys: {
      moduleName: 'todo', userLanguage: 'pt-BR', features: [],
      journeys: [{
        journeyId: 'inspectTaskStatus', policyDecisions: [],
        business: {
          actorRef: 'taskOwner', title: 'Consultar tarefa', goal: 'Ver a tarefa.',
          entry: { mode: 'coldStart' },
          steps: [
            { stepId: 'locateTasks', kind: 'locate', entity: 'Task', title: 'Localizar', description: 'Lista.', featureRefs: [] },
            { stepId: 'inspectCurrentTaskStatus', kind: 'inspect', entity: 'Task', title: 'Consultar', description: 'Detalhe.', featureRefs: [] },
          ],
        },
      }],
    },
    access: {
      profiles: [{ profileId: 'taskOwner', title: 'Dono', kind: 'internal', description: '', actorRefs: ['taskOwner'], landingIntent: '' }],
      authorities: [{
        authorityRef: 'todo:manage', title: 'Gerenciar', description: '',
        journeyStepRefs: ['inspectTaskStatus.locateTasks', 'inspectTaskStatus.inspectCurrentTaskStatus'],
        informationNeeds: [],
      }],
      grants: [{
        profileRef: 'taskOwner', authorityRef: 'todo:manage', reason: '',
        dataScope: { mode: 'organization', description: '' },
        disclosure: { mode: 'fullRecord', description: '', allowedInformation: [], deniedInformation: [] },
        useRules: [],
      }],
    },
    ontology: {
      moduleName: 'todo',
      entities: [entity('Task', 'taskId', [field('title')])],
      relationships: [],
    },
    useCases: [
      { useCaseId: 'locateTasks', title: 'Localizar', kind: 'query', compiledFrom: ['inspectTaskStatus.locateTasks'], entityRefs: ['Task'], useRules: [], transitionRefs: [] },
      { useCaseId: 'inspectCurrentTaskStatus', title: 'Consultar', kind: 'query', compiledFrom: ['inspectTaskStatus.inspectCurrentTaskStatus'], entityRefs: ['Task'], useRules: [], transitionRefs: [] },
    ],
    workflows: [],
  } as any);

  const inspect = model.operations.find(operation => operation.operationId === 'inspectCurrentTaskStatus')!;
  const get = model.operations.find(operation => operation.operationId === 'getTask')!;
  assert.deepEqual(inspect.inputs.map(input => input.inputId), ['taskId']);
  assert.deepEqual(inspect.inputs.map(input => `${input.fieldRef.entityId}.${input.fieldRef.fieldId}`), ['Task.taskId']);
  assert.deepEqual(get.inputs.map(input => input.inputId), ['taskId']);
  assert.equal(inspect.inputs.some(input => input.inputId === 'taskTaskId'), false);
});

test('two entities sharing a fieldId in one operation get the qualified inputId', () => {
  const model = deriveNs4E8Model({
    journeys: {
      moduleName: 'mod', userLanguage: 'en', features: [],
      journeys: [{
        journeyId: 'decideBeta', policyDecisions: [],
        business: {
          actorRef: 'owner', title: 'Decide beta', goal: 'Decide.',
          entry: { mode: 'coldStart' },
          steps: [
            { stepId: 'locateBeta', kind: 'locate', entity: 'Beta', title: 'Locate', description: 'List.', featureRefs: [] },
            { stepId: 'decideBeta', kind: 'decide', entity: 'Beta', title: 'Decide', description: 'Decide.', featureRefs: [] },
          ],
        },
      }],
    },
    access: {
      profiles: [{ profileId: 'owner', title: 'Owner', kind: 'internal', description: '', actorRefs: ['owner'], landingIntent: '' }],
      authorities: [{
        authorityRef: 'mod:manage', title: 'Manage', description: '',
        journeyStepRefs: ['decideBeta.locateBeta', 'decideBeta.decideBeta'], informationNeeds: [],
      }],
      grants: [{
        profileRef: 'owner', authorityRef: 'mod:manage', reason: '',
        dataScope: { mode: 'organization', description: '' },
        disclosure: { mode: 'fullRecord', description: '', allowedInformation: [], deniedInformation: [] },
        useRules: [],
      }],
    },
    ontology: {
      moduleName: 'mod',
      entities: [
        entity('Alpha', 'recordId', [field('name')]),
        entity('Beta', 'recordId', [field('status', { enum: ['open', 'done'] })]),
      ],
      relationships: [{ fromEntity: 'Beta', toEntity: 'Alpha', type: 'manyToOne', required: true }],
    },
    useCases: [
      { useCaseId: 'locateBeta', title: 'Locate', kind: 'query', compiledFrom: ['decideBeta.locateBeta'], entityRefs: ['Beta'], useRules: [], transitionRefs: [] },
      { useCaseId: 'decideBeta', title: 'Decide', kind: 'command', compiledFrom: ['decideBeta.decideBeta'], entityRefs: ['Beta'], useRules: [], transitionRefs: [] },
    ],
    workflows: [{
      workflowId: 'betaFlow', entityRef: 'Beta',
      states: ['open', 'done'],
      transitions: [{ transitionId: 'decideBeta', fromStates: ['open'], toState: 'done' }],
    }],
  } as any);

  const decide = model.operations.find(operation => operation.operationId === 'decideBeta')!;
  const identities = decide.inputs.filter(input => input.fieldRef.fieldId === 'recordId');
  assert.equal(identities.length, 2, decide.inputs.map(input => input.inputId).join(','));
  assert.deepEqual(identities.map(input => input.inputId).sort(), ['alphaRecordId', 'betaRecordId']);
  assert.equal(identities.every(input => input.inputId !== 'recordId'), true);
});
