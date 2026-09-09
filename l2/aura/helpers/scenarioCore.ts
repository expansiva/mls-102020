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
  /**
   * `"<operationId>.<inputId>"` — the mechanical link to the operation that declares this input, and
   * through it to the ontology field that gives the input a human name.
   */
  from?: string;
  /**
   * Closed domain, declared right here.
   *
   * It was the missing field, and its absence was a DEFECT and not a cosmetic one: 9 of the 29 inputs
   * of the 102047 declare their domain in the workspace, and because the interface did not have the
   * field `scenarioKeys` never set `valueSet`, so the panel drew a free text box and asked the user
   * to type `asc` by hand next to a declaration that says the only options are `asc` and `desc`.
   */
  enumValues?: readonly string[];
}

export interface IWorkspaceBffCall {
  bffId: string;
  kind: 'query' | 'command' | string;
  /** The l4 operations this action runs — how the page reaches the vocabulary. */
  uses?: { operationId?: string }[];
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
  /** "Chamado" — what the page is about, in the words the app itself uses. */
  title?: string;
  /** "Painel de Chamado." — what it is for. */
  purpose?: string;
  entity?: string;
  actors?: readonly string[];
  bffCalls?: IWorkspaceBffCall[];
  sections?: IWorkspaceSection[];
  /** Every operation the page runs, when the workspace lists them at the top level. */
  operationIds?: readonly string[];
}

/**
 * The object a `.defs.ts` exports, by brace matching anchored on `export const`.
 *
 * The object is plain JSON in every real file, so it is parsed rather than evaluated — reading the l4
 * must not run anything.
 *
 * Anchored, and matching, because "first `{` to last `}`" only survives the workspace files. An
 * ontology file imports a type first (`import type { Ns4OntologyEntityArtifact }`), so the first `{`
 * is the import's; a page defs has a `{` in its header comment and a second export at the end. That
 * naive slice is what stopped the first measurement of this analysis from reading anything but
 * workspaces. Strings are tracked so a brace inside a description does not shift the count.
 */
export function parseDefsObject<T>(source: string): T | null {
  const anchor = source.indexOf('export const');
  const start = anchor < 0 ? -1 : source.indexOf('{', anchor);
  if (start < 0) return null;

  let depth = 0;
  let quote: string | null = null;
  let end = -1;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth += 1; continue; }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) return null;

  try {
    return JSON.parse(source.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** The l4 workspace out of its source file. */
export function parseWorkspace(source: string): IWorkspace | null {
  const parsed = parseDefsObject<IWorkspace>(source);
  return parsed && typeof parsed.workspaceId === 'string' ? parsed : null;
}

/** An l4 operation — the name of an action and the `fieldRef` of each of its inputs. */
export function parseOperation(source: string): IWorkspaceOperation | null {
  const parsed = parseDefsObject<IWorkspaceOperation>(source);
  return parsed && typeof parsed.operationId === 'string' ? parsed : null;
}

/** An l4 ontology entity — where the human name of every field is. */
export function parseEntity(source: string): IOntologyEntity | null {
  const parsed = parseDefsObject<IOntologyEntity>(source);
  return parsed && typeof parsed.entityId === 'string' ? parsed : null;
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
   * For inputs: the input's own name in the workspace (`search`), which is NOT `name` (that one is
   * the page property, `qryListTicketSearch`). It is what reaches the operation's `inputId` and from
   * there the ontology field that gives the line a human label.
   */
  field?: string;
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
        field: field.name,
        // The workspace's own declaration wins for THIS page's use of the input. Where it is silent
        // the vocabulary looks further (the operation, then the ontology) — but that needs files
        // this function does not read, so it is `describeState`'s job, not this one's.
        valueSet: field.enumValues?.length ? field.enumValues : undefined,
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

// --- The vocabulary: the words the l4 already has for all of this ---
//
// The panel used to name every line after the property the generator emitted
// (`qryListTicketSortOrder`), which is the one name in the whole system that was never chosen for a
// human to read. The l4 has the others, and it has them for EVERY line: measured over the real files,
// 29/29 inputs of the 102047 and 288/288 of the 102046 resolve to a field title through their
// `fieldRef`, all of them carry a description, and 17/17 and 145/145 actions carry an operation
// title — 75/75 and 675/675 states labelled, in both generators.
//
// The link is mechanical, not a guess: a workspace input declares `from: "<operationId>.<inputId>"`,
// the operation input declares `fieldRef: "<Entity>.<fieldId>"`, and the ontology field carries
// `title`. Nothing here infers a word from an identifier.
//
// WHAT THESE FUNCTIONS DO NOT DO: chrome. `label` is only ever the l4's own words, in the language the
// l4 was written in (`userLanguage: "pt-BR"` in both projects, and the same words the app itself
// shows). "situação", "Lista de" and the rest belong to the panel, which is translated pt/en/es —
// composing them here would nail one language into a file that has no i18n.

export interface IOperationInput {
  inputId: string;
  /** `"<Entity>.<fieldId>"` — where the human label comes from. */
  fieldRef?: string;
  /** The help line. Present for every input in both projects. */
  description?: string;
  enumValues?: readonly string[];
  source?: string;
  required?: boolean;
}

export interface IWorkspaceOperation {
  operationId: string;
  /** "Listar Chamado" — the name of the ACTION. */
  title?: string;
  entity?: string;
  kind?: string;
  story?: { actor?: string; goal?: string; steps?: readonly string[]; outcome?: string };
  accessPattern?: { description?: string };
  inputs?: readonly IOperationInput[];
}

export interface IOntologyConstraint {
  kind?: string;
  /** For `kind: 'enum'` it is a JSON ARRAY IN A STRING (`"[\"open\",\"closed\"]"`). */
  value?: unknown;
}

export interface IOntologyField {
  fieldId: string;
  title?: string;
  description?: string;
  type?: string;
  constraints?: readonly IOntologyConstraint[];
}

export interface IOntologyEntity {
  entityId: string;
  title?: string;
  description?: string;
  fields?: readonly IOntologyField[];
}

export interface IL4Vocabulary {
  /** Operations by operationId — only the ones the page's bffCalls cite. */
  operations: Record<string, IWorkspaceOperation>;
  /** Entities by entityId — only the ones those operations reference. */
  entities: Record<string, IOntologyEntity>;
}

/** Nothing read yet, or nothing readable: every label degrades to the technical name. */
export const NO_VOCABULARY: IL4Vocabulary = { operations: {}, entities: {} };

export interface IStateLabel {
  /**
   * What the line is called, in the l4's own words — "Título", "Listar Chamado", "Chamado".
   *
   * Never carries a chrome word: the panel adds "situação"/"status"/"estado" itself, in the language
   * the user picked.
   */
  label: string;
  /** The help line, when the l4 has one. */
  hint?: string;
  /** Closed domain found in the l4 — the workspace input, the operation input, or the ontology. */
  valueSet?: readonly string[];
  /** A result: a list of the entity, or one of it. Lets the panel say "Lista de Chamado". */
  many?: boolean;
  /** False when nothing in the l4 named it and `label` IS the technical name. */
  fromL4: boolean;
}

/** The workspace's own declaration of an input, which is where `from` and `enumValues` live. */
function workspaceInput(workspace: IWorkspace, bffId: string, field: string): IWorkspaceInput | null {
  const call = (workspace.bffCalls ?? []).find((candidate) => candidate.bffId === bffId);
  return (call?.input ?? []).find((candidate) => candidate.name === field) ?? null;
}

function callOf(workspace: IWorkspace, bffId: string | null): IWorkspaceBffCall | null {
  if (!bffId) return null;
  return (workspace.bffCalls ?? []).find((candidate) => candidate.bffId === bffId) ?? null;
}

/** The operation an action runs. First `uses[]` entry that was actually read. */
function operationOf(
  workspace: IWorkspace,
  bffId: string | null,
  vocabulary: IL4Vocabulary,
): IWorkspaceOperation | null {
  const call = callOf(workspace, bffId);
  for (const use of call?.uses ?? []) {
    const operation = use.operationId ? vocabulary.operations[use.operationId] : undefined;
    if (operation) return operation;
  }
  return null;
}

function fieldOf(vocabulary: IL4Vocabulary, fieldRef: string | undefined): IOntologyField | null {
  if (!fieldRef) return null;
  const dot = fieldRef.indexOf('.');
  if (dot < 1) return null;
  const entity = vocabulary.entities[fieldRef.slice(0, dot)];
  const fieldId = fieldRef.slice(dot + 1);
  return (entity?.fields ?? []).find((candidate) => candidate.fieldId === fieldId) ?? null;
}

/**
 * The closed domain of an ontology field, from its `enum` constraint.
 *
 * The value arrives as a JSON array INSIDE A STRING, which is why this is parsed rather than read:
 * `{"kind":"enum","value":"[\"open\",\"closed\"]"}`. It is the only source in the older generator —
 * 20 inputs of the 102046 have their domain here and nowhere else.
 */
export function enumOfField(field: IOntologyField | null): readonly string[] | undefined {
  for (const constraint of field?.constraints ?? []) {
    if (constraint.kind !== 'enum') continue;
    const raw = constraint.value;
    if (Array.isArray(raw)) return raw.filter((value): value is string => typeof value === 'string');
    if (typeof raw !== 'string') continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const values = parsed.filter((value): value is string => typeof value === 'string');
        if (values.length) return values;
      }
    } catch {
      // A constraint that is not a JSON array is not a domain we can offer as chips.
    }
  }
  return undefined;
}

/**
 * What one line of the panel says, in the l4's words.
 *
 * Degrades in one direction only: with no operation, no entity or no `fieldRef`, the label IS the
 * technical name and `fromL4` says so. A plausible invented word would be worse than the property
 * name — the property name is at least verifiable against the source.
 */
export function describeState(
  state: IScenarioState,
  workspace: IWorkspace,
  vocabulary: IL4Vocabulary,
): IStateLabel {
  // The domain the state already carries travels through EVERY branch, not only the input one: an
  // action status is `idle|loading|success|error` and those four chips are the panel's whole point.
  // Losing them here would turn the most used control in the tool into a text box.
  const technical: IStateLabel = { label: state.name, valueSet: state.valueSet, fromL4: false };

  if (state.kind === 'pageStatus') {
    return workspace.title
      ? { ...technical, label: workspace.title, hint: workspace.purpose, fromL4: true }
      : technical;
  }

  const operation = operationOf(workspace, state.bffId, vocabulary);

  if (state.kind === 'actionStatus' || state.kind === 'actionError') {
    return operation?.title ? { ...technical, label: operation.title, fromL4: true } : technical;
  }

  if (state.kind === 'queryResult' || state.kind === 'commandOutput') {
    const entityId = operation?.entity ?? workspace.entity;
    const entity = entityId ? vocabulary.entities[entityId] : undefined;
    const many = callOf(workspace, state.bffId)?.output?.kind === 'list';
    // No `hint` from the entity's own description: it says what a Chamado IS, which is the same
    // paragraph on every result line of that entity and tells nobody anything about THIS state.
    return entity?.title
      ? { ...technical, label: entity.title, many, fromL4: true }
      : { ...technical, many };
  }

  // An input. The label is the ONTOLOGY field's title, reached through the `fieldRef` the operation
  // declares for this exact inputId — never through the property name, and never by matching words.
  const declared = state.field ? workspaceInput(workspace, state.bffId ?? '', state.field) : null;
  const inputId = (declared?.from ?? '').split('.').pop() || state.field || '';
  const operationInput = (operation?.inputs ?? []).find((candidate) => candidate.inputId === inputId);
  const field = fieldOf(vocabulary, operationInput?.fieldRef);

  // Three sources, most specific first: the workspace declares the domain for this page's use of the
  // input (the current generator, 9 in the 102047), the operation for every use of it, and the
  // ontology for the field itself (the older generator, 20 in the 102046).
  const valueSet = state.valueSet
    ?? (operationInput?.enumValues?.length ? operationInput.enumValues : undefined)
    ?? enumOfField(field);

  if (!field?.title) return valueSet ? { ...technical, valueSet } : technical;
  return { label: field.title, hint: operationInput?.description ?? field.description, valueSet, fromL4: true };
}

/**
 * The action a group of lines belongs to — the sub-block's heading.
 *
 * Without it the short labels are dishonest: `cmdCreateTicket.title` and `cmdUpdateTicket.title` are
 * both "Título", and only the action around them tells them apart. Grouping is not decoration here,
 * it is what makes the short label true.
 */
export function describeAction(
  bffId: string,
  workspace: IWorkspace,
  vocabulary: IL4Vocabulary,
): IStateLabel | null {
  if (!callOf(workspace, bffId)) return null;
  const operation = operationOf(workspace, bffId, vocabulary);
  if (!operation?.title) return { label: bffId, fromL4: false };

  // The outcome, not the goal: the goal repeats the title in every operation of both projects
  // ("Listar Chamado"), while the outcome says what the actor gets ("Encontrar o registro.").
  const story = operation.story;
  const hint = [story?.outcome, story?.goal, operation.accessPattern?.description]
    .find((candidate) => candidate && candidate !== operation.title);
  return { label: operation.title, hint, fromL4: true };
}

// --- Which files the vocabulary needs ---

/** The operations the page's actions cite, deduplicated, in the order the actions appear. */
export function operationIdsOf(workspace: IWorkspace): string[] {
  const ids: string[] = [];
  for (const call of workspace.bffCalls ?? []) {
    for (const use of call.uses ?? []) {
      if (use.operationId && !ids.includes(use.operationId)) ids.push(use.operationId);
    }
  }
  // The top-level list is the same set in every real workspace, and it is the fallback for a shape
  // that declares the operations without repeating them per call.
  for (const id of workspace.operationIds ?? []) if (!ids.includes(id)) ids.push(id);
  return ids;
}

/**
 * The entities those operations name — through `entity` AND through every input's `fieldRef`.
 *
 * The `fieldRef` half is not optional: `recordComment` is an operation on `TicketComment` whose first
 * input points at `Ticket.ticketId`, so reading only `entity` would leave that line unlabelled.
 */
export function entityIdsOf(
  operations: readonly IWorkspaceOperation[],
  workspace: IWorkspace,
): string[] {
  const ids: string[] = [];
  const add = (id: string | undefined): void => {
    if (id && !ids.includes(id)) ids.push(id);
  };
  add(workspace.entity);
  for (const operation of operations) {
    add(operation.entity);
    for (const input of operation.inputs ?? []) {
      const ref = input.fieldRef ?? '';
      const dot = ref.indexOf('.');
      if (dot > 0) add(ref.slice(0, dot));
    }
  }
  return ids;
}

// --- Grouping by action, which is what makes a short label honest ---

export interface IScenarioActionBlock {
  /** The action, or null for the page's own status. */
  bffId: string | null;
  states: IScenarioState[];
}

/**
 * The states of a group, split into the actions they belong to.
 *
 * Run-length and not a bucket sort on purpose: `scenarioKeys` emits an action's states together and
 * `groupBySection` preserves that, so consecutive runs ARE the actions — and an action that somehow
 * appeared twice stays two blocks instead of being silently merged.
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
