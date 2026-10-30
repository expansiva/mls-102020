/// <mls fileReference="_102020_/l2/aura/agentEditPage/editPageCore.ts" enhancement="_blank"/>

// Pure core of agentEditPage (TASK-102020-agent-edit-page). No mls.* here, so every rule is testable in node.
//
// A generated page (agentMaterializeL2, pages50) is a Lit class whose markup lives in methods; every organism of
// the page11 defs is wrapped by `data-organism-id="<id>"` inside one of them. A pointed change is a PATCH of those
// methods: the model returns the complete methods it changed (and brand-new catalogue keys as data), and this
// module splices them in deterministically after checking what keeps the page working.
//
// The scanner and the splice started from agentManagePage2/patchCore.ts (deleted 09/10/2026, commit a62b110a of
// mls-102020), adapted to the current page: catalogue keys are identifiers (`titulo: '…'`), `private msg` is a
// field assigned on the first line of render(), and the anchor is the organism, not a method name.

import { DEFS_HISTORY_ASPECTS, type DefsHistoryAspect, type DefsHistoryRequest } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';

export const EDIT_PAGE_AGENT_NAME = 'agentEditPage';
export const EDIT_PAGE_GATE_AGENT_NAME = 'agentEditPageGate';
export const EDIT_PAGE_PATCH_AGENT_NAME = 'agentEditPagePatch';
export const EDIT_PAGE_FOLDER = 'aura/agentEditPage';
/** Patch attempts: the first one, then one repair with the diagnostic. */
export const EDIT_PAGE_MAX_ATTEMPTS = 2;

export type EditPageDevice = 'desktop' | 'mobile';

/** What the Studio sends. `operations` present = APPLY (already approved); absent = PLAN. */
export interface EditPageEntry {
  module: string;
  page: string;
  device: EditPageDevice;
  genome: string;
  request: string;
  operations: EditOperation[] | null;
  /** The element selected in the Studio when the person asked (TASK-102020-agent-edit-page-selection); null = none. */
  element: EditElement | null;
}

/**
 * The selected element, as the Studio editor publishes it (`aura.edit.selection`, auraState IAuraEditSelection),
 * reduced to what locates it. The panel only sends a selection of the page and device being edited.
 */
export interface EditElement {
  tag: string;
  /** `data-organism-id` above it; null outside every organism. */
  organism: string | null;
  /** Tags from the organism down to the element (`div>groupviewmetric--ml-metric-big-number#1>value`). */
  organismPath: string;
  /** Its position in the SOURCE (studioClassEdit IDomPathStep[]); null when the editor had none. */
  anchorPath: unknown[] | null;
  /** Its class attribute, as authored. */
  literal: string;
}

/** One approved change: an aspect of one organism (null = the page shell, outside every organism). */
export interface EditOperation {
  id: string;
  organism: string | null;
  aspect: DefsHistoryAspect;
  /** The instruction, in English: what the patch does and what a regeneration redoes. */
  change: string;
  /** The same change in the person's language, for the confirmation panel. */
  summary: string;
  /** "Back to how it was": the patch undoes the earlier change and the history entry is removed. */
  revert: boolean;
}

/** The arguments of the gate and patch steps. */
export interface EditPageStepArgs extends EditPageEntry {
  project: number;
  attempt: number;
  /** Repair round: why the previous answer was refused, and the methods it returned. */
  diagnostic?: string;
  previous?: string;
}

export type Guard<T> = { ok: true; value: T } | { ok: false; reason: string };

const MODULE = /^[a-z][A-Za-z0-9]*$/u;
const PAGE_ID = /^[a-z][A-Za-z0-9_]*$/u;
const GENOME = /^page\d\d$/u;

export const EDIT_PAGE_USAGE = 'Entry (JSON): { "module", "page", "device"?: "desktop"|"mobile", "genome"?: "page11", "request", "operations"?, "element"? }';

/** The Studio entry, validated. A refusal says what is wrong; nothing is guessed. */
export function parseEditPageEntry(raw: string): { kind: 'entry'; entry: EditPageEntry } | { kind: 'refusal'; diagnostic: string } {
  const text = raw.replace(/^\s*@@agentEditPage\s*/u, '').trim();
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { kind: 'refusal', diagnostic: `EDIT_PAGE_ENTRY: not JSON. ${EDIT_PAGE_USAGE}` }; }
  const row = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!row) return { kind: 'refusal', diagnostic: `EDIT_PAGE_ENTRY: not an object. ${EDIT_PAGE_USAGE}` };
  const device = row.device ?? 'desktop';
  const genome = row.genome ?? 'page11';
  if (typeof row.module !== 'string' || !MODULE.test(row.module)) return { kind: 'refusal', diagnostic: `EDIT_PAGE_ENTRY: module. ${EDIT_PAGE_USAGE}` };
  if (typeof row.page !== 'string' || !PAGE_ID.test(row.page)) return { kind: 'refusal', diagnostic: `EDIT_PAGE_ENTRY: page. ${EDIT_PAGE_USAGE}` };
  if (device !== 'desktop' && device !== 'mobile') return { kind: 'refusal', diagnostic: `EDIT_PAGE_ENTRY: device. ${EDIT_PAGE_USAGE}` };
  if (typeof genome !== 'string' || !GENOME.test(genome)) return { kind: 'refusal', diagnostic: `EDIT_PAGE_ENTRY: genome. ${EDIT_PAGE_USAGE}` };
  if (typeof row.request !== 'string' || !row.request.trim()) return { kind: 'refusal', diagnostic: `EDIT_PAGE_ENTRY: request. ${EDIT_PAGE_USAGE}` };
  let operations: EditOperation[] | null = null;
  if (row.operations !== undefined && row.operations !== null) {
    operations = normalizeOperations(row.operations).valid;
    if (!operations.length) return { kind: 'refusal', diagnostic: 'EDIT_PAGE_ENTRY: operations were given but none is valid' };
  }
  let element: EditElement | null = null;
  if (row.element !== undefined && row.element !== null) {
    element = normalizeEditElement(row.element);
    if (!element) return { kind: 'refusal', diagnostic: 'EDIT_PAGE_ENTRY: element is malformed' };
  }
  return { kind: 'entry', entry: { module: row.module, page: row.page, device, genome, request: row.request.trim(), operations, element } };
}

export function parseEditPageStepArgs(raw: string): EditPageStepArgs {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('EDIT_PAGE_ARGS: not JSON'); }
  const args = value as EditPageStepArgs;
  if (!args || !Number.isSafeInteger(args.project) || args.project <= 0 || !MODULE.test(args.module) || !PAGE_ID.test(args.page)
    || (args.device !== 'desktop' && args.device !== 'mobile') || !GENOME.test(args.genome) || typeof args.request !== 'string'
    || !Number.isSafeInteger(args.attempt) || args.attempt < 1 || args.attempt > EDIT_PAGE_MAX_ATTEMPTS) throw new Error('EDIT_PAGE_ARGS: invalid');
  // The element travels between steps as data: shaped again, never trusted.
  return { ...args, element: args.element ? normalizeEditElement(args.element) : null };
}

/** `<module>/web/<device>/<genome>`: the folder of the page `.ts` and its `.defs.ts`. */
export function editPageFolder(entry: Pick<EditPageEntry, 'module' | 'device' | 'genome'>): string {
  return `${entry.module}/web/${entry.device}/${entry.genome}`;
}

// ─── operations ──────────────────────────────────────────────────────────────

/**
 * Keeps only well-formed operations, numbered op1…; with `organisms`, also only those whose organism is on the page
 * (null, the page shell, always is). Never trusts the model to name something that exists.
 */
export function normalizeOperations(raw: unknown, organisms?: ReadonlySet<string>): { valid: EditOperation[]; dropped: string[] } {
  const valid: EditOperation[] = [];
  const dropped: string[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const organism = typeof row.organism === 'string' && row.organism.trim() ? row.organism.trim() : null;
    const aspect = row.aspect as DefsHistoryAspect;
    const change = typeof row.change === 'string' ? row.change.trim() : '';
    const summary = typeof row.summary === 'string' && row.summary.trim() ? row.summary.trim() : change;
    const label = `${organism ?? '(page)'}/${String(row.aspect)}`;
    if (!(DEFS_HISTORY_ASPECTS as readonly unknown[]).includes(aspect)) { dropped.push(`${label}: aspect is not in the vocabulary`); continue; }
    if (!change) { dropped.push(`${label}: no change`); continue; }
    if (organisms && organism !== null && !organisms.has(organism)) { dropped.push(`${label}: organism is not on this page`); continue; }
    if (valid.some(op => op.organism === organism && op.aspect === aspect)) { dropped.push(`${label}: repeated`); continue; }
    valid.push({ id: `op${valid.length + 1}`, organism, aspect, change, summary, revert: row.revert === true });
  }
  return { valid, dropped };
}

/** The history entry an applied operation leaves (a revert leaves none: its key is removed). */
export function operationHistoryEntry(op: EditOperation, request: string, at: string): DefsHistoryRequest {
  return { kind: 'request', organism: op.organism, target: op.aspect, at, change: op.change, request };
}

// ─── TS-aware scanner ────────────────────────────────────────────────────────

type Frame = { kind: 'code'; depth: number } | { kind: 'tpl' };

/** Chars after which a `/` opens a regex literal rather than dividing. */
const REGEX_PREV = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', 'n' /* return */]);
const OPENERS = new Set(['{', '[', '(']);
const CLOSERS = new Set(['}', ']', ')']);

function lastMeaningful(src: string, before: number): string {
  for (let i = before - 1; i >= 0; i--) {
    const c = src[i];
    if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') return c;
  }
  return '';
}

/** Index after the closing quote of the string starting at `from`, or -1 when unterminated. */
function skipQuoted(src: string, from: number, quote: string): number {
  for (let i = from + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') { i++; continue; }
    if (c === quote) return i + 1;
    if (c === '\n') return -1;
  }
  return -1;
}

/** Index after a regex literal starting at `from`, or -1 when it does not end on the line. */
function skipRegex(src: string, from: number): number {
  let inClass = false;
  for (let i = from + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') { i++; continue; }
    if (c === '\n') return -1;
    if (inClass) { if (c === ']') inClass = false; continue; }
    if (c === '[') { inClass = true; continue; }
    if (c === '/') {
      let end = i + 1;
      while (end < src.length && /[a-z]/u.test(src[end])) end++;
      return end;
    }
  }
  return -1;
}

/**
 * From `src[from]` (`{`, `[` or `(`), the index AFTER the matching closer. Aware of quotes, template literals with
 * nested `${}`, comments and regex literals. The three bracket kinds share one depth counter: a parameter list like
 * `(handler: (e: Event) => void)` needs the nesting counted. -1 when unbalanced.
 */
export function scanBalancedTs(src: string, from: number): number {
  if (!OPENERS.has(src[from])) return -1;
  const stack: Frame[] = [{ kind: 'code', depth: 0 }];
  let i = from;
  while (i < src.length) {
    const top = stack[stack.length - 1];
    const c = src[i];
    if (top.kind === 'tpl') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { stack.pop(); i++; continue; }
      if (c === '$' && src[i + 1] === '{') { stack.push({ kind: 'code', depth: 1 }); i += 2; continue; }
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl < 0 ? src.length : nl + 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      if (close < 0) return -1;
      i = close + 2;
      continue;
    }
    if (c === '/' && REGEX_PREV.has(lastMeaningful(src, i))) {
      const end = skipRegex(src, i);
      i = end < 0 ? i + 1 : end;
      continue;
    }
    if (c === '\'' || c === '"') {
      const end = skipQuoted(src, i, c);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    if (c === '`') { stack.push({ kind: 'tpl' }); i++; continue; }
    if (OPENERS.has(c)) { top.depth++; i++; continue; }
    if (CLOSERS.has(c)) {
      top.depth--;
      i++;
      if (top.depth < 0) return -1;
      if (top.depth === 0) {
        if (stack.length === 1) return i;
        stack.pop();
      }
      continue;
    }
    i++;
  }
  return -1;
}

function scanFrom(src: string, from: number, opener: string): number {
  return src[from] === opener ? scanBalancedTs(src, from) : -1;
}

// ─── class body + methods ────────────────────────────────────────────────────

export interface MethodSpan { name: string; start: number; end: number; indent: string; code: string }

/** Index of the `{` that opens the page class body, or -1. */
export function findClassBodyStart(src: string): number {
  const m = /export\s+class\s+[A-Za-z0-9_$]+[^{]*\{/u.exec(src);
  return m ? m.index + m[0].length - 1 : -1;
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

const NOT_A_METHOD = new Set(['if', 'for', 'while', 'switch', 'catch', 'do', 'else', 'return', 'function', 'with']);
const MODIFIERS = /^(?:(?:public|private|protected|static|override|readonly|async|get|set)\s+)*/u;

/** Every method declared directly in the page class body, in source order (accessors included). */
export function listMethods(src: string): MethodSpan[] {
  const bodyStart = findClassBodyStart(src);
  if (bodyStart < 0) return [];
  const bodyEnd = scanFrom(src, bodyStart, '{');
  if (bodyEnd < 0) return [];
  const out: MethodSpan[] = [];
  // The parameter list is scanned, not regex-matched: `(handler: (e: Event) => void)` has nested parens.
  const re = /(^|\n)([ \t]*)((?:(?:public|private|protected|static|override|readonly|async|get|set)\s+)*(?:#)?[A-Za-z_$][A-Za-z0-9_$]*)\s*(?:<[^>\n]*>)?\s*\(/gu;
  re.lastIndex = bodyStart;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const parenStart = m.index + m[0].length - 1;
    if (parenStart >= bodyEnd) break;
    const rawName = m[3].replace(MODIFIERS, '');
    if (NOT_A_METHOD.has(rawName)) continue;
    const parenEnd = scanFrom(src, parenStart, '(');
    if (parenEnd < 0) continue;
    const head = /^\s*(?::\s*[^{;=]+)?\{/u.exec(src.slice(parenEnd));
    if (!head) continue;
    const openBrace = parenEnd + head[0].length - 1;
    if (openBrace >= bodyEnd) break;
    const end = scanFrom(src, openBrace, '{');
    if (end < 0) continue;
    const start = m.index + m[1].length;
    out.push({ name: rawName, start, end, indent: m[2], code: src.slice(start + m[2].length, end) });
    re.lastIndex = end;
  }
  return out;
}

/** Index of the `{` that opens the body of a standalone method text, or -1. */
export function methodBodyBrace(code: string): number {
  const parenStart = code.indexOf('(');
  if (parenStart < 0) return -1;
  const parenEnd = scanFrom(code, parenStart, '(');
  if (parenEnd < 0) return -1;
  const head = /^\s*(?::\s*[^{;=]+)?\{/u.exec(code.slice(parenEnd));
  return head ? parenEnd + head[0].length - 1 : -1;
}

/** The name a method text declares (modifiers dropped), or '' when it is not a method declaration. */
export function declaredMethodName(code: string): string {
  const m = /^\s*((?:(?:public|private|protected|static|override|readonly|async|get|set)\s+)*(?:#)?[A-Za-z_$][A-Za-z0-9_$]*)\s*(?:<[^>\n]*>)?\s*\(/u.exec(code);
  return m ? m[1].replace(MODIFIERS, '') : '';
}

// ─── the page outline (what the gate reads instead of the whole file) ────────

export interface MethodOutline {
  name: string;
  /** `data-organism-id` values written literally in the method. */
  organisms: string[];
  /** Catalogue keys the method reads (`m.key`, `this.msg.key`, `msg['key']`). */
  keys: string[];
  /** Molecule tags the method renders. */
  molecules: string[];
  /** Other methods of the page it calls. */
  calls: string[];
}

const ORGANISM_ATTR = /data-organism-id="([A-Za-z0-9_-]+)"/gu;

function unique(values: Iterable<string>): string[] {
  return [...new Set(values)];
}

/** The `data-organism-id` values written in `code`. */
export function organismAnchors(code: string): string[] {
  return unique([...code.matchAll(ORGANISM_ATTR)].map(m => m[1]));
}

export function pageOutline(src: string): MethodOutline[] {
  const methods = listMethods(src);
  const names = new Set(methods.map(method => method.name));
  return methods.map(method => ({
    name: method.name,
    organisms: organismAnchors(method.code),
    keys: unique([
      ...[...method.code.matchAll(/\b(?:m|msg)\.([A-Za-z_$][A-Za-z0-9_$]*)/gu)].map(m => m[1]),
      ...[...method.code.matchAll(/\bmsg\[\s*'([^']+)'\s*\]/gu)].map(m => m[1]),
    ]),
    molecules: unique([...method.code.matchAll(/<([a-z][a-z0-9]*--[a-z][a-z0-9-]*)/gu)].map(m => m[1])),
    calls: unique([...method.code.matchAll(/\bthis\.([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gu)].map(m => m[1]).filter(name => names.has(name) && name !== method.name)),
  }));
}

/**
 * Methods an operation may touch: those that wrap its organism; for the page shell, render() and the methods that
 * wrap none. An organism of the defs that no method wraps literally (a page generated without the
 * `data-organism-id` wrappers, comandaRestaurante/inicio on 29/10/2026) lives in the shell, so it gets the shell's.
 */
export function methodsForOperation(outline: readonly MethodOutline[], op: Pick<EditOperation, 'organism'>): string[] {
  const shell = () => outline.filter(method => method.name === 'render' || !method.organisms.length).map(method => method.name);
  if (op.organism === null) return shell();
  const wrapping = outline.filter(method => method.organisms.includes(op.organism as string)).map(method => method.name);
  return wrapping.length ? wrapping : shell();
}

// ─── i18n catalogue ──────────────────────────────────────────────────────────

export const I18N_START = '/// **collab_i18n_start**';
export const I18N_END = '/// **collab_i18n_end**';

export interface MessageConst { name: string; locale: string; bodyStart: number; bodyEnd: number }

/** Span of the catalogue between the markers; null when the markers are not exactly one pair. */
export function findI18nBlock(src: string): { start: number; end: number } | null {
  if (src.split(I18N_START).length !== 2 || src.split(I18N_END).length !== 2) return null;
  const start = src.indexOf(I18N_START) + I18N_START.length;
  const end = src.indexOf(I18N_END);
  return end > start ? { start, end } : null;
}

/** The per-locale catalogue consts (`pageMessage_pt_br` → locale `pt-br`) inside the block, in source order. */
export function findMessageConsts(src: string): MessageConst[] {
  const block = findI18nBlock(src);
  if (!block) return [];
  const out: MessageConst[] = [];
  const re = /const\s+([A-Za-z0-9$_]*Message_([a-z0-9_]+))\s*(?::\s*[A-Za-z0-9_$<>[\]]+\s*)?=\s*\{/gu;
  re.lastIndex = block.start;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index >= block.end) break;
    const bodyStart = m.index + m[0].length - 1;
    const bodyEnd = scanFrom(src, bodyStart, '{');
    if (bodyEnd < 0) continue;
    out.push({ name: m[1], locale: m[2].replace(/_/gu, '-'), bodyStart, bodyEnd });
    re.lastIndex = bodyEnd;
  }
  return out;
}

const CATALOGUE_KEY = /(?:^|[{,])\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][A-Za-z0-9_$]*))\s*:/gu;

/** The keys of one catalogue const (quoted or not). */
function constKeys(src: string, konst: MessageConst): string[] {
  const body = src.slice(konst.bodyStart, konst.bodyEnd);
  // Values are single-line string literals: blank them so a ':' inside a text is never read as a key.
  const blanked = body.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/gu, (literal, offset: number) => {
    const after = body.slice(offset + literal.length).trimStart();
    return after.startsWith(':') ? literal : '""';
  });
  return [...blanked.matchAll(CATALOGUE_KEY)].map(m => m[1] ?? m[2] ?? m[3]);
}

/** Keys of the default (first) catalogue const. */
export function catalogueKeys(src: string): string[] {
  const consts = findMessageConsts(src);
  return consts.length ? constKeys(src, consts[0]) : [];
}

/** Locales the page catalogue declares, default first. */
export function catalogueLocales(src: string): string[] {
  return findMessageConsts(src).map(konst => konst.locale);
}

export interface NewMessage { key: string; texts: Array<{ locale: string; text: string }> }

function quoteText(value: string): string {
  return `'${value.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'").replace(/\r?\n/gu, ' ')}'`;
}

/**
 * Adds brand-new keys to EVERY locale const. The first const types the catalogue by inference, so a key missing
 * from one locale does not compile: this is code, never left to the model. A locale without a text takes the
 * default one's, with a warning.
 */
export function applyMessages(src: string, messages: readonly NewMessage[]): Guard<{ code: string; warnings: string[] }> {
  if (!messages.length) return { ok: true, value: { code: src, warnings: [] } };
  const consts = findMessageConsts(src);
  if (!consts.length) return { ok: false, reason: 'the page has no catalogue between the collab_i18n markers, so no new text can be added' };
  const existing = new Set(constKeys(src, consts[0]));
  const quoted = /^\s*['"]/mu.test(src.slice(consts[0].bodyStart + 1, consts[0].bodyEnd - 1));
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const defaultLocale = consts[0].locale;
  const warnings: string[] = [];
  for (const message of messages) {
    if (!/^[a-z][A-Za-z0-9]*$/u.test(message.key)) return { ok: false, reason: `catalogue key '${message.key}' must be an identifier in camelCase (it is read as m.${message.key})` };
    if (existing.has(message.key)) return { ok: false, reason: `catalogue key '${message.key}' already exists: use a new key for a new text` };
    if (!message.texts.some(item => item.text.trim())) return { ok: false, reason: `catalogue key '${message.key}' has no text` };
    existing.add(message.key);
  }
  let out = src;
  // Last const first: a splice shifts every later offset.
  for (let i = consts.length - 1; i >= 0; i--) {
    const konst = consts[i];
    const inner = src.slice(konst.bodyStart + 1, konst.bodyEnd - 1);
    const lastLine = inner.split(/\r?\n/u).filter(line => line.trim()).pop() ?? '';
    const indent = /^[ \t]*/u.exec(lastLine)?.[0] || '  ';
    const lines = messages.map(message => {
      const own = message.texts.find(item => item.locale.toLowerCase().replace(/_/gu, '-') === konst.locale && item.text.trim());
      const fallback = message.texts.find(item => item.locale.toLowerCase().replace(/_/gu, '-') === defaultLocale && item.text.trim()) ?? message.texts.find(item => item.text.trim());
      if (!own) warnings.push(`'${message.key}' has no ${konst.locale} text; the ${defaultLocale} one was used`);
      const key = quoted ? `'${message.key}'` : message.key;
      return `${indent}${key}: ${quoteText((own ?? fallback)!.text)},`;
    });
    const closeBrace = konst.bodyEnd - 1;
    let before = out.slice(0, closeBrace).replace(/[ \t]*$/u, '');
    // The last existing entry may have no trailing comma.
    const trimmed = before.replace(/\s*$/u, '');
    if (trimmed.length && !trimmed.endsWith(',') && !trimmed.endsWith('{')) before = `${trimmed},${before.slice(trimmed.length)}`;
    const glue = /\n$/u.test(before) ? '' : eol;
    out = `${before}${glue}${lines.join(eol)}${eol}${out.slice(closeBrace)}`;
  }
  return { ok: true, value: { code: out, warnings } };
}

// ─── the patch ───────────────────────────────────────────────────────────────

/** What the patch model returns (tool submitPagePatch). */
export interface PagePatch {
  methods: Array<{ name: string; code: string }>;
  messages: NewMessage[];
  notes: string;
}

/** The tool answer, in its declared shape; null when it has no method. */
export function normalizePatch(raw: unknown): PagePatch | null {
  const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
  if (!row) return null;
  const methods = (Array.isArray(row.methods) ? row.methods : [])
    .filter((item): item is { name: string; code: string } => Boolean(item) && typeof (item as { name?: unknown }).name === 'string' && typeof (item as { code?: unknown }).code === 'string')
    .map(item => ({ name: item.name.trim(), code: item.code }));
  if (!methods.length) return null;
  const messages = (Array.isArray(row.messages) ? row.messages : [])
    .filter((item): item is { key: string; texts: unknown[] } => Boolean(item) && typeof (item as { key?: unknown }).key === 'string' && Array.isArray((item as { texts?: unknown }).texts))
    .map(item => ({
      key: item.key.trim(),
      texts: item.texts.filter((text): text is { locale: string; text: string } => Boolean(text) && typeof (text as { locale?: unknown }).locale === 'string' && typeof (text as { text?: unknown }).text === 'string'),
    }));
  return { methods, messages, notes: typeof row.notes === 'string' ? row.notes.trim() : '' };
}

/**
 * Replaces (or appends, for a new helper) whole methods. Each code must declare the method it is named for, so the
 * model cannot rename or merge methods. Patches go one at a time, locating the target again each round.
 */
export function applyMethodPatches(src: string, methods: PagePatch['methods']): Guard<string> {
  const seen = new Set<string>();
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  let out = src;
  for (const patch of methods) {
    const name = patch.name;
    const code = patch.code.trim().replace(/\r?\n/gu, eol);
    if (!name) return { ok: false, reason: 'a method came back without a name' };
    if (seen.has(name)) return { ok: false, reason: `method '${name}' came back twice` };
    seen.add(name);
    if (declaredMethodName(code) !== name) return { ok: false, reason: `the code given for '${name}' does not start with its own declaration` };
    const brace = methodBodyBrace(code);
    if (brace < 0 || scanFrom(code, brace, '{') !== code.length) return { ok: false, reason: `the code given for '${name}' is not one balanced method` };
    const hits = listMethods(out).filter(method => method.name === name);
    if (hits.length > 1) return { ok: false, reason: `method '${name}' is declared ${hits.length} times` };
    if (hits.length === 1) {
      const span = hits[0];
      out = out.slice(0, span.start) + span.indent + code + out.slice(span.end);
      continue;
    }
    const bodyStart = findClassBodyStart(out);
    const bodyEnd = bodyStart < 0 ? -1 : scanFrom(out, bodyStart, '{');
    if (bodyEnd < 0) return { ok: false, reason: 'the page class body was not found' };
    const closeBrace = bodyEnd - 1;
    const indent = listMethods(out)[0]?.indent ?? '  ';
    const before = out.slice(0, closeBrace).replace(/\s*$/u, '');
    out = `${before}${eol}${eol}${indent}${code}${eol}${out.slice(closeBrace)}`;
  }
  return { ok: true, value: out };
}

// ─── guards ──────────────────────────────────────────────────────────────────

interface Fingerprint {
  header: string;
  tag: string;
  classDecl: string;
  imports: string;
  locales: string;
  msgField: string;
  msgAssign: boolean;
  renders: number;
  markers: string;
}

function fingerprint(src: string): Fingerprint {
  const render = listMethods(src).filter(method => method.name === 'render');
  return {
    header: (/^\/\/\/\s*<mls[^\n]*$/mu.exec(src)?.[0] ?? '').trim(),
    tag: /@customElement\(\s*'([^']+)'\s*\)/u.exec(src)?.[1] ?? '',
    classDecl: (/export\s+class\s+[A-Za-z0-9_$]+\s+extends\s+[A-Za-z0-9_$]+/u.exec(src)?.[0] ?? '').replace(/\s+/gu, ' '),
    imports: (src.match(/^import[\s\S]*?from\s+['"][^'"]+['"];?|^import\s+['"][^'"]+['"];?/gmu) ?? []).join('\n').replace(/\s+/gu, ' '),
    locales: catalogueLocales(src).join(','),
    msgField: (/^\s*(?:private|protected|public)?\s*msg\s*:[^\n]*$/mu.exec(src)?.[0] ?? '').trim(),
    msgAssign: render.length === 1 && /this\.msg\s*=\s*pageMessages\[/u.test(render[0].code),
    renders: render.length,
    markers: `${src.split(I18N_START).length - 1}/${src.split(I18N_END).length - 1}`,
  };
}

/** The parts of the file a patch never touches: header, tag, class, imports, catalogue shape, `msg`, render(). */
export function guardInvariants(before: string, after: string): Guard<true> {
  const a = fingerprint(before);
  const b = fingerprint(after);
  if (a.header !== b.header) return { ok: false, reason: 'the mls header line changed' };
  if (a.tag !== b.tag) return { ok: false, reason: 'the @customElement tag changed' };
  if (a.classDecl !== b.classDecl) return { ok: false, reason: 'the class declaration changed' };
  if (a.imports !== b.imports) return { ok: false, reason: 'the imports changed: a change that needs a new import is out of scope' };
  if (a.locales !== b.locales) return { ok: false, reason: 'the catalogue locales changed' };
  if (a.msgField !== b.msgField) return { ok: false, reason: 'the msg field changed' };
  if (b.renders !== 1) return { ok: false, reason: 'render() is missing or declared twice' };
  if (a.msgAssign && !b.msgAssign) return { ok: false, reason: 'render() lost `this.msg = pageMessages[this.getMessageKey(pageMessages)]`' };
  if (a.markers !== b.markers) return { ok: false, reason: 'the collab_i18n markers changed' };
  return { ok: true, value: true };
}

/** Behavior a page method never gains: the page renders and calls the shared, it holds no state and no I/O. */
const BEHAVIOR: Array<{ re: RegExp; what: string }> = [
  { re: /@(?:property|state|query)\s*\(/gu, what: 'declares state (@property/@state)' },
  { re: /\bthis\.(?!msg\b)[A-Za-z_$][A-Za-z0-9_$]*\s*(?:=(?![=>])|\+=|-=|\+\+|--)/gu, what: 'assigns to a member of the class' },
  { re: /\bawait\b/gu, what: 'awaits' },
  { re: /(^|\n)\s*(?:(?:private|protected|public)\s+)?async\s+[A-Za-z_$]/gu, what: 'declares an async method' },
  { re: /\bfetch\s*\(|\bexecBff\s*\(/gu, what: 'calls the network' },
  { re: /\bimport\s*\(/gu, what: 'imports dynamically' },
  { re: /\bset(?:Interval|Timeout)\s*\(/gu, what: 'starts a timer' },
  { re: /\b(?:localStorage|sessionStorage|indexedDB)\b/gu, what: 'touches browser storage' },
];

/** Color written outside the design tokens. */
const COLOR: Array<{ re: RegExp; what: string }> = [
  { re: /#[0-9a-fA-F]{3,8}\b/gu, what: 'a hex color' },
  { re: /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|accent|caret|decoration|shadow|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(?:bg|text|border|ring|fill|stroke)-(?:black|white)\b/gu, what: 'a palette color class' },
  { re: /\bdark:/gu, what: 'a dark: variant' },
];

function count(re: RegExp, text: string): number {
  return [...text.matchAll(re)].length;
}

/** What the patched methods do that the same methods did not do before (old code is never held against the patch). */
function newViolations(before: string, after: string, rules: Array<{ re: RegExp; what: string }>): string[] {
  return rules.filter(rule => count(rule.re, after) > count(rule.re, before)).map(rule => rule.what);
}

/** The DS tokens (`var(--x`) the patch uses that the design system does not declare; empty list = not checked. */
function unknownTokens(before: string, after: string, tokens: readonly string[]): string[] {
  if (!tokens.length) return [];
  const known = new Set([...tokens, ...[...before.matchAll(/var\(\s*--([a-z0-9-]+)/gu)].map(m => m[1])]);
  return unique([...after.matchAll(/var\(\s*--([a-z0-9-]+)/gu)].map(m => m[1]).filter(name => !known.has(name)));
}

export interface PatchContext {
  operations: readonly EditOperation[];
  /** Color token names of the project design system (empty = not checked). */
  tokens: readonly string[];
  /** The selected element: narrows the methods and protects a selected molecule's behavior. */
  focus?: EditFocus | null;
}

/**
 * Splice + every guard. Returns the new file and non-fatal warnings, or why the patch is refused (the reason goes to
 * the repair round as it is). Nothing here writes.
 */
export function applyPagePatch(src: string, patch: PagePatch, ctx: PatchContext): Guard<{ code: string; warnings: string[]; touched: string[] }> {
  const outline = pageOutline(src);
  const existing = new Map(listMethods(src).map(method => [method.name, method.code]));
  const allowed = new Set(ctx.operations.flatMap(op => methodsForOperationFocused(outline, op, ctx.focus ?? null)));
  let authorized = 0;
  for (const method of patch.methods) {
    if (allowed.has(method.name)) { authorized++; continue; }
    if (existing.has(method.name)) {
      return { ok: false, reason: `method '${method.name}' is not part of the approved change; touch only: ${[...allowed].join(', ') || '(none)'} (a new render* helper is fine)` };
    }
  }
  if (!authorized) return { ok: false, reason: `no method of the approved change was returned; expected one of: ${[...allowed].join(', ')}` };

  const before = patch.methods.map(method => existing.get(method.name) ?? '').join('\n');
  const after = patch.methods.map(method => method.code).join('\n');
  const behavior = newViolations(before, after, BEHAVIOR);
  if (behavior.length) return { ok: false, reason: `the patch ${behavior.join(' and ')}: the page only renders and calls what the shared offers` };
  const color = newViolations(before, after, COLOR);
  if (color.length) return { ok: false, reason: `the patch uses ${color.join(' and ')}: color comes only from the design tokens, as bg-[var(--token,transparent)]` };
  const tokens = unknownTokens(before, after, ctx.tokens);
  if (tokens.length) return { ok: false, reason: `the patch uses tokens the design system does not have: ${tokens.map(name => `--${name}`).join(', ')}` };
  if (ctx.focus?.molecule) {
    const kept = guardMoleculeBehavior(before, after, ctx.focus.molecule);
    if (!kept.ok) return kept;
  }

  const warnings: string[] = [];
  let out = src;
  const messages = applyMessages(out, patch.messages);
  if (!messages.ok) return messages;
  out = messages.value.code;
  warnings.push(...messages.value.warnings);
  const spliced = applyMethodPatches(out, patch.methods);
  if (!spliced.ok) return spliced;
  out = spliced.value;

  const invariants = guardInvariants(src, out);
  if (!invariants.ok) return invariants;
  const lost = organismAnchors(src).filter(id => !organismAnchors(out).includes(id));
  if (lost.length) return { ok: false, reason: `the patch removed the anchor of ${lost.map(id => `data-organism-id="${id}"`).join(', ')}: hide an organism with a condition, keep its wrapper` };
  return { ok: true, value: { code: out, warnings, touched: patch.methods.map(method => method.name) } };
}

// ─── the selected element (TASK-102020-agent-edit-page-selection) ────────────

const TAG_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$|^[a-z][a-z0-9]*--[a-z][a-z0-9-]*$/u;
/** A catalog molecule tag (`groupviewmetric--ml-metric-big-number`): the group folder, then the molecule. */
export const MOLECULE_TAG = /^(group[a-z0-9]+)--(ml-[a-z0-9-]+)$/u;

/** The element in its declared shape; null when it is not one (nothing is guessed). */
export function normalizeEditElement(raw: unknown): EditElement | null {
  const row = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
  if (!row || typeof row.tag !== 'string' || !TAG_NAME.test(row.tag.toLowerCase())) return null;
  const organism = typeof row.organism === 'string' && row.organism.trim() ? row.organism.trim() : null;
  const anchorPath = Array.isArray(row.anchorPath) && row.anchorPath.length
    && row.anchorPath.every(step => step && typeof step === 'object' && typeof (step as { tag?: unknown }).tag === 'string' && Number.isInteger((step as { index?: unknown }).index))
    ? row.anchorPath as unknown[] : null;
  return {
    tag: row.tag.toLowerCase(),
    organism,
    organismPath: typeof row.organismPath === 'string' ? row.organismPath : '',
    anchorPath,
    literal: typeof row.literal === 'string' ? row.literal : '',
  };
}

/**
 * The catalog molecule the element is, or sits inside: the element's own tag, else the last molecule tag of its
 * path. `slotCandidate` is the path step right below the molecule (lower case, as the DOM spells it): the slot it
 * may be, to be confirmed against the molecule's skill (`<Value>`, `<Label>`…) by whoever reads the skill.
 */
export function moleculeOfElement(element: EditElement): { tag: string; group: string; name: string; slotCandidate: string | null } | null {
  // `name` is the molecule file: some pages write the tag with the project suffix (`…--ml-select-102040`, 18 of the
  // 68 tags of 102047 on 29/10/2026), and the file has none. `tag` stays as written: it is what the markup holds.
  const fileName = (name: string) => name.replace(/-\d{6}$/u, '');
  const own = MOLECULE_TAG.exec(element.tag);
  if (own) return { tag: element.tag, group: own[1], name: fileName(own[2]), slotCandidate: null };
  const steps = element.organismPath.split('>').map(step => step.replace(/#\d+$/u, '').trim().toLowerCase()).filter(Boolean);
  for (let i = steps.length - 1; i >= 0; i--) {
    const match = MOLECULE_TAG.exec(steps[i]);
    if (match) return { tag: steps[i], group: match[1], name: fileName(match[2]), slotCandidate: steps[i + 1] ?? null };
  }
  return null;
}

/** The slot of the molecule, spelled as its skill spells it (`value` → `Value`), when the skill names it. */
export function slotInDocs(candidate: string | null, docs: string): string | null {
  if (!candidate || !/^[a-z][a-z0-9-]*$/u.test(candidate)) return null;
  const match = new RegExp(`<(${escapeRe(candidate)})[\\s>/]`, 'iu').exec(docs);
  return match ? match[1] : null;
}

/** The class method whose body holds `offset`, or null (module-level code). */
export function methodAtOffset(src: string, offset: number): string | null {
  return listMethods(src).find(method => method.start <= offset && offset < method.end)?.name ?? null;
}

/** Where the patch may act for the selected element: its organism, and the method that holds it (when located). */
export interface EditFocus {
  organism: string | null;
  method: string | null;
  /** The catalog molecule selected (or holding the selection); its bindings must survive the patch. */
  molecule: string | null;
}

/**
 * Methods an operation may touch, narrowed by the selected element: an operation on the element's organism touches
 * only the method that holds the element (plus new helpers, always allowed); any other operation keeps the rule of
 * `methodsForOperation`.
 */
export function methodsForOperationFocused(outline: readonly MethodOutline[], op: Pick<EditOperation, 'organism'>, focus: EditFocus | null): string[] {
  if (focus?.method && op.organism === focus.organism) return [focus.method];
  return methodsForOperation(outline, op);
}

/** Index after the `>` that closes the open tag starting at `from` (`<tag …>`), skipping quotes and `${…}`. */
function openTagEnd(code: string, from: number): number {
  for (let i = from + 1; i < code.length; i++) {
    const c = code[i];
    if (c === '$' && code[i + 1] === '{') {
      const end = scanBalancedTs(code, i + 1);
      if (end < 0) return -1;
      i = end - 1;
      continue;
    }
    if (c === '"' || c === '\'') {
      for (i++; i < code.length && code[i] !== c; i++) {
        if (code[i] === '$' && code[i + 1] === '{') {
          const end = scanBalancedTs(code, i + 1);
          if (end < 0) return -1;
          i = end - 1;
        }
      }
      continue;
    }
    if (c === '>') return i + 1;
  }
  return -1;
}

/**
 * The bindings of every open tag `<tag …>` in `code`, in order: `@event=${…}`, `.property=${…}`, `?attribute=${…}`,
 * each as `name=expression` with the whitespace collapsed. Plain attributes (`class`, `data-class`, `size`,
 * `data-variant`…) are not bindings: they are the molecule's appearance.
 */
export function moleculeBindings(code: string, tag: string): string[][] {
  const out: string[][] = [];
  const opener = new RegExp(`<${escapeRe(tag)}(?=[\\s>/])`, 'gu');
  for (let m = opener.exec(code); m; m = opener.exec(code)) {
    const end = openTagEnd(code, m.index);
    if (end < 0) { out.push(['(unbalanced)']); continue; }
    const head = code.slice(m.index, end);
    const bindings: string[] = [];
    const attr = /\s([@.?][A-Za-z_$][\w$-]*)\s*=\s*\$\{/gu;
    for (let a = attr.exec(head); a; a = attr.exec(head)) {
      const open = a.index + a[0].length - 1;
      const close = scanBalancedTs(head, open);
      bindings.push(`${a[1]}=$${(close < 0 ? head.slice(open) : head.slice(open, close)).replace(/\s+/gu, ' ')}`);
      if (close > 0) attr.lastIndex = close;
    }
    out.push(bindings.sort());
  }
  return out;
}

/**
 * The selected molecule keeps its behavior: in the patched methods, the same number of `<tag>` and, tag by tag, the
 * same event and property bindings. Only class, data-class and plain (configuration) attributes may change.
 */
export function guardMoleculeBehavior(before: string, after: string, tag: string): Guard<true> {
  const a = moleculeBindings(before, tag);
  const b = moleculeBindings(after, tag);
  if (a.length !== b.length) return { ok: false, reason: `the patch adds or removes a <${tag}>: only its appearance may change (hide it with a condition, keep the tag)` };
  for (let i = 0; i < a.length; i++) {
    if (a[i].join('\n') !== b[i].join('\n')) {
      return { ok: false, reason: `the patch changes the behavior of <${tag}> (its event or property bindings): only class, data-class and configuration attributes such as size or data-variant may change` };
    }
  }
  return { ok: true, value: true };
}

// ─── the page defs (read as data) ────────────────────────────────────────────

export interface PageDefinitionDigest {
  intent: string;
  organisms: Array<{ id: string; kind: string; text: string; section: string; purpose: string }>;
}

/** intent + organisms (with the purpose of their section) from the defs text without its history. Null when unreadable. */
export function readPageDefinition(defsBase: string): PageDefinitionDigest | null {
  const match = /export const definition = ([\s\S]+) as const;\s*$/u.exec(defsBase);
  if (!match) return null;
  let definition: Record<string, unknown>;
  try { definition = JSON.parse(match[1]) as Record<string, unknown>; } catch { return null; }
  const sections = Array.isArray(definition.sections) ? definition.sections as Array<Record<string, unknown>> : [];
  const organisms = definition.organisms && typeof definition.organisms === 'object' ? definition.organisms as Record<string, Record<string, unknown>> : {};
  const sectionOf = (id: string) => sections.find(section => Array.isArray(section.organisms) && (section.organisms as unknown[]).includes(id));
  return {
    intent: typeof definition.intent === 'string' ? definition.intent : '',
    organisms: Object.entries(organisms).map(([id, organism]) => {
      const section = sectionOf(id);
      return {
        id,
        kind: typeof organism.kind === 'string' ? organism.kind : '',
        text: typeof organism.text === 'string' ? organism.text : '',
        section: typeof section?.id === 'string' ? section.id : '',
        purpose: typeof section?.purpose === 'string' ? section.purpose : '',
      };
    }),
  };
}

/** Color token names declared in `l2/designSystem.ts` (the `color` block of its first theme; variants dropped). */
export function designSystemColorTokens(source: string): string[] {
  const start = source.indexOf('color: {');
  if (start < 0) return [];
  const block = source.slice(start, source.indexOf('}', start));
  return unique([...block.matchAll(/"([a-z0-9-]+)"\s*:/gu)].map(m => m[1]).filter(name => !name.startsWith('_dark-')));
}
