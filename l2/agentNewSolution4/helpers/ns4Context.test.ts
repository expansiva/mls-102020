/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4Context.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectNs4JourneyEntities, deriveNs4Contexts, ns4ContextIdOf,
  type Ns4ContextSources,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Context.js';

function entity(entityId: string, idField: string): Ns4ContextSources['ontology']['entities'][number] {
  return { entityId, ownership: 'moduleOwned', storage: { target: 'moduleDatabase', scope: 'module', idField }, fields: [{ fieldId: idField }] };
}

const ontology: Ns4ContextSources['ontology'] = {
  entities: [
    entity('Project', 'projectId'), entity('ChangeOrder', 'changeOrderId'), entity('WorkTask', 'workTaskId'),
    entity('Worker', 'workerId'),
    { entityId: 'PlatformUser', ownership: 'external', storage: { target: 'external', scope: 'platform', idField: 'platformUserId' }, fields: [{ fieldId: 'platformUserId' }] },
  ],
  relationships: [
    { fromEntity: 'ChangeOrder', toEntity: 'Project', type: 'manyToOne', required: true },
    { fromEntity: 'WorkTask', toEntity: 'Project', type: 'manyToOne', required: true },
    { fromEntity: 'WorkTask', toEntity: 'Worker', type: 'manyToOne', required: true },
    { fromEntity: 'Project', toEntity: 'PlatformUser', type: 'oneToOne', required: true },
  ],
};

const access = { profiles: [{ profileId: 'clientPortal', actorRefs: ['client'] }, { profileId: 'manager', actorRefs: ['projectManager'] }] };

test('an act step that creates its entity provides it and requires only its required ontology parents', () => {
  const graph = deriveNs4Contexts({ ontology, access, journeys: { journeys: [{
    journeyId: 'manageChangeOrder',
    business: { actorRef: 'projectManager', entry: { mode: 'contextOrLookup' }, steps: [
      { stepId: 'locateProject', kind: 'locate', entity: 'Project' },
      { stepId: 'captureChangeOrder', kind: 'act', entity: 'ChangeOrder' },
      { stepId: 'decideChangeOrder', kind: 'decide', entity: 'ChangeOrder' },
    ] },
  }] } });

  const locate = graph.byStepRef.get('manageChangeOrder.locateProject')!;
  assert.deepEqual(locate.requires, []);
  assert.deepEqual(locate.provides.map(item => item.contextId), ['selectedProject']);

  const create = graph.byStepRef.get('manageChangeOrder.captureChangeOrder')!;
  assert.equal(create.creates, true);
  assert.deepEqual(create.requires.map(item => item.contextId), ['selectedProject']);
  assert.deepEqual(create.provides.map(item => item.contextId), ['selectedChangeOrder']);

  const decide = graph.byStepRef.get('manageChangeOrder.decideChangeOrder')!;
  assert.deepEqual(decide.requires.map(item => item.contextId), ['selectedChangeOrder', 'selectedProject']);
});

test('the founding coordination survives a forgetful generator: no locate step, the FK still requires the parent', () => {
  const graph = deriveNs4Contexts({ ontology, access, journeys: { journeys: [{
    journeyId: 'createChangeOrder',
    business: { actorRef: 'projectManager', entry: { mode: 'coldStart' }, steps: [
      { stepId: 'captureChangeOrder', kind: 'act', entity: 'ChangeOrder' },
    ] },
  }] } });
  assert.deepEqual(graph.byStepRef.get('createChangeOrder.captureChangeOrder')!.requires.map(item => item.contextId), ['selectedProject']);
});

test('two required parents are both required by the acting step', () => {
  const graph = deriveNs4Contexts({ ontology, access, journeys: { journeys: [{
    journeyId: 'assignWork',
    business: { actorRef: 'projectManager', entry: { mode: 'contextRequired' }, steps: [
      { stepId: 'locateProject', kind: 'locate', entity: 'Project' },
      { stepId: 'assignTask', kind: 'act', entity: 'WorkTask' },
    ] },
  }] } });
  assert.deepEqual(graph.byStepRef.get('assignWork.assignTask')!.requires.map(item => item.contextId), ['selectedProject', 'selectedWorker']);
});

test('an act step whose entity an earlier step already provides maintains instead of creating', () => {
  const graph = deriveNs4Contexts({ ontology, access, journeys: { journeys: [{
    journeyId: 'maintainProject',
    business: { actorRef: 'projectManager', entry: { mode: 'contextOrLookup' }, steps: [
      { stepId: 'locateProject', kind: 'locate', entity: 'Project' },
      { stepId: 'updateProject', kind: 'act', entity: 'Project' },
    ] },
  }] } });
  const update = graph.byStepRef.get('maintainProject.updateProject')!;
  assert.equal(update.creates, false);
  assert.deepEqual(update.requires.map(item => item.contextId), ['selectedProject']);
});

test('a platform-owned parent is never a coordination requirement', () => {
  const graph = deriveNs4Contexts({ ontology, access, journeys: { journeys: [{
    journeyId: 'createProject',
    business: { actorRef: 'projectManager', entry: { mode: 'coldStart' }, steps: [
      { stepId: 'captureProject', kind: 'act', entity: 'Project' },
    ] },
  }] } });
  assert.deepEqual(graph.byStepRef.get('createProject.captureProject')!.requires, []);
});

test('an event-driven journey carries the entity of the handoff that targets its profile', () => {
  const graph = deriveNs4Contexts({ ontology, access, journeys: { journeys: [
    { journeyId: 'publishUpdate', business: { actorRef: 'projectManager', entry: { mode: 'coldStart' }, steps: [
      { stepId: 'locateProject', kind: 'locate', entity: 'Project' },
      { stepId: 'notifyClient', kind: 'handoff', entity: 'ChangeOrder', targetProfile: 'clientPortal' },
    ] } },
    { journeyId: 'readUpdate', business: { actorRef: 'client', entry: { mode: 'eventDriven' }, steps: [
      { stepId: 'inspectUpdate', kind: 'inspect', entity: 'WorkTask' },
    ] } },
  ] } });
  assert.deepEqual(graph.entryByJourneyId.get('readUpdate')!.map(item => item.contextId), ['selectedChangeOrder']);
  assert.deepEqual(graph.entryByJourneyId.get('publishUpdate'), []);
});

test('an event-driven journey without an internal sender carries the entity of its first step', () => {
  const graph = deriveNs4Contexts({ ontology, access, journeys: { journeys: [
    { journeyId: 'readUpdate', business: { actorRef: 'client', entry: { mode: 'eventDriven' }, steps: [
      { stepId: 'inspectUpdate', kind: 'inspect', entity: 'WorkTask' },
    ] } },
  ] } });
  assert.deepEqual(graph.entryByJourneyId.get('readUpdate')!.map(item => item.contextId), ['selectedWorkTask']);
});

test('the catalog is entity-keyed, id-field resolved and free of duplicates', () => {
  const graph = deriveNs4Contexts({ ontology, access, journeys: { journeys: [
    { journeyId: 'a', business: { actorRef: 'projectManager', entry: { mode: 'coldStart' }, steps: [
      { stepId: 'locateProject', kind: 'locate', entity: 'Project' },
      { stepId: 'captureChangeOrder', kind: 'act', entity: 'ChangeOrder' },
    ] } },
    { journeyId: 'b', business: { actorRef: 'projectManager', entry: { mode: 'coldStart' }, steps: [
      { stepId: 'inspectProject', kind: 'inspect', entity: 'Project' },
    ] } },
  ] } });
  assert.deepEqual(graph.catalog.map(item => item.contextId), ['selectedChangeOrder', 'selectedProject']);
  assert.equal(graph.catalog.find(item => item.contextId === 'selectedProject')?.idFieldRef, 'projectId');
  assert.equal(ns4ContextIdOf('Project'), 'selectedProject');
  assert.deepEqual(collectNs4JourneyEntities({ journeys: [
    { journeyId: 'a', business: { actorRef: 'x', entry: { mode: 'coldStart' }, steps: [{ stepId: 's', kind: 'act', entity: 'ChangeOrder' }] } },
  ] }), ['ChangeOrder']);
});
