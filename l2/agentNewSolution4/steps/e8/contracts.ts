import type { Ns4E2Review, Ns4PolicyDecisionSelection } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import {
  deriveNs4Contexts, isNs4PlatformOwnedEntity, type Ns4DerivedContext,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Context.js';
import type { Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4UseCaseArtifactV3, Ns4WorkflowArtifactV2 } from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';


export interface Ns4E8HubScore {
  entityRef: string;
  score: number;
  anchoredJourneyCount: number;
  requiredRelationshipCount: number;
  projectionCount: number;
  locateUseCaseCount: number;
}

/** A workspace context is exactly the derived journey context; E8 never invents another shape. */
export type Ns4WorkspaceContext = Ns4DerivedContext;





/** The approved contracts every E8 derivation reads. */
export interface Ns4E8Sources {
  journeys: Ns4E2Review;
  access: Ns4E3Review;
  ontology: Ns4E4Review;
  useCases: Ns4UseCaseArtifactV3[];
  workflows: Ns4WorkflowArtifactV2[];
  policyDecisionSelections?: Ns4PolicyDecisionSelection[];
}

export interface Ns4E8Edge {
  from: string;
  to: string;
  carries: string[];
  preferredFromJourneyRef?: string;
}




export function deriveE8HubScore(sources: Ns4E8Sources, derived = deriveNs4Contexts(sources)): Ns4E8HubScore[] {
  const journeysByEntity = new Map<string, Set<string>>();
  for (const step of derived.steps) {
    if (!step.entity) continue;
    journeysByEntity.set(step.entity, new Set([...(journeysByEntity.get(step.entity) || []), step.journeyId]));
  }
  const results = sources.ontology.entities
    .filter(entity => !isPlatformOwnedEntity(entity))
    .map(entity => {
      const anchoredJourneyIds = journeysByEntity.get(entity.entityId) || new Set<string>();
      const requiredRelationshipCount = sources.ontology.relationships
        .filter(relationship => relationship.required && relationship.toEntity === entity.entityId).length;
      const projectionCount = sources.ontology.entities.filter(candidate => candidate.kind === 'projection'
        && candidate.sourceRefs.journeyIds.some(id => anchoredJourneyIds.has(id))).length;
      const locateUseCaseCount = derived.steps.filter(step => step.kind === 'locate' && step.entity === entity.entityId).length;
      const anchoredJourneyCount = anchoredJourneyIds.size;
      return { entityRef: entity.entityId, anchoredJourneyCount, requiredRelationshipCount, projectionCount, locateUseCaseCount,
        score: anchoredJourneyCount + requiredRelationshipCount + projectionCount + locateUseCaseCount };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entityRef.localeCompare(right.entityRef));
  return results;
}

/**
 * The hub is the entity the module structurally revolves around. A clear score dominance decides it;
 * when derived scores are too flat to separate, the strict maximum of incoming required relationships
 * still names one anchor, because a module without a hub degenerates into single-scenario workspaces.
 */
function selectHubEntity(ranking: Ns4E8HubScore[]): string {
  const first = ranking[0];
  if (!first || first.score <= 0) return '';
  const secondScore = ranking[1]?.score || 0;
  if (secondScore === 0 || first.score >= secondScore * 2) return first.entityRef;
  const byRelationship = [...ranking].sort((left, right) => right.requiredRelationshipCount - left.requiredRelationshipCount
    || right.score - left.score || left.entityRef.localeCompare(right.entityRef));
  const [best, runnerUp] = byRelationship;
  return best.requiredRelationshipCount > 0 && best.requiredRelationshipCount > (runnerUp?.requiredRelationshipCount || 0)
    ? best.entityRef : '';
}


export function isPlatformOwnedEntity(entity: Ns4E4Review['entities'][number]): boolean {
  return isNs4PlatformOwnedEntity(entity);
}



/**
 * Compile-only compatibility for workspaces written by the previous E8 model (runs 38-44). They are
 * never read or migrated — the union exists so already-generated L4 folders keep type-checking.
 */
export interface Ns4WorkspaceArtifact {
  schemaVersion: string;
  moduleName: string;
  workspaceId: string;
  kind: string;
  title: string;
  description: string;
  anchorEntity?: string;
  profileRefs: string[];
  pageContext: Array<Record<string, unknown>>;
  scenarios: Array<Record<string, unknown>>;
  viewCall: { uses: Array<Record<string, unknown>> };
  commands: string[];
  invalidations: Array<{ useCaseId: string; sliceIds: string[] }>;
  skeletonHash: string;
  workspaceHash: string;
}

export interface Ns4WorkspaceIndex {
  schemaVersion: string;
  moduleName: string;
  userLanguage: string;
  workspaces: Array<Record<string, unknown>>;
  hubs: Array<Record<string, unknown>>;
  menu: Record<string, unknown>;
  skeletonHash: string;
  systemDecisions: Array<Record<string, unknown>>;
  approvedBy: string;
  approvedAt: string;
}
