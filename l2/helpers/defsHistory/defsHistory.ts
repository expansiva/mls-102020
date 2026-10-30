/// <mls fileReference="_102020_/l2/helpers/defsHistory/defsHistory.ts" enhancement="_blank"/>

// The edit history of a page defs (web/<device>/page<NN>/<pageId>.defs.ts): what the user changed in the Studio
// (a molecule swap, a class, a text, a molecule property) on the page `.ts` of that same folder, kept so a regeneration can redo it
// (TASK-102020-defs-edit-history, 27/10/2026).
//
// It is a SECOND export, always after `definition`, and pure JSON like it:
//
//   export const definition = { … } as const;
//
//   export const history = [ … ] as const;
//
// The file minus that block is byte for byte what the defs producer rendered, so `splitDefsHistory(...).base` hashes
// the same as a file that never had a history. Absent export = empty history.
//
// One entry per target, last one wins: `from` keeps the ORIGINAL value, so A→B then B→C is one entry A→C, and an
// edit back to the original removes the entry. An append-only log is what sank `pageAdjustments` (23/07/2026).
//
// `request` (TASK-102020-agent-edit-page, 29/10/2026) is a change asked in natural language and applied by
// agentEditPage: it has no element value, so it is keyed by organism + aspect (`target`) and removed explicitly
// (`removeDefsHistory`), never by landing back on a `from`.

export type DefsHistoryEntry = DefsHistoryMolecule | DefsHistoryClass | DefsHistoryText | DefsHistoryProp | DefsHistoryRequest;

/** The closed vocabulary of a `request` target: the aspect of the organism the change is about. */
export const DEFS_HISTORY_ASPECTS = [
  'layout.align', 'layout.order', 'layout.density', 'layout.grouping', 'layout.size',
  'style.emphasis', 'style.color', 'style.border', 'style.shadow',
  'text', 'visibility', 'presentation',
] as const;
export type DefsHistoryAspect = typeof DEFS_HISTORY_ASPECTS[number];

interface DefsHistoryPlace {
  /** `data-organism-id` of the closest organism above the element; null outside every organism. */
  organism: string | null;
  /** Where the element is inside its organism — a hint for the generator, not a replay address. */
  target: string;
  /** ISO time of the last edit. */
  at: string;
}
interface DefsHistoryBase extends DefsHistoryPlace {
  /** The value before the FIRST edit of this target. */
  from: string;
  to: string;
}
export interface DefsHistoryMolecule extends DefsHistoryBase {
  kind: 'molecule';
  /** One occurrence swapped, or every occurrence of the tag. */
  scope: 'one' | 'all';
}
export interface DefsHistoryClass extends DefsHistoryBase {
  kind: 'class';
  /** `data-class` is a molecule's inner class channel. */
  attribute: 'class' | 'data-class';
}
export interface DefsHistoryText extends DefsHistoryBase {
  kind: 'text';
  /** null = the element's text; else the attribute holding it (`placeholder`, `title`, `aria-label`, `alt`). */
  attribute: string | null;
  /** The catalog locale written; null for literal text in the markup, which has no language. */
  lang: string | null;
}
/** A molecule's configuration attribute (`size="sm"`), set in the Studio's Properties tab. */
export interface DefsHistoryProp extends DefsHistoryPlace {
  kind: 'prop';
  /** The HTML attribute written (`icon-position`, `data-variant`, `size`). */
  attribute: string;
  /** The attribute value; `""` = a bare boolean attribute; null = absent, the molecule's default. */
  from: string | null;
  to: string | null;
}
/** A change asked in natural language and applied by agentEditPage to the page `.ts` (no element value). */
export interface DefsHistoryRequest extends DefsHistoryPlace {
  kind: 'request';
  target: DefsHistoryAspect;
  /** The instruction for the generator, in English, self-contained (it does not depend on the old markup). */
  change: string;
  /** The person's own words, kept for display and audit. */
  request: string;
}

const HISTORY_BLOCK = /\r?\nexport const history = ([\s\S]*) as const;\r?\n?$/u;
const HISTORY_MARK = /^export const history = /mu;

/**
 * The defs text without its history block, and the entries. Throws `DEFS_HISTORY_FORMAT` when the file has a history
 * export that is not the last block or does not parse — never guesses.
 */
export function splitDefsHistory(source: string): { base: string; history: DefsHistoryEntry[] } {
  const match = HISTORY_BLOCK.exec(source);
  if (!match) {
    if (HISTORY_MARK.test(source)) throw new Error('DEFS_HISTORY_FORMAT: the history export is not the last block');
    return { base: source, history: [] };
  }
  let parsed: unknown;
  try { parsed = JSON.parse(match[1]); } catch { throw new Error('DEFS_HISTORY_FORMAT: history is not JSON'); }
  return { base: source.slice(0, match.index), history: buildDefsHistory(parsed) };
}

/**
 * The defs text a reader of the `definition` grammar expects: the history block cut off. Never throws — a history
 * that does not parse leaves the text as it is, and the reader then fails with its own error.
 */
export function defsWithoutHistory(source: string): string {
  try { return splitDefsHistory(source).base; } catch { return source; }
}

/** The defs text with `entries` as its history; an empty list removes the block, restoring the producer's text. */
export function withDefsHistory(source: string, entries: readonly DefsHistoryEntry[]): string {
  const { base } = splitDefsHistory(source);
  if (!entries.length) return base;
  const eol = base.includes('\r\n') ? '\r\n' : '\n';
  const json = JSON.stringify(buildDefsHistory(entries), null, 2).replace(/\n/gu, eol);
  return `${base}${eol}export const history = ${json} as const;${eol}`;
}

/** What makes two entries the same target: a later edit of it replaces the earlier one. */
export function defsHistoryKey(entry: DefsHistoryEntry): string {
  const parts: Array<string | null> = [entry.kind, entry.organism, entry.target];
  if (entry.kind === 'class' || entry.kind === 'prop') parts.push(entry.attribute);
  if (entry.kind === 'text') parts.push(entry.attribute, entry.lang);
  return JSON.stringify(parts);
}

/**
 * Records one edit. The list is in the order of the LAST change: an entry already there for the same target keeps
 * its `from` and moves to the end; an edit that lands back on `from` removes it. Returns a new list.
 */
export function recordDefsHistory(entries: readonly DefsHistoryEntry[], edit: DefsHistoryEntry): DefsHistoryEntry[] {
  const key = defsHistoryKey(edit);
  const index = entries.findIndex(entry => defsHistoryKey(entry) === key);
  const out = [...entries];
  if (index >= 0) out.splice(index, 1);
  // A request has no value to land back on: it always replaces, and only removeDefsHistory takes it out.
  if (edit.kind === 'request') {
    out.push(edit);
    return out;
  }
  const previous = index < 0 ? null : entries[index];
  const merged = previous && previous.kind !== 'request' ? { ...edit, from: previous.from } as DefsHistoryEntry : edit;
  if (merged.kind !== 'request' && merged.to !== merged.from) out.push(merged);
  return out;
}

/** Takes the entry of `key` out (a request asked to be undone: "back to how it was"). Returns a new list. */
export function removeDefsHistory(entries: readonly DefsHistoryEntry[], key: string): DefsHistoryEntry[] {
  return entries.filter(entry => defsHistoryKey(entry) !== key);
}

/** Where the entry of `key` sits in the list, -1 when there is none — what an undo puts it back at. */
export function indexOfDefsHistory(entries: readonly DefsHistoryEntry[], key: string): number {
  return entries.findIndex(entry => defsHistoryKey(entry) === key);
}

/** The entry of `key`, or null — what an undo has to put back. */
export function findDefsHistory(entries: readonly DefsHistoryEntry[], key: string): DefsHistoryEntry | null {
  return entries.find(entry => defsHistoryKey(entry) === key) ?? null;
}

/**
 * Puts `key` back to exactly `entry` (null = no entry): the undo and redo of `recordDefsHistory`. `at` is the place in
 * the list (an undo passes where the entry was before the edit); without it, or out of range, the entry goes last,
 * as a redo does.
 */
export function restoreDefsHistory(entries: readonly DefsHistoryEntry[], key: string, entry: DefsHistoryEntry | null, at = -1): DefsHistoryEntry[] {
  const out = entries.filter(item => defsHistoryKey(item) !== key);
  if (!entry) return out;
  if (at >= 0 && at <= out.length) out.splice(at, 0, entry);
  else out.push(entry);
  return out;
}

/** Validates the exact entry grammar; unknown or missing fields throw `DEFS_HISTORY_ENTRY`. */
export function buildDefsHistory(value: unknown): DefsHistoryEntry[] {
  if (!Array.isArray(value)) throw new Error('DEFS_HISTORY_FORMAT: history is not a list');
  return value.map((raw, index) => {
    const code = `DEFS_HISTORY_ENTRY: ${index}`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(code);
    const row = raw as Record<string, unknown>;
    if (row.kind === 'request') return buildRequestEntry(row, code);
    const common = ['kind', 'organism', 'target', 'from', 'to', 'at'];
    const extra = row.kind === 'molecule' ? ['scope'] : row.kind === 'class' || row.kind === 'prop' ? ['attribute'] : row.kind === 'text' ? ['attribute', 'lang'] : null;
    if (!extra) throw new Error(`${code}: kind`);
    const allowed = [...common, ...extra];
    for (const key of Object.keys(row)) if (!allowed.includes(key)) throw new Error(`${code}: forbidden field ${key}`);
    for (const key of allowed) if (!(key in row)) throw new Error(`${code}: missing field ${key}`);
    if (row.organism !== null && !nonEmpty(row.organism)) throw new Error(`${code}: organism`);
    if (!nonEmpty(row.target) || !nonEmpty(row.at)) throw new Error(`${code}: value`);
    const place = { organism: row.organism as string | null, target: row.target as string, at: row.at as string };
    if (row.kind === 'prop') {
      // null is the attribute being absent (the default); only a property has that.
      if ((row.from !== null && typeof row.from !== 'string') || (row.to !== null && typeof row.to !== 'string')) throw new Error(`${code}: value`);
      if (!nonEmpty(row.attribute)) throw new Error(`${code}: attribute`);
      return { kind: 'prop', ...place, from: row.from, to: row.to, attribute: row.attribute } as DefsHistoryProp;
    }
    if (typeof row.from !== 'string' || typeof row.to !== 'string') throw new Error(`${code}: value`);
    const base = { ...place, from: row.from, to: row.to };
    if (row.kind === 'molecule') {
      if (row.scope !== 'one' && row.scope !== 'all') throw new Error(`${code}: scope`);
      return { kind: 'molecule', ...base, scope: row.scope };
    }
    if (row.kind === 'class') {
      if (row.attribute !== 'class' && row.attribute !== 'data-class') throw new Error(`${code}: attribute`);
      return { kind: 'class', ...base, attribute: row.attribute };
    }
    if (row.attribute !== null && !nonEmpty(row.attribute)) throw new Error(`${code}: attribute`);
    if (row.lang !== null && !nonEmpty(row.lang)) throw new Error(`${code}: lang`);
    return { kind: 'text', ...base, attribute: row.attribute as string | null, lang: row.lang as string | null };
  });
}

function buildRequestEntry(row: Record<string, unknown>, code: string): DefsHistoryRequest {
  const allowed = ['kind', 'organism', 'target', 'change', 'request', 'at'];
  for (const key of Object.keys(row)) if (!allowed.includes(key)) throw new Error(`${code}: forbidden field ${key}`);
  for (const key of allowed) if (!(key in row)) throw new Error(`${code}: missing field ${key}`);
  if (row.organism !== null && !nonEmpty(row.organism)) throw new Error(`${code}: organism`);
  if (!(DEFS_HISTORY_ASPECTS as readonly unknown[]).includes(row.target)) throw new Error(`${code}: target`);
  if (!nonEmpty(row.change) || !nonEmpty(row.request) || !nonEmpty(row.at)) throw new Error(`${code}: value`);
  return {
    kind: 'request', organism: row.organism as string | null, target: row.target as DefsHistoryAspect,
    at: row.at as string, change: row.change as string, request: row.request as string,
  };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
