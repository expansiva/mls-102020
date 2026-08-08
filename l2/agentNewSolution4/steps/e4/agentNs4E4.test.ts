import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createNs4E4FinalizeStep,
  createNs4E4RepairStep,
  createNs4Pipeline,
  NS4_E4_MAX_PARALLEL,
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
import {
  normalizeNs4BusinessObjectId,
  normalizeNs4E2Review,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { normalizeNs4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import {
  assembleNs4E4Review,
  buildNs4OntologyArtifacts,
  normalizeNs4E4EntityDraft,
  normalizeNs4E4PlanDraft,
  normalizeNs4E4Review,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import {
  validateNs4E4EntityDraft,
  validateNs4E4Plan,
  validateNs4E4Review,
} from '/_102020_/l2/agentNewSolution4/steps/e4/gate.js';
import { resolveNs4E4HookArgs, resolveNs4E4InvocationArgs } from '/_102020_/l2/agentNewSolution4/steps/e4/hookArgs.js';

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
      ], lifecycleStates: [], invariants: [], storage: {
        target: 'moduleDatabase', scope: 'module', idField: 'projectId', notes: 'Transactional module persistence.',
      },
    },
    {
      entityId: 'ClientProjectSummary', title: 'Client project summary', description: 'Published related-project projection.', kind: 'projection', ownership: 'derived',
      sourceRefs: { journeyIds: [], featureIds: [], authorityRefs: ['buildflow:clientprojectview'] },
      fields: [{ fieldId: 'projectId', title: 'Project id', type: 'uuid', required: true, description: 'Related project.', constraints: [] }],
      lifecycleStates: [], invariants: [], storage: { target: 'derived', scope: 'none', notes: 'Derived from published project data.' },
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

test('E4 reconstructs base invocation when a parallel child has only entity hook args', () => {
  const hookArgs = resolveNs4E4HookArgs('entity:Client', undefined);
  assert.equal(hookArgs, 'entity:Client');
  assert.deepEqual(JSON.parse(resolveNs4E4InvocationArgs(hookArgs, 'Client')), {
    planId: 'e4-ontology', solutionMode: 'new',
  });
});

test('E4 bounded repair step carries gate feedback under a unique open plan id', () => {
  const step = createNs4E4RepairStep('buildFlowFsm', 2, 1, 'OperationsPortfolio is disconnected');
  assert.equal(step.planning?.planId, 'e4-ontology-round-2-repair-1');
  assert.equal(step.status, 'waiting_human_input');
  assert.doesNotMatch(String(step.stepTitle), /^👤/u);
  assert.match(String(step.prompt), /OperationsPortfolio is disconnected/);
});

test('E4 uses the proven 20-slot ontology fan-out and a dependency-bound finalizer', () => {
  assert.equal(NS4_E4_MAX_PARALLEL, 20);
  const step = createNs4E4FinalizeStep('buildFlowFsm', 2, ['e4-ontology-round-2'], 1, 0);
  assert.equal(step.planning?.planId, 'e4-ontology-round-2-finalize-1-0');
  assert.deepEqual(step.planning?.dependsOn, ['e4-ontology-round-2']);
  assert.equal(step.status, 'waiting_dependency');
  assert.match(String(step.prompt), /"stage":"finalize"/);
});

test('E4 overview freezes global decisions and entity detail reassembles the final review', () => {
  const full = normalizeNs4E4Review(reviewInput);
  const plan = normalizeNs4E4PlanDraft(reviewInput);
  assert.deepEqual(validateNs4E4Plan(plan, journeys, access), { ok: true, issues: [] });
  assert.ok(plan.entities.every(entity => !('fields' in entity) && !('invariants' in entity)));
  const details = full.entities.map(entity => normalizeNs4E4EntityDraft(
    entity, full.moduleName, full.reviewRound, entity.entityId,
  ));
  assert.ok(details.every(detail => validateNs4E4EntityDraft(plan, detail).ok));
  assert.deepEqual(assembleNs4E4Review(plan, details), full);
});

test('E2 and E4 share canonical PascalCase business object ids', () => {
  assert.equal(normalizeNs4BusinessObjectId('Project portfolio'), 'ProjectPortfolio');
  assert.equal(normalizeNs4BusinessObjectId('Worker or subcontractor'), 'WorkerOrSubcontractor');
  assert.equal(normalizeNs4BusinessObjectId('WorkTask'), 'WorkTask');

  const spacedJourneys = structuredClone(journeys) as any;
  spacedJourneys.journeys[0].business.steps[0].providesContext[0].businessObject = 'Project portfolio';
  const normalizedJourneys = normalizeNs4E2Review(spacedJourneys);
  assert.equal(
    normalizedJourneys.journeys[0].business.steps[0].providesContext[0].businessObject,
    'ProjectPortfolio',
  );

  const matchingPlan = structuredClone(reviewInput) as any;
  matchingPlan.entities[0].entityId = 'ProjectPortfolio';
  matchingPlan.entities[0].storage.idField = 'projectPortfolioId';
  matchingPlan.relationships[0].toEntity = 'ProjectPortfolio';
  assert.deepEqual(validateNs4E4Plan(normalizeNs4E4PlanDraft(matchingPlan), normalizedJourneys, access), {
    ok: true, issues: [],
  });
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

test('E4 rejects a required journey business object omitted from the ontology overview', () => {
  const missingObjectJourneys = structuredClone(journeys);
  missingObjectJourneys.journeys[0].business.steps[0].providesContext.push({
    contextId: 'publishedClientStatus', businessObject: 'PublishedClientStatus', cardinality: 'one',
    required: true, description: 'Status package published to the client.',
  });
  const gate = validateNs4E4Plan(normalizeNs4E4PlanDraft(reviewInput), missingObjectJourneys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_REQUIRED_CONTEXT_OBJECT'
    && issue.message.includes('PublishedClientStatus')));
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
  assert.equal(normalized.relationships[0].persistence.mode, 'derivedJoin');
});

test('E4 creates one entity artifact plus an index with the same frozen hash', async () => {
  const review = normalizeNs4E4Review(reviewInput);
  const artifacts = await buildNs4OntologyArtifacts(review, 'human', '2026-08-05T18:00:00.000Z');
  assert.equal(artifacts.entities.length, 2);
  assert.match(artifacts.index.ontologyHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(artifacts.entities.every(entity => entity.ontologyHash === artifacts.index.ontologyHash));
  assert.equal(artifacts.index.entities[0].definitionRef, 'l4/buildFlowFsm/ontology/Project.defs.ts');
  assert.equal(artifacts.index.entities[0].storage.target, 'moduleDatabase');
});

test('E4 accepts explicit organization MDM routing and exposes it in the ontology index', async () => {
  const mdmInput = structuredClone(reviewInput) as any;
  mdmInput.entities[0].kind = 'mdm';
  mdmInput.entities[0].storage = {
    target: 'mdm', scope: 'organization', idField: 'projectId', mdmType: 'buildFlowFsm.Project',
    notes: 'Stable organization project master reused by transactions and reports.',
  };
  const review = normalizeNs4E4Review(mdmInput);
  assert.deepEqual(validateNs4E4Review(review, journeys, access), { ok: true, issues: [] });
  const artifacts = await buildNs4OntologyArtifacts(review, 'human', '2026-08-05T18:00:00.000Z');
  assert.equal(artifacts.index.entities[0].storage.mdmType, 'buildFlowFsm.Project');
  assert.equal(artifacts.index.relationships[0].persistence.mode, 'derivedJoin');
});

test('E4 rejects an MDM entity routed to a local transactional table', () => {
  const broken = structuredClone(reviewInput) as any;
  broken.entities[0].kind = 'mdm';
  const gate = validateNs4E4Review(normalizeNs4E4Review(broken), journeys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_STORAGE_TARGET'));
});

test('E4 lifecycle resumes an E3-approved current flow and advances to E5', () => {
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
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-e5');
  assert.equal(markNs4E4Running(approved, 3), approved);
  assert.equal(markNs4E4WaitingHuman(approved, 3, 'late-draft.json'), approved);
  assert.equal(markNs4E4Failed(approved, 'late duplicate callback'), approved);
});
