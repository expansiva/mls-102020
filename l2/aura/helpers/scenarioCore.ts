/// <mls fileReference="_102020_/l2/aura/helpers/scenarioCore.ts" enhancement="_blank"/>
// The shape of a page state, and the only grouping the panel still needs.
//
// WHY THIS EXISTS
// Half the markup of a generated page only exists in certain states: measured on the 34 pages of the
// 102046, 49,2% of the 6.155 elements live inside a `${...}` and 371 are ALTERNATIVE branches — the
// error, success and "empty list" messages (182 of them are a `<p>`). To see one today you have to
// make the backend cooperate; and what is not on screen cannot be selected, let alone styled.
//
// WHY IT IS SMALL
// The page subscribes to `collabState` (`SUBSCRIBED_STATE_KEYS`) and its `handleIcaStateChange` ends
// in `requestUpdate()`, so a `setState` re-renders the page in the simulated scenario immediately.
// And the causality is one-way: the action method WRITES the status (`setState(…,'loading')` →
// `execBff` → `setState(…,'success')`); nothing reads the status to start a request. Simulating a
// state does not call the backend.
//
// WHY THE L2 AND NOT THE L4 — the opposite of what this file used to say
// This header used to argue for the l4 workspace, and the argument was made when the l2 `.defs.ts`
// was the only other candidate: the `shared/<page>.ts` and its declared types were never in play.
// D-016 and D-017 reversed it. Whoever best represents the state of a page is the page: the l4 is a
// design document, it cannot know a state born in the implementation, and it does not exist for 12
// of the 58 pages of the corpus. Measured on 22/09/2026, the `.ts` is a strict superset — inventory
// identical in the 46 pages where both exist, 0 keys of the l4 missing from the `.ts`. The reading
// lives in `scenarioL2.ts`, and nothing here reads a file any more.
//
// Everything here is pure: no DOM, no stor, no state. Whoever renders decides the words.

export type ScenarioKind =
  | 'pageStatus'
  | 'actionStatus'
  | 'actionError'
  | 'input'
  | 'queryResult'
  | 'commandOutput'
  /** The page's own scene (`scenary`): the axis that makes a whole branch of markup appear. */
  | 'scene'
  /** Read, counted, and offered to nobody: `layout.col_*` and `businessContext`. */
  | 'other';

export interface IScenarioState {
  /** The `collabState` key — what a simulation writes. */
  key: string;
  /** The property on the page class, which is how a control on screen is recognised. */
  name: string;
  kind: ScenarioKind;
  /** The action it belongs to; null for what belongs to the page itself. */
  bffId: string | null;
  /** Closed domain, when there is one. Absent means the domain is open. */
  valueSet?: readonly string[];
  /** The declared type of the property, verbatim. */
  type?: string;
  /**
   * For inputs: the input's own name in the key (`search`), which is NOT `name` (that one is the page
   * property, `qryListTicketSearch`).
   */
  field?: string;
  /**
   * Whether the panel offers it, and it is `valueSet.length > 0` — the whole of D-017 in one field.
   *
   * A state with an open domain is NOT listed. That contradicts the older rule of "list everything,
   * hide nothing", which existed because a hidden state looked like a state that did not exist; now
   * the whole list is "what can be simulated", and the count of what was left out is a footnote.
   */
  editable: boolean;
}

// ─── Grouping by action, which is what makes a short label honest ─────────────

export interface IScenarioActionBlock {
  /** The action, or null for what belongs to the page itself. */
  bffId: string | null;
  states: IScenarioState[];
}

/**
 * The states split into the actions they belong to.
 *
 * Run-length and not a bucket sort on purpose: `statesOfPage` emits an action's states together, so
 * consecutive runs ARE the actions — and an action that somehow appeared twice stays two blocks
 * instead of being silently merged.
 */
export function groupByAction(states: readonly IScenarioState[]): IScenarioActionBlock[] {
  const blocks: IScenarioActionBlock[] = [];
  for (const state of states) {
    const last = blocks[blocks.length - 1];
    if (last && last.bffId === state.bffId) last.states.push(state);
    else blocks.push({ bffId: state.bffId, states: [state] });
  }
  return blocks;
}
