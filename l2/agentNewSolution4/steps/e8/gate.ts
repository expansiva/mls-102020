import type { Ns4E8SkeletonReview, Ns4E8Sources, Ns4WorkspaceDetailDraft } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';

export interface Ns4E8GateIssue { code: string; path: string; message: string; }
export interface Ns4E8GateResult { ok: boolean; issues: Ns4E8GateIssue[]; }

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const MAX_MENU_ITEMS = 7;

export function validateNs4E8Skeleton(skeleton: Ns4E8SkeletonReview, sources: Ns4E8Sources): Ns4E8GateResult {
  const issues: Ns4E8GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (skeleton.moduleName !== sources.journeys.moduleName || skeleton.moduleName !== sources.access.moduleName || skeleton.moduleName !== sources.ontology.moduleName) add('NS4_E8_MODULE', 'moduleName', 'All approved sources and the skeleton must belong to the same module.');
  const workspaceIds = new Set<string>(); const stepRefs = new Set<string>(); const useCaseRefs = new Set<string>();
  const sourceUseCases = new Set(sources.useCases.map(item => item.useCaseId));
  const sourceSteps = new Set(sources.journeys.journeys.flatMap(journey => journey.business.steps.map(step => `${journey.journeyId}.${step.stepId}`)));
  const profileIds = new Set(sources.access.profiles.map(profile => profile.profileId));
  const entityIds = new Set(sources.ontology.entities.map(entity => entity.entityId));
  const contexts = new Set(skeleton.contextCatalog.map(context => context.contextId));
  skeleton.workspaces.forEach((workspace, index) => {
    const path = `workspaces[${index}]`;
    if (!MEMBER_ID.test(workspace.workspaceId)) add('NS4_E8_WORKSPACE_ID', `${path}.workspaceId`, 'Workspace id must be lower-camel.');
    if (workspaceIds.has(workspace.workspaceId)) add('NS4_E8_WORKSPACE_DUPLICATE', `${path}.workspaceId`, `Duplicate workspace ${workspace.workspaceId}.`);
    workspaceIds.add(workspace.workspaceId);
    if (!workspace.title || !workspace.description) add('NS4_E8_LABEL', path, 'Workspace title and description are required in the user language.');
    if (!workspace.hostedStepRefs.length || !workspace.useCaseIds.length) add('NS4_E8_EMPTY_WORKSPACE', path, 'A workspace must host journey steps and use cases.');
    if (workspace.anchorEntity && !entityIds.has(workspace.anchorEntity)) add('NS4_E8_ANCHOR', `${path}.anchorEntity`, `Unknown ontology entity ${workspace.anchorEntity}.`);
    workspace.profileRefs.forEach(profile => { if (!profileIds.has(profile)) add('NS4_E8_PROFILE', `${path}.profileRefs`, `Unknown E3 profile ${profile}.`); });
    workspace.hostedStepRefs.forEach(ref => { if (!sourceSteps.has(ref)) add('NS4_E8_STEP', `${path}.hostedStepRefs`, `Unknown journey step ${ref}.`); stepRefs.add(ref); });
    workspace.useCaseIds.forEach(id => { if (!sourceUseCases.has(id)) add('NS4_E8_USECASE', `${path}.useCaseIds`, `Unknown compiled use case ${id}.`); useCaseRefs.add(id); });
    workspace.pageContext.forEach(context => { if (!contexts.has(context.contextId)) add('NS4_E8_CONTEXT', `${path}.pageContext`, `Unknown context ${context.contextId}.`); });
    const scenarioIds = new Set<string>();
    workspace.scenarios.forEach((scenario, scenarioIndex) => {
      const scenarioPath = `${path}.scenarios[${scenarioIndex}]`;
      if (!MEMBER_ID.test(scenario.scenarioId)) add('NS4_E8_SCENARIO_ID', `${scenarioPath}.scenarioId`, 'Scenario id must be lower-camel.');
      if (scenarioIds.has(scenario.scenarioId)) add('NS4_E8_SCENARIO_DUPLICATE', `${scenarioPath}.scenarioId`, `Duplicate scenario ${scenario.scenarioId}.`); scenarioIds.add(scenario.scenarioId);
      if (!scenario.title || !scenario.description) add('NS4_E8_SCENARIO_LABEL', scenarioPath, 'Scenario title and description are required in the user language.');
      scenario.stepRefs.forEach(ref => { if (!workspace.hostedStepRefs.includes(ref)) add('NS4_E8_SCENARIO_STEP', `${scenarioPath}.stepRefs`, `Scenario references non-hosted step ${ref}.`); });
      scenario.useCaseIds.forEach(id => { if (!workspace.useCaseIds.includes(id)) add('NS4_E8_SCENARIO_USECASE', `${scenarioPath}.useCaseIds`, `Scenario references non-hosted use case ${id}.`); });
      if (scenario.surface === 'batchAction') {
        if (!workspace.pageContext.some(context => context.cardinality === 'many')) add('NS4_E8_BATCH_CARDINALITY', scenarioPath, 'batchAction requires a many-cardinality context.');
        if (scenario.kind === 'review') add('NS4_E8_BATCH_DECISION', scenarioPath, 'batchAction cannot apply to a decision scenario.');
        if (!scenario.surfaceJustification) add('NS4_E8_BATCH_JUSTIFICATION', scenarioPath, 'batchAction requires a one-line justification.');
      }
      if (scenario.kind === 'queue') validateQueue(scenarioPath, workspace.useCaseIds, sources, add);
    });
    if (workspace.kind === 'hub') {
      if (!workspace.anchorEntity) add('NS4_E8_HUB_ANCHOR', path, 'Hub requires an anchor entity.');
      if (!workspace.scenarios.some(scenario => scenario.kind === 'collection') || !workspace.scenarios.some(scenario => scenario.kind === 'record')) add('NS4_E8_HUB_SCENARIOS', `${path}.scenarios`, 'Hub requires collection and record scenarios.');
    }
    if (workspace.scenarios.some(scenario => ['form', 'review'].includes(scenario.kind)) && !workspace.slices.length && !workspace.pageContext.length) add('NS4_E8_DECISION_WITHOUT_CONTEXT', path, 'A command workspace must host an entity slice or receive page context.');
  });
  sourceSteps.forEach(ref => { if (!stepRefs.has(ref)) add('NS4_E8_STEP_UNHOSTED', 'workspaces', `Journey step ${ref} is not hosted by a workspace.`); });
  sourceUseCases.forEach(id => { if (!useCaseRefs.has(id)) add('NS4_E8_USECASE_UNHOSTED', 'workspaces', `Use case ${id} is not hosted by a workspace.`); });
  skeleton.menu.headerLinks.forEach(id => { if (!workspaceIds.has(id)) add('NS4_E8_HEADER_LINK', 'menu.headerLinks', `Unknown workspace ${id}.`); });
  skeleton.menu.sections.forEach((section, index) => {
    if (!section.label || !section.featureRef) add('NS4_E8_MENU_LABEL', `menu.sections[${index}]`, 'Menu section requires label and feature reference.');
    if (section.workspaceIds.length > MAX_MENU_ITEMS) add('NS4_E8_MENU_CAP', `menu.sections[${index}].workspaceIds`, `Menu section exceeds the ${MAX_MENU_ITEMS} item limit; regroup it.`);
    section.workspaceIds.forEach(id => { if (!workspaceIds.has(id)) add('NS4_E8_MENU_WORKSPACE', `menu.sections[${index}]`, `Unknown workspace ${id}.`); });
  });
  skeleton.menu.landings.forEach((landing, index) => {
    const workspace = skeleton.workspaces.find(item => item.workspaceId === landing.workspaceId);
    if (!profileIds.has(landing.profileRef) || !workspace || !workspace.scenarios.some(scenario => scenario.scenarioId === landing.scenarioId)) add('NS4_E8_LANDING', `menu.landings[${index}]`, 'Landing must resolve to an existing profile, workspace and scenario.');
    if (workspace?.pageContext.length && workspace.kind !== 'hub') add('NS4_E8_LANDING_CONTEXT', `menu.landings[${index}]`, 'A landing cannot require unresolved page context.');
  });
  const edgesByTarget = new Map<string, string[]>();
  skeleton.edges.forEach((edge, index) => {
    if (!workspaceIds.has(edge.from) || !workspaceIds.has(edge.to) || !edge.carries.length) add('NS4_E8_EDGE', `edges[${index}]`, 'Edge requires existing endpoints and carried context ids.');
    edge.carries.forEach(context => { if (!contexts.has(context)) add('NS4_E8_EDGE_CONTEXT', `edges[${index}].carries`, `Unknown carried context ${context}.`); });
    edgesByTarget.set(edge.to, [...(edgesByTarget.get(edge.to) || []), ...edge.carries]);
  });
  skeleton.workspaces.filter(workspace => workspace.pageContext.length && workspace.kind !== 'hub').forEach(workspace => {
    const carried = new Set(edgesByTarget.get(workspace.workspaceId) || []);
    const isLanding = skeleton.menu.landings.some(landing => landing.workspaceId === workspace.workspaceId);
    workspace.pageContext.filter(context => context.required && !carried.has(context.contextId)).forEach(context => {
      if (!isLanding) add('NS4_E8_PAGE_CONTEXT_COVERAGE', workspace.workspaceId, `Required page context ${context.contextId} has no candidate incoming edge.`);
    });
  });
  return { ok: issues.length === 0, issues };
}

export function validateNs4WorkspaceDetail(detail: Ns4WorkspaceDetailDraft, skeleton: Ns4E8SkeletonReview, sources: Ns4E8Sources): Ns4E8GateResult {
  const issues: Ns4E8GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const workspace = skeleton.workspaces.find(item => item.workspaceId === detail.workspaceId);
  if (!workspace) return { ok: false, issues: [{ code: 'NS4_E8_WORKSPACE_UNKNOWN', path: 'workspaceId', message: `Unknown workspace ${detail.workspaceId}.` }] };
  if (detail.moduleName !== skeleton.moduleName) add('NS4_E8_DETAIL_MODULE', 'moduleName', 'Worker output must match the frozen skeleton module.');
  if (detail.skeletonHash !== skeleton.skeletonHash) add('NS4_E8_DETAIL_HASH', 'skeletonHash', 'Worker output must preserve the frozen skeleton hash.');
  const expectedScenarios = new Set(workspace.scenarios.map(item => item.scenarioId));
  const gotScenarios = new Set(detail.scenarios.map(item => item.scenarioId));
  expectedScenarios.forEach(id => { if (!gotScenarios.has(id)) add('NS4_E8_DETAIL_SCENARIO', 'scenarios', `Missing frozen scenario ${id}.`); });
  gotScenarios.forEach(id => { if (!expectedScenarios.has(id)) add('NS4_E8_DETAIL_SCENARIO', 'scenarios', `Unknown scenario ${id}.`); });
  const fields = new Map(sources.ontology.entities.flatMap(entity => entity.fields.map(field => [`${entity.entityId}.${field.fieldId}`, field] as const)));
  const queryUseCases = new Map(sources.useCases.filter(item => item.kind === 'query').map(item => [item.useCaseId, item]));
  const grants = new Map(sources.access.grants.map(grant => [`${grant.profileRef}\u0000${grant.authorityRef}`, grant]));
  detail.scenarios.forEach((scenario, index) => {
    const target = workspace.scenarios.find(item => item.scenarioId === scenario.scenarioId); if (!target) return;
    scenario.organisms.forEach((organism, organismIndex) => {
      const path = `scenarios[${index}].organisms[${organismIndex}]`;
      if (!organism.role || !organism.fragmentRef || !organism.intent) add('NS4_E8_ORGANISM', path, 'Organism requires role, fragmentRef and localized intent.');
      const useCase = organism.sliceId ? queryUseCases.get(organism.sliceId) : undefined;
      if (organism.sliceId && !workspace.slices.some(slice => slice.sliceId === organism.sliceId)) add('NS4_E8_SLICE', `${path}.sliceId`, `Unknown frozen slice ${organism.sliceId}.`);
      organism.fieldRefs.forEach(field => {
        if (!fields.has(`${field.entityId}.${field.fieldId}`)) add('NS4_E8_FIELD', `${path}.fieldRefs`, `Unknown ontology field ${field.entityId}.${field.fieldId}.`);
        if (useCase && !useCase.entityRefs.includes(field.entityId)) add('NS4_E8_SLICE_ENTITY', `${path}.fieldRefs`, `Slice ${organism.sliceId} cannot project fields from ${field.entityId}.`);
      });
      for (const authority of target.authorityRefs) for (const profile of workspace.profileRefs) {
        const grant = grants.get(`${profile}\u0000${authority}`);
        if (grant?.disclosure.mode === 'fieldsOnly') organism.fieldRefs.forEach(field => {
          const allowed = new Set(grant.disclosure.allowedInformation);
          if (!allowed.has(field.fieldId) && !allowed.has(`${field.entityId}.${field.fieldId}`)) add('NS4_E8_DISCLOSURE', `${path}.fieldRefs`, `${profile} fieldsOnly disclosure does not allow ${field.entityId}.${field.fieldId}.`);
        });
      }
    });
    scenario.commandInputs.forEach((command, commandIndex) => command.inputs.forEach((input, inputIndex) => {
      const path = `scenarios[${index}].commandInputs[${commandIndex}].inputs[${inputIndex}]`;
      if (!target.useCaseIds.includes(command.useCaseId)) add('NS4_E8_COMMAND', path, `Command ${command.useCaseId} is not hosted by scenario ${target.scenarioId}.`);
      if (input.fieldRef && !fields.has(`${input.fieldRef.entityId}.${input.fieldRef.fieldId}`)) add('NS4_E8_INPUT_FIELD', path, 'Input field must exist in the ontology.');
      if (input.source === 'pageContext' && (!input.sourceRef || !workspace.pageContext.some(context => context.contextId === input.sourceRef))) add('NS4_E8_INPUT_PAGE_CONTEXT', path, 'pageContext input must reference workspace pageContext.');
      if (input.source === 'selection' && (!input.sourceRef || !workspace.slices.some(slice => slice.sliceId === input.sourceRef))) add('NS4_E8_INPUT_SELECTION', path, 'selection input must reference a frozen slice.');
    }));
  });
  return { ok: issues.length === 0, issues };
}

function validateQueue(path: string, workspaceUseCases: string[], sources: Ns4E8Sources, add: (code: string, path: string, message: string) => void): void {
  const workflowEntities = new Set(sources.useCases.filter(useCase => workspaceUseCases.includes(useCase.useCaseId)).flatMap(useCase => useCase.entityRefs));
  const workflow = sources.workflows.find(item => workflowEntities.has(item.entityRef) && item.states.some(state => /pending|proposed|awaiting/i.test(state)));
  if (!workflow) add('NS4_E8_QUEUE', path, 'Queue is allowed only for an entity with a reachable pending-decision FSM state.');
}
