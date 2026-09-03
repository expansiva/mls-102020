/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/placeConsolidation.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/tiers.js';
import { validateNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/modelGate.js';
import { NS4_E8_MODEL_VERSION, type Ns4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/model.js';

const todoSources = JSON.parse(readFileSync(new URL('fixtures/todo-e8-sources.json', import.meta.url), 'utf8'));

function field(fieldId: string, extra: Record<string, unknown> = {}) {
  return { fieldId, title: fieldId, type: 'string', required: true, description: `${fieldId} field.`, constraints: [], ...extra };
}

function baseSources(over: Record<string, unknown> = {}) {
  return {
    journeys: {
      moduleName: 'todo', userLanguage: 'pt-BR', features: [],
      journeys: [{
        journeyId: 'monitorTasks', policyDecisions: [],
        business: {
          actorRef: 'taskOwner', title: 'Acompanhar', goal: 'Ver.',
          entry: { mode: 'coldStart' },
          steps: [
            { stepId: 'inspectTask', kind: 'inspect', entity: 'Task', title: 'Detalhe', description: 'Um.', featureRefs: [] },
            { stepId: 'decideStatus', kind: 'decide', entity: 'Task', title: 'Decidir', description: 'Status.', featureRefs: [] },
          ],
        },
      }],
    },
    access: {
      profiles: [{ profileId: 'taskOwner', title: 'Dono', kind: 'internal', description: '', actorRefs: ['taskOwner'], landingIntent: '' }],
      authorities: [{
        authorityRef: 'todo:monitor', title: 'Monitorar', description: '',
        journeyStepRefs: ['monitorTasks.inspectTask', 'monitorTasks.decideStatus'],
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
          field('status', { enum: ['pending', 'done'] }),
        ],
        statusEnum: ['pending', 'done'],
        lifecycleStates: ['pending', 'done'],
        lifecyclePredicates: [], useRules: [],
        storage: { target: 'moduleDatabase', scope: 'module', idField: 'taskId', notes: '' },
      }],
      relationships: [],
    },
    useCases: [
      { useCaseId: 'inspectTask', title: 'Detalhe', kind: 'query', compiledFrom: ['monitorTasks.inspectTask'], entityRefs: ['Task'], useRules: [], transitionRefs: [] },
      { useCaseId: 'decideStatus', title: 'Decidir', kind: 'command', compiledFrom: ['monitorTasks.decideStatus'], entityRefs: ['Task'], useRules: [], transitionRefs: [] },
    ],
    workflows: [],
    ...over,
  } as any;
}

test('R1: todo fixture consolidates to one main page — catalogue hosts the decide journey, hub collapses', () => {
  const sources = {
    journeys: todoSources.journeys,
    access: todoSources.access,
    ontology: todoSources.ontology,
    useCases: todoSources.useCases,
    workflows: todoSources.workflows,
    policyDecisionSelections: todoSources.policyDecisionSelections,
  } as any;
  const model = deriveNs4E8Model(sources);
  assert.deepEqual(model.workspaces.map(workspace => workspace.workspaceId), ['taskCatalogue']);
  assert.equal(model.workspaces[0].tier, 'recordCatalogue');
  assert.equal(model.menu.length, 1);
  assert.equal(model.menu[0].workspaceId, 'taskCatalogue');
  assert.equal(model.menu.filter(entry => entry.tier === 'journey').length, 0);
  const hosted = new Set(model.workspaces[0].hostedStepRefs);
  assert.equal(hosted.has('monitorAndUpdateTaskStatus.decideTaskStatus'), true);
  assert.equal(hosted.has('monitorAndUpdateTaskStatus.inspectTask'), true);
  assert.equal(hosted.has('monitorAndUpdateTaskStatus.inspectTaskSummary'), true);
  assert.equal(hosted.has('monitorAndUpdateTaskStatus.locateTask'), true);
  assert.equal(model.workspaces[0].bffCalls.some(call => call.operationId === 'decideTaskStatus'), true);
  assert.equal(model.workspaces[0].bffCalls.some(call => call.operationId === 'listTask'), true);
  assert.equal(model.landings[0]?.workspaceId, 'taskCatalogue');
  const gate = validateNs4E8Model(model, sources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_REDUNDANT_WORKSPACE'), false, gate.issues.map(issue => issue.message).join('; '));
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_STEP_UNHOSTED'), false, gate.issues.map(issue => issue.message).join('; '));
  assert.equal(gate.ok, true);
});

test('R1: eventDriven journey of the same actor keeps its own workspace', () => {
  const sources = baseSources();
  sources.journeys.journeys[0].business.entry.mode = 'eventDriven';
  const model = deriveNs4E8Model(sources);
  assert.ok(model.workspaces.some(workspace => workspace.workspaceId === 'monitorTasks' && workspace.tier === 'journey'));
  assert.ok(model.workspaces.some(workspace => workspace.workspaceId === 'taskCatalogue'));
});

test('R1: a journey that spans two entities keeps its own workspace', () => {
  const sources = baseSources();
  sources.ontology.entities.push({
    entityId: 'Project', title: 'Projeto', description: 'Projeto.', kind: 'core', ownership: 'moduleOwned', party: 'none',
    sourceRefs: { journeyIds: ['monitorTasks'], featureIds: [], authorityRefs: ['todo:monitor'] },
    fields: [field('projectId', { type: 'uuid' }), field('title')],
    statusEnum: [], lifecycleStates: [], lifecyclePredicates: [], useRules: [],
    storage: { target: 'moduleDatabase', scope: 'module', idField: 'projectId', notes: '' },
  });
  sources.journeys.journeys[0].business.steps.unshift({
    stepId: 'locateProject', kind: 'locate', entity: 'Project', title: 'Projeto', description: 'Lista.', featureRefs: [],
  });
  sources.useCases.push({
    useCaseId: 'locateProject', title: 'Localizar projeto', kind: 'query',
    compiledFrom: ['monitorTasks.locateProject'], entityRefs: ['Project'], useRules: [], transitionRefs: [],
  });
  sources.access.authorities[0].journeyStepRefs.push('monitorTasks.locateProject');
  const model = deriveNs4E8Model(sources);
  assert.ok(model.workspaces.some(workspace => workspace.workspaceId === 'monitorTasks' && workspace.tier === 'journey'));
});

test('R3: a leftover same-actor journey workspace is NS4_E8_REDUNDANT_WORKSPACE (blocking)', () => {
  const sources = baseSources();
  const derived = deriveNs4E8Model(sources);
  const catalogue = derived.workspaces.find(workspace => workspace.workspaceId === 'taskCatalogue')!;
  const leftover: Ns4E8Model = {
    ...derived,
    workspaces: [
      catalogue,
      {
        workspaceId: 'monitorTasks',
        tier: 'journey',
        title: 'Acompanhar',
        purpose: 'Ver.',
        kind: 'operation',
        entity: 'Task',
        actors: ['taskOwner'],
        profileRefs: ['taskOwner'],
        featureRefs: [],
        hostedStepRefs: ['monitorTasks.inspectTask', 'monitorTasks.decideStatus'],
        journeyRef: 'monitorTasks',
        categoryRef: 'approvalWorkflow',
        bffCalls: [
          { bffId: 'qryInspectTask', kind: 'query', operationId: 'inspectTask', outputKind: 'object', entityRef: 'Task' },
          { bffId: 'cmdDecideStatus', kind: 'command', operationId: 'decideStatus', outputKind: 'object', entityRef: 'Task' },
        ],
        sections: [],
      },
    ],
  };
  const gate = validateNs4E8Model(leftover, sources);
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E8_REDUNDANT_WORKSPACE');
  assert.equal(hit.length, 1, gate.issues.map(issue => `${issue.code}:${issue.message}`).join('; '));
  assert.notEqual(hit[0].severity, 'warning');
  assert.equal(gate.ok, false);
});

test('R3: a hub without relatedList or projectionTile is NS4_E8_REDUNDANT_WORKSPACE', () => {
  const sources = baseSources();
  const model = deriveNs4E8Model(sources);
  const leftover: Ns4E8Model = {
    ...model,
    schemaVersion: NS4_E8_MODEL_VERSION,
    workspaces: [
      ...model.workspaces,
      {
        workspaceId: 'taskHub',
        tier: 'hub',
        title: 'Tarefa',
        purpose: 'Painel.',
        kind: 'landing',
        entity: 'Task',
        actors: ['taskOwner'],
        profileRefs: ['taskOwner'],
        featureRefs: [],
        hostedStepRefs: [],
        categoryRef: 'dashboardCommandCenter',
        bffCalls: [{ bffId: 'qryListTask', kind: 'query', operationId: 'listTask', outputKind: 'paginated', entityRef: 'Task' }],
        sections: [],
        hubCatalogue: { anchorEntity: 'Task', items: [{ itemId: 'actionMonitor', kind: 'action', label: 'Acompanhar', entityRef: 'Task', targetRef: 'monitorTasks', score: 2 }] },
      },
    ],
  };
  const gate = validateNs4E8Model(leftover, sources);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E8_REDUNDANT_WORKSPACE' && issue.message.includes('taskHub')),
    gate.issues.map(issue => issue.message).join('; '));
  assert.equal(gate.ok, false);
});

test('R3: a non-demoted journey step must be hosted on some workspace', () => {
  const sources = baseSources();
  const model: Ns4E8Model = {
    planId: 'e8-workspace-model',
    schemaVersion: NS4_E8_MODEL_VERSION,
    moduleName: 'todo',
    userLanguage: 'pt-BR',
    title: 'Workspaces',
    reviewRound: 1,
    hubEntity: 'Task',
    workspaces: [{
      workspaceId: 'taskCatalogue',
      tier: 'recordCatalogue',
      title: 'Tarefa',
      purpose: 'Cadastro.',
      kind: 'operation',
      entity: 'Task',
      actors: ['taskOwner'],
      profileRefs: ['taskOwner'],
      featureRefs: [],
      hostedStepRefs: [],
      categoryRef: 'entityRecordManagement',
      bffCalls: [{ bffId: 'qryListTask', kind: 'query', operationId: 'listTask', outputKind: 'paginated', entityRef: 'Task' }],
      sections: [],
    }],
    operations: [{
      operationId: 'listTask', title: 'Listar', kind: 'query', entityRef: 'Task', entityRefs: ['Task'],
      accessPattern: { kind: 'list' }, inputs: [], outputRefs: [], useRules: [], transitionRefs: [], story: [],
    }],
    menu: [],
    landings: [],
    systemDecisions: [],
  };
  const gate = validateNs4E8Model(model, sources);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E8_STEP_UNHOSTED'));
  assert.equal(gate.ok, false);
});
