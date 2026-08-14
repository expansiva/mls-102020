import { sha256Ns4, type Ns4JourneyIndex, type Ns4PolicyDecisionSelection } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4AccessMatrixArtifactV4 } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4OntologyIndexArtifact } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import type {
  Ns4UseCaseIndexArtifactV3, Ns4WorkflowIndexArtifactV2, Ns4WorkflowIndexArtifactV3,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4AccessMatrixArtifact } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4UseCaseArtifactV3, Ns4WorkflowArtifactV2 } from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type { Ns4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/model.js';
import type { Ns4ClassicL4 } from '/_102020_/l2/agentNewSolution4/steps/e9/classic.js';

export const NS4_E10_VALIDATION_REPORT_VERSION = '2026-08-13-ns4-e10-validation-report-v1' as const;
export const NS4_L5_TODO_FRONTEND_VERSION = '2026-08-13-ns4-todo-frontend-v1' as const;
export const NS4_L5_TODO_BACKEND_VERSION = '2026-08-13-ns4-todo-backend-v1' as const;
export const NS4_L5_PROCESS_VERSION = '2026-08-13-ns4-process-v1' as const;
export const NS4_E10_MENU_LIMIT = 7 as const;

export type Ns4E10RepairStep = 'e2-journeys' | 'e3-access-matrix' | 'e4-ontology' | 'e5-rules' | 'e6-behaviors' | 'e7-realization' | 'e8-workspaces' | 'e9-navigation-compiler';

/** E10 validates the approved E8 model against the classic L4 that E9 actually wrote to disk. */
export interface Ns4E10Sources {
  moduleName: string;
  userLanguage: string;
  journeys: Ns4E2Review;
  journeyIndex: Ns4JourneyIndex;
  ontology: Ns4E4Review;
  ontologyIndex: Ns4OntologyIndexArtifact;
  rules: Ns4RulesArtifact;
  access: Ns4AccessMatrixArtifact;
  useCases: Ns4UseCaseArtifactV3[];
  useCaseIndex: Ns4UseCaseIndexArtifactV3;
  workflows: Ns4WorkflowArtifactV2[];
  workflowIndex: Ns4WorkflowIndexArtifactV2 | Ns4WorkflowIndexArtifactV3;
  model: Ns4E8Model;
  /** What E9 emitted, read back from L4: the staleness check compares it to a fresh compilation. */
  saved: Ns4ClassicL4;
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
  };
  counts: {
    journeys: number;
    workspaces: number;
    operations: number;
    contracts: number;
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

/**
 * The L5 menu preview. The frontend builds the real navigation itself from workspaces/*.defs.ts plus
 * the site map landings (nodejsSaveConfigJson.ts), with `/<module>/<workspaceId>` as the href — this
 * mirrors that derivation so the report shows the menu the module will actually have.
 */
export function compileNs4L5ModuleNavigation(sources: Ns4E10Sources): Ns4L5ModuleNavigation {
  const workspaceById = new Map(sources.model.workspaces.map(workspace => [workspace.workspaceId, workspace]));
  const landingIds = new Set(sources.model.landings.map(landing => landing.workspaceId));
  const navigation: Ns4L5NavigationItem[] = sources.model.menu.map(entry => {
    const workspace = workspaceById.get(entry.workspaceId);
    return {
      id: stableId(entry.workspaceId), label: entry.label, href: `/${sources.moduleName}/${entry.workspaceId}`,
      description: workspace?.purpose || entry.label, actors: [...(workspace?.actors || [])].sort(),
      workspaceId: entry.workspaceId, scenarioId: workspace?.sections[0]?.sectionId || '', sectionId: entry.featureRef || entry.tier,
      ...(entry.tier === 'hub' ? { hub: workspace?.entity } : {}),
    };
  });
  const headerLinks: Ns4L5HeaderLink[] = sources.model.menu
    .filter(entry => entry.tier === 'hub' || landingIds.has(entry.workspaceId))
    .map(entry => ({
      id: stableId(`header-${entry.workspaceId}`), label: entry.label,
      href: `/${sources.moduleName}/${entry.workspaceId}`,
      actors: [...(workspaceById.get(entry.workspaceId)?.actors || [])].sort(), manageable: true as const,
      ...(entry.tier === 'hub' ? { hub: workspaceById.get(entry.workspaceId)?.entity } : {}),
    }));
  return {
    moduleId: sources.moduleName, basePath: `/${sources.moduleName}`, userLanguage: sources.userLanguage,
    navigation: navigation.slice(0, NS4_E10_MENU_LIMIT * NS4_E10_MENU_LIMIT), headerLinks,
  };
}

export async function compileNs4E10Delivery(
  sources: Ns4E10Sources, report: Ns4E10ValidationReport, existingConfig: unknown, projectId: number,
): Promise<Ns4E10Delivery> {
  if (report.finalStatus !== 'passed') throw new Error('E10 L5 delivery requires a passed validation report.');
  const moduleNavigation = report.menuPreview;
  const todoFrontend: Ns4L5TodoFrontendArtifact = {
    schemaVersion: NS4_L5_TODO_FRONTEND_VERSION, layer: 'frontend', moduleName: sources.moduleName,
    owners: [
      ...sources.saved.workspaces.map(workspace => ({ ownerType: 'workspace' as const, ownerId: workspace.workspaceId, workspaceId: workspace.workspaceId, statusFrontend: 'toCreate' as const })),
      ...sources.saved.contracts.map(contract => ({ ownerType: 'contract' as const, ownerId: contract.route, workspaceId: contract.workspaceId, statusFrontend: 'toCreate' as const })),
    ].sort((left, right) => `${left.ownerType}:${left.ownerId}`.localeCompare(`${right.ownerType}:${right.ownerId}`)),
  };
  const todoBackend: Ns4L5TodoBackendArtifact = {
    schemaVersion: NS4_L5_TODO_BACKEND_VERSION, layer: 'backend', moduleName: sources.moduleName,
    owners: sources.model.operations.map(operation => ({ ownerType: 'useCase', ownerId: operation.operationId, statusBackend: 'toCreate' }))
      .sort((left, right) => left.ownerId.localeCompare(right.ownerId)) as Ns4L5BackendOwner[],
  };
  const processValue = {
    schemaVersion: NS4_L5_PROCESS_VERSION, moduleName: sources.moduleName,
    sourceHashes: report.sourceHashes, counts: report.counts,
    validation: { status: 'passed' as const, reportPath: `l4/${sources.moduleName}/pipeline/e10-validation-report.json`,
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
function stableId(value: string): string { const clean = value.replace(/[^A-Za-z0-9]+(.)/g, (_match, char: string) => char.toUpperCase()); return lowerCamel(clean || 'item'); }
function lowerCamel(value: string): string { return value ? value.slice(0, 1).toLowerCase() + value.slice(1) : 'module'; }
function uniqueBy<T>(values: T[], key: (value: T) => string): T[] { return [...new Map(values.map(value => [key(value), value])).values()].sort((left, right) => key(left).localeCompare(key(right))); }
function isRecord(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
