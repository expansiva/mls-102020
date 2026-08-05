import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createNs4E4RepairStep,
  createNs4Pipeline,
  markNs4E1Approved,
  markNs4E2Approved,
  markNs4E2Running,
  markNs4E2WaitingHuman,
  markNs4E3Approved,
  markNs4E3Running,
  markNs4E4Approved,
  markNs4E4Failed,
  markNs4E4Running,
  markNs4E4WaitingHuman,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { normalizeNs4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { buildNs4OntologyArtifacts, normalizeNs4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import { validateNs4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/gate.js';
import { resolveNs4E4HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e4/hookArgs.js';

const journeys = normalizeNs4E2Review({
  moduleName: 'buildFlowFsm', userLanguage: 'en', reviewRound: 1,
  journeys: [{
    journeyId: 'manageProjects', business: {
      actorRef: 'projectManager', title: 'Manage projects', goal: 'Manage a selected project.', prerequisites: [],
      entry: { mode: 'coldStart', carries: [] }, businessRules: [],
      steps: [{
        stepId: 'selectProject', kind: 'locate', intent: 'Select a project.', requiresContext: [],
        providesContext: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true, description: 'Selected project.' }],
        result: 'Project selected.', featureRefs: ['projectManagement'],
      }], outcome: { statement: 'Project available.', evidence: ['Project selected.'] },
    },
  }],
  features: [{ featureId: 'projectManagement', title: 'Projects', priority: 'now', journeyStepRefs: ['manageProjects.selectProject'] }],
});

const access = normalizeNs4E3Review({
  moduleName: 'buildFlowFsm', userLanguage: 'en', reviewRound: 1,
  profiles: [{ profileId: 'projectManager', title: 'Project manager', kind: 'internal', description: 'Manager.', actorRefs: ['projectManager'], landingIntent: 'Select projects.' }],
  authorities: [
    { authorityRef: 'buildflow:projectread', title: 'Read projects', description: 'Read projects.', journeyStepRefs: ['manageProjects.selectProject'], informationNeeds: [] },
    { authorityRef: 'buildflow:clientprojectview', title: 'Client project summary', description: 'Published summary.', journeyStepRefs: [], informationNeeds: ['Published client project summary'] },
  ],
  grants: [{
    profileRef: 'projectManager', authorityRef: 'buildflow:projectread', reason: 'Manage projects.',
    dataScope: { mode: 'assigned', description: 'Assigned projects.' },
    disclosure: { mode: 'fullRecord', description: 'Full project record.', allowedInformation: [], deniedInformation: [] }, constraints: [],
  }],
});

const reviewInput = {
  planId: 'e4-ontology-review', moduleName: 'buildFlowFsm', userLanguage: 'en', title: 'Business ontology',
  reviewRound: 1, solutionMode: 'new', businessDomain: 'Construction operations',
  entities: [
    {
      entityId: 'Project', title: 'Project', description: 'A construction engagement.', kind: 'core', ownership: 'moduleOwned',
      sourceRefs: { journeyIds: ['manageProjects'], featureIds: ['projectManagement'], authorityRefs: ['buildflow:projectread'] },
      fields: [
        { fieldId: 'projectId', title: 'Project id', type: 'uuid', required: true, description: 'Stable id.', constraints: [{ constraintId: 'uniqueProjectId', kind: 'unique', value: 'true', description: 'Unique id.', source: 'inferred' }] },
        { fieldId: 'name', title: 'Name', type: 'string', required: true, description: 'Project name.', constraints: [] },
      ], lifecycleStates: [], invariants: [], storage: { mode: 'new', notes: 'New persistence.' },
    },
    {
      entityId: 'ClientProjectSummary', title: 'Client project summary', description: 'Published related-project projection.', kind: 'projection', ownership: 'derived',
      sourceRefs: { journeyIds: [], featureIds: [], authorityRefs: ['buildflow:clientprojectview'] },
      fields: [{ fieldId: 'projectId', title: 'Project id', type: 'uuid', required: true, description: 'Related project.', constraints: [] }],
      lifecycleStates: [], invariants: [], storage: { mode: 'new', notes: 'Derived from published project data.' },
    },
  ],
  relationships: [{ relationshipId: 'summaryDescribesProject', fromEntity: 'ClientProjectSummary', toEntity: 'Project', type: 'manyToOne', required: true, description: 'Summary belongs to its related project.' }],
  changeSummary: ['Initial proposal.'],
};

test('E4 preserves hook args byte-for-byte', () => {
  const original = '{"planId":"e4-ontology","reviewRound":2,"solutionMode":"new"}';
  assert.equal(resolveNs4E4HookArgs(undefined, original), original);
  assert.equal(resolveNs4E4HookArgs(original, '{}'), original);
});

test('E4 bounded repair step carries gate feedback under a unique open plan id', () => {
  const step = createNs4E4RepairStep('buildFlowFsm', 2, 1, 'OperationsPortfolio is disconnected');
  assert.equal(step.planning?.planId, 'e4-ontology-round-2-repair-1');
  assert.equal(step.status, 'waiting_human_input');
  assert.match(String(step.prompt), /OperationsPortfolio is disconnected/);
});

test('E4 accepts a connected greenfield ontology covering journeys and access information', () => {
  const review = normalizeNs4E4Review(reviewInput);
  assert.deepEqual(validateNs4E4Review(review, journeys, access), { ok: true, issues: [] });
});

test('E4 rejects an access information need omitted from ontology traceability', () => {
  const broken = structuredClone(reviewInput);
  broken.entities[1].sourceRefs.authorityRefs = [];
  const gate = validateNs4E4Review(normalizeNs4E4Review(broken), journeys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_INFORMATION_COVERAGE'));
});

test('E4 rejects disconnected business entities', () => {
  const broken = structuredClone(reviewInput);
  broken.relationships = [];
  const gate = validateNs4E4Review(normalizeNs4E4Review(broken), journeys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_ENTITY_ORPHAN'));
});

test('E4 normalizes common relationship endpoint aliases into the canonical contract', () => {
  const aliased = structuredClone(reviewInput) as any;
  const relationship = aliased.relationships[0];
  relationship.sourceEntity = relationship.fromEntity;
  relationship.targetEntity = relationship.toEntity;
  delete relationship.fromEntity;
  delete relationship.toEntity;
  const normalized = normalizeNs4E4Review(aliased);
  assert.equal(normalized.relationships[0].fromEntity, 'ClientProjectSummary');
  assert.equal(normalized.relationships[0].toEntity, 'Project');
});

test('E4 creates one entity artifact plus an index with the same frozen hash', async () => {
  const review = normalizeNs4E4Review(reviewInput);
  const artifacts = await buildNs4OntologyArtifacts(review, 'human', '2026-08-05T18:00:00.000Z');
  assert.equal(artifacts.entities.length, 2);
  assert.match(artifacts.index.ontologyHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(artifacts.entities.every(entity => entity.ontologyHash === artifacts.index.ontologyHash));
  assert.equal(artifacts.index.entities[0].definitionRef, 'l4/buildFlowFsm/ontology/Project.defs.ts');
});

test('E4 lifecycle resumes an E3-approved v4 pipeline and advances to E5', () => {
  const e1 = markNs4E1Approved(createNs4Pipeline('buildFlowFsm', 'prompt'), 'human', 'module.defs.ts');
  const e2 = markNs4E2Approved(markNs4E2WaitingHuman(markNs4E2Running(e1, 1), 1, 'e2.json'), 'human', ['journey.ts']);
  const e3 = markNs4E3Approved(markNs4E3Running(e2, 1), 'human', 'access.defs.ts');
  assert.equal(resolveNs4ExistingAction(true, e3, true), 'resume-e4');
  const waiting = markNs4E4WaitingHuman(markNs4E4Running(e3, 2), 2, 'e4.json');
  assert.equal(waiting.steps.e4?.solutionMode, 'new');
  const failed = markNs4E4Failed(waiting, 'provider timeout');
  assert.equal(failed.steps.e4?.error, 'provider timeout');
  const approved = markNs4E4Approved(waiting, 'human', ['Project.defs.ts', 'index.defs.ts']);
  assert.equal(approved.nextStep, 'e5-rules');
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-next');
});
