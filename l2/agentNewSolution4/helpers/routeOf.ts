import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4E8Edge, Ns4WorkspaceContext } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';

/**
 * routeOf outlived the workspace model that used to feed it: the classic L4 format carries a call
 * key (`<module>.<workspaceId>.<bffId>`), not a URL pattern, and the frontend derives the page URL
 * itself. The projection is kept — it is the one total URL derivation the module ever agreed on —
 * and now declares the shapes it needs instead of importing a model that no longer exists.
 */
interface Ns4E8SkeletonWorkspace {
  workspaceId: string;
  kind: 'hub' | 'place';
  anchorEntity?: string;
  pageContext: Ns4WorkspaceContext[];
}
interface Ns4WorkspaceScenario {
  scenarioId: string;
  kind: string;
  title: string;
  useCaseIds: string[];
  selectionContexts: Ns4WorkspaceContext[];
}

export interface Ns4RouteUseCase {
  useCaseId: string;
  entityRefs: string[];
}

type Ns4RouteWorkspace = Pick<Ns4E8SkeletonWorkspace, 'workspaceId' | 'kind' | 'anchorEntity' | 'pageContext'>;

export interface Ns4RouteProjection {
  routePattern: string;
  pathContextIds: string[];
  selectionContextIds: string[];
  systemDecisions: Ns4SystemDecision[];
}

/** Total structural URL projection shared by the E8 preview and the E9 compiler. */
export function routeOf(
  moduleName: string,
  workspace: Ns4RouteWorkspace,
  scenario: Ns4WorkspaceScenario | undefined,
  graph: { workspaces: Ns4RouteWorkspace[]; edges: Ns4E8Edge[]; useCases: Ns4RouteUseCase[] },
): Ns4RouteProjection {
  const moduleRoot = `/${lowerCamel(moduleName)}`;
  const hubs = graph.workspaces.filter(item => item.kind === 'hub').sort((left, right) => left.workspaceId.localeCompare(right.workspaceId));
  const parentHub = workspace.kind === 'place' ? hubs.find(hub => {
    const anchor = hubAnchor(hub);
    return !!anchor && graph.edges.some(edge => edge.from === hub.workspaceId && edge.to === workspace.workspaceId && edge.carries.includes(anchor.contextId));
  }) : undefined;
  const hub = workspace.kind === 'hub' ? workspace : parentHub;
  const anchor = hub ? hubAnchor(hub) : undefined;
  const hubBase = hub ? `${moduleRoot}/${slugOf(hub)}` : '';
  const inheritedPath = parentHub && anchor ? `/:${idField(anchor)}` : '';
  const base = workspace.kind === 'hub'
    ? hubBase
    : parentHub
      ? `${hubBase}${inheritedPath}/${slugOf(workspace)}`
      : `${moduleRoot}/${slugOf(workspace)}`;
  const inheritedContextIds = parentHub && anchor ? [anchor.contextId] : [];

  if (!scenario) return projection(base, inheritedContextIds, [], []);
  if (workspace.kind === 'hub' && scenario.kind === 'collection') return projection(base, [], scenario.selectionContexts.map(item => item.contextId), []);
  if (workspace.kind === 'hub' && scenario.kind === 'record') {
    const path = anchor ? `${base}/:${idField(anchor)}` : base;
    return projection(path, anchor ? [anchor.contextId] : [], scenario.selectionContexts.map(item => item.contextId), []);
  }

  const workspaceIdentity = workspace.kind === 'hub' && anchor ? `/:${idField(anchor)}` : '';
  const workspaceContextIds = workspace.kind === 'hub' && anchor ? [anchor.contextId] : inheritedContextIds;
  const scenarioBase = scenario.kind === 'collection' || scenario.kind === 'record'
    ? `${base}${workspaceIdentity}`
    : `${base}${workspaceIdentity}/${scenarioSlug(scenario.scenarioId, scenario.kind)}`;
  const targetCandidates = scenarioTargets(workspace, scenario, graph.useCases);
  if (targetCandidates.length === 1) {
    const target = targetCandidates[0];
    return projection(`${scenarioBase}/:${idField(target)}`, [...workspaceContextIds, target.contextId],
      scenario.selectionContexts.filter(item => item.contextId !== target.contextId).map(item => item.contextId), []);
  }
  const decision = scenario.kind === 'collection' || scenario.kind === 'record' ? [] : [ambiguousTargetDecision(workspace, scenario, targetCandidates.length)];
  return projection(scenarioBase, workspaceContextIds, scenario.selectionContexts.map(item => item.contextId), decision);
}

function scenarioTargets(workspace: Ns4RouteWorkspace, scenario: Ns4WorkspaceScenario, useCases: Ns4RouteUseCase[]): Ns4WorkspaceContext[] {
  const primaryEntities = new Set(scenario.useCaseIds.flatMap(useCaseId => {
    const primary = useCases.find(item => item.useCaseId === useCaseId)?.entityRefs[0];
    return primary ? [primary] : [];
  }));
  const anchorId = workspace.kind === 'hub' ? hubAnchor(workspace)?.contextId : '';
  return uniqueContexts([...scenario.selectionContexts, ...workspace.pageContext]
    .filter(context => context.contextId !== anchorId && context.required && context.cardinality === 'one' && primaryEntities.has(context.businessObject)));
}

function hubAnchor(workspace: Ns4RouteWorkspace): Ns4WorkspaceContext | undefined {
  return workspace.pageContext.filter(context => context.cardinality === 'one' && context.businessObject === workspace.anchorEntity)
    .sort((left, right) => Number(right.contextId === `selected${workspace.anchorEntity}`) - Number(left.contextId === `selected${workspace.anchorEntity}`)
      || left.contextId.localeCompare(right.contextId))[0];
}

function ambiguousTargetDecision(workspace: Ns4RouteWorkspace, scenario: Ns4WorkspaceScenario, count: number): Ns4SystemDecision {
  return {
    decisionId: `e8RouteTarget${upperCamel(workspace.workspaceId)}${upperCamel(scenario.scenarioId)}`,
    stage: 'e8',
    question: `Qual registro a tela ${scenario.title} deve abrir diretamente?`,
    chosen: 'openWithoutDirectRecordLink',
    alternatives: ['defineUniqueScenarioTarget'],
    decidedBy: 'system',
    findingRef: `NS4_ROUTE_TARGET:${workspace.workspaceId}:${scenario.scenarioId}:${count}`,
    changeHint: `A tela ${scenario.title} abre sem link direto de registro nesta versão; defina um único contexto-alvo para habilitá-lo.`,
  };
}

function projection(routePattern: string, pathContextIds: string[], selectionContextIds: string[], systemDecisions: Ns4SystemDecision[]): Ns4RouteProjection {
  return { routePattern, pathContextIds: unique(pathContextIds), selectionContextIds: unique(selectionContextIds), systemDecisions };
}
function uniqueContexts(values: Ns4WorkspaceContext[]): Ns4WorkspaceContext[] { return [...new Map(values.map(value => [value.contextId, value])).values()].sort((a, b) => a.contextId.localeCompare(b.contextId)); }
function unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))].sort(); }
function idField(context: Ns4WorkspaceContext): string { return context.idFieldRef || `${lowerCamel(context.businessObject)}Id`; }
function slugOf(workspace: Ns4RouteWorkspace): string { return pluralize(lowerCamel(workspace.anchorEntity || workspace.workspaceId.replace(/Workspace$/, '') || 'workspace')); }
function scenarioSlug(scenarioId: string, kind: string): string { const stripped = scenarioId.replace(new RegExp(`^${kind}`, 'i'), ''); return lowerCamel(stripped || scenarioId); }
function lowerCamel(value: string): string { return value ? value.slice(0, 1).toLowerCase() + value.slice(1) : 'item'; }
function upperCamel(value: string): string { return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : 'Item'; }
function pluralize(value: string): string { if (/s$/i.test(value)) return value; if (/[^aeiou]y$/i.test(value)) return value.slice(0, -1) + 'ies'; return `${value}s`; }
