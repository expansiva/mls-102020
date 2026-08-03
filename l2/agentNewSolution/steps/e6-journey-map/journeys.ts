/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/journeys.ts" enhancement="_blank"/>

// P8 (newSolution_14): promote the JOURNEY narrative to a PERMANENT l4 artifact. The story of each
// journey (goal per actor, steps, outcome — "Descobrir quais produtos o pet shop recomenda ao entrar")
// lived only in pipeline/e2-journeys.json (a throwaway working state, rewritten each regen, with no
// readers). It is the LANGUAGE OF MAINTENANCE (clarification screen 2; the future agentChangeSolution)
// and can be human-approved content — it must not die in a draft. journeys/<journeyId>.defs.ts links
// the narrative to the operations it exercises and the workspace (page) it lands on (via the site map).
//
// Journeys are STORIES; the site map is PLACES. A journey never re-declares a workspace's title/actors —
// it only references. Pure + dependency-light so the three gates unit-test directly.

import { errorIssue, NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface NsE6JourneyPrerequisite {
  kind: string;           // journey | external | schedule (the e2 gate owns the enum)
  journeyId?: string;
  carries?: string[];
}

export interface NsE6Journey {
  journeyId: string;
  actorId: string;
  title: string;
  goal: string;
  steps: string[];
  outcome: string;
  operationIds: string[]; // the operations this journey exercises (via shared featureRefs)
  workspaceId: string;    // the page it lands on / primarily happens in (from the site map)
  // T3, ADDITIVE: where the actor comes from, carried verbatim from the human-approved e2. Absent =
  // the journey starts cold on the actor's landing. This is the business fact that makes an id
  // "arriving with the page" verifiable instead of assumed.
  prerequisite?: NsE6JourneyPrerequisite;
}

// Minimal views of the upstream artifacts (avoid importing their whole type chains).
export interface NsE6JourneySourceStep { featureRefs?: string[]; title?: string; intent?: string }
export interface NsE6JourneySource {
  journeyId: string;
  actorId: string;
  title: string;
  goal: string;
  outcome: string;
  steps: NsE6JourneySourceStep[];
  prerequisite?: NsE6JourneyPrerequisite;
}
// Every field beyond operationId/featureRefs is OPTIONAL: a classification that does not declare it
// simply skips the filter it feeds, never drops the operation.
export interface NsE6JourneyOperation { operationId: string; featureRefs?: string[]; actorId?: string; entity?: string; kind?: string }
export interface NsE6JourneyWorkspace { workspaceId: string; actors: string[]; operationIds: string[] }
export interface NsE6JourneyLanding { actorId: string; workspaceId: string }

const NS_WRITE_KINDS = new Set(['create', 'update', 'delete']);

/**
 * Derive the permanent journeys from the e2 narrative + the classification (feature→operation) + the
 * site map (operation→workspace). Both fields are DERIVED, never the LLM's.
 *
 * `operationIds` (improveJourneys T1) — the old union "any operation sharing any featureRef with any
 * step" produced a bag: features are coarse (one cross-cutting featureRef in the 102045 run carried 13
 * operations), so an unrelated CRUD landed in every journey that touched it. Three narrowing rules,
 * each killing one defect class, none of them domain-specific:
 *   1. PER STEP, an operation serves the step only when it covers ALL of the step's featureRefs
 *      (⊇, not ∩ — a step tagged "projects + costing" is not served by an operation that only knows
 *      about costing). The journey keeps the union over its steps.
 *   2. ACTOR — the classification says who performs each operation; a journey exercises its own actor's.
 *   3. PRIMARY ENTITY — a journey is about the record it changes. Keep the operations of the entity that
 *      owns the most WRITE operations of the journey (ties: most operations, then id order), plus, for
 *      any step that would otherwise lose every operation it had, that step's operations back.
 *
 * `workspaceId` (the anchor) — the workspace that (a) includes the journey's actor and (b) hosts the
 * most of these operations. Ties break by the page hosting the journey's WRITES, then by the actor's
 * landing, then by declaration order. NEVER `workspaces.find()` over declaration order, which anchored
 * 5 of the 11 journeys of the 102045 run on the same dashboard, two of them for actors that page
 * excludes. When the actor owns no workspace at all the anchor falls back to the best host so the
 * journey still points somewhere, and the gate reports `journey.anchor.actorMismatch`.
 */
export function deriveE6Journeys(
  sources: NsE6JourneySource[],
  operations: NsE6JourneyOperation[],
  workspaces: NsE6JourneyWorkspace[],
  landings: NsE6JourneyLanding[] = [],
): NsE6Journey[] {
  const operationById = new Map(operations.map(operation => [operation.operationId, operation]));
  const landingByActor = new Map(landings.map(landing => [landing.actorId, landing.workspaceId]));
  const writeOperationIds = new Set(operations.filter(operation => operation.kind && NS_WRITE_KINDS.has(operation.kind)).map(operation => operation.operationId));
  return sources.map(source => {
    const perStep = (source.steps || []).map(step => operationsCoveringStep(operations, step, source.actorId));
    const candidates = unique(perStep.flat());
    const primaryEntity = pickPrimaryEntity(candidates, operationById);
    const operationIds = primaryEntity
      ? keepPrimaryEntityWithoutOrphaningAStep(perStep, candidates, primaryEntity, operationById)
      : candidates;
    const journey: NsE6Journey = {
      journeyId: source.journeyId,
      actorId: source.actorId,
      title: source.title,
      goal: source.goal,
      steps: (source.steps || []).map(step => step.title || step.intent || '').filter(Boolean),
      outcome: source.outcome,
      operationIds,
      workspaceId: pickAnchorWorkspace(workspaces, source.actorId, operationIds, writeOperationIds, landingByActor.get(source.actorId) || ''),
    };
    if (source.prerequisite) journey.prerequisite = source.prerequisite;
    return journey;
  });
}

/**
 * Rules 1 + 2: the operations that cover ALL of this step's features and belong to the journey's actor.
 * A step whose feature combination NO operation covers contributes nothing: the union over its features
 * would be the diffuse set the narrowing exists to remove (a cafeFlow step tagged "menu + stock +
 * dashboard" matches 8 operations of 3 entities and would decide the journey's subject by itself).
 */
function operationsCoveringStep(operations: NsE6JourneyOperation[], step: NsE6JourneySourceStep, actorId: string): string[] {
  const stepFeatures = step.featureRefs || [];
  if (stepFeatures.length === 0) return [];
  return operations
    .filter(operation => !operation.actorId || operation.actorId === actorId)
    .filter(operation => stepFeatures.every(featureId => (operation.featureRefs || []).includes(featureId)))
    .map(operation => operation.operationId);
}

/** Rule 3a: the entity the journey WRITES to (a read-only journey falls back to the most exercised one). */
function pickPrimaryEntity(operationIds: string[], operationById: Map<string, NsE6JourneyOperation>): string {
  const tally = new Map<string, { writes: number; total: number }>();
  for (const operationId of operationIds) {
    const operation = operationById.get(operationId);
    if (!operation?.entity) continue;
    const entry = tally.get(operation.entity) || { writes: 0, total: 0 };
    if (operation.kind && NS_WRITE_KINDS.has(operation.kind)) entry.writes += 1;
    entry.total += 1;
    tally.set(operation.entity, entry);
  }
  const ranked = [...tally.entries()].sort((left, right) =>
    right[1].writes - left[1].writes || right[1].total - left[1].total || left[0].localeCompare(right[0]));
  return ranked.length > 0 ? ranked[0][0] : '';
}

/** Rule 3b: keep the primary entity's operations, but never leave a step with nothing it had. */
function keepPrimaryEntityWithoutOrphaningAStep(
  perStep: string[][],
  candidates: string[],
  primaryEntity: string,
  operationById: Map<string, NsE6JourneyOperation>,
): string[] {
  const kept = candidates.filter(operationId => operationById.get(operationId)?.entity === primaryEntity);
  const rescued: string[] = [];
  for (const stepOperations of perStep) {
    if (stepOperations.length > 0 && !stepOperations.some(operationId => kept.includes(operationId))) {
      rescued.push(...stepOperations);
    }
  }
  return unique([...kept, ...rescued]);
}

function pickAnchorWorkspace(
  workspaces: NsE6JourneyWorkspace[],
  actorId: string,
  operationIds: string[],
  writeOperationIds: Set<string>,
  landingWorkspaceId: string,
): string {
  const hosted = (workspace: NsE6JourneyWorkspace) => operationIds.filter(id => workspace.operationIds.includes(id)).length;
  const hostedWrites = (workspace: NsE6JourneyWorkspace) => operationIds.filter(id => writeOperationIds.has(id) && workspace.operationIds.includes(id)).length;
  const candidates = workspaces.filter(workspace => workspace.actors.includes(actorId));
  const pool = candidates.length > 0 ? candidates : workspaces;
  if (pool.length === 0) return '';
  const best = Math.max(...pool.map(hosted));
  let tied = pool.filter(workspace => hosted(workspace) === best);
  if (tied.length === 1) return tied[0].workspaceId;
  // A journey lives where it ACTS: the page hosting its writes beats the page it only reads from.
  const bestWrites = Math.max(...tied.map(hostedWrites));
  tied = tied.filter(workspace => hostedWrites(workspace) === bestWrites);
  if (tied.length === 1) return tied[0].workspaceId;
  const byLanding = landingWorkspaceId ? tied.find(workspace => workspace.workspaceId === landingWorkspaceId) : undefined;
  return (byLanding || tied[0]).workspaceId;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * T5 — the PAGE CONTEXT: which records a page can assume it was handed, per workspace.
 *
 * `pageInput` used to be a unilateral claim ("this id arrives with the page") with nobody on the other
 * side: 20 of them shipped in one run with no provider anywhere. T3 created the creditor — a journey
 * declaring `prerequisite.carries` — and this turns it into a lookup the gate can check.
 *
 * A journey's carried records reach the page it starts on AND the pages it works in (its operations),
 * because the actor keeps that context as they move. Carries are business names written at e2, where
 * EntityIds do not exist yet, so they are resolved against the declared entities here; a carry that
 * resolves to nothing is reported separately, because "we could not tell" must never read as "covered".
 */
export interface NsE6PageContext {
  /** workspaceId → EntityIds the actor is known to arrive with. */
  entitiesByWorkspace: Record<string, string[]>;
  /** workspaceId → carries that matched no declared entity (the page context is stated but unreadable). */
  unresolvedByWorkspace: Record<string, string[]>;
}

export function deriveNsE6PageContext(
  journeys: readonly NsE6Journey[],
  workspaces: readonly NsE6JourneyWorkspace[],
  entityIds: readonly string[],
): NsE6PageContext {
  const entitiesByWorkspace: Record<string, string[]> = {};
  const unresolvedByWorkspace: Record<string, string[]> = {};
  const add = (bucket: Record<string, string[]>, workspaceId: string, value: string) => {
    const list = bucket[workspaceId] || (bucket[workspaceId] = []);
    if (!list.includes(value)) list.push(value);
  };
  for (const journey of journeys) {
    const carries = journey.prerequisite?.carries || [];
    if (carries.length === 0) continue;
    const visited = workspaces
      .filter(workspace => workspace.workspaceId === journey.workspaceId
        || journey.operationIds.some(id => workspace.operationIds.includes(id)))
      .map(workspace => workspace.workspaceId);
    for (const carry of carries) {
      const entityId = resolveNsCarryToEntity(carry, entityIds);
      for (const workspaceId of visited) {
        if (entityId) add(entitiesByWorkspace, workspaceId, entityId);
        else add(unresolvedByWorkspace, workspaceId, carry);
      }
    }
  }
  return { entitiesByWorkspace, unresolvedByWorkspace };
}

/** A business name matches a declared entity when their letters do, ignoring case, spacing and plural. */
export function resolveNsCarryToEntity(carry: string, entityIds: readonly string[]): string {
  const normalized = normalizeNsEntityWord(carry);
  if (!normalized) return '';
  return entityIds.find(entityId => normalizeNsEntityWord(entityId) === normalized) || '';
}

function normalizeNsEntityWord(value: string): string {
  const letters = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return letters.endsWith('s') ? letters.slice(0, -1) : letters;
}

export interface E6JourneysGateContext {
  operationIds: string[];   // every classified operationId
  workspaceIds: string[];   // every site-map workspaceId
  /** actors of each site-map workspace — the anchor must include the journey's actor. */
  workspaceActors?: Record<string, string[]>;
  /** classified actor of each operation — a journey exercising another actor's operation is suspect. */
  operationActor?: Record<string, string>;
}

// Five gates: (1) journey.operationIds ⊆ operations; (2) workspaceId exists in the map; (3) the anchor
// includes the journey's actor (T1 — ERROR: an actor cannot live on a page that excludes them);
// (4) an operation classified for another actor is a WARNING (a handoff can be legitimate; T3/T4 decide);
// (5) every operation referenced by ≥1 journey (WARNING — operations can be internal).
export function validateE6Journeys(journeys: NsE6Journey[], context: E6JourneysGateContext): { issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
  const knownOperations = new Set(context.operationIds);
  const knownWorkspaces = new Set(context.workspaceIds);
  const workspaceActors = context.workspaceActors || {};
  const operationActor = context.operationActor || {};
  const referenced = new Set<string>();

  for (const journey of journeys) {
    for (const operationId of journey.operationIds) {
      if (!knownOperations.has(operationId)) {
        issues.push(errorIssue('journey.operation.unknown', `journey ${journey.journeyId} references unclassified operation ${operationId}`, journey.journeyId));
      } else {
        referenced.add(operationId);
      }
      const owner = operationActor[operationId];
      if (owner && owner !== journey.actorId) {
        issues.push(warningIssue('journey.operation.foreignActor', `journey ${journey.journeyId} (actor ${journey.actorId}) exercises operation ${operationId}, classified for actor ${owner}`, journey.journeyId));
      }
    }
    if (!journey.workspaceId) {
      issues.push(errorIssue('journey.workspace.missing', `journey ${journey.journeyId} has no workspaceId (landing page)`, journey.journeyId));
    } else if (!knownWorkspaces.has(journey.workspaceId)) {
      issues.push(errorIssue('journey.workspace.unknown', `journey ${journey.journeyId} lands on undeclared workspace ${journey.workspaceId}`, journey.journeyId));
    } else {
      const actors = workspaceActors[journey.workspaceId];
      if (actors && !actors.includes(journey.actorId)) {
        issues.push(errorIssue('journey.anchor.actorMismatch', `journey ${journey.journeyId} anchors on workspace ${journey.workspaceId}, which serves ${actors.join(', ') || 'no actor'} — not ${journey.actorId}`, journey.journeyId));
      }
    }
  }
  for (const operationId of context.operationIds) {
    if (!referenced.has(operationId)) {
      issues.push(warningIssue('journey.operation.unreferenced', `operation ${operationId} is exercised by no journey (may be internal)`, operationId));
    }
  }
  return { issues };
}

// Coerce a raw e2-journeys.json journey into the source view.
export function readE6JourneySources(value: unknown): NsE6JourneySource[] {
  if (!isRecord(value) || !Array.isArray(value.journeys)) return [];
  return value.journeys.filter(isRecord).map(journey => {
    const source: NsE6JourneySource = {
      journeyId: readString(journey.journeyId),
      actorId: readString(journey.actorId),
      title: readString(journey.title),
      goal: readString(journey.goal),
      outcome: readString(journey.outcome),
      steps: Array.isArray(journey.steps) ? journey.steps.filter(isRecord).map(step => ({
        featureRefs: Array.isArray(step.featureRefs) ? step.featureRefs.filter((ref): ref is string => typeof ref === 'string') : [],
        title: readString(step.title),
        intent: readString(step.intent),
      })) : [],
    };
    const prerequisite = readPrerequisite(journey.prerequisite);
    if (prerequisite) source.prerequisite = prerequisite;
    return source;
  });
}

/** The e2 gate owns the shape; here it is only carried through, so an unusable value is simply dropped. */
function readPrerequisite(value: unknown): NsE6JourneyPrerequisite | undefined {
  if (!isRecord(value)) return undefined;
  const kind = readString(value.kind);
  if (!kind) return undefined;
  const prerequisite: NsE6JourneyPrerequisite = { kind };
  const journeyId = readString(value.journeyId);
  if (journeyId) prerequisite.journeyId = journeyId;
  const carries = Array.isArray(value.carries) ? value.carries.filter((item): item is string => typeof item === 'string' && !!item.trim()) : [];
  if (carries.length > 0) prerequisite.carries = carries;
  return prerequisite;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
