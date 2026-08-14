import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { compileNs4E9, type Ns4E9Sources } from '/_102020_/l2/agentNewSolution4/steps/e9/contracts.js';
import { ns4E9FailureOrigin, validateNs4E9 } from '/_102020_/l2/agentNewSolution4/steps/e9/gate.js';
import {
  createNs4Pipeline, markNs4E7Approved, markNs4E8Approved, markNs4E9Approved, markNs4E9Failed, resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';

const fixture = JSON.parse(readFileSync(new URL('fixtures/run38-navigation.json', import.meta.url), 'utf8')) as any;
function sources(): Ns4E9Sources { const { expected: _expected, notificationPatch: _patch, ...value } = structuredClone(fixture); return value as Ns4E9Sources; }

function addDecisionCommand(input: Ns4E9Sources, transitionRefs: string[]): void {
  const template = input.useCases.find(useCase => useCase.useCaseId === 'createTask')!;
  input.useCases.push({ ...template, useCaseId: 'decideChangeOrder', title: 'Decide change order', compiledFrom: ['manageChangeOrder.decideChangeOrder'],
    contexts: { requires: [], provides: [] }, useRules: [], transitionRefs, useCaseHash: 'uc-decide-change-order' });
  const scenario = input.workspaces.find(workspace => workspace.workspaceId === 'projectWorkspace')!.scenarios.find(item => item.scenarioId === 'formCreateTask')!;
  scenario.commandInputs.push({ useCaseId: 'decideChangeOrder', inputs: [
    { inputId: 'decision', source: 'userDecision', sourceRef: 'changeOrderApprovalPolicy' },
  ] });
}

test('run 38 navigation compiles a clean Project URL, typed contracts and ontology labels', async () => {
  const input = sources(); const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  assert.deepEqual(gate.issues, []);
  const record = compilation.navigation.routes.find(route => route.routeId === 'projectWorkspace.record');
  assert.equal(record?.routePattern, fixture.expected.hubRecord);
  fixture.expected.forbiddenSegments.forEach((segment: string) => assert.equal(record?.routePattern.includes(segment), false));
  const view = compilation.contracts.find(contract => contract.workspaceId === 'projectWorkspace' && contract.kind === 'view')!;
  assert.equal(view.output.slices.find(slice => slice.sliceId === 'locateProject')?.fields.find(field => field.fieldId === 'name')?.label, fixture.expected.projectLabel);
  assert.equal(view.skeletonHash, input.workspaceIndex.skeletonHash);
  assert.equal(view.workspaceHash, 'project-workspace-hash');
  const command = compilation.contracts.find(contract => contract.useCaseId === 'createTask')!;
  assert.equal(command.input.find(item => item.inputId === 'selectedProject')?.source, 'pageContext');
  assert.equal(command.input.find(item => item.inputId === 'selectedAssignee')?.source, 'selection');
  assert.ok(command.businessErrorIds.includes('taskDescriptionRequiredViolation'));
  assert.ok(compilation.access.realization.operationAuthorityRefs.some(operation => operation.operationRef === command.operationRef && operation.authorityRefs.includes('build:task-create')));
});

test('run 40 keeps a provided slice local when it shares the anchor id field name', async () => {
  const input = sources();
  const project = input.workspaces.find(item => item.workspaceId === 'projectWorkspace')!;
  const scenario = project.scenarios.find(item => item.scenarioId === 'formCreateTask')!;
  const context = {
    contextId: 'projectBillingAssessment', businessObject: 'ProjectBillingAssessment', cardinality: 'one' as const,
    required: true, idFieldRef: 'projectId',
  };
  scenario.selectionContexts.push(context);
  input.workspaceIndex.menu.contextCatalog.push(context);
  const assessment = structuredClone(input.ontology.entities.find(entity => entity.entityId === 'Project')!);
  assessment.entityId = 'ProjectBillingAssessment'; assessment.fields = assessment.fields.filter(field => field.fieldId === 'projectId');
  input.ontology.entities.push(assessment);
  project.viewCall.uses.push({ sliceId: 'inspectBillingAssessment', useCaseId: 'locateProject', entityRefs: ['ProjectBillingAssessment'] });

  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  const route = compilation.navigation.routes.find(item => item.routeId === 'projectWorkspace.formCreateTask')!;
  assert.equal(route.routePattern, '/buildFlowFsm38/projects/:projectId/createTask');
  assert.equal(route.pathContextIds.includes(context.contextId), false);
  assert.equal(route.selectionContextIds.includes(context.contextId), true);
  assert.deepEqual(gate.issues, []);
});

test('E9 rejects an orphan workspace path context and names its candidate incoming edges', async () => {
  const input = sources(); const workspace = input.workspaces.find(item => item.workspaceId === 'projectWorkspace')!;
  const orphan = { contextId: 'orphanWorker', businessObject: 'Worker', cardinality: 'one' as const, required: true, idFieldRef: 'workerId' };
  workspace.pageContext.push(orphan); input.workspaceIndex.menu.contextCatalog.push(orphan);
  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  const issue = gate.issues.find(item => item.code === 'NS4_E9_PAGE_CONTEXT_ORPHAN');
  assert.match(issue?.message || '', /orphanWorker/);
  assert.match(issue?.message || '', /workerWorkspace\[selectedAssignee\]/);
});

test('E9 rejects cross-profile navigation edges', async () => {
  const input = sources();
  input.workspaces.find(item => item.workspaceId === 'workerWorkspace')!.profileRefs = ['workerOnly'];
  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E9_EDGE_ACTOR' && /workerWorkspace.*projectWorkspace/.test(issue.message)));
});

test('E9 rejects an unresolved fieldRef instead of emitting any', async () => {
  const input = sources();
  const project = input.workspaces.find(item => item.workspaceId === 'projectWorkspace')!;
  project.scenarios.flatMap(scenario => scenario.organisms).flatMap(organism => organism.fieldRefs)
    .find(field => field.entityId === 'Project' && field.fieldId === 'name')!.fieldId = 'missingField';
  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E9_FIELD_REF' && /missingField/.test(issue.message)));
});

test('E9 emits ontology json fields as unknown with a non-blocking warning', async () => {
  const input = sources();
  input.ontology.entities.find(entity => entity.entityId === 'Project')!.fields.find(field => field.fieldId === 'name')!.type = 'json';
  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  const field = compilation.contracts.find(contract => contract.workspaceId === 'projectWorkspace' && contract.kind === 'view')!
    .output.slices.flatMap(slice => slice.fields).find(item => item.entityId === 'Project' && item.fieldId === 'name');
  assert.equal(field?.valueType, 'unknown');
  assert.ok(compilation.navigation.warnings.some(warning => warning.code === 'NS4_E9_JSON_UNKNOWN' && /Project\.name/.test(warning.message)));
  assert.deepEqual(gate.issues, []);
});

test('run 42 decision input emits the E7 transition literal union without an ontology fieldRef', async () => {
  const input = sources(); addDecisionCommand(input, ['approveChangeOrder', 'rejectChangeOrder']);
  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  const contract = compilation.contracts.find(item => item.useCaseId === 'decideChangeOrder')!;
  const decision = contract.input.find(item => item.inputId === 'decision')!;
  assert.equal(decision.kind, 'decision');
  if (decision.kind !== 'decision') assert.fail('decision input discriminator was not emitted');
  assert.equal(decision.valueType, 'literalUnion');
  assert.deepEqual(decision.transitions, ['approveChangeOrder', 'rejectChangeOrder']);
  assert.equal(decision.label, 'Approve Change Order / Reject Change Order');
  assert.equal('fieldRef' in decision, false);
  assert.deepEqual(gate.issues, []);
});

test('dormant decision emits unknown plus warning and does not fail E9', async () => {
  const input = sources(); addDecisionCommand(input, []);
  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  const decision = compilation.contracts.find(item => item.useCaseId === 'decideChangeOrder')!.input.find(item => item.inputId === 'decision')!;
  assert.equal(decision.kind, 'decision');
  assert.equal(decision.valueType, 'unknown');
  assert.ok(compilation.navigation.warnings.some(warning => warning.code === 'NS4_E9_DECISION_TRANSITIONS' && /decideChangeOrder/.test(warning.message)));
  assert.deepEqual(gate.issues, []);
});

test('field-bearing userDecision remains a strict data input', async () => {
  const input = sources(); const command = input.workspaces.find(item => item.workspaceId === 'projectWorkspace')!.scenarios
    .flatMap(scenario => scenario.commandInputs).find(item => item.useCaseId === 'createTask')!;
  const editable = command.inputs.find(item => item.inputId === 'description')!;
  const valid = await compileNs4E9(input); const data = valid.contracts.find(item => item.useCaseId === 'createTask')!.input.find(item => item.inputId === 'description')!;
  assert.equal(data.kind, 'data');
  delete editable.fieldRef;
  const invalid = await compileNs4E9(input); const gate = validateNs4E9(input, invalid);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E9_FIELD_REF' && issue.origin === 'skeleton' && /description/.test(issue.path)));
});

test('E9 rerun is byte-identical for unchanged approved inputs', async () => {
  const input = sources(); const first = await compileNs4E9(input); const second = await compileNs4E9(structuredClone(input));
  assert.equal(JSON.stringify(first.navigation), JSON.stringify(second.navigation));
  assert.equal(JSON.stringify(first.store), JSON.stringify(second.store));
  assert.equal(JSON.stringify(first.notifications), JSON.stringify(second.notifications));
  assert.equal(JSON.stringify(first.contracts), JSON.stringify(second.contracts));
  assert.equal(JSON.stringify(first.access), JSON.stringify(second.access));
});

test('E9 upgrades legacy access grants without leaking obsolete constraints into v4', async () => {
  const input = sources();
  input.access = {
    ...input.access,
    schemaVersion: '2026-08-05-ns4-access-matrix-v1',
    grants: input.access.grants.map(grant => {
      const { useRules: _useRules, ...legacy } = grant as typeof grant & { useRules: string[] };
      return { ...legacy, constraints: ['legacy access constraint'] };
    }),
    realization: { status: 'pending', compiledFromAccessHash: input.access.accessHash, operationAuthorityRefs: [] },
  };
  const compilation = await compileNs4E9(input);
  assert.equal(compilation.access.schemaVersion, '2026-08-13-ns4-access-matrix-v4');
  assert.deepEqual(compilation.access.grants.map(grant => grant.useRules), compilation.access.grants.map(() => []));
  assert.equal(compilation.access.grants.some(grant => 'constraints' in grant), false);
});

test('synthetic handoff/eventDriven delivery emits a notification and removes its navigation edge', async () => {
  const input: any = sources(); const patch = fixture.notificationPatch;
  input.journeys.journeys.push(patch.sourceJourney, patch.targetJourney);
  input.ontology.entities.push(patch.entity); input.workspaceIndex.menu.contextCatalog.push(patch.context);
  input.access.authorities.push(
    { authorityRef: 'build:inspection-send', title: 'Send', description: 'Send.', journeyStepRefs: ['sendInspection.handoffInspection'], informationNeeds: [] },
    { authorityRef: 'build:inspection-read', title: 'Read', description: 'Read.', journeyStepRefs: ['openInspection.inspectInspection'], informationNeeds: [] },
  );
  input.access.grants.push(
    { profileRef: 'supervisor', authorityRef: 'build:inspection-send', reason: 'Send.', dataScope: { mode: 'organization', description: 'Organization.' }, disclosure: { mode: 'fullRecord', description: 'Full.', allowedInformation: [], deniedInformation: [] }, useRules: [] },
    { profileRef: 'supervisor', authorityRef: 'build:inspection-read', reason: 'Read.', dataScope: { mode: 'organization', description: 'Organization.' }, disclosure: { mode: 'fullRecord', description: 'Full.', allowedInformation: [], deniedInformation: [] }, useRules: [] },
  );
  input.useCases.push(
    { schemaVersion: '2026-08-10-ns4-usecase-v3', moduleName: input.workspaceIndex.moduleName, useCaseId: 'handoffInspection', title: 'Send', kind: 'command', compiledFrom: ['sendInspection.handoffInspection'], description: 'Send.', contexts: { requires: [], provides: ['selectedInspection'] }, entityRefs: ['Inspection'], useRules: [], transitionRefs: [], useCaseHash: 'handoff' },
    { schemaVersion: '2026-08-10-ns4-usecase-v3', moduleName: input.workspaceIndex.moduleName, useCaseId: 'inspectInspection', title: 'Inspect', kind: 'query', compiledFrom: ['openInspection.inspectInspection'], description: 'Inspect.', contexts: { requires: ['selectedInspection'], provides: [] }, entityRefs: ['Inspection'], useRules: [], transitionRefs: [], useCaseHash: 'inspect' },
  );
  const project = input.workspaces.find((item: any) => item.workspaceId === 'projectWorkspace');
  project.scenarios.push({ scenarioId: 'detailHandoffInspection', kind: 'detail', title: 'Send inspection', description: 'Send.', stepRefs: ['sendInspection.handoffInspection'], useCaseIds: ['handoffInspection'], authorityRefs: ['build:inspection-send'], selectionContexts: [], organisms: [], commandInputs: [] });
  input.workspaceIndex.workspaces.find((item: any) => item.workspaceId === 'projectWorkspace').scenarioIds.push('detailHandoffInspection');
  const inspectionWorkspace = {
    schemaVersion: '2026-08-14-ns4-workspace-v3', moduleName: input.workspaceIndex.moduleName, workspaceId: 'inspectionWorkspace', kind: 'place', title: 'Inspections', description: 'Inspections.', anchorEntity: 'Inspection', profileRefs: ['supervisor'],
    pageContext: [{ ...patch.context }],
    scenarios: [{ scenarioId: 'detailInspectInspection', kind: 'detail', title: 'Inspection', description: 'Inspect.', stepRefs: ['openInspection.inspectInspection'], useCaseIds: ['inspectInspection'], authorityRefs: ['build:inspection-read'], selectionContexts: [], organisms: [{ role: 'detail', fragmentRef: 'Inspection', sliceId: 'inspectInspection', fieldRefs: [{ entityId: 'Inspection', fieldId: 'inspectionId', label: '' }], intent: 'Inspect.' }], commandInputs: [] }],
    viewCall: { uses: [{ sliceId: 'inspectInspection', useCaseId: 'inspectInspection', entityRefs: ['Inspection'] }] }, commands: [], invalidations: [], skeletonHash: input.workspaceIndex.skeletonHash, workspaceHash: 'inspection-workspace-hash',
  };
  input.workspaces.push(inspectionWorkspace); input.workspaceIndex.workspaces.push({ workspaceId: 'inspectionWorkspace', title: 'Inspections', kind: 'place', anchorEntity: 'Inspection', profileRefs: ['supervisor'], scenarioIds: ['detailInspectInspection'], artifactPath: 'l4/buildFlowFsm38/workspaces/inspectionWorkspace.defs.ts', workspaceHash: 'inspection-workspace-hash' });
  input.workspaceIndex.menu.edges.push({ from: 'projectWorkspace', to: 'inspectionWorkspace', carries: ['selectedInspection'], preferredFromJourneyRef: 'sendInspection.handoffInspection' });
  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  assert.deepEqual(gate.issues, []);
  assert.equal(compilation.notifications.entries.length, 1);
  assert.equal(compilation.notifications.entries[0].contextCarried, 'selectedInspection');
  assert.match(compilation.notifications.entries[0].deepLink, /:inspectionId/);
  assert.equal(compilation.navigation.edges.some(edge => edge.to === 'inspectionWorkspace'), false);
});

test('E9 queue validation reads only compiled workflows', async () => {
  const input = sources(); input.workspaces[0].scenarios.push({ scenarioId: 'queue', kind: 'queue', title: 'Queue', description: 'Queue.', stepRefs: [], useCaseIds: [], authorityRefs: ['build:task-create'], selectionContexts: [], organisms: [], commandInputs: [] });
  input.workspaceIndex.workspaces[0].scenarioIds.push('queue');
  const compilation = await compileNs4E9(input); const gate = validateNs4E9(input, compilation);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E9_QUEUE_WORKFLOW'));
});

test('E9 pipeline routes skeleton failures to E8 and compiler failures only to E9', () => {
  const e7 = markNs4E7Approved(createNs4Pipeline('buildFlowFsm38', 'Build flow'), ['l4/buildFlowFsm38/usecases/index.defs.ts']);
  const e8 = markNs4E8Approved(e7, 'auto', ['l4/buildFlowFsm38/workspaces/index.defs.ts']);
  assert.equal(resolveNs4ExistingAction(true, e8, true), 'resume-e9');
  const failed = markNs4E9Failed(e8, 'NS4_E9_PAGE_CONTEXT_ORPHAN', 'skeleton');
  assert.equal(failed.steps.e8?.status, 'stale');
  assert.equal(failed.steps.e9?.repairStep, 'e8-workspaces');
  assert.equal(resolveNs4ExistingAction(true, failed, true), 'resume-e8');
  const compilerFailed = markNs4E9Failed(e8, 'NS4_E9_CONTRACT_FIELD', 'compiler');
  assert.equal(compilerFailed.steps.e8?.status, 'approved');
  assert.equal(compilerFailed.steps.e9?.repairStep, 'e9-navigation-compiler');
  assert.equal(compilerFailed.nextStep, 'e9-navigation-compiler');
  assert.equal(resolveNs4ExistingAction(true, compilerFailed, true), 'resume-e9');
  assert.equal(ns4E9FailureOrigin([{ code: 'NS4_E9_CONTRACT_FIELD', path: 'contract.input', message: 'injected', origin: 'compiler' }]), 'compiler');
  assert.equal(ns4E9FailureOrigin([{ code: 'NS4_E9_PAGE_CONTEXT_ORPHAN', path: 'workspace.context', message: 'injected', origin: 'skeleton' }]), 'skeleton');
  const approved = markNs4E9Approved(e8, ['l4/buildFlowFsm38/navigation/index.defs.ts']);
  assert.equal(approved.nextStep, 'e10-validation');
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-e10');
});
