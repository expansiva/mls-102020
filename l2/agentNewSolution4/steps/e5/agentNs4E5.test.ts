/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/agentNs4E5.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNs4ModuleArtifact } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { buildNs4RulesArtifact, normalizeNs4E5Review } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import { collectNs4ReferencedRuleIds, Ns4E5Sources, validateNs4E5Review } from '/_102020_/l2/agentNewSolution4/steps/e5/gate.js';

const moduleArtifact = buildNs4ModuleArtifact('Build projects', {
  planId: 'e1-clarification', userLanguage: 'en', title: 'Initial', legends: [], questions: {
    moduleName: { type: 'open', question: 'Module?', answer: 'buildFlowFsm' },
    productLanguages: { type: 'open', question: 'Languages?', answer: 'en' },
    mainActors: { type: 'open', question: 'Actors?', answer: 'Manager' },
    mainGoal: { type: 'open', question: 'Goal?', answer: 'Manage projects' },
    boundaries: { type: 'open', question: 'Boundaries?', answer: 'No accounting' },
  },
}, 'auto', '2026-08-09T00:00:00.000Z');

const sources: Ns4E5Sources = {
  module: moduleArtifact,
  journeys: {
    planId: 'e2-review', moduleName: 'buildFlowFsm', userLanguage: 'en', title: 'Journeys', reviewRound: 1,
    features: [], systemDecisions: [], journeys: [{ journeyId: 'createProject', policyDecisions: [], business: {
      actorRef: 'manager', title: 'Create project', goal: 'Create a project', prerequisites: [],
      entry: { mode: 'coldStart', carries: [] }, steps: [{ stepId: 'saveProject', kind: 'act', intent: 'Save project', requiresContext: [], providesContext: [], result: 'Project saved', featureRefs: [] }],
      outcome: { statement: 'Project exists', evidence: ['Saved project'] }, useRules: ['projectRequiresClient'],
    } }],
  },
  access: {
    planId: 'e3-access-review', moduleName: 'buildFlowFsm', userLanguage: 'en', title: 'Access', reviewRound: 1,
    profiles: [{ profileId: 'manager', title: 'Manager', kind: 'internal', description: 'Manager', actorRefs: ['manager'], landingIntent: 'Manage' }],
    authorities: [{ authorityRef: 'buildflow:manage', title: 'Manage', description: 'Manage projects', journeyStepRefs: ['createProject.saveProject'], informationNeeds: [] }],
    grants: [{ profileRef: 'manager', authorityRef: 'buildflow:manage', reason: 'Manages projects', dataScope: { mode: 'organization', description: 'Organization projects' }, disclosure: { mode: 'fullRecord', description: 'Full project', allowedInformation: [], deniedInformation: [] }, useRules: ['projectRequiresClient'] }],
    changeSummary: [],
  },
  ontology: {
    planId: 'e4-ontology-review', moduleName: 'buildFlowFsm', userLanguage: 'en', title: 'Ontology', reviewRound: 1,
    solutionMode: 'new', businessDomain: 'Projects', relationships: [], changeSummary: [],
    entities: [{ entityId: 'Project', title: 'Project', description: 'Project', kind: 'core', ownership: 'moduleOwned',
      sourceRefs: { journeyIds: ['createProject'], featureIds: [], authorityRefs: ['buildflow:manage'] },
      fields: [{ fieldId: 'projectId', title: 'Id', type: 'uuid', required: true, description: 'Id', constraints: [] }],
      lifecycleStates: [], lifecyclePredicates: [], useRules: ['projectRequiresClient'],
      storage: { target: 'moduleDatabase', scope: 'module', idField: 'projectId', notes: 'Project data' } }],
  },
};

test('E5 collects unique rule ids referenced by journeys, access and ontology', () => {
  assert.deepEqual(collectNs4ReferencedRuleIds(sources), ['projectRequiresClient']);
});

test('E5 accepts rules containing only id and description', async () => {
  const review = normalizeNs4E5Review({
    planId: 'e5-rules-review', moduleName: 'buildFlowFsm', userLanguage: 'en', title: 'Business rules', reviewRound: 1,
    rules: [{ id: 'projectRequiresClient', description: 'A project must have one client.' }], changeSummary: ['Initial catalog.'],
  });
  assert.deepEqual(validateNs4E5Review(review, sources), { ok: true, issues: [] });
  const artifact = await buildNs4RulesArtifact(review, 'human', '2026-08-09T01:00:00.000Z');
  assert.deepEqual(artifact.rules, [{ id: 'projectRequiresClient', description: 'A project must have one client.' }]);
  assert.equal(artifact.realization.status, 'pending');
});

test('E5 rejects a referenced id without a permanent description', () => {
  const review = normalizeNs4E5Review({ moduleName: 'buildFlowFsm', rules: [{ id: 'anotherRule', description: 'Another rule.' }] });
  const gate = validateNs4E5Review(review, sources);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E5_RULE_REFERENCE_MISSING'));
});

test('E5 accepts an empty catalog when no approved artifact references a rule', () => {
  const withoutRules = structuredClone(sources);
  withoutRules.journeys.journeys[0].business.useRules = [];
  withoutRules.access.grants[0].useRules = [];
  withoutRules.ontology.entities[0].useRules = [];
  const review = normalizeNs4E5Review({ moduleName: 'buildFlowFsm', rules: [] });
  assert.deepEqual(validateNs4E5Review(review, withoutRules), { ok: true, issues: [] });
});

test('normalization discards implementation detail fields from rules', () => {
  const review = normalizeNs4E5Review({ moduleName: 'buildFlowFsm', rules: [{
    id: 'projectRequiresClient', description: 'A project must have one client.',
    scope: { entityRefs: ['Project'] }, sourceRefs: ['journey:createProject'], enforcement: { backend: true },
  }] });
  assert.deepEqual(review.rules[0], { id: 'projectRequiresClient', description: 'A project must have one client.' });
});
