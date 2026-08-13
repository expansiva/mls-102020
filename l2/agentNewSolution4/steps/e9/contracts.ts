import { sha256Ns4 } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4E2Review, Ns4JourneyContext, Ns4JourneyStep } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import {
  NS4_NAVIGATION_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION,
  type Ns4AccessGrant, type Ns4AccessMatrixArtifact, type Ns4AccessMatrixArtifactV4, type Ns4AccessOperationAuthorityRef,
} from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4E4Review, Ns4OntologyField } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4UseCaseArtifactV3, Ns4WorkflowArtifactV2 } from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type {
  Ns4E8Edge, Ns4WorkspaceArtifact, Ns4WorkspaceContext, Ns4WorkspaceIndex, Ns4WorkspaceRoutedContext,
} from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';

export const NS4_NAVIGATION_INDEX_SCHEMA_VERSION = '2026-08-13-ns4-navigation-index-v1' as const;
export const NS4_NAVIGATION_STORE_SCHEMA_VERSION = '2026-08-13-ns4-navigation-store-v1' as const;
export const NS4_NOTIFICATION_CATALOG_SCHEMA_VERSION = '2026-08-13-ns4-notifications-v1' as const;
export const NS4_BFF_CONTRACT_SCHEMA_VERSION = '2026-08-13-ns4-bff-contract-v1' as const;

export type Ns4ContractValueType = 'string' | 'number' | 'boolean' | 'unknown';
export type Ns4BffInputSource = 'pageContext' | 'sliceParam' | 'selection' | 'userDecision' | 'actorSession';

export interface Ns4E9Warning {
  code: 'NS4_E9_FIELD_TITLE' | 'NS4_E9_JSON_UNKNOWN';
  path: string;
  message: string;
}

export interface Ns4NavigationRoute {
  routeId: string;
  workspaceId: string;
  scenarioId: string;
  routePattern: string;
  pathContextIds: string[];
  selectionContextIds: string[];
  profileRefs: string[];
  authorityRefs: string[];
  workspaceHash: string;
}

export interface Ns4NavigationIndexArtifact {
  schemaVersion: typeof NS4_NAVIGATION_INDEX_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  skeletonHash: string;
  routes: Ns4NavigationRoute[];
  edges: Ns4E8Edge[];
  warnings: Ns4E9Warning[];
  navigationHash: string;
}

export interface Ns4NavigationStoreContext {
  contextId: string;
  businessObject: string;
  idField: string;
  labelField: string;
}

export interface Ns4NavigationStoreArtifact {
  schemaVersion: typeof NS4_NAVIGATION_STORE_SCHEMA_VERSION;
  moduleName: string;
  scope: 'browserTab';
  ownership: 'urlFirst';
  hydrationRule: string;
  contexts: Ns4NavigationStoreContext[];
  routes: Array<Pick<Ns4NavigationRoute, 'routeId' | 'workspaceId' | 'scenarioId' | 'routePattern' | 'pathContextIds' | 'selectionContextIds'>>;
  skeletonHash: string;
  storeHash: string;
}

export interface Ns4NotificationEntry {
  notificationId: string;
  sourceStepRef: string;
  targetProfileRef: string;
  contextCarried: string;
  targetWorkspaceId: string;
  targetScenarioId: string;
  deepLink: string;
}

export interface Ns4NotificationCatalogArtifact {
  schemaVersion: typeof NS4_NOTIFICATION_CATALOG_SCHEMA_VERSION;
  moduleName: string;
  entries: Ns4NotificationEntry[];
  skeletonHash: string;
  notificationHash: string;
}

export interface Ns4BffFieldContract {
  inputId: string;
  valueType: Ns4ContractValueType;
  ontologyType: Ns4OntologyField['type'];
  required: boolean;
  source: Ns4BffInputSource;
  sourceRef: string;
  fieldRef: { entityId: string; fieldId: string; label: string };
}

export interface Ns4BffOutputField {
  entityId: string;
  fieldId: string;
  label: string;
  valueType: Ns4ContractValueType;
  ontologyType: Ns4OntologyField['type'];
  required: boolean;
}

export interface Ns4BffContractArtifact {
  schemaVersion: typeof NS4_BFF_CONTRACT_SCHEMA_VERSION;
  moduleName: string;
  workspaceId: string;
  functionId: string;
  operationRef: string;
  kind: 'view' | 'command';
  useCaseId?: string;
  routePattern: string;
  routePatterns: Array<{ scenarioId: string; routePattern: string }>;
  input: Ns4BffFieldContract[];
  output: {
    slices: Array<{ sliceId: string; fields: Ns4BffOutputField[] }>;
    providedContextIds: string[];
    canonicalResult: 'view' | 'accepted';
  };
  businessErrorIds: string[];
  authorityRefs: string[];
  skeletonHash: string;
  workspaceHash: string;
  contractHash: string;
}

export interface Ns4E9Sources {
  journeys: Ns4E2Review;
  access: Ns4AccessMatrixArtifact;
  ontology: Ns4E4Review;
  useCases: Ns4UseCaseArtifactV3[];
  workflows: Ns4WorkflowArtifactV2[];
  workspaceIndex: Ns4WorkspaceIndex;
  workspaces: Ns4WorkspaceArtifact[];
}

export interface Ns4E9Compilation {
  navigation: Ns4NavigationIndexArtifact;
  store: Ns4NavigationStoreArtifact;
  notifications: Ns4NotificationCatalogArtifact;
  contracts: Ns4BffContractArtifact[];
  access: Ns4AccessMatrixArtifactV4;
  notificationEdgeKeys: string[];
  diagnostics: Array<{ code: string; path: string; message: string }>;
}

export async function compileNs4E9(sources: Ns4E9Sources): Promise<Ns4E9Compilation> {
  const diagnostics: Ns4E9Compilation['diagnostics'] = [];
  const warnings: Ns4E9Warning[] = [];
  const workspaces = [...sources.workspaces].sort((left, right) => left.workspaceId.localeCompare(right.workspaceId));
  const workspaceById = new Map(workspaces.map(workspace => [workspace.workspaceId, workspace]));
  const contexts = new Map(sources.workspaceIndex.menu.contextCatalog.map(context => [context.contextId, context]));
  const fields = new Map(sources.ontology.entities.flatMap(entity => entity.fields.map(field => [`${entity.entityId}.${field.fieldId}`, field] as const)));
  const useCases = new Map(sources.useCases.map(useCase => [useCase.useCaseId, useCase]));
  const steps = collectJourneySteps(sources.journeys);
  const stepLocations = collectStepLocations(workspaces);
  const notificationDraft = compileNotifications(sources, steps, stepLocations, contexts, diagnostics);
  const notificationEdgeKeys = sources.workspaceIndex.menu.edges.filter(edge => isNotificationEdge(edge, steps, stepLocations, sources.journeys)).map(edgeKey);
  const navigationEdges = sources.workspaceIndex.menu.edges.filter(edge => !notificationEdgeKeys.includes(edgeKey(edge)))
    .map(edge => ({ ...edge, carries: [...edge.carries].sort() })).sort((left, right) => edgeKey(left).localeCompare(edgeKey(right)));
  const routes = compileRoutes(sources, workspaces, navigationEdges);
  const routeByScenario = new Map(routes.map(route => [`${route.workspaceId}\u0000${route.scenarioId}`, route]));
  const notificationEntries = notificationDraft.map(entry => {
    const route = routeByScenario.get(`${entry.targetWorkspaceId}\u0000${entry.targetScenarioId}`);
    if (!route) diagnostics.push({ code: 'NS4_E9_NOTIFICATION_ROUTE', path: entry.notificationId, message: `Notification target ${entry.targetWorkspaceId}.${entry.targetScenarioId} has no compiled route.` });
    return { ...entry, deepLink: route?.routePattern || '' };
  }).sort((left, right) => left.notificationId.localeCompare(right.notificationId));
  const notificationHash = await sha256Ns4(notificationEntries);
  const notifications: Ns4NotificationCatalogArtifact = {
    schemaVersion: NS4_NOTIFICATION_CATALOG_SCHEMA_VERSION, moduleName: sources.workspaceIndex.moduleName,
    entries: notificationEntries, skeletonHash: sources.workspaceIndex.skeletonHash, notificationHash,
  };
  const contracts: Ns4BffContractArtifact[] = [];
  for (const workspace of workspaces) {
    contracts.push(await compileViewContract(sources, workspace, routes.filter(route => route.workspaceId === workspace.workspaceId), contexts, fields, useCases, warnings, diagnostics));
    const commands = workspace.scenarios.flatMap(scenario => scenario.commandInputs.map(command => ({ scenario, command })))
      .sort((left, right) => `${left.command.useCaseId}:${left.scenario.scenarioId}`.localeCompare(`${right.command.useCaseId}:${right.scenario.scenarioId}`));
    const counts = new Map<string, number>(); commands.forEach(item => counts.set(item.command.useCaseId, (counts.get(item.command.useCaseId) || 0) + 1));
    for (const item of commands) contracts.push(await compileCommandContract(sources, workspace, item.scenario, item.command, counts.get(item.command.useCaseId)! > 1, routeByScenario, contexts, fields, useCases, warnings, diagnostics));
  }
  contracts.sort((left, right) => `${left.workspaceId}:${left.functionId}`.localeCompare(`${right.workspaceId}:${right.functionId}`));
  const operationAuthorityRefs: Ns4AccessOperationAuthorityRef[] = contracts.map(contract => ({
    operationRef: contract.operationRef, route: contract.operationRef, workspaceId: contract.workspaceId,
    functionId: contract.functionId, ...(contract.useCaseId ? { useCaseId: contract.useCaseId } : {}), authorityRefs: contract.authorityRefs,
  }));
  const priorUseCaseRefs = 'useCaseAuthorityRefs' in sources.access.realization ? sources.access.realization.useCaseAuthorityRefs : [];
  const realizationHash = await sha256Ns4({ compiledFromAccessHash: sources.access.accessHash, priorUseCaseRefs, operationAuthorityRefs });
  const access: Ns4AccessMatrixArtifactV4 = {
    ...sources.access, schemaVersion: NS4_NAVIGATION_REALIZED_ACCESS_MATRIX_SCHEMA_VERSION,
    grants: sources.access.grants.map(normalizeAccessGrant),
    realization: { status: 'navigationCompiled', compiledFromAccessHash: sources.access.accessHash,
      useCaseAuthorityRefs: priorUseCaseRefs, operationAuthorityRefs, realizationHash },
  };
  const stableWarnings = uniqueWarnings(warnings);
  const navigationValue = {
    schemaVersion: NS4_NAVIGATION_INDEX_SCHEMA_VERSION, moduleName: sources.workspaceIndex.moduleName,
    userLanguage: sources.workspaceIndex.userLanguage, skeletonHash: sources.workspaceIndex.skeletonHash,
    routes, edges: navigationEdges, warnings: stableWarnings,
  };
  const navigation: Ns4NavigationIndexArtifact = { ...navigationValue, navigationHash: await sha256Ns4(navigationValue) };
  const storeContexts = [...contexts.values()].sort((left, right) => left.contextId.localeCompare(right.contextId)).map(context => {
    const entity = sources.ontology.entities.find(item => item.entityId === context.businessObject);
    const idField = context.idFieldRef || entity?.storage.idField || '';
    const labelField = entity?.fields.find(field => /^(name|title|label|displayName)$/i.test(field.fieldId))?.fieldId
      || entity?.fields.find(field => field.fieldId !== idField && (field.type === 'string' || field.type === 'text'))?.fieldId || idField;
    return { contextId: context.contextId, businessObject: context.businessObject, idField, labelField };
  });
  const storeValue = {
    schemaVersion: NS4_NAVIGATION_STORE_SCHEMA_VERSION, moduleName: sources.workspaceIndex.moduleName,
    scope: 'browserTab' as const, ownership: 'urlFirst' as const,
    hydrationRule: 'URL path parameters own identity; this browser-tab store caches hydrated records and never overrides URL ids.',
    contexts: storeContexts, routes: routes.map(route => ({ routeId: route.routeId, workspaceId: route.workspaceId,
      scenarioId: route.scenarioId, routePattern: route.routePattern, pathContextIds: route.pathContextIds, selectionContextIds: route.selectionContextIds })),
    skeletonHash: sources.workspaceIndex.skeletonHash,
  };
  const store: Ns4NavigationStoreArtifact = { ...storeValue, storeHash: await sha256Ns4(storeValue) };
  return { navigation, store, notifications, contracts, access, notificationEdgeKeys, diagnostics };
}

function compileRoutes(sources: Ns4E9Sources, workspaces: Ns4WorkspaceArtifact[], edges: Ns4E8Edge[]): Ns4NavigationRoute[] {
  const moduleRoot = `/${lowerCamel(sources.workspaceIndex.moduleName)}`;
  const hubs = workspaces.filter(workspace => workspace.kind === 'hub').sort((left, right) => left.workspaceId.localeCompare(right.workspaceId));
  const hubBases = new Map(hubs.map(hub => [hub.workspaceId, `${moduleRoot}/${pluralize(lowerCamel(hub.anchorEntity || stripWorkspace(hub.workspaceId)))}`]));
  const workspaceBases = new Map<string, { base: string; inherited: Ns4WorkspaceRoutedContext[] }>();
  for (const workspace of workspaces) {
    if (workspace.kind === 'hub') { workspaceBases.set(workspace.workspaceId, { base: hubBases.get(workspace.workspaceId)!, inherited: [] }); continue; }
    const parentHub = hubs.find(hub => edges.some(edge => edge.from === hub.workspaceId && edge.to === workspace.workspaceId
      && edge.carries.some(contextId => hub.pageContext.some(context => context.contextId === contextId))));
    if (parentHub) {
      const inherited = parentHub.pageContext.filter(context => context.urlRole === 'path');
      workspaceBases.set(workspace.workspaceId, { base: `${hubBases.get(parentHub.workspaceId)}${contextSegments(inherited, false)}/${pluralize(lowerCamel(stripWorkspace(workspace.workspaceId)))}`, inherited });
    } else workspaceBases.set(workspace.workspaceId, { base: `${moduleRoot}/${pluralize(lowerCamel(stripWorkspace(workspace.workspaceId)))}`, inherited: [] });
  }
  const routes: Ns4NavigationRoute[] = [];
  for (const workspace of workspaces) {
    const location = workspaceBases.get(workspace.workspaceId)!;
    const workspacePath = workspace.pageContext.filter(context => context.urlRole === 'path' && !location.inherited.some(item => item.contextId === context.contextId));
    for (const scenario of workspace.scenarios) {
      let routePattern = `${location.base}${contextSegments(workspacePath, false)}`;
      if (workspace.kind === 'hub' && scenario.kind === 'collection') routePattern = location.base;
      else if (workspace.kind === 'hub' && scenario.kind === 'record') routePattern = `${location.base}${contextSegments(workspace.pageContext.filter(context => context.urlRole === 'path'), false)}`;
      else if (scenario.kind !== 'collection' && scenario.kind !== 'record') routePattern += `/${scenarioSlug(scenario.scenarioId, scenario.kind)}${contextSegments(scenario.selectionContexts.filter(context => context.urlRole === 'path'), true)}`;
      routes.push({ routeId: `${workspace.workspaceId}.${scenario.scenarioId}`, workspaceId: workspace.workspaceId, scenarioId: scenario.scenarioId,
        routePattern, pathContextIds: unique([...location.inherited.map(context => context.contextId), ...workspacePath.map(context => context.contextId),
          ...scenario.selectionContexts.filter(context => context.urlRole === 'path').map(context => context.contextId)]),
        selectionContextIds: scenario.selectionContexts.filter(context => context.urlRole === 'selection').map(context => context.contextId).sort(),
        profileRefs: [...workspace.profileRefs].sort(), authorityRefs: [...scenario.authorityRefs].sort(), workspaceHash: workspace.workspaceHash });
    }
  }
  return routes.sort((left, right) => left.routeId.localeCompare(right.routeId));
}

async function compileViewContract(
  sources: Ns4E9Sources, workspace: Ns4WorkspaceArtifact, routes: Ns4NavigationRoute[], contexts: Map<string, Ns4WorkspaceContext>,
  fields: Map<string, Ns4OntologyField>, useCases: Map<string, Ns4UseCaseArtifactV3>, warnings: Ns4E9Warning[], diagnostics: Ns4E9Compilation['diagnostics'],
): Promise<Ns4BffContractArtifact> {
  const input = workspace.pageContext.map(context => fieldInput(context.contextId, 'pageContext', context.contextId, context, fields, warnings, diagnostics, `${workspace.workspaceId}.view`));
  for (const slice of workspace.viewCall.uses) {
    const useCase = useCases.get(slice.useCaseId);
    for (const contextId of useCase?.contexts.requires || []) {
      if (input.some(item => item.inputId === contextId)) continue;
      input.push(fieldInput(contextId, 'sliceParam', slice.sliceId, contexts.get(contextId), fields, warnings, diagnostics, `${workspace.workspaceId}.view.${slice.sliceId}`));
    }
  }
  const outputSlices = workspace.viewCall.uses.map(slice => {
    const refs = workspace.scenarios.flatMap(scenario => scenario.organisms.filter(organism => organism.sliceId === slice.sliceId).flatMap(organism => organism.fieldRefs));
    return { sliceId: slice.sliceId, fields: uniqueFieldRefs(refs).map(ref => outputField(ref, fields, warnings, diagnostics, `${workspace.workspaceId}.view.${slice.sliceId}`)) };
  });
  const authorityRefs = unique(workspace.scenarios.flatMap(scenario => scenario.authorityRefs));
  const primary = routes.find(route => workspace.kind === 'hub' ? route.scenarioId === 'record' : true) || routes[0];
  return finalizeContract({ schemaVersion: NS4_BFF_CONTRACT_SCHEMA_VERSION, moduleName: sources.workspaceIndex.moduleName,
    workspaceId: workspace.workspaceId, functionId: 'view', operationRef: `${sources.workspaceIndex.moduleName}.${workspace.workspaceId}.view`, kind: 'view',
    routePattern: primary?.routePattern || '', routePatterns: routes.map(route => ({ scenarioId: route.scenarioId, routePattern: route.routePattern })),
    input: input.sort((left, right) => left.inputId.localeCompare(right.inputId)), output: { slices: outputSlices, providedContextIds: [], canonicalResult: 'view' },
    businessErrorIds: [], authorityRefs, skeletonHash: sources.workspaceIndex.skeletonHash, workspaceHash: workspace.workspaceHash });
}

async function compileCommandContract(
  sources: Ns4E9Sources, workspace: Ns4WorkspaceArtifact, scenario: Ns4WorkspaceArtifact['scenarios'][number], command: Ns4WorkspaceArtifact['scenarios'][number]['commandInputs'][number], duplicate: boolean,
  routeByScenario: Map<string, Ns4NavigationRoute>, contexts: Map<string, Ns4WorkspaceContext>, fields: Map<string, Ns4OntologyField>,
  useCases: Map<string, Ns4UseCaseArtifactV3>, warnings: Ns4E9Warning[], diagnostics: Ns4E9Compilation['diagnostics'],
): Promise<Ns4BffContractArtifact> {
  const useCase = useCases.get(command.useCaseId);
  if (!useCase) diagnostics.push({ code: 'NS4_E9_COMMAND_USECASE', path: `${workspace.workspaceId}.${scenario.scenarioId}`, message: `Command ${command.useCaseId} is not an approved E7 use case.` });
  const functionId = duplicate ? `${command.useCaseId}${upperCamel(scenario.scenarioId)}` : command.useCaseId;
  const input = command.inputs.map(item => {
    const context = contexts.get(item.sourceRef || item.inputId);
    return fieldInput(item.inputId, item.source, item.sourceRef || '', context, fields, warnings, diagnostics, `${workspace.workspaceId}.${functionId}`, item.fieldRef);
  }).sort((left, right) => left.inputId.localeCompare(right.inputId));
  const route = routeByScenario.get(`${workspace.workspaceId}\u0000${scenario.scenarioId}`);
  const errorIds = (useCase?.useRules || []).map(ruleId => `${ruleId}Violation`).sort();
  return finalizeContract({ schemaVersion: NS4_BFF_CONTRACT_SCHEMA_VERSION, moduleName: sources.workspaceIndex.moduleName,
    workspaceId: workspace.workspaceId, functionId, operationRef: `${sources.workspaceIndex.moduleName}.${workspace.workspaceId}.${functionId}`,
    kind: 'command', useCaseId: command.useCaseId, routePattern: route?.routePattern || '', routePatterns: route ? [{ scenarioId: scenario.scenarioId, routePattern: route.routePattern }] : [],
    input, output: { slices: [], providedContextIds: [...(useCase?.contexts.provides || [])].sort(), canonicalResult: 'accepted' }, businessErrorIds: errorIds,
    authorityRefs: [...scenario.authorityRefs].sort(), skeletonHash: sources.workspaceIndex.skeletonHash, workspaceHash: workspace.workspaceHash });
}

async function finalizeContract(value: Omit<Ns4BffContractArtifact, 'contractHash'>): Promise<Ns4BffContractArtifact> {
  return { ...value, contractHash: await sha256Ns4(value) };
}

function fieldInput(
  inputId: string, source: Ns4BffInputSource, sourceRef: string, context: Ns4WorkspaceContext | undefined,
  fields: Map<string, Ns4OntologyField>, warnings: Ns4E9Warning[], diagnostics: Ns4E9Compilation['diagnostics'], path: string,
  explicitRef?: { entityId: string; fieldId: string; label: string },
): Ns4BffFieldContract {
  const entityId = explicitRef?.entityId || context?.businessObject || '';
  const fieldId = explicitRef?.fieldId || context?.idFieldRef || '';
  const field = fields.get(`${entityId}.${fieldId}`);
  if (!field) diagnostics.push({ code: 'NS4_E9_FIELD_REF', path: `${path}.${inputId}`, message: `Input ${inputId} has no resolvable ontology fieldRef (${entityId}.${fieldId}).` });
  const safeField = field || fallbackField(fieldId);
  if (field?.type === 'json') warnings.push({ code: 'NS4_E9_JSON_UNKNOWN', path: `${path}.${inputId}`, message: `JSON field ${entityId}.${fieldId} is emitted as unknown until its ontology shape is refined.` });
  return { inputId, valueType: valueType(safeField.type), ontologyType: safeField.type, required: context?.required ?? safeField.required,
    source, sourceRef, fieldRef: { entityId, fieldId, label: resolveLabel(explicitRef?.label || '', safeField, warnings, `${path}.${inputId}`) } };
}

function outputField(ref: { entityId: string; fieldId: string; label: string }, fields: Map<string, Ns4OntologyField>, warnings: Ns4E9Warning[], diagnostics: Ns4E9Compilation['diagnostics'], path: string): Ns4BffOutputField {
  const field = fields.get(`${ref.entityId}.${ref.fieldId}`);
  if (!field) diagnostics.push({ code: 'NS4_E9_FIELD_REF', path: `${path}.${ref.entityId}.${ref.fieldId}`, message: `Output field ${ref.entityId}.${ref.fieldId} is absent from E4.` });
  const safeField = field || fallbackField(ref.fieldId);
  if (field?.type === 'json') warnings.push({ code: 'NS4_E9_JSON_UNKNOWN', path: `${path}.${ref.entityId}.${ref.fieldId}`, message: `JSON field ${ref.entityId}.${ref.fieldId} is emitted as unknown until its ontology shape is refined.` });
  return { entityId: ref.entityId, fieldId: ref.fieldId, label: resolveLabel(ref.label, safeField, warnings, `${path}.${ref.entityId}.${ref.fieldId}`),
    valueType: valueType(safeField.type), ontologyType: safeField.type, required: safeField.required };
}

function resolveLabel(label: string, field: Ns4OntologyField, warnings: Ns4E9Warning[], path: string): string {
  if (label.trim()) return label.trim();
  if (field.title.trim()) return field.title.trim();
  warnings.push({ code: 'NS4_E9_FIELD_TITLE', path, message: `Ontology field ${field.fieldId} has no localized title; fieldId is used as the contract label.` });
  return field.fieldId;
}

function valueType(type: Ns4OntologyField['type']): Ns4ContractValueType {
  if (type === 'number' || type === 'integer' || type === 'money') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'json') return 'unknown';
  return 'string';
}

function compileNotifications(
  sources: Ns4E9Sources, steps: Map<string, JourneyStepInfo>, locations: Map<string, StepLocation>, contexts: Map<string, Ns4WorkspaceContext>, diagnostics: Ns4E9Compilation['diagnostics'],
): Omit<Ns4NotificationEntry, 'deepLink'>[] {
  const entries: Omit<Ns4NotificationEntry, 'deepLink'>[] = [];
  const profilesByActor = new Map<string, string[]>();
  sources.access.profiles.forEach(profile => profile.actorRefs.forEach(actor => profilesByActor.set(actor, unique([...(profilesByActor.get(actor) || []), profile.profileId]))));
  const handoffs = [...steps.values()].filter(info => info.step.kind === 'handoff');
  const eventJourneys = sources.journeys.journeys.filter(journey => journey.business.entry.mode === 'eventDriven');
  for (const targetJourney of eventJourneys) {
    const declared = new Set([...targetJourney.business.entry.carries.map(context => context.contextId), ...(targetJourney.business.prerequisites || []).flatMap(item => item.providesContext)]);
    for (const targetStep of targetJourney.business.steps) for (const contextId of targetStep.requiresContext.filter(id => declared.has(id))) {
      const prerequisiteIds = new Set((targetJourney.business.prerequisites || []).map(item => item.journeyRef));
      const providers = handoffs.filter(provider => provider.step.providesContext.some(context => context.contextId === contextId)
        && (!prerequisiteIds.size || prerequisiteIds.has(provider.journeyId)));
      const targetRef = `${targetJourney.journeyId}.${targetStep.stepId}`; const location = locations.get(targetRef);
      if (!location) { diagnostics.push({ code: 'NS4_E9_NOTIFICATION_TARGET', path: targetRef, message: `Event-driven step ${targetRef} is not hosted by an E8 scenario.` }); continue; }
      const targetProfiles = (profilesByActor.get(targetJourney.business.actorRef) || []).filter(profile => location.profileRefs.includes(profile));
      if (!providers.length || !targetProfiles.length || !contexts.has(contextId)) {
        diagnostics.push({ code: 'NS4_E9_NOTIFICATION_TARGET', path: targetRef, message: `Event-driven context ${contextId} needs a handoff provider, target profile and catalog entry.` });
        continue;
      }
      for (const provider of providers) for (const targetProfileRef of targetProfiles) entries.push({
        notificationId: `${provider.stepRef}.${targetProfileRef}.${contextId}`,
        sourceStepRef: provider.stepRef, targetProfileRef, contextCarried: contextId,
        targetWorkspaceId: location.workspaceId, targetScenarioId: location.scenarioId,
      });
    }
  }
  for (const handoff of handoffs) if (!entries.some(entry => entry.sourceStepRef === handoff.stepRef)) diagnostics.push({
    code: 'NS4_E9_NOTIFICATION_TARGET', path: handoff.stepRef, message: `Handoff ${handoff.stepRef} has no event-driven receiver and cannot produce a notification contract.`,
  });
  return uniqueBy(entries, entry => entry.notificationId);
}

interface JourneyStepInfo { journeyId: string; stepRef: string; step: Ns4JourneyStep; actorRef: string; }
interface StepLocation { workspaceId: string; scenarioId: string; profileRefs: string[]; authorityRefs: string[]; }
function collectJourneySteps(journeys: Ns4E2Review): Map<string, JourneyStepInfo> {
  return new Map(journeys.journeys.flatMap(journey => journey.business.steps.map(step => {
    const stepRef = `${journey.journeyId}.${step.stepId}`; return [stepRef, { journeyId: journey.journeyId, stepRef, step, actorRef: journey.business.actorRef }] as const;
  })));
}
function collectStepLocations(workspaces: Ns4WorkspaceArtifact[]): Map<string, StepLocation> {
  const result = new Map<string, StepLocation>();
  workspaces.forEach(workspace => workspace.scenarios.forEach(scenario => scenario.stepRefs.forEach(stepRef => result.set(stepRef, {
    workspaceId: workspace.workspaceId, scenarioId: scenario.scenarioId, profileRefs: workspace.profileRefs, authorityRefs: scenario.authorityRefs,
  }))));
  return result;
}
function isNotificationEdge(edge: Ns4E8Edge, steps: Map<string, JourneyStepInfo>, locations: Map<string, StepLocation>, journeys: Ns4E2Review): boolean {
  const provider = edge.preferredFromJourneyRef ? steps.get(edge.preferredFromJourneyRef) : undefined;
  if (provider?.step.kind === 'handoff') return true;
  return [...steps.values()].some(target => locations.get(target.stepRef)?.workspaceId === edge.to
    && journeys.journeys.find(journey => journey.journeyId === target.journeyId)?.business.entry.mode === 'eventDriven'
    && target.step.requiresContext.some(contextId => edge.carries.includes(contextId)));
}
function contextSegments(contexts: Ns4WorkspaceRoutedContext[], optional: boolean): string {
  return contexts.map(context => `/:${context.idFieldRef || `${lowerCamel(context.businessObject)}Id`}${optional ? '?' : ''}`).join('');
}
function scenarioSlug(scenarioId: string, kind: string): string { const stripped = scenarioId.replace(new RegExp(`^${kind}`, 'i'), ''); return lowerCamel(stripped || scenarioId); }
function stripWorkspace(value: string): string { return value.replace(/Workspace$/, '') || value; }
function pluralize(value: string): string { if (/s$/i.test(value)) return value; if (/[^aeiou]y$/i.test(value)) return value.slice(0, -1) + 'ies'; return value + 's'; }
function edgeKey(edge: Ns4E8Edge): string { return `${edge.from}:${edge.to}:${[...edge.carries].sort().join(',')}`; }
function unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))].sort(); }
function uniqueBy<T>(values: T[], key: (value: T) => string): T[] { return [...new Map(values.map(value => [key(value), value])).values()].sort((left, right) => key(left).localeCompare(key(right))); }
function uniqueFieldRefs<T extends { entityId: string; fieldId: string }>(values: T[]): T[] { return uniqueBy(values, value => `${value.entityId}.${value.fieldId}`); }
function uniqueWarnings(values: Ns4E9Warning[]): Ns4E9Warning[] { return uniqueBy(values, value => `${value.code}:${value.path}`); }
function lowerCamel(value: string): string { return value ? value.slice(0, 1).toLowerCase() + value.slice(1) : 'item'; }
function upperCamel(value: string): string { return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : 'Item'; }
function fallbackField(fieldId: string): Ns4OntologyField { return { fieldId, title: '', type: 'json', required: true, description: '', constraints: [] }; }
function normalizeAccessGrant(grant: Ns4AccessMatrixArtifact['grants'][number]): Ns4AccessGrant {
  if ('useRules' in grant) return { ...grant, useRules: [...grant.useRules] };
  const { constraints: _legacyConstraints, ...current } = grant;
  return { ...current, useRules: [] };
}
