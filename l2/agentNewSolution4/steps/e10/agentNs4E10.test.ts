import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { compileNs4E9, type Ns4E9Sources } from '/_102020_/l2/agentNewSolution4/steps/e9/contracts.js';
import { compileNs4E10Delivery, mergeNs4L5Config, type Ns4E10Sources } from '/_102020_/l2/agentNewSolution4/steps/e10/contracts.js';
import { validateNs4E10 } from '/_102020_/l2/agentNewSolution4/steps/e10/gate.js';
import {
  createNs4Pipeline, markNs4E7Approved, markNs4E8Approved, markNs4E9Approved, markNs4E10Approved, markNs4E10Failed,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';

const e9Fixture = JSON.parse(readFileSync(new URL('../e9/fixtures/run38-navigation.json', import.meta.url), 'utf8')) as any;
const finalFixture = JSON.parse(readFileSync(new URL('fixtures/run38-final.json', import.meta.url), 'utf8')) as any;

async function sources(includeDormant = true): Promise<Ns4E10Sources> {
  const { expected: _expected, notificationPatch: _notification, ...base } = structuredClone(e9Fixture);
  base.journeys.features[0].journeyStepRefs = base.journeys.journeys.flatMap((journey: any) => journey.business.steps.map((step: any) => `${journey.journeyId}.${step.stepId}`));
  const nestedContext = base.workspaceIndex.menu.contextCatalog.find((context: any) => context.contextId === finalFixture.nestedWorker.contextId);
  base.workspaces.find((item: any) => item.workspaceId === 'workerWorkspace').pageContext.push({ ...nestedContext, urlRole: 'path', urlRoleSource: 'externalEntry', urlRoleJustification: 'Project hub identity.' });
  base.workspaceIndex.menu.edges.push(finalFixture.nestedWorker.edge);
  base.workspaceIndex.menu.sections[0].items.find((item: any) => item.workspaceId === 'workerWorkspace').hub = finalFixture.nestedWorker.hub;
  if (includeDormant) {
    base.useCases.push(finalFixture.dormantCommand.useCase);
    const workspace = base.workspaces.find((item: any) => item.workspaceId === 'projectWorkspace');
    workspace.scenarios.push(finalFixture.dormantCommand.scenario);
    base.workspaceIndex.workspaces.find((item: any) => item.workspaceId === 'projectWorkspace').scenarioIds.push(finalFixture.dormantCommand.scenario.scenarioId);
  }
  const journeyHashes = base.journeys.journeys.map((journey: any) => ({ journeyId: journey.journeyId, businessHash: `business-${journey.journeyId}` }));
  const sourceHashes = { journeys: journeyHashes, ontologyHash: 'ontology-hash', rulesHash: 'rules-hash' };
  const journeyIndex = { schemaVersion: '2026-08-10-ns4-journey-index-v5', moduleName: base.workspaceIndex.moduleName, approvedAt: '2026-08-13T00:00:00.000Z', approvedBy: 'auto',
    journeys: base.journeys.journeys.map((journey: any) => ({ journeyId: journey.journeyId, actorRef: journey.business.actorRef, title: journey.business.title, goal: journey.business.goal,
      entryMode: journey.business.entry.mode, businessHash: `business-${journey.journeyId}`, artifactPath: `l4/${base.workspaceIndex.moduleName}/journeys/${journey.journeyId}.defs.ts` })),
    features: base.journeys.features, policyDecisionSelections: [], systemDecisions: [] };
  const ontologyIndex = { schemaVersion: '2026-08-10-ns4-ontology-v5', moduleName: base.workspaceIndex.moduleName, userLanguage: base.workspaceIndex.userLanguage,
    solutionMode: 'new', title: 'Ontology', businessDomain: 'Projects', entities: base.ontology.entities.map((entity: any) => ({ entityId: entity.entityId, title: entity.title,
      kind: entity.kind, storage: entity.storage, definitionRef: `l4/${base.workspaceIndex.moduleName}/ontology/${entity.entityId}.defs.ts` })), relationships: base.ontology.relationships,
    ontologyHash: sourceHashes.ontologyHash, approvedBy: 'auto', approvedAt: '2026-08-13T00:00:00.000Z', realization: { status: 'pending', compiledFromOntologyHash: sourceHashes.ontologyHash } };
  const rules = { schemaVersion: '2026-08-09-ns4-rules-v2', moduleName: base.workspaceIndex.moduleName, userLanguage: base.workspaceIndex.userLanguage, rules: [], rulesHash: sourceHashes.rulesHash,
    approvedBy: 'auto', approvedAt: '2026-08-13T00:00:00.000Z', realization: { status: 'pending', compiledFromRulesHash: sourceHashes.rulesHash } };
  const useCaseIndex = { schemaVersion: '2026-08-10-ns4-usecase-index-v3', moduleName: base.workspaceIndex.moduleName, userLanguage: base.workspaceIndex.userLanguage, sourceHashes,
    useCases: base.useCases.map((useCase: any) => ({ useCaseId: useCase.useCaseId, title: useCase.title, kind: useCase.kind, compiledFrom: useCase.compiledFrom, useCaseHash: useCase.useCaseHash,
      artifactPath: `l4/${base.workspaceIndex.moduleName}/usecases/${useCase.useCaseId}.defs.ts` })), realizationHash: 'realization-hash', generatedAt: '2026-08-13T00:00:00.000Z' };
  const workflowIndex = { schemaVersion: '2026-08-12-ns4-workflow-index-v5', moduleName: base.workspaceIndex.moduleName, userLanguage: base.workspaceIndex.userLanguage, workflows: [], sourceHashes,
    realizationHash: 'realization-hash', generatedAt: '2026-08-13T00:00:00.000Z', systemDecisions: [{ decisionId: 'shrinkStatusReport', stage: 'e7-realization',
      question: 'Should reviewed be operated?', chosen: 'shrinkLifecycle', alternatives: ['operateState'], decidedBy: 'system', findingRef: 'workflow.state.unreachable:ProjectStatusReport.reviewed', changeHint: 'Create a journey that reaches reviewed.' }] };
  const initial = await compileNs4E9(base as Ns4E9Sources); base.access = initial.access;
  const saved = await compileNs4E9(base as Ns4E9Sources);
  return { ...base, journeyIndex, ontologyIndex, rules, useCaseIndex, workflowIndex,
    navigation: saved.navigation, store: saved.store, notifications: saved.notifications, contracts: saved.contracts, access: saved.access } as Ns4E10Sources;
}

async function refreshE9(value: Ns4E10Sources): Promise<void> {
  const saved = await compileNs4E9(value); value.navigation = saved.navigation; value.store = saved.store;
  value.notifications = saved.notifications; value.contracts = saved.contracts; value.access = saved.access;
}

test('run 38 final validation passes, emits L5 and records the real dormant command pattern', async () => {
  const input = await sources(); const report = await validateNs4E10(input);
  assert.equal(report.finalStatus, 'passed');
  assert.ok(report.systemDecisions.some(decision => decision.findingRef.includes(finalFixture.expected.dormantUseCaseId) && decision.chosen === 'keepDormantCommand'));
  const hubItem = report.menuPreview.navigation.find(item => item.hub === finalFixture.expected.hub)!;
  assert.ok(hubItem.href.startsWith(finalFixture.expected.projectRecordHref));
  assert.equal(report.menuPreview.navigation.filter(item => !item.hub).some(item => item.id === hubItem.id), false);
  const workerItem = report.menuPreview.navigation.find(item => item.workspaceId === 'workerWorkspace')!;
  assert.equal(workerItem.hub, finalFixture.expected.hub);
  assert.equal(workerItem.href, finalFixture.expected.workerHref);
  assert.equal(report.menuPreview.navigation.filter(item => !item.hub).some(item => item.workspaceId === 'workerWorkspace'), false);
  const delivery = await compileNs4E10Delivery(input, report, {}, 102046);
  assert.ok(delivery.todoFrontend.owners.some(owner => owner.ownerType === 'workspace' && owner.statusFrontend === 'toCreate'));
  assert.ok(delivery.todoFrontend.owners.some(owner => owner.ownerType === 'contract' && owner.statusFrontend === 'toCreate'));
  assert.ok(delivery.todoBackend.owners.some(owner => owner.ownerId === finalFixture.expected.dormantUseCaseId && owner.statusBackend === 'toCreate'));
});

test('A3 rejects a no-approval choice that coexists with a decide/review realization', async () => {
  const input: any = await sources(false); const journey = input.journeys.journeys[0];
  journey.policyDecisions = [{ decisionId: 'approvalPolicy', question: 'Is approval required?', chosen: 'No approval is required', alternatives: ['Approval is required'], relatedJourneyIds: [journey.journeyId] }];
  input.journeyIndex.policyDecisionSelections = [{ decisionId: 'approvalPolicy', generatedChoice: 'No approval is required', selectedChoice: 'No approval is required', selectedBy: 'human', selectedAt: '2026-08-13T00:00:00.000Z' }];
  const step = { stepId: 'approveProject', kind: 'decide', intent: 'Approve.', requiresContext: ['selectedProject'], providesContext: [], result: 'Approved.', featureRefs: ['projects'] };
  journey.business.steps.push(step); const workspace = input.workspaces.find((item: any) => item.workspaceId === 'projectWorkspace');
  workspace.scenarios.push({ scenarioId: 'reviewApproveProject', kind: 'review', title: 'Approve', description: 'Approve.', stepRefs: [`${journey.journeyId}.${step.stepId}`], useCaseIds: [], authorityRefs: ['build:project-read'], selectionContexts: [], organisms: [], commandInputs: [] });
  input.workspaceIndex.workspaces.find((item: any) => item.workspaceId === 'projectWorkspace').scenarioIds.push('reviewApproveProject');
  await refreshE9(input); const report = await validateNs4E10(input);
  assert.equal(report.finalStatus, 'failed');
  assert.equal(report.repairStep, 'e2-journeys');
  assert.ok(report.errors.some(issue => issue.code === 'NS4_E10_DECISION_CONTRADICTION'));
});

test('A3 applies the same contradiction gate to an assumed system decision', async () => {
  const input: any = await sources(false); const journey = input.journeys.journeys[0];
  const step = { stepId: 'approveProject', kind: 'decide', intent: 'Approve.', requiresContext: ['selectedProject'], providesContext: [], result: 'Approved.', featureRefs: ['projects'] };
  journey.business.steps.push(step); input.journeyIndex.systemDecisions.push({ decisionId: 'systemNoApproval', stage: 'e2-journeys', question: 'Is approval required?',
    chosen: 'No approval is required', alternatives: ['Approval is required'], decidedBy: 'system', findingRef: `${journey.journeyId}.approval`, changeHint: `Change ${journey.journeyId}.` });
  const workspace = input.workspaces.find((item: any) => item.workspaceId === 'projectWorkspace');
  workspace.scenarios.push({ scenarioId: 'reviewApproveProject', kind: 'review', title: 'Approve', description: 'Approve.', stepRefs: [`${journey.journeyId}.${step.stepId}`], useCaseIds: [], authorityRefs: ['build:project-read'], selectionContexts: [], organisms: [], commandInputs: [] });
  input.workspaceIndex.workspaces.find((item: any) => item.workspaceId === 'projectWorkspace').scenarioIds.push('reviewApproveProject');
  await refreshE9(input); const report = await validateNs4E10(input);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS4_E10_DECISION_CONTRADICTION' && issue.path.includes('viewProject')));
});

test('A6 rejects a stale skeleton hash and points repair to E8', async () => {
  const input = await sources(); input.workspaces[0].skeletonHash = 'stale-skeleton';
  const report = await validateNs4E10(input);
  assert.equal(report.finalStatus, 'failed');
  assert.equal(report.repairStep, 'e8-workspaces');
  assert.ok(report.errors.some(issue => issue.code === 'NS4_E9_WORKSPACE_HASH'));
});

test('A5 rejects unreachable states retained by a compiled workflow', async () => {
  const input: any = await sources(false); const workflow = { schemaVersion: '2026-08-11-ns4-workflow-v4', moduleName: input.workspaceIndex.moduleName,
    workflowId: 'projectLifecycle', entityRef: 'Project', initialState: 'active', terminalStates: [], states: ['active', 'reviewed'], transitions: [], workflowHash: 'workflow-project' };
  input.workflows.push(workflow); input.workflowIndex.workflows.push({ workflowId: workflow.workflowId, entityRef: workflow.entityRef, workflowHash: workflow.workflowHash,
    artifactPath: `l4/${input.workspaceIndex.moduleName}/workflows/${workflow.workflowId}.defs.ts` });
  await refreshE9(input); const report = await validateNs4E10(input);
  assert.equal(report.finalStatus, 'failed');
  assert.equal(report.repairStep, 'e7-realization');
  assert.ok(report.errors.some(issue => issue.code === 'NS4_E10_FSM_UNREACHABLE' && /reviewed/.test(issue.message)));
});

test('L5 config merge is byte-identical on a no-change rerun and preserves unrelated modules', async () => {
  const input = await sources(); const report = await validateNs4E10(input);
  const existing = { projects: { '102046': { type: 'client', modules: [{ moduleId: 'other', basePath: '/other', custom: true }] } }, publication: { keep: true } };
  const first = mergeNs4L5Config(existing, 102046, report.menuPreview); const second = mergeNs4L5Config(first, 102046, report.menuPreview);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal((first.projects as any)['102046'].modules.some((module: any) => module.moduleId === 'other' && module.custom === true), true);
  assert.deepEqual(first.publication, { keep: true });
});

test('A4 reports a missing fieldsOnly disclosure decision without rejecting validation', async () => {
  const input: any = await sources(); input.access.grants[0].disclosure = { mode: 'fieldsOnly', description: 'Limited.', allowedInformation: ['project summary'], deniedInformation: [] };
  await refreshE9(input); const report = await validateNs4E10(input);
  assert.equal(report.finalStatus, 'passed');
  assert.ok(report.registrars.some(issue => issue.code === 'NS4_E10_DISCLOSURE_UNRECORDED'));
  assert.equal(report.errors.some(issue => /DISCLOSURE/.test(issue.code)), false);
});

test('E10 completion closes the pipeline and rejection stales the selected owner plus downstream stages', () => {
  const e7 = markNs4E7Approved(createNs4Pipeline('buildFlowFsm38', 'Build flow'), ['usecases/index']);
  const e8 = markNs4E8Approved(e7, 'auto', ['workspaces/index']);
  const e9 = markNs4E9Approved(e8, ['navigation/index']);
  const rejected = markNs4E10Failed(e9, 'Workflow must be revised.', 'e7-realization', 'l4/buildFlowFsm38/pipeline/e10-validation-report.json');
  assert.equal(rejected.nextStep, 'e7-realization');
  assert.equal(rejected.steps.e7?.status, 'stale');
  assert.equal(rejected.steps.e8?.status, 'stale');
  assert.equal(rejected.steps.e9?.status, 'stale');
  assert.equal(rejected.steps.e10?.repairStep, 'e7-realization');
  const approved = markNs4E10Approved(e9, 'human');
  assert.equal(approved.status, 'complete');
  assert.equal(approved.nextStep, 'complete');
  assert.equal(approved.steps.e10?.status, 'approved');
});
