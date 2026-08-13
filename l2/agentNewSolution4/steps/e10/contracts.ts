import { sha256Ns4, type Ns4JourneyIndex, type Ns4PolicyDecisionSelection } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4AccessMatrixArtifactV4 } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4OntologyIndexArtifact } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import type {
  Ns4UseCaseIndexArtifactV3, Ns4WorkflowIndexArtifactV2, Ns4WorkflowIndexArtifactV3,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4E9Sources, Ns4BffContractArtifact, Ns4NavigationIndexArtifact, Ns4NavigationStoreArtifact, Ns4NotificationCatalogArtifact } from '/_102020_/l2/agentNewSolution4/steps/e9/contracts.js';

export const NS4_E10_VALIDATION_REPORT_VERSION = '2026-08-13-ns4-e10-validation-report-v1' as const;
export const NS4_L5_TODO_FRONTEND_VERSION = '2026-08-13-ns4-todo-frontend-v1' as const;
export const NS4_L5_TODO_BACKEND_VERSION = '2026-08-13-ns4-todo-backend-v1' as const;
export const NS4_L5_PROCESS_VERSION = '2026-08-13-ns4-process-v1' as const;
export const NS4_E10_MENU_LIMIT = 7 as const;

export type Ns4E10RepairStep = 'e2-journeys' | 'e3-access-matrix' | 'e4-ontology' | 'e5-rules' | 'e6-behaviors' | 'e7-realization' | 'e8-workspaces' | 'e9-navigation-compiler';

export interface Ns4E10Sources extends Ns4E9Sources {
  journeyIndex: Ns4JourneyIndex;
  ontologyIndex: Ns4OntologyIndexArtifact;
  rules: Ns4RulesArtifact;
  useCaseIndex: Ns4UseCaseIndexArtifactV3;
  workflowIndex: Ns4WorkflowIndexArtifactV2 | Ns4WorkflowIndexArtifactV3;
  navigation: Ns4NavigationIndexArtifact;
  store: Ns4NavigationStoreArtifact;
  notifications: Ns4NotificationCatalogArtifact;
  contracts: Ns4BffContractArtifact[];
  access: Ns4AccessMatrixArtifactV4;
}

export interface Ns4E10Issue {
  code: string;
  path: string;
  message: string;
  repairStep?: Ns4E10RepairStep;
}

export interface Ns4E10CheckSummary {
  checkId: 'A1-resolution' | 'A2-journeys' | 'A3-decisions' | 'A4-disclosure' | 'A5-fsm' | 'A6-staleness' | 'A7-warnings' | 'A8-dormant-commands';
  status: 'passed' | 'failed' | 'reported';
  errorCount: number;
  warningCount: number;
  registrarCount: number;
}

export interface Ns4L5NavigationItem {
  id: string;
  label: string;
  href: string;
  description: string;
  actors: string[];
  workspaceId: string;
  scenarioId: string;
  sectionId: string;
  hub?: string;
}

export interface Ns4L5HeaderLink {
  id: string;
  label: string;
  href: string;
  actors: string[];
  manageable: true;
  hub?: string;
}

export interface Ns4L5ModuleNavigation {
  moduleId: string;
  basePath: string;
  userLanguage: string;
  navigation: Ns4L5NavigationItem[];
  headerLinks: Ns4L5HeaderLink[];
}

export interface Ns4E10ValidationReport {
  schemaVersion: typeof NS4_E10_VALIDATION_REPORT_VERSION;
  moduleName: string;
  userLanguage: string;
  finalStatus: 'passed' | 'failed';
  checks: Ns4E10CheckSummary[];
  errors: Ns4E10Issue[];
  warnings: Ns4E10Issue[];
  registrars: Ns4E10Issue[];
  policyDecisions: Ns4PolicyDecisionSelection[];
  systemDecisions: Ns4SystemDecision[];
  repairStep?: Ns4E10RepairStep;
  sourceHashes: {
    journeys: Array<{ journeyId: string; businessHash: string }>;
    accessHash: string;
    ontologyHash: string;
    rulesHash: string;
    skeletonHash: string;
    navigationHash: string;
  };
  counts: {
    journeys: number;
    workspaces: number;
    scenarios: number;
    contracts: number;
    notifications: number;
    decisions: number;
  };
  menuPreview: Ns4L5ModuleNavigation;
  reportHash: string;
}

export interface Ns4L5FrontendOwner {
  ownerType: 'workspace' | 'contract';
  ownerId: string;
  workspaceId: string;
  statusFrontend: 'toCreate';
}
export interface Ns4L5BackendOwner {
  ownerType: 'useCase';
  ownerId: string;
  statusBackend: 'toCreate';
}
export interface Ns4L5TodoFrontendArtifact {
  schemaVersion: typeof NS4_L5_TODO_FRONTEND_VERSION;
  layer: 'frontend';
  moduleName: string;
  owners: Ns4L5FrontendOwner[];
}
export interface Ns4L5TodoBackendArtifact {
  schemaVersion: typeof NS4_L5_TODO_BACKEND_VERSION;
  layer: 'backend';
  moduleName: string;
  owners: Ns4L5BackendOwner[];
}
export interface Ns4L5ProcessArtifact {
  schemaVersion: typeof NS4_L5_PROCESS_VERSION;
  moduleName: string;
  sourceHashes: Ns4E10ValidationReport['sourceHashes'];
  counts: Ns4E10ValidationReport['counts'];
  validation: { status: 'passed'; reportPath: string; reportHash: string; warningCount: number; registrarCount: number };
  next: { frontend: 'todoFrontend'; backend: 'todoBackend' };
  processHash: string;
}

export interface Ns4E10Delivery {
  config: Record<string, unknown>;
  moduleNavigation: Ns4L5ModuleNavigation;
  todoFrontend: Ns4L5TodoFrontendArtifact;
  todoBackend: Ns4L5TodoBackendArtifact;
  process: Ns4L5ProcessArtifact;
}

export interface Ns4E10ReviewEvent {
  action: 'approve' | 'requestChanges';
  moduleName: string;
  repairStep?: Ns4E10RepairStep;
  adjustment: string;
}

export function compileNs4L5ModuleNavigation(sources: Ns4E10Sources): Ns4L5ModuleNavigation {
  const workspaceById = new Map(sources.workspaces.map(workspace => [workspace.workspaceId, workspace]));
  const routes = new Map(sources.navigation.routes.map(route => [`${route.workspaceId}\u0000${route.scenarioId}`, route]));
  const features = new Map(sources.journeys.features.map(feature => [feature.featureId, new Set(feature.journeyStepRefs || [])]));
  const grants = new Map<string, Set<string>>();
  sources.access.grants.forEach(grant => grants.set(grant.profileRef, new Set([...(grants.get(grant.profileRef) || []), grant.authorityRef])));
  const navigation: Ns4L5NavigationItem[] = [];
  sources.workspaceIndex.menu.sections.forEach(section => section.items.forEach((item, itemIndex) => {
    const workspace = workspaceById.get(item.workspaceId); if (!workspace) return;
    const featureSteps = features.get(section.featureRef) || new Set<string>();
    const matching = workspace.scenarios.filter(scenario => scenario.stepRefs.some(stepRef => featureSteps.has(stepRef)));
    const candidates = item.hub ? (matching.filter(scenario => scenario.kind !== 'collection').length
      ? matching.filter(scenario => scenario.kind !== 'collection') : workspace.scenarios.filter(scenario => scenario.kind !== 'collection')) : matching;
    const scenario = [...(candidates.length ? candidates : workspace.scenarios)].sort((left, right) => scenarioRank(left.kind, !!item.hub) - scenarioRank(right.kind, !!item.hub)
      || left.scenarioId.localeCompare(right.scenarioId))[0];
    if (!scenario) return;
    const route = routes.get(`${workspace.workspaceId}\u0000${scenario.scenarioId}`); if (!route) return;
    const actors = workspace.profileRefs.filter(profile => scenario.authorityRefs.length
      ? scenario.authorityRefs.some(authority => grants.get(profile)?.has(authority))
      : workspace.scenarios.some(candidate => candidate.authorityRefs.some(authority => grants.get(profile)?.has(authority)))).sort();
    const id = stableId(section.items.length > 1 ? `${section.sectionId}-${workspace.workspaceId}-${itemIndex + 1}` : section.sectionId);
    navigation.push({ id, label: section.label, href: route.routePattern, description: workspace.description, actors,
      workspaceId: workspace.workspaceId, scenarioId: scenario.scenarioId, sectionId: section.sectionId,
      ...(item.hub ? { hub: lowerCamel(item.hub) } : {}) });
  }));
  const stableNavigation = uniqueBy(navigation, item => item.id);
  const headerLinks: Ns4L5HeaderLink[] = [];
  for (const hub of sources.workspaceIndex.hubs) {
    const route = sources.navigation.routes.find(item => item.workspaceId === hub.workspaceId && item.scenarioId === 'collection')
      || sources.navigation.routes.find(item => item.workspaceId === hub.workspaceId);
    const workspace = workspaceById.get(hub.workspaceId); if (!route || !workspace) continue;
    headerLinks.push({ id: stableId(hub.hubId), label: workspace.title, href: route.routePattern,
      actors: authorizedProfiles(workspace, grants), manageable: true, hub: lowerCamel(hub.anchorEntity) });
  }
  for (const item of stableNavigation.filter(entry => !entry.hub)) headerLinks.push({
    id: item.id, label: item.label, href: item.href, actors: item.actors, manageable: true,
  });
  return { moduleId: sources.workspaceIndex.moduleName, basePath: `/${lowerCamel(sources.workspaceIndex.moduleName)}`,
    userLanguage: sources.workspaceIndex.userLanguage, navigation: stableNavigation, headerLinks: uniqueBy(headerLinks, item => item.id) };
}

export async function compileNs4E10Delivery(
  sources: Ns4E10Sources, report: Ns4E10ValidationReport, existingConfig: unknown, projectId: number,
): Promise<Ns4E10Delivery> {
  if (report.finalStatus !== 'passed') throw new Error('E10 L5 delivery requires a passed validation report.');
  const moduleNavigation = report.menuPreview;
  const todoFrontend: Ns4L5TodoFrontendArtifact = {
    schemaVersion: NS4_L5_TODO_FRONTEND_VERSION, layer: 'frontend', moduleName: sources.workspaceIndex.moduleName,
    owners: [
      ...sources.workspaces.map(workspace => ({ ownerType: 'workspace' as const, ownerId: workspace.workspaceId, workspaceId: workspace.workspaceId, statusFrontend: 'toCreate' as const })),
      ...sources.contracts.map(contract => ({ ownerType: 'contract' as const, ownerId: contract.operationRef, workspaceId: contract.workspaceId, statusFrontend: 'toCreate' as const })),
    ].sort((left, right) => `${left.ownerType}:${left.ownerId}`.localeCompare(`${right.ownerType}:${right.ownerId}`)),
  };
  const todoBackend: Ns4L5TodoBackendArtifact = {
    schemaVersion: NS4_L5_TODO_BACKEND_VERSION, layer: 'backend', moduleName: sources.workspaceIndex.moduleName,
    owners: sources.useCases.map(useCase => ({ ownerType: 'useCase', ownerId: useCase.useCaseId, statusBackend: 'toCreate' }))
      .sort((left, right) => left.ownerId.localeCompare(right.ownerId)) as Ns4L5BackendOwner[],
  };
  const processValue = {
    schemaVersion: NS4_L5_PROCESS_VERSION, moduleName: sources.workspaceIndex.moduleName,
    sourceHashes: report.sourceHashes, counts: report.counts,
    validation: { status: 'passed' as const, reportPath: `l4/${sources.workspaceIndex.moduleName}/pipeline/e10-validation-report.json`,
      reportHash: report.reportHash, warningCount: report.warnings.length, registrarCount: report.registrars.length },
    next: { frontend: 'todoFrontend' as const, backend: 'todoBackend' as const },
  };
  const process: Ns4L5ProcessArtifact = { ...processValue, processHash: await sha256Ns4(processValue) };
  return { config: mergeNs4L5Config(existingConfig, projectId, moduleNavigation), moduleNavigation, todoFrontend, todoBackend, process };
}

export function mergeNs4L5Config(existing: unknown, projectId: number, moduleNavigation: Ns4L5ModuleNavigation): Record<string, unknown> {
  const config = isRecord(existing) ? clone(existing) : {};
  const modulePatch = { moduleId: moduleNavigation.moduleId, basePath: moduleNavigation.basePath,
    navigation: moduleNavigation.navigation, headerLinks: moduleNavigation.headerLinks };
  if (isRecord(config.projects)) {
    const projects = config.projects as Record<string, unknown>;
    const requested = projects[String(projectId)];
    const clientKey = isRecord(requested) ? String(projectId) : Object.keys(projects).find(key => isRecord(projects[key]) && projects[key].type === 'client');
    if (clientKey) {
      const client = isRecord(projects[clientKey]) ? projects[clientKey] as Record<string, unknown> : {};
      client.modules = mergeModuleList(client.modules, modulePatch); projects[clientKey] = client; config.projects = projects;
      return config;
    }
  }
  config.modules = mergeModuleList(config.modules, modulePatch);
  return config;
}

function mergeModuleList(value: unknown, patch: Record<string, unknown>): Record<string, unknown>[] {
  const modules = Array.isArray(value) ? value.filter(isRecord).map(clone) : [];
  const index = modules.findIndex(item => item.moduleId === patch.moduleId);
  if (index >= 0) modules[index] = { ...modules[index], ...patch }; else modules.push(patch);
  return modules;
}
function authorizedProfiles(workspace: Ns4E10Sources['workspaces'][number], grants: Map<string, Set<string>>): string[] {
  return workspace.profileRefs.filter(profile => workspace.scenarios.some(scenario => scenario.authorityRefs.some(authority => grants.get(profile)?.has(authority)))).sort();
}
function scenarioRank(kind: string, insideHub = false): number { return (insideHub
  ? { record: 0, list: 1, detail: 2, queue: 3, review: 4, form: 5, collection: 8 }
  : { collection: 0, record: 1, list: 2, detail: 3, queue: 4, review: 5, form: 6 } as Record<string, number>)[kind] ?? 9; }
function stableId(value: string): string { const clean = value.replace(/[^A-Za-z0-9]+(.)/g, (_match, char: string) => char.toUpperCase()); return lowerCamel(clean || 'item'); }
function lowerCamel(value: string): string { return value ? value.slice(0, 1).toLowerCase() + value.slice(1) : 'module'; }
function uniqueBy<T>(values: T[], key: (value: T) => string): T[] { return [...new Map(values.map(value => [key(value), value])).values()].sort((left, right) => key(left).localeCompare(key(right))); }
function isRecord(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
