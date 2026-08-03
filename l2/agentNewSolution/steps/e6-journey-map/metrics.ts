/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/metrics.ts" enhancement="_blank"/>

// T0 (improveJourneys): the RULER. Pure, deterministic measurements over an l4 as it exists on disk —
// never over a recomputed candidate set, so the same functions measure the frozen baseline fixtures
// (fixture/baseline/<name>) and the output of any later change (T1 re-derivation, T7 validation run).
//
// Metric definitions are stated here once and mirrored in fixture/baseline/<name>/baseline-metrics.json
// (field `definition`). A metric whose definition drifts is a new metric: bump the name, do not edit
// the meaning in place.
//
// Two of the six metrics depend on the `input.source` contract, which did not exist in earlier pipeline
// revisions (cafeFlow/petShop predate it). Those measurements declare `mode`: 'source' when the artifact
// carries sources, 'structural' when the count falls back to "is there a local query that outputs this
// field". The structural mode OVER-reports on artifacts whose paginated/list outputs do not declare their
// item fields — it is a comparable-across-revisions signal, not a defect list.

import { isNsIdInputName, NsE6BffCall, NsE6BffField, NsE6Landing, NsE6Workspace } from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';

export type NsMetricMode = 'source' | 'structural';

/** A journey as written in l4/{module}/journeys/{journeyId}.defs.ts. */
export interface NsMetricJourney {
  journeyId: string;
  actorId: string;
  steps: string[];
  operationIds: string[];
  workspaceId: string;
}

/** The site-map view the anchor metrics need (workspaceId → actors + hosted operations). */
export interface NsMetricSiteMapWorkspace {
  workspaceId: string;
  actors: string[];
  operationIds: string[];
}

/** An e2 journey — only the field that says where the actor comes from. */
export interface NsMetricE2Journey {
  journeyId: string;
  trigger?: unknown;
  prerequisite?: unknown;
}

export interface NsJourneyMetricsInput {
  workspaces: NsE6Workspace[];               // l4/{module}/workspaces/*.defs.ts
  siteMapWorkspaces: NsMetricSiteMapWorkspace[];
  landings: NsE6Landing[];
  journeys: NsMetricJourney[];               // l4/{module}/journeys/*.defs.ts
  e2Journeys: NsMetricE2Journey[];           // pipeline/e2-journeys.json
}

export interface NsJourneyMetrics {
  sourceAware: boolean;
  /** M1 — required id inputs with no verifiable provider, over every bffCall of every workspace. */
  m1RequiredIdsWithoutProvider: {
    mode: NsMetricMode;
    total: number;
    bySource: { pageInput: number; selectionUnresolved: number; sourceMissing: number; derivedUnresolved: number } | null;
    structural: { unprovidedRequiredIds: number };
  };
  /** M2 — workspaces of kind `workflow` that host no query at all. */
  m2WorkflowWorkspacesWithoutQuery: { count: number; total: number };
  /** M3 — journeys whose anchor workspace does not host the journey's operations (or excludes its actor). */
  m3JourneysWithWeakAnchor: { count: number; total: number };
  /** M4 — journeys whose operationIds exceed 2x their step count (the "bag of everything"). */
  m4JourneysWithOperationBag: { count: number; total: number };
  /** M5 — landings that require an input the actor cannot supply on arrival. */
  m5LandingsNotSelfSufficient: { mode: NsMetricMode; count: number; total: number };
  /** M6 — e2 journeys that declare where the actor comes from (`trigger` today, `prerequisite` after T3). */
  m6JourneysWithPrerequisite: { count: number; total: number };
}

export function measureNsJourneyMetrics(input: NsJourneyMetricsInput): NsJourneyMetrics {
  const sourceAware = input.workspaces.some(workspace => (workspace.bffCalls || []).some(call =>
    (call.input || []).some(entry => !!entry.source)));
  const mode: NsMetricMode = sourceAware ? 'source' : 'structural';
  return {
    sourceAware,
    m1RequiredIdsWithoutProvider: measureM1(input.workspaces, mode),
    m2WorkflowWorkspacesWithoutQuery: measureM2(input.workspaces),
    m3JourneysWithWeakAnchor: measureM3(input.journeys, input.siteMapWorkspaces),
    m4JourneysWithOperationBag: measureM4(input.journeys),
    m5LandingsNotSelfSufficient: measureM5(input.workspaces, input.landings, mode),
    m6JourneysWithPrerequisite: measureM6(input.e2Journeys),
  };
}

// ---------------------------------------------------------------------------
// M1 — required id inputs without a verifiable provider
// ---------------------------------------------------------------------------

function measureM1(workspaces: NsE6Workspace[], mode: NsMetricMode): NsJourneyMetrics['m1RequiredIdsWithoutProvider'] {
  const bySource = { pageInput: 0, selectionUnresolved: 0, sourceMissing: 0, derivedUnresolved: 0 };
  let structuralUnprovided = 0;
  for (const workspace of workspaces) {
    const calls = workspace.bffCalls || [];
    const queryIds = new Set(calls.filter(call => call.kind === 'query').map(call => call.bffId));
    const localIds = new Set(calls.map(call => call.bffId));
    for (const call of calls) {
      for (const entry of call.input || []) {
        if (entry.required !== true || !isNsIdInputName(entry.name)) continue;
        if (!hasLocalQueryProviding(calls, call, entry.name)) structuralUnprovided += 1;
        if (!entry.source || entry.source === 'userDecision') bySource.sourceMissing += 1;
        else if (entry.source === 'pageInput') bySource.pageInput += 1;
        else if (entry.source === 'selection' && !queryIds.has(entry.sourceRef || '')) bySource.selectionUnresolved += 1;
        else if (entry.source === 'derived' && !localIds.has((entry.sourceRef || '').split('.')[0])) bySource.derivedUnresolved += 1;
      }
    }
  }
  const sourceTotal = bySource.pageInput + bySource.selectionUnresolved + bySource.sourceMissing + bySource.derivedUnresolved;
  return {
    mode,
    total: mode === 'source' ? sourceTotal : structuralUnprovided,
    bySource: mode === 'source' ? bySource : null,
    structural: { unprovidedRequiredIds: structuralUnprovided },
  };
}

// ---------------------------------------------------------------------------
// M2 — workflow workspaces with no query
// ---------------------------------------------------------------------------

function measureM2(workspaces: NsE6Workspace[]): NsJourneyMetrics['m2WorkflowWorkspacesWithoutQuery'] {
  const workflowWorkspaces = workspaces.filter(workspace => workspace.kind === 'workflow');
  return {
    count: workflowWorkspaces.filter(workspace => !(workspace.bffCalls || []).some(call => call.kind === 'query')).length,
    total: workflowWorkspaces.length,
  };
}

// ---------------------------------------------------------------------------
// M3 / M4 — journey anchor and operation bag
// ---------------------------------------------------------------------------

/**
 * A journey's anchor is WEAK when the anchor workspace is unknown, does not include the journey's actor,
 * or hosts strictly fewer of the journey's own operationIds than some other workspace does.
 */
function measureM3(journeys: NsMetricJourney[], siteMapWorkspaces: NsMetricSiteMapWorkspace[]): NsJourneyMetrics['m3JourneysWithWeakAnchor'] {
  let count = 0;
  for (const journey of journeys) {
    const anchor = siteMapWorkspaces.find(workspace => workspace.workspaceId === journey.workspaceId);
    if (!anchor || !anchor.actors.includes(journey.actorId)) { count += 1; continue; }
    const hosted = (workspace: NsMetricSiteMapWorkspace) => journey.operationIds.filter(id => workspace.operationIds.includes(id)).length;
    const best = Math.max(0, ...siteMapWorkspaces.map(hosted));
    if (hosted(anchor) < best) count += 1;
  }
  return { count, total: journeys.length };
}

function measureM4(journeys: NsMetricJourney[]): NsJourneyMetrics['m4JourneysWithOperationBag'] {
  return {
    count: journeys.filter(journey => journey.operationIds.length > 2 * journey.steps.length).length,
    total: journeys.length,
  };
}

// ---------------------------------------------------------------------------
// M5 — landing self-sufficiency
// ---------------------------------------------------------------------------

function measureM5(workspaces: NsE6Workspace[], landings: NsE6Landing[], mode: NsMetricMode): NsJourneyMetrics['m5LandingsNotSelfSufficient'] {
  let count = 0;
  for (const landing of landings) {
    const workspace = workspaces.find(item => item.workspaceId === landing.workspaceId);
    if (!workspace) continue;
    if (landingHasUnresolvableInput(workspace, mode)) count += 1;
  }
  return { mode, count, total: landings.length };
}

function landingHasUnresolvableInput(workspace: NsE6Workspace, mode: NsMetricMode): boolean {
  const calls = workspace.bffCalls || [];
  const queryIds = new Set(calls.filter(call => call.kind === 'query').map(call => call.bffId));
  const localIds = new Set(calls.map(call => call.bffId));
  for (const call of calls) {
    for (const entry of call.input || []) {
      if (entry.required !== true) continue;
      if (mode === 'structural') {
        if (isNsIdInputName(entry.name) && !hasLocalQueryProviding(calls, call, entry.name)) return true;
        continue;
      }
      // A landing receives nothing: pageInput has no sender, and an id with no declared source is typed.
      if (entry.source === 'pageInput') return true;
      if (isNsIdInputName(entry.name) && (!entry.source || entry.source === 'userDecision')) return true;
      if (entry.source === 'selection' && !queryIds.has(entry.sourceRef || '')) return true;
      if (entry.source === 'derived' && !localIds.has((entry.sourceRef || '').split('.')[0])) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// M6 — where the actor comes from
// ---------------------------------------------------------------------------

function measureM6(e2Journeys: NsMetricE2Journey[]): NsJourneyMetrics['m6JourneysWithPrerequisite'] {
  const filled = e2Journeys.filter(journey => isFilled(journey.prerequisite) || isFilled(journey.trigger)).length;
  return { count: filled, total: e2Journeys.length };
}

function isFilled(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  return typeof value === 'object' && value !== null;
}

// ---------------------------------------------------------------------------
// shared
// ---------------------------------------------------------------------------

/**
 * Structural provider check (schema-agnostic): another query of the SAME workspace declares a field with
 * this name in its output. A call never provides its own input, and a command output is not a provider
 * (it exists only after the command already ran).
 */
function hasLocalQueryProviding(calls: NsE6BffCall[], consumer: NsE6BffCall, name: string): boolean {
  return calls.some(call => call.kind === 'query' && call.bffId !== consumer.bffId && outputFieldNames(call).has(name));
}

function outputFieldNames(call: NsE6BffCall): Set<string> {
  const names = new Set<string>();
  collectFieldNames(call.output?.fields || [], names);
  return names;
}

function collectFieldNames(fields: NsE6BffField[], names: Set<string>): void {
  for (const field of fields) {
    names.add(field.name);
    if (field.item?.fields) collectFieldNames(field.item.fields, names);
  }
}
