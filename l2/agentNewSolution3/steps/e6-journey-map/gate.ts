/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e6-journey-map/gate.ts" enhancement="_blank"/>

import { errorIssue, Ns3GateIssue, warningIssue } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import { isRecord } from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';

export const E6_JOURNEY_MAP_SCHEMA_VERSION = '2026-07-07-ns3-e6-v1';

// Deterministic note attached after the LLM call (never produced by the model).
export const E6_JOURNEY_MAP_NOTE = 'Consolidated navigation map derived from workflows/operations stories (view, not source).';

export const NS3_WORKSPACE_KINDS = ['workflow', 'operation'] as const;

export type Ns3E6WorkspaceKind = typeof NS3_WORKSPACE_KINDS[number];

// Consumer contract (agentChangeFrontend/cfeCreateShared.ts): workspaces are the
// page-grouping unit — one page per workspace; the fields read are exactly
// workspaceId, title, actor, kind, entity, workflowId, operationIds, purpose.
export interface Ns3E6Workspace {
  workspaceId: string;
  title: string;
  actor: string;
  kind: Ns3E6WorkspaceKind;
  entity: string;
  workflowId?: string;
  operationIds: string[];
  purpose: string;
}

export interface Ns3E6Landing {
  actorId: string;
  workspaceId: string;
  reason?: string;
}

// Advisory for Stage 2 (warnings only, never machine-enforced navigation).
export interface Ns3E6NavigationEdge {
  from: string;
  to: string;
  operationId?: string;
  description?: string;
}

export interface Ns3E6JourneyMapArtifact {
  schemaVersion: typeof E6_JOURNEY_MAP_SCHEMA_VERSION;
  moduleName: string;
  note: string;
  workspaces: Ns3E6Workspace[];
  landings: Ns3E6Landing[];
  navigationEdges: Ns3E6NavigationEdge[];
}

export interface E6GateContext {
  moduleName: string;
  classificationWorkflowIds: string[];
  classificationOperationIds: string[];
  rosterActorIds: string[];
  entityIds: string[];
  nowCapabilityActorIds: string[];
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

export function prepareE6JourneyMap(input: unknown, context: Pick<E6GateContext, 'moduleName'>): Ns3E6JourneyMapArtifact {
  const record = isRecord(input) ? input : {};
  const workspaces = Array.isArray(record.workspaces) ? record.workspaces.filter(isRecord) : [];
  const landings = Array.isArray(record.landings) ? record.landings.filter(isRecord) : [];
  const edges = Array.isArray(record.navigationEdges) ? record.navigationEdges.filter(isRecord) : [];
  return {
    schemaVersion: E6_JOURNEY_MAP_SCHEMA_VERSION,
    moduleName: context.moduleName,
    note: E6_JOURNEY_MAP_NOTE,
    workspaces: workspaces.map(workspace => {
      const workflowId = readString(workspace.workflowId);
      return {
        workspaceId: readString(workspace.workspaceId) || '',
        title: readString(workspace.title) || '',
        actor: readString(workspace.actor) || '',
        kind: readEnum(workspace.kind, NS3_WORKSPACE_KINDS, 'operation'),
        entity: readString(workspace.entity) || '',
        ...(workflowId ? { workflowId } : {}),
        operationIds: readStringArray(workspace.operationIds),
        purpose: readString(workspace.purpose) || '',
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
// invariants
// ---------------------------------------------------------------------------

export function validateE6Invariants(
  artifact: Ns3E6JourneyMapArtifact,
  context: E6GateContext,
): { artifact: Ns3E6JourneyMapArtifact; issues: Ns3GateIssue[] } {
  const issues: Ns3GateIssue[] = [];
  const workspaceIds = new Set<string>();
  const knownWorkflows = new Set(context.classificationWorkflowIds);
  const knownOperations = new Set(context.classificationOperationIds);
  const knownActors = new Set(context.rosterActorIds);
  const knownEntities = new Set(context.entityIds);
  const assignedOperations = new Set<string>();

  for (const workspace of artifact.workspaces) {
    if (workspaceIds.has(workspace.workspaceId)) {
      issues.push(errorIssue('workspace.id.duplicate', `duplicated workspaceId ${workspace.workspaceId}`, workspace.workspaceId));
    }
    workspaceIds.add(workspace.workspaceId);
    for (const operationId of workspace.operationIds) {
      if (!knownOperations.has(operationId)) {
        issues.push(errorIssue('workspace.operation.unknown', `workspace ${workspace.workspaceId} references unclassified operation ${operationId}`, workspace.workspaceId));
      }
      assignedOperations.add(operationId);
    }
    if (workspace.kind === 'workflow') {
      if (!workspace.workflowId) {
        issues.push(errorIssue('workspace.workflow.missing', `workspace ${workspace.workspaceId} has kind "workflow" but declares no workflowId`, workspace.workspaceId));
      } else if (!knownWorkflows.has(workspace.workflowId)) {
        issues.push(errorIssue('workspace.workflow.unknown', `workspace ${workspace.workspaceId} references unclassified workflow ${workspace.workflowId}`, workspace.workspaceId));
      }
    }
    if (!knownActors.has(workspace.actor)) {
      issues.push(errorIssue('workspace.actor.unknown', `workspace ${workspace.workspaceId}: actor ${workspace.actor} is not in the E4 roster`, workspace.workspaceId));
    }
    if (!knownEntities.has(workspace.entity)) {
      issues.push(errorIssue('workspace.entity.unknown', `workspace ${workspace.workspaceId}: entity ${workspace.entity} is not a declared E3 entity`, workspace.workspaceId));
    }
  }

  for (const operationId of context.classificationOperationIds) {
    if (!assignedOperations.has(operationId)) {
      issues.push(errorIssue('operation.unassigned', `classified operation ${operationId} does not appear in any workspace`, operationId));
    }
  }

  const landedActors = new Set<string>();
  for (const landing of artifact.landings) {
    if (!workspaceIds.has(landing.workspaceId)) {
      issues.push(errorIssue('landing.workspace.unknown', `landing for ${landing.actorId} points to undeclared workspace ${landing.workspaceId}`, landing.actorId));
    }
    if (!knownActors.has(landing.actorId)) {
      issues.push(errorIssue('landing.actor.unknown', `landing actor ${landing.actorId} is not in the E4 roster`, landing.actorId));
    }
    landedActors.add(landing.actorId);
  }
  for (const actorId of context.nowCapabilityActorIds) {
    if (!landedActors.has(actorId)) {
      issues.push(warningIssue('actor.landing.missing', `actor ${actorId} owns now-priority behaviors but has no landing workspace`, actorId));
    }
  }

  for (const edge of artifact.navigationEdges) {
    if (!workspaceIds.has(edge.from) || !workspaceIds.has(edge.to)) {
      issues.push(warningIssue('edge.workspace.unknown', `edge ${edge.from} -> ${edge.to} references an undeclared workspace`, `${edge.from}->${edge.to}`));
    }
  }

  return { artifact, issues };
}

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------

export function renderE6Markdown(
  artifact: Ns3E6JourneyMapArtifact,
  options: { generatedAt?: string } = {},
): string {
  const lines: string[] = [];
  lines.push(`# E6 — Journey map: ${artifact.moduleName}`);
  lines.push('');
  lines.push(`- module: \`${artifact.moduleName}\``);
  lines.push(`- workspaces: ${artifact.workspaces.length} / landings: ${artifact.landings.length} / edges: ${artifact.navigationEdges.length}`);
  if (options.generatedAt) lines.push(`- generatedAt: ${options.generatedAt}`);
  lines.push(`- ${artifact.note}`);
  lines.push('');
  lines.push('## Workspaces by actor');
  lines.push('');
  const actors = [...new Set(artifact.workspaces.map(workspace => workspace.actor))];
  for (const actor of actors) {
    lines.push(`### ${actor}`);
    lines.push('');
    for (const workspace of artifact.workspaces.filter(item => item.actor === actor)) {
      const workflow = workspace.workflowId ? ` — workflow \`${workspace.workflowId}\`` : '';
      lines.push(`- \`${workspace.workspaceId}\` (${workspace.kind}, ${workspace.entity})${workflow}: ${workspace.title} — ${workspace.purpose}`);
      lines.push(`  - operations: ${workspace.operationIds.map(id => `\`${id}\``).join(', ')}`);
    }
    lines.push('');
  }
  lines.push('## Landings');
  lines.push('');
  for (const landing of artifact.landings) {
    const reason = landing.reason ? ` — ${landing.reason}` : '';
    lines.push(`- ${landing.actorId} → \`${landing.workspaceId}\`${reason}`);
  }
  lines.push('');
  lines.push('## Navigation edges (advisory)');
  lines.push('');
  for (const edge of artifact.navigationEdges) {
    const operation = edge.operationId ? ` via \`${edge.operationId}\`` : '';
    const description = edge.description ? ` — ${edge.description}` : '';
    lines.push(`- \`${edge.from}\` → \`${edge.to}\`${operation}${description}`);
  }
  if (artifact.navigationEdges.length === 0) lines.push('- (none)');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => readString(item)).filter((item): item is string => !!item)
    : [];
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}
