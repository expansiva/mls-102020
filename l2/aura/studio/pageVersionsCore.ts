/// <mls fileReference="_102020_/l2/aura/studio/pageVersionsCore.ts" enhancement="_blank" />
// The page timeline, as pure data: what a version is, which ones are kept, and when two writes are one version.
//
// A version is the page AFTER a write — the whole `.ts` and the whole `.defs.ts` (definition + history), never a
// diff: going back to a version must not depend on the versions around it (the session undo drops its whole stack
// when one step stops matching, and a chain of diffs would have the same weakness).
//
// No DOM, no storage, no `mls` here: pageVersionsStore keeps the lists, pageVersions decides when to write them.

/** Who left the page as a version holds it. */
export type PageVersionWho =
  /** The page as it was when the timeline started (always kept: there is always somewhere to go back to). */
  | 'open'
  /** An edit made in the Studio (class, text, move, molecule, media…). */
  | 'me'
  /** A request applied by the AI. */
  | 'ai'
  /** "Regenerate page". */
  | 'regen'
  /** "Back to this version" (it creates a new version, it never deletes the ones in between). */
  | 'restore'
  /** The page changed by a path the Studio does not see (code editor, another tab, a run outside the Studio). */
  | 'other';

export interface IPageVersion {
  /** Unique in the page's list; also its order (milliseconds, bumped when two land in the same one). */
  id: number;
  /** When the version was taken (ms since epoch). */
  at: number;
  who: PageVersionWho;
  /** One readable line: the Studio's own status text, the AI request, … Empty = only `who` says it. */
  what: string;
  /** The page `.ts`, whole. */
  ts: string;
  /** The page `.defs.ts`, whole; null = the page has no defs. */
  defs: string | null;
  /** For `restore`: the `at` of the version that was put back. */
  restoredFrom?: number;
  /** For `restore`: the version put back was a saved one (git), not one of this timeline. */
  restoredSaved?: boolean;
  /** For `ai`: what the person asked (with the adjustments). `what` is what the AI says it changed. */
  request?: string;
  /** For `ai`: what the AI said it changed at each step — the change, then each adjustment — in order. */
  steps?: string[];
  /** For `open`: the starting point "Clear history" left (the page as it was when the timeline was cleared). */
  cleared?: boolean;
}

export interface IPageVersionLimits {
  /** Versions kept per page, the `open` one included. */
  perPage: number;
  /** Two Studio edits of the same kind closer than this are one version (typing a text, dragging). */
  mergeWindowMs: number;
}

export const DEFAULT_LIMITS: IPageVersionLimits = { perPage: 30, mergeWindowMs: 5000 };

/** Budget for all the pages of one project together (the texts are whole, so this is what bounds the store). */
export const PROJECT_MAX_BYTES = 20 * 1024 * 1024;

/** Same page text and same defs text. */
export function sameContent(a: Pick<IPageVersion, 'ts' | 'defs'>, b: Pick<IPageVersion, 'ts' | 'defs'>): boolean {
  return a.ts === b.ts && (a.defs ?? null) === (b.defs ?? null);
}

/** What a version weighs in the store (UTF-16, as the browser keeps strings). */
export function versionBytes(v: Pick<IPageVersion, 'ts' | 'defs' | 'what'>): number {
  return (v.ts.length + (v.defs?.length ?? 0) + v.what.length) * 2;
}

/**
 * The list after `next` is added (oldest first). Never mutates `list`.
 *  - a version equal to the last one is not added (nothing changed);
 *  - a Studio edit right after another Studio edit with the same `what` replaces it (one gesture, one version);
 *  - over `perPage`, the oldest goes first — never the `open` one.
 */
export function pushVersion(list: readonly IPageVersion[], next: IPageVersion, limits: IPageVersionLimits = DEFAULT_LIMITS): IPageVersion[] {
  const last = list[list.length - 1];
  if (last && sameContent(last, next)) return [...list];
  const id = last && next.id <= last.id ? last.id + 1 : next.id;
  const version = { ...next, id };
  const merges = Boolean(last)
    && last.who === 'me' && version.who === 'me'
    && last.what === version.what
    && version.at - last.at >= 0 && version.at - last.at < limits.mergeWindowMs
    // The open version is the way back to the start: an edit never folds into it.
    && list.length > 1;
  const out = merges ? [...list.slice(0, -1), { ...version, id: last.id }] : [...list, version];
  const cap = Math.max(2, limits.perPage);
  while (out.length > cap) {
    const drop = out[0].who === 'open' ? 1 : 0;
    out.splice(drop, 1);
  }
  return out;
}

/**
 * The timeline after "Clear history": only the page as it is now, as the new starting point — an `open` version, so
 * every rule that keeps the way back to the start (never merged into, never trimmed) keeps this one too.
 */
export function clearedTimeline(content: Pick<IPageVersion, 'ts' | 'defs'>, now: number): IPageVersion[] {
  return [{ id: now, at: now, who: 'open', what: '', ts: content.ts, defs: content.defs ?? null, cleared: true }];
}

export interface IPageVersionsRecord {
  /** `<project>/<folder>/<shortName>` — see pageVersionKey. */
  key: string;
  project: number;
  versions: IPageVersion[];
}

export function pageVersionKey(page: { project: number; folder: string; shortName: string }): string {
  return `${page.project}/${page.folder}/${page.shortName}`;
}

/**
 * The records of one project after trimming them to `maxBytes` together: the oldest version of any page goes first,
 * but never a page's `open` version nor its latest one (what is on screen). Returns only the records that changed.
 */
export function trimProject(records: readonly IPageVersionsRecord[], maxBytes: number = PROJECT_MAX_BYTES): IPageVersionsRecord[] {
  let total = 0;
  for (const record of records) for (const v of record.versions) total += versionBytes(v);
  if (total <= maxBytes) return [];
  const working = records.map(record => ({ ...record, versions: [...record.versions] }));
  const changed = new Set<string>();
  while (total > maxBytes) {
    let best: { record: IPageVersionsRecord; index: number } | null = null;
    for (const record of working) {
      const last = record.versions.length - 1;
      for (let index = 0; index < last; index += 1) {
        const v = record.versions[index];
        if (v.who === 'open') continue;
        if (!best || v.at < best.record.versions[best.index].at) best = { record, index };
        break; // the oldest droppable of this page is its first droppable one
      }
    }
    if (!best) break;
    total -= versionBytes(best.record.versions[best.index]);
    best.record.versions.splice(best.index, 1);
    changed.add(best.record.key);
  }
  return working.filter(record => changed.has(record.key));
}

/** One entry of the timeline as the panel shows it: a version alone, or a run of versions of the same kind. */
export type TimelineEntry =
  | { kind: 'one'; version: IPageVersion }
  | { kind: 'group'; who: PageVersionWho; versions: IPageVersion[] };

/** Kinds whose runs fold into one entry ("3 Studio edits"). A regeneration and the open version always stand alone. */
const GROUPABLE: ReadonlySet<PageVersionWho> = new Set<PageVersionWho>(['me', 'ai', 'restore', 'other']);

/**
 * The timeline newest first, with runs of 2+ consecutive versions of the same kind folded into a group. The newest
 * version (what is on screen) is never folded: it is the one the list is about. Runs never cross a day.
 */
export function groupTimeline(list: readonly IPageVersion[], minRun = 2): TimelineEntry[] {
  const newestFirst = [...list].reverse();
  const out: TimelineEntry[] = [];
  const day = (v: IPageVersion) => new Date(v.at).toDateString();
  let index = 0;
  if (newestFirst.length) out.push({ kind: 'one', version: newestFirst[index++] });
  while (index < newestFirst.length) {
    const first = newestFirst[index];
    let end = index + 1;
    if (GROUPABLE.has(first.who)) {
      while (end < newestFirst.length && newestFirst[end].who === first.who && day(newestFirst[end]) === day(first)) end += 1;
    }
    const run = newestFirst.slice(index, end);
    out.push(run.length >= minRun ? { kind: 'group', who: first.who, versions: run } : { kind: 'one', version: first });
    if (run.length < minRun) end = index + 1;
    index = end;
  }
  return out;
}

/** How many versions are newer than `version` in `list` (what a "back to this version" also undoes). */
export function newerThan(list: readonly IPageVersion[], version: Pick<IPageVersion, 'id'>): number {
  return list.filter(v => v.id > version.id).length;
}

/** A regeneration happened after `version`: going back puts a structure the module may no longer expect. */
export function regenAfter(list: readonly IPageVersion[], version: Pick<IPageVersion, 'id'>): boolean {
  return list.some(v => v.id > version.id && v.who === 'regen');
}
