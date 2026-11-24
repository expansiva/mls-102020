/// <mls fileReference="_102020_/l2/aura/studio/pageVersions.ts" enhancement="_blank" />
// The page timeline, wired to the Studio: WHEN a version is taken, and the way back to one.
//
// The writers only say what they did; this module reads the page as it is now (the `.ts` and the whole `.defs.ts`,
// from the same editor models every Studio write goes through) and keeps it:
//  - `ensurePageVersion` — before anything is written (a page is opened, a request is applied, a regeneration
//    starts): with no timeline yet the page as it is becomes the `open` version; with one whose last version is not
//    the page any more, the difference is recorded as changed outside the Studio's sight.
//  - `notePageEdit` — after a Studio edit. Delayed a little and coalesced per page: the defs history is written right
//    after the `.ts`, and a gesture (typing, dragging) is several writes.
//  - `recordPageVersion` — right now (the AI apply, the end of a regeneration).
//  - `restorePageVersion` — writes the version's `.ts` and `.defs.ts` back and records that as a NEW version.
//
// Only a generated page folder has a timeline (`<module>/web/<device>/page<NN>`), the same gate as the defs history.

import { defsHistoryEnabled } from '/_102020_/l2/aura/studio/studioDefsHistory.js';
import { restoreEditPage, snapshotPageFile, type CommitResult } from '/_102020_/l2/aura/agentEditPage/editPageIo.js';
import { pageVersionKey, sameContent, type IPageVersion, type PageVersionWho } from '/_102020_/l2/aura/studio/pageVersionsCore.js';
import { indexedDbBackend, PageVersionsStore, type IPageRef } from '/_102020_/l2/aura/studio/pageVersionsStore.js';

export type { IPageRef } from '/_102020_/l2/aura/studio/pageVersionsStore.js';

/** How long after a Studio edit the version is taken (the defs history lands right after the `.ts`). */
const EDIT_SETTLE_MS = 1500;

let store: PageVersionsStore | null = null;
function theStore(): PageVersionsStore {
  if (!store) store = new PageVersionsStore(indexedDbBackend());
  return store;
}

/** false once the browser store failed (private window, quota): the panel says the history is unavailable. */
export function pageVersionsAvailable(): boolean {
  return theStore().available;
}

/** A page file the timeline covers: the page `.ts` of a generated page folder. */
export function isVersionedPage(page: { project: number; folder: string; shortName: string; extension?: string } | null | undefined): page is IPageRef {
  if (!page || !Number.isSafeInteger(page.project) || page.project <= 0) return false;
  if (page.extension !== undefined && page.extension !== '.ts') return false;
  return defsHistoryEnabled(page);
}

/** The page of an edit target (or any resolved file), or null when the file is not a page `.ts` with a timeline. */
export function versionedPage(file: { project: number; folder: string; shortName: string; storFile?: { extension?: string } } | null | undefined): IPageRef | null {
  if (!file) return null;
  const page = { project: file.project, folder: file.folder, shortName: file.shortName, extension: file.storFile?.extension ?? '.ts' };
  return isVersionedPage(page) ? refOf(page) : null;
}

function refOf(page: IPageRef): IPageRef {
  return { project: page.project, folder: page.folder, shortName: page.shortName };
}

// ─── Listeners (the panel refreshes when its page gets a version) ───

type Listener = (key: string) => void;
const listeners = new Set<Listener>();

export function onPageVersions(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(page: IPageRef): void {
  const key = pageVersionKey(page);
  for (const listener of listeners) {
    try { listener(key); } catch (error) { console.warn('[pageVersions] listener failed:', error); }
  }
}

// ─── Writing, one page at a time ───

/** Per page, the chain of pending writes: two versions of one page never race each other. */
const queues = new Map<string, Promise<unknown>>();

function serial<T>(page: IPageRef, job: () => Promise<T>): Promise<T> {
  const key = pageVersionKey(page);
  const run = (queues.get(key) ?? Promise.resolve()).then(job, job);
  queues.set(key, run.catch(() => undefined));
  return run;
}

async function readPage(page: IPageRef): Promise<{ ts: string; defs: string | null } | null> {
  try {
    const snapshot = await snapshotPageFile(page.project, page.folder, page.shortName);
    return snapshot ? { ts: snapshot.source, defs: snapshot.defs } : null;
  } catch (error) {
    console.warn('[pageVersions] the page could not be read:', error);
    return null;
  }
}

async function take(page: IPageRef, who: PageVersionWho, what: string, extra: Partial<IPageVersion> = {}): Promise<void> {
  const content = await readPage(page);
  if (!content) return;
  const now = Date.now();
  const after = await theStore().append(page, { id: now, at: now, who, what, ts: content.ts, defs: content.defs, ...extra });
  if (after) emit(page);
}

/**
 * Before a write: makes sure the timeline holds the page as it is NOW. No timeline → the `open` version; a last
 * version that differs from the page → a version "changed outside the Studio". Cheap when nothing is missing.
 */
export function ensurePageVersion(page: IPageRef | null | undefined, sourceBefore?: string): Promise<void> {
  if (!isVersionedPage(page)) return Promise.resolve();
  const ref = refOf(page);
  return serial(ref, async () => {
    const read = await readPage(ref);
    if (!read) return;
    // A writer about to change the model passes the `.ts` as it was, read synchronously: by the time this runs the
    // model may already hold the edit. The defs is written after the `.ts`, so reading it here still gets the old one.
    const content = sourceBefore === undefined ? read : { ts: sourceBefore, defs: read.defs };
    const s = theStore();
    const list = await s.list(ref);
    const last = list[list.length - 1];
    if (last && sameContent(last, content)) return;
    const now = Date.now();
    const after = await s.append(ref, { id: now, at: now, who: last ? 'other' : 'open', what: '', ...content });
    if (after) emit(ref);
  });
}

const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; page: IPageRef; who: PageVersionWho; what: string }>();

/**
 * After a Studio edit of the page: the version is taken shortly after, once the defs history is written too. A
 * second edit before that restarts the wait and its `what` wins (one gesture, one version).
 */
export function notePageEdit(page: IPageRef | null | undefined, who: PageVersionWho, what: string): void {
  if (!isVersionedPage(page)) return;
  const ref = refOf(page);
  const key = pageVersionKey(ref);
  const previous = pending.get(key);
  if (previous) clearTimeout(previous.timer);
  const timer = setTimeout(() => { void flushPageEdit(ref); }, EDIT_SETTLE_MS);
  pending.set(key, { timer, page: ref, who, what });
}

/** Takes a pending edit's version now (before another writer, or when the panel needs the list current). */
export function flushPageEdit(page: IPageRef): Promise<void> {
  const key = pageVersionKey(page);
  const job = pending.get(key);
  if (!job) return serial(page, async () => undefined);
  clearTimeout(job.timer);
  pending.delete(key);
  return serial(job.page, () => take(job.page, job.who, job.what));
}

/** Records the page as it is now, right away (after the AI applied a request, after a regeneration). */
export async function recordPageVersion(page: IPageRef | null | undefined, who: PageVersionWho, what: string, extra: Partial<IPageVersion> = {}): Promise<void> {
  if (!isVersionedPage(page)) return;
  const ref = refOf(page);
  await flushPageEdit(ref);
  await serial(ref, () => take(ref, who, what, extra));
}

/** The page's versions, oldest first (a pending edit is taken first, so the list is current). */
export async function listPageVersions(page: IPageRef): Promise<IPageVersion[]> {
  if (!isVersionedPage(page)) return [];
  const ref = refOf(page);
  await flushPageEdit(ref);
  return serial(ref, () => theStore().list(ref));
}

/**
 * Back to a version: its `.ts` and `.defs.ts` are written through the same path as a discard (model, local copy,
 * compile, live update) and the result is a NEW version — the ones in between stay, so going back is undoable.
 */
export async function restorePageVersion(page: IPageRef, version: IPageVersion, saved = false): Promise<CommitResult> {
  const ref = refOf(page);
  await flushPageEdit(ref);
  const result = await restoreEditPage({
    project: ref.project, folder: ref.folder, page: ref.shortName,
    source: version.ts, defs: version.defs, history: null,
  });
  await serial(ref, () => take(ref, 'restore', '', { restoredFrom: version.at, ...(saved ? { restoredSaved: true } : {}) }));
  return result;
}

// ─── The saved past: git, through the driver ───

/** One commit of the page `.ts` (what was saved or published). */
export interface ISavedPageVersion {
  ref: string;
  at: number;
  author: string;
  message: string;
}

function storFile(page: IPageRef, extension: string): mls.stor.IFileInfo | null {
  const file = mls.stor.files[mls.stor.getKeyToFiles(page.project, 2, page.shortName, page.folder, extension)];
  return file && file.status !== 'deleted' ? file : null;
}

/** The commits of the page `.ts`, newest first; [] when the file was never saved or the driver has no history. */
export async function listSavedPageVersions(page: IPageRef): Promise<ISavedPageVersion[]> {
  const file = storFile(page, '.ts');
  if (!file || file.status === 'new') return [];
  const history = await file.getHistory();
  return (history ?? []).map(h => ({
    ref: h.ref,
    at: new Date(h.data).getTime(),
    author: h.authorName ?? '',
    message: h.message ?? '',
  }));
}

/** The page `.ts` and `.defs.ts` as one commit holds them (the defs as of that commit, changed or not in it). */
export async function readSavedPageVersion(page: IPageRef, saved: ISavedPageVersion): Promise<{ ts: string; defs: string | null } | null> {
  const ts = await storFile(page, '.ts')?.getHistoryContent(saved.ref);
  if (typeof ts !== 'string') return null;
  let defs: string | null = null;
  try {
    const text = await storFile(page, '.defs.ts')?.getHistoryContent(saved.ref);
    defs = typeof text === 'string' ? text : null;
  } catch {
    defs = null;
  }
  return { ts, defs };
}

/** Back to a saved version: the same as a local one, recorded as a restore of that commit's time. */
export async function restoreSavedPageVersion(page: IPageRef, saved: ISavedPageVersion): Promise<CommitResult | null> {
  const content = await readSavedPageVersion(page, saved);
  if (!content) return null;
  return restorePageVersion(page, { id: 0, at: saved.at, who: 'other', what: '', ts: content.ts, defs: content.defs }, true);
}
