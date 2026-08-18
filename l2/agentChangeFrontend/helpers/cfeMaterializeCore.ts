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
  artifact: Record<string, unknown> | unknown[] | null;
  data: unknown;
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
 * True when the FIRST compile found EVERY page11 item broken. With 3+ primary pages that is not N
 * independent code bugs — it is an environment/configuration fault (a package or path the compiler
 * cannot resolve), and no amount of code repair can fix it.
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
  return page11.length >= SYSTEMIC_FAILURE_MIN_PAGES && page11.every(item => item.errors.length > 0);
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
  return shared.length >= SYSTEMIC_FAILURE_MIN_PAGES && shared.every(item => item.errors.length > 0);
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
 * names, and must be rendered from it (todo/changeFrontend/ajuste_actors.md).
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
  inputs: { name: string; stateKey: string; source: string; sourceRef: string }[];
}

/** The command bindings of the reduced page defs — the deterministic anchor every check below uses. */
function readPageBindings(pageDefinition: unknown): PageBinding[] {
  if (!isRecord(pageDefinition) || !Array.isArray(pageDefinition.dataBindings)) return [];
  return pageDefinition.dataBindings.filter(isRecord).map(binding => ({
    command: stringValue(binding.command),
    kind: stringValue(binding.kind),
    inputs: (Array.isArray(binding.inputs) ? binding.inputs.filter(isRecord) : []).map(input => ({
      name: stringValue(input.name),
      stateKey: stringValue(input.stateKey),
      source: stringValue(input.source).toLowerCase(),
      // Kept in original case: it names a bffCall, a field path or an actorId, all case-sensitive.
      sourceRef: stringValue(input.sourceRef),
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
 * the gap is fixed where it lives (agentNewSolution E8 — see todo/newSolution4/bug_from_backend.md).
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

/**
 * Every command must render BOTH a success and an error path, in its own region.
 *
 * Supervisor refinement 2: the criterion is "both paths exist and are local", not the literal
 * `action.{cmd}.success/error` key — the reduced defs no longer carries an i18n contract, so demanding
 * the key would enforce a convention that is not there. The key is accepted as the preferred evidence.
 */
export function collectMutationFeedbackIssues(pageDefinition: unknown, sharedDefinition: unknown, pageCode: string): string[] {
  if (!pageCode) return [];
  const issues: string[] = [];
  for (const binding of readPageBindings(pageDefinition)) {
    if (binding.kind === 'query') continue;
    const statusProperty = propertyForStateKey(sharedDefinition, `ui.${stringValue((pageDefinition as Record<string, unknown>)?.pageId)}.action.${binding.command}.state`);
    const mentionsCommand = new RegExp(`\\b(?:${binding.command}|${statusProperty || binding.command})\\b`, 'u').test(pageCode);
    if (!mentionsCommand) continue;                                   // command not rendered at all
    const hasSuccess = new RegExp(`action\\.${binding.command}\\.success|'success'|"success"`, 'u').test(pageCode);
    const hasError = new RegExp(`action\\.${binding.command}\\.error|${binding.command}Error|'error'|"error"`, 'u').test(pageCode);
    if (!hasSuccess || !hasError) {
      issues.push(`${binding.command} renders no ${!hasSuccess && !hasError ? 'success/error' : (!hasSuccess ? 'success' : 'error')} feedback: both paths must be rendered next to the command itself, never as a page-level banner`);
    }
  }
  return issues;
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

/** Persisted compiled .d.ts artifact path for a shared runtime ref (trace/frontend-shared-dts). */
export function sharedDtsArtifactRef(sharedTsRef: string): string | null {
  const match = sharedTsRef.match(/^(.*)\/web\/shared\/([^/]+)\.ts$/u);
  if (!match || sharedTsRef.endsWith('.defs.ts')) return null;
  return `${match[1]}/trace/frontend-shared-dts/${match[2]}.txt`;
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
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return data;
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

function firstExportName(src: string): string | null {
  const re = /export const\s+([A-Za-z0-9_$]+)\s*=/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m[1] !== 'pipeline') return m[1];
  }
  return null;
}

export function parseDefs(src: string): ParsedDefs {
  const dataExportName = firstExportName(src);
  const artifact = dataExportName ? extractConstObject(src, dataExportName) as Record<string, unknown> | unknown[] | null : null;
  const pipelineArr = extractConstObject(src, 'pipeline');
  const items = Array.isArray(pipelineArr) ? pipelineArr as PipelineItem[] : [];
  const item = items.length ? items[0] : null;
  const data = artifact && typeof artifact === 'object' && !Array.isArray(artifact) && 'data' in artifact
    ? (artifact as { data: unknown }).data
    : artifact;
  return { dataExportName, artifact, data, item, items };
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
 * ref. todo/changeFrontend/bugMaxTokens_01.json), not as a `finish_reason` field.
 *
 * This must be TERMINAL, never repaired: the repair sends the same prompt and hits the same ceiling, so a
 * retry burns time and budget to fail identically. The answer is to SPLIT the page
 * (todo/changeFrontend/paginaDividida.md), which is a change to the plan, not to the attempt.
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
  const lines = ['## Definition', '', '```json', JSON.stringify(data, null, 2), '```', ''];
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

export function buildCompileRepairHint(outputPath: string, errors: string[]): string {
  return [
    '## Repair',
    `The previous generated file for ${outputPath} failed TypeScript checking.`,
    '',
    'Compiler errors:',
    '```text',
    errors.slice(0, 20).join('\n'),
    '```',
    '',
    `Return the COMPLETE corrected TypeScript file through the ${GEN_TOOL_NAME} tool.`,
    'Fix exactly these syntax/type errors while preserving the .defs.ts contract and the existing context.',
  ].join('\n');
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
  if (!isRecord(data)) return code;
  if (item.type === 'l2_shared') {
    const baseClassName = typeof data.baseClassName === 'string' ? data.baseClassName : '';
    if (!baseClassName) return code;
    return code.replace(/export\s+class\s+[A-Za-z_$][A-Za-z0-9_$]*\s+extends\s+CollabLitElement\b/, `export class ${baseClassName} extends CollabLitElement`);
  }
  if (item.type !== 'l2_page') return code;

  const baseClassName = typeof data.baseClassName === 'string' ? data.baseClassName : '';
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
