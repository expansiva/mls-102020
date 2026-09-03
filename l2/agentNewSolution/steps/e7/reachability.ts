export interface Ns4ReachabilityTransition {
  fromStates: string[];
  toState: string;
}

/** The single E7 definition used by both workflow compilation and its post-resolution gate. */
export function collectNs4ReachableWorkflowStates(
  initialState: string,
  transitions: Ns4ReachabilityTransition[],
): Set<string> {
  return new Set([initialState, ...transitions.map(transition => transition.toState)].filter(Boolean));
}

/**
 * Shrinks unreachable states and their outgoing transitions until no new orphan target appears.
 * fromStates are alternatives, so a transition survives while at least one source remains.
 */
export function shrinkNs4WorkflowToReachable<TTransition extends Ns4ReachabilityTransition>(
  initialState: string,
  sourceStates: string[],
  sourceTransitions: TTransition[],
): { states: string[]; transitions: TTransition[]; removedStates: string[] } {
  let states = [...sourceStates];
  let transitions = sourceTransitions.map(transition => ({ ...transition, fromStates: [...transition.fromStates] }));
  const removedStates: string[] = [];

  while (true) {
    const reachable = collectNs4ReachableWorkflowStates(initialState, transitions);
    const removedThisRound = states.filter(state => state !== initialState && !reachable.has(state));
    if (!removedThisRound.length) break;
    const removed = new Set(removedThisRound);
    removedStates.push(...removedThisRound);
    states = states.filter(state => !removed.has(state));
    transitions = transitions.flatMap(transition => {
      if (removed.has(transition.toState)) return [];
      const fromStates = transition.fromStates.filter(state => !removed.has(state));
      return fromStates.length ? [{ ...transition, fromStates }] : [];
    });
  }

  return { states, transitions: transitions as TTransition[], removedStates };
}
