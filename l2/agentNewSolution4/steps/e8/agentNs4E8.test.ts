import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildNs4WorkspaceArtifacts, deriveE8HubScore, deriveNs4E8Skeleton, hashNs4E8Skeleton, normalizeNs4E8PresentationProposal,
  normalizeNs4WorkspaceDetail, overlayNs4E8Presentation, previewNs4E8Routes, resolveNs4E8PresentationDefaults,
} from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import { hasNs4E8DetailsDispatch, ns4E8DetailsPlanId } from '/_102020_/l2/agentNewSolution4/steps/e8/dispatch.js';
import { resolveNs4WorkspaceDetailFindings, validateNs4E8PresentationProposal, validateNs4E8Skeleton, validateNs4WorkspaceDetail } from '/_102020_/l2/agentNewSolution4/steps/e8/gate.js';

const run35Fixture = JSON.parse(readFileSync(new URL('fixtures/run35-disclosure-platform.json', import.meta.url), 'utf8')) as {
  platformEntity: any; fieldsOnly: any; invalidFieldRef: { entityId: string; fieldId: string; label: string };
};
const run36DuplicateFixture = JSON.parse(readFileSync(new URL('fixtures/run36-duplicate-dispatch.json', import.meta.url), 'utf8')) as {
  reviewRound: number; observedFanoutCount: number; steps: Array<{ planning: { planId: string } }>;
};
const run37ColdStartFixture = JSON.parse(readFileSync(new URL('fixtures/run37-cold-start-command.json', import.meta.url), 'utf8')) as any;
const run38UrlRolesFixture = JSON.parse(readFileSync(new URL('fixtures/run38-url-roles.json', import.meta.url), 'utf8')) as any;

const sources: any = {
  journeys: { moduleName: 'construction', userLanguage: 'pt-BR', journeys: [
    { journeyId: 'locateProjects', business: { actorRef: 'manager', entry: { carries: [] }, steps: [{ stepId: 'locateProject', kind: 'locate', intent: 'Localizar projetos.', requiresContext: [], providesContext: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true }], featureRefs: ['projects'] }] } },
    { journeyId: 'manageChangeOrders', business: { actorRef: 'manager', entry: { carries: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true }] }, steps: [{ stepId: 'decideChangeOrder', kind: 'decide', intent: 'Decidir alteração.', requiresContext: ['selectedProject'], providesContext: [], featureRefs: ['changes'] }] } },
  ], features: [{ featureId: 'projects', title: 'Projetos', priority: 'now' }, { featureId: 'changes', title: 'Alterações', priority: 'now' }] },
  access: { moduleName: 'construction', profiles: [{ profileId: 'manager', landingIntent: 'Gerenciar projetos.' }], authorities: [
    { authorityRef: 'construction:project-read', journeyStepRefs: ['locateProjects.locateProject'] }, { authorityRef: 'construction:change-decide', journeyStepRefs: ['manageChangeOrders.decideChangeOrder'] },
  ], grants: [{ profileRef: 'manager', authorityRef: 'construction:project-read', disclosure: { mode: 'fullRecord', allowedInformation: [] } }, { profileRef: 'manager', authorityRef: 'construction:change-decide', disclosure: { mode: 'fullRecord', allowedInformation: [] } }] },
  ontology: { moduleName: 'construction', entities: [
    { entityId: 'Project', title: 'Projeto', description: 'Projeto.', kind: 'mdm', sourceRefs: { journeyIds: ['locateProjects'] }, fields: [{ fieldId: 'projectId' }], lifecycleStates: [], lifecyclePredicates: [] },
    { entityId: 'ChangeOrder', title: 'Alteração', description: 'Alteração.', kind: 'core', sourceRefs: { journeyIds: ['manageChangeOrders'] }, fields: [{ fieldId: 'changeOrderId' }], lifecycleStates: ['proposed', 'approved'], initialState: 'proposed', terminalStates: ['approved'], lifecyclePredicates: [] },
  ], relationships: [{ fromEntity: 'ChangeOrder', toEntity: 'Project', required: true }] },
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

test('E8 rejects a section over the menu cap and a workspace command with neither slice nor context', async () => {
  const skeleton = deriveNs4E8Skeleton(sources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  skeleton.menu.sections[0].workspaceIds = Array.from({ length: 8 }, () => skeleton.workspaces[0].workspaceId);
  skeleton.workspaces[0].slices = []; skeleton.workspaces[0].pageContext = [];
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
    journeys: { ...sources.journeys, journeys: [...sources.journeys.journeys, { journeyId: 'locateClients', business: { actorRef: 'manager', entry: { carries: [] }, steps: [{ stepId: 'locateClient', kind: 'locate', intent: 'Localizar clientes.', requiresContext: [], providesContext: [{ contextId: 'selectedClient', businessObject: 'Client', cardinality: 'one', required: true }], featureRefs: ['clients'] }] } }], features: [...sources.journeys.features, { featureId: 'clients', title: 'Clientes', priority: 'now' }] },
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
});

test('run 36 derives an exact cross-journey edge from prerequisite providesContext', async () => {
  const handoffSources: any = structuredClone(sources);
  handoffSources.journeys.journeys = [
    {
      journeyId: 'shareProjectStatusReport',
      business: { actorRef: 'manager', prerequisites: [], entry: { carries: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true }] }, steps: [{
        stepId: 'shareStatusReport', kind: 'handoff', intent: 'Compartilhar relatório.', requiresContext: ['selectedProject'],
        providesContext: [{ contextId: 'sharedStatusReport', businessObject: 'ProjectStatusReport', cardinality: 'one', required: true }], featureRefs: ['projects'],
      }] },
    },
    {
      journeyId: 'viewSharedProjectStatus',
      business: { actorRef: 'client', prerequisites: [{ journeyRef: 'shareProjectStatusReport', required: true, providesContext: ['sharedStatusReport'] }],
        entry: { carries: [{ contextId: 'sharedStatusReport', businessObject: 'ProjectStatusReport', cardinality: 'one', required: true }] }, steps: [{
          stepId: 'inspectSharedStatusReport', kind: 'inspect', intent: 'Ver relatório compartilhado.', requiresContext: ['sharedStatusReport'],
          providesContext: [], featureRefs: ['projects'],
        }] },
    },
  ];
  handoffSources.journeys.features = [{ featureId: 'projects', title: 'Projetos', priority: 'now' }];
  handoffSources.ontology.entities.push({ entityId: 'ProjectStatusReport', title: 'Relatório', description: 'Relatório.', kind: 'core', ownership: 'moduleOwned',
    sourceRefs: { journeyIds: ['shareProjectStatusReport', 'viewSharedProjectStatus'], featureIds: ['projects'], authorityRefs: [] },
    fields: [{ fieldId: 'projectStatusReportId' }], lifecycleStates: [], lifecyclePredicates: [], useRules: [], storage: { target: 'moduleDatabase', scope: 'module', notes: '' } });
  handoffSources.access.authorities = [
    { authorityRef: 'construction:report-share', journeyStepRefs: ['shareProjectStatusReport.shareStatusReport'] },
    { authorityRef: 'construction:report-read', journeyStepRefs: ['viewSharedProjectStatus.inspectSharedStatusReport'] },
  ];
  handoffSources.access.grants = [
    { profileRef: 'manager', authorityRef: 'construction:report-share', disclosure: { mode: 'fullRecord', allowedInformation: [] } },
    { profileRef: 'manager', authorityRef: 'construction:report-read', disclosure: { mode: 'fullRecord', allowedInformation: [] } },
  ];
  handoffSources.useCases = [
    { useCaseId: 'shareStatusReport', kind: 'command', compiledFrom: ['shareProjectStatusReport.shareStatusReport'], entityRefs: ['Project', 'ProjectStatusReport'] },
    { useCaseId: 'inspectSharedStatusReport', kind: 'query', compiledFrom: ['viewSharedProjectStatus.inspectSharedStatusReport'], entityRefs: ['ProjectStatusReport'] },
  ];
  const skeleton = deriveNs4E8Skeleton(handoffSources); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const target = skeleton.workspaces.find(workspace => workspace.hostedStepRefs.includes('viewSharedProjectStatus.inspectSharedStatusReport'))!;
  const source = skeleton.workspaces.find(workspace => workspace.hostedStepRefs.includes('shareProjectStatusReport.shareStatusReport'))!;
  assert.ok(skeleton.edges.some(edge => edge.from === source.workspaceId && edge.to === target.workspaceId
    && edge.carries.includes('sharedStatusReport') && edge.preferredFromJourneyRef === 'shareProjectStatusReport.shareStatusReport'));
  assert.equal(validateNs4E8Skeleton(skeleton, handoffSources).ok, true);
});

test('run 36 duplicate approval is recognized by the stable E8 detail plan id', () => {
  const planId = ns4E8DetailsPlanId(run36DuplicateFixture.reviewRound);
  assert.equal(planId, 'e8-workspaces-round-1-details-0');
  assert.equal(run36DuplicateFixture.steps.filter(step => step.planning.planId === planId).length, run36DuplicateFixture.observedFanoutCount);
  assert.equal(hasNs4E8DetailsDispatch(run36DuplicateFixture.steps, run36DuplicateFixture.reviewRound), true);
  assert.equal(hasNs4E8DetailsDispatch([{ planning: { planId: 'e8-workspaces-round-2-details-0' } }], run36DuplicateFixture.reviewRound), false);
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
  value.useCases.push(...run38UrlRolesFixture.useCases);
  return value;
}

test('run 38 keeps only the Project anchor in workspace path and resolves assignee/material locally', () => {
  const replaySources = run38UrlRoleSources();
  const skeleton = deriveNs4E8Skeleton(replaySources);
  const workspace = skeleton.workspaces.find(item => item.workspaceId === run38UrlRolesFixture.expected.workspaceId)!;
  assert.deepEqual(workspace.pageContext.map(context => context.contextId), run38UrlRolesFixture.expected.pageContext);
  assert.ok(workspace.pageContext.every(context => context.urlRole === 'path'));
  const scenarioContexts = workspace.scenarios.flatMap(scenario => scenario.selectionContexts);
  assert.deepEqual([...new Set(scenarioContexts.map(context => context.contextId))].sort(), [...run38UrlRolesFixture.expected.selectionContexts].sort());
  assert.ok(scenarioContexts.every(context => context.urlRole === 'selection' && context.urlRoleSource === 'localSelection'));
  assert.ok(workspace.slices.some(slice => slice.sliceId === 'locateAssignee'));
  assert.ok(workspace.slices.some(slice => slice.sliceId === 'locateMaterial'));
  assert.equal(previewNs4E8Routes(skeleton, workspace).find(route => route.label === 'Record')?.url, run38UrlRolesFixture.expected.recordUrl);
  assert.equal(validateNs4E8Skeleton(skeleton, replaySources).ok, true);
});

test('E8 classifies incoming handoff context as path and local picker context as selection without L1', () => {
  const replaySources = run38UrlRoleSources();
  const skeleton = deriveNs4E8Skeleton(replaySources);
  const project = skeleton.workspaces.find(workspace => workspace.workspaceId === 'projectWorkspace')!;
  const assignee = project.scenarios.flatMap(scenario => scenario.selectionContexts).find(context => context.contextId === 'selectedAssignee')!;
  assert.equal(assignee.urlRole, 'selection');
  assert.equal(skeleton.urlRoleDecisions.some(decision => decision.contextId === assignee.contextId), false);

  const handoffSources: any = structuredClone(replaySources);
  handoffSources.journeys.journeys.push({ journeyId: 'notifyInspection', business: { actorRef: 'manager', prerequisites: [], entry: { mode: 'coldStart', carries: [] }, steps: [{ stepId: 'handoffInspection', kind: 'handoff', intent: 'Notificar inspeção.', requiresContext: [], providesContext: [{ contextId: 'selectedInspection', businessObject: 'Inspection', cardinality: 'one', required: true }], featureRefs: ['projects'] }] } });
  handoffSources.journeys.journeys.push({ journeyId: 'decideInspection', business: { actorRef: 'manager', prerequisites: [{ journeyRef: 'notifyInspection', required: true, providesContext: ['selectedInspection'] }], entry: { mode: 'eventDriven', carries: [{ contextId: 'selectedInspection', businessObject: 'Inspection', cardinality: 'one', required: true }] }, steps: [{ stepId: 'decideInspection', kind: 'decide', intent: 'Decidir inspeção.', requiresContext: ['selectedInspection'], providesContext: [], featureRefs: ['projects'] }] } });
  handoffSources.ontology.entities.push({ entityId: 'Inspection', title: 'Inspeção', description: 'Inspeção.', kind: 'core', sourceRefs: { journeyIds: ['notifyInspection', 'decideInspection'] }, fields: [{ fieldId: 'inspectionId' }], lifecycleStates: [], lifecyclePredicates: [] });
  handoffSources.access.authorities.push({ authorityRef: 'construction:inspection', journeyStepRefs: ['notifyInspection.handoffInspection', 'decideInspection.decideInspection'] });
  handoffSources.access.grants.push({ profileRef: 'manager', authorityRef: 'construction:inspection', disclosure: { mode: 'fullRecord', allowedInformation: [] } });
  handoffSources.useCases.push({ useCaseId: 'handoffInspection', kind: 'command', compiledFrom: ['notifyInspection.handoffInspection'], entityRefs: ['Inspection'], contexts: { requires: [], provides: ['selectedInspection'] } }, { useCaseId: 'decideInspection', kind: 'command', compiledFrom: ['decideInspection.decideInspection'], entityRefs: ['Inspection'], contexts: { requires: ['selectedInspection'], provides: [] } });
  const handoffSkeleton = deriveNs4E8Skeleton(handoffSources);
  const target = handoffSkeleton.workspaces.find(workspace => workspace.hostedStepRefs.includes('decideInspection.decideInspection'))!;
  assert.equal(target.pageContext.find(context => context.contextId === 'selectedInspection')?.urlRole, 'path');
  assert.equal(handoffSkeleton.urlRoleDecisions.some(decision => decision.contextId === 'selectedInspection'), false);
});

test('two invalid E8 presentation rounds apply selection default and record a non-blocking system decision', () => {
  const replaySources = run38UrlRoleSources();
  const derived = deriveNs4E8Skeleton(replaySources);
  const workspace = derived.workspaces.find(item => item.workspaceId === 'projectWorkspace')!;
  const scenario = workspace.scenarios.find(item => item.selectionContexts.some(context => context.contextId === 'selectedAssignee'))!;
  const context = scenario.selectionContexts.find(item => item.contextId === 'selectedAssignee')!;
  context.urlRoleSource = 'ambiguous';
  derived.urlRoleDecisions.push({ workspaceId: workspace.workspaceId, scenarioId: scenario.scenarioId, contextId: context.contextId, defaultUrlRole: 'selection', urlRole: 'selection', justification: '', decidedBy: 'pending' });
  const invalid = normalizeNs4E8PresentationProposal({}, derived.moduleName);
  assert.equal(validateNs4E8PresentationProposal(derived, invalid).ok, false);
  assert.equal(validateNs4E8PresentationProposal(derived, invalid).ok, false);
  const fallback = resolveNs4E8PresentationDefaults(derived, 'second invalid response');
  assert.equal(fallback.urlRoleDecisions.at(-1)?.decidedBy, 'system');
  assert.equal(fallback.systemDecisions.at(-1)?.stage, 'e8');
  assert.equal(fallback.systemDecisions.at(-1)?.chosen, 'selection');
  assert.equal(validateNs4E8Skeleton(fallback, replaySources).ok, true);
});

test('valid L1 presentation can classify only an ambiguous focused context with justification', () => {
  const replaySources = run38UrlRoleSources();
  const derived = deriveNs4E8Skeleton(replaySources);
  const workspace = derived.workspaces.find(item => item.workspaceId === 'projectWorkspace')!;
  const scenario = workspace.scenarios.find(item => item.selectionContexts.some(context => context.contextId === 'selectedAssignee'))!;
  const context = scenario.selectionContexts.find(item => item.contextId === 'selectedAssignee')!;
  context.urlRoleSource = 'ambiguous';
  derived.urlRoleDecisions.push({ workspaceId: workspace.workspaceId, scenarioId: scenario.scenarioId, contextId: context.contextId, defaultUrlRole: 'selection', urlRole: 'selection', justification: '', decidedBy: 'pending' });
  const proposal = normalizeNs4E8PresentationProposal({
    planId: 'e8-skeleton-presentation', schemaVersion: '2026-08-13-ns4-e8-presentation-v2', moduleName: derived.moduleName,
    userLanguage: derived.userLanguage, reviewRound: derived.reviewRound, title: 'Workspaces', changeSummary: [],
    menuSections: derived.menu.sections.map(section => ({ featureRef: section.featureRef, label: section.label })),
    workspaces: derived.workspaces.map(item => ({ workspaceId: item.workspaceId, title: item.title, description: item.description,
      pageContext: item.pageContext.map(value => ({ ...value, urlRoleJustification: value.urlRoleJustification || '' })),
      scenarios: item.scenarios.map(value => ({ scenarioId: value.scenarioId, title: value.title, description: value.description,
        selectionContexts: value.selectionContexts.map(selected => selected.contextId === context.contextId
          ? { ...selected, urlRole: 'path', urlRoleSource: 'llm', urlRoleJustification: 'A tarefa focada precisa de link direto.' }
          : { ...selected, urlRoleJustification: selected.urlRoleJustification || '' }) })) })),
  }, derived.moduleName);
  assert.equal(validateNs4E8PresentationProposal(derived, proposal).ok, true);
  const overlaid = overlayNs4E8Presentation(derived, proposal);
  assert.equal(overlaid.urlRoleDecisions.at(-1)?.decidedBy, 'llm');
  assert.equal(overlaid.urlRoleDecisions.at(-1)?.urlRole, 'path');
  assert.equal(validateNs4E8Skeleton(overlaid, replaySources).ok, true);
});

test('E8 gate rejects a many-cardinality path context as a structural Type A issue', () => {
  const replaySources = run38UrlRoleSources();
  const skeleton = deriveNs4E8Skeleton(replaySources);
  skeleton.workspaces.find(workspace => workspace.workspaceId === 'projectWorkspace')!.pageContext[0].cardinality = 'many';
  const gate = validateNs4E8Skeleton(skeleton, replaySources);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E8_PATH_CARDINALITY'));
});

test('E8 presentation schema is strict and versions urlRole plus scenario selectionContexts together', () => {
  const schema = JSON.parse(readFileSync(new URL('../../schemas/e8-workspace.schema.json', import.meta.url), 'utf8')) as any;
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.schemaVersion.const, '2026-08-13-ns4-e8-presentation-v2');
  assert.deepEqual(schema.$defs.routedContext.properties.urlRole.enum, ['path', 'selection']);
  assert.equal(schema.properties.workspaces.items.properties.scenarios.items.properties.selectionContexts.items.$ref, '#/$defs/routedContext');
});
