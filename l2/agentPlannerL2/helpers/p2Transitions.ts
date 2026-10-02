/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/p2Transitions.ts" enhancement="_blank"/>

import type { P2L4Sources, P2OntologyTransitionView } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

/** Transitions of one entity grouped by origin state; identical groups appear once. */
export function transitionGroups(entityId: string, sources: P2L4Sources): P2OntologyTransitionView[][] {
  const transitions = sources.entities.find(item => item.entityId === entityId)?.transitions || [];
  const byFrom = new Map<string, P2OntologyTransitionView[]>();
  for (const transition of transitions) {
    for (const from of transition.from) byFrom.set(from, [...(byFrom.get(from) || []), transition]);
  }
  const seen = new Set<string>();
  const out: P2OntologyTransitionView[][] = [];
  for (const group of byFrom.values()) {
    const key = group.map(item => item.transitionId).sort().join('\n');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(group);
  }
  return out;
}

/** Every transition that shares its origin state with another one (a decision between them). */
export function branchingTransitions(entityId: string, sources: P2L4Sources): P2OntologyTransitionView[] {
  const out: P2OntologyTransitionView[] = [];
  const seen = new Set<string>();
  for (const group of transitionGroups(entityId, sources)) {
    if (group.length < 2) continue;
    for (const transition of group) {
      if (seen.has(transition.transitionId)) continue;
      seen.add(transition.transitionId);
      out.push(transition);
    }
  }
  return out;
}

/** The lifecycle lets this actor fire the transition (no `by` declared means anyone the grant allows). */
export function transitionAllowedFor(transition: P2OntologyTransitionView, actorRef: string): boolean {
  return !transition.by.length || transition.by.includes(actorRef);
}
