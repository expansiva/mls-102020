/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/siteMap.ts" enhancement="_blank"/>

// P7 (newSolution_14): the e6 SITE MAP — phase 1 of the two-phase journey map. The map is the
// permanent, human-approvable INDEX of the module: which workspaces (pages) exist, who lands where,
// how they connect. It owns id/title/actors/kind/operationIds/purpose; phase 2 (per-workspace detail)
// owns sections/organisms/bffCalls and must MATCH the map. The map absorbs the old navigation.defs.ts.
//
// Pure + dependency-light (only nsGate + nsActors + the pipeline hash) so it unit-tests without the
// libStor/DOM chain (same discipline as gate.ts — isRecord is local).

import { errorIssue, NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { readActors } from '/_102020_/l2/agentNewSolution/helpers/nsActors.js';
import { computeInputsHash } from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import { NS_WORKSPACE_KINDS, NsE6WorkspaceKind, NS_PUBLIC_ACTOR } from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const E6_SITEMAP_SCHEMA_VERSION = '2026-07-19-ns-e6-sitemap-v1';
export const E6_SITEMAP_NOTE = 'Site map (permanent page index) — workspaces, landings and advisory edges. Detail (sections/organisms/bffCalls) lives per-workspace under workspaces/.';

export interface NsE6SiteMapWorkspace {
  workspaceId: string;
  title: string;
  actors: string[];
  kind: NsE6WorkspaceKind;
  entity: string;
  workflowId?: string;
  operationIds: string[];
  purpose: string;
}

export interface NsE6SiteMapLanding {
  actorId: string;
  workspaceId: string;
  reason?: string;
}

export interface NsE6SiteMapEdge {
  from: string;
  to: string;
  operationId?: string;
  description?: string;
}

export interface NsE6SiteMapArtifact {
  schemaVersion: typeof E6_SITEMAP_SCHEMA_VERSION;
  moduleName: string;
  note: string;
  workspaces: NsE6SiteMapWorkspace[];
  landings: NsE6SiteMapLanding[];
  navigationEdges: NsE6SiteMapEdge[];
}

export interface E6SiteMapGateContext {
  moduleName: string;
  classificationWorkflowIds: string[];
  classificationOperationIds: string[];
  rosterActorIds: string[];
  entityIds: string[];
  nowCapabilityActorIds: string[];
  // Per-operation facts needed to DERIVE the workspace kind (owning workflow, kind, entity).
  operationOwnerWorkflow: Record<string, string | undefined>;
  operationKind: Record<string, string>;
  operationEntity: Record<string, string>;
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

export function prepareE6SiteMap(input: unknown, context: Pick<E6SiteMapGateContext, 'moduleName'>): NsE6SiteMapArtifact {
  const record = isRecord(input) ? input : {};
  const workspaces = Array.isArray(record.workspaces) ? record.workspaces.filter(isRecord) : [];
  const landings = Array.isArray(record.landings) ? record.landings.filter(isRecord) : [];
  const edges = Array.isArray(record.navigationEdges) ? record.navigationEdges.filter(isRecord) : [];
  return {
    schemaVersion: E6_SITEMAP_SCHEMA_VERSION,
    moduleName: context.moduleName,
    note: E6_SITEMAP_NOTE,
    workspaces: workspaces.map(workspace => {
      const workflowId = readString(workspace.workflowId);
      return {
        workspaceId: readString(workspace.workspaceId) || '',
        title: readString(workspace.title) || '',
        actors: readActors(workspace),
        kind: readEnum(workspace.kind, NS_WORKSPACE_KINDS, 'operation'),
        entity: readString(workspace.entity) || '',
        ...(workflowId ? { workflowId } : {}),
        operationIds: readStringArray(workspace.operationIds),
        // purpose is no longer schema-required (strict models — Grok — intermittently drop it from the
        // tool JSON even after reasoning it). Backfill from the title so downstream never sees empty.
        purpose: readString(workspace.purpose) || readString(workspace.title) || readString(workspace.workspaceId) || 'workspace',
      };
    }),
    landings: landings.map(landing => {
      const reason = readString(landing.reason);
      return {
        actorId: readString(landing.actorId) || '',
        workspaceId: readString(landing.workspaceId) || '',
        ...(reason ? { reason } : {}),
      };
    }),
    navigationEdges: edges.map(edge => {
      const operationId = readString(edge.operationId);
      const description = readString(edge.description);
      return {
        from: readString(edge.from) || '',
        to: readString(edge.to) || '',
        ...(operationId ? { operationId } : {}),
        ...(description ? { description } : {}),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// deterministic attach — the workspace kind + workflowId are DERIVED, never trusted from the LLM
// (same rules as the old deriveE6WorkspaceKinds/repairE6WorkflowIds, applied on the flat map).
// ---------------------------------------------------------------------------

export function deriveE6SiteMapKinds(artifact: NsE6SiteMapArtifact, context: E6SiteMapGateContext): NsE6SiteMapArtifact {
  for (const workspace of artifact.workspaces) {
    if (workspace.kind === 'landing') continue; // landing is LLM-declared, not derived from operations
    const ops = workspace.operationIds.filter(id => context.operationKind[id] !== undefined);
    if (ops.length === 0) continue;
    const hasWorkflowOp = ops.some(id => context.operationOwnerWorkflow[id]);
    if (hasWorkflowOp) { workspace.kind = 'workflow'; continue; }
    const ownKinds = new Set(ops.filter(id => context.operationEntity[id] === workspace.entity).map(id => context.operationKind[id]));
    const foreignReadOnly = ops.every(id => context.operationEntity[id] === workspace.entity || context.operationKind[id] === 'query' || context.operationKind[id] === 'view');
    if (ownKinds.has('create') && ownKinds.has('update') && foreignReadOnly) {
      workspace.kind = 'entityManagement';
      delete workspace.workflowId;
      continue;
    }
    workspace.kind = 'operation';
  }
  // Infer the workflowId for a workflow workspace when its ops resolve to exactly one owning workflow.
  for (const workspace of artifact.workspaces) {
    if (workspace.kind !== 'workflow' || workspace.workflowId) continue;
    const candidates = new Set(workspace.operationIds.map(id => context.operationOwnerWorkflow[id]).filter((id): id is string => !!id));
    if (candidates.size === 1) workspace.workflowId = [...candidates][0];
  }
  return artifact;
}

// ---------------------------------------------------------------------------
// invariants (phase-1 gate): a VALID PARTITION before spending the parallel detail calls
// ---------------------------------------------------------------------------

export function validateE6SiteMap(artifact: NsE6SiteMapArtifact, context: E6SiteMapGateContext): { artifact: NsE6SiteMapArtifact; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
  const workspaceIds = new Set<string>();
  const knownWorkflows = new Set(context.classificationWorkflowIds);
  const knownOperations = new Set(context.classificationOperationIds);
  const knownActors = new Set(context.rosterActorIds);
  const knownEntities = new Set(context.entityIds);
  const coveredOps = new Set<string>();

  for (const workspace of artifact.workspaces) {
    if (workspaceIds.has(workspace.workspaceId)) {
      issues.push(errorIssue('siteMap.workspace.id.duplicate', `duplicated workspaceId ${workspace.workspaceId}`, workspace.workspaceId));
    }
    workspaceIds.add(workspace.workspaceId);

    for (const operationId of workspace.operationIds) {
      if (!knownOperations.has(operationId)) {
        issues.push(errorIssue('siteMap.operation.unknown', `workspace ${workspace.workspaceId} lists unclassified operation ${operationId}`, workspace.workspaceId));
      } else {
        coveredOps.add(operationId);
      }
    }
    if (workspace.actors.length === 0) {
      issues.push(errorIssue('siteMap.actors.empty', `workspace ${workspace.workspaceId} declares no actors`, workspace.workspaceId));
    }
    for (const actor of workspace.actors) {
      if (actor !== NS_PUBLIC_ACTOR && !knownActors.has(actor)) {
        issues.push(errorIssue('siteMap.actor.unknown', `workspace ${workspace.workspaceId}: actor ${actor} is not in the E4 roster`, workspace.workspaceId));
      }
    }
    // NOTE: the actor-coverage ⊇ check (workspace.actors ⊇ ∪ operation.actors) is enforced
    // authoritatively by validateE6Invariants at finalize, once the detail (bffCalls) is assembled.
    if (!knownEntities.has(workspace.entity)) {
      issues.push(errorIssue('siteMap.entity.unknown', `workspace ${workspace.workspaceId}: entity ${workspace.entity} is not a declared E3 entity`, workspace.workspaceId));
    }
    if (workspace.kind === 'workflow') {
      if (!workspace.workflowId) {
        issues.push(errorIssue('siteMap.workflow.missing', `workspace ${workspace.workspaceId} has kind "workflow" but declares no workflowId`, workspace.workspaceId));
      } else if (!knownWorkflows.has(workspace.workflowId)) {
        issues.push(errorIssue('siteMap.workflow.unknown', `workspace ${workspace.workspaceId} references unclassified workflow ${workspace.workflowId}`, workspace.workspaceId));
      }
    }
  }

  // A4.4 coverage: every classified operation appears in ≥1 workspace (a valid partition).
  for (const operationId of context.classificationOperationIds) {
    if (!coveredOps.has(operationId)) {
      issues.push(errorIssue('siteMap.operation.unassigned', `classified operation ${operationId} is in no workspace`, operationId));
    }
  }

  const landedActors = new Set<string>();
  for (const landing of artifact.landings) {
    if (!workspaceIds.has(landing.workspaceId)) {
      issues.push(errorIssue('siteMap.landing.workspace.unknown', `landing for ${landing.actorId} points to undeclared workspace ${landing.workspaceId}`, landing.actorId));
    }
    if (landing.actorId !== NS_PUBLIC_ACTOR && !knownActors.has(landing.actorId)) {
      issues.push(errorIssue('siteMap.landing.actor.unknown', `landing actor ${landing.actorId} is not in the E4 roster`, landing.actorId));
    }
    landedActors.add(landing.actorId);
  }
  for (const actorId of context.nowCapabilityActorIds) {
    if (!landedActors.has(actorId)) {
      issues.push(warningIssue('siteMap.actor.landing.missing', `actor ${actorId} owns now-priority behaviors but has no landing workspace`, actorId));
    }
  }
  for (const edge of artifact.navigationEdges) {
    if (!workspaceIds.has(edge.from) || !workspaceIds.has(edge.to)) {
      issues.push(warningIssue('siteMap.edge.workspace.unknown', `edge ${edge.from} -> ${edge.to} references an undeclared workspace`, `${edge.from}->${edge.to}`));
    }
  }

  return { artifact, issues };
}

// ---------------------------------------------------------------------------
// phase-2 helpers: the detail must MATCH its map slice; the slice hash powers incremental re-runs.
// ---------------------------------------------------------------------------

// The authority split (P7): the map owns workspaceId/title/actors/operationIds/kind; the detail file
// must repeat them EXACTLY. Any divergence is a gate error (a retry with the map slice in context).
export function validateE6WorkspaceEquality(
  detail: { workspaceId?: string; title?: string; actors?: string[]; kind?: string; operationIds?: string[] },
  slice: NsE6SiteMapWorkspace,
): NsGateIssue[] {
  const issues: NsGateIssue[] = [];
  const label = `workspace ${slice.workspaceId}`;
  if (detail.workspaceId !== slice.workspaceId) {
    issues.push(errorIssue('detail.workspaceId.mismatch', `${label}: detail workspaceId "${detail.workspaceId}" must equal the map "${slice.workspaceId}"`, slice.workspaceId));
  }
  if ((detail.title || '') !== slice.title) {
    issues.push(errorIssue('detail.title.mismatch', `${label}: detail title must equal the map "${slice.title}"`, slice.workspaceId));
  }
  if (detail.kind !== slice.kind) {
    issues.push(errorIssue('detail.kind.mismatch', `${label}: detail kind "${detail.kind}" must equal the map "${slice.kind}"`, slice.workspaceId));
  }
  if (!sameSet(detail.actors || [], slice.actors)) {
    issues.push(errorIssue('detail.actors.mismatch', `${label}: detail actors [${(detail.actors || []).join(', ')}] must equal the map [${slice.actors.join(', ')}]`, slice.workspaceId));
  }
  if (!sameSet(detail.operationIds || [], slice.operationIds)) {
    issues.push(errorIssue('detail.operationIds.mismatch', `${label}: detail operationIds [${(detail.operationIds || []).join(', ')}] must equal the map [${slice.operationIds.join(', ')}]`, slice.workspaceId));
  }
  return issues;
}

// Stable hash of a workspace's map slice — the detail file stamps it so an incremental re-run
// regenerates ONLY the workspaces whose slice changed (foundation of agentChangeSolution). Reuses the
// pipeline's key-order-stable hash (never hand-rolled).
export function computeE6WorkspaceSliceHash(slice: NsE6SiteMapWorkspace): string {
  return computeInputsHash({
    workspaceId: slice.workspaceId,
    title: slice.title,
    actors: [...slice.actors].sort(),
    kind: slice.kind,
    entity: slice.entity,
    workflowId: slice.workflowId || '',
    operationIds: [...slice.operationIds].sort(),
    purpose: slice.purpose,
  });
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every(item => setB.has(item));
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => readString(item)).filter((item): item is string => !!item) : [];
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}
