import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNs4WorkspaceArtifacts, deriveE8HubScore, deriveNs4E8Skeleton, hashNs4E8Skeleton, normalizeNs4WorkspaceDetail,
} from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import { validateNs4E8Skeleton, validateNs4WorkspaceDetail } from '/_102020_/l2/agentNewSolution4/steps/e8/gate.js';

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
