import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createNs4E4FinalizeStep,
  createNs4E4RelationshipBindingStep,
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
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  normalizeNs4BusinessObjectId,
  normalizeNs4E2Review,
} from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import { normalizeNs4E3Review } from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import {
  assembleNs4E4Review,
  applyNs4E4RelationshipBindings,
  buildNs4OntologyArtifacts,
  humanizeNs4EnumCode,
  normalizeNs4E4EntityDraft,
  stripNs4DerivedFieldUnions,
  normalizeNs4E4PlanDraft,
  normalizeNs4E4RelationshipBindings,
  normalizeNs4E4Review,
} from '/_102020_/l2/agentNewSolution/steps/e4/contracts.js';
import {
  validateNs4E4EntityDraft,
  validateNs4E4Plan,
  validateNs4E4RelationshipBindings,
  validateNs4E4Review,
} from '/_102020_/l2/agentNewSolution/steps/e4/gate.js';
import { resolveNs4E4HookArgs, resolveNs4E4InvocationArgs } from '/_102020_/l2/agentNewSolution/steps/e4/hookArgs.js';

const journeys = normalizeNs4E2Review({
  moduleName: 'buildFlowFsm', userLanguage: 'en', reviewRound: 1,
  journeys: [{
    journeyId: 'manageProjects', business: {
      actorRef: 'projectManager', title: 'Manage projects', goal: 'Manage a selected project.', entry: { mode: 'coldStart' }, useRules: [],
      steps: [{
        stepId: 'selectProject', kind: 'locate', entity: 'Project', title: 'Select a project.', description: 'Project selected.', featureRefs: ['projectManagement'],
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
    disclosure: { mode: 'fullRecord', description: 'Full project record.', allowedInformation: [], deniedInformation: [] }, useRules: [],
  }],
});

const reviewInput = {
  planId: 'e4-ontology-review', moduleName: 'buildFlowFsm', userLanguage: 'en', title: 'Business ontology',
  reviewRound: 1, solutionMode: 'new', businessDomain: 'Construction operations',
  entities: [
    {
      entityId: 'Project', title: 'Project', description: 'A construction engagement.', kind: 'core', ownership: 'moduleOwned', party: 'none',
      sourceRefs: { journeyIds: ['manageProjects'], featureIds: ['projectManagement'], authorityRefs: ['buildflow:projectread'] },
      fields: [
        { fieldId: 'projectId', title: 'Project id', type: 'uuid', required: true, description: 'Stable id.', constraints: [{ constraintId: 'uniqueProjectId', kind: 'unique', value: 'true', description: 'Unique id.', source: 'inferred' }] },
        { fieldId: 'name', title: 'Name', type: 'string', required: true, description: 'Project name.', constraints: [] },
      ], lifecycleStates: [], useRules: [], storage: {
        target: 'moduleDatabase', scope: 'module', idField: 'projectId', notes: 'Transactional module persistence.',
      },
    },
    {
      entityId: 'ClientProjectSummary', title: 'Client project summary', description: 'Published related-project projection.', kind: 'projection', ownership: 'derived', party: 'none',
      sourceRefs: { journeyIds: [], featureIds: [], authorityRefs: ['buildflow:clientprojectview'] },
      fields: [{ fieldId: 'projectId', title: 'Project id', type: 'uuid', required: true, description: 'Related project.', constraints: [] }],
      lifecycleStates: [], useRules: [], storage: { target: 'derived', scope: 'none', notes: 'Derived from published project data.' },
    },
  ],
  relationships: [{
    relationshipId: 'summaryDescribesProject', fromEntity: 'ClientProjectSummary', toEntity: 'Project',
    type: 'manyToOne', required: true, description: 'Summary belongs to its related project.',
    realization: {
      kind: 'derived', ownerEntity: 'ClientProjectSummary',
      from: { entityId: 'ClientProjectSummary', fieldIds: ['projectId'] },
      to: { entityId: 'Project', fieldIds: ['projectId'] },
      description: 'The published projection is derived by matching its projectId to Project.projectId.',
    },
  }],
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
  const step = createNs4E4FinalizeStep('buildFlowFsm', 2, ['e4-ontology-round-2-entities-1'], 1, 0);
  assert.equal(step.planning?.planId, 'e4-ontology-round-2-finalize-1-0');
  assert.deepEqual(step.planning?.dependsOn, ['e4-ontology-round-2-entities-1']);
  assert.equal(step.status, 'waiting_dependency');
  assert.match(String(step.prompt), /"stage":"finalize"/);
  const source = readFileSync(new URL('agentNs4E4.ts', import.meta.url), 'utf8');
  assert.match(source, /parallel\.step\.planning\?\.planId/);
  assert.doesNotMatch(source, /createNs4E4FinalizeStep\(args\.moduleName, reviewRound, \[currentPlanId\]/);
});

test('E4 schedules a dedicated relationship binding pass with bounded repair state', () => {
  const initial = createNs4E4RelationshipBindingStep('buildFlowFsm', 2);
  assert.equal(initial.planning?.planId, 'e4-ontology-round-2-relationship-binding-0');
  assert.match(String(initial.prompt), /"stage":"bindRelationships"/);
  const repair = createNs4E4RelationshipBindingStep('buildFlowFsm', 2, 1, 'unknown projectRef');
  assert.equal(repair.planning?.planId, 'e4-ontology-round-2-relationship-binding-1');
  assert.match(String(repair.prompt), /unknown projectRef/);
});

test('every E4 LLM prompt declares an active model alias explicitly', () => {
  for (const file of ['prompt.md', 'promptEntity.md', 'promptRelationships.md']) {
    const prompt = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(prompt, /<!--\s*modelType:\s*reasoning\s*-->/, `${file} must not fall back to the inactive cost alias`);
  }
});

test('E4 overview and entity prompts require stable English enum codes', () => {
  for (const file of ['prompt.md', 'promptEntity.md']) {
    const prompt = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(prompt, /stable English codes/u, `${file} must tell the model that enum values are English codes`);
    assert.match(prompt, /ativo/u, `${file} must name the Portuguese counter-example`);
  }
  assert.match(readFileSync(new URL('prompt.md', import.meta.url), 'utf8'), /lifecycleLabels/u);
  const entityPrompt = readFileSync(new URL('promptEntity.md', import.meta.url), 'utf8');
  assert.match(entityPrompt, /enumLabels/u);
  assert.match(entityPrompt, /"fieldId": "priority"/u, 'the entity example must show a labelled non-lifecycle enum, not only a uuid field');
  assert.match(entityPrompt, /"enumLabels"/u);
  assert.match(entityPrompt, /Do not emit\s+`enumLabels` on the `status` field/u);
});

test('E4 overview prompt declares singleton cardinality with a conservative default', () => {
  const prompt = readFileSync(new URL('prompt.md', import.meta.url), 'utf8');
  assert.match(prompt, /cardinality:\s*"singleton"/u);
  assert.match(prompt, /Petition/u);
  assert.match(prompt, /Task, Pet, Order/u);
  assert.match(prompt, /omit the field/u);
  assert.match(readFileSync(new URL('promptEntity.md', import.meta.url), 'utf8'), /cardinality/u);
});

test('E4 ontology widget surfaces assumed enum-label decisions', () => {
  const source = readFileSync(new URL('../../widgets/widgetNs4Ontology.ts', import.meta.url), 'utf8');
  assert.match(source, /this\.value\.systemDecisions\?\.length/);
});

test('E4 overview freezes global decisions and entity detail reassembles the final review', () => {
  const full = normalizeNs4E4Review(reviewInput);
  const plan = normalizeNs4E4PlanDraft(reviewInput);
  assert.deepEqual(validateNs4E4Plan(plan, journeys, access), { ok: true, issues: [] });
  assert.ok(plan.entities.every(entity => !('fields' in entity) && !('useRules' in entity)));
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
  spacedJourneys.journeys[0].business.steps[0].entity = 'Project portfolio';
  const normalizedJourneys = normalizeNs4E2Review(spacedJourneys);
  assert.equal(normalizedJourneys.journeys[0].business.steps[0].entity, 'ProjectPortfolio');

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

test('E4 plan may defer field binding but the final review may not', () => {
  const input = structuredClone(reviewInput) as any;
  delete input.relationships[0].realization;
  assert.deepEqual(validateNs4E4Plan(normalizeNs4E4PlanDraft(input), journeys, access), { ok: true, issues: [] });
  const gate = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_RELATIONSHIP_REALIZATION'));
});

test('E4 applies exactly one field-checked binding per frozen relationship', () => {
  const input = structuredClone(reviewInput) as any;
  delete input.relationships[0].realization;
  const unbound = normalizeNs4E4Review(input);
  const bindings = normalizeNs4E4RelationshipBindings({
    moduleName: 'buildFlowFsm', reviewRound: 1,
    bindings: [{
      relationshipId: 'summaryDescribesProject', realization: {
        kind: 'derived', ownerEntity: 'ClientProjectSummary',
        from: { entityId: 'ClientProjectSummary', fieldIds: ['projectId'] },
        to: { entityId: 'Project', fieldIds: ['projectId'] },
        description: 'Derived by the shared project identity.',
      },
    }],
  }, 'buildFlowFsm', 1);
  assert.deepEqual(validateNs4E4RelationshipBindings(unbound, bindings, journeys, access), { ok: true, issues: [] });
  assert.equal(applyNs4E4RelationshipBindings(unbound, bindings).relationships[0].realization?.to.fieldIds[0], 'projectId');

  bindings.bindings[0].realization.from.fieldIds = ['inventedProjectId'];
  const broken = validateNs4E4RelationshipBindings(unbound, bindings, journeys, access);
  assert.ok(broken.issues.some(issue => issue.code === 'NS4_E4_RELATIONSHIP_FIELD_UNKNOWN'));
});

test('E4 accepts a required foreign-key binding owned by either semantic endpoint', () => {
  const input = structuredClone(reviewInput) as any;
  input.entities[1].kind = 'supporting';
  input.entities[1].ownership = 'moduleOwned';
  input.entities[1].fields = [
    { fieldId: 'summaryId', title: 'Summary id', type: 'uuid', required: true, description: 'Stable summary id.', constraints: [] },
    { fieldId: 'projectRef', title: 'Project reference', type: 'uuid', required: true, description: 'Owning project.', constraints: [] },
  ];
  input.entities[1].storage = {
    target: 'moduleDatabase', scope: 'module', idField: 'summaryId', notes: 'Module-owned published snapshot.',
  };
  input.relationships[0].realization = {
    kind: 'fieldReference', ownerEntity: 'ClientProjectSummary',
    from: { entityId: 'ClientProjectSummary', fieldIds: ['projectRef'] },
    to: { entityId: 'Project', fieldIds: ['projectId'] },
    description: 'ClientProjectSummary.projectRef references Project.projectId.',
  };
  const review = normalizeNs4E4Review(input);
  assert.deepEqual(validateNs4E4Review(review, journeys, access), { ok: true, issues: [] });
  assert.equal(review.relationships[0].persistence.mode, 'moduleReference');
});

test('E4 freezes named lifecycle meanings as exact reusable state predicates', () => {
  const input = structuredClone(reviewInput) as any;
  input.entities[0].lifecycleStates = ['notStarted', 'inProgress', 'completed', 'cancelled'];
  input.entities[0].initialState = 'notStarted';
  input.entities[0].terminalStates = ['completed', 'cancelled'];
  input.entities[0].fields.push({
    fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Task status.',
    constraints: [{
      constraintId: 'taskStatus', kind: 'enum',
      value: '["notStarted","inProgress","completed","cancelled"]',
      description: 'Supported states.', source: 'journey',
    }],
  });
  input.entities[0].lifecyclePredicates = [{
    predicateId: 'unfinishedWorkTask',
    description: 'A work task is unfinished while not started or in progress.',
    stateIds: ['notStarted', 'inProgress'], source: 'journey',
  }];
  const review = normalizeNs4E4Review(input);
  const plan = normalizeNs4E4PlanDraft(input);
  assert.deepEqual(validateNs4E4Review(review, journeys, access), { ok: true, issues: [] });
  assert.deepEqual(plan.entities[0].lifecyclePredicates, review.entities[0].lifecyclePredicates);
  assert.deepEqual(validateNs4E4Plan(plan, journeys, access), { ok: true, issues: [] });
  assert.deepEqual(review.entities[0].lifecyclePredicates[0].stateIds, ['notStarted', 'inProgress']);

  input.entities[0].lifecyclePredicates[0].stateIds.push('unknown');
  const broken = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(broken.issues.some(issue => issue.code === 'NS4_E4_LIFECYCLE_PREDICATE_STATE'));
});

test('E4 requires an explicit non-terminal initial lifecycle state', () => {
  const input = structuredClone(reviewInput) as any;
  input.entities[0].lifecycleStates = ['draft', 'published'];
  input.entities[0].fields.push({ fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Lifecycle status.', constraints: [] });
  input.entities[0].terminalStates = ['published'];
  let gate = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_LIFECYCLE_INITIAL_REQUIRED'));

  input.entities[0].initialState = 'missing';
  gate = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_LIFECYCLE_INITIAL_STATE'));

  input.entities[0].initialState = 'published';
  gate = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_LIFECYCLE_INITIAL_TERMINAL'));
});

test('E4 rejects an access information need omitted from ontology traceability', () => {
  const broken = structuredClone(reviewInput);
  broken.entities[1].sourceRefs.authorityRefs = [];
  const gate = validateNs4E4Review(normalizeNs4E4Review(broken), journeys, access);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E4_INFORMATION_COVERAGE'));
});

test('E4 rejects a required journey business object omitted from the ontology overview', () => {
  const missingObjectJourneys = structuredClone(journeys);
  missingObjectJourneys.journeys[0].business.steps.push({
    stepId: 'publishClientStatus', kind: 'act', entity: 'PublishedClientStatus',
    title: 'Publish the client status package.', description: 'The client status package is published.',
    featureRefs: [],
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

// PARTY POLICY (18/ago/2026). The three checks exist because the buildFlowFsm run obeyed the prose and
// still put people in a local table: Client and Project went to MDM, FieldWorker (a person, `core` +
// `external`) became a seeded module table duplicating the organization's users.
test('E4 requires the party declaration and routes every party to MDM', () => {
  const missing = structuredClone(reviewInput) as any;
  const gate = validateNs4E4Review(normalizeNs4E4Review(missing), journeys, access);
  // reviewInput declares party on both entities, so the baseline is silent…
  assert.ok(!gate.issues.some(issue => issue.code === 'NS4_E4_PARTY_MISSING'), JSON.stringify(gate.issues));
  // …and an entity whose party the model did not declare (or declared outside the vocabulary) is named.
  delete missing.entities[0].party;
  missing.entities[1].party = 'people';
  const undeclared = validateNs4E4Review(normalizeNs4E4Review(missing), journeys, access);
  assert.equal(undeclared.issues.filter(issue => issue.code === 'NS4_E4_PARTY_MISSING').length, 2);

  // A person kept in the module database is the FieldWorker defect, now blocking.
  const person = structuredClone(reviewInput) as any;
  person.entities[0].party = 'person';
  const routed = validateNs4E4Review(normalizeNs4E4Review(person), journeys, access);
  const issue = routed.issues.find(each => each.code === 'NS4_E4_PARTY_STORAGE');
  assert.ok(issue, JSON.stringify(routed.issues));
  assert.match(issue!.message, /master data of the organization/u);
  assert.match(issue!.message, /platformUserId/u);
});

test('E4 rejects kind core with ownership external — the combination the policy never defined', () => {
  const broken = structuredClone(reviewInput) as any;
  broken.entities[0].ownership = 'external';
  broken.entities[0].storage = { target: 'external', scope: 'platform', notes: 'Platform user reference.' };
  const gate = validateNs4E4Review(normalizeNs4E4Review(broken), journeys, access);
  const issue = gate.issues.find(each => each.code === 'NS4_E4_OWNERSHIP_EXTERNAL_CORE');
  assert.ok(issue, JSON.stringify(gate.issues));
  assert.match(issue!.message, /external-reference field \(platformUserId\)/u);
});

test('E4 rejects singleton cardinality when a journey still creates instances of the entity', () => {
  const input = structuredClone(reviewInput) as any;
  input.entities[0].cardinality = 'singleton';
  const creating = structuredClone(journeys) as any;
  creating.journeys[0].business.steps = [{
    stepId: 'captureProject', kind: 'act', entity: 'Project', title: 'Create a project.',
    description: 'Project created.', featureRefs: ['projectManagement'],
  }];
  const gate = validateNs4E4Review(normalizeNs4E4Review(input), creating, access);
  const issue = gate.issues.find(item => item.code === 'NS4_E4_SINGLETON_CREATE');
  assert.ok(issue, JSON.stringify(gate.issues));
  assert.match(issue!.message, /captureProject/);
  assert.match(issue!.message, /Project/);

  const locating = structuredClone(journeys);
  const ok = validateNs4E4Review(normalizeNs4E4Review(input), locating, access);
  assert.ok(!ok.issues.some(item => item.code === 'NS4_E4_SINGLETON_CREATE'), JSON.stringify(ok.issues));
});

const LISTA_ASSINATURA_ONTOLOGY = JSON.parse(
  readFileSync(new URL('fixtures/listaAssinatura-e4-ontology-draft.json', import.meta.url), 'utf8'),
) as unknown;

test('E4 accepts listaAssinatura Petition as singleton and leaves PetitionSignature unmarked', () => {
  const review = normalizeNs4E4Review(LISTA_ASSINATURA_ONTOLOGY);
  const petition = review.entities.find(entity => entity.entityId === 'Petition');
  const signature = review.entities.find(entity => entity.entityId === 'PetitionSignature');
  assert.equal(petition?.cardinality, 'singleton');
  assert.equal('cardinality' in (signature || {}), false);
  const schema = JSON.parse(readFileSync(new URL('../../schemas/e4-review.schema.json', import.meta.url), 'utf8')) as any;
  const entitySchema = schema.$defs.entity;
  assert.equal(entitySchema.additionalProperties, false);
  assert.deepEqual(entitySchema.properties.cardinality, { type: 'string', enum: ['singleton'] });
  assert.ok(!entitySchema.required.includes('cardinality'));
  const gate = validateNs4E4Review(review);
  assert.ok(!gate.issues.some(issue => issue.code === 'NS4_E4_SINGLETON_CREATE'), JSON.stringify(gate.issues));
  assert.ok(gate.ok, JSON.stringify(gate.issues));
});

test('E4 management fixture stays without cardinality after normalize', () => {
  const raw = readFileSync(new URL('fixtures/petShop-e4-ontology-draft.json', import.meta.url), 'utf8');
  assert.doesNotMatch(raw, /"cardinality"/u);
  const review = normalizeNs4E4Review(JSON.parse(raw));
  assert.ok(review.entities.every(entity => !('cardinality' in entity)));
});

test('E4 flags an ownership rule when the entity has no owner field (petShop customerCanViewOnlyOwnPets)', () => {
  const broken = structuredClone(reviewInput) as any;
  broken.entities[0].useRules = ['customerCanViewOnlyOwnPets'];
  const gate = validateNs4E4Review(normalizeNs4E4Review(broken), journeys, access);
  const issue = gate.issues.find(item => item.code === 'NS4_E4_OWNER_RELATION');
  assert.ok(issue, JSON.stringify(gate.issues));
  assert.match(issue!.message, /customerCanViewOnlyOwnPets/);
  assert.match(issue!.message, /Project/);

  const withField = structuredClone(reviewInput) as any;
  withField.entities[0].useRules = ['customerCanViewOnlyOwnPets'];
  withField.entities[0].fields.push({
    fieldId: 'customerId', title: 'Customer', type: 'uuid', required: true, description: 'Owner of the record.', constraints: [],
  });
  const ok = validateNs4E4Review(normalizeNs4E4Review(withField), journeys, access);
  assert.ok(!ok.issues.some(item => item.code === 'NS4_E4_OWNER_RELATION'), JSON.stringify(ok.issues));
});

test('E4 carries the party declaration into the entity artifact', async () => {
  const input = structuredClone(reviewInput) as any;
  input.entities[0].kind = 'mdm';
  input.entities[0].party = 'organization';
  input.entities[0].storage = {
    target: 'mdm', scope: 'organization', idField: 'projectId', mdmType: 'buildFlowFsm.Project',
    notes: 'Organization master record.',
  };
  const review = normalizeNs4E4Review(input);
  assert.deepEqual(validateNs4E4Review(review, journeys, access), { ok: true, issues: [] });
  const artifacts = await buildNs4OntologyArtifacts(review, 'human', '2026-08-18T12:00:00.000Z');
  assert.equal(artifacts.entities[0].party, 'organization');
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

test('an enumerated field carries its literal values, in every shape the generators author', () => {
  const withUnions: any = structuredClone(reviewInput);
  const entity = withUnions.entities[0];
  entity.lifecycleStates = ['draft', 'active', 'closed'];
  entity.fields = [
    ...entity.fields,
    { fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Estado.', constraints: [] },
    { fieldId: 'impactType', title: 'Impacto', type: 'string', required: true, description: 'Impacto.',
      constraints: [{ constraintId: 'impactTypeEnum', kind: 'enum', value: '["cost","schedule","both"]', description: 'Custo, prazo ou ambos.', source: 'journey' }] },
    { fieldId: 'channel', title: 'Canal', type: 'string', required: false, description: 'Canal.',
      constraints: [{ constraintId: 'channelEnum', kind: 'enum', value: 'email, portal, phone', description: 'Canais aceitos.', source: 'journey' }] },
    { fieldId: 'priority', title: 'Prioridade', type: 'string', required: false, description: 'Prioridade.',
      constraints: [{ constraintId: 'priorityEnum', kind: 'enum', value: 'low|medium|high', description: 'Níveis.', source: 'journey' }] },
    { fieldId: 'note', title: 'Nota', type: 'text', required: false, description: 'Nota livre.', constraints: [] },
  ];
  const review = normalizeNs4E4Review(withUnions);
  const normalized = review.entities[0];
  const fieldOf = (fieldId: string) => normalized.fields.find(field => field.fieldId === fieldId);

  // The lifecycle is the union of a status field even when nobody wrote the constraint.
  assert.deepEqual(normalized.statusEnum, ['draft', 'active', 'closed']);
  assert.deepEqual(fieldOf('status')?.enum, ['draft', 'active', 'closed']);
  // JSON array, comma-separated and pipe-separated are all authored in practice.
  assert.deepEqual(fieldOf('impactType')?.enum, ['cost', 'schedule', 'both']);
  assert.deepEqual(fieldOf('channel')?.enum, ['email', 'portal', 'phone']);
  assert.deepEqual(fieldOf('priority')?.enum, ['low', 'medium', 'high']);
  // A field without a union stays without one; the constraint is never invented.
  assert.equal('enum' in (fieldOf('note') || {}), false);
  // The constraint remains the human-readable rule; the union does not replace it.
  assert.equal(fieldOf('impactType')?.constraints[0].kind, 'enum');

  // Re-reading an already-derived artifact derives the same values: the emission is idempotent.
  assert.deepEqual(normalizeNs4E4Review(review).entities[0], normalized);
});

test('an entity without lifecycle carries no statusEnum', () => {
  const review = normalizeNs4E4Review(structuredClone(reviewInput));
  const stateless = review.entities.find(entity => !entity.lifecycleStates.length);
  assert.ok(stateless, 'the fixture has a stateless entity');
  assert.equal('statusEnum' in stateless!, false);
});

test('the derived union never reaches the strict entity worker, and always reaches the emitted artifact', async () => {
  const source: any = structuredClone(reviewInput);
  const entity = source.entities[0];
  entity.lifecycleStates = ['draft', 'active'];
  entity.fields = [...entity.fields, { fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Estado.',
    constraints: [{ constraintId: 'statusEnum', kind: 'enum', value: '["draft","active"]', description: 'Rascunho ou ativo.', source: 'journey' }] }];

  // The worker contract owns no union key (schemas/e4-entity-worker.schema.json is strict), so the
  // persisted entity draft must not carry one back into the repair prompt.
  const draft = normalizeNs4E4EntityDraft({ fields: entity.fields, useRules: entity.useRules },
    source.moduleName, 1, entity.entityId);
  assert.equal(draft.fields.some(field => 'enum' in field), false);

  // An approved entity echoed as "previous entity" is stripped the same way.
  const review = normalizeNs4E4Review(source);
  const built = await buildNs4OntologyArtifacts(review, 'auto', '2026-08-14T00:00:00.000Z');
  const artifact = built.entities.find(item => item.entityId === entity.entityId)!;
  const echoed = stripNs4DerivedFieldUnions(artifact as unknown as { fields?: unknown });
  assert.equal((echoed as any).fields.some((field: any) => 'enum' in field), false);
  assert.equal('statusEnum' in (echoed as any), false);
  // enumLabels is authored, not derived — stripping the union must not drop it.
  entity.fields[entity.fields.length - 1].enumLabels = [{ code: 'draft', label: 'Rascunho' }, { code: 'active', label: 'Ativo' }];
  const withLabels = normalizeNs4E4EntityDraft({ fields: entity.fields, useRules: entity.useRules },
    source.moduleName, 1, entity.entityId);
  assert.deepEqual(withLabels.fields.find(field => field.fieldId === 'status')?.enumLabels?.[0], { code: 'draft', label: 'Rascunho' });
  assert.equal('enum' in (withLabels.fields.find(field => field.fieldId === 'status') || {}), false);

  // The emitted artifact is what the frontend parses: it reads data.statusEnum and data.fields[].enum.
  assert.deepEqual(artifact.statusEnum, ['draft', 'active']);
  assert.deepEqual(artifact.fields.find(field => field.fieldId === 'status')?.enum, ['draft', 'active']);
});

const PETSHOP_ONTOLOGY = JSON.parse(
  readFileSync(new URL('fixtures/petShop-e4-ontology-draft.json', import.meta.url), 'utf8'),
) as unknown;

const PETSHOP_PT_TO_EN: Record<string, string> = {
  ativo: 'active',
  inativo: 'inactive',
  vigente: 'current',
  cancelado: 'cancelled',
  confirmado: 'confirmed',
  recusado: 'rejected',
  solicitado: 'requested',
  diaInteiro: 'allDay',
  hora: 'hour',
  domingo: 'sunday',
  'quarta-feira': 'wednesday',
  'quinta-feira': 'thursday',
  'segunda-feira': 'monday',
  'sexta-feira': 'friday',
  sábado: 'saturday',
  'terça-feira': 'tuesday',
  concluida: 'completed',
  encerrada: 'closed',
  iniciada: 'started',
  disponivel: 'available',
  indisponivel: 'unavailable',
};

function enumCodeIssues(review: unknown) {
  return validateNs4E4Review(normalizeNs4E4Review(review)).issues.filter(issue => issue.code === 'NS4_E4_ENUM_CODE_EN');
}

function rewriteClosedDomainCodes(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => (typeof item === 'string' ? PETSHOP_PT_TO_EN[item] || item : rewriteClosedDomainCodes(item)));
  }
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (key === 'title' || key === 'description' || key === 'notes' || key === 'businessDomain' || key === 'changeSummary') {
      out[key] = item;
      continue;
    }
    if (key === 'value' && source.kind === 'enum' && typeof item === 'string') {
      out[key] = rewriteEnumConstraintValue(item);
      continue;
    }
    if (typeof item === 'string') {
      out[key] = PETSHOP_PT_TO_EN[item] || item;
      continue;
    }
    out[key] = rewriteClosedDomainCodes(item);
  }
  return out;
}

function rewriteEnumConstraintValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed.map(item => PETSHOP_PT_TO_EN[String(item)] || item));
      }
    } catch { /* keep walking the separated forms */ }
  }
  const separator = trimmed.includes('|') ? '|' : ',';
  return trimmed.split(separator).map(part => {
    const token = part.trim().replace(/^['"]|['"]$/g, '');
    const next = PETSHOP_PT_TO_EN[token] || token;
    return part.replace(token, next);
  }).join(separator);
}

test('E4 rejects Portuguese enum codes from the real petShop ontology and accepts the English rewrite', () => {
  const rejected = enumCodeIssues(PETSHOP_ONTOLOGY);
  assert.ok(rejected.length, 'the petShop draft must fail the English-code gate');
  const messages = rejected.map(issue => issue.message).join('\n');
  assert.match(messages, /ativo/u);
  assert.match(messages, /vigente/u);
  assert.match(messages, /segunda-feira/u);

  const rewritten = rewriteClosedDomainCodes(structuredClone(PETSHOP_ONTOLOGY));
  const accepted = enumCodeIssues(rewritten);
  assert.deepEqual(accepted, [], JSON.stringify(accepted));
  const rewrittenText = JSON.stringify(rewritten);
  assert.match(rewrittenText, /"active"/u);
  assert.match(rewrittenText, /"current"/u);
  assert.match(rewrittenText, /"monday"/u);
  assert.match(rewrittenText, /"Situação"/u);
  assert.match(rewrittenText, /"Ontologia de negócio"/u);
});

test('E4 English-code gate does not touch user-facing title or description', () => {
  const input = structuredClone(reviewInput) as any;
  input.entities[0].title = 'Projeto';
  input.entities[0].description = 'Um engajamento com situação ativo ou inativo.';
  input.entities[0].fields[1].title = 'Situação';
  input.entities[0].fields[1].description = 'Nome apresentado ao cliente, inclusive segunda-feira.';
  input.entities[0].lifecycleStates = ['active', 'inactive'];
  input.entities[0].initialState = 'active';
  input.entities[0].terminalStates = ['inactive'];
  input.entities[0].fields.push({
    fieldId: 'status', title: 'Situação', type: 'string', required: true,
    description: 'A situação pode ser ativo ou inativo — o rótulo, não o código.',
    constraints: [{
      constraintId: 'projectStatus', kind: 'enum', value: '["active","inactive"]',
      description: 'Valores estáveis em inglês; o texto desta descrição fica em português.', source: 'journey',
    }],
  });
  const issues = enumCodeIssues(input);
  assert.deepEqual(issues, [], JSON.stringify(issues));
  const full = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(!full.issues.some(issue => issue.code === 'NS4_E4_ENUM_CODE_EN'), JSON.stringify(full.issues));
});

test('E4 backfills missing enumLabels with a humanized code and a non-blocking systemDecision', () => {
  assert.equal(humanizeNs4EnumCode('inProgress'), 'In progress');
  const input = structuredClone(reviewInput) as any;
  input.userLanguage = 'pt-BR';
  input.entities[0].lifecycleStates = ['pending', 'inProgress', 'completed', 'cancelled'];
  input.entities[0].initialState = 'pending';
  input.entities[0].lifecycleLabels = [
    { code: 'pending', label: 'Pendente' },
    { code: 'inProgress', label: 'Em andamento' },
    { code: 'completed', label: 'Concluída' },
    { code: 'cancelled', label: 'Cancelada' },
  ];
  input.entities[0].fields.push(
    {
      fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Situação.',
      constraints: [{
        constraintId: 'statusEnum', kind: 'enum',
        value: '["pending","inProgress","completed","cancelled"]', description: 'States.', source: 'journey',
      }],
    },
    {
      fieldId: 'priority', title: 'Prioridade', type: 'string', required: true, description: 'Prioridade.',
      constraints: [{
        constraintId: 'priorityEnum', kind: 'enum', value: '["low","medium","high"]',
        description: 'Priority.', source: 'user',
      }],
    },
  );
  const normalized = normalizeNs4E4Review(input);
  const priority = normalized.entities[0].fields.find(field => field.fieldId === 'priority');
  const status = normalized.entities[0].fields.find(field => field.fieldId === 'status');
  assert.deepEqual(priority?.enumLabels, [
    { code: 'low', label: 'Low' },
    { code: 'medium', label: 'Medium' },
    { code: 'high', label: 'High' },
  ]);
  assert.equal(status?.enumLabels, undefined, 'status stays on lifecycleLabels; do not duplicate');
  assert.deepEqual(normalized.entities[0].lifecycleLabels?.find(item => item.code === 'inProgress'), {
    code: 'inProgress', label: 'Em andamento',
  });
  const decisions = normalized.systemDecisions ?? [];
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]?.findingRef, 'e4.enumLabels.backfill:Project.priority');
  assert.equal(decisions[0]?.chosen, 'humanizeMissingCodes');
  const gate = validateNs4E4Review(normalized, journeys, access);
  assert.equal(gate.ok, true, JSON.stringify(gate.issues));
  assert.ok(!gate.issues.some(issue => issue.code.startsWith('NS4_E4_ENUM_LABEL')), JSON.stringify(gate.issues));

  input.entities[0].fields.at(-1).enumLabels = [{ code: 'low', label: 'Baixa' }];
  const partial = normalizeNs4E4Review(input);
  assert.deepEqual(partial.entities[0].fields.find(field => field.fieldId === 'priority')?.enumLabels, [
    { code: 'low', label: 'Baixa' },
    { code: 'medium', label: 'Medium' },
    { code: 'high', label: 'High' },
  ]);

  const plan = normalizeNs4E4PlanDraft(input);
  assert.equal(
    plan.entities[0].lifecycleLabels?.find(item => item.code === 'inProgress')?.label,
    'Em andamento',
  );

  delete input.entities[0].lifecycleLabels;
  const lifecycleGap = normalizeNs4E4Review(input);
  assert.equal(lifecycleGap.entities[0].lifecycleLabels?.find(item => item.code === 'inProgress')?.label, 'In progress');
  assert.ok(lifecycleGap.systemDecisions?.some(decision => decision.findingRef === 'e4.lifecycleLabels.backfill:Project'));
});

test('E4 enumLabels is optional, accepts a Portuguese label, and rejects orphan or duplicate codes', () => {
  const without = enumCodeIssues(PETSHOP_ONTOLOGY);
  assert.ok(without.length, 'the petShop draft must fail the English-code gate');
  const labelIssues = validateNs4E4Review(normalizeNs4E4Review(PETSHOP_ONTOLOGY)).issues
    .filter(issue => issue.code.startsWith('NS4_E4_ENUM_LABEL'));
  assert.deepEqual(labelIssues, [], 'missing labels are backfilled, never a blocking gate finding');

  const input = structuredClone(reviewInput) as any;
  input.entities[0].lifecycleStates = ['active', 'inactive'];
  input.entities[0].initialState = 'active';
  input.entities[0].lifecycleLabels = [{ code: 'active', label: 'Ativo' }, { code: 'inactive', label: 'Inativo' }];
  input.entities[0].fields.push({
    fieldId: 'status', title: 'Situação', type: 'string', required: true, description: 'Status.',
    constraints: [{
      constraintId: 'statusEnum', kind: 'enum', value: '["active","inactive"]', description: 'States.', source: 'journey',
    }],
    enumLabels: [{ code: 'active', label: 'Ativo' }, { code: 'inactive', label: 'Inativo' }],
  });
  const ok = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(!ok.issues.some(issue => issue.code === 'NS4_E4_ENUM_CODE_EN'), JSON.stringify(ok.issues));
  assert.ok(!ok.issues.some(issue => issue.code.startsWith('NS4_E4_ENUM_LABEL')), JSON.stringify(ok.issues));
  assert.equal(normalizeNs4E4Review(input).entities[0].fields.find((field: any) => field.fieldId === 'status')?.enumLabels?.[0].label, 'Ativo');

  input.entities[0].fields.at(-1).enumLabels.push({ code: 'pending', label: 'Pendente' });
  const orphan = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(orphan.issues.some(issue => issue.code === 'NS4_E4_ENUM_LABEL_ORPHAN'), JSON.stringify(orphan.issues));

  input.entities[0].fields.at(-1).enumLabels = [
    { code: 'active', label: 'Ativo' }, { code: 'active', label: 'Ativa' },
  ];
  const duplicate = validateNs4E4Review(normalizeNs4E4Review(input), journeys, access);
  assert.ok(duplicate.issues.some(issue => issue.code === 'NS4_E4_ENUM_LABEL_DUPLICATE'), JSON.stringify(duplicate.issues));
});

test('E4 tool schemas accept enumLabels as a closed object array', () => {
  for (const file of ['../../schemas/e4-review.schema.json', '../../schemas/e4-entity-worker.schema.json']) {
    const schema = JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as any;
    const label = schema.$defs.enumLabel;
    assert.equal(label.additionalProperties, false, `${file} enumLabel must stay closed`);
    assert.deepEqual(Object.keys(label.properties).sort(), ['code', 'label']);
    assert.equal(schema.$defs.field.additionalProperties, false);
    assert.ok(schema.$defs.field.properties.enumLabels);
    const accepted = closedObjectIssues(label, { code: 'active', label: 'Ativo' });
    assert.deepEqual(accepted, [], JSON.stringify(accepted));
    const rejected = closedObjectIssues(label, { code: 'active', label: 'Ativo', extra: 'nope' });
    assert.ok(rejected.some(issue => issue.includes('extra')), JSON.stringify(rejected));
  }
});

function closedObjectIssues(schema: { additionalProperties?: unknown; properties?: Record<string, unknown>; required?: string[] }, data: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(data)) {
      if (!schema.properties || !(key in schema.properties)) issues.push(`unknown property ${key}`);
    }
  }
  for (const key of schema.required || []) {
    if (data[key] === undefined || data[key] === '') issues.push(`missing ${key}`);
  }
  return issues;
}

test('E4 rejects a Portuguese weekday or status and accepts the English code', () => {
  const input = structuredClone(reviewInput) as any;
  input.entities[0].lifecycleStates = ['ativo', 'inativo'];
  input.entities[0].initialState = 'ativo';
  input.entities[0].fields.push({
    fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Status.',
    constraints: [{
      constraintId: 'statusEnum', kind: 'enum', value: '["ativo","inativo"]', description: 'States.', source: 'journey',
    }],
  });
  const portuguese = enumCodeIssues(input);
  assert.ok(portuguese.some(issue => issue.message.includes('ativo')), JSON.stringify(portuguese));

  input.entities[0].lifecycleStates = ['active', 'inactive'];
  input.entities[0].initialState = 'active';
  input.entities[0].fields.at(-1).constraints[0].value = '["active","inactive"]';
  assert.deepEqual(enumCodeIssues(input), []);

  input.entities[0].fields.push({
    fieldId: 'dayOfWeek', title: 'Dia', type: 'string', required: true, description: 'Dia da semana.',
    constraints: [{
      constraintId: 'weekdays', kind: 'enum', value: '["segunda-feira","monday"]', description: 'Weekdays.', source: 'journey',
    }],
  });
  const weekday = enumCodeIssues(input);
  assert.ok(weekday.some(issue => issue.message.includes('segunda-feira')), JSON.stringify(weekday));
  assert.ok(!weekday.some(issue => issue.message.includes("'monday'")), JSON.stringify(weekday));
});
