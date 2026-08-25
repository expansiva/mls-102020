/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/ownerActorSession.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/tiers.js';
import { validateNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/modelGate.js';
import { NS4_E8_MODEL_VERSION, type Ns4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/model.js';

function field(fieldId: string, extra: Record<string, unknown> = {}) {
  return { fieldId, title: fieldId, type: 'string', required: true, description: `${fieldId} field.`, constraints: [], ...extra };
}

function ownTaskSources(over: Record<string, unknown> = {}) {
  return {
    journeys: {
      moduleName: 'todo', userLanguage: 'pt-BR', features: [],
      journeys: [{
        journeyId: 'createTask', policyDecisions: [],
        business: {
          actorRef: 'taskOwner', title: 'Criar tarefa', goal: 'Registrar uma tarefa.',
          entry: { mode: 'coldStart' },
          steps: [{ stepId: 'captureTask', kind: 'act', entity: 'Task', title: 'Informar os dados', description: 'Captura.', featureRefs: [] }],
        },
      }],
    },
    access: {
      profiles: [{ profileId: 'taskOwner', title: 'Dono', kind: 'internal', description: '', actorRefs: ['taskOwner'], landingIntent: '' }],
      authorities: [{
        authorityRef: 'todo:manage', title: 'Gerenciar', description: '',
        journeyStepRefs: ['createTask.captureTask'], informationNeeds: [],
      }],
      grants: [{
        profileRef: 'taskOwner', authorityRef: 'todo:manage', reason: '',
        dataScope: { mode: 'own', description: 'Somente as próprias tarefas.' },
        disclosure: { mode: 'fullRecord', description: '', allowedInformation: [], deniedInformation: [] },
        useRules: ['ownTasksOnly'],
      }],
    },
    ontology: {
      moduleName: 'todo',
      entities: [{
        entityId: 'Task', title: 'Tarefa', description: 'Tarefa.', kind: 'core', ownership: 'moduleOwned', party: 'none',
        sourceRefs: { journeyIds: ['createTask'], featureIds: [], authorityRefs: ['todo:manage'] },
        fields: [
          field('taskId', { type: 'uuid' }),
          field('ownerUserId', { type: 'uuid', description: 'Referência externa, preenchida a partir da pessoa autenticada.' }),
          field('title'),
          field('assignedUserId', { type: 'uuid', required: false, description: 'Pessoa a quem a tarefa é atribuída.' }),
        ],
        lifecycleStates: [], lifecyclePredicates: [], useRules: ['ownTasksOnly'],
        storage: { target: 'moduleDatabase', scope: 'module', idField: 'taskId', notes: '' },
      }],
      relationships: [],
    },
    useCases: [{
      useCaseId: 'captureTask', title: 'Informar os dados', kind: 'command',
      compiledFrom: ['createTask.captureTask'], entityRefs: ['Task'], useRules: [], transitionRefs: [],
    }],
    workflows: [],
    ...over,
  } as any;
}

test('own-scoped owner handle is actorSession; a person the user chooses stays userInput', () => {
  const model = deriveNs4E8Model(ownTaskSources());
  const sourceOf = (operationId: string, inputId: string) =>
    model.operations.find(operation => operation.operationId === operationId)?.inputs.find(input => input.inputId === inputId)?.source;

  assert.equal(sourceOf('createTask', 'ownerUserId'), 'actorSession');
  assert.equal(sourceOf('updateTask', 'ownerUserId'), 'actorSession');
  assert.equal(sourceOf('captureTask', 'ownerUserId'), 'actorSession');
  assert.equal(sourceOf('createTask', 'title'), 'userInput');
  assert.equal(sourceOf('createTask', 'assignedUserId'), 'userInput');
  assert.equal(sourceOf('captureTask', 'assignedUserId'), 'userInput');
  assert.equal(sourceOf('deleteTask', 'ownerUserId'), undefined, 'identity-only delete does not ask for the owner');

  const gate = validateNs4E8Model(model, ownTaskSources());
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_USERINPUT_FROM_SESSION'), false, gate.issues.map(issue => issue.message).join('; '));
});

test('an owner handle the user actually chooses (not own-scope) stays userInput', () => {
  const sources = ownTaskSources();
  sources.access.grants[0].dataScope.mode = 'organization';
  const model = deriveNs4E8Model(sources);
  const create = model.operations.find(operation => operation.operationId === 'createTask')!;
  assert.equal(create.inputs.find(input => input.inputId === 'ownerUserId')?.source, 'userInput');
});

function emptyModel(over: Partial<Ns4E8Model> = {}): Ns4E8Model {
  return {
    planId: 'e8-workspace-model',
    schemaVersion: NS4_E8_MODEL_VERSION,
    moduleName: 'todo',
    userLanguage: 'pt-BR',
    title: 'Workspaces',
    reviewRound: 1,
    hubEntity: 'Task',
    workspaces: [],
    operations: [],
    menu: [],
    landings: [],
    systemDecisions: [],
    ...over,
  };
}

function gateSources() {
  const sources = ownTaskSources();
  return sources;
}

test('userInput whose fieldRef is the owner handle is a registrar, never a failure', () => {
  const model = emptyModel({
    operations: [{
      operationId: 'createTask', title: 'Criar', kind: 'command', entityRef: 'Task', entityRefs: ['Task'],
      accessPattern: { kind: 'create' },
      inputs: [{
        inputId: 'ownerUserId', fieldRef: { entityId: 'Task', fieldId: 'ownerUserId' },
        source: 'userInput', required: true, description: 'Dono da tarefa.',
      }],
      outputRefs: [], useRules: [], transitionRefs: [], story: ['Criar'],
    }],
  });
  const gate = validateNs4E8Model(model, gateSources());
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E8_USERINPUT_FROM_SESSION');
  assert.equal(hit.length, 1, gate.issues.map(issue => issue.code).join(', '));
  assert.equal(hit[0].severity, 'warning');
  assert.equal(gate.ok, true);
});

test('the same owner handle as actorSession is silent; an assignee userInput is silent', () => {
  const model = emptyModel({
    operations: [{
      operationId: 'createTask', title: 'Criar', kind: 'command', entityRef: 'Task', entityRefs: ['Task'],
      accessPattern: { kind: 'create' },
      inputs: [
        {
          inputId: 'ownerUserId', fieldRef: { entityId: 'Task', fieldId: 'ownerUserId' },
          source: 'actorSession', required: true, description: 'Pessoa autenticada.',
        },
        {
          inputId: 'assignedUserId', fieldRef: { entityId: 'Task', fieldId: 'assignedUserId' },
          source: 'userInput', required: false, description: 'Pessoa a quem atribuir.',
        },
      ],
      outputRefs: [], useRules: [], transitionRefs: [], story: ['Criar'],
    }],
  });
  const gate = validateNs4E8Model(model, gateSources());
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_USERINPUT_FROM_SESSION'), false);
});

test('userInput whose description names the authenticated actor is a registrar even without an owner handle', () => {
  const sources = ownTaskSources();
  sources.ontology.entities[0].fields.push(field('authorId', {
    type: 'uuid', description: 'Preenchida a partir da pessoa autenticada no diretório da plataforma.',
  }));
  const model = emptyModel({
    operations: [{
      operationId: 'createTask', title: 'Criar', kind: 'command', entityRef: 'Task', entityRefs: ['Task'],
      accessPattern: { kind: 'create' },
      inputs: [{
        inputId: 'authorId', fieldRef: { entityId: 'Task', fieldId: 'authorId' },
        source: 'userInput', required: true,
        description: 'Preenchida a partir da pessoa autenticada no diretório da plataforma.',
      }],
      outputRefs: [], useRules: [], transitionRefs: [], story: ['Criar'],
    }],
  });
  const gate = validateNs4E8Model(model, sources);
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E8_USERINPUT_FROM_SESSION');
  assert.equal(hit.length, 1);
  assert.equal(hit[0].severity, 'warning');
  assert.equal(gate.ok, true);
});
