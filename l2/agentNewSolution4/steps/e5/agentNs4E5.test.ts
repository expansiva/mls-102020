/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/agentNs4E5.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNs4ModuleArtifact, createNs4E5JudgeStep, createNs4E5Step, createNs4Pipeline,
  markNs4E1Approved, markNs4E2Approved, markNs4E2WaitingHuman, markNs4E3Approved,
  markNs4E4Approved, markNs4E5Approved, markNs4E5Running, markNs4E5WaitingHuman,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { normalizeNs4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { normalizeNs4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import { buildNs4RuleArtifacts, normalizeNs4E5Review } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import { Ns4E5Sources, validateNs4E5Review } from '/_102020_/l2/agentNewSolution4/steps/e5/gate.js';
import { normalizeNs4E5JudgeVerdict, validateNs4E5JudgeVerdict } from '/_102020_/l2/agentNewSolution4/steps/e5/judge.js';
import { resolveNs4E5HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e5/hookArgs.js';

const moduleArtifact = buildNs4ModuleArtifact('Build a project app', {
  userLanguage: 'en', questions: {
    moduleName: { question: 'Module?', answer: 'buildFlowFsm' },
    productLanguages: { question: 'Languages?', answer: 'en,pt-BR' },
    mainActors: { question: 'Actors?', answer: 'Project manager' },
    mainGoal: { question: 'Goal?', answer: 'Manage construction projects.' },
    boundaries: { question: 'Boundaries?', answer: 'No payroll.' },
  },
}, 'human');

const journeys = normalizeNs4E2Review({
  moduleName: 'buildFlowFsm', userLanguage: 'en', reviewRound: 1,
  journeys: [{ journeyId: 'manageProjects', business: {
    actorRef: 'primaryActor', title: 'Manage projects', goal: 'Keep projects valid.', prerequisites: [],
    entry: { mode: 'coldStart', carries: [] },
    steps: [{ stepId: 'saveProject', kind: 'act', intent: 'Save the project.', requiresContext: [], providesContext: [], result: 'Saved.', featureRefs: ['projects'] }],
    outcome: { statement: 'Project saved.', evidence: ['Saved.'] },
    businessRules: [{ journeyRuleId: 'projectNameRequired', statement: 'A project must have a name before it is saved.' }],
  }}],
  features: [{ featureId: 'projects', title: 'Projects', priority: 'now', journeyStepRefs: ['manageProjects.saveProject'] }],
});

const access = normalizeNs4E3Review({
  moduleName: 'buildFlowFsm', userLanguage: 'en', reviewRound: 1,
  profiles: [{ profileId: 'projectManager', title: 'Manager', kind: 'internal', description: 'Manager.', actorRefs: ['primaryActor'], landingIntent: 'Manage projects.' }],
  authorities: [{ authorityRef: 'buildflow:projectwrite', title: 'Write project', description: 'Write projects.', journeyStepRefs: ['manageProjects.saveProject'], informationNeeds: [] }],
  grants: [{ profileRef: 'projectManager', authorityRef: 'buildflow:projectwrite', reason: 'Manage projects.',
    dataScope: { mode: 'assigned', description: 'Assigned projects.' },
    disclosure: { mode: 'fullRecord', description: 'Full record.', allowedInformation: [], deniedInformation: [] },
    constraints: ['The manager may update only assigned projects.'] }],
});

const ontology = normalizeNs4E4Review({
  moduleName: 'buildFlowFsm', userLanguage: 'en', reviewRound: 1, businessDomain: 'Projects',
  entities: [{ entityId: 'Project', title: 'Project', description: 'Construction project.', kind: 'mdm', ownership: 'moduleOwned',
    sourceRefs: { journeyIds: ['manageProjects'], featureIds: ['projects'], authorityRefs: ['buildflow:projectwrite'] },
    fields: [{ fieldId: 'projectId', title: 'Id', type: 'uuid', required: true, description: 'Id.', constraints: [] },
      { fieldId: 'name', title: 'Name', type: 'string', required: true, description: 'Name.', constraints: [] }],
    lifecycleStates: ['draft', 'active'], invariants: [{ invariantId: 'activeProjectNamed', description: 'An active project has a name.', source: 'journey' }],
    storage: { target: 'mdm', scope: 'organization', idField: 'projectId', mdmType: 'buildFlowFsm.Project', notes: 'Shared project master.' } }],
  relationships: [], changeSummary: [],
});

const sources: Ns4E5Sources = { module: moduleArtifact, journeys, access, ontology };
const reviewInput = {
  moduleName: 'buildFlowFsm', userLanguage: 'en', reviewRound: 1, title: 'Business rules',
  rules: [
    { ruleId: 'requireProjectName', title: 'Require project name', statement: 'A project must have a name before save.',
      kind: 'validation', layer: 'domain', criticality: 'blocking',
      scope: { entityRefs: ['Project'], fieldRefs: ['Project.name'], relationshipRefs: [], journeyRefs: ['manageProjects'], journeyStepRefs: ['manageProjects.saveProject'], actorRefs: ['primaryActor'], authorityRefs: [] },
      trigger: { type: 'create', description: 'Before project persistence.' }, condition: { expression: 'Project.name is not blank', facts: ['Project.name'] },
      enforcement: { backend: { required: true, effect: 'reject', errorCode: 'PROJECT_NAME_REQUIRED' }, frontend: { behavior: 'block', message: 'Enter a project name.' } },
      acceptanceCases: [
        { caseId: 'acceptNamedProject', given: ['Project.name is present'], when: 'Project is saved', then: 'Save is accepted', expected: 'accept' },
        { caseId: 'rejectBlankName', given: ['Project.name is blank'], when: 'Project is saved', then: 'Save is rejected', expected: 'reject' },
      ],
      sourceRefs: ['journey:manageProjects:rule:projectNameRequired', 'ontology:Project:invariant:activeProjectNamed'] },
    { ruleId: 'restrictProjectUpdate', title: 'Restrict project update', statement: 'Managers update only assigned projects.',
      kind: 'authorization', layer: 'access', criticality: 'blocking',
      scope: { entityRefs: ['Project'], fieldRefs: [], relationshipRefs: [], journeyRefs: ['manageProjects'], journeyStepRefs: ['manageProjects.saveProject'], actorRefs: ['primaryActor'], authorityRefs: ['buildflow:projectwrite'] },
      trigger: { type: 'update', description: 'Before project update.' }, condition: { expression: 'Project is assigned to current principal', facts: ['Project.projectId', 'principal assignments'] },
      enforcement: { backend: { required: true, effect: 'authorize' }, frontend: { behavior: 'disable', message: 'Project is not assigned.' } },
      acceptanceCases: [{ caseId: 'rejectUnassigned', given: ['Project is not assigned'], when: 'Manager updates', then: 'Update is denied', expected: 'reject' }],
      sourceRefs: ['access:projectManager:buildflow:projectwrite:constraint:1'] },
  ],
  routedStatements: [],
  coverage: [
    { sourceRef: 'journey:manageProjects:rule:projectNameRequired', sourceType: 'journeyRule', disposition: 'compiled', targetRef: 'requireProjectName' },
    { sourceRef: 'ontology:Project:invariant:activeProjectNamed', sourceType: 'ontologyInvariant', disposition: 'compiled', targetRef: 'requireProjectName' },
    { sourceRef: 'access:projectManager:buildflow:projectwrite:constraint:1', sourceType: 'accessConstraint', disposition: 'compiled', targetRef: 'restrictProjectUpdate' },
  ], changeSummary: ['Initial catalog.'],
};

test('E5 deterministic gate accepts an enforceable catalog covering every upstream rule source', () => {
  assert.deepEqual(validateNs4E5Review(normalizeNs4E5Review(reviewInput), sources), { ok: true, issues: [] });
});

test('E5 rejects frontend-only blocking rules and missing source coverage', () => {
  const broken = structuredClone(reviewInput) as any;
  broken.rules[0].enforcement.backend.required = false;
  broken.coverage = broken.coverage.filter((item: any) => !item.sourceRef.startsWith('ontology:'));
  const gate = validateNs4E5Review(normalizeNs4E5Review(broken), sources);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E5_BACKEND_REQUIRED'));
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E5_COVERAGE'));
});

test('E5 builds one permanent artifact per rule and a frozen discovery index', async () => {
  const built = await buildNs4RuleArtifacts(normalizeNs4E5Review(reviewInput), 'human', '2026-08-06T20:00:00.000Z');
  assert.equal(built.rules.length, 2);
  assert.match(built.index.rulesHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(built.rules.every(rule => rule.rulesHash === built.index.rulesHash));
  assert.equal(built.index.rules[0].definitionRef, 'l4/buildFlowFsm/rules/requireProjectName.defs.ts');
});

test('E5 judge contract fails closed on blocking findings', () => {
  const verdict = normalizeNs4E5JudgeVerdict({ moduleName: 'buildFlowFsm', reviewRound: 1, complete: false, summary: 'Hardcoded example.',
    issues: [{ issueId: 'hardcodedAge', severity: 'blocking', category: 'hardcodedExample', sourceEvidence: 'Example only', finding: '16 became policy.', repairInstruction: 'Remove fixed age.', relatedRuleIds: ['requireProjectName'] }] }, 'buildFlowFsm', 1);
  assert.deepEqual(validateNs4E5JudgeVerdict(verdict, 'buildFlowFsm', 1), []);
});

test('E5 orchestration uses unique proposal/judge ids and resumes monotonically', () => {
  const originalArgs = '{"planId":"e5-rules","reviewRound":2,"repairAttempt":1}';
  assert.equal(resolveNs4E5HookArgs(originalArgs, '{}'), originalArgs);
  assert.equal(createNs4E5Step('buildFlowFsm', 2).planning?.planId, 'e5-rules-round-2');
  assert.equal(createNs4E5JudgeStep('buildFlowFsm', 2, 1, 1).planning?.planId, 'e5-rules-round-2-repair-1-judge-1');
  const e1 = markNs4E1Approved(createNs4Pipeline('buildFlowFsm', 'prompt'), 'human', 'module.defs.ts');
  const e2 = markNs4E2Approved(markNs4E2WaitingHuman(e1, 1, 'e2.json'), 'human', ['journey.defs.ts']);
  const e3 = markNs4E3Approved(e2, 'human', 'access.defs.ts');
  const e4 = markNs4E4Approved(e3, 'human', ['Project.defs.ts']);
  assert.equal(resolveNs4ExistingAction(true, e4, true), 'resume-e5');
  const waiting = markNs4E5WaitingHuman(markNs4E5Running(e4, 1), 1, 'e5.json');
  const approved = markNs4E5Approved(waiting, 'human', ['rule.defs.ts']);
  assert.equal(approved.nextStep, 'e6-behaviors');
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-next');
  assert.equal(markNs4E5Running(approved, 2), approved);
});
