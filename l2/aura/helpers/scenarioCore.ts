/// <mls fileReference="_102020_/l2/aura/helpers/scenarioCore.ts" enhancement="_blank"/>
// The state a page can be put into, derived from the l4 workspace (TASK-102020-scenario-panel).
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
// WHY THE L4 AND NOT THE L2 `.defs.ts`
// The l2 defs is generator output and may change shape or go away; the l4 workspace is the source.
// The key inventory derives from it by convention, and that was measured before this file existed:
// against what each page actually subscribes to, 34 of 34 pages match EXACTLY — no key missing, none
// extra. The l4 also carries more: `sections` (grouping by intent instead of a flat list of 32
// states), the input's `source` (which ones a human is meant to fill) and `output.fields[].type`
// (the raw material for the fixtures of phase 2).
//
// Everything here is pure: no DOM, no stor, no state. Whoever renders decides the words.

// --- The shape of the l4 workspace, as much of it as this needs ---

export interface IWorkspaceInput {
  name: string;
  type?: string;
  required?: boolean;
  /** Where the value is meant to come from: userInput, selectedEntity, routeParam, systemDefault, actorSession. */
  source?: string;
  /** The query that feeds a `selectedEntity`. Absent means nothing was named. */
  sourceRef?: string;
}

export interface IWorkspaceBffCall {
  bffId: string;
  kind: 'query' | 'command' | string;
  input?: IWorkspaceInput[];
  output?: { kind?: string; fields?: { name: string; type?: string }[] };
}

export interface IWorkspaceSection {
  sectionId: string;
  intent?: string;
  organisms?: { role?: string; action?: string; dataSource?: string; usage?: string }[];
}

export interface IWorkspace {
  workspaceId: string;
  title?: string;
  entity?: string;
  bffCalls?: IWorkspaceBffCall[];
  sections?: IWorkspaceSection[];
}

/**
 * The l4 workspace out of its source file.
 *
 * The file is `export const <name>Workspace = { … }` and the object is plain JSON in all 34 real
 * ones, so it is parsed rather than evaluated — reading a workspace must not run anything.
 */
export function parseWorkspace(source: string): IWorkspace | null {
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as IWorkspace;
    return parsed && typeof parsed.workspaceId === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

// --- The states of a page ---

export type ScenarioKind =
  | 'pageStatus'
  | 'actionStatus'
  | 'actionError'
  | 'input'
  | 'queryResult'
  | 'commandOutput';

/** The four values every action status moves through. Convention, not declaration — see the header. */
export const ACTION_STATUS_VALUES = ['idle', 'loading', 'success', 'error'] as const;

export interface IScenarioState {
  /** The `collabState` key — what a simulation writes. */
  key: string;
  /** The property on the page class, which is how a control on screen is recognised. */
  name: string;
  kind: ScenarioKind;
  /** The action it belongs to; null for the page's own status. */
  bffId: string | null;
  /** Closed domain, when there is one. */
  valueSet?: readonly string[];
  /** For inputs: where the value is meant to come from, and the query that feeds it. */
  source?: string;
  sourceRef?: string;
  type?: string;
  /**
   * False for what phase 1 cannot offer honestly (a list or an object needs a fixture).
   *
   * They are still LISTED: a state the panel hides is a state the user thinks does not exist.
   */
  editable: boolean;
}

/** `cmdCreateChangeOrder` + `clientClientId` -> `cmdCreateChangeOrderClientClientId`. */
function propertyName(bffId: string, field: string): string {
  return bffId + field.charAt(0).toUpperCase() + field.slice(1);
}

/**
 * Every state the page has, derived from the workspace.
 *
 * The convention, verified against all 34 pages of the real module:
 *
 *   ui.<page>.status                     -> the page's own status
 *   ui.<page>.action.<bff>.status        -> one per bffCall
 *   ui.<page>.action.<bff>.error         -> commands only
 *   ui.<page>.data.<bff>                 -> queries
 *   ui.<page>.output.<bff>               -> commands
 *   ui.<page>.input.<bff>.<field>        -> one per declared input
 */
export function scenarioKeys(workspace: IWorkspace): IScenarioState[] {
  const page = workspace.workspaceId;
  const states: IScenarioState[] = [{
    key: `ui.${page}.status`,
    name: 'status',
    kind: 'pageStatus',
    bffId: null,
    // No domain in the l4 and none in the l2 defs either (it only had `defaultValue: ""`), so this is
    // a free field. Inventing an enum here would offer values the page never compares against.
    editable: true,
  }];

  for (const call of workspace.bffCalls ?? []) {
    const bff = call.bffId;
    states.push({
      key: `ui.${page}.action.${bff}.status`,
      name: `${bff}State`,
      kind: 'actionStatus',
      bffId: bff,
      valueSet: ACTION_STATUS_VALUES,
      editable: true,
    });

    if (call.kind === 'query') {
      states.push({
        key: `ui.${page}.data.${bff}`,
        name: `${bff}Data`,
        kind: 'queryResult',
        bffId: bff,
        editable: false,
      });
    } else {
      states.push({
        key: `ui.${page}.output.${bff}`,
        name: `${bff}Output`,
        kind: 'commandOutput',
        bffId: bff,
        editable: false,
      });
      states.push({
        key: `ui.${page}.action.${bff}.error`,
        name: `${bff}Error`,
        kind: 'actionError',
        bffId: bff,
        editable: true,
      });
    }

    for (const field of call.input ?? []) {
      states.push({
        key: `ui.${page}.input.${bff}.${field.name}`,
        name: propertyName(bff, field.name),
        kind: 'input',
        bffId: bff,
        source: field.source,
        sourceRef: field.sourceRef,
        type: field.type,
        editable: true,
      });
    }
  }

  return states;
}

// --- Grouping: the page's own sections, not a flat list of 32 ---

export interface IScenarioGroup {
  /** `sections[].sectionId`, or '' for what no section claims. */
  sectionId: string;
  /** What the section is for, from the workspace. Empty for the leftover group. */
  intent: string;
  states: IScenarioState[];
}

/**
 * The states grouped by the section that uses their action.
 *
 * A page has a median of 32 states; a flat list of 32 is a wall. The workspace already says which
 * action belongs to which section and why (`intent`), so the panel can read like the screen looks.
 *
 * What no section claims goes last, in one group — dropping it would hide a state, and a hidden state
 * is one the user believes does not exist.
 */
export function groupBySection(workspace: IWorkspace, states: IScenarioState[]): IScenarioGroup[] {
  const sectionOf = new Map<string, IWorkspaceSection>();
  for (const section of workspace.sections ?? []) {
    for (const organism of section.organisms ?? []) {
      for (const bff of [organism.action, organism.dataSource]) {
        if (bff && !sectionOf.has(bff)) sectionOf.set(bff, section);
      }
    }
  }

  const groups: IScenarioGroup[] = (workspace.sections ?? []).map((section) => ({
    sectionId: section.sectionId,
    intent: section.intent ?? '',
    states: [],
  }));
  const leftover: IScenarioGroup = { sectionId: '', intent: '', states: [] };

  for (const state of states) {
    const section = state.bffId ? sectionOf.get(state.bffId) : undefined;
    const group = section ? groups.find((candidate) => candidate.sectionId === section.sectionId) : undefined;
    (group ?? leftover).states.push(state);
  }

  return [...groups.filter((group) => group.states.length), ...(leftover.states.length ? [leftover] : [])];
}

// --- The defect the l4 makes visible ---

/**
 * Inputs a human is meant to fill and NO control on screen writes.
 *
 * This is the shape of a real bug: `cmdDeleteChangeOrder.changeOrderId` is declared
 * `source: selectedEntity` with no `sourceRef`, the generated page has no control bound to it, so the
 * state stays empty and the delete button is `?disabled` forever — which is why it could not even be
 * selected until the editor learned to reach inert elements.
 *
 * Measured in the module: 60 inputs carry that declaration, the generator inferred a picker for 30 of
 * them, and the other 30 have no control at all. So the declaration alone is NOT the signal — the
 * page source has to be checked, which is what this does.
 *
 * Only `userInput` and `selectedEntity` are considered: `systemDefault`, `routeParam` and
 * `actorSession` are filled by the app by design, and flagging those would be noise.
 */
export function inputsWithoutWriter(states: readonly IScenarioState[], pageSource: string): IScenarioState[] {
  const human = new Set(['userInput', 'selectedEntity']);
  return states.filter((state) => {
    if (state.kind !== 'input' || !human.has(state.source ?? '')) return false;
    return !hasWriter(pageSource, state.name);
  });
}

/**
 * Whether anything ON THIS SCREEN writes the input.
 *
 * Three shapes, and the third one matters most — it was found by checking a claim instead of trusting
 * it. The shared class generates a `set<Name>()` for EVERY input (288 of them in the module), so the
 * setter existing proves nothing; what counts is a variation calling it. Layouts 2 and 3 of the same
 * page have a clickable row that calls a dozen at once, while layout 1 has no row selection at all —
 * so this is a per-VARIATION answer, never a per-page one.
 */
function hasWriter(pageSource: string, property: string): boolean {
  const capitalised = property.charAt(0).toUpperCase() + property.slice(1);
  const bound = new RegExp(`\\.value=\\$\\{\\s*this\\.${escapeForRegExp(property)}\\b`, 'u');
  const handled = new RegExp(`@(?:input|change)=\\$\\{\\s*this\\.handle${escapeForRegExp(capitalised)}Change\\b`, 'u');
  const viaSetter = new RegExp(`this\\.set${escapeForRegExp(capitalised)}\\s*\\(`, 'u');
  return bound.test(pageSource) || handled.test(pageSource) || viaSetter.test(pageSource);
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
