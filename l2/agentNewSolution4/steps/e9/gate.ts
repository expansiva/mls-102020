import type { Ns4E9Compilation, Ns4E9IssueOrigin, Ns4E9Sources } from '/_102020_/l2/agentNewSolution4/steps/e9/contracts.js';
import type { Ns4JourneyStep } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4WorkspaceArtifact } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import { routeOf } from '/_102020_/l2/agentNewSolution4/helpers/routeOf.js';

export interface Ns4E9GateIssue { code: string; path: string; message: string; origin: Ns4E9IssueOrigin; }
export interface Ns4E9GateResult { ok: boolean; issues: Ns4E9GateIssue[]; }

export function validateNs4E9(sources: Ns4E9Sources, compilation: Ns4E9Compilation): Ns4E9GateResult {
  const issues: Ns4E9GateIssue[] = [...compilation.diagnostics];
  const add = (origin: Ns4E9IssueOrigin) => (code: string, path: string, message: string) => issues.push({ code, path, message, origin });
  const skeleton = add('skeleton'); const compiler = add('compiler');
  const moduleName = sources.workspaceIndex.moduleName;
  if (!moduleName || sources.journeys.moduleName !== moduleName || sources.access.moduleName !== moduleName || sources.ontology.moduleName !== moduleName
    || sources.workspaces.some(workspace => workspace.moduleName !== moduleName) || sources.useCases.some(useCase => useCase.moduleName !== moduleName)
    || sources.workflows.some(workflow => workflow.moduleName !== moduleName)) skeleton('NS4_E9_MODULE', 'moduleName', 'Every E2-E8 source must belong to the workspace-index module.');
  const workspaceById = new Map(sources.workspaces.map(workspace => [workspace.workspaceId, workspace]));
  const indexById = new Map(sources.workspaceIndex.workspaces.map(workspace => [workspace.workspaceId, workspace]));
  if (workspaceById.size !== indexById.size) skeleton('NS4_E9_WORKSPACE_SET', 'workspaces', 'Workspace index and permanent workspace artifact sets differ.');
  for (const [workspaceId, indexed] of indexById) {
    const workspace = workspaceById.get(workspaceId);
    if (!workspace || workspace.workspaceHash !== indexed.workspaceHash || workspace.skeletonHash !== sources.workspaceIndex.skeletonHash) skeleton('NS4_E9_WORKSPACE_HASH', workspaceId, `Workspace ${workspaceId} does not match the approved index hashes.`);
  }
  const contextById = new Map(sources.workspaceIndex.menu.contextCatalog.map(context => [context.contextId, context]));
  const notificationTargets = new Map<string, Set<string>>();
  compilation.notifications.entries.forEach(entry => notificationTargets.set(entry.targetWorkspaceId,
    new Set([...(notificationTargets.get(entry.targetWorkspaceId) || []), entry.contextCarried])));
  for (const workspace of sources.workspaces) validateWorkspaceContexts(workspace, sources, compilation, contextById, notificationTargets, skeleton);
  validateEdges(sources, compilation, contextById, workspaceById, skeleton);
  validateJourneyReachability(sources, compilation, workspaceById, skeleton);
  validateQueues(sources, skeleton);
  validateRoutesAndNotifications(sources, compilation, workspaceById, compiler);
  validateContractsAndAccess(sources, compilation, compiler);
  return { ok: issues.length === 0, issues: uniqueIssues(issues) };
}

function validateWorkspaceContexts(
  workspace: Ns4WorkspaceArtifact, sources: Ns4E9Sources, compilation: Ns4E9Compilation,
  contexts: Map<string, { contextId: string; businessObject: string; idFieldRef?: string }>,
  notificationTargets: Map<string, Set<string>>, add: (code: string, path: string, message: string) => void,
): void {
  const incoming = compilation.navigation.edges.filter(edge => edge.to === workspace.workspaceId);
  const candidates = incoming.map(edge => `${edge.from}[${edge.carries.join(',')}]`).sort();
  workspace.pageContext.forEach(context => {
    const path = `${workspace.workspaceId}.pageContext.${context.contextId}`;
    if (!contexts.has(context.contextId)) add('NS4_E9_CONTEXT_UNKNOWN', path, `Context ${context.contextId} is absent from the E8 catalog.`);
    const isHubAnchor = workspace.kind === 'hub' && context.businessObject === workspace.anchorEntity;
    const fromEdge = incoming.some(edge => edge.carries.includes(context.contextId));
    const fromNotification = notificationTargets.get(workspace.workspaceId)?.has(context.contextId) === true;
    if (!isHubAnchor && !fromEdge && !fromNotification) add('NS4_E9_PAGE_CONTEXT_ORPHAN', path,
      `Path context ${context.contextId} has no hub anchor, notification or incoming provider edge. Candidate incoming edges: ${candidates.join('; ') || 'none'}.`);
  });
  workspace.scenarios.forEach(scenario => scenario.selectionContexts.forEach(context => {
    const path = `${workspace.workspaceId}.${scenario.scenarioId}.selectionContexts.${context.contextId}`;
    if (!contexts.has(context.contextId)) add('NS4_E9_CONTEXT_UNKNOWN', path, `Context ${context.contextId} is absent from the E8 catalog.`);
    const slice = workspace.viewCall.uses.some(item => item.entityRefs.includes(context.businessObject));
    const formInput = scenario.kind === 'form' && scenario.commandInputs.some(command => command.inputs.some(input => input.inputId === context.contextId || input.sourceRef === context.contextId));
    const actorSession = hasActorSessionSource(workspace, scenario.stepRefs, context.contextId, sources);
    const routeTarget = compilation.navigation.routes.find(route => route.workspaceId === workspace.workspaceId && route.scenarioId === scenario.scenarioId)?.pathContextIds.includes(context.contextId);
    if (context.required && !slice && !formInput && !actorSession && !routeTarget) add('NS4_E9_SELECTION_ORPHAN', path, `Required context ${context.contextId} in scenario ${scenario.scenarioId} has no slice, picker/form input, actor session or unique route target.`);
  }));
}

function validateEdges(
  sources: Ns4E9Sources, compilation: Ns4E9Compilation, contexts: Map<string, { businessObject: string }>,
  workspaces: Map<string, Ns4WorkspaceArtifact>, add: (code: string, path: string, message: string) => void,
): void {
  const useCaseById = new Map(sources.useCases.map(useCase => [useCase.useCaseId, useCase]));
  const journeySteps = new Map<string, Ns4JourneyStep>(sources.journeys.journeys.flatMap(journey => journey.business.steps.map(step => [`${journey.journeyId}.${step.stepId}`, step] as const)));
  compilation.navigation.edges.forEach((edge, index) => {
    const from = workspaces.get(edge.from); const to = workspaces.get(edge.to); const path = `edges[${index}]`;
    if (!from || !to) { add('NS4_E9_EDGE_ENDPOINT', path, `Navigation edge ${edge.from} → ${edge.to} has an unknown endpoint.`); return; }
    const sharedProfiles = from.profileRefs.filter(profile => to.profileRefs.includes(profile));
    if (!sharedProfiles.length) add('NS4_E9_EDGE_ACTOR', path, `Navigation edge ${edge.from} → ${edge.to} has no shared profile.`);
    edge.carries.forEach(contextId => {
      const context = contexts.get(contextId);
      const bySlice = !!context && from.viewCall.uses.some(slice => slice.entityRefs.includes(context.businessObject));
      const bySelection = from.scenarios.some(scenario => scenario.selectionContexts.some(item => item.contextId === contextId));
      const byUseCase = from.scenarios.flatMap(scenario => scenario.useCaseIds).some(useCaseId => useCaseById.get(useCaseId)?.contexts.provides.includes(contextId));
      const byPreferredStep = !!edge.preferredFromJourneyRef && journeySteps.get(edge.preferredFromJourneyRef)?.providesContext.some(item => item.contextId === contextId);
      if (!context || (!bySlice && !bySelection && !byUseCase && !byPreferredStep)) add('NS4_E9_EDGE_PROVIDER', `${path}.carries.${contextId}`, `Source workspace ${edge.from} does not produce carried context ${contextId}.`);
    });
  });
}

function validateJourneyReachability(
  sources: Ns4E9Sources, compilation: Ns4E9Compilation, workspaces: Map<string, Ns4WorkspaceArtifact>,
  add: (code: string, path: string, message: string) => void,
): void {
  const locations = new Map<string, { workspaceId: string; scenarioId: string; authorityRefs: string[] }>();
  sources.workspaces.forEach(workspace => workspace.scenarios.forEach(scenario => scenario.stepRefs.forEach(stepRef => locations.set(stepRef, {
    workspaceId: workspace.workspaceId, scenarioId: scenario.scenarioId, authorityRefs: scenario.authorityRefs,
  }))));
  const profilesByActor = new Map<string, string[]>();
  sources.access.profiles.forEach(profile => profile.actorRefs.forEach(actor => profilesByActor.set(actor, unique([...(profilesByActor.get(actor) || []), profile.profileId]))));
  const authoritiesByProfile = new Map<string, string[]>();
  sources.access.grants.forEach(grant => authoritiesByProfile.set(grant.profileRef, unique([...(authoritiesByProfile.get(grant.profileRef) || []), grant.authorityRef])));
  const startsByProfile = new Map<string, Set<string>>();
  sources.access.profiles.forEach(profile => {
    const direct = sources.workspaceIndex.menu.headerLinks.filter(id => workspaces.get(id)?.profileRefs.includes(profile.profileId));
    const landings = sources.workspaceIndex.menu.landings.filter(item => item.profileRef === profile.profileId).map(item => item.workspaceId);
    const notifications = compilation.notifications.entries.filter(item => item.targetProfileRef === profile.profileId).map(item => item.targetWorkspaceId);
    startsByProfile.set(profile.profileId, new Set([...direct, ...landings, ...notifications]));
  });
  for (const journey of sources.journeys.journeys) {
    const profiles = profilesByActor.get(journey.business.actorRef) || [];
    if (!profiles.length) { add('NS4_E9_JOURNEY_ACTOR', journey.journeyId, `Journey actor ${journey.business.actorRef} has no E3 profile.`); continue; }
    let previous: { workspaceId: string; stepRef: string } | null = null;
    for (const step of journey.business.steps) {
      const stepRef = `${journey.journeyId}.${step.stepId}`; const location = locations.get(stepRef);
      if (!location) { add('NS4_E9_JOURNEY_STEP', stepRef, `Journey step ${stepRef} is not hosted by any workspace scenario.`); continue; }
      const actorProfiles = profiles.filter(profile => workspaces.get(location.workspaceId)?.profileRefs.includes(profile));
      const authorized = actorProfiles.some(profile => location.authorityRefs.some(authority => authoritiesByProfile.get(profile)?.includes(authority)));
      if (!authorized) add('NS4_E9_JOURNEY_AUTHORITY', stepRef, `Journey step ${stepRef} is not reachable under an authority granted to actor ${journey.business.actorRef}.`);
      if (!previous) {
        const starts = actorProfiles.some(profile => startsByProfile.get(profile)?.has(location.workspaceId));
        if (!starts) add('NS4_E9_JOURNEY_START', stepRef, `Journey ${journey.journeyId} cannot start at ${location.workspaceId} from an actor landing, header or notification.`);
      } else if (previous.workspaceId !== location.workspaceId) {
        const independentLocate = step.kind === 'locate' && step.requiresContext.length === 0
          && actorProfiles.some(profile => startsByProfile.get(profile)?.has(location.workspaceId));
        const traversable = compilation.navigation.edges.some(edge => edge.from === previous!.workspaceId && edge.to === location.workspaceId
          && actorProfiles.some(profile => workspaces.get(edge.from)?.profileRefs.includes(profile) && workspaces.get(edge.to)?.profileRefs.includes(profile)));
        if (!independentLocate && !traversable) add('NS4_E9_JOURNEY_PATH', stepRef, `Missing actor-traversable edge ${previous.workspaceId} → ${location.workspaceId} before ${stepRef}.`);
      }
      previous = { workspaceId: location.workspaceId, stepRef };
    }
  }
}

function validateQueues(sources: Ns4E9Sources, add: (code: string, path: string, message: string) => void): void {
  const useCases = new Map(sources.useCases.map(useCase => [useCase.useCaseId, useCase]));
  sources.workspaces.forEach(workspace => workspace.scenarios.filter(scenario => scenario.kind === 'queue').forEach(scenario => {
    const entities = new Set(workspace.scenarios.flatMap(item => item.useCaseIds).flatMap(useCaseId => useCases.get(useCaseId)?.entityRefs || []));
    const workflow = sources.workflows.find(item => entities.has(item.entityRef) && item.states.some(state => /pending|proposed|awaiting/i.test(state)));
    if (!workflow) add('NS4_E9_QUEUE_WORKFLOW', `${workspace.workspaceId}.${scenario.scenarioId}`, 'Queue scenario has no pending state in the compiled E7 workflow set.');
  }));
}

function validateRoutesAndNotifications(
  sources: Ns4E9Sources, compilation: Ns4E9Compilation, workspaces: Map<string, Ns4WorkspaceArtifact>,
  add: (code: string, path: string, message: string) => void,
): void {
  const expectedRoutes = sources.workspaces.reduce((total, workspace) => total + workspace.scenarios.length, 0);
  if (compilation.navigation.routes.length !== expectedRoutes) add('NS4_E9_ROUTE_COVERAGE', 'navigation.routes', `Expected ${expectedRoutes} workspace/scenario routes, got ${compilation.navigation.routes.length}.`);
  const patterns = new Set<string>();
  compilation.navigation.routes.forEach(route => {
    const workspace = workspaces.get(route.workspaceId); const scenario = workspace?.scenarios.find(item => item.scenarioId === route.scenarioId);
    if (!workspace || !scenario || !route.routePattern.startsWith(`/${sources.workspaceIndex.moduleName}/`)) add('NS4_E9_ROUTE', route.routeId, `Route ${route.routeId} does not match an approved workspace/scenario or module root.`);
    if (patterns.has(route.routePattern)) add('NS4_E9_ROUTE_DUPLICATE', route.routeId, `Duplicate route pattern ${route.routePattern}.`); patterns.add(route.routePattern);
    if (workspace && scenario) {
      const projected = routeOf(sources.workspaceIndex.moduleName, workspace, scenario, {
        workspaces: sources.workspaces, edges: sources.workspaceIndex.menu.edges, useCases: sources.useCases,
      });
      if (route.routePattern !== projected.routePattern || route.pathContextIds.join('\u0000') !== projected.pathContextIds.join('\u0000')) {
        add('NS4_E9_ROUTE_PROJECTION', route.routeId, `Route ${route.routePattern} differs from the shared structural projection ${projected.routePattern}.`);
      }
    }
  });
  compilation.notifications.entries.forEach(entry => {
    const route = compilation.navigation.routes.find(item => item.workspaceId === entry.targetWorkspaceId && item.scenarioId === entry.targetScenarioId);
    if (!route || route.routePattern !== entry.deepLink || !route.pathContextIds.includes(entry.contextCarried)) add('NS4_E9_NOTIFICATION_DEEP_LINK', entry.notificationId, `Notification ${entry.notificationId} does not target a route owning context ${entry.contextCarried}.`);
  });
  const emittedEdges = new Set(compilation.navigation.edges.map(edge => `${edge.from}:${edge.to}:${[...edge.carries].sort().join(',')}`));
  compilation.notificationEdgeKeys.forEach(key => { if (emittedEdges.has(key)) add('NS4_E9_NOTIFICATION_EDGE', key, 'Handoff/event delivery must be emitted as a notification, not a navigation edge.'); });
}

function hasActorSessionSource(workspace: Ns4WorkspaceArtifact, stepRefs: string[], contextId: string, sources: Ns4E9Sources): boolean {
  const scoped = sources.access.grants.some(grant => workspace.profileRefs.includes(grant.profileRef)
    && (grant.dataScope?.mode === 'own' || grant.dataScope?.mode === 'assigned' || grant.dataScope?.mode === 'related'));
  return scoped && sources.journeys.journeys.some(journey => journey.business.entry.mode === 'eventDriven'
    && journey.business.entry.carries.some(context => context.contextId === contextId)
    && stepRefs.some(stepRef => stepRef.startsWith(`${journey.journeyId}.`)));
}

function validateContractsAndAccess(sources: Ns4E9Sources, compilation: Ns4E9Compilation, add: (code: string, path: string, message: string) => void): void {
  sources.workspaces.forEach(workspace => {
    const workspaceContracts = compilation.contracts.filter(contract => contract.workspaceId === workspace.workspaceId);
    if (workspaceContracts.filter(contract => contract.kind === 'view').length !== 1) add('NS4_E9_VIEW_CONTRACT', workspace.workspaceId, 'Every workspace must emit exactly one composed view contract.');
    const commandCount = workspace.scenarios.reduce((total, scenario) => total + scenario.commandInputs.length, 0);
    if (workspaceContracts.filter(contract => contract.kind === 'command').length !== commandCount) add('NS4_E9_COMMAND_CONTRACT', workspace.workspaceId, `Expected ${commandCount} command contracts.`);
  });
  const operationRefs = new Set<string>();
  compilation.contracts.forEach(contract => {
    if (contract.skeletonHash !== sources.workspaceIndex.skeletonHash || contract.workspaceHash !== sources.workspaceIndex.workspaces.find(item => item.workspaceId === contract.workspaceId)?.workspaceHash) add('NS4_E9_CONTRACT_HASH', contract.operationRef, 'Contract source hashes do not match approved E8 artifacts.');
    if (!contract.routePattern || operationRefs.has(contract.operationRef)) add('NS4_E9_OPERATION', contract.operationRef, 'Operation refs must be unique and route-backed.'); operationRefs.add(contract.operationRef);
    contract.input.forEach(input => {
      if (input.kind === 'data' && (!input.fieldRef.entityId || !input.fieldRef.fieldId || !input.fieldRef.label)) add('NS4_E9_CONTRACT_FIELD', `${contract.operationRef}.${input.inputId}`, 'Data contract input requires a resolved fieldRef and label.');
      if (input.kind === 'decision' && !input.label) add('NS4_E9_CONTRACT_FIELD', `${contract.operationRef}.${input.inputId}`, 'Decision contract input requires a deterministic label.');
    });
    contract.output.slices.flatMap(slice => slice.fields).forEach(field => { if (!field.entityId || !field.fieldId || !field.label) add('NS4_E9_CONTRACT_FIELD', `${contract.operationRef}.${field.entityId}.${field.fieldId}`, 'Contract output requires a resolved fieldRef and label.'); });
  });
  const realized = compilation.access.realization.operationAuthorityRefs;
  compilation.contracts.forEach(contract => {
    const operation = realized.find(item => item.operationRef === contract.operationRef);
    if (!operation || operation.authorityRefs.join('\u0000') !== contract.authorityRefs.join('\u0000')) add('NS4_E9_ACCESS_REALIZATION', contract.operationRef, `Operation ${contract.operationRef} is not realized with its exact scenario authorities.`);
  });
}

function unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))].sort(); }
function uniqueIssues(issues: Ns4E9GateIssue[]): Ns4E9GateIssue[] { return [...new Map(issues.map(issue => [`${issue.origin}:${issue.code}:${issue.path}:${issue.message}`, issue])).values()].sort((left, right) => `${left.origin}:${left.code}:${left.path}`.localeCompare(`${right.origin}:${right.code}:${right.path}`)); }

export function ns4E9FailureOrigin(issues: Ns4E9GateIssue[]): Ns4E9IssueOrigin {
  return issues.some(issue => issue.origin === 'compiler') ? 'compiler' : 'skeleton';
}
