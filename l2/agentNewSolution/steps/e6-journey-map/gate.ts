/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.ts" enhancement="_blank"/>

import { errorIssue, NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { readActors } from '/_102020_/l2/agentNewSolution/helpers/nsActors.js';

// isRecord is a leaf type-guard defined locally (not imported from nsFs) so this gate — and its
// unit test — stay free of the libStor/libModel import chain, which touches DOM globals at init.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const E6_JOURNEY_MAP_SCHEMA_VERSION = '2026-07-18-ns-e6-v4';

// Deterministic note attached after the LLM call (never produced by the model).
export const E6_JOURNEY_MAP_NOTE = 'Consolidated navigation map derived from workflows/operations stories (view, not source).';

// Canonical workspace kinds — the consumer (Stage 2 template selection) depends on this enum:
// 'entityManagement' selects list-first CRUD templates (tabular_classic); 'workflow' selects
// process/queue templates; 'operation' is the residual (dashboards, reports, commands).
export const NS_WORKSPACE_KINDS = ['workflow', 'operation', 'entityManagement', 'landing'] as const;

export type NsE6WorkspaceKind = typeof NS_WORKSPACE_KINDS[number];

// 'public' is a pseudo-actor for pre-login landings (D6/D7): it is NOT in the E4 roster and is exempt
// from the roster check and the ⊇ actor-union math.
export const NS_PUBLIC_ACTOR = 'public';

// Organism role enum — the LLM CLASSIFIES and ANCHORS operations into these roles; it never
// designs structure. Stage 2 (create-layout) reads the role to place each operation on the page.
//   primarySurface   — the section's main surface (list/queue/board); exactly 1 per section
//   filterControl    — refines a surface (search/filter); MUST declare attachTo = the surface op
//   contextualAction — a command launched from the surface (e.g. createReservation)
//   detailPanel      — a getById read shown as a side/detail panel
//   batchAction      — a command over a multi-selection (or with no public input)
//   navigationEntry  — a link/entry point to another workspace
export const NS_ORGANISM_ROLES = [
  'primarySurface', 'filterControl', 'contextualAction', 'detailPanel', 'batchAction', 'navigationEntry',
  // content roles (D7) — for landing pages; only `showcase` is backed by an operation (a query).
  'hero', 'banner', 'richText', 'imageSet', 'ctaLink', 'showcase',
] as const;

export type NsE6OrganismRole = typeof NS_ORGANISM_ROLES[number];

// Roles that MUST carry a real operationId (JSON `required` cannot express this conditionally, so the
// gate enforces it — otherwise making operationId optional for content roles would silently let a real
// primarySurface drop its operationId). `showcase` is operation-backed (a query); the pure content
// roles below carry NO operationId. navigationEntry links to an operation surfaced on another page.
const NS_OPERATION_BACKED_ROLES = new Set<NsE6OrganismRole>([
  'primarySurface', 'filterControl', 'contextualAction', 'detailPanel', 'batchAction', 'navigationEntry', 'showcase',
]);
const NS_CONTENT_ROLES = new Set<NsE6OrganismRole>(['hero', 'banner', 'richText', 'imageSet', 'ctaLink']);

export interface NsE6Organism {
  operationId?: string; // absent for pure content roles (hero/banner/richText/imageSet/ctaLink)
  role: NsE6OrganismRole;
  attachTo?: string; // required when role === 'filterControl': the primarySurface operationId it refines
}

export interface NsE6Section {
  sectionId: string;
  intent: string;
  organisms: NsE6Organism[];
}

// Consumer contract (agentChangeFrontend/helpers/.ts): workspaces are the page-grouping unit —
// one page per workspace. The page composition lives in `sections` (LLM source of truth);
// `operationIds` is DERIVED by code (flattened from the organisms) so existing consumers and
// the e7 coverage/capability checks keep reading the same flat field.
export interface NsE6Workspace {
  workspaceId: string;
  title: string;
  actors: string[];
  kind: NsE6WorkspaceKind;
  entity: string;
  workflowId?: string;
  sections: NsE6Section[];
  operationIds: string[];
  purpose: string;
}

export interface NsE6Landing {
  actorId: string;
  workspaceId: string;
  reason?: string;
}

// Advisory for Stage 2 (warnings only, never machine-enforced navigation).
export interface NsE6NavigationEdge {
  from: string;
  to: string;
  operationId?: string;
  description?: string;
}

export interface NsE6JourneyMapArtifact {
  schemaVersion: typeof E6_JOURNEY_MAP_SCHEMA_VERSION;
  moduleName: string;
  note: string;
  workspaces: NsE6Workspace[];
  landings: NsE6Landing[];
  navigationEdges: NsE6NavigationEdge[];
}

// Per-operation facts needed by the deterministic organism gates (detailPanel/batchAction). Built
// once from the frozen operation defs and passed in — the gate never reads disk (keeps it unit-testable).
export interface NsE6OperationFact {
  accessPatternKind: 'list' | 'getById' | 'lookup' | 'commandInput';
  selection: 'none' | 'single' | 'multiple';
  opKind: 'create' | 'update' | 'delete' | 'query' | 'view';
  hasPublicInput: boolean; // has an input whose source is userInput | selectedEntity | routeParam
  actors: string[]; // D6: the actors this operation serves (read tolerant of the old singular `actor`)
}

export interface E6GateContext {
  moduleName: string;
  classificationWorkflowIds: string[];
  classificationOperationIds: string[];
  rosterActorIds: string[];
  entityIds: string[];
  nowCapabilityActorIds: string[];
  operationFacts: Record<string, NsE6OperationFact>;
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

// workflowId is DERIVABLE from the classification (each operation knows its owning workflow), and
// the LLM systematically omits it (cafeFlow run: both attempts failed 'workspace.workflow.missing').
// Deterministic repair, per the "derivable values are attached by code" convention: for a
// kind='workflow' workspace without workflowId, infer it when its operations resolve to exactly ONE
// owning workflow. Ambiguity (0 or >1 candidates) is left for the gate to report.
export function repairE6WorkflowIds(
  artifact: NsE6JourneyMapArtifact,
  classification: {
    workflows: { workflowId: string; operationIds: string[] }[];
    operations: { operationId: string; workflowId?: string }[];
  },
): NsE6JourneyMapArtifact {
  const ownerByOperation = new Map<string, string>();
  for (const workflow of classification.workflows) {
    for (const operationId of workflow.operationIds) ownerByOperation.set(operationId, workflow.workflowId);
  }
  for (const operation of classification.operations) {
    if (operation.workflowId) ownerByOperation.set(operation.operationId, operation.workflowId);
  }
  for (const workspace of artifact.workspaces) {
    if (workspace.kind !== 'workflow' || workspace.workflowId) continue;
    const candidates = new Set(
      workspace.operationIds
        .map(operationId => ownerByOperation.get(operationId))
        .filter((workflowId): workflowId is string => !!workflowId),
    );
    if (candidates.size === 1) workspace.workflowId = [...candidates][0];
  }
  return artifact;
}

// The workspace kind is DERIVABLE from the classification facts — never trusted from the LLM
// (the 102051 run labeled entity CRUDs as "workflow", which rejected the list-first CRUD template
// downstream by construction). Deterministic rule, applied after the LLM call:
//   1. any operation owned by a workflow                     -> 'workflow'
//   2. all standalone, create AND update on the workspace
//      entity, other-entity operations read-only (query/view
//      side lists like low-stock alerts don't demote a
//      management page)                                      -> 'entityManagement'
//   3. otherwise                                             -> 'operation'
export function deriveE6WorkspaceKinds(
  artifact: NsE6JourneyMapArtifact,
  classification: {
    workflows: { workflowId: string; operationIds: string[] }[];
    operations: { operationId: string; workflowId?: string; kind?: string; entity?: string }[];
  },
): NsE6JourneyMapArtifact {
  const ownerByOperation = new Map<string, string>();
  for (const workflow of classification.workflows) {
    for (const operationId of workflow.operationIds) ownerByOperation.set(operationId, workflow.workflowId);
  }
  const byId = new Map(classification.operations.map(operation => [operation.operationId, operation]));
  for (const operation of classification.operations) {
    if (operation.workflowId) ownerByOperation.set(operation.operationId, operation.workflowId);
  }

  for (const workspace of artifact.workspaces) {
    if (workspace.kind === 'landing') continue; // D7: landing is LLM-declared, not derived from operations
    const operations = workspace.operationIds
      .map(operationId => byId.get(operationId))
      .filter((operation): operation is NonNullable<typeof operation> => !!operation);
    if (operations.length === 0) continue; // unknown operations: left for the gate to report

    const hasWorkflowOperation = workspace.operationIds.some(operationId => ownerByOperation.has(operationId));
    if (hasWorkflowOperation) {
      workspace.kind = 'workflow';
      continue;
    }

    const ownKinds = new Set(operations.filter(operation => operation.entity === workspace.entity).map(operation => operation.kind));
    const foreignOpsReadOnly = operations.every(operation =>
      operation.entity === workspace.entity || operation.kind === 'query' || operation.kind === 'view');
    if (ownKinds.has('create') && ownKinds.has('update') && foreignOpsReadOnly) {
      workspace.kind = 'entityManagement';
      delete workspace.workflowId; // management pages never bind to a workflow
      continue;
    }

    workspace.kind = 'operation';
  }
  return artifact;
}

export function prepareE6JourneyMap(input: unknown, context: Pick<E6GateContext, 'moduleName'>): NsE6JourneyMapArtifact {
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
      const sections = readSections(workspace.sections);
      return {
        workspaceId: readString(workspace.workspaceId) || '',
        title: readString(workspace.title) || '',
        actors: readActors(workspace),
        kind: readEnum(workspace.kind, NS_WORKSPACE_KINDS, 'operation'),
        entity: readString(workspace.entity) || '',
        ...(workflowId ? { workflowId } : {}),
        sections,
        // Derived from the organisms (source of truth = sections). First occurrence wins, order preserved.
        operationIds: deriveOperationIds(sections),
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
  artifact: NsE6JourneyMapArtifact,
  context: E6GateContext,
): { artifact: NsE6JourneyMapArtifact; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
  const workspaceIds = new Set<string>();
  const knownWorkflows = new Set(context.classificationWorkflowIds);
  const knownOperations = new Set(context.classificationOperationIds);
  const knownActors = new Set(context.rosterActorIds);
  const knownEntities = new Set(context.entityIds);
  // Global organism coverage: each classified operation must be covered by EXACTLY ONE organism.
  const organismCount = new Map<string, number>();

  for (const workspace of artifact.workspaces) {
    if (workspaceIds.has(workspace.workspaceId)) {
      issues.push(errorIssue('workspace.id.duplicate', `duplicated workspaceId ${workspace.workspaceId}`, workspace.workspaceId));
    }
    workspaceIds.add(workspace.workspaceId);
    const workspaceActorUnion = new Set<string>(); // D6: ∪ of the owned operations' actors

    if (workspace.sections.length === 0) {
      issues.push(errorIssue('workspace.sections.empty', `workspace ${workspace.workspaceId} declares no sections`, workspace.workspaceId));
    }
    for (const section of workspace.sections) {
      const surfaceOps = new Set(
        section.organisms.filter(organism => organism.role === 'primarySurface').map(organism => organism.operationId),
      );
      // Exactly 1 primarySurface per section — EXCEPT landing pages (D7: a landing dispenses
      // operations, its sections are content organisms with no primarySurface).
      if (workspace.kind !== 'landing' && surfaceOps.size !== 1) {
        issues.push(errorIssue('section.primarySurface.count', `workspace ${workspace.workspaceId} section ${section.sectionId} must declare exactly 1 primarySurface, found ${surfaceOps.size}`, workspace.workspaceId));
      }
      for (const organism of section.organisms) {
        const opId = organism.operationId;
        const hasOp = !!opId;
        const operationBacked = NS_OPERATION_BACKED_ROLES.has(organism.role);
        // operationId presence is role-dependent (JSON `required` can't express this): operation-backed
        // roles need one, pure content organisms must not carry one.
        if (operationBacked && !hasOp) {
          issues.push(errorIssue('organism.operationId.missing', `workspace ${workspace.workspaceId} section ${section.sectionId}: role "${organism.role}" requires an operationId`, workspace.workspaceId));
        }
        if (!operationBacked && hasOp) {
          issues.push(errorIssue('organism.operationId.unexpected', `workspace ${workspace.workspaceId} section ${section.sectionId}: content role "${organism.role}" must not carry an operationId (${organism.operationId})`, workspace.workspaceId));
        }
        // Content organisms only belong on landing pages (D7).
        if (NS_CONTENT_ROLES.has(organism.role) && workspace.kind !== 'landing') {
          issues.push(errorIssue('content.role.notLanding', `workspace ${workspace.workspaceId}: content role "${organism.role}" is only allowed on a landing page`, workspace.workspaceId));
        }
        if (opId && !knownOperations.has(opId)) {
          issues.push(errorIssue('workspace.operation.unknown', `workspace ${workspace.workspaceId} section ${section.sectionId} references unclassified operation ${opId}`, workspace.workspaceId));
        }
        // Coverage + actor union count only OWNED operations (operationId present, role ≠ navigationEntry
        // link). navigationEntry and pure content organisms are excluded. 'public' is a pseudo-actor and
        // never enters the ⊇ union (a public op needs no explicit actor coverage).
        const fact = opId ? context.operationFacts[opId] : undefined;
        if (opId && organism.role !== 'navigationEntry') {
          organismCount.set(opId, (organismCount.get(opId) || 0) + 1);
          for (const actor of fact?.actors || []) if (actor !== NS_PUBLIC_ACTOR) workspaceActorUnion.add(actor);
        }
        if (organism.role === 'showcase') {
          if (!fact) {
            issues.push(errorIssue('organism.fact.missing', `workspace ${workspace.workspaceId}: no operation def facts for showcase ${organism.operationId}`, workspace.workspaceId));
          } else if (fact.opKind !== 'query' && fact.opKind !== 'view') {
            issues.push(errorIssue('showcase.notQuery', `workspace ${workspace.workspaceId}: showcase ${organism.operationId} must be a read-only query (kind=${fact.opKind})`, workspace.workspaceId));
          }
        }

        if (organism.role === 'filterControl') {
          if (!organism.attachTo) {
            issues.push(errorIssue('filterControl.attachTo.missing', `workspace ${workspace.workspaceId}: filterControl ${organism.operationId} declares no attachTo`, workspace.workspaceId));
          } else if (!surfaceOps.has(organism.attachTo)) {
            issues.push(errorIssue('filterControl.attachTo.invalid', `workspace ${workspace.workspaceId}: filterControl ${organism.operationId} attaches to ${organism.attachTo}, which is not a primarySurface in section ${section.sectionId}`, workspace.workspaceId));
          }
        }
        if (organism.role === 'detailPanel') {
          if (!fact) {
            issues.push(errorIssue('organism.fact.missing', `workspace ${workspace.workspaceId}: no operation def facts for detailPanel ${organism.operationId}`, workspace.workspaceId));
          } else if (fact.accessPatternKind !== 'getById') {
            issues.push(errorIssue('detailPanel.notGetById', `workspace ${workspace.workspaceId}: detailPanel ${organism.operationId} is accessPattern "${fact.accessPatternKind}", must be "getById"`, workspace.workspaceId));
          }
        }
        if (organism.role === 'batchAction') {
          if (!fact) {
            issues.push(errorIssue('organism.fact.missing', `workspace ${workspace.workspaceId}: no operation def facts for batchAction ${organism.operationId}`, workspace.workspaceId));
          } else {
            const isCommand = fact.opKind === 'create' || fact.opKind === 'update' || fact.opKind === 'delete';
            const eligible = isCommand && (fact.selection === 'multiple' || !fact.hasPublicInput);
            if (!eligible) {
              issues.push(errorIssue('batchAction.invalid', `workspace ${workspace.workspaceId}: batchAction ${organism.operationId} must be a command over a multiple selection or with no public input (kind=${fact.opKind}, selection=${fact.selection}, publicInput=${fact.hasPublicInput})`, workspace.workspaceId));
            }
          }
        }
      }
    }
    if (workspace.kind === 'workflow') {
      if (!workspace.workflowId) {
        issues.push(errorIssue('workspace.workflow.missing', `workspace ${workspace.workspaceId} has kind "workflow" but declares no workflowId`, workspace.workspaceId));
      } else if (!knownWorkflows.has(workspace.workflowId)) {
        issues.push(errorIssue('workspace.workflow.unknown', `workspace ${workspace.workspaceId} references unclassified workflow ${workspace.workflowId}`, workspace.workspaceId));
      }
    }
    if (workspace.kind === 'entityManagement' && workspace.workflowId) {
      issues.push(errorIssue('workspace.management.workflow', `workspace ${workspace.workspaceId} has kind "entityManagement" but declares workflowId ${workspace.workflowId} — management pages never bind to a workflow`, workspace.workspaceId));
    }
    if (workspace.actors.length === 0) {
      issues.push(errorIssue('workspace.actors.empty', `workspace ${workspace.workspaceId} declares no actors`, workspace.workspaceId));
    }
    for (const actor of workspace.actors) {
      if (actor !== NS_PUBLIC_ACTOR && !knownActors.has(actor)) {
        issues.push(errorIssue('workspace.actor.unknown', `workspace ${workspace.workspaceId}: actor ${actor} is not in the E4 roster`, workspace.workspaceId));
      }
    }
    // D6 authorization gate: the workspace's actors must COVER every actor of the operations it hosts
    // (workspace.actors ⊇ ∪ operation.actors) — otherwise a login that can open the page could not run
    // one of its operations.
    const workspaceActors = new Set(workspace.actors);
    for (const actor of workspaceActorUnion) {
      if (!workspaceActors.has(actor)) {
        issues.push(errorIssue('workspace.actors.notCovering', `workspace ${workspace.workspaceId}: hosts an operation for actor "${actor}" not in the workspace actors [${workspace.actors.join(', ')}]`, workspace.workspaceId));
      }
    }
    if (!knownEntities.has(workspace.entity)) {
      issues.push(errorIssue('workspace.entity.unknown', `workspace ${workspace.workspaceId}: entity ${workspace.entity} is not a declared E3 entity`, workspace.workspaceId));
    }
  }

  for (const operationId of context.classificationOperationIds) {
    const count = organismCount.get(operationId) || 0;
    if (count === 0) {
      issues.push(errorIssue('operation.unassigned', `classified operation ${operationId} does not appear in any organism`, operationId));
    } else if (count > 1) {
      issues.push(errorIssue('operation.coverage.duplicate', `classified operation ${operationId} appears in ${count} organisms — each operation must be covered by exactly 1`, operationId));
    }
  }

  const landedActors = new Set<string>();
  for (const landing of artifact.landings) {
    if (!workspaceIds.has(landing.workspaceId)) {
      issues.push(errorIssue('landing.workspace.unknown', `landing for ${landing.actorId} points to undeclared workspace ${landing.workspaceId}`, landing.actorId));
    }
    if (landing.actorId !== NS_PUBLIC_ACTOR && !knownActors.has(landing.actorId)) {
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
  artifact: NsE6JourneyMapArtifact,
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
  const actors = [...new Set(artifact.workspaces.flatMap(workspace => workspace.actors))];
  for (const actor of actors) {
    lines.push(`### ${actor}`);
    lines.push('');
    for (const workspace of artifact.workspaces.filter(item => item.actors.includes(actor))) {
      const workflow = workspace.workflowId ? ` — workflow \`${workspace.workflowId}\`` : '';
      lines.push(`- \`${workspace.workspaceId}\` (${workspace.kind}, ${workspace.entity})${workflow}: ${workspace.title} — ${workspace.purpose}`);
      for (const section of workspace.sections) {
        lines.push(`  - section \`${section.sectionId}\` — ${section.intent}`);
        for (const organism of section.organisms) {
          const attach = organism.attachTo ? ` → \`${organism.attachTo}\`` : '';
          lines.push(`    - \`${organism.operationId}\` [${organism.role}]${attach}`);
        }
      }
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

function readSections(value: unknown): NsE6Section[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(section => ({
    sectionId: readString(section.sectionId) || '',
    intent: readString(section.intent) || '',
    organisms: Array.isArray(section.organisms)
      ? section.organisms.filter(isRecord).map(organism => {
          const attachTo = readString(organism.attachTo);
          const operationId = readString(organism.operationId);
          return {
            ...(operationId ? { operationId } : {}), // content organisms carry no operationId
            role: readEnum(organism.role, NS_ORGANISM_ROLES, 'contextualAction'),
            ...(attachTo ? { attachTo } : {}),
          };
        })
      : [],
  }));
}

// Flatten organisms -> operationIds (first occurrence wins, order preserved). Duplicate coverage
// across organisms is caught by the gate, not silently collapsed here.
function deriveOperationIds(sections: NsE6Section[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const section of sections) {
    for (const organism of section.organisms) {
      if (!organism.operationId || seen.has(organism.operationId)) continue;
      seen.add(organism.operationId);
      ids.push(organism.operationId);
    }
  }
  return ids;
}

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
