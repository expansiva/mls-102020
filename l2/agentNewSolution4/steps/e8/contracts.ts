import { sha256Ns4 } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4E2Review, Ns4JourneyContext, Ns4JourneyStepKind, Ns4PolicyDecisionSelection } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4UseCaseArtifactV3, Ns4WorkflowArtifactV2 } from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';

export const NS4_E8_SKELETON_VERSION = '2026-08-13-ns4-e8-skeleton-v2' as const;
export const NS4_E8_PRESENTATION_VERSION = '2026-08-13-ns4-e8-presentation-v2' as const;
export const NS4_WORKSPACE_SCHEMA_VERSION = '2026-08-13-ns4-workspace-v2' as const;
export const NS4_WORKSPACE_INDEX_SCHEMA_VERSION = '2026-08-13-ns4-workspace-index-v3' as const;

export type Ns4WorkspaceKind = 'hub' | 'place';
export type Ns4WorkspaceScenarioKind = 'collection' | 'record' | 'list' | 'detail' | 'form' | 'review' | 'queue';
export type Ns4WorkspaceSurface = 'queueAction' | 'contextualModal' | 'batchAction';
export type Ns4WorkspaceInputSource = 'pageContext' | 'selection' | 'userDecision' | 'actorSession';
export type Ns4WorkspaceUrlRole = 'path' | 'selection';
export type Ns4WorkspaceUrlRoleSource = 'hubAnchor' | 'externalEntry' | 'localSelection' | 'focusedPath' | 'ambiguous' | 'llm' | 'systemDefault';

export interface Ns4E8HubScore {
  entityRef: string;
  score: number;
  anchoredJourneyCount: number;
  requiredRelationshipCount: number;
  projectionCount: number;
  locateUseCaseCount: number;
}

export interface Ns4WorkspaceContext {
  contextId: string;
  businessObject: string;
  cardinality: 'one' | 'many';
  required: boolean;
  idFieldRef?: string;
}

export interface Ns4WorkspaceRoutedContext extends Ns4WorkspaceContext {
  urlRole: Ns4WorkspaceUrlRole;
  urlRoleSource: Ns4WorkspaceUrlRoleSource;
  urlRoleJustification?: string;
}

export interface Ns4WorkspaceSlice {
  sliceId: string;
  useCaseId: string;
  entityRefs: string[];
  optional?: boolean;
}

export interface Ns4WorkspaceScenario {
  scenarioId: string;
  kind: Ns4WorkspaceScenarioKind;
  title: string;
  description: string;
  stepRefs: string[];
  useCaseIds: string[];
  authorityRefs: string[];
  selectionContexts: Ns4WorkspaceRoutedContext[];
  surface?: Ns4WorkspaceSurface;
  surfaceJustification?: string;
}

export interface Ns4E8SkeletonWorkspace {
  workspaceId: string;
  kind: Ns4WorkspaceKind;
  title: string;
  description: string;
  anchorEntity?: string;
  profileRefs: string[];
  featureRefs: string[];
  hostedStepRefs: string[];
  useCaseIds: string[];
  commandEntityRefs: Array<{ useCaseId: string; entityRefs: string[] }>;
  pageContext: Ns4WorkspaceRoutedContext[];
  slices: Ns4WorkspaceSlice[];
  scenarios: Ns4WorkspaceScenario[];
}

export interface Ns4E8UrlRoleDecision {
  workspaceId: string;
  scenarioId: string;
  contextId: string;
  defaultUrlRole: 'selection';
  urlRole: Ns4WorkspaceUrlRole;
  justification: string;
  decidedBy: 'pending' | 'llm' | 'system';
}

export interface Ns4E8MenuSection {
  sectionId: string;
  label: string;
  featureRef: string;
  workspaceIds: string[];
}

export interface Ns4E8Edge {
  from: string;
  to: string;
  carries: string[];
  preferredFromJourneyRef?: string;
}

export interface Ns4E8SkeletonReview {
  planId: 'e8-skeleton-review';
  schemaVersion: typeof NS4_E8_SKELETON_VERSION;
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  hubRanking: Ns4E8HubScore[];
  workspaces: Ns4E8SkeletonWorkspace[];
  menu: {
    headerLinks: string[];
    sections: Ns4E8MenuSection[];
    landings: Array<{ profileRef: string; workspaceId: string; scenarioId: string }>;
  };
  edges: Ns4E8Edge[];
  contextCatalog: Ns4WorkspaceContext[];
  urlRoleDecisions: Ns4E8UrlRoleDecision[];
  systemDecisions: Ns4SystemDecision[];
  skeletonHash?: string;
  changeSummary: string[];
}

export interface Ns4E8PresentationProposal {
  planId: 'e8-skeleton-presentation';
  schemaVersion: typeof NS4_E8_PRESENTATION_VERSION;
  moduleName: string;
  userLanguage: string;
  reviewRound: number;
  title: string;
  workspaces: Array<{
    workspaceId: string;
    title: string;
    description: string;
    pageContext: Ns4WorkspaceRoutedContext[];
    scenarios: Array<Pick<Ns4WorkspaceScenario, 'scenarioId' | 'title' | 'description' | 'selectionContexts'> & {
      surface?: Ns4WorkspaceSurface;
      surfaceJustification?: string;
    }>;
  }>;
  menuSections: Array<{ featureRef: string; label: string }>;
  changeSummary: string[];
}

export interface Ns4E8ReviewEvent {
  action: 'approve' | 'requestChanges' | 'cancel';
  adjustment: string;
  review: Ns4E8SkeletonReview;
}

export interface Ns4WorkspaceFieldRef { entityId: string; fieldId: string; label: string; }
export interface Ns4WorkspaceOrganism {
  role: string;
  fragmentRef: string;
  sliceId?: string;
  fieldRefs: Ns4WorkspaceFieldRef[];
  intent: string;
  usage?: 'picker';
}
export interface Ns4WorkspaceCommandInput {
  inputId: string;
  fieldRef?: Ns4WorkspaceFieldRef;
  source: Ns4WorkspaceInputSource;
  sourceRef?: string;
}
export interface Ns4WorkspaceDetailScenario {
  scenarioId: string;
  organisms: Ns4WorkspaceOrganism[];
  commandInputs: Array<{ useCaseId: string; inputs: Ns4WorkspaceCommandInput[] }>;
}
export interface Ns4WorkspaceDetailDraft {
  schemaVersion: '2026-08-11-ns4-workspace-detail-v1';
  moduleName: string;
  workspaceId: string;
  skeletonHash: string;
  scenarios: Ns4WorkspaceDetailScenario[];
}

export interface Ns4WorkspaceArtifact {
  schemaVersion: typeof NS4_WORKSPACE_SCHEMA_VERSION;
  moduleName: string;
  workspaceId: string;
  kind: Ns4WorkspaceKind;
  title: string;
  description: string;
  anchorEntity?: string;
  profileRefs: string[];
  pageContext: Ns4WorkspaceRoutedContext[];
  scenarios: Array<Ns4WorkspaceScenario & { organisms: Ns4WorkspaceOrganism[]; commandInputs: Array<{ useCaseId: string; inputs: Ns4WorkspaceCommandInput[] }> }>;
  viewCall: { uses: Ns4WorkspaceSlice[] };
  commands: string[];
  invalidations: Array<{ useCaseId: string; sliceIds: string[] }>;
  skeletonHash: string;
  workspaceHash: string;
}

export interface Ns4WorkspaceIndex {
  schemaVersion: typeof NS4_WORKSPACE_INDEX_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  workspaces: Array<{ workspaceId: string; title: string; kind: Ns4WorkspaceKind; anchorEntity?: string; profileRefs: string[]; scenarioIds: string[]; artifactPath: string; workspaceHash: string }>;
  hubs: Array<{ hubId: string; anchorEntity: string; workspaceId: string }>;
  menu: {
    headerLinks: string[];
    sections: Array<{ sectionId: string; label: string; featureRef: string; items: Array<{ workspaceId: string; hub?: string }> }>;
    landings: Array<{ profileRef: string; workspaceId: string; scenarioId: string }>;
    edges: Ns4E8Edge[];
    contextCatalog: Ns4WorkspaceContext[];
  };
  skeletonHash: string;
  systemDecisions: Ns4SystemDecision[];
  approvedBy: 'human' | 'auto';
  approvedAt: string;
}

export interface Ns4E8Sources {
  journeys: Ns4E2Review;
  access: Ns4E3Review;
  ontology: Ns4E4Review;
  useCases: Ns4UseCaseArtifactV3[];
  workflows: Ns4WorkflowArtifactV2[];
  policyDecisionSelections?: Ns4PolicyDecisionSelection[];
}

export function deriveE8HubScore(sources: Ns4E8Sources): Ns4E8HubScore[] {
  const contexts = collectContexts(sources.journeys);
  const results = sources.ontology.entities
    .filter(entity => !isPlatformOwnedEntity(entity))
    .map(entity => {
      const selected = `selected${entity.entityId}`;
      const anchoredJourneyIds = new Set<string>();
      for (const journey of sources.journeys.journeys) {
        const all = [...journey.business.entry.carries, ...journey.business.steps.flatMap(step => step.providesContext)];
        if (all.some(context => context.contextId === selected)) anchoredJourneyIds.add(journey.journeyId);
      }
      const requiredRelationshipCount = sources.ontology.relationships
        .filter(relationship => relationship.required && relationship.toEntity === entity.entityId).length;
      const projectionCount = sources.ontology.entities.filter(candidate => candidate.kind === 'projection'
        && candidate.sourceRefs.journeyIds.some(id => anchoredJourneyIds.has(id))).length;
      const locateUseCaseCount = sources.useCases.filter(useCase => useCase.kind === 'query'
        && useCase.compiledFrom.some(ref => ref.endsWith('.locate' + entity.entityId) || ref.toLowerCase().includes(`locate${entity.entityId}`.toLowerCase())))
        .reduce((total, useCase) => total + useCase.compiledFrom.length, 0);
      const anchoredJourneyCount = [...contexts.values()].filter(context => context.contextId === selected).length ? anchoredJourneyIds.size : 0;
      return { entityRef: entity.entityId, anchoredJourneyCount, requiredRelationshipCount, projectionCount, locateUseCaseCount,
        score: anchoredJourneyCount + requiredRelationshipCount + projectionCount + locateUseCaseCount };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entityRef.localeCompare(right.entityRef));
  return results;
}

export function deriveNs4E8Skeleton(sources: Ns4E8Sources, reviewRound = 1): Ns4E8SkeletonReview {
  const contexts = collectContexts(sources.journeys);
  const entitiesById = new Map(sources.ontology.entities.map(entity => [entity.entityId, entity]));
  for (const [contextId, context] of contexts) {
    const entity = entitiesById.get(context.businessObject);
    const idFieldRef = entity?.storage?.idField || entity?.fields.find(field => /id$/i.test(field.fieldId))?.fieldId;
    contexts.set(contextId, { ...context, ...(idFieldRef ? { idFieldRef } : {}) });
  }
  const stepInfo = collectSteps(sources, contexts);
  const ranking = deriveE8HubScore(sources);
  const secondScore = ranking[1]?.score || 0;
  const hubEntity = ranking[0] && ranking[0].score > 0 && (secondScore === 0 || ranking[0].score >= secondScore * 2)
    ? ranking[0].entityRef : '';
  const entityById = entitiesById;
  const absorbedBy = new Map<string, string>();
  if (hubEntity) for (const relationship of sources.ontology.relationships) {
    if (relationship.required && relationship.toEntity === hubEntity) absorbedBy.set(relationship.fromEntity, hubEntity);
  }
  const clusters = new Map<string, typeof stepInfo>();
  for (const info of stepInfo) {
    const anchor = info.anchorEntity && absorbedBy.has(info.anchorEntity) && info.requires.some(context => context.businessObject === hubEntity)
      ? hubEntity : info.anchorEntity;
    const key = anchor || info.primaryEntity || info.journeyId;
    const entries = clusters.get(key) || []; entries.push({ ...info, anchorEntity: anchor }); clusters.set(key, entries);
  }
  const workspaces = [...clusters.entries()].map(([key, entries]) => {
    const isHub = key === hubEntity;
    const entity = entityById.get(key);
    const workspaceId = `${lowerCamel(key)}Workspace`;
    const hostedStepRefs = unique(entries.map(entry => entry.stepRef));
    const useCaseIds = unique(entries.map(entry => entry.useCaseId).filter(Boolean));
    const slices = unique(useCaseIds.filter(id => sources.useCases.find(useCase => useCase.useCaseId === id)?.kind === 'query')).map(useCaseId => ({
      sliceId: useCaseId, useCaseId, entityRefs: sources.useCases.find(useCase => useCase.useCaseId === useCaseId)?.entityRefs || [],
    }));
    const profileRefs = unique(entries.flatMap(entry => entry.profileRefs));
    const featureRefs = unique(entries.flatMap(entry => entry.featureRefs));
    const scenarios = deriveScenarios(entries, isHub, sources);
    return {
      workspaceId, kind: isHub ? 'hub' as const : 'place' as const,
      title: entity?.title || humanize(key), description: entity?.description || `Workspace for ${humanize(key)}.`,
      ...(key && entity ? { anchorEntity: key } : {}), profileRefs, featureRefs, hostedStepRefs, useCaseIds,
      commandEntityRefs: useCaseIds.map(useCaseId => sources.useCases.find(useCase => useCase.useCaseId === useCaseId)).filter((useCase): useCase is Ns4UseCaseArtifactV3 => !!useCase && useCase.kind === 'command').map(useCase => ({ useCaseId: useCase.useCaseId, entityRefs: useCase.entityRefs })),
      pageContext: [] as Ns4WorkspaceRoutedContext[], slices, scenarios,
    };
  }).sort((left, right) => left.workspaceId.localeCompare(right.workspaceId));
  const byStep = new Map(workspaces.flatMap(workspace => workspace.hostedStepRefs.map(ref => [ref, workspace.workspaceId] as const)));
  const edges = deriveEdges(sources, stepInfo, byStep);
  const classified = classifyNs4E8UrlRoles(workspaces, edges, stepInfo, contexts, sources);
  const routedWorkspaces = classified.workspaces;
  const headerLinks = routedWorkspaces.filter(workspace => workspace.kind === 'hub' || !workspace.pageContext.length).map(workspace => workspace.workspaceId);
  const sections = sources.journeys.features.map(feature => ({
    sectionId: feature.featureId, label: feature.title, featureRef: feature.featureId,
    workspaceIds: unique(routedWorkspaces.filter(workspace => workspace.featureRefs.includes(feature.featureId)).map(workspace => workspace.workspaceId)),
  })).filter(section => section.workspaceIds.length);
  const landings = sources.access.profiles.flatMap(profile => {
    const target = routedWorkspaces.find(workspace => workspace.profileRefs.includes(profile.profileId) && (!workspace.pageContext.length || workspace.kind === 'hub'));
    const scenario = target?.scenarios.find(item => item.kind === 'collection' || item.kind === 'list' || item.kind === 'detail');
    return target && scenario ? [{ profileRef: profile.profileId, workspaceId: target.workspaceId, scenarioId: scenario.scenarioId }] : [];
  });
  return {
    planId: 'e8-skeleton-review', schemaVersion: NS4_E8_SKELETON_VERSION, moduleName: sources.journeys.moduleName,
    userLanguage: sources.journeys.userLanguage, title: 'Workspaces', reviewRound, hubRanking: ranking, workspaces: routedWorkspaces,
    menu: { headerLinks, sections, landings }, edges, contextCatalog: uniqueContexts([...contexts.values()]),
    urlRoleDecisions: classified.decisions, systemDecisions: [], changeSummary: [],
  };
}

export function normalizeNs4E8Skeleton(value: unknown, fallbackModule = ''): Ns4E8SkeletonReview {
  const root = record(value);
  return {
    planId: 'e8-skeleton-review', schemaVersion: NS4_E8_SKELETON_VERSION, moduleName: text(root.moduleName) || fallbackModule,
    userLanguage: text(root.userLanguage) || 'en', title: text(root.title) || 'Workspaces', reviewRound: integer(root.reviewRound, 1),
    hubRanking: array(root.hubRanking).map(item => { const value = record(item); return { entityRef: text(value.entityRef), score: integer(value.score, 0), anchoredJourneyCount: integer(value.anchoredJourneyCount, 0), requiredRelationshipCount: integer(value.requiredRelationshipCount, 0), projectionCount: integer(value.projectionCount, 0), locateUseCaseCount: integer(value.locateUseCaseCount, 0) }; }),
    workspaces: array(root.workspaces).map(normalizeWorkspace),
    menu: normalizeMenu(root.menu), edges: array(root.edges).map(item => { const edge = record(item); return { from: text(edge.from), to: text(edge.to), carries: strings(edge.carries), ...(text(edge.preferredFromJourneyRef) ? { preferredFromJourneyRef: text(edge.preferredFromJourneyRef) } : {}) }; }),
    contextCatalog: array(root.contextCatalog).map(normalizeContext),
    urlRoleDecisions: array(root.urlRoleDecisions).map(normalizeUrlRoleDecision),
    systemDecisions: array(root.systemDecisions).map(normalizeSystemDecision).filter((item): item is Ns4SystemDecision => !!item),
    ...(text(root.skeletonHash) ? { skeletonHash: text(root.skeletonHash) } : {}), changeSummary: strings(root.changeSummary),
  };
}

export function normalizeNs4E8PresentationProposal(value: unknown, fallbackModule = ''): Ns4E8PresentationProposal {
  const root = record(value);
  return {
    planId: 'e8-skeleton-presentation', schemaVersion: NS4_E8_PRESENTATION_VERSION,
    moduleName: text(root.moduleName) || fallbackModule, userLanguage: text(root.userLanguage) || 'en',
    reviewRound: integer(root.reviewRound, 1), title: text(root.title),
    workspaces: array(root.workspaces).map(item => {
      const workspace = record(item);
      return { workspaceId: text(workspace.workspaceId), title: text(workspace.title), description: text(workspace.description),
        pageContext: array(workspace.pageContext).map(item => normalizeRoutedContext(item, 'path', 'externalEntry')),
        scenarios: array(workspace.scenarios).map(item => { const scenario = record(item); const chosenSurface = surface(scenario.surface); return {
          scenarioId: text(scenario.scenarioId), title: text(scenario.title), description: text(scenario.description),
          selectionContexts: array(scenario.selectionContexts).map(item => normalizeRoutedContext(item, 'selection', 'systemDefault')),
          ...(chosenSurface ? { surface: chosenSurface } : {}),
          ...(text(scenario.surfaceJustification) ? { surfaceJustification: text(scenario.surfaceJustification) } : {}),
        }; }),
      };
    }),
    menuSections: array(root.menuSections).map(item => { const section = record(item); return { featureRef: text(section.featureRef), label: text(section.label) }; }),
    changeSummary: strings(root.changeSummary),
  };
}

export function overlayNs4E8Presentation(derived: Ns4E8SkeletonReview, proposed: unknown): Ns4E8SkeletonReview {
  const candidate = normalizeNs4E8PresentationProposal(proposed, derived.moduleName);
  const proposedWorkspaces = new Map(candidate.workspaces.map(workspace => [workspace.workspaceId, workspace]));
  const decisions = derived.urlRoleDecisions.map(decision => ({ ...decision }));
  const workspaces = derived.workspaces.map(workspace => {
    const display = proposedWorkspaces.get(workspace.workspaceId);
    const scenarios = workspace.scenarios.map(scenario => {
      const proposedScenario = display?.scenarios.find(item => item.scenarioId === scenario.scenarioId);
      const surface = proposedScenario?.surface;
      const selectionContexts = scenario.selectionContexts.map(context => {
        const decision = decisions.find(item => item.workspaceId === workspace.workspaceId && item.scenarioId === scenario.scenarioId && item.contextId === context.contextId);
        const proposedContext = proposedScenario?.selectionContexts.find(item => item.contextId === context.contextId);
        if (!decision || !proposedContext) return context;
        decision.urlRole = proposedContext.urlRole; decision.justification = proposedContext.urlRoleJustification || ''; decision.decidedBy = 'llm';
        return { ...context, urlRole: proposedContext.urlRole, urlRoleSource: 'llm' as const,
          ...(proposedContext.urlRoleJustification ? { urlRoleJustification: proposedContext.urlRoleJustification } : {}) };
      });
      return { ...scenario, selectionContexts, ...(proposedScenario?.title ? { title: proposedScenario.title } : {}), ...(proposedScenario?.description ? { description: proposedScenario.description } : {}),
        ...(surface ? { surface, ...(proposedScenario?.surfaceJustification ? { surfaceJustification: proposedScenario.surfaceJustification } : {}) } : {}) };
    });
    return { ...workspace, ...(display?.title ? { title: display.title } : {}), ...(display?.description ? { description: display.description } : {}), scenarios };
  });
  const labels = new Map(candidate.menuSections.map(section => [section.featureRef, section]));
  const sections = derived.menu.sections.map(section => ({ ...section, ...(labels.get(section.featureRef)?.label ? { label: labels.get(section.featureRef)!.label } : {}) }));
  return { ...derived, ...(candidate.title ? { title: candidate.title } : {}), workspaces, menu: { ...derived.menu, sections }, urlRoleDecisions: decisions, changeSummary: candidate.changeSummary };
}

export function resolveNs4E8PresentationDefaults(derived: Ns4E8SkeletonReview, reason: string): Ns4E8SkeletonReview {
  const pending = derived.urlRoleDecisions.filter(decision => decision.decidedBy === 'pending');
  if (!pending.length) return derived;
  const fallbackText = derived.userLanguage.toLowerCase().startsWith('pt')
    ? 'Seleção local adotada por padrão após uma resposta de apresentação inválida.'
    : 'Local selection adopted by default after an invalid presentation response.';
  const findings = pending.map(decision => ({
    classification: 'B' as const, decisionId: decisionId('e8UrlRole', decision.workspaceId, decision.scenarioId, decision.contextId),
    findingRef: `NS4_E8_URL_ROLE:${decision.workspaceId}:${decision.scenarioId}:${decision.contextId}`, stage: 'e8',
    question: `Should ${decision.contextId} be URL path identity or local screen selection in ${decision.scenarioId}?`,
    defaultChoice: 'selection', alternatives: ['path'], changeHint: `Review URL role for ${decision.contextId} in ${decision.workspaceId}.${decision.scenarioId}. ${reason}`,
  }));
  const resolved = resolveNs4Findings(derived, findings);
  const workspaces = derived.workspaces.map(workspace => ({ ...workspace, scenarios: workspace.scenarios.map(scenario => ({ ...scenario,
    selectionContexts: scenario.selectionContexts.map(context => pending.some(decision => decision.workspaceId === workspace.workspaceId && decision.scenarioId === scenario.scenarioId && decision.contextId === context.contextId)
      ? { ...context, urlRole: 'selection' as const, urlRoleSource: 'systemDefault' as const, urlRoleJustification: fallbackText } : context),
  })) }));
  return { ...derived, workspaces,
    urlRoleDecisions: derived.urlRoleDecisions.map(decision => decision.decidedBy === 'pending' ? { ...decision, urlRole: 'selection', justification: fallbackText, decidedBy: 'system' } : decision),
    systemDecisions: [...derived.systemDecisions, ...resolved.systemDecisions],
  };
}

export function normalizeNs4WorkspaceDetail(value: unknown, fallbackModule = '', fallbackWorkspace = ''): Ns4WorkspaceDetailDraft {
  const root = record(value);
  return { schemaVersion: '2026-08-11-ns4-workspace-detail-v1', moduleName: text(root.moduleName) || fallbackModule,
    workspaceId: text(root.workspaceId) || fallbackWorkspace, skeletonHash: text(root.skeletonHash),
    scenarios: array(root.scenarios).map(item => { const scenario = record(item); return {
      scenarioId: text(scenario.scenarioId),
      organisms: array(scenario.organisms).map(item => { const organism = record(item); return { role: text(organism.role), fragmentRef: text(organism.fragmentRef), ...(text(organism.sliceId) ? { sliceId: text(organism.sliceId) } : {}), fieldRefs: array(organism.fieldRefs).map(normalizeFieldRef), intent: text(organism.intent), ...(organism.usage === 'picker' ? { usage: 'picker' as const } : {}) }; }),
      commandInputs: array(scenario.commandInputs).map(item => { const command = record(item); return { useCaseId: text(command.useCaseId), inputs: array(command.inputs).map(item => { const input = record(item); const fieldRef = isRecord(input.fieldRef) ? normalizeFieldRef(input.fieldRef) : null; return { inputId: text(input.inputId), ...(fieldRef?.entityId && fieldRef.fieldId ? { fieldRef } : {}), source: input.source === 'selection' || input.source === 'userDecision' || input.source === 'actorSession' ? input.source : 'pageContext', ...(text(input.sourceRef) ? { sourceRef: text(input.sourceRef) } : {}) }; }) }; }),
    }; }),
  };
}

export async function hashNs4E8Skeleton(skeleton: Ns4E8SkeletonReview): Promise<string> {
  const { skeletonHash: _ignored, changeSummary: _changes, ...stable } = skeleton;
  return sha256Ns4(stable);
}

export async function buildNs4WorkspaceArtifacts(skeleton: Ns4E8SkeletonReview, details: Ns4WorkspaceDetailDraft[], approvedBy: 'human' | 'auto', approvedAt: string, systemDecisions: Ns4SystemDecision[] = []): Promise<{ artifacts: Ns4WorkspaceArtifact[]; index: Ns4WorkspaceIndex }> {
  const skeletonHash = skeleton.skeletonHash || await hashNs4E8Skeleton(skeleton);
  const detailById = new Map(details.map(detail => [detail.workspaceId, detail]));
  const artifacts = await Promise.all(skeleton.workspaces.map(async workspace => {
    const detail = detailById.get(workspace.workspaceId)!;
    const scenarios = workspace.scenarios.map(scenario => {
      const detailScenario = detail.scenarios.find(item => item.scenarioId === scenario.scenarioId);
      const selectionSlices = new Set((detailScenario?.commandInputs || []).flatMap(command => command.inputs.filter(input => input.source === 'selection').map(input => input.sourceRef)));
      const organisms = (detailScenario?.organisms || []).map(organism => ({ ...organism, ...(organism.sliceId && selectionSlices.has(organism.sliceId) && workspace.anchorEntity && organism.fieldRefs.some(field => field.entityId !== workspace.anchorEntity) ? { usage: 'picker' as const } : {}) }));
      return { ...scenario, organisms, commandInputs: detailScenario?.commandInputs || [] };
    });
    const commands = workspace.commandEntityRefs.map(command => command.useCaseId);
    const invalidations = workspace.commandEntityRefs.map(command => ({ useCaseId: command.useCaseId, sliceIds: workspace.slices.filter(slice => slice.entityRefs.some(entityRef => command.entityRefs.includes(entityRef))).map(slice => slice.sliceId) }));
    const value = { schemaVersion: NS4_WORKSPACE_SCHEMA_VERSION, moduleName: skeleton.moduleName, workspaceId: workspace.workspaceId, kind: workspace.kind, title: workspace.title, description: workspace.description, ...(workspace.anchorEntity ? { anchorEntity: workspace.anchorEntity } : {}), profileRefs: workspace.profileRefs, pageContext: workspace.pageContext, scenarios, viewCall: { uses: workspace.slices }, commands, invalidations, skeletonHash };
    return { ...value, workspaceHash: await sha256Ns4(value) } satisfies Ns4WorkspaceArtifact;
  }));
  return { artifacts, index: { schemaVersion: NS4_WORKSPACE_INDEX_SCHEMA_VERSION, moduleName: skeleton.moduleName, userLanguage: skeleton.userLanguage,
    workspaces: artifacts.map(item => ({ workspaceId: item.workspaceId, title: item.title, kind: item.kind, ...(item.anchorEntity ? { anchorEntity: item.anchorEntity } : {}), profileRefs: item.profileRefs, scenarioIds: item.scenarios.map(scenario => scenario.scenarioId), artifactPath: `l4/${skeleton.moduleName}/workspaces/${item.workspaceId}.defs.ts`, workspaceHash: item.workspaceHash })),
    hubs: artifacts.filter(item => item.kind === 'hub' && item.anchorEntity).map(item => ({ hubId: item.workspaceId, anchorEntity: item.anchorEntity!, workspaceId: item.workspaceId })),
    menu: { headerLinks: skeleton.menu.headerLinks, sections: skeleton.menu.sections.map(section => ({ sectionId: section.sectionId, label: section.label, featureRef: section.featureRef, items: section.workspaceIds.map(workspaceId => ({ workspaceId, ...(artifacts.find(item => item.workspaceId === workspaceId)?.kind === 'hub' ? { hub: artifacts.find(item => item.workspaceId === workspaceId)?.anchorEntity } : {}) })) })), landings: skeleton.menu.landings, edges: skeleton.edges, contextCatalog: skeleton.contextCatalog }, skeletonHash, systemDecisions, approvedBy, approvedAt } };
}

export function isPlatformOwnedEntity(entity: Ns4E4Review['entities'][number]): boolean {
  return entity.ownership === 'external' && entity.storage?.target === 'external' && entity.storage.scope === 'platform';
}

function collectContexts(journeys: Ns4E2Review): Map<string, Ns4WorkspaceContext> {
  const result = new Map<string, Ns4WorkspaceContext>();
  for (const journey of journeys.journeys) for (const context of [...journey.business.entry.carries, ...journey.business.steps.flatMap(step => step.providesContext)]) {
    if (!result.has(context.contextId)) result.set(context.contextId, context);
  }
  return result;
}
function collectSteps(sources: Ns4E8Sources, contexts: Map<string, Ns4WorkspaceContext>) {
  const byStep = new Map(sources.useCases.flatMap(useCase => useCase.compiledFrom.map(ref => [ref, useCase] as const)));
  const authorityByStep = new Map<string, string[]>();
  for (const authority of sources.access.authorities) for (const ref of authority.journeyStepRefs) authorityByStep.set(ref, [...(authorityByStep.get(ref) || []), authority.authorityRef]);
  const profilesByAuthority = new Map<string, string[]>();
  for (const grant of sources.access.grants) profilesByAuthority.set(grant.authorityRef, [...(profilesByAuthority.get(grant.authorityRef) || []), grant.profileRef]);
  return sources.journeys.journeys.flatMap(journey => journey.business.steps.map(step => {
    const stepRef = `${journey.journeyId}.${step.stepId}`; const requires = step.requiresContext.map(id => contexts.get(id)).filter((item): item is Ns4WorkspaceContext => !!item);
    const provides = step.providesContext; const anchor = requires.find(context => context.required)?.businessObject || (step.kind === 'locate' ? provides[0]?.businessObject : '');
    const authorities = authorityByStep.get(stepRef) || [];
    return { journeyId: journey.journeyId, stepRef, step, requires, provides, anchorEntity: anchor, primaryEntity: anchor || provides[0]?.businessObject || '', useCaseId: byStep.get(stepRef)?.useCaseId || '', featureRefs: step.featureRefs, authorityRefs: authorities, profileRefs: unique(authorities.flatMap(authority => profilesByAuthority.get(authority) || [])) };
  }));
}
function deriveScenarios(entries: ReturnType<typeof collectSteps>, isHub: boolean, sources: Ns4E8Sources): Ns4WorkspaceScenario[] {
  const kindByStep: Record<Ns4JourneyStepKind, Ns4WorkspaceScenarioKind> = { locate: 'list', inspect: 'detail', act: 'form', decide: 'review', handoff: 'detail' };
  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) { const kind = kindByStep[entry.step.kind]; const key = `${kind}:${entry.useCaseId || entry.step.stepId}`; const values = grouped.get(key) || []; values.push(entry); grouped.set(key, values); }
  const scenarios = [...grouped.entries()].map(([key, values]) => { const [kind, id] = key.split(':'); return { scenarioId: `${kind}${upperCamel(id)}`, kind: kind as Ns4WorkspaceScenarioKind, title: humanize(id), description: values[0].step.intent, stepRefs: unique(values.map(value => value.stepRef)), useCaseIds: unique(values.map(value => value.useCaseId).filter(Boolean)), authorityRefs: unique(values.flatMap(value => value.authorityRefs)), selectionContexts: [] as Ns4WorkspaceRoutedContext[] }; });
  if (isHub) {
    const query = entries.find(entry => entry.step.kind === 'locate');
    scenarios.unshift({ scenarioId: 'collection', kind: 'collection', title: 'Collection', description: 'Portfolio collection and selection.', stepRefs: query ? [query.stepRef] : [], useCaseIds: query?.useCaseId ? [query.useCaseId] : [], authorityRefs: query?.authorityRefs || [], selectionContexts: [] });
    scenarios.unshift({ scenarioId: 'record', kind: 'record', title: 'Record', description: 'Selected record dashboard and internal menu.', stepRefs: [], useCaseIds: [], authorityRefs: [], selectionContexts: [] });
  }
  const workflowEntities = new Set(sources.workflows.filter(workflow => workflow.states.some(state => /pending|proposed|awaiting/i.test(state))).map(workflow => workflow.entityRef));
  if (entries.some(entry => entry.authorityRefs.length && (workflowEntities.has(entry.primaryEntity)
    || (sources.useCases.find(useCase => useCase.useCaseId === entry.useCaseId)?.entityRefs || []).some(entityRef => workflowEntities.has(entityRef))))) {
    scenarios.push({ scenarioId: 'queue', kind: 'queue', title: 'Decision queue', description: 'Reachable pending decisions.', stepRefs: [], useCaseIds: [], authorityRefs: unique(entries.flatMap(entry => entry.authorityRefs)), selectionContexts: [] });
  }
  return scenarios;
}
function deriveEdges(sources: Ns4E8Sources, entries: ReturnType<typeof collectSteps>, byStep: Map<string, string>): Ns4E8Edge[] {
  const edges = new Map<string, Ns4E8Edge>();
  const addEdge = (fromRef: string, toRef: string, contextIds: string[]) => {
    const from = byStep.get(fromRef); const to = byStep.get(toRef); const carries = unique(contextIds);
    if (!from || !to || from === to || !carries.length) return;
    const key = `${from}:${to}:${carries.join(',')}`;
    edges.set(key, { from, to, carries, preferredFromJourneyRef: fromRef });
  };
  for (const journey of sources.journeys.journeys) {
    const steps = journey.business.steps;
    for (let index = 1; index < steps.length; index += 1) {
      const previousRef = `${journey.journeyId}.${steps[index - 1].stepId}`; const nextRef = `${journey.journeyId}.${steps[index].stepId}`;
      const previous = entries.find(entry => entry.stepRef === previousRef); const next = entries.find(entry => entry.stepRef === nextRef); const carries = next?.requires.filter(context => previous?.provides.some(provided => provided.contextId === context.contextId)).map(context => context.contextId) || [];
      addEdge(previousRef, nextRef, carries);
    }
    for (const prerequisite of journey.business.prerequisites || []) {
      const declaredContexts = new Set(prerequisite.providesContext);
      if (!declaredContexts.size) continue;
      const providerJourney = sources.journeys.journeys.find(candidate => candidate.journeyId === prerequisite.journeyRef);
      if (!providerJourney) continue;
      for (const targetStep of steps) {
        const carriedToTarget = targetStep.requiresContext.filter(contextId => declaredContexts.has(contextId));
        if (!carriedToTarget.length) continue;
        const targetRef = `${journey.journeyId}.${targetStep.stepId}`;
        for (const providerStep of providerJourney.business.steps) {
          const produced = providerStep.providesContext.map(context => context.contextId).filter(contextId => carriedToTarget.includes(contextId));
          if (produced.length) addEdge(`${providerJourney.journeyId}.${providerStep.stepId}`, targetRef, produced);
        }
      }
    }
  }
  return [...edges.values()].sort((left, right) => `${left.from}:${left.to}`.localeCompare(`${right.from}:${right.to}`));
}
function classifyNs4E8UrlRoles(
  sourceWorkspaces: Ns4E8SkeletonWorkspace[], edges: Ns4E8Edge[], entries: ReturnType<typeof collectSteps>,
  contexts: Map<string, Ns4WorkspaceContext>, sources: Ns4E8Sources,
): { workspaces: Ns4E8SkeletonWorkspace[]; decisions: Ns4E8UrlRoleDecision[] } {
  const entriesByRef = new Map(entries.map(entry => [entry.stepRef, entry]));
  const journeysById = new Map(sources.journeys.journeys.map(journey => [journey.journeyId, journey]));
  const useCasesById = new Map(sources.useCases.map(useCase => [useCase.useCaseId, useCase]));
  const externalByWorkspace = new Map<string, Set<string>>();
  edges.forEach(edge => {
    const provider = edge.preferredFromJourneyRef ? entriesByRef.get(edge.preferredFromJourneyRef) : undefined;
    const targetEntries = entries.filter(entry => sourceWorkspaces.find(workspace => workspace.workspaceId === edge.to)?.hostedStepRefs.includes(entry.stepRef)
      && entry.requires.some(context => edge.carries.includes(context.contextId)));
    const external = provider?.step.kind === 'handoff' || targetEntries.some(target => target.journeyId !== provider?.journeyId
      || journeysById.get(target.journeyId)?.business.entry.mode === 'eventDriven');
    if (external) externalByWorkspace.set(edge.to, new Set([...(externalByWorkspace.get(edge.to) || []), ...edge.carries]));
  });
  sourceWorkspaces.forEach(workspace => {
    const externallyEntered = workspace.hostedStepRefs.flatMap(ref => {
      const entry = entriesByRef.get(ref); if (!entry) return [];
      const journey = journeysById.get(entry.journeyId); if (!journey || journey.business.entry.mode !== 'eventDriven') return [];
      const declared = new Set([...journey.business.entry.carries.map(context => context.contextId), ...(journey.business.prerequisites || []).flatMap(item => item.providesContext)]);
      return entry.requires.map(context => context.contextId).filter(contextId => declared.has(contextId));
    });
    if (externallyEntered.length) externalByWorkspace.set(workspace.workspaceId, new Set([...(externalByWorkspace.get(workspace.workspaceId) || []), ...externallyEntered]));
  });
  const decisions: Ns4E8UrlRoleDecision[] = [];
  const workspaces = sourceWorkspaces.map(sourceWorkspace => {
    const workspace: Ns4E8SkeletonWorkspace = { ...sourceWorkspace, pageContext: [], slices: sourceWorkspace.slices.map(slice => ({ ...slice })),
      scenarios: sourceWorkspace.scenarios.map(scenario => ({ ...scenario, selectionContexts: [] })) };
    const anchorContext = workspace.kind === 'hub' && workspace.anchorEntity ? [...contexts.values()]
      .filter(context => context.businessObject === workspace.anchorEntity)
      .sort((left, right) => Number(right.contextId === `selected${workspace.anchorEntity}`) - Number(left.contextId === `selected${workspace.anchorEntity}`)
        || Number(right.required) - Number(left.required) || left.contextId.localeCompare(right.contextId))[0] : undefined;
    if (anchorContext) workspace.pageContext.push(routeContext(anchorContext, 'path', 'hubAnchor', 'Workspace anchor identity.'));
    for (const contextId of externalByWorkspace.get(workspace.workspaceId) || []) {
      const context = contexts.get(contextId);
      if (context && !workspace.pageContext.some(item => item.contextId === contextId)) workspace.pageContext.push(routeContext(context, 'path', 'externalEntry', 'Incoming handoff or event context.'));
    }
    workspace.scenarios = workspace.scenarios.map(scenario => {
      const required = unique(scenario.stepRefs.flatMap(ref => entriesByRef.get(ref)?.requires.map(context => context.contextId) || []));
      const selectionContexts: Ns4WorkspaceRoutedContext[] = [];
      for (const contextId of required) {
        const context = contexts.get(contextId);
        if (!context || workspace.pageContext.some(item => item.contextId === contextId)) continue;
        const provider = entries.find(entry => entry.step.kind === 'locate' && entry.provides.some(item => item.contextId === contextId));
        const providerUseCase = provider?.useCaseId ? useCasesById.get(provider.useCaseId) : undefined;
        if (providerUseCase?.kind === 'query' && !workspace.slices.some(slice => slice.sliceId === providerUseCase.useCaseId)) {
          workspace.slices.push({ sliceId: providerUseCase.useCaseId, useCaseId: providerUseCase.useCaseId, entityRefs: providerUseCase.entityRefs, optional: true });
        }
        const localSlice = workspace.slices.some(slice => slice.entityRefs.includes(context.businessObject));
        const formInput = scenario.kind === 'form' && scenario.useCaseIds.some(useCaseId => {
          const useCase = useCasesById.get(useCaseId); return useCase?.kind === 'command' && useCase.contexts?.requires?.includes(contextId);
        });
        if (provider && localSlice) selectionContexts.push(routeContext(context, 'selection', 'localSelection', 'Resolved by a local picker or slice.'));
        else if (formInput || localSlice) {
          selectionContexts.push(routeContext(context, 'selection', 'ambiguous'));
          decisions.push({ workspaceId: workspace.workspaceId, scenarioId: scenario.scenarioId, contextId, defaultUrlRole: 'selection', urlRole: 'selection', justification: '', decidedBy: 'pending' });
        } else selectionContexts.push(routeContext(context, 'path', 'focusedPath', 'Focused scenario identity has no local selection source.'));
      }
      return { ...scenario, selectionContexts: uniqueRoutedContexts(selectionContexts) };
    });
    workspace.pageContext = uniqueRoutedContexts(workspace.pageContext);
    workspace.slices.sort((left, right) => left.sliceId.localeCompare(right.sliceId));
    return workspace;
  });
  return { workspaces, decisions: decisions.sort((left, right) => `${left.workspaceId}:${left.scenarioId}:${left.contextId}`.localeCompare(`${right.workspaceId}:${right.scenarioId}:${right.contextId}`)) };
}

export interface Ns4E8RoutePreview { label: string; url: string; }
export function previewNs4E8Routes(skeleton: Pick<Ns4E8SkeletonReview, 'moduleName'>, workspace: Ns4E8SkeletonWorkspace): Ns4E8RoutePreview[] {
  const base = `/${lowerCamel(skeleton.moduleName)}/${pluralize(lowerCamel(workspace.anchorEntity || workspace.workspaceId.replace(/Workspace$/, '')))}`;
  const pagePath = workspace.pageContext.filter(context => context.urlRole === 'path').map(context => `/:${context.idFieldRef || lowerCamel(context.businessObject) + 'Id'}`).join('');
  const previews: Ns4E8RoutePreview[] = workspace.kind === 'hub' ? [{ label: 'Collection', url: base }, { label: 'Record', url: `${base}${pagePath}` }] : [{ label: 'Workspace', url: `${base}${pagePath}` }];
  workspace.scenarios.forEach(scenario => {
    const focused = scenario.selectionContexts.filter(context => context.urlRole === 'path').map(context => `/:${context.idFieldRef || lowerCamel(context.businessObject) + 'Id'}`).join('');
    if (focused) previews.push({ label: scenario.title, url: `${base}${pagePath}/${lowerCamel(scenario.scenarioId)}${focused}` });
  });
  return previews;
}

function normalizeWorkspace(value: unknown): Ns4E8SkeletonWorkspace { const root = record(value); return { workspaceId: text(root.workspaceId), kind: root.kind === 'hub' ? 'hub' : 'place', title: text(root.title), description: text(root.description), ...(text(root.anchorEntity) ? { anchorEntity: text(root.anchorEntity) } : {}), profileRefs: strings(root.profileRefs), featureRefs: strings(root.featureRefs), hostedStepRefs: strings(root.hostedStepRefs), useCaseIds: strings(root.useCaseIds), commandEntityRefs: array(root.commandEntityRefs).map(item => { const command = record(item); return { useCaseId: text(command.useCaseId), entityRefs: strings(command.entityRefs) }; }), pageContext: array(root.pageContext).map(item => normalizeRoutedContext(item, 'path', 'externalEntry')), slices: array(root.slices).map(item => { const slice = record(item); return { sliceId: text(slice.sliceId), useCaseId: text(slice.useCaseId), entityRefs: strings(slice.entityRefs), ...(slice.optional === true ? { optional: true } : {}) }; }), scenarios: array(root.scenarios).map(item => { const scenario = record(item); const selectedSurface = surface(scenario.surface); return { scenarioId: text(scenario.scenarioId), kind: scenarioKind(scenario.kind), title: text(scenario.title), description: text(scenario.description), stepRefs: strings(scenario.stepRefs), useCaseIds: strings(scenario.useCaseIds), authorityRefs: strings(scenario.authorityRefs), selectionContexts: array(scenario.selectionContexts).map(item => normalizeRoutedContext(item, 'selection', 'systemDefault')), ...(selectedSurface ? { surface: selectedSurface } : {}), ...(text(scenario.surfaceJustification) ? { surfaceJustification: text(scenario.surfaceJustification) } : {}) }; }) }; }
function normalizeMenu(value: unknown): Ns4E8SkeletonReview['menu'] { const root = record(value); return { headerLinks: strings(root.headerLinks), sections: array(root.sections).map(item => { const section = record(item); return { sectionId: text(section.sectionId), label: text(section.label), featureRef: text(section.featureRef), workspaceIds: strings(section.workspaceIds) }; }), landings: array(root.landings).map(item => { const landing = record(item); return { profileRef: text(landing.profileRef), workspaceId: text(landing.workspaceId), scenarioId: text(landing.scenarioId) }; }) }; }
function normalizeContext(value: unknown): Ns4WorkspaceContext { const context = record(value); return { contextId: text(context.contextId), businessObject: text(context.businessObject), cardinality: context.cardinality === 'many' ? 'many' : 'one', required: context.required === true, ...(text(context.idFieldRef) ? { idFieldRef: text(context.idFieldRef) } : {}) }; }
function normalizeRoutedContext(value: unknown, fallbackRole: Ns4WorkspaceUrlRole, fallbackSource: Ns4WorkspaceUrlRoleSource): Ns4WorkspaceRoutedContext { const context = record(value); return { ...normalizeContext(context), urlRole: context.urlRole === 'path' || context.urlRole === 'selection' ? context.urlRole : fallbackRole, urlRoleSource: urlRoleSource(context.urlRoleSource) || fallbackSource, ...(text(context.urlRoleJustification) ? { urlRoleJustification: text(context.urlRoleJustification) } : {}) }; }
function normalizeUrlRoleDecision(value: unknown): Ns4E8UrlRoleDecision { const item = record(value); return { workspaceId: text(item.workspaceId), scenarioId: text(item.scenarioId), contextId: text(item.contextId), defaultUrlRole: 'selection', urlRole: item.urlRole === 'path' ? 'path' : 'selection', justification: text(item.justification), decidedBy: item.decidedBy === 'llm' || item.decidedBy === 'system' ? item.decidedBy : 'pending' }; }
function normalizeSystemDecision(value: unknown): Ns4SystemDecision | null { const item = record(value); const chosen = text(item.chosen); if (!text(item.findingRef) || !chosen) return null; return { decisionId: text(item.decisionId) || text(item.findingRef), stage: text(item.stage), question: text(item.question), chosen, alternatives: strings(item.alternatives), decidedBy: 'system', findingRef: text(item.findingRef), changeHint: text(item.changeHint) }; }
function normalizeFieldRef(value: unknown): Ns4WorkspaceFieldRef { const field = record(value); return { entityId: text(field.entityId), fieldId: text(field.fieldId), label: text(field.label) }; }
function uniqueContexts(items: Ns4WorkspaceContext[]): Ns4WorkspaceContext[] { const map = new Map(items.map(item => [item.contextId, item])); return [...map.values()].sort((left, right) => left.contextId.localeCompare(right.contextId)); }
function uniqueRoutedContexts(items: Ns4WorkspaceRoutedContext[]): Ns4WorkspaceRoutedContext[] { const map = new Map(items.map(item => [item.contextId, item])); return [...map.values()].sort((left, right) => left.contextId.localeCompare(right.contextId)); }
function routeContext(context: Ns4WorkspaceContext, urlRole: Ns4WorkspaceUrlRole, urlRoleSource: Ns4WorkspaceUrlRoleSource, urlRoleJustification = ''): Ns4WorkspaceRoutedContext { return { ...context, urlRole, urlRoleSource, ...(urlRoleJustification ? { urlRoleJustification } : {}) }; }
function unique(items: string[]): string[] { return [...new Set(items.filter(Boolean))].sort(); }
function strings(value: unknown): string[] { return Array.isArray(value) ? unique(value.map(text)) : []; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function integer(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback; }
function lowerCamel(value: string): string { return value ? value.slice(0, 1).toLowerCase() + value.slice(1) : 'workspace'; }
function upperCamel(value: string): string { return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : 'Scenario'; }
function humanize(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase()); }
function scenarioKind(value: unknown): Ns4WorkspaceScenarioKind { return ['collection', 'record', 'list', 'detail', 'form', 'review', 'queue'].includes(text(value)) ? text(value) as Ns4WorkspaceScenarioKind : 'detail'; }
function surface(value: unknown): Ns4WorkspaceSurface | '' { return ['queueAction', 'contextualModal', 'batchAction'].includes(text(value)) ? text(value) as Ns4WorkspaceSurface : ''; }
function urlRoleSource(value: unknown): Ns4WorkspaceUrlRoleSource | '' { return ['hubAnchor', 'externalEntry', 'localSelection', 'focusedPath', 'ambiguous', 'llm', 'systemDefault'].includes(text(value)) ? text(value) as Ns4WorkspaceUrlRoleSource : ''; }
function pluralize(value: string): string { if (!value) return 'workspaces'; if (/s$/i.test(value)) return value; if (/[^aeiou]y$/i.test(value)) return value.slice(0, -1) + 'ies'; return value + 's'; }
function decisionId(prefix: string, ...parts: string[]): string { return prefix + parts.map(part => part.replace(/[^A-Za-z0-9]+(.)?/g, (_match, next: string | undefined) => next ? next.toUpperCase() : '')).map(part => upperCamel(part)).join(''); }
