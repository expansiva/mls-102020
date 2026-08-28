/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.ts" enhancement="_blank"/>

// Pure materialization core for agentChangeFrontend (.defs.ts -> .ts). It has no fs, no mls.* and
// no DOM dependency so the Node runner and the Studio agent can reuse parser, ordering, staleness
// and prompt assembly rules.

export interface PipelineItem {
  id: string;
  type: string;                 // l2_contract | l2_shared | l2_page
  outputPath: string;           // _NNNNN_/l2/.../x.ts
  defPath?: string;             // _NNNNN_/l2/.../x.defs.ts
  dependsFiles?: string[];
  dependsOn?: string[];
  /** Split pages only: the organism this item renders, and the bindings it owns (paginaDividida.md §5). */
  organism?: string;
  bindings?: string[];
  skills?: string[];
  rulesApplied?: string[];
  visualStyle?: unknown;
  agent?: string;
}

export interface ParsedDefs {
  dataExportName: string | null;
  artifact: Record<string, unknown> | unknown[] | string | null;
  data: unknown;
  /**
   * Sibling `export const bindings` on a page11 defs (prose `definition`). Never dumped into the
   * materialize prompt — gates and the split plan read it. Null when the file has no such export
   * (page21/31 keep `dataBindings` inside the definition object).
   */
  bindings: unknown[] | null;
  /** First pipeline item — what a defs with a single artifact always meant. */
  item: PipelineItem | null;
  /** EVERY pipeline item. A split page has N organisms plus the page in one defs. */
  items: PipelineItem[];
}

export interface PlannedItem {
  item: PipelineItem;
  rank: number;
  stale: boolean;
  reason: string;
}

export interface MaterializeEnv {
  readRef(ref: string): Promise<string | null>;
  modifiedMs(ref: string): Promise<number | null>;
}

export interface GenResult { code: string; }

/** Minimum page11 items before an all-broken first compile counts as systemic (a 1-2 page module never trips). */
export const SYSTEMIC_FAILURE_MIN_PAGES = 3;

/**
 * True when the FIRST compile found EVERY page11 item broken WITH THE SAME first-error signature.
 * With 3+ primary pages that is not N independent code bugs — it is an environment/configuration
 * fault (a package or path the compiler cannot resolve), and no amount of code repair can fix it.
 *
 * Why this must STOP the phase instead of repairing (102051 run01): an unresolved `lit` import failed
 * every file, so no item ever left the broken list (12 -> 12 -> 12 -> 11) and the whole repair budget
 * was spent regenerating files that were ALREADY CORRECT. The rounds then regressed them — page21
 * kitchenWorkspace/dashboardWorkspace had ZERO real errors on attempt 1 and finished with 6 and 1
 * (invented `updatedAt`, wrong `alert` shape), and two files had their `lit` import rewritten to a
 * Studio-only path that breaks the real tsc. Failing loudly is strictly safer than repairing.
 */
export function isSystemicPageFailure(attempt: number, items: { outputPath: string | null; errors: string[] }[]): boolean {
  if (attempt !== 1) return false;
  const page11 = items.filter(item => /\/page11\/[^/]+\.ts$/.test(item.outputPath || ''));
  return page11.length >= SYSTEMIC_FAILURE_MIN_PAGES
    && page11.every(item => item.errors.length > 0)
    && itemsShareErrorSignature(page11);
}

/** The page11 items considered by isSystemicPageFailure — used to report how many failed. */
export function countPage11Items(items: { outputPath: string | null }[]): number {
  return items.filter(item => /\/page11\/[^/]+\.ts$/.test(item.outputPath || '')).length;
}

/**
 * The contract .ts a shared/page defs declares, or '' when it names none. The contract model is
 * disposed as soon as the contract phase compiled it, so whoever compiles a file that imports it has
 * to load it back first — otherwise the import resolves to nothing and yields a false TS2792.
 */
export function contractTsPathOf(defsContent: string | null): string {
  if (!defsContent) return '';
  try {
    const data = parseDefs(defsContent).data as Record<string, unknown>;
    const ref = data && typeof data.contractRef === 'object' && data.contractRef ? data.contractRef as Record<string, unknown> : null;
    return ref && typeof ref.tsPath === 'string' ? ref.tsPath : '';
  } catch {
    return '';   // malformed defs: no contract dep to preload
  }
}

const SHARED_OUTPUT = /\/web\/shared\/[^/]+\.ts$/;

/**
 * The same guard for the SHARED phase, which has its own way of failing wholesale: in run cf2 all 34
 * shared files broke on the first compile with the SAME first error (a false TS2792 — the contract
 * model had been disposed), and the repair fan-out started anyway. One environment fault is not 34
 * code bugs, and rewriting 34 correct files is how the previous run regressed them.
 *
 * Kept independent from the page guard: the two phases fail for different reasons and one must never
 * mask the other. A `.defs.ts` is never an output of this phase, so it is excluded.
 */
export function isSystemicSharedFailure(attempt: number, items: { outputPath: string | null; errors: string[] }[]): boolean {
  if (attempt !== 1) return false;
  const shared = items.filter(item => isSharedOutput(item.outputPath));
  return shared.length >= SYSTEMIC_FAILURE_MIN_PAGES
    && shared.every(item => item.errors.length > 0)
    && itemsShareErrorSignature(shared);
}

/**
 * Compact identity of an item's first finding. Same TS code + same message (mls refs stripped) is
 * the environment-fault signature the systemic guards always meant: run cf2 was 34/34 with the same
 * first error, not N independent bugs. Distinct first messages — even the same TSnnnn — are not
 * systemic, so the phase goes to the normal repair instead of MATERIALIZE-SYSTEMIC-FAILURE.
 */
export function firstErrorSignature(errors: string[]): string {
  const first = (errors[0] ?? '').trim();
  if (!first) return '';
  return first
    .replace(/\/?_\d+_\/[^\s:'"]+/g, '<ref>')
    .replace(/(?:[A-Za-z0-9_./-]+)\.ts\(\d+,\d+\):\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function itemsShareErrorSignature(items: { errors: string[] }[]): boolean {
  if (items.length === 0) return false;
  const signatures = items.map(item => firstErrorSignature(item.errors));
  const first = signatures[0];
  return first !== '' && signatures.every(signature => signature === first);
}

/** Plan id the materialize fan-out uses for a pipeline item id (`taskHub__l2_shared` → `materialize-taskhub-l2-shared`). */
export function materializePlanIdFromPipelineId(id: string): string {
  return `materialize-${id.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()}`;
}

export function describeVerifyBuckets(counts: { blocked: number; repaired: number; declared: number }): string {
  return `blocked=${counts.blocked} repaired=${counts.repaired} declared=${counts.declared}`;
}

/** The shared items considered by isSystemicSharedFailure — used to report how many failed. */
export function countSharedItems(items: { outputPath: string | null }[]): number {
  return items.filter(item => isSharedOutput(item.outputPath)).length;
}

function isSharedOutput(outputPath: string | null): boolean {
  const path = outputPath || '';
  return SHARED_OUTPUT.test(path) && !path.endsWith('.defs.ts');
}

/**
 * B1 — internal vocabulary must never reach the screen.
 *
 * `displayHint` "summary-first" became a tile literally titled "Summary first" in the 31/jul test. The
 * same applies to bffCall ids, intent ids and state keys: they are wiring, not copy. Detects the
 * humanized form of a technical token used as visible text between tags or in a title/aria attribute.
 */
const TECHNICAL_TOKEN_HINTS = [
  'summary-first', 'master-detail', 'card-board', 'inline-row-command', 'contextual-transition-actions',
  'primary-surface', 'primarysurface', 'filter-control', 'filtercontrol', 'detail-panel', 'detailpanel',
  'contextual-action', 'batch-action', 'query-list', 'querylist', 'command-form', 'commandform',
];

export function collectTechnicalVocabularyIssues(pageDefinition: unknown, pageCode: string): string[] {
  if (!pageCode) return [];
  const issues = new Set<string>();
  const candidates = new Set<string>(TECHNICAL_TOKEN_HINTS);
  // Anything the defs itself names as wiring: the bffCall ids of the bindings.
  for (const binding of readPageBindings(pageDefinition)) candidates.add(binding.command);

  // Visible text = between tags, or a title/aria-label/placeholder literal.
  const visible = [
    ...pageCode.matchAll(/>([^<>{}]{2,80})</gu),
    ...pageCode.matchAll(/(?:title|aria-label|placeholder)="([^"]{2,80})"/gu),
  ].map(match => match[1].trim()).filter(Boolean);

  for (const text of visible) {
    const normalized = text.toLowerCase().replace(/[^a-z0-9]+/gu, '');
    if (normalized.length < 4) continue;
    for (const token of candidates) {
      if (!token) continue;
      const normalizedToken = token.toLowerCase().replace(/[^a-z0-9]+/gu, '');
      if (normalizedToken.length < 4) continue;
      if (normalized === normalizedToken) {
        issues.add(`technical vocabulary rendered as screen text: "${text}" is the internal token '${token}' — write copy for the user, never a displayHint/intent/bffCall id`);
      }
    }
  }
  return [...issues];
}

/**
 * B4 — a heading that merely repeats the label of the button/link next to it is noise. Compares each
 * heading's text with the visible text of the next control in source order.
 */
export function collectHeadingDisciplineIssues(pageCode: string): string[] {
  if (!pageCode) return [];
  const issues = new Set<string>();
  const headings = [...pageCode.matchAll(/<(h[1-6])\b[^>]*>([^<>{}]{2,80})</gu)];
  for (const heading of headings) {
    const text = heading[2].trim();
    if (!text) continue;
    const after = pageCode.slice((heading.index ?? 0) + heading[0].length, (heading.index ?? 0) + heading[0].length + 400);
    const control = /<(?:button|a)\b[^>]*>\s*([^<>{}]{2,80})</u.exec(after);
    const label = control?.[1]?.trim();
    if (label && label.toLowerCase() === text.toLowerCase()) {
      issues.add(`heading "${text}" repeats the label of the adjacent control: drop the heading or say something the label does not`);
    }
  }
  return [...issues];
}

/** Mirrors agentNewSolution's isNsIdInputName (e6-journey-map/gate.ts) — the two definitions of "an id
 *  input" must not diverge, or the NS lint and this gate disagree about the same field. */
function isIdInputName(name: string): boolean {
  return /^id$/i.test(name) || /Id$/.test(name);
}

/** Pagination/sorting wiring: surface controls, never something a user types into a form. */
const COLLECTION_WIRING_INPUTS = new Set(['page', 'pagesize', 'sortby', 'sortorder', 'sortdirection', 'offset', 'limit', 'cursor']);

/**
 * An l4 input source the USER decides by typing into a form. Everything else has an origin the contract
 * names, and must be rendered from it.
 *
 * TWO VOCABULARIES are in play and both are honoured here: e5/older (`userInput`, `selectedEntity`,
 * `routeParam`, …) and e6/current (`userDecision`, `selection`, `pageInput`, `derived`, `actorSession`,
 * `actorDirectory`). 102045 was generated with the first, 102046 emits the second.
 */
const USER_DECIDED_SOURCES = new Set(['userinput', 'userdecision']);

/**
 * Sources that mean "pick an existing thing", so the control is a PICKER, never a text field:
 * `selection`/`selectedEntity` pick from the query named in sourceRef, `actorDirectory` picks a person
 * holding the role named in sourceRef.
 */
const PICKER_SOURCES = new Set(['selection', 'selectedentity', 'actordirectory']);

interface PageBinding {
  command: string;
  kind: string;
  stateKey: string;
  selection: string;
  inputs: { name: string; stateKey: string; source: string; sourceRef: string; required: boolean; presentation: string }[];
}

/** The command bindings of the reduced page defs — the deterministic anchor every check below uses. */
function readPageBindings(pageDefinition: unknown): PageBinding[] {
  if (!isRecord(pageDefinition) || !Array.isArray(pageDefinition.dataBindings)) return [];
  return pageDefinition.dataBindings.filter(isRecord).map(binding => ({
    command: stringValue(binding.command),
    kind: stringValue(binding.kind),
    stateKey: stringValue(binding.stateKey),
    selection: stringValue(binding.selection).toLowerCase(),
    inputs: (Array.isArray(binding.inputs) ? binding.inputs.filter(isRecord) : []).map(input => ({
      name: stringValue(input.name),
      stateKey: stringValue(input.stateKey),
      source: stringValue(input.source).toLowerCase(),
      // Kept in original case: it names a bffCall, a field path or an actorId, all case-sensitive.
      sourceRef: stringValue(input.sourceRef),
      required: input.required === true,
      presentation: stringValue(input.presentation).toLowerCase(),
    })),
  })).filter(binding => binding.command);
}

/** The shared property a state key maps to, so a check can look for it in the generated code. */
function propertyForStateKey(sharedDefinition: unknown, stateKey: string): string {
  if (!isRecord(sharedDefinition) || !Array.isArray(sharedDefinition.states)) return '';
  const state = sharedDefinition.states.filter(isRecord).find(item => stringValue(item.stateKey) === stateKey);
  return state ? stringValue(state.name) : '';
}

/** True when `property` is bound to an editable control (`.value=${this.x}` on input/select/textarea). */
function isBoundToEditableControl(pageCode: string, property: string): boolean {
  if (!property) return false;
  // Tag ... .value=${this.<prop>} / ?checked=${this.<prop>} within the same element.
  const control = new RegExp(`<(?:input|select|textarea)\\b[^>]*\\b(?:\\.value|\\.checked|value|checked)=\\$\\{[^}]*\\bthis\\.${property}\\b`, 'u');
  return control.test(pageCode);
}

/**
 * UX hygiene over the GENERATED PAGE CODE, anchored on the reduced defs' dataBindings.
 *
 * These moved from "read layout.sections" to "read the .ts" when the page defs lost its layout (31/jul
 * slot study): with a reduced defs the truth lives in the OUTPUT — validation judges what was generated,
 * not what was asked (the same move the 102040 harness made with checks.mjs over page.ts).
 */
/**
 * Marks an issue no page rewrite can fix: the l4 workspace does not offer the lookup query the
 * picker would consume. The materialization phase reports these as warnings so the run finishes and
 * the gap is fixed where it lives (agentNewSolution E8 —.
 */
export const L4_LOOKUP_GAP = 'L4-LOOKUP-GAP' as const;

/** True for an issue that belongs to the l4 contract, not to the generated .ts. */
export function isL4LookupGap(issue: string): boolean {
  return issue.includes(L4_LOOKUP_GAP);
}

export function collectPageExperienceIssues(pageDefinition: unknown, sharedDefinition: unknown, pageCode: string): string[] {
  if (!pageCode) return [];
  const issues: string[] = [];
  const bindings = readPageBindings(pageDefinition);

  for (const binding of bindings) {
    for (const input of binding.inputs) {
      const property = propertyForStateKey(sharedDefinition, input.stateKey);
      const editable = isBoundToEditableControl(pageCode, property);

      // B2: pagination/sorting is surface wiring — nobody types a page size into a form.
      if (COLLECTION_WIRING_INPUTS.has(input.name.toLowerCase()) && editable) {
        issues.push(`${binding.command}.${input.name} is collection wiring (pagination/sorting) but is bound to a form control: drive it from the surface's own pager/sorter, never an input`);
        continue;
      }

      // B3 + supervisor refinement 1: an id the user does not DECIDE must never be editable. Its l4
      // source says where it comes from: selection -> a picker fed by a query; pageInput/actorSession/
      // derived -> context, not a field. The old check guessed from the name only; this one has the
      // contract behind it.
      if (isIdInputName(input.name) && !USER_DECIDED_SOURCES.has(input.source) && editable) {
        // The remedy names the CONTRACT's own origin, so the message tells the model what to render
        // instead of only what to stop doing.
        if (PICKER_SOURCES.has(input.source) && !input.sourceRef) {
          // The contract says "the user picks an existing record" but the page has no query to pick
          // FROM: an organism only ever consumes a call of its OWN workspace, so no rewrite of this
          // .ts can produce the picker. Reporting it as an error made the repair rounds rewrite a
          // correct page three times and fail anyway. It stays detected and traced — as a gap of the
          // L4 workspace, which is where the lookup query has to be added.
          issues.push(`${binding.command}.${input.name} is a technical id with source '${input.source}' and this page has NO query that could populate a picker for it (${L4_LOOKUP_GAP}): the l4 workspace must expose a lookup query for the referenced entity — rewriting this page cannot fix it`);
          continue;
        }
        const remedy = PICKER_SOURCES.has(input.source)
          ? (input.source === 'actordirectory'
            ? `render a person picker over the '${input.sourceRef}' role directory`
            : `render a picker over the '${input.sourceRef}' query already on this page`)
          : `take it from context (${input.sourceRef || input.source})`;
        issues.push(`${binding.command}.${input.name} is a technical id with source '${input.source}' but is bound to an editable control: ${remedy} instead of rendering a field`);
      }
    }
  }
  return issues;
}

const ROUTE_SOURCES = new Set(['routeparam', 'pageinput']);
const CONTEXTUAL_ID_SOURCES = new Set(['selection', 'selectedentity', 'routeparam', 'pageinput']);

function isListQueryState(sharedDefinition: unknown, stateKey: string): boolean {
  if (!stateKey || !isRecord(sharedDefinition) || !Array.isArray(sharedDefinition.states)) return false;
  const state = sharedDefinition.states.filter(isRecord).find(item => stringValue(item.stateKey) === stateKey);
  if (!state) return false;
  if (state.collection === true) return true;
  const shape = stringValue(state.outputShape).toLowerCase();
  return shape === 'array' || shape === 'paginated';
}

function pascalIdent(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
}

function hasSelectionWriter(pageCode: string, property: string, setter: string): boolean {
  if (!property) return false;
  const prop = escapeForRegExp(property);
  const set = escapeForRegExp(setter);
  if (new RegExp(`<(?:select|input)\\b[^>]*\\b(?:\\.value|\\.checked|value|checked)=\\$\\{[^}]*\\b(?:this|host)\\.${prop}\\b`, 'u').test(pageCode)) return true;
  if (new RegExp(`@(?:click|change)=\\$\\{[^}]*\\b(?:this|host)\\.${set}\\b`, 'u').test(pageCode)) return true;
  if (new RegExp(`@(?:click|change)=\\$\\{[^}]*\\b(?:this|host)\\.${prop}\\s*=`, 'u').test(pageCode)) return true;
  return false;
}

/**
 * `selection: single` (or a selection/route id next to a list) must write the id — row click with a
 * visible selected state, or a <select>. A table with no @click is the changeTaskStatus defect.
 */
export function collectSelectionControlIssues(pageDefinition: unknown, sharedDefinition: unknown, pageCode: string): string[] {
  if (!pageCode) return [];
  const bindings = readPageBindings(pageDefinition);
  const hasList = bindings.some(binding =>
    binding.kind === 'query' && (binding.selection === 'single' || binding.selection === 'multiple' || isListQueryState(sharedDefinition, binding.stateKey)));
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const binding of bindings) {
    for (const input of binding.inputs) {
      if (input.source === 'actordirectory') continue;
      const property = propertyForStateKey(sharedDefinition, input.stateKey);
      if (!property || seen.has(input.stateKey)) continue;
      const pickerSource = PICKER_SOURCES.has(input.source);
      const contextualRequired = input.required && CONTEXTUAL_ID_SOURCES.has(input.source);
      if (!pickerSource && !(hasList && contextualRequired)) continue;
      if (pickerSource && !input.sourceRef && !hasList) continue;
      seen.add(input.stateKey);
      const setter = `set${pascalIdent(property)}`;
      if (hasSelectionWriter(pageCode, property, setter)) continue;
      issues.push(`${binding.command}.${input.name} has no selection control: click a list row (visible selected state + ${setter}(id)) or render a <select> bound to ${property} — never a dead table`);
    }
  }
  return issues;
}

/**
 * Command whose required route/selection input is empty must render disabled with a title hint.
 * The shared handler silent-returns in that case — a live button is a dead click (no request, no message).
 */
export function collectCommandDisabledIssues(pageDefinition: unknown, sharedDefinition: unknown, pageCode: string): string[] {
  if (!pageCode) return [];
  const issues: string[] = [];
  const tags = [...pageCode.matchAll(/<(?:button|input)\b[^>]*>/gu)].map(match => match[0]);
  for (const binding of readPageBindings(pageDefinition)) {
    if (binding.kind === 'query') continue;
    const required = binding.inputs.filter(input => input.required && CONTEXTUAL_ID_SOURCES.has(input.source));
    if (required.length === 0) continue;
    const action = isRecord(sharedDefinition) && Array.isArray(sharedDefinition.actions)
      ? sharedDefinition.actions.filter(isRecord).find(item => stringValue(item.actionId) === binding.command)
      : undefined;
    const handler = action ? stringValue(action.handlerName) : `handle${pascalIdent(binding.command)}Click`;
    if (!pageCode.includes(binding.command) && !(handler && pageCode.includes(handler))) continue;
    for (const input of required) {
      const property = propertyForStateKey(sharedDefinition, input.stateKey);
      if (!property) continue;
      const disabledRe = new RegExp(`\\?disabled=\\$\\{[^}]*\\b(?:this|host)\\.${escapeForRegExp(property)}\\b`, 'u');
      const matching = tags.filter(tag => disabledRe.test(tag));
      if (matching.length === 0) {
        issues.push(`${binding.command} button is clickable with empty required ${input.name}: bind ?disabled to ${property} and set title to the missing-precondition hint`);
        continue;
      }
      if (!matching.some(tag => /\btitle\s*=/u.test(tag))) {
        issues.push(`${binding.command} disabled button has no title hint for empty ${input.name}`);
      }
    }
  }
  return issues;
}

/**
 * Query whose required inputs are all route params (or that has none) must be in initialLoads so
 * connectedCallback runs it after syncRouteParams. getById with a URL id that only loads on a refresh
 * click is the inspectCurrentTaskStatus defect.
 */
export function collectMissingInitialLoadIssues(sharedDefinition: unknown, pageDefinition?: unknown): string[] {
  if (!isRecord(sharedDefinition)) return [];
  const loaded = new Set(
    (Array.isArray(sharedDefinition.initialLoads) ? sharedDefinition.initialLoads : [])
      .filter(isRecord)
      .map(load => stringValue(load.actionId))
      .filter(Boolean),
  );
  const issues: string[] = [];
  if (pageDefinition) {
    for (const binding of readPageBindings(pageDefinition)) {
      if (binding.kind !== 'query') continue;
      const qualifies = binding.inputs.every(input =>
        !input.required || ROUTE_SOURCES.has(input.source) || input.presentation === 'route');
      if (!qualifies || loaded.has(binding.command)) continue;
      issues.push(`${binding.command} is a query whose required inputs are route params (or none) but is not in initialLoads: connectedCallback must run it after syncRouteParams`);
    }
    return issues;
  }
  if (!Array.isArray(sharedDefinition.actions)) return [];
  for (const action of sharedDefinition.actions.filter(isRecord)) {
    if (stringValue(action.kind) !== 'query') continue;
    const actionId = stringValue(action.actionId);
    if (!actionId) continue;
    const inputs = Array.isArray(action.inputStateKeys) ? action.inputStateKeys.map(String) : [];
    const routes = new Set((Array.isArray(action.routeParamInputStateKeys) ? action.routeParamInputStateKeys : []).map(String));
    if (!inputs.every(key => routes.has(key)) || loaded.has(actionId)) continue;
    issues.push(`${actionId} is a query whose inputs are all route params (or none) but is not in initialLoads: connectedCallback must run it after syncRouteParams`);
  }
  return issues;
}

/**
 * Every command must render BOTH a success and an error path, in its own region.
 *
 * Supervisor refinement 2: the criterion is "both paths exist and are local", not the literal
 * `action.{cmd}.success/error` key — the reduced defs no longer carries an i18n contract, so demanding
 * the key would enforce a convention that is not there. The key is accepted as the preferred evidence.
 *
 * When the shared carries an actionError state, the error path must render that property (it holds
 * error.message) or an i18n lookup keyed by error.code — a generic "Falhou" / HTTP status is not
 * enough. Presence of feedback without the envelope was the 400-on-screen defect.
 */
export function collectMutationFeedbackIssues(pageDefinition: unknown, sharedDefinition: unknown, pageCode: string): string[] {
  if (!pageCode) return [];
  const issues: string[] = [];
  const pageId = stringValue((pageDefinition as Record<string, unknown>)?.pageId);
  for (const binding of readPageBindings(pageDefinition)) {
    if (binding.kind === 'query') continue;
    const statusProperty = propertyForStateKey(sharedDefinition, `ui.${pageId}.action.${binding.command}.state`);
    const mentionsCommand = new RegExp(`\\b(?:${binding.command}|${statusProperty || binding.command})\\b`, 'u').test(pageCode);
    if (!mentionsCommand) continue;                                   // command not rendered at all
    const hasSuccess = new RegExp(`action\\.${binding.command}\\.success|'success'|"success"`, 'u').test(pageCode);
    const hasError = new RegExp(`action\\.${binding.command}\\.error|${binding.command}Error|'error'|"error"`, 'u').test(pageCode);
    if (!hasSuccess || !hasError) {
      issues.push(`${binding.command} renders no ${!hasSuccess && !hasError ? 'success/error' : (!hasSuccess ? 'success' : 'error')} feedback: both paths must be rendered next to the command itself, never as a page-level banner`);
    }
    const errorProperty = propertyForStateKey(sharedDefinition, `ui.${pageId}.action.${binding.command}.error`);
    if (!errorProperty) continue;
    const usesErrorState = new RegExp(`\\b(?:this|host)\\.${escapeForRegExp(errorProperty)}\\b`, 'u').test(pageCode);
    const usesI18nByCode = /\.code\b/.test(pageCode) && /\b(?:this\.)?msg(?:Messages)?\s*\[/.test(pageCode);
    if (!usesErrorState && !usesI18nByCode) {
      issues.push(`${binding.command} error feedback discards the envelope: render ${errorProperty} (error.message) or this.msg[error.code], never the HTTP status`);
    }
  }
  return issues;
}

/**
 * Command handler whose error path never reads error.message (nor an i18n map keyed by error.code).
 * Deterministic over the generated shared .ts — the page cannot invent a message the handler dropped.
 */
export function collectMutationEnvelopeErrorIssues(sharedDefinition: unknown, sharedCode: string): string[] {
  if (!sharedCode) return [];
  if (!isRecord(sharedDefinition) || !Array.isArray(sharedDefinition.actions)) return [];
  const issues: string[] = [];
  for (const action of sharedDefinition.actions.filter(isRecord)) {
    if (stringValue(action.kind) !== 'command') continue;
    const actionId = stringValue(action.actionId);
    const methodName = stringValue(action.methodName) || actionId;
    if (!methodName) continue;
    const body = sliceGeneratedMethodBody(sharedCode, methodName);
    if (body === null) continue;
    if (commandErrorPathReadsEnvelope(body, sharedCode)) continue;
    issues.push(`${actionId || methodName} error path does not read error.message (nor an i18n map keyed by error.code): the envelope message is the screen text, never the HTTP status`);
  }
  return issues;
}

function sliceGeneratedMethodBody(source: string, methodName: string): string | null {
  const match = new RegExp(`(?:async\\s+)?${escapeForRegExp(methodName)}\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+)?\\{`, 'u').exec(source);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = source.slice(start);
  const end = rest.search(/\n  (?:async |[A-Za-z_]|\/\*\*)/);
  return end < 0 ? rest : rest.slice(0, end);
}

/**
 * @param source the whole shared .ts, so a THIN DELEGATING command can be followed one hop.
 *
 * run01/102047: `async cmdCreateTask() { await this.executeCreateTask(undefined); }` reads the envelope
 * inside `executeCreateTask`, but this check only ever saw the wrapper and reported an IMPOSSIBLE finding
 * — no correct implementation of that shape could clear it. Three repair rounds were spent on it, and the
 * blind rewrite they triggered is what destroyed `handleQryListTaskClick` (the run then shipped a module
 * that does not compile). A finding no rewrite can close is worse than no finding at all.
 */
function commandErrorPathReadsEnvelope(body: string, source: string): boolean {
  if (/\breadErrorMessage\s*\(/.test(body)) return true;
  // Optional chaining (`error?.message`) is the generated form; `\berror\.message\b` does not match it.
  if (/\berror\??\.message\b/.test(body) || /\brecord\??\.message\b/.test(body)) return true;
  if (/\.code\b/.test(body) && /\b(?:this\.)?msg(?:Messages)?\s*\[/.test(body)) return true;
  const delegate = delegatedMethodName(body);
  if (!delegate) return false;
  const delegateBody = sliceGeneratedMethodBody(source, delegate);
  // ONE hop, and only into the callee of a body that does nothing else: a method that also does work of
  // its own keeps its own error path, and following every `this.x()` call would clear a genuinely broken
  // command because some unrelated helper happens to read error.message.
  return delegateBody === null ? false : commandErrorPathReadsEnvelope(delegateBody, '');
}

/** The single method a body delegates to and nothing else (`{ await this.executeCreateTask(undefined); }`). */
function delegatedMethodName(body: string): string | null {
  const only = body
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/[^\n]*/gu, '')
    .trim()
    .replace(/\}$/u, '')
    .trim();
  return /^(?:return\s+|await\s+|void\s+)*this\.([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*;?$/u.exec(only)?.[1] ?? null;
}

/**
 * Closed-domain input (contract string-literal union, or the shared input state's valueSet copied
 * from l4 enum[]) bound to a free-text control. Typing an invalid status into a 4-value field is a
 * 400; the UI must make that impossible. Select / transition buttons are the legitimate path.
 */
export function collectEnumTextInputIssues(sharedDefinition: unknown, pageCode: string, contractSource: string): string[] {
  if (!pageCode) return [];
  const issues: string[] = [];
  const unions = contractInputLiteralUnions(contractSource);
  if (!isRecord(sharedDefinition) || !Array.isArray(sharedDefinition.states)) return issues;

  for (const state of sharedDefinition.states.filter(isRecord)) {
    if (stringValue(state.kind) !== 'input') continue;
    const property = stringValue(state.name);
    if (!property) continue;
    const contractRef = isRecord(state.contractRef) ? state.contractRef : null;
    const commandName = stringValue(contractRef?.commandName);
    const field = stringValue(contractRef?.field);
    const fromContract = (commandName && field) ? unions.get(commandName)?.get(field) : undefined;
    const fromValueSet = Array.isArray(state.valueSet) ? state.valueSet.map(item => stringValue(item)).filter(Boolean) : [];
    const literals = fromContract && fromContract.length >= 2
      ? fromContract
      : (fromValueSet.length >= 2 ? fromValueSet : []);
    if (literals.length < 2) continue;
    if (!isBoundToTextInput(pageCode, property)) continue;
    const target = commandName && field ? `${commandName}.${field}` : property;
    issues.push(`${target} is a closed domain (${literals.join('|')}) but is bound to a text input: render a <select> (or transition buttons when ≤4 options) with options {value: code, label: label}; never free text`);
  }
  return issues;
}

/** `XxxInput` field whose type is a pure string-literal union, keyed by camelCase(Xxx). */
function contractInputLiteralUnions(contractSource: string): Map<string, Map<string, string[]>> {
  const byCommand = new Map<string, Map<string, string[]>>();
  if (!contractSource) return byCommand;
  for (const match of contractSource.matchAll(/export\s+interface\s+([A-Za-z_$][\w$]*)Input\s*\{([^}]*)\}/gu)) {
    const command = match[1].charAt(0).toLowerCase() + match[1].slice(1);
    const fields = new Map<string, string[]>();
    for (const field of match[2].matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:\s*([^;]+);/gmu)) {
      const literals = parseContractStringUnion(field[2]);
      if (literals && literals.length >= 2) fields.set(field[1], literals);
    }
    if (fields.size) byCommand.set(command, fields);
  }
  return byCommand;
}

/** `'a' | 'b' | undefined` -> ['a','b']; null when the type is not a string-literal union. */
function parseContractStringUnion(rawType: string): string[] | null {
  const parts = rawType.split('|').map(part => part.trim()).filter(part => part && part !== 'undefined' && part !== 'null');
  const literals: string[] = [];
  for (const part of parts) {
    const match = /^['"]([^'"]*)['"]$/.exec(part);
    if (!match) return null;
    literals.push(match[1]);
  }
  return literals.length ? literals : null;
}

const NON_TEXT_INPUT_TYPES = new Set([
  'hidden', 'number', 'checkbox', 'radio', 'date', 'datetime-local', 'time', 'file', 'color', 'range', 'month', 'week',
]);

/** True when `property` is bound to a free-text `<input>` / `<textarea>` (not `<select>`). */
function isBoundToTextInput(pageCode: string, property: string): boolean {
  if (!property) return false;
  const ident = escapeForRegExp(property);
  const tagRe = new RegExp(`<(input|textarea)\\b([^>]*\\b(?:\\.value|value)=\\$\\{[^}]*\\b(?:this|host)\\.${ident}\\b[^>]*)>`, 'gu');
  for (const match of pageCode.matchAll(tagRe)) {
    if (match[1] === 'textarea') return true;
    const type = /\btype\s*=\s*['"]([^'"]+)['"]/u.exec(match[2])?.[1]?.toLowerCase();
    if (!type || !NON_TEXT_INPUT_TYPES.has(type)) return true;
  }
  return false;
}

/**
 * Closed-domain field painted as the stored code in a list cell. The l4 already has
 * enumLabels/lifecycleLabels; the cell must show the label (fallback: the code).
 */
export function collectEnumCellLabelIssues(pageCode: string, contractSource: string): string[] {
  if (!pageCode) return [];
  const unions = contractLiteralUnionFields(contractSource);
  if (!unions.size) return [];
  const issues: string[] = [];
  const genericDump = /displayValue\s*\(\s*valueOf\s*\(\s*[^,]+,\s*column\.field/u.test(pageCode);
  for (const [field, literals] of unions) {
    if (hasBareEnumCell(pageCode, field) || (genericDump && hasColumnField(pageCode, field) && !hasEnumLabelLookup(pageCode, field))) {
      issues.push(`${field} is a closed domain (${literals.join('|')}) painted as the stored code in a list cell: show the enumLabels/lifecycleLabels rótulo (fallback: the code); never \${item.${field}} or a generic displayValue on that column`);
    }
  }
  return issues;
}

/**
 * `*Id` (keyField / FK) as a table column when title/name is already there. The id stays in
 * state for actions; the UUID is not a default column.
 */
export function collectIdColumnIssues(pageCode: string): string[] {
  if (!pageCode) return [];
  const columns = tableColumnFields(pageCode);
  if (!columns.some(field => field === 'title' || field === 'name')) return [];
  return columns.filter(isIdColumnField).map(field =>
    `${field} is an id column while title/name is already in the table: drop the *Id column (keep the id in state for selection/actions)`);
}

function contractLiteralUnionFields(contractSource: string): Map<string, string[]> {
  const byField = new Map<string, string[]>();
  if (!contractSource) return byField;
  for (const match of contractSource.matchAll(/([A-Za-z_$][\w$]*)\??\s*:\s*((?:'[^']*'\s*\|\s*)+'[^']*')/gu)) {
    const literals = parseContractStringUnion(match[2]);
    if (literals && literals.length >= 2 && !byField.has(match[1])) byField.set(match[1], literals);
  }
  return byField;
}

function hasColumnField(pageCode: string, field: string): boolean {
  return new RegExp(`\\bfield\\s*:\\s*['"]${escapeForRegExp(field)}['"]`, 'u').test(pageCode);
}

function hasEnumLabelLookup(pageCode: string, field: string): boolean {
  const ident = escapeForRegExp(field);
  if (new RegExp(`\\[(?:item|row|entry|record)\\.${ident}\\]`, 'u').test(pageCode)) return true;
  if (new RegExp(`column\\.field\\s*===\\s*['"]${ident}['"]`, 'u').test(pageCode)) return true;
  if (new RegExp(`(?:Label|labels)\\s*[\\[(]`, 'u').test(pageCode) && new RegExp(`\\b${ident}\\b`, 'u').test(pageCode)) return true;
  return false;
}

function hasBareEnumCell(pageCode: string, field: string): boolean {
  const ident = escapeForRegExp(field);
  const row = '(?:item|row|entry|record|task|project)';
  const bare = new RegExp(
    `\\$\\{\\s*(?:(?:displayValue|String)\\s*\\(\\s*)?(?:${row}\\.${ident}|valueOf\\s*\\(\\s*[^,]+,\\s*['"]${ident}['"]\\s*\\))\\s*\\)?\\s*\\}`,
    'gu',
  );
  for (const match of pageCode.matchAll(bare)) {
    if (isAttributeInterpolation(pageCode, match.index ?? 0)) continue;
    if (hasEnumLabelLookup(match[0], field)) continue;
    return true;
  }
  return false;
}

function isAttributeInterpolation(pageCode: string, index: number): boolean {
  const before = pageCode.slice(Math.max(0, index - 48), index);
  return /(?:^|[^=])\s*(?:\.?[A-Za-z_][\w-]*|@[A-Za-z_][\w-]*)=\s*$/u.test(before);
}

function tableColumnFields(pageCode: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (name: string): void => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  };
  for (const match of pageCode.matchAll(/\bfield\s*:\s*['"]([A-Za-z_$][\w$]*)['"]/gu)) add(match[1]);
  for (const match of pageCode.matchAll(/<td\b[^>]*>\s*\$\{[^}]*\b(?:item|row|entry|record)\.([A-Za-z_$][\w$]*)/gu)) add(match[1]);
  return names;
}

function isIdColumnField(name: string): boolean {
  return name === 'id' || /Id$/u.test(name);
}

/**
 * Deterministic UX hygiene checks for a materialized page. They intentionally inspect only
 * contracts present in the page/shared defs and generated page code; missing L4 data is not
 * guessed here. The materialization phase feeds a failure back to the page generator.
 */
export function validateGeneratedPageQuality(pageDefinition: unknown, sharedDefinition: unknown, pageCode: string): string[] {
  if (!isRecord(pageDefinition) || !isRecord(sharedDefinition)) return [];
  const errors: string[] = [];
  const pageId = stringValue(pageDefinition.pageId);
  const layout = isRecord(pageDefinition.layout) ? pageDefinition.layout : null;
  const sections = Array.isArray(layout?.sections) ? layout.sections.filter(isRecord) : [];
  const i18n = isRecord(sharedDefinition.i18n) ? sharedDefinition.i18n : {};
  const states = Array.isArray(sharedDefinition.states) ? sharedDefinition.states.filter(isRecord) : [];
  const actions = Array.isArray(sharedDefinition.actions) ? sharedDefinition.actions.filter(isRecord) : [];
  const stateByKey = new Map(states.map(state => [stringValue(state.stateKey), state]));

  for (const state of states) {
    if (stringValue(state.kind) === 'layoutState') errors.push(`layoutState without binding: ${stringValue(state.stateKey)}`);
  }

  for (const section of sections) {
    for (const organism of arrayRecords(section.organisms)) {
      for (const intent of arrayRecords(organism.intentions)) {
        const title = stringValue(intent.titleKey);
        const empty = stringValue(intent.emptyKey);
        if (title && empty && stringValue(i18n[title]) && stringValue(i18n[title]) === stringValue(i18n[empty])) {
          errors.push(`empty state repeats intention title: ${stringValue(intent.id)}`);
        }
        for (const field of [...arrayRecords(intent.fields), ...arrayRecords(intent.filters)]) {
          const fieldName = stringValue(field.field);
          const state = stateByKey.get(stringValue(field.stateKey));
          if (/Id$/i.test(fieldName) && stringValue(state?.kind) === 'input' && stringValue(state?.presentation) === 'form') {
            errors.push(`technical id is an editable text field: ${stringValue(intent.id)}.${fieldName}`);
          }
        }
      }
    }
  }

  for (const action of actions) {
    if (stringValue(action.kind) !== 'command') continue;
    const actionId = stringValue(action.actionId);
    const feedback = isRecord(action.feedback) ? action.feedback : null;
    const successKey = stringValue(feedback?.successMessageKey);
    const errorKey = stringValue(feedback?.errorMessageKey);
    if (!successKey || !errorKey || !stringValue(i18n[successKey]) || !stringValue(i18n[errorKey])) {
      errors.push(`mutation feedback i18n missing: ${actionId}`);
      continue;
    }
    if (!stringValue(action.errorStateKey) || !Array.isArray(action.clearInputStateKeys)) {
      errors.push(`mutation feedback wiring incomplete: ${actionId}`);
    }
    if (pageCode && (!pageCode.includes(`this.msg['${successKey}']`) || !pageCode.includes(`this.msg['${errorKey}']`))) {
      errors.push(`generated page does not render textual mutation feedback: ${actionId}`);
    }
  }

  return errors.map(error => pageId ? `${pageId}: ${error}` : error);
}

/**
 * Deterministic TEMPLATE-HYGIENE gate for a generated page .ts (bugpage21).
 *
 * These defects compile cleanly and are invisible to BOTH the typecheck gate and
 * validateGeneratedPageQuality, which is exactly why one reached the browser: page21/shiftWorkspace
 * rendered the literal text `function nothing() { return b``; }` on screen.
 *
 * The failure mode: the render skills prescribe `import { html } from 'lit'` and never said what to put
 * in an empty ternary branch, so the model invented a MODULE-LEVEL helper and then used it by NAME:
 *
 *   ${cond ? html`...` : nothing}          // <- passes the FUNCTION OBJECT to Lit
 *   function nothing() { return html``; }  // <- invented at the bottom of the file
 *
 * Lit stringifies an unknown value, so the function's own source code is painted into the DOM. Observed
 * twice in 102051 (`nothing`, and a `nothingOrEmpty(_s: string)` variant), so the check targets the
 * general shape, not the name.
 *
 * THE DEFECT IS THE UNCALLED REFERENCE, NOT THE DECLARATION. An earlier version of this gate banned every
 * module-level `function` outright, which was over-broad: a helper that IS called is harmless, and the ban
 * fired on three of three generations (5-6 helpers each) — always repaired, always costing an extra call —
 * while missing the identical risk in a `const fn = () => …`. So the declaration is allowed and the
 * reference is what is checked, for module-level helpers (function OR const arrow) and for render methods
 * alike: splitting a page into render<Name>() reopened the same hole one level up, where a bare
 * `${this.renderHeader}` paints the METHOD source on screen and compiles.
 *
 * Pure (string in, findings out) so it is unit-tested without the Studio runtime.
 */
export function collectPageTemplateHygieneIssues(pageCode: string): string[] {
  if (!pageCode) return [];
  const issues: string[] = [];
  const litImportsNothing = /import\s*\{[^}]*\bnothing\b[^}]*\}\s*from\s*['"]lit['"]/u.test(pageCode);

  // Every module-level helper, however it is declared. `const x = () => …` carries exactly the same risk
  // as `function x() {}` and used to be invisible here.
  const helpers = new Set<string>();
  for (const match of pageCode.matchAll(/^(?:export\s+)?function\s+([A-Za-z_$][\w$]*)/gmu)) helpers.add(match[1]);
  for (const match of pageCode.matchAll(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/gmu)) helpers.add(match[1]);

  for (const name of helpers) {
    // Used by NAME inside a template interpolation -> Lit stringifies the function and paints its source.
    if (!new RegExp(String.raw`\$\{[^}]*?[:?]\s*${name}\s*(?:\}|\))`, 'u').test(pageCode)) continue;
    issues.push(`helper '${name}' is passed to a template without being called, so Lit renders the function source as text: call it — \`${name}()\` — or use the Lit sentinel \`nothing\` (add it to the 'lit' import) for an empty branch`);
  }

  // A render method referenced but NOT called inside a template interpolation — same defect, one level up.
  // \b after the name is load-bearing: without it the greedy name backtracks to a prefix, the lookahead
  // then sees a plain letter and every correctly-called method gets flagged.
  for (const match of pageCode.matchAll(/\$\{[^}]*?\bthis\.(render[A-Za-z0-9_$]*)\b(?!\s*[(.[])/gmu)) {
    issues.push(`render method 'this.${match[1]}' is interpolated without being called, so Lit paints the method source as text: call it — \${this.${match[1]}()}`);
  }

  // `nothing` used as a value while it is NOT the Lit sentinel and NOT a local helper (a plain
  // Cannot-find-name would be a compile error; this catches the ambiguous middle where a helper was
  // deleted but the import was never added).
  if (!litImportsNothing && /[:?]\s*nothing\s*(?:\}|\))/u.test(pageCode) && !/^function\s+nothing\b/mu.test(pageCode)) {
    issues.push("template uses `nothing` for an empty branch but it is not imported: add `nothing` to the import from 'lit'");
  }

  // `this.msg` with NO getter in this file. The skeleton gives every page its own i18n block plus
  // `protected get msg()`, and the skill teaches `const msg = this.msg` — correct, but only while the
  // block is there. Four pages of the buildFlowFsm run (page11 forwardChangeOrderForClientApproval and
  // recordProjectMaterialUsage, page31 declineChangeOrder and monitorDailyProjectRecords) deleted the
  // catalog and kept the access, assuming the shared base class provides `msg`; it does not, so it is a
  // TS2339 and the shared keys they reference are unreachable. Caught here it costs no round: it is
  // named in the same loop that saved the file, instead of arriving as a compiler diagnostic that says
  // nothing about the cause.
  if (/\bthis\.msg\b/u.test(pageCode) && !/\bget\s+msg\s*\(/u.test(pageCode)) {
    // The remedy differs by artifact, and this gate also runs on organisms: an organism is a plain
    // function taking `host`, so telling it to add a getter would send the repair the wrong way.
    issues.push(/^export\s+class\s/mu.test(pageCode)
      ? '`this.msg` is used but this file defines no `get msg()`: the i18n block of the skeleton (/// **collab_i18n_start** … the messages consts … `protected get msg()`) was deleted — the shared base class does NOT provide `msg`. Restore the block with the keys this render references.'
      : '`this.msg` is used in a render FUNCTION, which has no `this`: an organism reads its own catalog — `const msg = o<N>Messages[host.getMessageKey(o<N>Messages)] || o<N>Fallback` — and takes everything else from `host`.');
  }
  issues.push(...collectPageCatalogueIssues(pageCode));
  return issues;
}

/**
 * The catalogue block belongs to the SKELETON, and the model rebuilding it is a compile error every time.
 *
 * Run fe2 of the petShop (22/08): 7 of 19 page21 files replaced the emitted
 * `pageMessage_<locale>`/`PageMessageType` block with a hand-written `collab_i18n_<lang>` one — three
 * locales for a module that declares ONE, each `as const`, typed `type CollabI18n = typeof
 * collab_i18n_pt`. Since `as const` pins the values as literal types, the other two locales cannot
 * satisfy that type: 6× TS2322 in 2 files, and the module gate was the only thing that saw them (the
 * per-file verify does not close types over the module).
 *
 * Textual on purpose, same precedent as the helper-interpolation checks above: the defect is named in the
 * loop that just saved the file, where a repair slot already exists, instead of arriving as a module-wide
 * compiler diagnostic that says nothing about the cause.
 */
export function collectPageCatalogueIssues(pageCode: string): string[] {
  if (!pageCode) return [];
  const issues: string[] = [];
  const handWritten = [...pageCode.matchAll(/^\s*(?:const|let)\s+(collab_i18n_[A-Za-z0-9_$]+)\s*[=:]/gmu)]
    .map(match => match[1]);
  if (handWritten.length > 0) {
    issues.push(`catalogue rebuilt by hand: ${[...new Set(handWritten)].join(', ')} — the skeleton emits `
      + '`pageMessage_<locale>` (or `o<N>Message_<locale>`) with the type `PageMessageType` (`O<N>Msg`) '
      + 'and the map `pageMessages`; keep that block between the /// **collab_i18n_start** markers verbatim '
      + 'and never introduce a `collab_i18n_*` const');
  }
  // A catalogue const frozen with `as const` makes its values LITERAL types, so no other locale can be
  // typed from it. The skeleton never emits it.
  for (const match of pageCode.matchAll(/^\s*(?:const|let)\s+((?:pageMessage|o\d+Message|collab_i18n)_[A-Za-z0-9_$]+)[^=]*=\s*\{[\s\S]*?^\s*\}\s*as const\s*;/gmu)) {
    issues.push(`catalogue '${match[1]}' is frozen with \`as const\`: its values become literal types and `
      + 'every other locale then fails TS2322 — drop `as const` (the default locale is inferred, the others '
      + 'carry `: PageMessageType`)');
  }
  // More than one catalogue for the SAME locale: the duplicate is what diverges and produces a TS2353 on
  // a key present in one copy and missing from the one that defines the type.
  const byLocale = new Map<string, string[]>();
  for (const match of pageCode.matchAll(/^\s*(?:const|let)\s+((?:pageMessage|o\d+Message)_([A-Za-z0-9_$]+))\s*[=:]/gmu)) {
    const locale = match[2].replace(/_/gu, '-').toLowerCase();
    byLocale.set(locale, [...(byLocale.get(locale) ?? []), match[1]]);
  }
  for (const [locale, consts] of byLocale) {
    if (consts.length > 1) {
      issues.push(`locale '${locale}' has ${consts.length} catalogues (${consts.join(', ')}): one locale, one const`);
    }
  }
  return [...new Set(issues)];
}

/**
 * The i18n block must EXIST — the inverse of collectPageCatalogueIssues, which only rejects a block
 * rebuilt in the wrong vocabulary.
 *
 * Run02 of the 102047 todo module (26/08): `page11/reviewAndProgressTasks.ts` came back with no
 * `/// **collab_i18n_start**`/`end` markers, a hand-written `type PageMessageType = {...}` literal and a
 * single `en` const in a module that declares pt-br/en/es. It compiled, passed every gate, and
 * @@addLanguage then classified it `without catalogue` and SKIPPED it — the page will never be
 * translated. The sibling pages of the SAME run (taskCatalogue, taskHub) were born with the skeleton
 * block intact, so this is per-call LLM variation, exactly what a deterministic gate must hold.
 *
 * Repairable, not warning: rewriting the .ts is the whole fix, and the message tells the repair what to
 * do. Same textual-gate family as the checks above, and pure (string in, findings out) for the same
 * reason: the defect is named in the loop that saved the file.
 *
 * `kind` decides the expected vocabulary: a page emits `pageMessage_<locale>`/`PageMessageType`/
 * `pageMessages`; an organism emits `o<n>Message_<locale>`/`O<n>Msg`/`o<n>Messages`.
 */
export function collectMissingI18nBlockIssues(code: string, kind: 'page' | 'organism'): string[] {
  if (!code) return [];
  const issues: string[] = [];
  const remedy = 'restore the skeleton i18n block between the /// **collab_i18n_start** and /// **collab_i18n_end** markers — never invent your own format: one const per declared locale, the default inferred (`type <T> = typeof <default>`), the others annotated, and the map at the end';
  const constLabel = kind === 'page' ? 'pageMessage_<locale>' : 'o<n>Message_<locale>';
  const typeLabel = kind === 'page' ? 'PageMessageType' : 'O<n>Msg';
  const mapLabel = kind === 'page' ? 'pageMessages' : 'o<n>Messages';

  const missingMarkers = ['/// **collab_i18n_start**', '/// **collab_i18n_end**'].filter(marker => !code.includes(marker));
  if (missingMarkers.length > 0) {
    issues.push(`i18n block marker(s) missing (${missingMarkers.join(', ')}): a page without the markers is invisible to @@addLanguage ('without catalogue') and stops being translated — ${remedy}`);
  }

  // The catalogue consts in the skeleton's vocabulary, annotated or not. `o\d+` and not a fixed `o<n>`:
  // the checker sees one file at a time and the organism position lives in the file NAME.
  const constRe = kind === 'page'
    ? /^\s*(?:export\s+)?(?:const|let)\s+(pageMessage_[A-Za-z0-9_$]+)\s*(:\s*PageMessageType)?\s*=/gmu
    : /^\s*(?:export\s+)?(?:const|let)\s+(o\d+Message_[A-Za-z0-9_$]+)\s*(:\s*O\d+Msg)?\s*=/gmu;
  const consts = [...code.matchAll(constRe)];
  if (consts.length === 0) {
    issues.push(`no \`${constLabel}\` catalogue const: the i18n block of the skeleton was dropped — ${remedy}`);
  } else {
    // Only the default locale is inferred, and it is the one that DEFINES the type. Every other const
    // carries the annotation, so a forgotten key is TS2741 and a typo TS2353 — parity by the compiler.
    const typeSources = new Set([...code.matchAll(/^\s*type\s+(?:PageMessageType|O\d+Msg)\s*=\s*typeof\s+([A-Za-z0-9_$]+)\s*;/gmu)].map(match => match[1]));
    for (const match of consts) {
      if (!match[2] && !typeSources.has(match[1])) {
        issues.push(`catalogue '${match[1]}' has no \`: ${typeLabel}\` parity annotation and is not the default (\`type ${typeLabel} = typeof ${match[1]}\`): without it the compiler cannot enforce locale parity — ${remedy}`);
      }
    }
  }

  const mapRe = kind === 'page'
    ? /^\s*(?:export\s+)?(?:const|let)\s+pageMessages\s*[=:]/mu
    : /^\s*(?:export\s+)?(?:const|let)\s+o\d+Messages\s*[=:]/mu;
  if (!mapRe.test(code)) {
    issues.push(`the catalogue map \`${mapLabel}\` is missing: the msg getter resolves the locale through it — ${remedy}`);
  }
  return issues;
}

/** Field names that carry an image URL from the BFF (bugimage.md). */
// The prefix is OPTIONAL: match both a bare `imageUrl` and a qualified `menuItemPhotoUrl`.
const IMAGE_FIELD = /\b[\w$]*(?:image|photo|logo|avatar|picture|thumbnail)Url\b/iu;

/**
 * A page whose defs bind an image-URL field must actually RENDER an image (bugimage.md).
 *
 * The seed generator produced real photos and listMenuItems/queryMenuItems returned `imageUrl` on every
 * row, but not one generated page contained an `<img>` tag: the render skills said "assets are out of
 * scope this wave, never invent an image URL", so the model treated a DATA field as a marketing asset and
 * drew placeholder boxes. Nothing failed — the app just silently showed no pictures.
 *
 * Checked against the page DEFS (the layout/fieldCatalog naming the field), not the prose: only a page
 * whose contract actually carries such a field is required to render one. `pageCode` mentioning the field
 * without an `<img>` is the exact defect.
 */
/**
 * A design token used against its declared role: a `-bg` token inside a text utility, or a `-text` token
 * inside a background utility.
 *
 * Real defect (mls-102045 changeOrderWorkspace):
 * `bg-[var(--bg-secondary-color,#334155)] text-[var(--bg-primary-color,#ffffff)]` — a BACKGROUND token as
 * the label color. It reads fine in light mode only because the hardcoded fallback contrasts; with the
 * theme applied both tokens are dark and the label vanishes. No existing check caught it: the token name
 * is real, so "do not invent token names" was satisfied.
 *
 * Deterministic and role-vocabulary-only: it fires on the `<role>-bg` / `<role>-text` suffix convention,
 * so a project on the older flat vocabulary (bg-primary-color / text-primary-color) is NOT flagged — its
 * names carry no role suffix to check. Matches the utility prefix immediately before the `[var(--…)]`,
 * which is how the render applies colors (Tailwind arbitrary values).
 */
export function collectDesignTokenRoleIssues(pageCode: string): string[] {
  if (!pageCode) return [];
  const issues = new Set<string>();
  // `text-[var(--x-bg…)]`, `border-[var(--x-text…)]`, `bg-[var(--x-text…)]`, incl. state prefixes
  // (hover:, dark:, disabled:) and the -hover/-focus/-disabled token variants.
  const usage = /\b(?:[a-z-]+:)*(bg|text|border|fill|stroke|ring|from|via|to|placeholder|decoration|outline|accent|caret|shadow|divide)-\[var\(\s*--([a-z][a-z0-9-]*)/gu;
  for (const match of pageCode.matchAll(usage)) {
    const utility = match[1];
    const token = match[2];
    const role = token.replace(/-(?:hover|focus|disabled)$/u, '');
    const isBgToken = role.endsWith('-bg');
    const isTextToken = role.endsWith('-text');
    if (!isBgToken && !isTextToken) continue;              // flat vocabulary: no role to enforce
    const isTextUtility = utility === 'text' || utility === 'placeholder' || utility === 'caret' || utility === 'decoration';
    if (isBgToken && isTextUtility) {
      issues.add(`design token used against its role: '${utility}-[var(--${token})]' puts a BACKGROUND token in a text utility — use the '${role.slice(0, -'-bg'.length)}-text' token of the same role (a -bg token is never a text color)`);
    }
    if (isTextToken && utility === 'bg') {
      issues.add(`design token used against its role: 'bg-[var(--${token})]' puts a TEXT token in a background utility — use the '${role.slice(0, -'-text'.length)}-bg' token of the same role`);
    }
  }
  return [...issues];
}

export function collectMissingImageRenderIssues(defsSource: string, pageCode: string): string[] {
  if (!defsSource || !pageCode) return [];
  const match = IMAGE_FIELD.exec(defsSource);
  if (!match) return [];                                   // no image field in this page's contract
  if (/<img\b/u.test(pageCode)) return [];                 // renders an image -> fine
  return [`page binds the image field '${match[0]}' but renders no <img> tag: bind it as an image (src=item.${match[0]} with an alt and a nothing/null empty branch) instead of a placeholder box or raw URL text`];
}

export const CONTRACTS_102029: readonly string[] = [
  '_102029_/l2/collabLitElement.ts',
  '_102029_/l2/bffClient.ts',
  '_102029_/l2/collabState.ts',
  '_102029_/l2/interactionRuntime.ts',
];

export function expandContextRef(ref: string): string[] {
  return ref === '_102029_.d.ts' ? [...CONTRACTS_102029] : [ref];
}

// ---------------------------------------------------------------------------
// Materialization context diet (flow.json materializationContextPolicy).
// Shared by BOTH runtimes (Studio agentCfeMaterializeGen and nodejsMaterializeL2)
// so the prompt shape never drifts between them.
// ---------------------------------------------------------------------------

/** True for the shared base-class runtime file of a page (web/shared/{page}.ts). */
export function isSharedRuntimeTsRef(ref: string): boolean {
  return /\/web\/shared\/[^/]+\.ts$/u.test(ref) && !ref.endsWith('.defs.ts');
}

/**
 * Persisted compiled .d.ts artifact path for a shared runtime ref.
 *
 * Lives NEXT TO the shared (`web/shared/<page>Dts.txt`) so it is a first-class object of human
 * conferral, not buried in trace/ (decision 27/ago). Named `<page>Dts.txt`, NOT `<page>.d.ts`:
 * - stor shortNames never carry a dot (nomes_sem_ponto); '.d.ts' is not a compound extension the
 *   Studio sync knows (collabFileSystemSync KNOWN_EXTENSIONS), so it would round-trip as
 *   shortName `<page>.d` + '.ts' — the exact 2-dot family of the SW add versionRef-0 bug.
 * - .txt is invisible to tsc. A real .d.ts beside the shared was proved inert for the mls-base
 *   tsc (27/ago: an import of `<page>.js` still resolves to the .ts, and skipLibCheck hides the
 *   declaration file's own errors) — but only while skipLibCheck stays on; .txt does not bet on it.
 */
export function sharedDtsArtifactRef(sharedTsRef: string): string | null {
  const match = sharedTsRef.match(/^(.*)\/web\/shared\/([^/]+)\.ts$/u);
  if (!match || sharedTsRef.endsWith('.defs.ts')) return null;
  return `${match[1]}/web/shared/${match[2]}Dts.txt`;
}

/** True for a persisted shared-dts artifact ref (`web/shared/<page>Dts.txt`). */
export function isSharedDtsArtifactRef(ref: string): boolean {
  return /\/web\/shared\/[^/]+Dts\.txt$/u.test(ref);
}

/**
 * Provenance of the shared .d.ts artifact — by CONTENT, never by mtime.
 *
 * The artifact is the page's only description of the base class it extends: generate a page against an
 * artifact the shared no longer matches and the page compiles against a fiction. run01/102047 shipped
 * exactly that — `taskCatalogueDts.txt` declared `handleQryListTaskClick(): void` and `handleCmd…Click():
 * void` while the shared on disk had lost the first and taken an `(_event: Event)` on the rest. Five tsc
 * errors, and the page was faithful to the context it was given.
 *
 * mtime cannot arbitrate this, at two independent layers:
 * - the Studio sync flattens every mtime on the way to disk (all of run01 landed at 21:37:35);
 * - in the browser, `getFileModified` answers MAX_SAFE_INTEGER for any file with status new/changed, so
 *   once the artifact AND the shared are both dirty — which is every round after the first — the
 *   comparison is MAX vs MAX and reads "fresh" forever, in the writers as well as the reader.
 *
 * So the artifact carries a stamp of the source that produced it and is refused when it does not match.
 * An artifact with NO stamp is of unknown provenance and is refused too (every project takes one
 * compile-on-demand after this ships; the context trace declares the fallback).
 */
const SHARED_DTS_STAMP = '// sharedSourceHash:';

/** FNV-1a 32-bit, hex. A checksum, not a signature: it only has to change when the source changes. */
export function sharedSourceHash(source: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}-${source.length}`;
}

export function stampSharedDtsArtifact(dts: string, sharedSource: string): string {
  return `${SHARED_DTS_STAMP} ${sharedSourceHash(sharedSource)}\n${stripSharedDtsStamp(dts)}`;
}

/** The stamped hash, or null when the artifact carries none (pre-stamp artifact = unknown provenance). */
export function readSharedDtsStamp(artifact: string): string | null {
  const match = new RegExp(`^\\s*${SHARED_DTS_STAMP}\\s*(\\S+)`, 'u').exec(artifact);
  return match ? match[1] : null;
}

export function stripSharedDtsStamp(artifact: string): string {
  return artifact.replace(new RegExp(`^\\s*${SHARED_DTS_STAMP}[^\\n]*\\n`, 'u'), '');
}

/**
 * Whether this artifact was derived from this exact shared source.
 * `reason` is the context trace when it was not — the page must then say which fallback it took.
 */
export function checkSharedDtsProvenance(artifact: string | null, sharedSource: string | null): { dts: string | null; reason: string } {
  if (!artifact || !artifact.trim()) return { dts: null, reason: 'artifact empty' };
  if (!sharedSource) return { dts: null, reason: 'shared source unreadable' };
  const stamp = readSharedDtsStamp(artifact);
  if (!stamp) return { dts: null, reason: 'artifact provenance unknown (no source stamp)' };
  const expected = sharedSourceHash(sharedSource);
  if (stamp !== expected) return { dts: null, reason: `artifact stale (stamp ${stamp} != shared ${expected})` };
  const body = stripSharedDtsStamp(artifact);
  return body.trim() ? { dts: body, reason: 'artifact' } : { dts: null, reason: 'artifact empty' };
}

/** Inverse of sharedDtsArtifactRef: the shared runtime .ts a persisted artifact belongs to. */
export function sharedTsRefOfDtsArtifact(artifactRef: string): string | null {
  const match = artifactRef.match(/^(.*)\/web\/shared\/([^/]+)Dts\.txt$/u);
  return match ? `${match[1]}/web/shared/${match[2]}.ts` : null;
}

/**
 * The refs a DEPENDENCY probe (staleness mtime / "is my dep scheduled in this run") must check for
 * one dependsFiles entry. A page now declares the shared-dts ARTIFACT as its context (not the
 * shared .ts), but the artifact is derived from the shared: a shared newer than the artifact, or a
 * shared scheduled in this same run, still makes the page stale. Both planners (Studio
 * agentCfeMaterializeL2 and the CLI) share this so they cannot drift.
 */
export function dependencyProbeRefs(ref: string): string[] {
  const sharedTs = sharedTsRefOfDtsArtifact(ref);
  return sharedTs ? [ref, sharedTs] : [ref];
}

/** Context section for the compiled .d.ts of the shared base class. */
export function buildSharedDtsSection(sharedTsRef: string, dts: string): string {
  return `### ${sharedTsRef} (compiled .d.ts — the authoritative public surface of the base class: typed msg keys, @property names and handler signatures. The msg keys are a CLOSED vocabulary: use them EXACTLY, never invent or shorten. JSDoc 'state:'/'action' annotations map stateKeys to properties/handlers.)\n\`\`\`ts\n${dts}\n\`\`\``;
}

/** Context section for a runtime library dependency sent as compiled .d.ts (context diet — the
 * public surface is what the generated code consumes; implementation bodies only add tokens). */
export function buildRuntimeDtsSection(ref: string, dts: string): string {
  return `### ${ref} (compiled .d.ts — public surface only)\n\`\`\`ts\n${dts}\n\`\`\``;
}

/** Default context section; designSystem.ts is summarized to its token names (values are irrelevant to render). */
export function buildContextSection(ref: string, content: string): string {
  if (/\/l2\/designSystem\.ts$/u.test(ref)) {
    return `### ${ref} (design tokens — names only)\n${summarizeDesignSystemTokens(content)}`;
  }
  return `### ${ref}\n\`\`\`ts\n${content}\n\`\`\``;
}

// Token-name extraction: quoted keys with quoted values inside the tokens literal. State-suffix
// variants (-hover/-focus/-disabled) are folded into a single rule line to keep the section small.
function summarizeDesignSystemTokens(content: string): string {
  const names = new Set<string>();
  const keyValue = /"([a-z][a-z0-9-]*)"\s*:\s*"/gu;
  for (let match = keyValue.exec(content); match; match = keyValue.exec(content)) {
    const key = match[1];
    if (key === 'themename' || key === 'description') continue;
    names.add(key);
  }
  const bases = new Set<string>();
  let folded = false;
  for (const name of names) {
    const base = name.replace(/-(?:hover|focus|disabled)$/u, '');
    if (base !== name && names.has(base)) { folded = true; continue; }
    bases.add(base);
  }
  if (bases.size === 0) return '(no tokens found — use neutral fallbacks only)';
  return [
    'Apply colors as var(--<token>, <neutral fallback>). Do not invent token names.',
    ...(folded ? ['Each base token below also has -hover, -focus and -disabled variants.'] : []),
    ...designTokenRoleRules([...bases]),
    `tokens: ${[...bases].sort().join(', ')}`,
  ].join('\n');
}

/**
 * The bg/text pairing rule, DERIVED from the token names themselves.
 *
 * Only the names reach the model (values are irrelevant to render), so the role-based vocabulary
 * documented in the project's designSystem.ts header never gets here. Without the rule the model can put
 * a BACKGROUND token in a text utility — real defect in mls-102045:
 * `bg-[var(--bg-secondary-color)] text-[var(--bg-primary-color)]`, which is invisible text in dark mode
 * (both tokens are dark) and only readable in light mode because the hardcoded fallback happened to
 * contrast. It violates no rule the prompt stated: the token name existed.
 * Emitted only when the vocabulary actually has `-bg`/`-text` pairs (the role-based DS), so an older
 * flat vocabulary is left untouched.
 */
function designTokenRoleRules(bases: string[]): string[] {
  const names = new Set(bases);
  const pairs = bases
    .filter(name => name.endsWith('-bg'))
    .map(name => ({ bg: name, text: `${name.slice(0, -'-bg'.length)}-text` }))
    .filter(pair => names.has(pair.text));
  if (pairs.length === 0) return [];
  const sample = pairs.slice(0, 3).map(pair => `${pair.bg} + ${pair.text}`).join('; ');
  return [
    'ROLE PAIRING (hard rule): a `-bg` token is a BACKGROUND and NEVER a text color; a `-text` token is a',
    'text color and never a background. When a surface uses <role>-bg, its label MUST use the <role>-text',
    'of the SAME role — mixing roles (or using a -bg as text) produces unreadable text in one of the themes.',
    `Pairs available: ${sample}${pairs.length > 3 ? `; …(${pairs.length} pairs total)` : ''}.`,
  ];
}

/**
 * Definition payload sent to the LLM, minus what is not generation input: for pages the
 * 'sections' compatibility summary duplicates layout.sections; for pages AND shared, 'origin'
 * is traceability only. Everything stays in the .defs.ts file; it is only filtered from the
 * prompt (excess context slows the call and invites hallucination).
 */
export function trimDefinitionForPrompt(itemType: string, data: unknown): unknown {
  // page11 prose is already the prompt; do not wrap it as JSON.
  if (typeof data === 'string' || data === null || typeof data !== 'object' || Array.isArray(data)) return data;
  if (itemType === 'l2_page') {
    const { sections, origin, ...rest } = data as Record<string, unknown>;
    void sections;
    void origin;
    return rest;
  }
  if (itemType === 'l2_shared') {
    const { origin, ...rest } = data as Record<string, unknown>;
    void origin;
    return rest;
  }
  return data;
}

const LAYER_RANK: Record<string, number> = {
  l2_contract: 0,
  l2_shared: 1,
  // An organism of a split page comes BEFORE the page that imports its render function
  // (paginaDividida.md §3). Organisms do not depend on each other, so they are free to run in parallel.
  l2_page_organism: 2,
  l2_page: 3,
};

export function layerRank(type: string): number {
  return type in LAYER_RANK ? LAYER_RANK[type] : 99;
}

/**
 * Layer order first, then a topological pass over `dependsOn`.
 *
 * The sort alone is not enough for a SPLIT page (paginaDividida.md): the chain links and the page they
 * close are all `l2_page`, so they tie on rank and fall back to the file name — which puts
 * `projectDetailWorkspace` BEFORE `projectDetailWorkspace_O1_…` and would materialize the page against a
 * superclass that does not exist yet. `dependsOn` is the only thing that knows the real order.
 *
 * Kahn seeded by the sorted order, so anything without dependencies keeps exactly the previous behaviour.
 * A cycle (or a dangling id) never drops an item: whatever is left is appended in sorted order.
 */
export function orderItems(items: PipelineItem[]): PipelineItem[] {
  const sorted = [...items].sort((a, b) => (
    layerRank(a.type) - layerRank(b.type)
    || pageKey(a).localeCompare(pageKey(b))
    || a.id.localeCompare(b.id)
    || a.outputPath.localeCompare(b.outputPath)
  ));

  const present = new Set(sorted.map(item => item.id));
  const emitted = new Set<string>();
  const out: PipelineItem[] = [];
  let pending = sorted;
  while (pending.length) {
    // Only dependencies that are actually in this run gate an item — a dependsOn pointing outside the
    // scanned set (another module, an already-built artifact) must not block it.
    const ready = pending.filter(item => (item.dependsOn ?? []).every(id => !present.has(id) || emitted.has(id)));
    if (!ready.length) { out.push(...pending); break; }
    for (const item of ready) { out.push(item); emitted.add(item.id); }
    pending = pending.filter(item => !emitted.has(item.id));
  }
  return out;
}

function pageKey(item: PipelineItem): string {
  return item.outputPath.replace(/\.ts$/, '').split('/').pop() ?? item.id;
}

export function isStale(defsMs: number | null, tsMs: number | null, dependencyMs: number | null = null): boolean {
  if (tsMs == null) return true;
  if (defsMs != null && defsMs > tsMs) return true;
  if (dependencyMs != null && dependencyMs > tsMs) return true;
  return false;
}

function extractConstObject(src: string, name: string): unknown {
  const marker = `export const ${name}`;
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const eq = src.indexOf('=', at);
  if (eq < 0) return null;
  let open = eq + 1;
  while (open < src.length && /\s/.test(src[open])) open++;
  const openCh = src[open];
  if (openCh === '"' || openCh === "'" || openCh === '`') return extractQuotedString(src, open);

  const closeCh = openCh === '[' ? ']' : openCh === '{' ? '}' : '';
  if (!closeCh) return null;

  let depth = 0;
  let inStr = false;
  let strCh = '';
  let i = open;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = true;
      strCh = c;
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }

  try { return JSON.parse(src.slice(open, i)); } catch { return null; }
}

function extractQuotedString(src: string, start: number): string | null {
  const quote = src[start];
  if (quote === '"') {
    let i = start + 1;
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '"') {
        try { return JSON.parse(src.slice(start, i + 1)) as string; } catch { return null; }
      }
      i++;
    }
    return null;
  }
  let out = '';
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '\\' && i + 1 < src.length) {
      const next = src[i + 1];
      if (next === quote || next === '\\') { out += next; i++; continue; }
      if (quote === '`' && next === '$') { out += '$'; i++; continue; }
      if (next === 'n') { out += '\n'; i++; continue; }
      if (next === 'r') { out += '\r'; i++; continue; }
      if (next === 't') { out += '\t'; i++; continue; }
      out += next;
      i++;
      continue;
    }
    if (c === quote) return out;
    out += c;
  }
  return null;
}

function firstExportName(src: string): string | null {
  const re = /export const\s+([A-Za-z0-9_$]+)\s*=/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // `pipeline` is the materialize plan; `bindings` is the page11 structured sibling. Neither is the
    // artifact the prompt consumes.
    if (m[1] !== 'pipeline' && m[1] !== 'bindings') return m[1];
  }
  return null;
}

export function parseDefs(src: string): ParsedDefs {
  const dataExportName = firstExportName(src);
  const artifact = dataExportName ? extractConstObject(src, dataExportName) as Record<string, unknown> | unknown[] | string | null : null;
  const pipelineArr = extractConstObject(src, 'pipeline');
  const items = Array.isArray(pipelineArr) ? pipelineArr as PipelineItem[] : [];
  const item = items.length ? items[0] : null;
  const bindingsRaw = extractConstObject(src, 'bindings');
  const bindings = Array.isArray(bindingsRaw) ? bindingsRaw : null;
  const data = artifact && typeof artifact === 'object' && !Array.isArray(artifact) && 'data' in artifact
    ? (artifact as { data: unknown }).data
    : artifact;
  return { dataExportName, artifact, data, bindings, item, items };
}

/**
 * What the deterministic page gates read. page21/31: the definition object (has `dataBindings`).
 * page11: the sibling `bindings` export plus `pageId` taken from the page outputPath (the prose
 * definition has neither).
 */
export function pageDefinitionForChecks(parsed: ParsedDefs): unknown {
  if (typeof parsed.data === 'string') {
    return { pageId: pageIdFromParsed(parsed), dataBindings: parsed.bindings ?? [] };
  }
  return parsed.data;
}

/** Command ids the split plan needs — from the definition object or the page11 sibling export. */
export function bindingCommandsOf(data: unknown, siblingBindings?: unknown[] | null): string[] {
  const rows = typeof data === 'string'
    ? (Array.isArray(siblingBindings) ? siblingBindings : [])
    : (isRecord(data) && Array.isArray(data.dataBindings)
      ? data.dataBindings
      : (Array.isArray(siblingBindings) ? siblingBindings : []));
  return rows.filter(isRecord).map(binding => String(binding.command ?? '')).filter(Boolean);
}

function pageIdFromParsed(parsed: ParsedDefs): string {
  const pageItem = parsed.items.find(item => item.type === 'l2_page') ?? parsed.item;
  const name = (pageItem?.outputPath || '').replace(/\.ts$/u, '').split('/').pop() ?? '';
  return name.replace(/_O\d+$/u, '');
}

/**
 * Drop every non-default locale from a shared .ts before it travels as PAGE context.
 *
 * The shared now carries one catalog per declared locale, which is right on disk and pure weight in the
 * prompt: the page only needs the KEY NAMES (to reference them as s_<locale>['<key>']) plus one reading of
 * the text to know what each key means. On projectDetailWorkspace the block is 28KB of a 95KB file, and
 * that growth alone pushed two pages that used to generate fine past the 200s LLM timeout.
 *
 * Pure and conservative: no i18n block, or a single locale, returns the source untouched.
 */
export function trimSharedI18nForPageContext(source: string): string {
  const start = source.indexOf('/// **collab_i18n_start**');
  const end = source.indexOf('/// **collab_i18n_end**');
  if (start < 0 || end < 0 || end < start) return source;
  const block = source.slice(start, end);
  const consts = [...block.matchAll(/^const\s+message_[A-Za-z0-9_]+\s*(?::\s*[A-Za-z0-9_]+\s*)?=\s*\{[\s\S]*?\n\};$/gmu)];
  if (consts.length < 2) return source;
  const dropped = consts.slice(1);
  let trimmed = block;
  for (const extra of dropped) trimmed = trimmed.replace(extra[0], `// (${extra[0].slice(6, extra[0].indexOf(' ', 6))} omitted from this context: same keys, translated)`);
  return source.slice(0, start) + trimmed + source.slice(end);
}

/**
 * The output cap was hit — the model was cut mid-file, so the artifact is truncated or missing.
 *
 * collab-llm reports it as the literal marker in the error/trace text (`MAX_TOKENS_REACHED) llmTime: …`,
 * ref., not as a `finish_reason` field.
 *
 * This must be TERMINAL, never repaired: the repair sends the same prompt and hits the same ceiling, so a
 * retry burns time and budget to fail identically. The answer is to SPLIT the page
 *, which is a change to the plan, not to the attempt.
 */
export function isMaxTokensFailure(detail: string): boolean {
  return /MAX_TOKENS_REACHED|max_tokens_reached/u.test(detail || '');
}

/**
 * The call ran out of time. Unlike the output cap this is AMBIGUOUS — it can be the network, the provider
 * queueing, or a genuinely oversized page — so it earns exactly one retry before being believed.
 */
export function isTimeoutFailure(detail: string): boolean {
  return /timed out|ETIMEDOUT|ECONNRESET/iu.test(detail || '');
}

/**
 * Failures that a SPLIT fixes and a retry does not: the page asks for more than one call can produce.
 *
 * The cap says so outright; a timeout says so only after retrying, which is why the caller must have
 * spent its retry before consulting this. Both end in the same place — project the l4 sections into a
 * split plan (paginaDividida.md §4.1) — because both mean "this page does not fit in one call".
 */
export function isSplitWorthyFailure(detail: string): boolean {
  return isMaxTokensFailure(detail) || isTimeoutFailure(detail);
}

/**
 * `@chartclick=${…}` and friends: a listener that never fires.
 *
 * ECharts events are emitted on the INSTANCE (`chart.on('click', …)`), never on the DOM node, so a Lit
 * `@chartclick` binding attaches to an event nothing dispatches. It compiles — any `@name` is a valid Lit
 * binding — and it silently breaks the whole point of a chart-led page, where selecting on the chart IS
 * the filter. Observed on the first generated page that used the directive.
 *
 * The handlers belong in the directive: `chart(option, { click: … })`.
 */
export function collectChartEventIssues(pageCode: string): string[] {
  if (!pageCode.includes('chartRuntime')) return [];
  const issues = new Set<string>();
  for (const match of pageCode.matchAll(/@(chart[a-z]*|legendselectchanged|datazoom|brushselected)\s*=/gu)) {
    issues.add(`'@${match[1]}=' is not a DOM event: ECharts emits on the instance, so this listener never fires. Pass it to the directive instead — chart(option, { ${match[1].replace(/^chart/u, '') || 'click'}: handler })`);
  }
  return [...issues];
}

export const GEN_TOOL_NAME = 'submitGeneratedTs';

export const GEN_TOOL = {
  type: 'function',
  function: {
    name: GEN_TOOL_NAME,
    description: 'Submit the complete generated TypeScript file content.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['code'],
      properties: {
        code: { type: 'string', description: 'Complete TypeScript file content. Must start with the MLS header.' },
      },
    },
  },
} as const;

export const DEFAULT_MODEL_TYPE = 'code';
export const MATERIALIZE_REPAIR_ATTEMPTS = 1;

export function parseModelType(systemPrompt: string): string | null {
  const m = systemPrompt.match(/<!--\s*modelType:\s*([A-Za-z0-9_-]+)\s*-->/);
  return m ? m[1] : null;
}

export function buildSystemPrompt(skillSections: string[], outputPath: string, modelType: string): string {
  const skills = skillSections.length ? skillSections.join('\n\n---\n\n') : '<!-- no skill loaded -->';
  const header = mlsHeaderForOutputPath(outputPath);
  return `<!-- modelType: ${modelType} -->
<!-- x-tool-strict: true -->

You generate one L2 frontend TypeScript file from a .defs.ts definition and context files.

Target file: ${outputPath}

The file must start with:
${header}

Follow the skill instructions exactly.
Use context files as source of truth for types, imports, states, actions, handlers and message keys.
The generated file is checked with TypeScript strict null checks and no implicit any.
Annotate callback parameters, avoid nullable assignments without guards, and do not rely on implicit any.
Return ONLY the file through the ${GEN_TOOL_NAME} tool.

---

${skills}`;
}

/**
 * @param skeleton when present (page items), the mechanically-built file the model completes instead of
 *        writing from scratch — see cfePageSkeleton. The imports, the i18n block for every locale and the
 *        language-cached `msg` getter come pre-written, so the model stops re-deriving them (and stops
 *        getting them wrong: relative imports, prefixed DTO names, `nothing` without its import).
 *        Omitted on a repair round: there the file on disk already IS the skeleton, filled in.
 */
export function buildHumanPrompt(data: unknown, contextSections: string[], outputPath: string, repairHint?: string, skeleton?: string): string {
  const lines = typeof data === 'string'
    ? ['## Definition', '', data, '']
    : ['## Definition', '', '```json', JSON.stringify(data, null, 2), '```', ''];
  if (contextSections.length) {
    lines.push('## Context files (dependsFiles)', '');
    for (const c of contextSections) lines.push(c, '');
  }
  if (skeleton) {
    lines.push(
      '## Skeleton — complete this file', '',
      'Return THIS file with every `/* to implement */` replaced by your code, and everything else',
      'unchanged: the header, the imports, the i18n block structure, the class and tag names, and the',
      '`msg` getter. Do not rewrite them and do not add a second i18n block.', '',
      'The i18n markers are yours too: YOU decide which keys exist. Reference the shared text you need',
      '(never inline it) and add the copy you invent, with short keys — in EVERY locale below.', '',
      '```typescript', skeleton, '```', '',
    );
  }
  lines.push('## Output', '', `Generate ONLY the TypeScript for: ${outputPath}`, `Call ${GEN_TOOL_NAME} with the complete code.`);
  if (repairHint) lines.push('', repairHint);
  return lines.join('\n');
}

export function buildMissingCodeRepairHint(outputPath: string, detail: string): string {
  return [
    '## Repair',
    `The previous attempt did not produce a complete tool response for ${outputPath}.`,
    detail ? `Reason: ${detail}` : '',
    `Return ONLY the ${GEN_TOOL_NAME} tool call with the COMPLETE TypeScript file.`,
    'Do not write analysis, markdown or partial code before calling the tool.',
  ].filter(Boolean).join('\n');
}

/**
 * @param currentCode the file ON DISK that must be corrected. Without it a "repair" was a first-pass
 *        generation with an error list attached: the model had never seen the file it was told to fix, so
 *        it rewrote the page from scratch every round. run01/102047 is the whole demonstration — one page
 *        went from 1 UX finding (round 1) to 36 syntax errors (round 3) and back to 2 findings (round 4);
 *        another lost the i18n markers it had; the shared lost a handler its own typecheck test asserts.
 *        Findings churned instead of converging, and `repairedCount` closed the run at 0.
 */
export function buildCompileRepairHint(outputPath: string, errors: string[], currentCode?: string): string {
  const current = currentCode && currentCode.trim()
    ? ['', `Current content of ${outputPath} — START FROM THIS FILE:`, '```typescript', currentCode, '```']
    : [];
  return [
    '## Repair',
    `The previous generated file for ${outputPath} failed TypeScript checking.`,
    '',
    'Findings to fix:',
    '```text',
    errors.slice(0, 20).join('\n'),
    '```',
    ...current,
    '',
    `Return the COMPLETE corrected TypeScript file through the ${GEN_TOOL_NAME} tool.`,
    current.length
      ? 'Change ONLY what these findings require. Everything else — the header, the imports, the i18n block and its markers, the class and tag names, and every handler already declared — must come back BYTE FOR BYTE. Do not rewrite the file from scratch.'
      : 'Fix exactly these syntax/type errors while preserving the .defs.ts contract and the existing context.',
  ].join('\n');
}

/**
 * A page interpolating a field the contract does not declare.
 *
 * `${project.clientName}` shipped in a real page whose list output has `name` and no `clientName`; it was
 * fixed by hand in the module. The compiler does catch it — but only where the row is genuinely typed,
 * and only after the whole module is loaded, which is why it once reached production. This is the second
 * line, and it answers in the verify, naming page, field and contract.
 *
 * DELIBERATELY CONSERVATIVE, because a false positive here blocks a correct page: it follows only the
 * deterministic skeleton chain — `const rows = this.<bff>Data ?? []` then `rows.map((row) => …)` — checks
 * only DIRECT property reads on that row (`row.a.b` is skipped: the shape of `a` is not this function's
 * business), and stays silent for any bffCall whose defs declares no output fields.
 */
export function collectContractFieldIssues(pageCode: string, contractSource: string): string[] {
  if (!pageCode || !contractSource) return [];
  const fieldsByBff = contractOutputFields(contractSource);
  if (!fieldsByBff.size) return [];

  // `const projects = this.qryListProjectData ?? []` -> projects belongs to qryListProject. A name bound
  // to more than one query (pages reuse `const rows = …` across sibling render helpers) is ambiguous and
  // dropped: guessing which contract it meant reported a finding for every field of the other list.
  const arrayBindings = new Map<string, Set<string>>();
  for (const match of pageCode.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*this\.([A-Za-z_$][\w$]*)Data\b/gu)) {
    if (!fieldsByBff.has(match[2])) continue;
    const bound = arrayBindings.get(match[1]) ?? new Set<string>();
    bound.add(match[2]);
    arrayBindings.set(match[1], bound);
  }

  const issues: string[] = [];
  const seen = new Set<string>();
  // SCOPED to the callback of each `<array>.map((row) => … )`: the row name only means this contract
  // INSIDE that block. Concatenating the whole file instead attributed a row of one grid to the query of
  // another, because pages reuse `item`/`row` in every helper.
  for (const [arrayName, bffs] of arrayBindings) {
    if (bffs.size !== 1) continue;
    const bff = [...bffs][0];
    const declared = fieldsByBff.get(bff)!;
    const mapRe = new RegExp(`\\b${escapeForRegExp(arrayName)}\\s*\\.\\s*map\\s*\\(\\s*(?:async\\s*)?\\(?\\s*([A-Za-z_$][\\w$]*)`, 'gu');
    for (const match of pageCode.matchAll(mapRe)) {
      const rowName = match[1];
      // From the `(` of `map(`, not from the end of the match: the arrow params may themselves be
      // parenthesized (`map((row) =>`), and starting after them closed the block on their own `)` — the
      // callback then looked 27 characters long and the check silently saw nothing.
      const mapParen = pageCode.indexOf('(', pageCode.indexOf('map', match.index));
      const body = mapParen < 0 ? '' : balancedCallbackBody(pageCode, mapParen + 1);
      if (!body) continue;
      // Only what the template interpolates: outside `${…}` the same text is data (an i18n key like
      // `'project.title'` reads exactly like a property access).
      const interpolations = [...body.matchAll(/\$\{([^}]*)\}/gu)]
        // A quoted string inside the interpolation is DATA, not a property read: `${msg['project.start']}`
        // is an i18n key that reads exactly like `project.start`. Blank the literals, keep the code.
        .map(m => m[1].replace(/'[^']*'/gu, "''").replace(/"[^"]*"/gu, '""'))
        .join('\n');
      if (!interpolations) continue;
      // Direct property only: `(?![\w$]*\s*[.(])` drops `row.a.b` and `row.f()`.
      const accessRe = new RegExp(`\\b${escapeForRegExp(rowName)}\\.([A-Za-z_$][\\w$]*)\\b(?!\\s*[.(])`, 'gu');
      for (const access of interpolations.matchAll(accessRe)) {
        const field = access[1];
        if (declared.has(field) || ROW_BUILTINS.has(field)) continue;
        const key = `${bff}.${rowName}.${field}`;
        if (seen.has(key)) continue;
        seen.add(key);
        issues.push(`contract field missing -> \`${rowName}.${field}\` is not declared by ${bff}: its output is ${[...declared].sort().join(', ')}. Render a declared field, or the l4 has to add it to that query`);
      }
    }
  }
  issues.push(...collectSelectedRecordFieldIssues(pageCode, fieldsByBff, arrayBindings, seen));
  issues.push(...collectTypedOutputParamFieldIssues(pageCode, fieldsByBff, seen));
  issues.push(...collectOriginBoundFieldIssues(pageCode, fieldsByBff, arrayBindings, seen));
  return issues;
}

/**
 * Close the field check by ORIGIN of the data, not by the syntactic form of the read.
 *
 * `selected.<campo>` (find/[0]/at) and `(row: QryXOutput) =>` were two forms. The third that
 * escaped — run fe4, page21/recordInStoreServiceAttendance.ts:55–74 — is a parameter whose type is
 * INFERRED from the list: `(row: (typeof rows)[number]) => row.serviceExecutionId`. Chasing forms
 * is a losing race. Any identifier whose value derives from `this.<bffId>Data` (direct assignment,
 * find/at/[0], map/forEach/filter callback, or `(typeof <list>)[number]`) may only read fields
 * that bff declares.
 */
function collectOriginBoundFieldIssues(
  pageCode: string,
  fieldsByBff: Map<string, Set<string>>,
  arrayBindings: Map<string, Set<string>>,
  seen: Set<string>,
): string[] {
  const origin = new Map<string, Set<string>>();
  const add = (name: string, bffs: Iterable<string>): void => {
    const bound = origin.get(name) ?? new Set<string>();
    for (const bff of bffs) bound.add(bff);
    origin.set(name, bound);
  };
  for (const [name, bffs] of arrayBindings) add(name, bffs);

  let grew = true;
  while (grew) {
    grew = false;
    const pickRe = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*(?:\.\s*find\s*\(|\.\s*at\s*\(\s*0\s*\)|\[\s*0\s*\])/gu;
    for (const match of pageCode.matchAll(pickRe)) {
      const source = origin.get(match[2]);
      if (!source) continue;
      const before = origin.get(match[1])?.size ?? 0;
      add(match[1], source);
      if ((origin.get(match[1])?.size ?? 0) > before) grew = true;
    }
    const callbackRe = /\b([A-Za-z_$][\w$]*)\s*\.\s*(?:map|forEach|filter|find)\s*\(\s*(?:async\s*)?\(?\s*([A-Za-z_$][\w$]*)/gu;
    for (const match of pageCode.matchAll(callbackRe)) {
      const source = origin.get(match[1]);
      if (!source) continue;
      const before = origin.get(match[2])?.size ?? 0;
      add(match[2], source);
      if ((origin.get(match[2])?.size ?? 0) > before) grew = true;
    }
    const typeofRe = /\(\s*([A-Za-z_$][\w$]*)\s*:\s*\(\s*typeof\s+([A-Za-z_$][\w$]*)\s*\)\s*\[\s*number\s*\]/gu;
    for (const match of pageCode.matchAll(typeofRe)) {
      const source = origin.get(match[2]);
      if (!source) continue;
      const before = origin.get(match[1])?.size ?? 0;
      add(match[1], source);
      if ((origin.get(match[1])?.size ?? 0) > before) grew = true;
    }
  }

  const issues: string[] = [];
  const commandRemedy = 'A field that only exists in the output of a COMMAND is read from that command\'s state, never from the query record';
  for (const [name, bffs] of origin) {
    if (bffs.size !== 1) continue;
    const bff = [...bffs][0];
    const declared = fieldsByBff.get(bff);
    if (!declared) continue;
    collectDirectFieldAccessIssues(pageCode, name, bff, declared, seen, issues, commandRemedy);
  }
  return issues;
}

/**
 * The SINGLE record picked out of a list — `const selected = rows.find(…)` — read for a field the query
 * does not return.
 *
 * The row check above only follows `<array>.map((row) => …)`, so a page that selects one record escaped
 * it entirely. Run fe2 of the petShop, `page21/recordInStoreServiceAttendance.ts`: `const selected =
 * rows.find(…)` and then `selected.inStorePaymentId`, `selected.serviceStartedAt`, `selected.completedAt`,
 * `selected.pickedUpAt` — 7× TS2339. The fields are REAL, just not here: they are outputs of the
 * `registerPetArrival`/`registerServiceStart` COMMANDS, while
 * `qryLocateConfirmedServiceAppointment.outputShape` carries only the appointment's own fields. A field
 * that exists only in a command's output is read from that command's state, never from the query row.
 *
 * Same scoping discipline as the row check: a name bound to more than one query is ambiguous and dropped,
 * and only template interpolations count (outside `${…}` the same text can be an i18n key).
 */
function collectSelectedRecordFieldIssues(
  pageCode: string,
  fieldsByBff: Map<string, Set<string>>,
  arrayBindings: Map<string, Set<string>>,
  seen: Set<string>,
): string[] {
  const issues: string[] = [];
  const singles = new Map<string, Set<string>>();
  // `const selected = rows.find(…)`, `rows[0]`, `rows.at(0)` — the three ways a page picks one record out
  // of a list it already bound to a query.
  const pickRe = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*(?:\.\s*find\s*\(|\.\s*at\s*\(\s*0\s*\)|\[\s*0\s*\])/gu;
  for (const match of pageCode.matchAll(pickRe)) {
    const bffs = arrayBindings.get(match[2]);
    if (!bffs || bffs.size !== 1) continue;
    const bound = singles.get(match[1]) ?? new Set<string>();
    bound.add([...bffs][0]);
    singles.set(match[1], bound);
  }
  const commandRemedy = 'A field that only exists in the output of a COMMAND is read from that command\'s state, never from the query record';
  for (const [name, bffs] of singles) {
    if (bffs.size !== 1) continue;
    const bff = [...bffs][0];
    const declared = fieldsByBff.get(bff);
    if (!declared) continue;
    collectDirectFieldAccessIssues(pageCode, name, bff, declared, seen, issues, commandRemedy);
  }
  return issues;
}

/**
 * Run fe3, `page21/recordInStoreServiceAttendance.ts`: the invented field is NOT in a template.
 * `choose = (row: QryLocateConfirmedServiceAppointmentOutput) => { this.setX(row.serviceExecutionId) }`
 * — a parameter typed as the query Output, read as a function argument. The interpolation-only check
 * never saw it, and the repair loop regenerated the page 4× with the same invent.
 */
function collectTypedOutputParamFieldIssues(
  pageCode: string,
  fieldsByBff: Map<string, Set<string>>,
  seen: Set<string>,
): string[] {
  const issues: string[] = [];
  const paramRe = /\(\s*([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)Output\s*\)/gu;
  const commandRemedy = 'A field that only exists in the output of a COMMAND is read from that command\'s state, never from the query record';
  for (const match of pageCode.matchAll(paramRe)) {
    const param = match[1];
    const bff = match[2].charAt(0).toLowerCase() + match[2].slice(1);
    const declared = fieldsByBff.get(bff);
    if (!declared) continue;
    const after = pageCode.slice(match.index! + match[0].length);
    const body = typedParamBody(after);
    if (!body) continue;
    collectDirectFieldAccessIssues(body, param, bff, declared, seen, issues, commandRemedy);
  }
  return issues;
}

function typedParamBody(after: string): string {
  const brace = after.indexOf('{');
  const arrow = after.indexOf('=>');
  if (arrow >= 0 && (brace < 0 || arrow < brace)) {
    const rest = after.slice(arrow + 2);
    const inner = rest.indexOf('{');
    if (inner >= 0 && inner < 40 && !rest.slice(0, inner).includes(';')) {
      return balancedBraceBody(rest, inner + 1);
    }
    const semi = rest.indexOf(';');
    return semi >= 0 ? rest.slice(0, semi) : rest.slice(0, 400);
  }
  if (brace >= 0) return balancedBraceBody(after, brace + 1);
  return '';
}

function collectDirectFieldAccessIssues(
  source: string,
  ident: string,
  bff: string,
  declared: Set<string>,
  seen: Set<string>,
  issues: string[],
  remedy: string,
): void {
  const stripped = source.replace(/'[^']*'/gu, "''").replace(/"[^"]*"/gu, '""');
  const accessRe = new RegExp(`\\b${escapeForRegExp(ident)}\\??\\.([A-Za-z_$][\\w$]*)\\b(?!\\s*[.(])`, 'gu');
  for (const access of stripped.matchAll(accessRe)) {
    const field = access[1];
    if (declared.has(field) || ROW_BUILTINS.has(field)) continue;
    const key = `${bff}.${ident}.${field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push(`contract field missing -> \`${ident}.${field}\` is not declared by ${bff}: its output is ${[...declared].sort().join(', ')}. ${remedy}`);
  }
}

function balancedBraceBody(source: string, from: number): string {
  let depth = 1;
  for (let index = from; index < source.length; index++) {
    const char = source[index];
    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) return source.slice(from, index);
    }
  }
  return source.slice(from);
}

/** From just after `map((row`, the balanced text of the callback — or '' when the parens do not close. */
function balancedCallbackBody(source: string, from: number): string {
  let depth = 1;
  for (let index = from; index < source.length; index++) {
    const char = source[index];
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) return source.slice(from, index);
    }
  }
  return '';
}

/**
 * bffId -> the field names its Output interface declares, read from the CONTRACT `.ts`.
 *
 * The contract is the byte-copy of the l4 wire shape and the very thing the compiler checks against, so it
 * is the one source that cannot disagree with `tsc` (the shared `.defs.ts` carries states and actions, not
 * the output field list). `QryListProjectOutput` -> `qryListProject`.
 */
function contractOutputFields(contractSource: string): Map<string, Set<string>> {
  const byBff = new Map<string, Set<string>>();
  for (const match of contractSource.matchAll(/export\s+interface\s+([A-Za-z_$][\w$]*)Output\s*\{([^}]*)\}/gu)) {
    const bff = match[1].charAt(0).toLowerCase() + match[1].slice(1);
    const names = new Set<string>();
    for (const field of match[2].matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:/gmu)) names.add(field[1]);
    if (names.size) byBff.set(bff, names);
  }
  return byBff;
}

/** Properties every row-ish value has, whatever the contract says. */
const ROW_BUILTINS = new Set(['length', 'constructor', 'toString', 'valueOf', 'hasOwnProperty']);

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Dependency order for a whole-module compile: contracts, then shared, then everything that imports them
 * (pages and organisms).
 *
 * The per-file Studio compile resolves an import ONLY if that dependency's model is already loaded, so
 * the ORDER decides which questions the compile is able to ask at all. A page compiled before its
 * contract resolves the import to `any` and PASSES — which is how a real
 * `TS2339 clientName does not exist on QryListProjectOutput` survived the module gate and was found only
 * by `tsc`.
 */
export function orderModuleCompile(refs: string[]): string[] {
  const tier = (ref: string): number => (/\/web\/contracts\//u.test(ref) ? 0 : /\/web\/shared\//u.test(ref) ? 1 : 2);
  return [...refs].sort((left, right) => tier(left) - tier(right) || left.localeCompare(right));
}

// ---------------------------------------------------------------------------
// Deterministic line breaks for generated code (cf_format_codigo_gerado, 27/ago).
//
// run02/102047: taskCatalogue.ts came back as 13KB in 35 lines (whole render* methods on one
// 3.6K-char line) while its siblings came back formatted — per-call LLM variation, so the model's
// output cannot be the only source of formatting. The TypeScript formatter (Monaco formatDocument
// and the ts languageService alike) only edits EXISTING whitespace — it never splits a jammed line —
// so both runtimes first run this pure pass, then hand indentation to their formatter
// (formatGeneratedTsInStudio / formatGeneratedTsCli).
//
// Whitespace-only BY CONSTRUCTION: it only inserts '\n' between tokens and drops the spaces the
// break replaces — never inside a string, template text, comment or regex, so the AST is identical
// (proven in nodejsFormatTs.test.ts) and the i18n markers stay recognizable by @@addLanguage.
// Conservative: any construct the scanner cannot classify (unterminated literal, unbalanced
// braces) returns the input UNCHANGED — an unformatted file is a degraded result, a broken one is
// a defect.
// ---------------------------------------------------------------------------

/** Brace groups whose single-line span is at most this stay inline (`{ page: 1 }`); longer ones break. */
const LINE_BREAK_MAX_INLINE_SPAN = 100;

interface LineBreakFrame {
  kind: 'block' | 'literal' | 'sub';
  open: number;
  paren: number;
  bracket: number;
  /** Candidate member separators (after `,`/`;`), committed only when the frame qualifies. */
  separators: number[];
}

const REGEX_CONTEXT_WORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const NO_BREAK_AFTER_BLOCK_WORDS = new Set(['else', 'catch', 'finally', 'while', 'instanceof', 'in', 'of', 'as', 'satisfies']);

export function insertGeneratedTsLineBreaks(source: string): string {
  const n = source.length;
  const committed: number[] = [];
  const commit = (pos: number) => { committed.push(pos); };
  const committedInside = (open: number, close: number) => committed.some(pos => pos > open && pos < close);

  const root: LineBreakFrame = { kind: 'block', open: -1, paren: 0, bracket: 0, separators: [] };
  const frames: LineBreakFrame[] = [root];
  const mode: Array<'code' | 'template'> = ['code'];
  let lastSig = '';
  let lastWord = '';
  let i = 0;

  const closeBraceFrame = (frame: LineBreakFrame, closeIdx: number): boolean => {
    if (frame.paren !== 0 || frame.bracket !== 0) return false;
    const empty = source.slice(frame.open + 1, closeIdx).trim() === '';
    const qualifies = !empty && (closeIdx - frame.open > LINE_BREAK_MAX_INLINE_SPAN || committedInside(frame.open, closeIdx));
    if (!qualifies) return true;
    commit(frame.open + 1);
    commit(closeIdx);
    for (const pos of frame.separators) commit(pos);
    if (frame.kind === 'block') {
      // A new member/statement jammed right after the `}` gets its own line — but never split
      // `} else {`, `}.then(`, `})`, `};` and friends, where the `}` does not end the construct.
      let after = closeIdx + 1;
      while (after < n && (source[after] === ' ' || source[after] === '\t')) after++;
      if (after < n && /[A-Za-z_$@]/u.test(source[after])) {
        let end = after;
        while (end < n && /[A-Za-z0-9_$]/u.test(source[end])) end++;
        if (!NO_BREAK_AFTER_BLOCK_WORDS.has(source.slice(after, end))) commit(closeIdx + 1);
      }
    }
    return true;
  };

  while (i < n) {
    if (mode[mode.length - 1] === 'template') {
      const ch = source[i];
      if (ch === '\\') { i += 2; continue; }
      if (ch === '`') { mode.pop(); lastSig = '`'; lastWord = ''; i++; continue; }
      if (ch === '$' && source[i + 1] === '{') {
        mode.push('code');
        frames.push({ kind: 'sub', open: i + 1, paren: 0, bracket: 0, separators: [] });
        lastSig = '{'; lastWord = '';
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    const ch = source[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }

    if (/[A-Za-z0-9_$]/u.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/u.test(source[j])) j++;
      lastWord = source.slice(i, j);
      lastSig = source[j - 1];
      i = j;
      continue;
    }

    if (ch === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) return source;
      i = end + 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && source[j] !== ch) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === '\n') return source;
        j++;
      }
      if (j >= n) return source;
      lastSig = ch; lastWord = '';
      i = j + 1;
      continue;
    }

    if (ch === '`') { mode.push('template'); lastSig = ''; lastWord = ''; i++; continue; }

    if (ch === '/') {
      const valueBefore = /[A-Za-z0-9_$)\]"'`]/u.test(lastSig) && !REGEX_CONTEXT_WORDS.has(lastWord);
      if (!valueBefore) {
        let j = i + 1;
        let inClass = false;
        while (j < n) {
          const c = source[j];
          if (c === '\\') { j += 2; continue; }
          if (c === '\n') return source;
          if (inClass) { if (c === ']') inClass = false; }
          else if (c === '[') inClass = true;
          else if (c === '/') break;
          j++;
        }
        if (j >= n) return source;
        j++;
        while (j < n && /[a-z]/iu.test(source[j])) j++;
        lastSig = '"'; lastWord = '';
        i = j;
        continue;
      }
      lastSig = '/'; lastWord = '';
      i++;
      continue;
    }

    const frame = frames[frames.length - 1];
    if (ch === '(') frame.paren++;
    else if (ch === ')') { frame.paren--; if (frame.paren < 0) return source; }
    else if (ch === '[') frame.bracket++;
    else if (ch === ']') { frame.bracket--; if (frame.bracket < 0) return source; }
    else if (ch === '{') {
      const literal = ['=', '(', '[', ',', ':', '?', '&', '|'].includes(lastSig) || lastWord === 'return';
      frames.push({ kind: literal ? 'literal' : 'block', open: i, paren: 0, bracket: 0, separators: [] });
    } else if (ch === '}') {
      const closed = frames.pop();
      if (!closed || closed === root) return source;
      if (closed.kind === 'sub') {
        if (closed.paren !== 0 || closed.bracket !== 0) return source;
        mode.pop();
        if (mode[mode.length - 1] !== 'template') return source;
        i++;
        continue;
      }
      if (!closeBraceFrame(closed, i)) return source;
    } else if (ch === ';') {
      if (frame.paren === 0 && frame.bracket === 0) {
        if (frame.kind === 'block') commit(i + 1);
        else if (frame.kind === 'literal') frame.separators.push(i + 1);
      }
    } else if (ch === ',') {
      if (frame.kind === 'literal' && frame.paren === 0 && frame.bracket === 0) frame.separators.push(i + 1);
    }

    lastSig = ch; lastWord = '';
    i++;
  }

  if (frames.length !== 1 || mode.length !== 1) return source;

  const positions = [...new Set(committed)].sort((left, right) => left - right);
  const merged = positions.filter((pos, index) => {
    const next = positions[index + 1];
    return next === undefined || source.slice(pos, next).trim() !== '';
  });
  const finalPositions = merged.filter(pos => {
    let back = pos - 1;
    while (back >= 0 && (source[back] === ' ' || source[back] === '\t')) back--;
    if (back < 0 || source[back] === '\n') return false;
    let ahead = pos;
    while (ahead < n && (source[ahead] === ' ' || source[ahead] === '\t')) ahead++;
    return ahead < n && source[ahead] !== '\n';
  });
  if (!finalPositions.length) return source;

  let out = '';
  let prev = 0;
  for (const pos of finalPositions) {
    out += source.slice(prev, pos).replace(/[ \t]+$/u, '');
    out += '\n';
    prev = pos;
    while (prev < n && (source[prev] === ' ' || source[prev] === '\t')) prev++;
  }
  out += source.slice(prev);

  // Whitespace-only by construction; this seals it against any scanner bug — on ANY doubt, unformatted.
  return stripAllWhitespace(out) === stripAllWhitespace(source) ? out : source;
}

/** Whitespace-blind view of a source, the byte-safety guard both formatters compare against. */
export function stripAllWhitespace(text: string): string {
  return text.replace(/\s+/gu, '');
}

export function applyHeader(outputPath: string, code: string): string {
  const header = mlsHeaderForOutputPath(outputPath);
  const trimmed = code.trimStart();
  const existingHeader = /^\/\/\/\s*<mls\b[^>]*\/>\s*/;
  if (existingHeader.test(trimmed)) return trimmed.replace(existingHeader, `${header}\n\n`);
  return `${header}\n\n${trimmed}`;
}

/**
 * Repair deterministic seams that are part of the generated-file contract, not presentation.
 * The model still owns the implementation; it cannot choose a different shared import extension
 * or base class name because both are already fixed by the page/shared definitions.
 */
export function normalizeGeneratedCode(item: PipelineItem, data: unknown, code: string): string {
  if (item.type === 'l2_shared') {
    if (!isRecord(data)) return code;
    const baseClassName = typeof data.baseClassName === 'string' ? data.baseClassName : '';
    if (!baseClassName) return code;
    return code.replace(/export\s+class\s+[A-Za-z_$][A-Za-z0-9_$]*\s+extends\s+CollabLitElement\b/, `export class ${baseClassName} extends CollabLitElement`);
  }
  if (item.type !== 'l2_page') return code;

  // page11 definition is prose — still fix the shared import extension; the class name comes from
  // the skeleton / shared defs, so a missing baseClassName here is not a skip of the .js rewrite.
  const baseClassName = isRecord(data) && typeof data.baseClassName === 'string' ? data.baseClassName : '';
  return code
    .replace(/(from\s+['"][^'"]+\/web\/shared\/[^'"]+)\.ts(['"])/g, '$1.js$2')
    .replace(/(import\s*\{\s*)[A-Za-z_$][A-Za-z0-9_$]*(\s*\}\s*from\s*['"][^'"]+\/web\/shared\/[^'"]+\.js['"])/g, (_match, start, end) => baseClassName ? `${start}${baseClassName}${end}` : _match);
}

export function testPathForOutputPath(outputPath: string): string {
  return outputPath.replace(/\.ts$/, '.test.ts');
}

export function buildMaterializeTypecheckTest(item: PipelineItem, data: unknown): string | null {
  if (item.type === 'l2_contract') return buildContractTypecheckTest(item.outputPath, data);
  if (item.type === 'l2_shared') return buildSharedTypecheckTest(item.outputPath, data);
  return null;
}

export function mlsHeaderForOutputPath(outputPath: string): string {
  return `/// <mls fileReference="${outputPath}" enhancement="${headerEnhancementForOutputPath(outputPath)}"/>`;
}

export function headerEnhancementForOutputPath(outputPath: string): string {
  if (/^_\d+_\/l2\/[^/]+\/web\/shared\/[^/]+\.ts$/.test(outputPath)) return '_102020_/l2/enhancementAura';
  if (/^_\d+_\/l2\/[^/]+\/web\/(?:desktop|mobile)\/page\d+\/[^/]+\.ts$/.test(outputPath)) return '_102020_/l2/enhancementAura';
  return '_blank';
}

function buildContractTypecheckTest(outputPath: string, data: unknown): string | null {
  if (!Array.isArray(data)) return null;

  const moduleName = moduleNameFromOutputPath(outputPath);
  if (!moduleName) return null;
  const imports = new Set<string>();
  const declarations: string[] = [];
  const assertions: string[] = [];

  for (const command of data) {
    if (!isRecord(command) || typeof command.commandName !== 'string') continue;
    const commandName = command.commandName;
    // Contract DTO types are NOT module-prefixed: the contract .ts (genCfeContractTs) exports
    // `{CommandPascal}Input/Output/OutputItem`, and shared/render import those exact names.
    const commandPrefix = toPascalCase(commandName);
    const inputName = `${commandPrefix}Input`;
    const outputName = `${commandPrefix}Output`;
    const outputItemName = `${commandPrefix}OutputItem`;
    const inputFields = Array.isArray(command.input) ? command.input.filter(isRecord) : [];

    imports.add(inputName);
    imports.add(outputName);

    const expectedInputName = `Expected${inputName}`;
    const expectedOutputName = `Expected${outputName}`;
    const expectedOutputItemName = `Expected${outputItemName}`;

    declarations.push(`type ${expectedInputName} = ${objectType(inputFields, 'input')};`);
    assertions.push(`type ${assertName(inputName, commandName)} = Assert<Equal<${inputName}, ${expectedInputName}>>;`);

    // canonicalOutputShape is AUTHORITATIVE when present — the SAME rule the generation skill
    // (genCfeContractTs) gives the LLM, so test and generated .ts share one source of truth.
    // Only kind 'list' declares a {Prefix}{Command}OutputItem export.
    const canonical = canonicalOutputShapeOf(command);
    if (canonical) {
      if (canonical.kind === 'list') {
        imports.add(outputItemName);
        declarations.push(`type ${expectedOutputItemName} = ${objectType(canonical.fields, 'output')};`);
        declarations.push(`type ${expectedOutputName} = ${expectedOutputItemName}[];`);
        assertions.push(`type ${assertName(outputItemName, commandName)} = Assert<Equal<${outputItemName}, ${expectedOutputItemName}>>;`);
        assertions.push(`type ${assertName(outputName, commandName)} = Assert<Equal<${outputName}, ${expectedOutputName}>>;`);
      } else {
        declarations.push(`type ${expectedOutputName} = ${objectType(canonical.fields, 'output')};`);
        assertions.push(`type ${assertName(outputName, commandName)} = Assert<Equal<${outputName}, ${expectedOutputName}>>;`);
      }
      continue;
    }

    // Legacy path (no canonicalOutputShape): outputShape heuristics over command.output.
    const isQuery = command.kind === 'query';
    const outputShape = commandOutputShape(command);
    const outputFields = Array.isArray(command.output) ? command.output.filter(isRecord) : [];
    if (isQuery) imports.add(outputItemName);

    if (isQuery) {
      declarations.push(`type ${expectedOutputItemName} = ${objectType(outputFields, 'output')};`);
      if (outputShape === 'paginated') {
        declarations.push(`type ${expectedOutputName} = { items: ${expectedOutputItemName}[]; total: number; page?: number; pageSize?: number; };`);
      } else if (outputShape === 'object') {
        declarations.push(`type ${expectedOutputName} = ${expectedOutputItemName};`);
      } else {
        declarations.push(`type ${expectedOutputName} = ${expectedOutputItemName}[];`);
      }
      assertions.push(`type ${assertName(outputItemName, commandName)} = Assert<Equal<${outputItemName}, ${expectedOutputItemName}>>;`);
      assertions.push(`type ${assertName(outputName, commandName)} = Assert<Equal<${outputName}, ${expectedOutputName}>>;`);
    } else {
      declarations.push(`type ${expectedOutputName} = ${objectType(outputFields, 'output')};`);
      assertions.push(`type ${assertName(outputName, commandName)} = Assert<Equal<${outputName}, ${expectedOutputName}>>;`);
    }
  }

  if (!imports.size) return null;
  const testPath = testPathForOutputPath(outputPath);
  return [
    mlsHeaderForOutputPath(testPath),
    '',
    `import type { ${[...imports].sort().join(', ')} } from '${aliasJsImport(outputPath)}';`,
    '',
    'type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;',
    'type Assert<T extends true> = T;',
    '',
    '// This file is generated from .defs.ts so tsc catches contract drift in the generated .ts.',
    ...declarations,
    '',
    ...assertions,
    '',
    'export {};',
  ].join('\n');
}

function buildSharedTypecheckTest(outputPath: string, data: unknown): string | null {
  if (!isRecord(data)) return null;
  const moduleName = typeof data.moduleName === 'string' ? data.moduleName : moduleNameFromOutputPath(outputPath);
  const pageId = typeof data.pageId === 'string' ? data.pageId : fileBaseName(outputPath);
  if (!moduleName || !pageId) return null;

  const className = `${toPascalCase(moduleName)}${toPascalCase(pageId)}Base`;
  const stateAssertions: string[] = [];
  const actionAssertions: string[] = [];
  const contractImports = new Map<string, Set<string>>();

  const states = Array.isArray(data.states) ? data.states.filter(isRecord) : [];
  for (const state of states) {
    const propertyName = typeof state.name === 'string' && state.name ? state.name : camelCaseFromKey(String(state.stateKey ?? ''));
    if (!propertyName) continue;
    const expectedType = stateAssertionType(state, sharedStateContractType(outputPath, data, state, contractImports));
    stateAssertions.push(`type ${assertName(`State_${propertyName}`, propertyName)} = Assert<Assignable<typeof page${propertyAccess(propertyName)}, ${expectedType}>>;`);
  }

  const actions = Array.isArray(data.actions) ? data.actions.filter(isRecord) : [];
  for (const action of actions) {
    // Assert only that the action/handler EXISTS and is callable — never its return type.
    // Return types (void / boolean / Promise<void>) are LLM implementation choices, not contract-
    // governed, so pinning them produced false failures (e.g. a handler written as `(): boolean`
    // checked against `void`, or sync/async mismatches). `(...args: any[]) => unknown` accepts any
    // function shape; accessing a missing/renamed method still fails to compile (TS2339), which is
    // the check worth keeping. Property/state types remain fully asserted above (contract-governed).
    if (typeof action.methodName === 'string' && action.methodName) {
      actionAssertions.push(`type ${assertName(`Action_${action.methodName}`, action.methodName)} = Assert<Assignable<typeof page${propertyAccess(action.methodName)}, (...args: any[]) => unknown>>;`);
    }
    if (typeof action.handlerName === 'string' && action.handlerName) {
      actionAssertions.push(`type ${assertName(`Handler_${action.handlerName}`, action.handlerName)} = Assert<Assignable<typeof page${propertyAccess(action.handlerName)}, (...args: any[]) => unknown>>;`);
    }
  }

  if (!stateAssertions.length && !actionAssertions.length) return null;
  const testPath = testPathForOutputPath(outputPath);
  return [
    mlsHeaderForOutputPath(testPath),
    '',
    `import type { ${className} } from '${aliasJsImport(outputPath)}';`,
    ...contractImportLines(contractImports),
    '',
    'type IsAny<T> = 0 extends (1 & T) ? true : false;',
    'type Assignable<Actual, Expected> = IsAny<Actual> extends true ? false : [Actual] extends [Expected] ? true : false;',
    'type Assert<T extends true> = T;',
    '',
    `declare const page: ${className};`,
    '',
    '// This file is generated from .defs.ts. Add narrower state/action assertions here as materialization rules evolve.',
    ...stateAssertions,
    ...actionAssertions,
    '',
    'export {};',
  ].join('\n');
}

function objectType(fields: Record<string, unknown>[], direction: 'input' | 'output'): string {
  if (fields.length === 0) return '{}';
  const lines = ['{'];
  for (const field of fields) {
    const name = typeof field.name === 'string' && field.name ? field.name : null;
    if (!name) continue;
    const optional = direction === 'input' ? field.required !== true : field.required === false;
    lines.push(`  ${propertyKey(name)}${optional ? '?' : ''}: ${fieldType(field, direction)};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function fieldType(field: Record<string, unknown>, direction: 'input' | 'output'): string {
  if (Array.isArray(field.enum) && field.enum.length > 0 && field.enum.every(item => typeof item === 'string')) {
    return field.enum.map(item => JSON.stringify(item)).join(' | ');
  }

  const rawType = String(field.type ?? 'unknown').trim();
  const t = rawType.toLowerCase();
  if (t.endsWith('[]')) return `${primitiveType(t.slice(0, -2))}[]`;
  // The generation skill (genCfeContractTs) types array/object fields from item.fields, so the
  // Expected type must carry the same nested shape — Equal<> is structural, interface names in
  // the generated .ts don't matter. unknown[] here made every array assertion unsatisfiable.
  const itemFields = itemFieldsOf(field);
  if (t === 'array' || t === 'list') return itemFields ? `${objectType(itemFields, direction)}[]` : 'unknown[]';
  if (t === 'object' && itemFields) return objectType(itemFields, direction);
  return primitiveType(t);
}

function itemFieldsOf(field: Record<string, unknown>): Record<string, unknown>[] | null {
  const item = isRecord(field.item) ? field.item : null;
  const fields = item && Array.isArray(item.fields) ? item.fields.filter(isRecord) : null;
  return fields && fields.length ? fields : null;
}

function primitiveType(type: string): string {
  if (['string', 'uuid', 'guid', 'email', 'url', 'uri', 'date', 'datetime', 'date-time', 'time', 'timestamp', 'timestamptz'].includes(type)) return 'string';
  if (['number', 'integer', 'int', 'int32', 'int64', 'float', 'double', 'decimal', 'money', 'currency'].includes(type)) return 'number';
  if (type === 'boolean' || type === 'bool') return 'boolean';
  if (type === 'json' || type === 'object' || type === 'any' || type === 'unknown') return 'unknown';
  return 'unknown';
}

function stateAssertionType(state: Record<string, unknown>, contractType?: string | null): string {
  const types: string[] = [];
  if (Array.isArray(state.valueSet) && state.valueSet.length > 0 && state.valueSet.every(item => typeof item === 'string')) {
    types.push(...state.valueSet.map(item => JSON.stringify(item)));
  } else if (state.collection === true || Array.isArray(state.defaultValue)) {
    types.push('unknown[]');
  } else {
    const value = state.defaultValue;
    if (typeof value === 'number') types.push('number');
    else if (typeof value === 'boolean') types.push('boolean');
    else if (typeof value === 'string') types.push('string');
    else types.push('unknown');
  }
  if (contractType) {
    if (types.length === 1 && types[0] === 'unknown') types[0] = contractType;
    else types.push(contractType);
  }
  // A state initialized with null (the async-loaded contract data pattern: `T | null = null`)
  // is nullable, so the expected type must include null — otherwise Assignable<T | null, T>
  // fails with TS2344 on EVERY contract state (cafeFlow bug_changeFrontend1). 'unknown' already
  // absorbs null, so skip in that case.
  if ((state.defaultValue === null || state.nullable === true) && !types.includes('unknown')) {
    types.push('null');
  }
  // Enum inputs initialize as `Union | '' = ''`. The expected type must include that sentinel
  // (otherwise Assignable<Union | '', Union> is TS2344). A literal `''`, never a widened `string`.
  if (state.defaultValue === '' && !types.includes('string') && !types.includes('unknown')) {
    types.push("''");
  }
  return uniqueTypeUnion(types);
}

function sharedStateContractType(outputPath: string, data: Record<string, unknown>, state: Record<string, unknown>, imports: Map<string, Set<string>>): string | null {
  const ref = isRecord(state.contractRef) ? state.contractRef : null;
  if (!ref || (ref.direction !== 'input' && ref.direction !== 'output')) return null;
  const commandName = typeof ref.commandName === 'string' && ref.commandName ? ref.commandName : null;
  const moduleName = typeof data.moduleName === 'string' && data.moduleName ? data.moduleName : moduleNameFromOutputPath(outputPath);
  const contractPath = sharedContractTsPath(outputPath, data);
  if (!commandName || !moduleName || !contractPath) return null;

  const inputType = `${toPascalCase(commandName)}Input`;
  const outputType = `${toPascalCase(commandName)}Output`;
  const importPath = aliasJsImport(contractPath);
  const names = imports.get(importPath) ?? new Set<string>();
  if (ref.direction === 'output') {
    names.add(outputType);
    imports.set(importPath, names);
    return outputType;
  }

  const field = typeof ref.field === 'string' && ref.field ? ref.field : null;
  if (!field) return null;
  names.add(inputType);
  imports.set(importPath, names);
  return `${inputType}[${JSON.stringify(field)}]`;
}

function canonicalOutputShapeOf(command: Record<string, unknown>): { kind: 'object' | 'list' | 'paginated'; fields: Record<string, unknown>[] } | null {
  const shape = isRecord(command.canonicalOutputShape) ? command.canonicalOutputShape : null;
  if (!shape) return null;
  const kind = shape.kind;
  if (kind !== 'object' && kind !== 'list' && kind !== 'paginated') return null;
  const fields = Array.isArray(shape.fields) ? shape.fields.filter(isRecord) : [];
  if (!fields.length) return null;
  return { kind, fields };
}

function commandOutputShape(command: Record<string, unknown>): 'array' | 'paginated' | 'object' {
  if (command.outputShape === 'paginated') return 'paginated';
  if (command.outputShape === 'object') return 'object';
  return 'array';
}

function sharedContractTsPath(outputPath: string, data: Record<string, unknown>): string | null {
  const ref = isRecord(data.contractRef) ? data.contractRef : null;
  if (ref && typeof ref.tsPath === 'string' && ref.tsPath) return ref.tsPath;
  if (outputPath.includes('/web/shared/')) return outputPath.replace('/web/shared/', '/web/contracts/');
  return null;
}

function contractImportLines(imports: Map<string, Set<string>>): string[] {
  return [...imports.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([importPath, names]) => `import type { ${[...names].sort().join(', ')} } from '${importPath}';`);
}

// Generated TS must import through the project alias (leading-slash `/_<project>_/...`), NEVER a relative
// path: the mls runtime/tsc resolves only the alias form, so a `./x.js` or `../contracts/x.js` import in a
// generated .ts/.test.ts fails to compile. Turns an mls fileReference (`_<project>_/l2/...ts`) into the
// importable alias (`/_<project>_/l2/...js`).
function aliasJsImport(mlsPath: string): string {
  const withJs = mlsPath.replace(/\.ts$/, '.js');
  return withJs.startsWith('/') ? withJs : `/${withJs}`;
}

function uniqueTypeUnion(types: string[]): string {
  if (types.includes('unknown')) return 'unknown';
  return [...new Set(types)].join(' | ') || 'unknown';
}

function moduleNameFromOutputPath(outputPath: string): string | null {
  const match = /^_\d+_\/l2\/([^/]+)\//.exec(outputPath);
  return match ? match[1] : null;
}

function fileBaseName(outputPath: string): string {
  const filename = outputPath.split('/').pop() ?? outputPath;
  return filename.replace(/\.ts$/, '');
}

function toPascalCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function camelCaseFromKey(value: string): string {
  const parts = value.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (!parts.length) return '';
  const [first, ...rest] = parts;
  return first.charAt(0).toLowerCase() + first.slice(1) + rest.map(toPascalCase).join('');
}

function propertyKey(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? value : JSON.stringify(value);
}

function propertyAccess(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? `.${value}` : `[${JSON.stringify(value)}]`;
}

function assertName(rawName: string, fallback: string): string {
  const clean = rawName.replace(/[^A-Za-z0-9_$]+/g, '_').replace(/^([^A-Za-z_$])/, '_$1');
  return `_${clean || toPascalCase(fallback)}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function arrayRecords(value: unknown): Record<string, any>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** Legacy page tag: kebab(folder) with `/` → `--`, then kebab(shortName)-<projectId>.
 * Variants of one page must differ ONLY by `--pageNN--`; the suffix is always the project id. */
export function expectedPageCustomElementTag(outputPath: string): string | null {
  const match = /^_(\d+)_\/l2\/(.+)\/([A-Za-z0-9_]+)\.ts$/u.exec(outputPath);
  if (!match) return null;
  const [, project, folder, shortName] = match;
  const genome = folder.split('/').pop() || '';
  if (!/^page\d+$/u.test(genome)) return null;
  return `${toKebabFolder(folder).replace(/\//gu, '--')}--${toKebabFolder(shortName)}-${project}`;
}

function toKebabFolder(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase();
}

/** The LLM-emitted `@customElement` must match the path, or `mls.sites.setPage` cannot swap variants. */
export function collectPageCustomElementTagIssues(pageCode: string, outputPath: string): string[] {
  const expected = expectedPageCustomElementTag(outputPath);
  if (!expected) return [];
  const match = /@customElement\(\s*['"]([^'"]+)['"]\s*\)/u.exec(pageCode);
  if (!match) return [`@customElement tag missing; expected '${expected}'`];
  if (match[1] === expected) return [];
  return [`@customElement '${match[1]}' must be '${expected}' (project id suffix; variants of a page differ only by --pageNN--)`];
}
