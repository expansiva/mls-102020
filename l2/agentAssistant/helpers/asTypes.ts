/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asTypes.ts" enhancement="_blank"/>

// Data model of agentAssistant. Everything here travels: the catalog is rebuilt from the
// generated app's own files (l1 requests/controllers defs, l2 contracts, l4 ontology), and the
// conversation state lives in the task's longMemory between hooks.

// ---- TypeScript type literals parsed from the l2 contracts ----

export type AsTypeNode =
  | { kind: 'primitive'; name: 'string' | 'number' | 'boolean' | 'unknown' }
  | { kind: 'literal'; values: string[] }
  | { kind: 'object'; fields: AsTypeField[] }
  | { kind: 'array'; of: AsTypeNode }
  | { kind: 'tuple'; items: AsTypeNode[] }
  | { kind: 'ref'; name: string };

export interface AsTypeField {
  name: string;
  optional: boolean;
  type: AsTypeNode;
}

export interface AsContractRoute {
  route: string;
  kind: string;
  writes: string;
  input: AsTypeNode;
}

// ---- catalog ----

export interface AsEnumValue {
  value: string;
  label: string;
}

export type AsInputRole = 'value' | 'ref' | 'version';

export interface AsInputField {
  path: string;              // wire path, dot separated (exactly what /execBff receives)
  label: string;
  description: string;
  wireType: 'string' | 'number' | 'boolean' | 'unknown';
  valueType: string;         // ontology type when the field maps to one (money, integer, text...), else the wire type
  enumValues: AsEnumValue[];
  required: boolean;
  role: AsInputRole;
  ref: string;               // target entity when role === 'ref'
}

export interface AsCommand {
  route: string;
  module: string;
  kind: 'cmd' | 'qry';       // qry = read-only: runs without a confirmation round
  purpose: string;
  writes: string;
  entity: string;            // cmd: the entity it writes; qry: the entity it returns first
  inputs: AsInputField[];    // paging params are not inputs: buildWireInput sends them
  pageParam: string;
  pageSizeParam: string;
}

export interface AsRelated {
  path: string;              // relative to one list item
  entity: string;
  fields: string[];
}

export interface AsLookup {
  route: string;
  module: string;
  purpose: string;
  entity: string;
  listPath: string;          // where the list lives in the response data
  itemsPath: string;         // '' when listPath already is the array
  hasMorePath: string;
  pageParam: string;
  pageSizeParam: string;
  filters: AsInputField[];   // non-paging inputs
  related: AsRelated[];
}

export interface AsEntityField {
  path: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  derived: boolean;
  to: string[];
  enumValues: AsEnumValue[];
}

export interface AsEntity {
  module: string;
  entityId: string;
  title: string;
  displayField: string;
  fields: AsEntityField[];
}

export interface AsCatalog {
  commands: AsCommand[];
  queries: AsCommand[];
  lookups: AsLookup[];
  entities: AsEntity[];
  issues: string[];
}

export interface AsModuleSources {
  module: string;
  routeKeys: string[];
  requests: string[];        // l1 <module>/layer_2_application/requests/*.defs.ts
  contracts: string[];       // l2 contracts referenced by the controllers defs
  ontology: string[];        // l4 <module>/ontology/<Entity>.defs.ts
}

// ---- conversation state (task longMemory) ----

export interface AsRefIntent {
  lookupRoute: string;
  lookupParams: Record<string, string>;
  matchEntity: string;
  matchText: string;
}

export interface AsPicked {
  id: string;
  label: string;
  version?: number;
}

export interface AsCandidate {
  route: string;
  title: string;
  reason: string;
  values: Record<string, string>;
  refs: Record<string, AsRefIntent>;
}

export interface AsOption {
  id: string;
  label: string;
  description?: string;
  recommended?: boolean;
}

// Same shape as the shared Decision Clarification question, so it is handed to the widget as is.
export interface AsQuestion {
  id: string;
  title?: string;
  question: string;
  options: AsOption[];
  allowNotes?: boolean;
  notesPlaceholder?: string;
}

export interface AsPending {
  kind: 'questions' | 'confirm';
  title: string;
  intro: string;
  questions: AsQuestion[];
  picks: Record<string, Record<string, AsPicked>>;   // questionId -> optionId -> record behind it
  freeRefs: string[];                                 // ref questions whose typed text IS the identifier (no list query reaches the entity)
}

export const AS_STATE_SCHEMA = 'agentAssistant-state-v4' as const;

// 'alternatives': the candidates are readings of the sentence, the user picks ONE.
// 'sequence': the candidates are ALL to be run, in order (a later one may use what an earlier
// one created, so each action is resolved only after the previous one ran).
// 'question': the sentence asks for information; one query runs (no confirmation) and its data
// is turned into an answer by the 'answer' step.
// 'manual': the sentence asks how to use the app or what it has; nothing runs, the answer is
// written from the app's own defs (journeys, screens, rules, actors).
export type AsMode = 'alternatives' | 'sequence' | 'question' | 'manual';

// What the interpret call picked from the app map for a 'manual' question; all empty = overview.
export interface AsManualSelection {
  modules: string[];
  pages: Array<{ module: string; pageId: string }>;
  journeys: Array<{ module: string; journeyId: string }>;
}

// What the 'answer' step shows before the task closes: an answer composed from query data, or a
// fixed message (nothing fits, a failed query...).
export interface AsFinal {
  kind: 'answer' | 'message';
  text: string;
}

export interface AsActionResult {
  route: string;
  title: string;
  params: Record<string, unknown>;
  summary: string[];
  ok: boolean;
  data: unknown;
  error: { code: string; message: string } | null;
}

export interface AsState {
  schema: typeof AS_STATE_SCHEMA;
  project: number;
  userText: string;
  userLanguage: string;
  reply: string;
  round: number;
  mode: AsMode;
  candidates: AsCandidate[];
  queue: AsCandidate[];              // sequence: actions still to run after the current one
  authorized: boolean;               // the user confirmed (the action, or the whole sequence)
  results: AsActionResult[];         // actions already run in this task (data kept only for queries)
  final: AsFinal | null;
  manual: AsManualSelection | null;
  route: string;
  title: string;
  values: Record<string, string>;
  refs: Record<string, AsRefIntent>;
  picked: Record<string, AsPicked>;
  pending: AsPending | null;
}

export interface AsAnswer {
  id: string;
  optionId: string;
  notes?: string;
}

export type AsNext =
  | { kind: 'reply'; text: string }
  | { kind: 'ask'; pending: AsPending }
  | { kind: 'ready' }                                   // current action fully decided and authorized
  | { kind: 'finished'; results: AsActionResult[] };    // nothing left to run (or a run failed)

export interface AsRow {
  id: string;
  label: string;
  version?: number;
  texts: Record<string, string>;   // entityId -> display value found in the row
}

export interface AsBffResponse {
  ok: boolean;
  data: unknown;
  error: { code: string; message: string; details?: unknown } | null;
}

export type AsBffCall = (routine: string, params: Record<string, unknown>) => Promise<AsBffResponse>;
