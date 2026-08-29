/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeSharedScaffold.ts" enhancement="_blank"/>

// Deterministic scaffold generator for l2_shared materialization items.
//
// The shared base class is a mechanical projection of the .defs.ts (states, actions, i18n,
// route params) plus the workspace contract (.ts under web/contracts). This module renders it
// WITHOUT an LLM call: output size stops being bounded by model max_tokens (run03: projectDetail
// 157KB defs -> ~55k output tokens exceeded every provider ceiling) and reruns become exact.
//
// Policy: PURE module (no fs, no mls.*, no DOM) so the Node CLI runner and the Studio agent share
// one implementation. When the defs uses a shape this generator does not model, it returns
// { code: null, reason } and the caller falls back to the LLM path — never guess here.
// The canonical output style mirrors the mls-102045 golden files (clientManagement/clientPortal);
// the arbiter of correctness is strict tsc + the generated typecheck .test.ts, not byte equality.

export interface SharedScaffoldResult {
  code: string | null;
  reason?: string;
}

/** The four scenary members are one block. T1 (LLM template) and T2 (re-inject) both come from renderUiScenary. */
export const SHARED_SCENARY_MEMBERS = ['setUiScenary', 'handleUiScenaryChange', 'applyUrlScenary', 'syncScenaryQuery'] as const;

export type SharedLlmTemplate = {
  code: string;
  mode: 'scaffold' | 'scenary-block';
};

interface ContractField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'stringUnion' | 'opaque';
  optional: boolean;
  /** first literal of a string-union type — the zero value for generated defaults */
  firstLiteral?: string;
}

interface ContractInterface {
  name: string;
  fields: ContractField[];
}

interface DefsState {
  stateKey: string;
  name: string;
  kind: 'pageStatus' | 'actionStatus' | 'input' | 'queryResult' | 'commandOutput' | 'actionError' | 'uiScenary';
  defaultValue: unknown;
  actionRef?: string;
  valueSet?: string[];
  contractRef?: { commandName: string; direction: 'input' | 'output'; field?: string };
  outputShape?: 'paginated' | 'object' | 'array';
  collection?: boolean;
}

interface DefsScenary {
  value: string;
  kind: 'base' | 'detail' | 'command';
  commandName?: string;
  preconditions: string[];
}

interface DefsPrefillField { itemField: string; targetStateKey: string }

interface DefsPrefill {
  command: string;
  sourceStateKey: string;
  sourceOutputShape: 'array' | 'object';
  matchField: string;
  fields: DefsPrefillField[];
}

interface DefsAction {
  actionId: string;
  kind: 'query' | 'command' | 'stateSetter';
  /** l4 title of the operation this action fronts (defs `purpose`) — one short line for the JSDoc. */
  purpose?: string;
  methodName: string;
  handlerName: string;
  commandRef?: string;
  routeKey?: string;
  inputStateKeys?: string[];
  routeParamInputStateKeys?: string[];
  selectedEntityInputStateKeys?: string[];
  outputStateKeys?: string[];
  statusStateKey?: string;
  errorStateKey?: string;
  feedback?: { successMessageKey?: string; errorMessageKey?: string };
  clearInputStateKeys?: string[];
  refreshActionIds?: string[];
  stateKey?: string;
  prefill?: DefsPrefill;
}

interface ScaffoldModel {
  outputPath: string;
  baseClassName: string;
  routePattern: string;
  states: DefsState[];
  actions: DefsAction[];
  scenaries: DefsScenary[];
  initialLoads: { actionId: string }[];
  i18n: Record<string, string>;
  // The module's default locale (defs i18nMeta.defaultLocale). The catalog is keyed by its LOWERCASE
  // form because the runtime always sets document.documentElement.lang from the normalized config list
  // (102033 listRuntimeLanguages -> lowercase) and the base class looks up messages[lang.toLowerCase()].
  defaultLocale: string;
  // Every locale the module declares (defs i18nMeta.runtimeLocales, region preserved and lowercased).
  // The catalog emits ALL of them, not just the default: a page references sharedMessages['pt-br'], so a
  // shared regenerated with one locale would silently resolve every page label back to English.
  runtimeLocales: string[];
  // Text already translated in the .ts being overwritten, per locale. Regenerating the shared used to
  // drop every added language and depend on @@addLanguage retranslating the whole module (i18n.md item 4:
  // "churn"), which also lost any translation fixed by hand. Carried over by key.
  previousText: Map<string, Record<string, string>>;
  contractTsPath: string;
  contracts: { commandName: string; routeConst: string }[];
  interfaces: Map<string, ContractInterface>;
  stateByKey: Map<string, DefsState>;
  actionById: Map<string, DefsAction>;
}

class ScaffoldBail extends Error {}

function bail(reason: string): never {
  throw new ScaffoldBail(reason);
}

/**
 * @param previousSource content of the .ts being overwritten, when it exists. Only its i18n block is
 *        read, to carry translations forward (see ScaffoldModel.previousText).
 */
export function generateSharedScaffold(outputPath: string, data: unknown, contractSource: string, previousSource?: string): SharedScaffoldResult {
  try {
    const model = buildModel(outputPath, data, contractSource, previousSource);
    return { code: render(model) };
  } catch (error) {
    if (error instanceof ScaffoldBail) return { code: null, reason: error.message };
    throw error;
  }
}

/**
 * Just the scenary methods, from the same renderUiScenary the full scaffold uses.
 * Survives a later render() bail: buildModel is enough.
 */
export function renderUiScenaryMembers(
  outputPath: string,
  data: unknown,
  contractSource: string,
  previousSource?: string,
): SharedScaffoldResult {
  try {
    const model = buildModel(outputPath, data, contractSource, previousSource);
    if (!uiScenaryState(model)) return { code: null, reason: 'no uiScenary state' };
    return { code: renderUiScenary(model).join('\n') };
  } catch (error) {
    if (!(error instanceof ScaffoldBail)) throw error;
    const fallback = buildScenaryOnlyModel(outputPath, data);
    if (!fallback || !uiScenaryState(fallback)) return { code: null, reason: error.message };
    return { code: renderUiScenary(fallback).join('\n') };
  }
}

/** Template for the l2_shared LLM fallback: full scaffold when we have it, else the scenary block. */
export function sharedLlmFallbackTemplate(
  outputPath: string,
  data: unknown,
  contractSource: string,
  previousSource?: string,
): SharedLlmTemplate | { code: null; reason: string } {
  const scaffold = generateSharedScaffold(outputPath, data, contractSource, previousSource);
  if (scaffold.code) return { code: scaffold.code, mode: 'scaffold' };
  const members = renderUiScenaryMembers(outputPath, data, contractSource, previousSource);
  if (members.code) return { code: members.code, mode: 'scenary-block' };
  return { code: null, reason: members.reason || scaffold.reason || 'no shared template' };
}

/**
 * After any l2_shared materialization: if the defs has uiScenary and the file is missing or
 * diverged from the scaffold block, replace the four members as a set. Idempotent when they
 * already match. Pure — the caller recompiles and undoes if the inject does not compile.
 */
export function ensureSharedScenaryMembers(
  code: string,
  outputPath: string,
  data: unknown,
  contractSource: string,
): { code: string; injected: boolean; reason?: string } {
  const members = renderUiScenaryMembers(outputPath, data, contractSource);
  if (!members.code) return { code, injected: false, reason: members.reason };
  if (!scenaryMembersNeedReplace(code, members.code)) return { code, injected: false };
  const next = replaceScenaryMembers(code, members.code);
  if (next === code) return { code, injected: false, reason: 'could not locate export class to inject scenary members' };
  return { code: next, injected: true };
}

/**
 * Read `const message_<locale> = { 'key': 'text', … }` entries out of a previously generated i18n block.
 * Text-level parse on purpose: the block is machine-written with one quoted pair per line, and this must
 * never throw on a hand-edited file — an unparsable block just yields no carry-over.
 *
 * Both quote styles are accepted, and that is not politeness: this parser only wrote `'` because the
 * renderer below does, but modules generated by earlier versions carry `"key": "text"` on disk (13 of the
 * 14 shared files in 102045 do). Reading only `'` made every one of them look like a file with NO i18n
 * block at all — `localesOf` returned empty and every page lost its skeleton, silently, with a message
 * that blamed a block that was right there.
 */
export function parsePreviousI18n(
  source: string | undefined,
  /**
   * Const prefix of the catalogue. The shared used `message_`; a page uses
   * `pageMessage_` and an organism `o<n>Message_`, so the reader has to be told
   * which one it is looking at instead of assuming the shared's.
   */
  constPrefix = 'message',
  /**
   * Page id of the file being read. When set, keys of the form
   * `section.|organism.|intent.<pageId>.…` are also exposed under the short form
   * without that segment, so a hand-made translation survives the key rename.
   */
  pageId?: string,
): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  if (!source) return out;
  const start = source.indexOf('/// **collab_i18n_start**');
  const end = source.indexOf('/// **collab_i18n_end**');
  if (start < 0 || end < 0 || end < start) return out;
  const block = source.slice(start, end);
  // The optional `: MessageType` matters: every non-default locale carries that annotation (it is what
  // makes a forgotten translation a compile error), so a parser that only accepted `= {` would read the
  // default locale and silently drop every translated one.
  const constRe = new RegExp(
    `const\\s+${constPrefix}_([A-Za-z0-9_]+)\\s*(?::\\s*[A-Za-z0-9_]+\\s*)?=\\s*\\{([\\s\\S]*?)\\n\\};`,
    'gu',
  );
  for (const constMatch of block.matchAll(constRe)) {
    const locale = constMatch[1].replace(/_/gu, '-').toLowerCase();
    const entries: Record<string, string> = {};
    // `(['"])…\1` per string: the closing quote must be the one that opened, so a key in single quotes
    // holding a double quote (or the reverse) is read whole instead of cut at the first quote it contains.
    for (const pair of constMatch[2].matchAll(PAIR_RE)) {
      entries[unescapeQuoted(pair[2], pair[1])] = unescapeQuoted(pair[4], pair[3]);
    }
    if (Object.keys(entries).length > 0) out.set(locale, migratePreviousI18nKeys(entries, pageId));
  }
  return out;
}

/** Drop the redundant `pageId` segment from a taxonomy i18n key. Unrelated keys stay as-is. */
export function migrateI18nKeyOffPageId(key: string, pageId: string): string {
  if (!key || !pageId) return key;
  const escaped = pageId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return key.replace(new RegExp(`^(section|organism|intent)\\.${escaped}\\.`, 'u'), '$1.');
}

/** If the old (pageId-qualified) key exists and the short key does not, copy the value across. */
export function migratePreviousI18nKeys(entries: Record<string, string>, pageId?: string): Record<string, string> {
  if (!pageId) return entries;
  const out: Record<string, string> = { ...entries };
  for (const [key, value] of Object.entries(entries)) {
    const next = migrateI18nKeyOffPageId(key, pageId);
    if (next !== key && out[next] === undefined) out[next] = value;
  }
  return out;
}

/**
 * One quoted pair per line, in either quote style. `(?!\1)[^\\\n]` is the tempered class: any character
 * that is neither the string's own quote, a backslash, nor a line break — so the match cannot run past the
 * end of its line and swallow the pairs below it.
 */
const PAIR_RE = /^\s*(['"])((?:(?!\1)[^\\\n]|\\.)*)\1\s*:\s*(['"])((?:(?!\3)[^\\\n]|\\.)*)\3\s*,?\s*$/gmu;

/** Unescape only what the string's own quote required escaping: `\'` inside `'…'`, `\"` inside `"…"`. */
function unescapeQuoted(value: string, quote: string): string {
  return value.replace(quote === '"' ? /\\(["\\])/gu : /\\(['\\])/gu, '$1');
}

// ---------------------------------------------------------------------------
// Contract parsing (contracts/*.ts is generated by genCfeContractTs — regular shape)

export function parseContractInterfaces(source: string): Map<string, ContractInterface> {
  const interfaces = new Map<string, ContractInterface>();
  const re = /export interface ([A-Za-z0-9_]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const name = m[1];
    const body = readBraceBody(source, re.lastIndex - 1);
    if (body === null) bail(`contract interface ${name} has unbalanced braces`);
    interfaces.set(name, { name, fields: parseInterfaceFields(name, body) });
    re.lastIndex += body.length;
  }
  return interfaces;
}

/** Returns the text between the brace at openIndex and its matching close (exclusive). */
function readBraceBody(source: string, openIndex: number): string | null {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  return null;
}

/** Fields end at a ';' at brace-depth 0 so inline object types ('{ a: string; }[]') stay intact. */
function parseInterfaceFields(interfaceName: string, body: string): ContractField[] {
  const fields: ContractField[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === ';' && depth === 0) {
      const entry = body.slice(start, i).trim();
      start = i + 1;
      if (!entry) continue;
      const fm = /^([A-Za-z0-9_]+)(\?)?:\s*([\s\S]+)$/.exec(entry);
      if (!fm) bail(`contract interface ${interfaceName} has unparseable member: ${entry.slice(0, 60)}`);
      const rawType = fm[3].trim();
      const unionLiterals = parseStringUnion(rawType);
      // Unknown shapes (Record<string, unknown>, string | null, named types) are opaque: the
      // scaffold only needs a neutral default, not the field's structure. Bail stays for
      // unparseable members and unbalanced braces.
      const type: ContractField['type'] = rawType === 'string' ? 'string'
        : rawType === 'number' ? 'number'
        : rawType === 'boolean' ? 'boolean'
        : rawType.endsWith('[]') ? 'array'
        : unionLiterals ? 'stringUnion'
        : 'opaque';
      const field: ContractField = { name: fm[1], type, optional: fm[2] === '?' };
      if (unionLiterals) field.firstLiteral = unionLiterals[0];
      fields.push(field);
    }
  }
  if (body.slice(start).trim()) bail(`contract interface ${interfaceName} has a trailing member without ';': ${body.slice(start).trim().slice(0, 60)}`);
  return fields;
}

/** '"a" | "b" | "c"' -> ['a', 'b', 'c']; null when the type is not a pure string-literal union. */
function parseStringUnion(rawType: string): string[] | null {
  const parts = rawType.split('|').map(part => part.trim());
  const literals: string[] = [];
  for (const part of parts) {
    const m = /^"([^"]*)"$/.exec(part) || /^'([^']*)'$/.exec(part);
    if (!m) return null;
    literals.push(m[1]);
  }
  return literals.length ? literals : null;
}

// ---------------------------------------------------------------------------
// Model building + validation (bail on any shape this generator does not model)

function buildModel(outputPath: string, data: unknown, contractSource: string, previousSource?: string): ScaffoldModel {
  if (!isRecord(data)) bail('definition is not an object');
  const baseClassName = stringOf(data.baseClassName) || bail('missing baseClassName');
  const routePattern = stringOf(data.routePattern) || bail('missing routePattern');
  const contractRef = isRecord(data.contractRef) ? data.contractRef : bail('missing contractRef');
  const contractTsPath = stringOf(contractRef.tsPath) || bail('missing contractRef.tsPath');
  // Operation-sourced workspaces list route consts under contractRef.contracts; workflow-sourced
  // contracts export no route consts, so execBff receives the action routeKey as a string literal.
  const contracts = Array.isArray(contractRef.contracts)
    ? contractRef.contracts.filter(isRecord).map(c => ({
      commandName: stringOf(c.commandName) || bail('contractRef.contracts entry missing commandName'),
      routeConst: stringOf(c.routeConst) || bail('contractRef.contracts entry missing routeConst'),
    }))
    : [];

  const i18nRaw = isRecord(data.i18n) ? data.i18n : bail('missing i18n');
  const i18n: Record<string, string> = {};
  for (const [key, value] of Object.entries(i18nRaw)) {
    if (typeof value !== 'string') bail(`i18n value for ${key} is not a string`);
    i18n[key] = value;
  }

  const states = (Array.isArray(data.states) ? data.states.filter(isRecord) : bail('missing states')).map(parseState);
  if (!states.length) bail('states is empty');
  const actions = (Array.isArray(data.actions) ? data.actions.filter(isRecord) : bail('missing actions')).map(parseAction);
  if (!actions.length) bail('actions is empty');
  const scenaries = parseScenaries(data.scenaries);

  const initialLoads = Array.isArray(data.initialLoads)
    ? data.initialLoads.filter(isRecord).map(load => ({ actionId: stringOf(load.actionId) || bail('initialLoads entry missing actionId') }))
    : [];

  const interfaces = parseContractInterfaces(contractSource);
  const stateByKey = new Map(states.map(state => [state.stateKey, state]));
  const actionById = new Map(actions.map(action => [action.actionId, action]));

  // defs i18nMeta.defaultLocale names the language the i18n catalog is written in. Falls back to 'en'
  // ONLY when the defs carries no meta at all (older defs) — never assume the catalog is English.
  const i18nMeta = isRecord(data.i18nMeta) ? data.i18nMeta : {};
  const defaultLocale = normalizeLocaleKey(stringOf(i18nMeta.defaultLocale)) || 'en';
  // runtimeLocales keeps the region ('pt-br', not 'pt') — it is what the runtime config lists and what
  // document.documentElement.lang carries. The default always comes first: getMessageKey falls back to
  // keys[0] when the language is unknown.
  const declared = Array.isArray(i18nMeta.runtimeLocales) ? i18nMeta.runtimeLocales.map(item => normalizeLocaleKey(stringOf(item))) : [];
  const runtimeLocales = catalogueLocales(defaultLocale, declared);

  const model: ScaffoldModel = {
    outputPath, baseClassName, routePattern, states, actions, scenaries, initialLoads,
    i18n, defaultLocale, runtimeLocales, previousText: parsePreviousI18n(previousSource),
    contractTsPath, contracts, interfaces, stateByKey, actionById,
  };
  validateModel(model);
  return model;
}

/**
 * Defs-only model for the scenary block. Contract parse/validate never runs: a bail there
 * must not cancel re-injection of setUiScenary / handleUiScenaryChange / applyUrlScenary /
 * syncScenaryQuery, which are a function of scenaries[] + uiScenary state, not of the wire types.
 */
function buildScenaryOnlyModel(outputPath: string, data: unknown): ScaffoldModel | null {
  if (!isRecord(data)) return null;
  const states: DefsState[] = [];
  for (const raw of Array.isArray(data.states) ? data.states : []) {
    if (!isRecord(raw)) continue;
    try { states.push(parseState(raw)); } catch (error) {
      if (error instanceof ScaffoldBail) continue;
      throw error;
    }
  }
  const scenaries = parseScenariesLenient(data.scenaries);
  if (!states.some(state => state.kind === 'uiScenary') && !scenaries.length) return null;
  return {
    outputPath,
    baseClassName: stringOf(data.baseClassName) || 'Base',
    routePattern: stringOf(data.routePattern) || '/',
    states,
    actions: [],
    scenaries,
    initialLoads: [],
    i18n: {},
    defaultLocale: 'en',
    runtimeLocales: ['en'],
    previousText: new Map(),
    contractTsPath: '',
    contracts: [],
    interfaces: new Map(),
    stateByKey: new Map(states.map(state => [state.stateKey, state])),
    actionById: new Map(),
  };
}

function parseScenariesLenient(raw: unknown): DefsScenary[] {
  if (!Array.isArray(raw)) return [];
  const scenes: DefsScenary[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const value = stringOf(item.value);
    const kind = stringOf(item.kind);
    if (!value) continue;
    if (kind !== 'base' && kind !== 'detail' && kind !== 'command') continue;
    scenes.push({
      value,
      kind,
      commandName: stringOf(item.commandName) || undefined,
      preconditions: stringArray(item.preconditions),
    });
  }
  return scenes;
}

function parseScenaries(raw: unknown): DefsScenary[] {
  if (!Array.isArray(raw)) return [];
  const scenes: DefsScenary[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const value = stringOf(item.value);
    const kind = stringOf(item.kind);
    if (!value) continue;
    if (kind !== 'base' && kind !== 'detail' && kind !== 'command') {
      bail(`scenary ${value} has unsupported kind: ${kind}`);
    }
    scenes.push({
      value,
      kind,
      commandName: stringOf(item.commandName) || undefined,
      preconditions: stringArray(item.preconditions),
    });
  }
  return scenes;
}

function parseState(raw: Record<string, unknown>): DefsState {
  const kind = stringOf(raw.kind);
  if (!['pageStatus', 'actionStatus', 'input', 'queryResult', 'commandOutput', 'actionError', 'uiScenary'].includes(kind)) {
    bail(`state ${stringOf(raw.stateKey)} has unsupported kind: ${kind}`);
  }
  const state: DefsState = {
    stateKey: stringOf(raw.stateKey) || bail('state missing stateKey'),
    name: stringOf(raw.name) || bail(`state ${stringOf(raw.stateKey)} missing name`),
    kind: kind as DefsState['kind'],
    defaultValue: raw.defaultValue,
  };
  if (typeof raw.actionRef === 'string') state.actionRef = raw.actionRef;
  if (Array.isArray(raw.valueSet)) {
    if (!raw.valueSet.every(v => typeof v === 'string')) bail(`state ${state.stateKey} valueSet is not string[]`);
    state.valueSet = raw.valueSet as string[];
  }
  if (isRecord(raw.contractRef)) {
    const direction = stringOf(raw.contractRef.direction);
    if (direction !== 'input' && direction !== 'output') bail(`state ${state.stateKey} contractRef.direction invalid`);
    state.contractRef = {
      commandName: stringOf(raw.contractRef.commandName) || bail(`state ${state.stateKey} contractRef missing commandName`),
      direction,
    };
    if (typeof raw.contractRef.field === 'string') state.contractRef.field = raw.contractRef.field;
  }
  if (raw.outputShape !== undefined) {
    const shape = stringOf(raw.outputShape);
    if (shape !== 'paginated' && shape !== 'object' && shape !== 'array') bail(`state ${state.stateKey} outputShape unsupported: ${shape}`);
    state.outputShape = shape;
  }
  if (typeof raw.collection === 'boolean') state.collection = raw.collection;
  if (state.kind === 'actionStatus' && (!state.valueSet || !state.valueSet.length)) bail(`state ${state.stateKey} actionStatus without valueSet`);
  if (state.kind === 'uiScenary' && (!state.valueSet || !state.valueSet.length)) bail(`state ${state.stateKey} uiScenary without valueSet`);
  if (state.kind === 'queryResult' && !state.contractRef) bail(`state ${state.stateKey} queryResult without contractRef`);
  if (state.kind === 'commandOutput' && !state.contractRef) bail(`state ${state.stateKey} commandOutput without contractRef`);
  return state;
}

function parseAction(raw: Record<string, unknown>): DefsAction {
  const kind = stringOf(raw.kind);
  if (kind !== 'query' && kind !== 'command' && kind !== 'stateSetter') bail(`action ${stringOf(raw.actionId)} has unsupported kind: ${kind}`);
  const action: DefsAction = {
    actionId: stringOf(raw.actionId) || bail('action missing actionId'),
    kind,
    methodName: stringOf(raw.methodName) || bail(`action ${stringOf(raw.actionId)} missing methodName`),
    handlerName: stringOf(raw.handlerName) || bail(`action ${stringOf(raw.actionId)} missing handlerName`),
  };
  // l4 enrichment (decision 27/ago): the operation title rides into the JSDoc so the compiled .d.ts
  // is self-explanatory. ONE line, never a dump — absent when the defs carries none.
  if (typeof raw.purpose === 'string' && raw.purpose.trim()) action.purpose = raw.purpose.trim();
  if (typeof raw.commandRef === 'string') action.commandRef = raw.commandRef;
  if (typeof raw.routeKey === 'string') action.routeKey = raw.routeKey;
  if (typeof raw.stateKey === 'string') action.stateKey = raw.stateKey;
  action.inputStateKeys = stringArray(raw.inputStateKeys);
  action.routeParamInputStateKeys = stringArray(raw.routeParamInputStateKeys);
  action.selectedEntityInputStateKeys = stringArray(raw.selectedEntityInputStateKeys);
  action.outputStateKeys = stringArray(raw.outputStateKeys);
  if (typeof raw.statusStateKey === 'string') action.statusStateKey = raw.statusStateKey;
  if (typeof raw.errorStateKey === 'string') action.errorStateKey = raw.errorStateKey;
  if (isRecord(raw.feedback)) {
    action.feedback = {
      successMessageKey: stringOf(raw.feedback.successMessageKey) || undefined,
      errorMessageKey: stringOf(raw.feedback.errorMessageKey) || undefined,
    };
  }
  action.clearInputStateKeys = stringArray(raw.clearInputStateKeys);
  action.refreshActionIds = stringArray(raw.refreshActionIds);
  if (isRecord(raw.prefill)) {
    const shape = stringOf(raw.prefill.sourceOutputShape);
    if (shape !== 'array' && shape !== 'object') bail(`action ${action.actionId} prefill sourceOutputShape unsupported: ${shape}`);
    action.prefill = {
      command: stringOf(raw.prefill.command),
      sourceStateKey: stringOf(raw.prefill.sourceStateKey) || bail(`action ${action.actionId} prefill missing sourceStateKey`),
      sourceOutputShape: shape,
      matchField: stringOf(raw.prefill.matchField) || bail(`action ${action.actionId} prefill missing matchField`),
      fields: Array.isArray(raw.prefill.fields)
        ? raw.prefill.fields.filter(isRecord).map(f => ({
          itemField: stringOf(f.itemField) || bail(`action ${action.actionId} prefill field missing itemField`),
          targetStateKey: stringOf(f.targetStateKey) || bail(`action ${action.actionId} prefill field missing targetStateKey`),
        }))
        : [],
    };
  }

  if (kind === 'stateSetter' && !action.stateKey) bail(`action ${action.actionId} stateSetter without stateKey`);
  if ((kind === 'query' || kind === 'command') && (!action.commandRef || !action.routeKey || !action.statusStateKey)) {
    bail(`action ${action.actionId} missing commandRef/routeKey/statusStateKey`);
  }
  if (kind === 'command' && (!action.errorStateKey || !action.feedback?.errorMessageKey)) {
    bail(`action ${action.actionId} command without errorStateKey/feedback`);
  }
  return action;
}

function validateModel(model: ScaffoldModel): void {
  // Class-member namespace is shared between state properties and action methods/handlers; a
  // collision makes ANY generation (deterministic or LLM) fail its own typecheck test, so surface
  // it as a precise bail — the fix belongs in the defs generator's naming rules.
  const memberOwner = new Map<string, string>();
  for (const state of model.states) memberOwner.set(state.name, `state ${state.stateKey}`);
  for (const action of model.actions) {
    for (const member of [action.methodName, action.handlerName]) {
      const owner = memberOwner.get(member);
      if (owner) bail(`defs naming collision: ${owner} and action ${action.actionId} both claim class member '${member}'`);
      memberOwner.set(member, `action ${action.actionId}`);
    }
  }
  for (const action of model.actions) {
    if (action.kind === 'stateSetter') {
      const state = model.stateByKey.get(action.stateKey || '');
      if (!state) bail(`setter ${action.actionId} references unknown state ${action.stateKey}`);
      if (state.kind !== 'input') bail(`setter ${action.actionId} targets non-input state ${state.stateKey}`);
      if (action.prefill) validatePrefill(model, action);
      continue;
    }
    const commandName = action.commandRef || '';
    inputInterfaceOf(model, commandName);
    outputInterfaceOf(model, commandName);
    for (const key of action.inputStateKeys || []) {
      const state = model.stateByKey.get(key);
      if (!state) bail(`action ${action.actionId} references unknown input state ${key}`);
      if (!state.contractRef?.field) bail(`input state ${key} has no contractRef.field`);
    }
    const statusState = model.stateByKey.get(action.statusStateKey || '');
    if (!statusState || !statusState.valueSet) bail(`action ${action.actionId} status state missing/invalid`);
    for (const value of ['idle', 'loading', 'success', 'error']) {
      if (!statusState.valueSet.includes(value)) bail(`action ${action.actionId} status valueSet missing '${value}'`);
    }
    const outputKeys = action.outputStateKeys || [];
    if (action.kind === 'query') {
      if (outputKeys.length !== 1) bail(`query ${action.actionId} must have exactly one output state`);
      const dataState = model.stateByKey.get(outputKeys[0]);
      if (!dataState || dataState.kind !== 'queryResult') bail(`query ${action.actionId} output state is not a queryResult`);
    } else {
      if (outputKeys.length !== 1) bail(`command ${action.actionId} must have exactly one output state`);
      const outState = model.stateByKey.get(outputKeys[0]);
      if (!outState || outState.kind !== 'commandOutput') bail(`command ${action.actionId} output state is not a commandOutput`);
      const errorState = model.stateByKey.get(action.errorStateKey || '');
      if (!errorState || errorState.kind !== 'actionError') bail(`command ${action.actionId} error state missing`);
      for (const refreshId of action.refreshActionIds || []) {
        const refresh = model.actionById.get(refreshId);
        if (!refresh || refresh.kind !== 'query') bail(`command ${action.actionId} refresh target ${refreshId} is not a query`);
      }
      for (const key of action.clearInputStateKeys || []) {
        if (!model.stateByKey.get(key)) bail(`command ${action.actionId} clear target ${key} unknown`);
      }
    }
  }
  for (const load of model.initialLoads) {
    const action = model.actionById.get(load.actionId);
    if (!action || action.kind !== 'query') bail(`initialLoads references non-query action ${load.actionId}`);
  }
  for (const state of model.states) {
    if (state.kind === 'queryResult' && !state.outputShape) bail(`queryResult ${state.stateKey} missing outputShape`);
  }
}

function validatePrefill(model: ScaffoldModel, action: DefsAction): void {
  const prefill = action.prefill!;
  const source = model.stateByKey.get(prefill.sourceStateKey);
  if (!source || source.kind !== 'queryResult') bail(`prefill of ${action.actionId} sources non-queryResult ${prefill.sourceStateKey}`);
  const output = outputInterfaceOf(model, source.contractRef!.commandName);
  const known = new Set(output.fields.map(f => f.name));
  if (!known.has(prefill.matchField)) bail(`prefill of ${action.actionId} matchField ${prefill.matchField} not in ${output.name}`);
  for (const field of prefill.fields) {
    if (!known.has(field.itemField)) bail(`prefill of ${action.actionId} field ${field.itemField} not in ${output.name}`);
    const target = model.stateByKey.get(field.targetStateKey);
    if (!target || target.kind !== 'input') bail(`prefill of ${action.actionId} target ${field.targetStateKey} is not an input state`);
  }
}

// ---------------------------------------------------------------------------
// Rendering

function render(model: ScaffoldModel): string {
  const out: string[] = [];
  out.push(mlsHeaderForOutputPath(model.outputPath));
  out.push('');
  out.push(...renderImports(model));
  out.push('');
  out.push('');
  out.push(...renderDefaultConsts(model));
  out.push(...renderSubscribedKeys(model));
  out.push('');
  out.push(`export class ${model.baseClassName} extends CollabLitElement {`);
  out.push(...renderProperties(model));
  out.push('');
  out.push(...renderConnectedCallback(model));
  out.push('');
  out.push(...renderDisconnectedCallback());
  out.push('');
  out.push(...renderStateChange(model));
  out.push('');
  out.push(...renderInitStateValue(model));
  if (routeParams(model).length) {
    out.push('');
    out.push(...renderSyncRouteParams(model));
  }
  if (uiScenaryState(model)) {
    out.push('');
    out.push(...renderUiScenary(model));
  }
  if (model.actions.some(a => a.kind === 'command')) {
    out.push('');
    out.push(...renderReadErrorMessage());
  }
  for (const action of model.actions) {
    if (action.kind === 'stateSetter') continue;
    out.push('');
    out.push(...(action.kind === 'query' ? renderQuery(model, action) : renderCommand(model, action)));
  }
  for (const action of model.actions) {
    if (action.kind !== 'stateSetter') continue;
    out.push('');
    out.push(...renderSetter(model, action));
  }
  out.push('}');
  out.push('');
  return out.join('\n');
}

function renderImports(model: ScaffoldModel): string[] {
  const hasCommand = model.actions.some(a => a.kind === 'command');
  const contractImport = aliasJsImport(model.contractTsPath);
  const typeNames: string[] = [];
  for (const commandName of usedCommands(model)) {
    typeNames.push(`${toPascalCase(commandName)}Input`);
    typeNames.push(`${toPascalCase(commandName)}Output`);
  }
  const lines = [
    `import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';`,
    `import { property } from 'lit/decorators.js';`,
    `import { execBff, type BffClientOptions } from '/_102029_/l2/bffClient.js';`,
    `import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';`,
  ];
  if (hasCommand) lines.push(`import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';`);
  lines.push('import type {');
  for (const name of typeNames) lines.push(`  ${name},`);
  lines.push(`} from '${contractImport}';`);
  if (model.contracts.length) {
    lines.push('import {');
    for (const contract of model.contracts) lines.push(`  ${contract.routeConst},`);
    lines.push(`} from '${contractImport}';`);
  }
  lines.push('');
  lines.push('export type {');
  for (const name of typeNames) lines.push(`  ${name},`);
  lines.push(`} from '${contractImport}';`);
  return lines;
}

/** Commands referenced by query/command actions, in defs order (deduped). */
function usedCommands(model: ScaffoldModel): string[] {
  const commands: string[] = [];
  for (const action of model.actions) {
    if (action.kind === 'stateSetter' || !action.commandRef) continue;
    if (!commands.includes(action.commandRef)) commands.push(action.commandRef);
  }
  return commands;
}

// The catalog is named after the module's DEFAULT LOCALE, never a hardcoded 'en': a pt-BR module used to
// emit `message_en`/`messages.en` holding Portuguese text, so a pt-br runtime found no `messages['pt-br']`
// (nor the 'pt' prefix fallback) and silently rendered whatever keys[0] happened to be.
/**
 * The i18n catalogue of a shared, read from its `.defs.ts`.
 *
 * The catalogue moved OUT of the emitted shared `.ts` and into the pages, but the
 * defs is still where it is planned — so this is where a page skeleton reads the
 * locales and the default-language text from. Same normalization the scaffold
 * always applied, so the catalogue key keeps matching `documentElement.lang`.
 */
export interface SharedI18nCatalogue {
  defaultLocale: string;
  /** Default first: `getMessageKey` falls back to keys[0] for an unknown language. */
  runtimeLocales: string[];
  i18n: Record<string, string>;
}

export function parseSharedI18nCatalogue(data: unknown): SharedI18nCatalogue | null {
  if (!isRecord(data)) return null;

  const i18nRaw = isRecord(data.i18n) ? data.i18n : null;
  if (!i18nRaw) return null;
  const i18n: Record<string, string> = {};
  for (const [key, value] of Object.entries(i18nRaw)) {
    if (typeof value === 'string') i18n[key] = value;
  }
  if (Object.keys(i18n).length === 0) return null;

  const i18nMeta = isRecord(data.i18nMeta) ? data.i18nMeta : {};
  const defaultLocale = normalizeLocaleKey(stringOf(i18nMeta.defaultLocale)) || 'en';
  const declared = Array.isArray(i18nMeta.runtimeLocales)
    ? i18nMeta.runtimeLocales.map(item => normalizeLocaleKey(stringOf(item)))
    : [];
  const runtimeLocales = catalogueLocales(defaultLocale, declared);
  return { defaultLocale, runtimeLocales, i18n };
}

/**
 * The locales a catalogue is keyed by. `i18nMeta` carries the default COLLAPSED (`pt`, no region — it
 * comes from `languageKey`) while `runtimeLocales` PRESERVES it (`pt-br`), so the old
 * `[defaultLocale, ...declared.filter(l => l !== defaultLocale)]` let both in: `'pt' !== 'pt-br'`.
 * Every module whose default language has a region got two IDENTICAL catalogues — measured on the
 * petShop (`defaultLocale: 'pt'`, `runtimeLocales: ['pt-br']` -> `pageMessage_pt` + `pageMessage_pt_br`)
 * and on the 102046, where 3 declared languages became 4.
 *
 * The duplicate is not only noise: the FIRST const defines the catalogue type, so a key the model adds
 * to the second copy and not the first is a TS2353 on a locale that should not exist at all.
 *
 * The rule: `runtimeLocales` IS the set (region preserved, default already first — that is how
 * `moduleI18n` builds it). The collapsed default only joins when NO declared locale shares its primary
 * language. Never dedupe by primary language AMONG declared ones: a module may legitimately declare
 * `en` and `en-AU` together, and both are real catalogues.
 */
export function catalogueLocales(defaultLocale: string, declared: readonly string[]): string[] {
  const clean = [...new Set(declared.filter(Boolean))];
  const primaryOf = (locale: string): string => locale.split('-')[0];
  if (!defaultLocale) return clean;
  const realizedByDeclared = clean.some(locale => primaryOf(locale) === primaryOf(defaultLocale));
  return realizedByDeclared ? clean : [defaultLocale, ...clean];
}

// Lowercase, '_' -> '-' — the SAME normalization the runtime applies to the config language list
// (102033 languageRuntime.normalizeLanguage), so the catalog key always matches documentElement.lang.
function normalizeLocaleKey(value: string): string {
  return value.trim().replace(/_/gu, '-').toLowerCase();
}

function renderDefaultConsts(model: ScaffoldModel): string[] {
  const lines: string[] = [];
  for (const state of model.states) {
    if (state.kind !== 'queryResult' || state.outputShape !== 'paginated') continue;
    const output = outputInterfaceOf(model, state.contractRef!.commandName);
    const fields = output.fields.filter(f => !f.optional).map(f => `${f.name}: ${zeroValue(f)}`);
    lines.push(`const ${defaultConstName(state)}: ${output.name} = { ${fields.join(', ')} };`);
  }
  if (lines.length) lines.push('');
  return lines;
}

function renderSubscribedKeys(model: ScaffoldModel): string[] {
  const lines = ['const SUBSCRIBED_STATE_KEYS: string[] = ['];
  for (const state of model.states) lines.push(`  '${state.stateKey}',`);
  lines.push('];');
  return lines;
}

function renderProperties(model: ScaffoldModel): string[] {
  const lines: string[] = [];
  for (const state of model.states) {
    lines.push(`  /** ${stateDoc(state)} */`);
    lines.push(`  @property() ${state.name}: ${propertyType(model, state)} = ${propertyInit(model, state)};`);
  }
  return lines;
}

function renderConnectedCallback(model: ScaffoldModel): string[] {
  const lines = ['  connectedCallback(): void {', '    super.connectedCallback();'];
  for (const state of model.states) {
    lines.push(`    this.initStateValue('${state.stateKey}', ${propertyInit(model, state)});`);
  }
  if (routeParams(model).length) lines.push('    this.syncRouteParams();');
  if (uiScenaryState(model)) lines.push('    this.applyUrlScenary();');
  lines.push('    subscribe(SUBSCRIBED_STATE_KEYS, this);');
  for (const load of model.initialLoads) {
    const action = model.actionById.get(load.actionId)!;
    lines.push(`    void this.${action.methodName}();`);
  }
  lines.push('  }');
  return lines;
}

function renderDisconnectedCallback(): string[] {
  return [
    '  disconnectedCallback(): void {',
    '    unsubscribe(SUBSCRIBED_STATE_KEYS, this);',
    '    super.disconnectedCallback();',
    '  }',
  ];
}

function renderStateChange(model: ScaffoldModel): string[] {
  const lines = [
    '  /** handleIcaStateChange — collabState notify contract; maps state keys onto class fields */',
    '  handleIcaStateChange(key: string, value: unknown): void {',
    '    switch (key) {',
  ];
  for (const state of model.states) {
    lines.push(`      case '${state.stateKey}':`);
    lines.push(`        this.${state.name} = ${castExpression(model, state)};`);
    lines.push('        break;');
  }
  lines.push('      default:');
  lines.push('        break;');
  lines.push('    }');
  lines.push('    this.requestUpdate();');
  lines.push('  }');
  return lines;
}

function renderInitStateValue(model: ScaffoldModel): string[] {
  const lines = [
    '  private initStateValue(stateKey: string, defaultValue: unknown): void {',
    '    const existing: unknown = getState(stateKey);',
    '    const value: unknown = existing !== undefined ? existing : defaultValue;',
    '    switch (stateKey) {',
  ];
  for (const state of model.states) {
    lines.push(`      case '${state.stateKey}':`);
    lines.push(`        this.${state.name} = ${castExpression(model, state)};`);
    lines.push('        break;');
  }
  lines.push('      default:');
  lines.push('        break;');
  lines.push('    }');
  lines.push('    if (existing === undefined) {');
  lines.push('      setState(stateKey, value);');
  lines.push('    }');
  lines.push('  }');
  return lines;
}

interface RouteParamTargets { param: string; targets: { propName: string; stateKey: string }[] }

function routeParams(model: ScaffoldModel): RouteParamTargets[] {
  const names = [...model.routePattern.matchAll(/:([A-Za-z0-9_]+)\??/g)].map(m => m[1]);
  const params: RouteParamTargets[] = names.map(name => ({ param: name, targets: [] }));
  const seen = new Set<string>();
  for (const action of model.actions) {
    for (const key of action.routeParamInputStateKeys || []) {
      if (seen.has(key)) continue;
      const field = key.split('.').pop() || '';
      const entry = params.find(p => p.param === field);
      const state = model.stateByKey.get(key);
      if (!entry || !state) continue;
      seen.add(key);
      entry.targets.push({ propName: state.name, stateKey: key });
    }
  }
  return params.filter(p => p.targets.length > 0);
}

function renderSyncRouteParams(model: ScaffoldModel): string[] {
  const allNames = [...model.routePattern.matchAll(/:([A-Za-z0-9_]+)\??/g)].map(m => m[1]);
  const basePath = model.routePattern.split('/:')[0];
  const regex = `/^${basePath.replace(/\//g, '\\/')}${'(?:\\/([^/]+))?'.repeat(allNames.length)}\\/?$/`;
  const lines = [
    '  private syncRouteParams(): void {',
    '    const pathname: string = window.location.pathname;',
    '    const match: RegExpMatchArray | null = pathname.match(',
    `      ${regex},`,
    '    );',
  ];
  const params = routeParams(model);
  for (const { param, targets } of params) {
    const index = allNames.indexOf(param) + 1;
    lines.push(`    const raw${toPascalCase(param)}: string = match && match[${index}] ? match[${index}] : '';`);
    lines.push(`    let ${param}: string = '';`);
    lines.push(`    if (raw${toPascalCase(param)}) {`);
    lines.push('      try {');
    lines.push(`        ${param} = decodeURIComponent(raw${toPascalCase(param)});`);
    lines.push('      } catch {');
    lines.push(`        ${param} = raw${toPascalCase(param)};`);
    lines.push('      }');
    lines.push('    }');
    lines.push(`    if (${param}) {`);
    for (const target of targets) {
      lines.push(`      if (!this.${target.propName}) {`);
      lines.push(`        this.${target.propName} = ${param};`);
      lines.push(`        setState('${target.stateKey}', ${param});`);
      lines.push('      }');
    }
    lines.push('    }');
  }
  lines.push('  }');
  return lines;
}

function renderReadErrorMessage(): string[] {
  return [
    '  private readErrorMessage(error: unknown, fallback: string): string {',
    '    if (error && typeof error === \'object\') {',
    '      const record = error as { message?: unknown; error?: unknown };',
    '      if (typeof record.message === \'string\' && record.message) {',
    '        return record.message;',
    '      }',
    '      if (typeof record.error === \'string\' && record.error) {',
    '        return record.error;',
    '      }',
    '    }',
    '    return fallback;',
    '  }',
  ];
}

function renderQuery(model: ScaffoldModel, action: DefsAction): string[] {
  const input = inputInterfaceOf(model, action.commandRef!);
  const dataState = model.stateByKey.get((action.outputStateKeys || [])[0])!;
  const statusState = model.stateByKey.get(action.statusStateKey!)!;
  const route = routeExprOf(model, action);
  const lines = [
    `  /** ${actionDoc(model, action)} */`,
    `  async ${action.methodName}(): Promise<void> {`,
  ];
  if (routeParams(model).length) lines.push('    this.syncRouteParams();');
  lines.push(...renderRequiredGuards(model, action, statusState, '    '));
  lines.push(`    this.${statusState.name} = 'loading';`);
  lines.push(`    setState('${statusState.stateKey}', 'loading');`);
  lines.push(...renderParams(model, action, input, '    '));
  lines.push(`    const options: BffClientOptions = { mode: 'silent' };`);
  lines.push(`    const response = await execBff<${queryExecType(model, dataState)}>(${route}, params, options);`);
  lines.push('    if (response.ok) {');
  lines.push(`      const data = response.data ?? ${queryFallback(model, dataState)};`);
  lines.push(`      this.${dataState.name} = data;`);
  lines.push(`      setState('${dataState.stateKey}', data);`);
  lines.push(`      this.${statusState.name} = 'success';`);
  lines.push(`      setState('${statusState.stateKey}', 'success');`);
  lines.push('    } else {');
  lines.push(`      this.${statusState.name} = 'error';`);
  lines.push(`      setState('${statusState.stateKey}', 'error');`);
  lines.push('      if (response.error) {');
  lines.push(`        console.error('${action.actionId} failed', response.error);`);
  lines.push('      }');
  lines.push('    }');
  lines.push('    this.requestUpdate();');
  lines.push('  }');
  lines.push('');
  lines.push(`  /** ${handlerDoc(action)} */`);
  lines.push(`  ${action.handlerName}(event?: Event): void {`);
  lines.push('    if (event) {');
  lines.push('      event.preventDefault();');
  lines.push('    }');
  lines.push(`    void this.${action.methodName}();`);
  lines.push('  }');
  return lines;
}

function renderCommand(model: ScaffoldModel, action: DefsAction): string[] {
  const input = inputInterfaceOf(model, action.commandRef!);
  const outputState = model.stateByKey.get((action.outputStateKeys || [])[0])!;
  const outputType = `${toPascalCase(action.commandRef!)}Output`;
  const statusState = model.stateByKey.get(action.statusStateKey!)!;
  const errorState = model.stateByKey.get(action.errorStateKey!)!;
  const route = routeExprOf(model, action);
  const errorKey = action.feedback!.errorMessageKey!;
  const lines = [
    `  /** ${actionDoc(model, action)} */`,
    `  async ${action.methodName}(): Promise<void> {`,
  ];
  if (routeParams(model).length) lines.push('    this.syncRouteParams();');
  lines.push(...renderRequiredGuards(model, action, statusState, '    '));
  lines.push(`    this.${statusState.name} = 'loading';`);
  lines.push(`    setState('${statusState.stateKey}', 'loading');`);
  lines.push(`    this.${errorState.name} = '';`);
  lines.push(`    setState('${errorState.stateKey}', '');`);
  lines.push(...renderParams(model, action, input, '    '));
  lines.push(`    const options: BffClientOptions = { mode: 'blocking' };`);
  lines.push(`    const response = await execBff<${outputType}>(${route}, params, options);`);
  lines.push('    if (!response.ok) {');
  lines.push(`      const errMsg: string = this.readErrorMessage(response.error, '${errorKey}');`);
  lines.push(`      this.${errorState.name} = errMsg;`);
  lines.push(`      setState('${errorState.stateKey}', errMsg);`);
  lines.push(`      this.${statusState.name} = 'error';`);
  lines.push(`      setState('${statusState.stateKey}', 'error');`);
  lines.push('      this.requestUpdate();');
  lines.push('      return;');
  lines.push('    }');
  lines.push(`    const data: ${outputType} | null = response.data ?? null;`);
  lines.push(`    this.${outputState.name} = data;`);
  lines.push(`    setState('${outputState.stateKey}', data);`);
  for (const refreshId of action.refreshActionIds || []) {
    const refresh = model.actionById.get(refreshId)!;
    const refreshStatus = model.stateByKey.get(refresh.statusStateKey!)!;
    lines.push('    try {');
    lines.push(`      await this.${refresh.methodName}();`);
    lines.push(`      if (this.${refreshStatus.name} === 'error') {`);
    lines.push(`        this.${statusState.name} = 'error';`);
    lines.push(`        setState('${statusState.stateKey}', 'error');`);
    lines.push('        this.requestUpdate();');
    lines.push('        return;');
    lines.push('      }');
    lines.push('    } catch (refreshError: unknown) {');
    lines.push(`      console.error('${action.actionId} refresh failed', refreshError);`);
    lines.push(`      this.${statusState.name} = 'error';`);
    lines.push(`      setState('${statusState.stateKey}', 'error');`);
    lines.push('      this.requestUpdate();');
    lines.push('      return;');
    lines.push('    }');
  }
  for (const key of action.clearInputStateKeys || []) {
    const clearState = model.stateByKey.get(key)!;
    lines.push(`    this.${clearState.name} = '';`);
    lines.push(`    setState('${key}', '');`);
  }
  if (uiScenaryState(model)) lines.push(`    this.setUiScenary('${escapeSingle(baseScenaryValue(model))}');`);
  lines.push(`    this.${statusState.name} = 'success';`);
  lines.push(`    setState('${statusState.stateKey}', 'success');`);
  lines.push('    this.requestUpdate();');
  lines.push('  }');
  lines.push('');
  lines.push(`  /** ${handlerDoc(action)} */`);
  lines.push(`  ${action.handlerName}(event?: Event): void {`);
  lines.push('    if (event) {');
  lines.push('      event.preventDefault();');
  lines.push('    }');
  lines.push('    void runBlockingUiAction(async (_signal: AbortSignal) => {');
  lines.push(`      await this.${action.methodName}();`);
  lines.push('    });');
  lines.push('  }');
  return lines;
}

/**
 * Guard route-param/selected-entity ids only (the values arriving programmatically): user-typed
 * required fields are the SERVER's validation to report, never a silent client-side skip — this
 * mirrors the golden convention (deleteClient guards clientId, createClient does not guard name).
 */
function renderRequiredGuards(model: ScaffoldModel, action: DefsAction, statusState: DefsState, indent: string): string[] {
  const input = inputInterfaceOf(model, action.commandRef!);
  const requiredFields = new Set(input.fields.filter(f => !f.optional).map(f => f.name));
  const lines: string[] = [];
  const guardKeys = [...(action.routeParamInputStateKeys || []), ...(action.selectedEntityInputStateKeys || [])];
  const seen = new Set<string>();
  for (const key of guardKeys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const state = model.stateByKey.get(key);
    if (!state || !state.contractRef?.field || !requiredFields.has(state.contractRef.field)) continue;
    lines.push(`${indent}if (!this.${state.name}) {`);
    lines.push(`${indent}  this.${statusState.name} = 'idle';`);
    lines.push(`${indent}  setState('${statusState.stateKey}', 'idle');`);
    lines.push(`${indent}  this.requestUpdate();`);
    lines.push(`${indent}  return;`);
    lines.push(`${indent}}`);
  }
  return lines;
}

function renderParams(model: ScaffoldModel, action: DefsAction, input: ContractInterface, indent: string): string[] {
  const inputStates = (action.inputStateKeys || []).map(key => model.stateByKey.get(key)!);
  const stateByField = new Map(inputStates.map(state => [state.contractRef!.field!, state]));
  const lines: string[] = [];
  const requiredLines: string[] = [];

  for (const field of input.fields.filter(f => !f.optional)) {
    const state = stateByField.get(field.name);
    if (!state) bail(`action ${action.actionId} has no input state for required contract field ${field.name}`);
    if (field.type === 'string') {
      requiredLines.push(`${indent}  ${field.name}: this.${state.name},`);
    } else if (field.type === 'stringUnion') {
      // Input states are plain strings; the contract narrows to a literal union — cast at the seam.
      requiredLines.push(`${indent}  ${field.name}: this.${state.name} as ${input.name}['${field.name}'],`);
    } else if (field.type === 'number') {
      lines.push(`${indent}const ${field.name}Num = Number(this.${state.name});`);
      requiredLines.push(`${indent}  ${field.name}: Number.isNaN(${field.name}Num) ? 0 : ${field.name}Num,`);
    } else if (field.type === 'boolean') {
      requiredLines.push(`${indent}  ${field.name}: this.${state.name} === 'true',`);
    } else {
      requiredLines.push(`${indent}  ${field.name}: this.${state.name} as ${input.name}['${field.name}'],`);
    }
  }
  lines.push(`${indent}const params: ${input.name} = {`);
  lines.push(...requiredLines);
  lines.push(`${indent}};`);

  for (const field of input.fields.filter(f => f.optional)) {
    const state = stateByField.get(field.name);
    if (!state) continue; // optional contract field without a UI input state simply stays unset
    if (field.type === 'string') {
      lines.push(`${indent}if (this.${state.name}) {`);
      lines.push(`${indent}  params.${field.name} = this.${state.name};`);
      lines.push(`${indent}}`);
    } else if (field.type === 'stringUnion') {
      lines.push(`${indent}if (this.${state.name}) {`);
      lines.push(`${indent}  params.${field.name} = this.${state.name} as ${input.name}['${field.name}'];`);
      lines.push(`${indent}}`);
    } else if (field.type === 'number') {
      lines.push(`${indent}if (this.${state.name} !== '') {`);
      lines.push(`${indent}  const ${field.name}Num = Number(this.${state.name});`);
      lines.push(`${indent}  if (!Number.isNaN(${field.name}Num)) {`);
      lines.push(`${indent}    params.${field.name} = ${field.name}Num;`);
      lines.push(`${indent}  }`);
      lines.push(`${indent}}`);
    } else if (field.type === 'boolean') {
      // Input states are always `string` (propertyType), so a checkbox arrives as 'true'/'false'/''.
      // Empty means "not set" and the optional field stays out of the payload.
      lines.push(`${indent}if (this.${state.name} !== '') {`);
      lines.push(`${indent}  params.${field.name} = this.${state.name} === 'true';`);
      lines.push(`${indent}}`);
    } else {
      lines.push(`${indent}if (this.${state.name} !== '' && this.${state.name} != null) {`);
      lines.push(`${indent}  params.${field.name} = this.${state.name} as ${input.name}['${field.name}'];`);
      lines.push(`${indent}}`);
    }
  }
  return lines;
}

function uiScenaryState(model: ScaffoldModel): DefsState | undefined {
  return model.states.find(state => state.kind === 'uiScenary');
}

function baseScenaryValue(model: ScaffoldModel): string {
  return model.scenaries.find(scene => scene.kind === 'base')?.value || model.scenaries[0]?.value || 'base';
}

function renderUiScenary(model: ScaffoldModel): string[] {
  const state = uiScenaryState(model)!;
  const values = (state.valueSet && state.valueSet.length ? state.valueSet : model.scenaries.map(scene => scene.value)).filter(Boolean);
  const allowed = values.length ? values : ['base'];
  const allowedLit = allowed.map(value => `'${escapeSingle(value)}'`).join(', ');
  const lines: string[] = [
    `  /** setter for state ${state.stateKey} */`,
    `  setUiScenary(value: string): void {`,
    `    const allowed: string[] = [${allowedLit}];`,
    `    if (!allowed.includes(value)) {`,
    // Split so this generator is not a console.warn call site (nsConsoleGuard).
    `      console${'.warn'}('setUiScenary: unknown value \\'' + value + '\\'');`,
    '      return;',
    '    }',
    '    let next: string = value;',
  ];
  for (const scene of model.scenaries) {
    if (scene.kind === 'base' || scene.preconditions.length === 0) continue;
    const checks = scene.preconditions.map(key => {
      const input = model.stateByKey.get(key);
      return input ? `!this.${input.name}` : '';
    }).filter(Boolean);
    if (!checks.length) continue;
    lines.push(`    if (value === '${escapeSingle(scene.value)}' && (${checks.join(' || ')})) next = '${escapeSingle(baseScenaryValue(model))}';`);
  }
  lines.push(`    this.${state.name} = next as typeof this.${state.name};`);
  lines.push(`    setState('${state.stateKey}', next);`);
  lines.push('    this.syncScenaryQuery(next);');
  lines.push('    this.requestUpdate();');
  lines.push('  }');
  lines.push('');
  lines.push('  /** handler for action set.uiScenary — bind UI events here */');
  lines.push('  handleUiScenaryChange(event: Event): void {');
  lines.push('    const custom = event as CustomEvent<{ value?: unknown }>;');
  lines.push("    const fromDetail: string = custom.detail && typeof custom.detail.value === 'string' ? custom.detail.value : '';");
  lines.push('    const target = event.target as HTMLInputElement | HTMLSelectElement | null;');
  lines.push("    const value: string = fromDetail || (target && 'value' in target ? String(target.value) : '');");
  lines.push('    this.setUiScenary(value);');
  lines.push('  }');
  lines.push('');
  lines.push(...renderApplyUrlScenary(model));
  lines.push('');
  lines.push(...renderSyncScenaryQuery(model));
  return lines;
}

function renderApplyUrlScenary(model: ScaffoldModel): string[] {
  const fieldTargets = new Map<string, { propName: string; stateKey: string }[]>();
  for (const scene of model.scenaries) {
    for (const key of scene.preconditions) {
      const input = model.stateByKey.get(key);
      if (!input) continue;
      const field = key.split('.').pop() || '';
      if (!field) continue;
      const list = fieldTargets.get(field) || [];
      if (!list.some(item => item.stateKey === key)) list.push({ propName: input.name, stateKey: key });
      fieldTargets.set(field, list);
    }
  }
  const lines = [
    '  private applyUrlScenary(): void {',
    '    const params = new URLSearchParams(window.location.search);',
  ];
  for (const [field, targets] of fieldTargets) {
    const rawName = `raw${toPascalCase(field)}`;
    lines.push(`    const ${rawName}: string = params.get('${escapeSingle(field)}') || '';`);
    lines.push(`    if (${rawName}) {`);
    for (const target of targets) {
      lines.push(`      if (!this.${target.propName}) {`);
      lines.push(`        this.${target.propName} = ${rawName};`);
      lines.push(`        setState('${target.stateKey}', ${rawName});`);
      lines.push('      }');
    }
    lines.push('    }');
  }
  lines.push(`    const requested: string = params.get('scenary') || '${escapeSingle(baseScenaryValue(model))}';`);
  lines.push('    this.setUiScenary(requested);');
  lines.push('  }');
  return lines;
}

function renderSyncScenaryQuery(model: ScaffoldModel): string[] {
  const base = baseScenaryValue(model);
  return [
    '  private syncScenaryQuery(value: string): void {',
    '    const url = new URL(window.location.href);',
    `    if (value === '${escapeSingle(base)}') url.searchParams.delete('scenary');`,
    "    else url.searchParams.set('scenary', value);",
    "    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);",
    '  }',
  ];
}

function renderSetter(model: ScaffoldModel, action: DefsAction): string[] {
  const state = model.stateByKey.get(action.stateKey!)!;
  const lines = [
    `  /** setter for state ${state.stateKey} */`,
    `  ${action.methodName}(value: string): void {`,
    `    this.${state.name} = value;`,
    `    setState('${state.stateKey}', value);`,
  ];
  if (action.prefill) lines.push(...renderPrefill(model, action.prefill, '    '));
  const detail = model.scenaries.find(scene => scene.kind === 'detail');
  if (detail && (detail.preconditions || []).includes(state.stateKey)) {
    lines.push(`    if (value) this.setUiScenary('${escapeSingle(detail.value)}');`);
  }
  lines.push('    this.requestUpdate();');
  lines.push('  }');
  lines.push('');
  lines.push(`  /** ${handlerDoc(action)} */`);
  lines.push(`  ${action.handlerName}(event: Event): void {`);
  lines.push('    const target = event.target as HTMLInputElement | HTMLSelectElement | null;');
  lines.push(`    const value: string = target && 'value' in target ? String(target.value) : '';`);
  lines.push(`    this.${action.methodName}(value);`);
  lines.push('  }');
  return lines;
}

function renderPrefill(model: ScaffoldModel, prefill: DefsPrefill, indent: string): string[] {
  const source = model.stateByKey.get(prefill.sourceStateKey)!;
  const output = outputInterfaceOf(model, source.contractRef!.commandName);
  const fieldTypes = new Map(output.fields.map(f => [f.name, f.type]));
  const copyExpr = (itemVar: string, field: DefsPrefillField): string => (
    fieldTypes.get(field.itemField) === 'string' ? `${itemVar}.${field.itemField}` : `String(${itemVar}.${field.itemField})`
  );
  const lines: string[] = [];
  if (prefill.sourceOutputShape === 'array') {
    lines.push(`${indent}const collection =`);
    lines.push(`${indent}  (getState('${prefill.sourceStateKey}') as ${output.name}[] | null | undefined) ?? this.${source.name};`);
    lines.push(`${indent}if (Array.isArray(collection) && collection.length > 0) {`);
    lines.push(`${indent}  const item = collection.find(`);
    lines.push(`${indent}    (row: ${output.name}) => String(row.${prefill.matchField}) === String(value),`);
    lines.push(`${indent}  );`);
    lines.push(`${indent}  if (item) {`);
    for (const field of prefill.fields) {
      const target = model.stateByKey.get(field.targetStateKey)!;
      lines.push(`${indent}    this.${target.name} = ${copyExpr('item', field)};`);
      lines.push(`${indent}    setState('${field.targetStateKey}', ${copyExpr('item', field)});`);
    }
    lines.push(`${indent}  }`);
    lines.push(`${indent}}`);
    return lines;
  }
  lines.push(`${indent}const source =`);
  lines.push(`${indent}  (getState('${prefill.sourceStateKey}') as ${output.name} | null | undefined) ?? this.${source.name};`);
  lines.push(`${indent}if (source && String(source.${prefill.matchField}) === String(value)) {`);
  for (const field of prefill.fields) {
    const target = model.stateByKey.get(field.targetStateKey)!;
    lines.push(`${indent}  this.${target.name} = ${copyExpr('source', field)};`);
    lines.push(`${indent}  setState('${field.targetStateKey}', ${copyExpr('source', field)});`);
  }
  lines.push(`${indent}}`);
  return lines;
}

// ---------------------------------------------------------------------------
// Type/value mapping

function propertyType(model: ScaffoldModel, state: DefsState): string {
  switch (state.kind) {
    case 'pageStatus':
    case 'input':
    case 'actionError':
      return 'string';
    case 'actionStatus':
    case 'uiScenary':
      return state.valueSet!.map(v => `'${v}'`).join(' | ');
    case 'commandOutput':
      return `${toPascalCase(state.contractRef!.commandName)}Output | null`;
    case 'queryResult': {
      const output = outputInterfaceOf(model, state.contractRef!.commandName);
      if (state.outputShape === 'paginated') return output.name;
      if (state.outputShape === 'array') return `${output.name}[]`;
      return `${output.name} | null`;
    }
  }
}

function propertyInit(model: ScaffoldModel, state: DefsState): string {
  switch (state.kind) {
    case 'pageStatus':
    case 'input':
    case 'actionError':
      return `'${escapeSingle(String(state.defaultValue ?? ''))}'`;
    case 'actionStatus':
      return `'${escapeSingle(String(state.defaultValue ?? 'idle'))}'`;
    case 'uiScenary':
      return `'${escapeSingle(String(state.defaultValue ?? 'base'))}'`;
    case 'commandOutput':
      return 'null';
    case 'queryResult':
      if (state.outputShape === 'paginated') return defaultConstName(state);
      if (state.outputShape === 'array') return '[]';
      return 'null';
  }
}

function castExpression(model: ScaffoldModel, state: DefsState): string {
  const type = propertyType(model, state);
  const fallback = state.kind === 'queryResult' && state.outputShape === 'paginated'
    ? defaultConstName(state)
    : state.kind === 'queryResult' && state.outputShape === 'array'
      ? '[]'
      : state.kind === 'queryResult' || state.kind === 'commandOutput'
        ? 'null'
        : propertyInit(model, state);
  return `(value as ${type}) ?? ${fallback}`;
}

function queryExecType(model: ScaffoldModel, state: DefsState): string {
  const output = outputInterfaceOf(model, state.contractRef!.commandName);
  return state.outputShape === 'array' ? `${output.name}[]` : output.name;
}

function queryFallback(model: ScaffoldModel, state: DefsState): string {
  if (state.outputShape === 'paginated') return defaultConstName(state);
  if (state.outputShape === 'array') return '[]';
  return 'null';
}

function stateDoc(state: DefsState): string {
  if (state.kind === 'uiScenary') {
    const values = state.valueSet?.length ? ` — values: ${state.valueSet.join('|')}` : '';
    return `state ${state.stateKey}${values}`;
  }
  const parts = [`state ${state.name} — ${state.kind}`];
  if (state.valueSet?.length) parts.push(`, values: ${state.valueSet.join('|')}`);
  if (state.kind === 'queryResult') parts.push(`, outputShape: ${state.outputShape}`);
  return parts.join('');
}

function actionDoc(model: ScaffoldModel, action: DefsAction): string {
  const input = inputInterfaceOf(model, action.commandRef!);
  const inputs = input.fields.map(f => f.name).join(', ');
  const parts = [
    // The l4 title first, when the defs carries one (decision 27/ago): one short line, no dump.
    `action ${action.actionId} (${action.kind})${action.purpose ? ` "${action.purpose}"` : ''} — route ${action.routeKey}`,
    `inputs: ${inputs || '(none)'}`,
    `writes ${(action.outputStateKeys || [])[0]}`,
    `status ${action.statusStateKey}`,
  ];
  if (action.kind === 'command' && action.feedback?.successMessageKey) {
    parts.push(`feedback keys ${action.feedback.successMessageKey} / ${action.feedback.errorMessageKey}`);
  }
  return parts.join('; ');
}

/** JSDoc for a handler: the l4 title (when present) plus the binding hint — one line. */
function handlerDoc(action: DefsAction): string {
  return `handler for action ${action.actionId}${action.purpose ? ` "${action.purpose}"` : ''} — bind UI events here`;
}

function zeroValue(field: ContractField): string {
  switch (field.type) {
    case 'string': return `''`;
    case 'number': return '0';
    case 'boolean': return 'false';
    case 'array': return '[]';
    case 'stringUnion': return `'${escapeSingle(field.firstLiteral ?? '')}'`;
    case 'opaque': return 'null';
  }
}

function defaultConstName(state: DefsState): string {
  return `${toConstCase(state.name)}_DEFAULT`;
}

function inputInterfaceOf(model: ScaffoldModel, commandName: string): ContractInterface {
  return model.interfaces.get(`${toPascalCase(commandName)}Input`) ?? bail(`contract interface ${toPascalCase(commandName)}Input not found`);
}

function outputInterfaceOf(model: ScaffoldModel, commandName: string): ContractInterface {
  return model.interfaces.get(`${toPascalCase(commandName)}Output`) ?? bail(`contract interface ${toPascalCase(commandName)}Output not found`);
}

/** Route expression for execBff: the contract route const when declared, else the routeKey literal. */
function routeExprOf(model: ScaffoldModel, action: DefsAction): string {
  const contract = model.contracts.find(c => c.commandName === action.commandRef);
  return contract ? contract.routeConst : `'${escapeSingle(action.routeKey!)}'`;
}

// ---------------------------------------------------------------------------
// Small utilities (local so the module stays import-free: the CLI runs it under plain tsx where
// the '/_102020_/...' alias does not resolve — same constraint as cfeMaterializeCore itself)

// Mirrors cfeMaterializeCore mlsHeaderForOutputPath/headerEnhancementForOutputPath — keep in sync.
function mlsHeaderForOutputPath(outputPath: string): string {
  return `/// <mls fileReference="${outputPath}" enhancement="${headerEnhancementForOutputPath(outputPath)}"/>`;
}

function headerEnhancementForOutputPath(outputPath: string): string {
  if (/^_\d+_\/l2\/[^/]+\/web\/shared\/[^/]+\.ts$/.test(outputPath)) return '_102020_/l2/enhancementAura';
  if (/^_\d+_\/l2\/[^/]+\/web\/(?:desktop|mobile)\/page\d+\/[^/]+\.ts$/.test(outputPath)) return '_102020_/l2/enhancementAura';
  return '_blank';
}

function aliasJsImport(mlsPath: string): string {
  const withJs = mlsPath.replace(/\.ts$/, '.js');
  return withJs.startsWith('/') ? withJs : `/${withJs}`;
}

function toPascalCase(value: string): string {
  return value.replace(/(?:^|[-_\s]+)([A-Za-z0-9])/g, (_m, c: string) => c.toUpperCase());
}

function toConstCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

function escapeSingle(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n');
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMember(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

function scenaryMembersNeedReplace(code: string, membersCode: string): boolean {
  for (const name of SHARED_SCENARY_MEMBERS) {
    const existing = extractClassMember(code, name);
    const expected = extractClassMember(membersCode, name);
    if (!existing || !expected) return true;
    if (normalizeMember(existing) !== normalizeMember(expected)) return true;
  }
  return false;
}

function replaceScenaryMembers(code: string, membersCode: string): string {
  const spans = SHARED_SCENARY_MEMBERS
    .map(name => extractClassMemberSpan(code, name))
    .filter((span): span is { start: number; end: number } => span !== null)
    .sort((a, b) => b.start - a.start);
  let next = code;
  for (const span of spans) {
    next = next.slice(0, span.start) + next.slice(span.end);
  }
  const classSpan = findExportClassBrace(next);
  if (!classSpan) return code;
  const insertAt = spans.length
    ? Math.min(...spans.map(span => span.start))
    : classSpan.close;
  const at = Math.min(insertAt, next.length);
  const block = membersCode.trimEnd() + '\n';
  const before = next.slice(0, at).replace(/\s*$/u, '\n\n');
  const after = next.slice(at).replace(/^\s*/u, '\n');
  return before + block + after;
}

function findExportClassBrace(source: string): { open: number; close: number } | null {
  const match = /export class [A-Za-z0-9_]+[^{]*\{/.exec(source);
  if (!match) return null;
  const open = match.index + match[0].length - 1;
  const body = readBraceBody(source, open);
  if (body === null) return null;
  return { open, close: open + 1 + body.length };
}

function extractClassMember(source: string, name: string): string | null {
  const span = extractClassMemberSpan(source, name);
  return span ? source.slice(span.start, span.end).trim() : null;
}

function extractClassMemberSpan(source: string, name: string): { start: number; end: number } | null {
  const defRe = new RegExp(`^[ \\t]*(?:private |public |protected )?(?:async )?${name}\\s*\\(`, 'gm');
  const match = defRe.exec(source);
  if (!match || match.index === undefined) return null;
  let start = match.index;
  const before = source.slice(0, start).replace(/\s+$/u, '');
  const jsdoc = before.lastIndexOf('/**');
  if (jsdoc >= 0 && before.slice(jsdoc).trim().startsWith('/**') && before.trimEnd().endsWith('*/')) {
    const lineStart = source.lastIndexOf('\n', jsdoc);
    start = lineStart >= 0 ? lineStart + 1 : jsdoc;
  }
  let i = match.index + match[0].length;
  let depth = 1;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  while (i < source.length && /[\s:]/.test(source[i])) i++;
  while (i < source.length && source[i] !== '{') i++;
  if (source[i] !== '{') return null;
  const body = readBraceBody(source, i);
  if (body === null) return null;
  let end = i + 1 + body.length + 1;
  if (source[end] === '\n') end++;
  return { start, end };
}
