/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/collectionInspect.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/tiers.js';
import { validateNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/modelGate.js';
import { NS4_E8_MODEL_VERSION, type Ns4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/model.js';

function field(fieldId: string, extra: Record<string, unknown> = {}) {
  return { fieldId, title: fieldId, type: 'string', required: true, description: `${fieldId} field.`, constraints: [], ...extra };
}

function monitorSources() {
  return {
    journeys: {
      moduleName: 'todo', userLanguage: 'pt-BR', features: [],
      journeys: [{
        journeyId: 'monitorTasks', policyDecisions: [],
        business: {
          actorRef: 'taskOwner', title: 'Acompanhar tarefas', goal: 'Ver o panorama.',
          entry: { mode: 'coldStart' },
          steps: [
            { stepId: 'inspectTaskSummary', kind: 'inspect', entity: 'Task', title: 'Consultar o resumo', description: 'Totais visíveis.', featureRefs: [] },
            { stepId: 'locateTasks', kind: 'locate', entity: 'Task', title: 'Localizar', description: 'Lista.', featureRefs: [] },
            { stepId: 'inspectTaskDetails', kind: 'inspect', entity: 'Task', title: 'Consultar detalhes', description: 'Um registro.', featureRefs: [] },
          ],
        },
      }],
    },
    access: {
      profiles: [{ profileId: 'taskOwner', title: 'Dono', kind: 'internal', description: '', actorRefs: ['taskOwner'], landingIntent: '' }],
      authorities: [{
        authorityRef: 'todo:monitor', title: 'Monitorar', description: '',
        journeyStepRefs: ['monitorTasks.inspectTaskSummary', 'monitorTasks.locateTasks', 'monitorTasks.inspectTaskDetails'],
        informationNeeds: [],
      }],
      grants: [{
        profileRef: 'taskOwner', authorityRef: 'todo:monitor', reason: '',
        dataScope: { mode: 'own', description: '' },
        disclosure: { mode: 'fullRecord', description: '', allowedInformation: [], deniedInformation: [] },
        useRules: [],
      }],
    },
    ontology: {
      moduleName: 'todo',
      entities: [{
        entityId: 'Task', title: 'Tarefa', description: 'Tarefa.', kind: 'core', ownership: 'moduleOwned', party: 'none',
        sourceRefs: { journeyIds: ['monitorTasks'], featureIds: [], authorityRefs: ['todo:monitor'] },
        fields: [
          field('taskId', { type: 'uuid' }),
          field('title'),
          field('status', { enum: ['pending', 'inProgress', 'completed', 'cancelled'] }),
          field('dueDate', { type: 'date', required: false }),
        ],
        statusEnum: ['pending', 'inProgress', 'completed', 'cancelled'],
        lifecycleStates: ['pending', 'inProgress', 'completed', 'cancelled'],
        lifecyclePredicates: [], useRules: [],
        storage: { target: 'moduleDatabase', scope: 'module', idField: 'taskId', notes: '' },
      }],
      relationships: [],
    },
    useCases: [
      { useCaseId: 'inspectTaskSummary', title: 'Consultar o resumo', kind: 'query', compiledFrom: ['monitorTasks.inspectTaskSummary'], entityRefs: ['Task'], useRules: [], transitionRefs: [] },
      { useCaseId: 'locateTasks', title: 'Localizar', kind: 'query', compiledFrom: ['monitorTasks.locateTasks'], entityRefs: ['Task'], useRules: [], transitionRefs: [] },
      { useCaseId: 'inspectTaskDetails', title: 'Consultar detalhes', kind: 'query', compiledFrom: ['monitorTasks.inspectTaskDetails'], entityRefs: ['Task'], useRules: [], transitionRefs: [] },
    ],
    workflows: [],
  } as any;
}

test('inspect before locate of the same entity compiles as a list summary, not getById', () => {
  const sources = monitorSources();
  const model = deriveNs4E8Model(sources);
  const summary = model.operations.find(operation => operation.operationId === 'inspectTaskSummary')!;
  const details = model.operations.find(operation => operation.operationId === 'inspectTaskDetails')!;
  assert.equal(summary.accessPattern.kind, 'list');
  assert.equal(summary.inputs.some(input => input.required), false);
  assert.equal(details.accessPattern.kind, 'getById');

  const workspace = model.workspaces.find(item => item.workspaceId === 'monitorTasks')!;
  const summaryCall = workspace.bffCalls.find(call => call.operationId === 'inspectTaskSummary')!;
  const summarySection = workspace.sections.find(section => section.sectionId === 'inspectTaskSummary')!;
  assert.equal(summaryCall.outputKind, 'paginated');
  assert.equal(summarySection.organisms[0].usage, 'summary');
  assert.equal(summarySection.organisms[0].role, 'primarySurface');
  assert.notEqual(summarySection.organisms[0].role, 'detailPanel');

  const gate = validateNs4E8Model(model, sources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_COLLECTION_INSPECT_GETBYID'), false, gate.issues.map(issue => issue.message).join('; '));
});

test('leftover getById on a collection inspect is a registrar, never a failure', () => {
  const sources = monitorSources();
  const model: Ns4E8Model = {
    planId: 'e8-workspace-model',
    schemaVersion: NS4_E8_MODEL_VERSION,
    moduleName: 'todo',
    userLanguage: 'pt-BR',
    title: 'Workspaces',
    reviewRound: 1,
    hubEntity: 'Task',
    workspaces: [],
    operations: [{
      operationId: 'inspectTaskSummary', title: 'Resumo', kind: 'query', entityRef: 'Task', entityRefs: ['Task'],
      accessPattern: { kind: 'getById' },
      inputs: [{ inputId: 'taskId', fieldRef: { entityId: 'Task', fieldId: 'taskId' }, source: 'routeParam', required: true, description: 'Tarefa' }],
      outputRefs: ['Task.taskId'], useRules: [], transitionRefs: [], story: [], useCaseId: 'inspectTaskSummary',
    }],
    menu: [],
    landings: [],
    systemDecisions: [],
  };
  const gate = validateNs4E8Model(model, sources);
  const issue = gate.issues.find(item => item.code === 'NS4_E8_COLLECTION_INSPECT_GETBYID');
  assert.ok(issue, gate.issues.map(item => item.code).join(','));
  assert.equal(issue!.severity, 'warning');
  assert.equal(gate.ok, true);
});
