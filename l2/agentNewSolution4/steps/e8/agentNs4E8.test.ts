import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildNs4WorkspaceArtifacts, deriveE8HubScore, deriveNs4E8Skeleton, hashNs4E8Skeleton, normalizeNs4E8PresentationProposal,
  normalizeNs4WorkspaceDetail, overlayNs4E8Presentation, previewNs4E8Routes, resolveNs4E8PresentationDefaults,
} from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import { hasNs4E8DetailsDispatch, isNs4E8ImplementedPlanId, isNs4E8PresentationRepairPlanId, ns4E8DetailsPlanId } from '/_102020_/l2/agentNewSolution4/steps/e8/dispatch.js';
import { resolveNs4E8SkeletonFindings, resolveNs4WorkspaceDetailFindings, validateNs4E8PresentationProposal, validateNs4E8Skeleton, validateNs4WorkspaceDetail } from '/_102020_/l2/agentNewSolution4/steps/e8/gate.js';
import { createNs4E8PresentationRepairStep } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';

const run35Fixture = JSON.parse(readFileSync(new URL('fixtures/run35-disclosure-platform.json', import.meta.url), 'utf8')) as {
  platformEntity: any; fieldsOnly: any; invalidFieldRef: { entityId: string; fieldId: string; label: string };
};
const run36DuplicateFixture = JSON.parse(readFileSync(new URL('fixtures/run36-duplicate-dispatch.json', import.meta.url), 'utf8')) as {
  reviewRound: number; observedFanoutCount: number; steps: Array<{ planning: { planId: string } }>;
};
const run37ColdStartFixture = JSON.parse(readFileSync(new URL('fixtures/run37-cold-start-command.json', import.meta.url), 'utf8')) as any;
const run38UrlRolesFixture = JSON.parse(readFileSync(new URL('fixtures/run38-url-roles.json', import.meta.url), 'utf8')) as any;
const run39PresentationRepairFixture = JSON.parse(readFileSync(new URL('fixtures/run39-presentation-repair.json', import.meta.url), 'utf8')) as {
  observedPlanId: string; malformedPlanIds: string[];
};
const run40SelectionFixture = JSON.parse(readFileSync(new URL('fixtures/run40-selection-source.json', import.meta.url), 'utf8')) as {
  invalidSourceRef: string; compatibleSliceId: string; entityId: string; fieldId: string;
};
const run41ContextFixture = JSON.parse(readFileSync(new URL('fixtures/run41-provided-session-contexts.json', import.meta.url), 'utf8')) as any;
const run43AffinityFixture = JSON.parse(readFileSync(new URL('fixtures/run43-hub-affinity.json', import.meta.url), 'utf8')) as any;

const sources: any = {
  journeys: { moduleName: 'construction', userLanguage: 'pt-BR', journeys: [
    { journeyId: 'locateProjects', business: { actorRef: 'manager', entry: {  }, steps: [{ stepId: 'locateProject', kind: 'locate', entity: 'Project', title: 'Localizar projetos.', featureRefs: ['projects'] }] } },
    { journeyId: 'manageChangeOrders', business: { actorRef: 'manager', entry: {  }, steps: [{ stepId: 'decideChangeOrder', kind: 'decide', entity: 'ChangeOrder', title: 'Decidir alteração.', featureRefs: ['changes'] }] } },
  ], features: [{ featureId: 'projects', title: 'Projetos', priority: 'now' }, { featureId: 'changes', title: 'Alterações', priority: 'now' }] },
  access: { moduleName: 'construction', profiles: [{ profileId: 'manager', actorRefs: ['manager'], landingIntent: 'Gerenciar projetos.' }], authorities: [
    { authorityRef: 'construction:project-read', journeyStepRefs: ['locateProjects.locateProject'] }, { authorityRef: 'construction:change-decide', journeyStepRefs: ['manageChangeOrders.decideChangeOrder'] },
  ], grants: [{ profileRef: 'manager', authorityRef: 'construction:project-read', disclosure: { mode: 'fullRecord', allowedInformation: [] } }, { profileRef: 'manager', authorityRef: 'construction:change-decide', disclosure: { mode: 'fullRecord', allowedInformation: [] } }] },
  ontology: { moduleName: 'construction', entities: [
    { entityId: 'Project', title: 'Projeto', description: 'Projeto.', kind: 'mdm', sourceRefs: { journeyIds: ['locateProjects'] }, fields: [{ fieldId: 'projectId' }], lifecycleStates: [], lifecyclePredicates: [] },
    { entityId: 'ChangeOrder', title: 'Alteração', description: 'Alteração.', kind: 'core', sourceRefs: { journeyIds: ['manageChangeOrders'] }, fields: [{ fieldId: 'changeOrderId' }], lifecycleStates: ['proposed', 'approved'], initialState: 'proposed', terminalStates: ['approved'], lifecyclePredicates: [] },
  ], relationships: [{ fromEntity: 'ChangeOrder', toEntity: 'Project', type: 'manyToOne', required: true }] },
  useCases: [
    { useCaseId: 'locateProject', kind: 'query', compiledFrom: ['locateProjects.locateProject'], entityRefs: ['Project'] },
    { useCaseId: 'decideChangeOrder', kind: 'command', compiledFrom: ['manageChangeOrders.decideChangeOrder'], entityRefs: ['Project', 'ChangeOrder'] },
  ],
  workflows: [{ entityRef: 'ChangeOrder', states: ['proposed', 'approved'], initialState: 'proposed', terminalStates: ['approved'], transitions: [{ toState: 'approved', useCaseId: 'decideChangeOrder' }] }],
};

test('E8 derives a dominant Project hub, absorbs the required satellite and creates an approved queue', async () => {
  const ranking = deriveE8HubScore(sources);
  assert.equal(ranking[0].entityRef, 'Project');
  const skeleton = deriveNs4E8Skeleton(sources);
  skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  assert.equal(skeleton.workspaces.length, 1);
  assert.equal(skeleton.workspaces[0].kind, 'hub');
  assert.ok(skeleton.workspaces[0].scenarios.some(scenario => scenario.kind === 'queue'));
  assert.equal(validateNs4E8Skeleton(skeleton, sources).ok, true);
});

test('run 43 class: a satellite decision cannot land alone in a workspace with zero slices', async () => {
  const skeleton = deriveNs4E8Skeleton(sources);
  const hosting = skeleton.workspaces.find(workspace => workspace.hostedStepRefs.includes('manageChangeOrders.decideChangeOrder'))!;
  assert.equal(hosting.workspaceId, 'projectWorkspace');
  assert.equal(hosting.kind, 'hub');
  assert.ok(hosting.slices.length);
  assert.ok(skeleton.workspaces.every(workspace => workspace.slices.length || workspace.pageContext.length
    || workspace.scenarios.some(scenario => scenario.selectionContexts.length)));
});

test('E8 rejects a section over the menu cap and a workspace command with neither slice nor context', async () => {
  const skeleton = deriveNs4E8Skeleton(sources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  skeleton.menu.sections[0].workspaceIds = Array.from({ length: 8 }, () => skeleton.workspaces[0].workspaceId);
  skeleton.workspaces[0].slices = []; skeleton.workspaces[0].pageContext = [];
  skeleton.workspaces[0].scenarios = skeleton.workspaces[0].scenarios.map(scenario => ({ ...scenario, selectionContexts: [] }));
  const result = validateNs4E8Skeleton(skeleton, sources);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E8_MENU_CAP'));
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E8_DECISION_WITHOUT_CONTEXT'));
});

test('E8 rejects a worker that renames a frozen scenario or references an unknown selection slice', async () => {
  const skeleton = deriveNs4E8Skeleton(sources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const detail = normalizeNs4WorkspaceDetail({ moduleName: 'construction', workspaceId: skeleton.workspaces[0].workspaceId, skeletonHash: skeleton.skeletonHash, scenarios: [
    { scenarioId: 'renamedScenario', organisms: [], commandInputs: [] },
    ...skeleton.workspaces[0].scenarios.map(scenario => ({ scenarioId: scenario.scenarioId, organisms: scenario.scenarioId === 'reviewDecideChangeOrder' ? [{ role: 'selection', fragmentRef: 'changeOrderSelection', sliceId: 'unknownSlice', fieldRefs: [], intent: 'Selecionar alteração.' }] : [], commandInputs: scenario.scenarioId === 'reviewDecideChangeOrder' ? [{ useCaseId: 'decideChangeOrder', inputs: [{ inputId: 'projectId', source: 'selection', sourceRef: 'unknownSlice' }] }] : [] })),
  ] });
  const result = validateNs4WorkspaceDetail(detail, skeleton, sources);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E8_DETAIL_SCENARIO'));
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E8_SLICE'));
});

test('run 40 retargets an invalid selection source only when one frozen slice is compatible', async () => {
  const skeleton = deriveNs4E8Skeleton(sources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const replaySources = structuredClone(sources); replaySources.ontology.entities.push({ entityId: run40SelectionFixture.entityId, fields: [{ fieldId: run40SelectionFixture.fieldId }] });
  const workspace = skeleton.workspaces[0]; workspace.slices[0] = { ...workspace.slices[0], sliceId: run40SelectionFixture.compatibleSliceId, entityRefs: [run40SelectionFixture.entityId] };
  const target = workspace.scenarios.find(scenario => scenario.scenarioId === 'reviewDecideChangeOrder')!;
  const detail = normalizeNs4WorkspaceDetail({ moduleName: 'construction', workspaceId: workspace.workspaceId, skeletonHash: skeleton.skeletonHash,
    scenarios: workspace.scenarios.map(scenario => ({ scenarioId: scenario.scenarioId, organisms: [], commandInputs: scenario.scenarioId === target.scenarioId ? [{ useCaseId: 'decideChangeOrder', inputs: [{ inputId: run40SelectionFixture.invalidSourceRef,
      source: 'selection', sourceRef: run40SelectionFixture.invalidSourceRef, fieldRef: { entityId: run40SelectionFixture.entityId, fieldId: run40SelectionFixture.fieldId, label: '' } }] }] : [] })) });
  const gate = validateNs4WorkspaceDetail(detail, skeleton, replaySources);
  const finding = gate.issues.find(issue => issue.code === 'NS4_E8_INPUT_SELECTION');
  assert.equal(gate.ok, true);
  assert.equal(finding?.severity, 'warning');
  const resolved = resolveNs4WorkspaceDetailFindings(detail, gate.issues);
  const input = resolved.artifact.scenarios.find(scenario => scenario.scenarioId === target.scenarioId)!.commandInputs[0].inputs[0];
  assert.equal(input.sourceRef, run40SelectionFixture.compatibleSliceId);
  assert.equal(validateNs4WorkspaceDetail(resolved.artifact, skeleton, replaySources).ok, true);
  assert.ok(resolved.systemDecisions.some(decision => decision.chosen === 'retargetUniqueSelectionSlice'));

  workspace.slices.push({ ...workspace.slices[0], sliceId: `${run40SelectionFixture.compatibleSliceId}Alternative` });
  const ambiguous = validateNs4WorkspaceDetail(detail, skeleton, replaySources);
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.issues.find(issue => issue.code === 'NS4_E8_INPUT_SELECTION')?.severity, undefined);
});

test('E8 accepts a module with no lifecycle and emits no queue scenario', async () => {
  const noLifecycleSources = { ...sources, ontology: { ...sources.ontology, entities: sources.ontology.entities.map((entity: any) => ({ ...entity, lifecycleStates: [], lifecyclePredicates: [], initialState: undefined, terminalStates: undefined })) }, workflows: [] };
  const skeleton = deriveNs4E8Skeleton(noLifecycleSources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  assert.equal(skeleton.workspaces[0].scenarios.some(scenario => scenario.kind === 'queue'), false);
  assert.equal(validateNs4E8Skeleton(skeleton, noLifecycleSources).ok, true);
});

test('E8 finalization writes one composed view and stamps command invalidations by entity intersection', async () => {
  const skeleton = deriveNs4E8Skeleton(sources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const detail = normalizeNs4WorkspaceDetail({ moduleName: 'construction', workspaceId: skeleton.workspaces[0].workspaceId, skeletonHash: skeleton.skeletonHash,
    scenarios: skeleton.workspaces[0].scenarios.map(scenario => ({ scenarioId: scenario.scenarioId, organisms: [], commandInputs: [] })) });
  const built = await buildNs4WorkspaceArtifacts(skeleton, [detail], 'auto', '2026-08-11T00:00:00.000Z');
  assert.deepEqual(built.artifacts[0].viewCall.uses.map(item => item.sliceId), ['locateProject']);
  assert.deepEqual(built.artifacts[0].invalidations, [{ useCaseId: 'decideChangeOrder', sliceIds: ['locateProject'] }]);
  assert.equal(built.index.workspaces[0].artifactPath, 'l4/construction/workspaces/projectWorkspace.defs.ts');
});

test('E8 degrades to a flat menu when no anchor dominates', () => {
  const flatSources = {
    ...sources,
    journeys: { ...sources.journeys, journeys: [...sources.journeys.journeys, { journeyId: 'locateClients', business: { actorRef: 'manager', entry: {  }, steps: [{ stepId: 'locateClient', kind: 'locate', entity: 'Client', title: 'Localizar clientes.', featureRefs: ['clients'] }] } }], features: [...sources.journeys.features, { featureId: 'clients', title: 'Clientes', priority: 'now' }] },
    ontology: { ...sources.ontology, relationships: [], entities: [...sources.ontology.entities, { entityId: 'Client', title: 'Cliente', description: 'Cliente.', kind: 'mdm', sourceRefs: { journeyIds: ['locateClients'] }, fields: [{ fieldId: 'clientId' }], lifecycleStates: [], lifecyclePredicates: [] }] },
    useCases: [...sources.useCases, { useCaseId: 'locateClient', kind: 'query', compiledFrom: ['locateClients.locateClient'], entityRefs: ['Client'] }],
  };
  const skeleton = deriveNs4E8Skeleton(flatSources);
  assert.equal(skeleton.workspaces.some(workspace => workspace.kind === 'hub'), false);
});

test('E8 excludes a platform entity from hub ranking by ownership and storage markers, regardless of its name', () => {
  const platformSources = { ...sources, ontology: { ...sources.ontology, entities: [...sources.ontology.entities, run35Fixture.platformEntity] } };
  assert.equal(deriveE8HubScore(platformSources).some(item => item.entityRef === 'AccountIdentity'), false);
});

test('E8 records fieldsOnly disclosure once per workspace and authority without text-to-field matching', async () => {
  const fieldsOnlySources = { ...sources, access: { ...sources.access, grants: sources.access.grants.map((grant: any) => grant.authorityRef === 'construction:project-read' ? { ...grant, disclosure: run35Fixture.fieldsOnly } : grant) } };
  const skeleton = deriveNs4E8Skeleton(fieldsOnlySources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const detail = normalizeNs4WorkspaceDetail({ moduleName: 'construction', workspaceId: skeleton.workspaces[0].workspaceId, skeletonHash: skeleton.skeletonHash,
    scenarios: skeleton.workspaces[0].scenarios.map(scenario => ({ scenarioId: scenario.scenarioId,
      organisms: scenario.authorityRefs.includes('construction:project-read') ? [{ role: 'summary', fragmentRef: 'projectSummary', fieldRefs: [{ entityId: 'Project', fieldId: 'projectId', label: 'Projeto' }], intent: 'Mostrar projeto.' }] : [], commandInputs: [] })) });
  const gate = validateNs4WorkspaceDetail(detail, skeleton, fieldsOnlySources);
  assert.equal(gate.ok, true);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E8_DISCLOSURE' && issue.severity === 'warning'));
  const resolved = resolveNs4WorkspaceDetailFindings(detail, gate.issues);
  assert.equal(resolved.systemDecisions.filter(decision => decision.findingRef.includes('NS4_E8_DISCLOSURE')).length, 1);
  assert.equal(resolved.systemDecisions[0].chosen, 'keepE3Projection');
  const built = await buildNs4WorkspaceArtifacts(skeleton, [resolved.artifact], 'auto', '2026-08-12T00:00:00.000Z', resolved.systemDecisions);
  assert.deepEqual(built.index.systemDecisions, resolved.systemDecisions);
});

test('E8 keeps an unknown field visible as a Type C finding and removes only that reference', async () => {
  const skeleton = deriveNs4E8Skeleton(sources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const scenario = skeleton.workspaces[0].scenarios[0];
  const detail = normalizeNs4WorkspaceDetail({ moduleName: 'construction', workspaceId: skeleton.workspaces[0].workspaceId, skeletonHash: skeleton.skeletonHash,
    scenarios: skeleton.workspaces[0].scenarios.map(item => ({ scenarioId: item.scenarioId, organisms: item.scenarioId === scenario.scenarioId ? [{ role: 'summary', fragmentRef: 'projectSummary', fieldRefs: [run35Fixture.invalidFieldRef], intent: 'Mostrar projeto.' }] : [], commandInputs: [] })) });
  const gate = validateNs4WorkspaceDetail(detail, skeleton, sources);
  const issue = gate.issues.find(item => item.code === 'NS4_E8_FIELD');
  assert.equal(gate.ok, false);
  assert.match(issue?.message || '', /Project\.fieldThatDoesNotExist/);
  const resolved = resolveNs4WorkspaceDetailFindings(detail, gate.issues);
  assert.equal(resolved.artifact.scenarios.find(item => item.scenarioId === scenario.scenarioId)?.organisms[0].fieldRefs.length, 0);
  assert.equal(validateNs4WorkspaceDetail(resolved.artifact, skeleton, sources).ok, true);
  assert.ok(resolved.systemDecisions.some(decision => decision.chosen === 'removeInvalidFieldRef'));
});

test('E8 reports an empty menu section as a non-blocking recorder warning', () => {
  const skeleton = deriveNs4E8Skeleton(sources);
  skeleton.menu.sections.push({ sectionId: 'emptyFeature', label: 'Vazio', featureRef: 'emptyFeature', workspaceIds: [] });
  const gate = validateNs4E8Skeleton(skeleton, sources);
  assert.equal(gate.ok, true);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E8_MENU_EMPTY' && issue.severity === 'warning'));
  const resolved = resolveNs4E8SkeletonFindings(skeleton, gate.issues);
  assert.deepEqual(resolved.unresolved, []);
  assert.ok(resolved.systemDecisions.some(decision => decision.findingRef.includes('NS4_E8_MENU_EMPTY')));
});

test('run 36 derives a cross-workspace delivery edge from the handoff entity and its target profile', async () => {
  const handoffSources: any = structuredClone(sources);
  handoffSources.journeys.journeys = [
    {
      journeyId: 'shareProjectStatusReport',
      business: { actorRef: 'manager', entry: { mode: 'coldStart' }, steps: [{
        stepId: 'shareStatusReport', kind: 'handoff', entity: 'ProjectStatusReport', targetProfile: 'client',
        title: 'Compartilhar relatório.', featureRefs: ['projects'],
      }] },
    },
    {
      journeyId: 'viewSharedProjectStatus',
      business: { actorRef: 'client', entry: { mode: 'eventDriven' }, steps: [{
          stepId: 'inspectSharedStatusReport', kind: 'inspect', entity: 'SharedStatusReport',
          title: 'Ver relatório compartilhado.', featureRefs: ['projects'],
        }] },
    },
  ];
  handoffSources.journeys.features = [{ featureId: 'projects', title: 'Projetos', priority: 'now' }];
  handoffSources.ontology.entities.push({ entityId: 'ProjectStatusReport', title: 'Relatório', description: 'Relatório.', kind: 'core', ownership: 'moduleOwned',
    sourceRefs: { journeyIds: ['shareProjectStatusReport', 'viewSharedProjectStatus'], featureIds: ['projects'], authorityRefs: [] },
    fields: [{ fieldId: 'projectStatusReportId' }], lifecycleStates: [], lifecyclePredicates: [], useRules: [], storage: { target: 'moduleDatabase', scope: 'module', notes: '' } });
  handoffSources.ontology.entities.push({ entityId: 'SharedStatusReport', title: 'Relatório compartilhado', description: 'Relatório publicado ao cliente.', kind: 'projection', ownership: 'derived',
    sourceRefs: { journeyIds: ['viewSharedProjectStatus'], featureIds: ['projects'], authorityRefs: [] },
    fields: [{ fieldId: 'sharedStatusReportId' }], lifecycleStates: [], lifecyclePredicates: [], useRules: [], storage: { target: 'derived', scope: 'module', notes: '' } });
  handoffSources.access.profiles = [
    { profileId: 'manager', actorRefs: ['manager'], landingIntent: 'Gerenciar projetos.' },
    { profileId: 'client', actorRefs: ['client'], landingIntent: 'Consultar relatórios.' },
  ];
  handoffSources.access.authorities = [
    { authorityRef: 'construction:report-share', journeyStepRefs: ['shareProjectStatusReport.shareStatusReport'] },
    { authorityRef: 'construction:report-read', journeyStepRefs: ['viewSharedProjectStatus.inspectSharedStatusReport'] },
  ];
  handoffSources.access.grants = [
    { profileRef: 'manager', authorityRef: 'construction:report-share', disclosure: { mode: 'fullRecord', allowedInformation: [] } },
    { profileRef: 'client', authorityRef: 'construction:report-read', disclosure: { mode: 'fullRecord', allowedInformation: [] } },
  ];
  handoffSources.useCases = [
    { useCaseId: 'shareStatusReport', kind: 'command', compiledFrom: ['shareProjectStatusReport.shareStatusReport'], entityRefs: ['ProjectStatusReport'] },
    { useCaseId: 'inspectSharedStatusReport', kind: 'query', compiledFrom: ['viewSharedProjectStatus.inspectSharedStatusReport'], entityRefs: ['SharedStatusReport'] },
  ];
  const skeleton = deriveNs4E8Skeleton(handoffSources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const target = skeleton.workspaces.find(workspace => workspace.hostedStepRefs.includes('viewSharedProjectStatus.inspectSharedStatusReport'))!;
  const source = skeleton.workspaces.find(workspace => workspace.hostedStepRefs.includes('shareProjectStatusReport.shareStatusReport'))!;
  assert.ok(skeleton.edges.some(edge => edge.from === source.workspaceId && edge.to === target.workspaceId
    && edge.carries.includes('selectedProjectStatusReport') && edge.preferredFromJourneyRef === 'shareProjectStatusReport.shareStatusReport'));
  assert.equal(validateNs4E8Skeleton(skeleton, handoffSources).ok, true);
});

test('run 36 duplicate approval is recognized by the stable E8 detail plan id', () => {
  const planId = ns4E8DetailsPlanId(run36DuplicateFixture.reviewRound);
  assert.equal(planId, 'e8-workspaces-round-1-details-0');
  assert.equal(run36DuplicateFixture.steps.filter(step => step.planning.planId === planId).length, run36DuplicateFixture.observedFanoutCount);
  assert.equal(hasNs4E8DetailsDispatch(run36DuplicateFixture.steps, run36DuplicateFixture.reviewRound), true);
  assert.equal(hasNs4E8DetailsDispatch([{ planning: { planId: 'e8-workspaces-round-2-details-0' } }], run36DuplicateFixture.reviewRound), false);
});

test('run 39 constrained presentation repair uses an exact routable E8 plan id', () => {
  const repair = createNs4E8PresentationRepairStep('buildFlowFsm39', 1, 1, 'invalid presentation');
  assert.equal(repair.planning?.planId, run39PresentationRepairFixture.observedPlanId);
  assert.equal(repair.status, 'waiting_human_input');
  assert.equal(isNs4E8PresentationRepairPlanId(run39PresentationRepairFixture.observedPlanId), true);
  assert.equal(isNs4E8ImplementedPlanId(run39PresentationRepairFixture.observedPlanId), true);
  assert.equal(isNs4E8ImplementedPlanId('e8-workspaces-finalize-1'), true);
  run39PresentationRepairFixture.malformedPlanIds.forEach(planId => assert.equal(isNs4E8PresentationRepairPlanId(planId), false));
});

test('run 37 accepts a cold-start creation form without invented record context', async () => {
  const coldStartSources: any = structuredClone(sources);
  coldStartSources.journeys.features.push(run37ColdStartFixture.feature);
  coldStartSources.journeys.journeys.push(run37ColdStartFixture.journey);
  coldStartSources.access.profiles.push(run37ColdStartFixture.profile);
  coldStartSources.access.authorities.push(run37ColdStartFixture.authority);
  coldStartSources.access.grants.push(run37ColdStartFixture.grant);
  coldStartSources.ontology.entities.push(run37ColdStartFixture.entity);
  coldStartSources.useCases.push(run37ColdStartFixture.useCase);
  const skeleton = deriveNs4E8Skeleton(coldStartSources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const workspace = skeleton.workspaces.find(item => item.workspaceId === 'materialInventoryWorkspace')!;
  assert.ok(workspace.scenarios.some(scenario => scenario.kind === 'form'));
  assert.deepEqual(workspace.pageContext, []);
  assert.deepEqual(workspace.slices, []);
  const gate = validateNs4E8Skeleton(skeleton, coldStartSources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_DECISION_WITHOUT_CONTEXT'), false);
  assert.equal(gate.ok, true);
});

test('E8 still rejects a context-dependent form when its frozen subject is unavailable', async () => {
  const coldStartSources: any = structuredClone(sources);
  coldStartSources.journeys.features.push(run37ColdStartFixture.feature);
  coldStartSources.journeys.journeys.push(run37ColdStartFixture.journey);
  coldStartSources.access.profiles.push(run37ColdStartFixture.profile);
  coldStartSources.access.authorities.push(run37ColdStartFixture.authority);
  coldStartSources.access.grants.push(run37ColdStartFixture.grant);
  coldStartSources.ontology.entities.push(run37ColdStartFixture.entity);
  coldStartSources.useCases.push({ ...run37ColdStartFixture.useCase, contexts: { requires: ['selectedMaterialInventory'], provides: [] } });
  const skeleton = deriveNs4E8Skeleton(coldStartSources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const gate = validateNs4E8Skeleton(skeleton, coldStartSources);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E8_DECISION_WITHOUT_CONTEXT'));
  assert.equal(gate.ok, false);
});

function run38UrlRoleSources(): any {
  const value = structuredClone(sources);
  value.journeys.moduleName = run38UrlRolesFixture.moduleName;
  value.access.moduleName = run38UrlRolesFixture.moduleName;
  value.ontology.moduleName = run38UrlRolesFixture.moduleName;
  value.journeys.journeys.push(...run38UrlRolesFixture.journeys);
  value.access.authorities.push(...run38UrlRolesFixture.authorities);
  value.access.grants.push(...run38UrlRolesFixture.authorities.map((authority: any) => ({ profileRef: 'manager', authorityRef: authority.authorityRef, disclosure: { mode: 'fullRecord', allowedInformation: [] } })));
  value.ontology.entities.push(...run38UrlRolesFixture.entities);
  value.ontology.relationships.push(...run38UrlRolesFixture.relationships);
  value.useCases.push(...run38UrlRolesFixture.useCases);
  return value;
}

test('run 38 keeps only the Project anchor in workspace path and resolves assignee/material locally', () => {
  const replaySources = run38UrlRoleSources();
  const skeleton = deriveNs4E8Skeleton(replaySources);
  const workspace = skeleton.workspaces.find(item => item.workspaceId === run38UrlRolesFixture.expected.workspaceId)!;
  assert.deepEqual(workspace.pageContext.map(context => context.contextId), run38UrlRolesFixture.expected.pageContext);
  const scenarioContexts = workspace.scenarios.flatMap(scenario => scenario.selectionContexts);
  assert.deepEqual([...new Set(scenarioContexts.map(context => context.contextId))].sort(), [...run38UrlRolesFixture.expected.selectionContexts].sort());
  assert.ok(workspace.slices.some(slice => slice.sliceId === 'locateAssignee'));
  assert.ok(workspace.slices.some(slice => slice.sliceId === 'locateMaterial'));
  assert.equal(previewNs4E8Routes(skeleton, workspace).find(route => route.label === 'Record')?.url, run38UrlRolesFixture.expected.recordUrl);
  assert.equal(validateNs4E8Skeleton(skeleton, replaySources).ok, true);
});

test('E8 keeps local picker context scenario-local and promotes only a real handoff edge', () => {
  const replaySources = run38UrlRoleSources();
  const skeleton = deriveNs4E8Skeleton(replaySources);
  const project = skeleton.workspaces.find(workspace => workspace.workspaceId === 'projectWorkspace')!;
  const assignee = project.scenarios.flatMap(scenario => scenario.selectionContexts).find(context => context.contextId === 'selectedWorker')!;
  assert.equal(project.pageContext.some(context => context.contextId === assignee.contextId), false);

  const handoffSources: any = structuredClone(replaySources);
  handoffSources.journeys.journeys.push({ journeyId: 'notifyInspection', business: { actorRef: 'manager', entry: { mode: 'coldStart' }, steps: [{ stepId: 'handoffInspection', kind: 'handoff', entity: 'Inspection', targetProfile: 'manager', title: 'Notificar inspeção.', featureRefs: ['projects'] }] } });
  handoffSources.journeys.journeys.push({ journeyId: 'decideInspection', business: { actorRef: 'manager', entry: { mode: 'eventDriven' }, steps: [{ stepId: 'decideInspection', kind: 'decide', entity: 'Inspection', title: 'Decidir inspeção.', featureRefs: ['projects'] }] } });
  handoffSources.ontology.entities.push({ entityId: 'Inspection', title: 'Inspeção', description: 'Inspeção.', kind: 'core', sourceRefs: { journeyIds: ['notifyInspection', 'decideInspection'] }, fields: [{ fieldId: 'inspectionId' }], lifecycleStates: [], lifecyclePredicates: [] });
  handoffSources.access.authorities.push({ authorityRef: 'construction:inspection', journeyStepRefs: ['notifyInspection.handoffInspection', 'decideInspection.decideInspection'] });
  handoffSources.access.grants.push({ profileRef: 'manager', authorityRef: 'construction:inspection', disclosure: { mode: 'fullRecord', allowedInformation: [] } });
  handoffSources.useCases.push({ useCaseId: 'handoffInspection', kind: 'command', compiledFrom: ['notifyInspection.handoffInspection'], entityRefs: ['Project', 'Inspection'], contexts: { requires: ['selectedProject'], provides: ['selectedInspection'] } }, { useCaseId: 'decideInspection', kind: 'command', compiledFrom: ['decideInspection.decideInspection'], entityRefs: ['Inspection'], contexts: { requires: ['selectedInspection'], provides: [] } });
  const handoffSkeleton = deriveNs4E8Skeleton(handoffSources);
  const target = handoffSkeleton.workspaces.find(workspace => workspace.hostedStepRefs.includes('decideInspection.decideInspection'))!;
  assert.ok(target.pageContext.some(context => context.contextId === 'selectedInspection'));
});

test('second invalid E8 presentation keeps mechanical defaults without URL decisions', () => {
  const replaySources = run38UrlRoleSources();
  const derived = deriveNs4E8Skeleton(replaySources);
  const invalid = normalizeNs4E8PresentationProposal({}, derived.moduleName);
  assert.equal(validateNs4E8PresentationProposal(derived, invalid).ok, false);
  const fallback = resolveNs4E8PresentationDefaults(derived, 'second invalid response');
  assert.deepEqual(fallback, derived);
  assert.equal(validateNs4E8Skeleton(fallback, replaySources).ok, true);
});

test('valid L1 presentation changes labels but cannot change contexts', () => {
  const replaySources = run38UrlRoleSources();
  const derived = deriveNs4E8Skeleton(replaySources);
  const proposal = normalizeNs4E8PresentationProposal({
    planId: 'e8-skeleton-presentation', schemaVersion: '2026-08-14-ns4-e8-presentation-v3', moduleName: derived.moduleName,
    userLanguage: derived.userLanguage, reviewRound: derived.reviewRound, title: 'Workspaces', changeSummary: [],
    menuSections: derived.menu.sections.map(section => ({ featureRef: section.featureRef, label: section.label })),
    workspaces: derived.workspaces.map(item => ({ workspaceId: item.workspaceId, title: item.title, description: item.description,
      pageContext: item.pageContext,
      scenarios: item.scenarios.map(value => ({ scenarioId: value.scenarioId, title: value.title, description: value.description,
        selectionContexts: value.selectionContexts })) })),
  }, derived.moduleName);
  assert.equal(validateNs4E8PresentationProposal(derived, proposal).ok, true);
  const overlaid = overlayNs4E8Presentation(derived, proposal);
  assert.deepEqual(overlaid.workspaces.flatMap(item => item.scenarios.flatMap(scenario => scenario.selectionContexts)),
    derived.workspaces.flatMap(item => item.scenarios.flatMap(scenario => scenario.selectionContexts)));
  assert.equal(validateNs4E8Skeleton(overlaid, replaySources).ok, true);
});

test('run 41 accepts a many-cardinality provided slice without URL cardinality checks', () => {
  const replaySources = run38UrlRoleSources();
  const skeleton = deriveNs4E8Skeleton(replaySources);
  const workspace = skeleton.workspaces.find(item => item.workspaceId === 'projectWorkspace')!;
  const scenario = workspace.scenarios.find(item => item.selectionContexts.length)!;
  scenario.selectionContexts[0].cardinality = 'many';
  const gate = validateNs4E8Skeleton(skeleton, replaySources);
  assert.equal(gate.ok, true);
});

test('run 41 keeps event-driven session and provided slice contexts out of pageContext', () => {
  const replay: any = structuredClone(sources);
  replay.journeys.journeys = [{
    journeyId: run41ContextFixture.journeyId,
    business: { actorRef: 'client', entry: { mode: 'eventDriven' }, steps: [
      { stepId: 'inspectClientProjects', kind: 'inspect', entity: 'ClientProjectSummary', title: 'View projects.', featureRefs: ['projects'] },
      { stepId: 'inspectProjectSummary', kind: 'inspect', entity: 'ClientProjectSummary', title: 'View summary.', featureRefs: ['projects'] },
    ] },
  }];
  replay.journeys.features = [{ featureId: 'projects', title: 'Projects', priority: 'now' }];
  replay.access.profiles = [{ profileId: 'client', actorRefs: ['client'], landingIntent: 'View projects.' }];
  replay.access.authorities = [{ authorityRef: 'construction:client-read', journeyStepRefs: ['viewClientProjectSummary.inspectClientProjects', 'viewClientProjectSummary.inspectProjectSummary'] }];
  replay.access.grants = [{ profileRef: 'client', authorityRef: 'construction:client-read', dataScope: { mode: 'own', description: 'Own client.' }, disclosure: { mode: 'fullRecord', allowedInformation: [] } }];
  replay.ontology.entities = [
    { entityId: 'Client', title: 'Client', description: 'Client.', kind: 'mdm', sourceRefs: { journeyIds: [run41ContextFixture.journeyId] }, fields: [{ fieldId: 'clientId' }], lifecycleStates: [], lifecyclePredicates: [] },
    { entityId: 'ClientProjectSummary', title: 'Summary', description: 'Summary.', kind: 'projection', sourceRefs: { journeyIds: [run41ContextFixture.journeyId] }, fields: [{ fieldId: 'clientProjectSummaryId' }], lifecycleStates: [], lifecyclePredicates: [] },
    { entityId: 'Project', title: 'Project', description: 'Project.', kind: 'core', sourceRefs: { journeyIds: [] }, fields: [{ fieldId: 'projectId' }], lifecycleStates: [], lifecyclePredicates: [] },
  ];
  replay.ontology.relationships = [{ fromEntity: 'WorkTask', toEntity: 'Project', type: 'manyToOne', required: true }, { fromEntity: 'Invoice', toEntity: 'Project', type: 'manyToOne', required: true }];
  replay.useCases = [
    { useCaseId: 'inspectClientProjects', kind: 'query', compiledFrom: ['viewClientProjectSummary.inspectClientProjects'], entityRefs: ['ClientProjectSummary'], contexts: { requires: [], provides: ['selectedClientProjectSummary'] } },
    { useCaseId: 'inspectProjectSummary', kind: 'query', compiledFrom: ['viewClientProjectSummary.inspectProjectSummary'], entityRefs: ['ClientProjectSummary'], contexts: { requires: ['selectedClientProjectSummary'], provides: [] } },
  ];
  replay.workflows = [];
  const skeleton = deriveNs4E8Skeleton(replay);
  assert.deepEqual(skeleton.workspaces.flatMap(workspace => workspace.pageContext.map(context => context.contextId)), run41ContextFixture.expectedPageContexts);
  const provided = skeleton.workspaces.flatMap(workspace => workspace.scenarios.flatMap(scenario => scenario.selectionContexts))
    .find(context => context.contextId === run41ContextFixture.expectedSelectionContext);
  assert.equal(provided?.businessObject, run41ContextFixture.providedEntity);
  assert.equal(validateNs4E8Skeleton(skeleton, replay).ok, true);
});

test('E8 presentation schema is strict, versioned and contains no URL role taxonomy', () => {
  const schema = JSON.parse(readFileSync(new URL('../../schemas/e8-workspace.schema.json', import.meta.url), 'utf8')) as any;
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.schemaVersion.const, '2026-08-14-ns4-e8-presentation-v3');
  assert.deepEqual(Object.keys(schema.$defs.context.properties), ['contextId', 'businessObject', 'cardinality', 'required', 'idFieldRef']);
  assert.equal(schema.properties.workspaces.items.properties.scenarios.items.properties.selectionContexts.items.$ref, '#/$defs/context');
});

test('run 43 replay on the approved module: the hub holds, the satellite decision is hosted and nothing blocks', () => {
  const replaySources: any = {
    journeys: run43AffinityFixture.journeys, access: run43AffinityFixture.access,
    ontology: run43AffinityFixture.ontology, useCases: run43AffinityFixture.useCases, workflows: run43AffinityFixture.workflows,
  };
  assert.equal(deriveE8HubScore(replaySources)[0].entityRef, run43AffinityFixture.expected.hubEntity);
  const skeleton = deriveNs4E8Skeleton(replaySources);
  const hub = skeleton.workspaces.find(workspace => workspace.kind === 'hub')!;
  assert.equal(hub.anchorEntity, run43AffinityFixture.expected.hubEntity);

  const hosting = skeleton.workspaces.filter(workspace => workspace.hostedStepRefs.some(ref => /changeOrder/i.test(ref)));
  assert.deepEqual(hosting.map(workspace => workspace.workspaceId), [run43AffinityFixture.expected.changeOrderHost]);
  assert.ok(hosting[0].slices.length);

  // The run 43 defect was a workspace that rendered nothing; no workspace may be empty of every source.
  assert.ok(skeleton.workspaces.every(workspace => workspace.slices.length || workspace.pageContext.length
    || workspace.scenarios.some(scenario => scenario.selectionContexts.length)));

  const gate = validateNs4E8Skeleton(skeleton, replaySources);
  assert.equal(gate.issues.filter(issue => issue.severity !== 'warning').length, run43AffinityFixture.expected.blockingIssues);
  assert.equal(gate.ok, true);
  assert.deepEqual(resolveNs4E8SkeletonFindings(skeleton, gate.issues).unresolved, []);
});
