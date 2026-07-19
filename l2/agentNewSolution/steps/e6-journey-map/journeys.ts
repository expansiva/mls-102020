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

export interface NsE6Journey {
  journeyId: string;
  actorId: string;
  title: string;
  goal: string;
  steps: string[];
  outcome: string;
  operationIds: string[]; // the operations this journey exercises (via shared featureRefs)
  workspaceId: string;    // the page it lands on / primarily happens in (from the site map)
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
}
export interface NsE6JourneyOperation { operationId: string; featureRefs?: string[] }
export interface NsE6JourneyWorkspace { workspaceId: string; actors: string[]; operationIds: string[] }

// Derive the permanent journeys from the e2 narrative + the classification (feature→operation) + the
// site map (operation→workspace). operationIds = operations whose featureRefs intersect the journey's
// step featureRefs. workspaceId = the first site-map workspace that hosts one of those operations, else
// the actor's own workspace (a landing/entry) — deterministic, never the LLM's.
export function deriveE6Journeys(
  sources: NsE6JourneySource[],
  operations: NsE6JourneyOperation[],
  workspaces: NsE6JourneyWorkspace[],
): NsE6Journey[] {
  const opsByFeature = new Map<string, string[]>();
  for (const operation of operations) {
    for (const featureId of operation.featureRefs || []) {
      const list = opsByFeature.get(featureId) || [];
      list.push(operation.operationId);
      opsByFeature.set(featureId, list);
    }
  }
  return sources.map(source => {
    const featureRefs = new Set((source.steps || []).flatMap(step => step.featureRefs || []));
    const operationIds: string[] = [];
    const seen = new Set<string>();
    for (const featureId of featureRefs) {
      for (const operationId of opsByFeature.get(featureId) || []) {
        if (!seen.has(operationId)) { seen.add(operationId); operationIds.push(operationId); }
      }
    }
    const hostWorkspace = workspaces.find(workspace => operationIds.some(id => workspace.operationIds.includes(id)));
    const actorWorkspace = workspaces.find(workspace => workspace.actors.includes(source.actorId));
    return {
      journeyId: source.journeyId,
      actorId: source.actorId,
      title: source.title,
      goal: source.goal,
      steps: (source.steps || []).map(step => step.title || step.intent || '').filter(Boolean),
      outcome: source.outcome,
      operationIds,
      workspaceId: hostWorkspace?.workspaceId || actorWorkspace?.workspaceId || '',
    };
  });
}

export interface E6JourneysGateContext {
  operationIds: string[];   // every classified operationId
  workspaceIds: string[];   // every site-map workspaceId
}

// Three gates (P8): (1) journey.operationIds ⊆ operations; (2) workspaceId exists in the map;
// (3) every operation referenced by ≥1 journey (WARNING — operations can be internal).
export function validateE6Journeys(journeys: NsE6Journey[], context: E6JourneysGateContext): { issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
  const knownOperations = new Set(context.operationIds);
  const knownWorkspaces = new Set(context.workspaceIds);
  const referenced = new Set<string>();

  for (const journey of journeys) {
    for (const operationId of journey.operationIds) {
      if (!knownOperations.has(operationId)) {
        issues.push(errorIssue('journey.operation.unknown', `journey ${journey.journeyId} references unclassified operation ${operationId}`, journey.journeyId));
      } else {
        referenced.add(operationId);
      }
    }
    if (!journey.workspaceId) {
      issues.push(errorIssue('journey.workspace.missing', `journey ${journey.journeyId} has no workspaceId (landing page)`, journey.journeyId));
    } else if (!knownWorkspaces.has(journey.workspaceId)) {
      issues.push(errorIssue('journey.workspace.unknown', `journey ${journey.journeyId} lands on undeclared workspace ${journey.workspaceId}`, journey.journeyId));
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
  return value.journeys.filter(isRecord).map(journey => ({
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
  }));
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
