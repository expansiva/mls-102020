/// <mls fileReference="_102020_/l2/aura/studio/studioPageReview.ts" enhancement="_blank" />
// The pages whose AI change is "in review": the result is on screen and in the file, and the person has not applied
// or discarded it yet. While a page is in review, the Studio's own edits of it are refused (the editor and the
// molecule knob): an edit on top of a preview would be lost by a discard, or carried by an apply without being seen.
//
// Selecting and inspecting stay free; only writes are refused. Kept in memory: a reload ends the review, and the
// page stays as it was left (the page timeline holds the version before the request).

export interface IReviewPage {
  project: number;
  folder: string;
  shortName: string;
}

type Listener = () => void;

const inReview = new Set<string>();
const listeners = new Set<Listener>();

function keyOf(page: IReviewPage): string {
  return `${page.project}/${page.folder}/${page.shortName}`;
}

/** Puts a page in review (`on`) or takes it out; listeners hear every change. */
export function setPageInReview(page: IReviewPage, on: boolean): void {
  const key = keyOf(page);
  if (on === inReview.has(key)) return;
  if (on) inReview.add(key); else inReview.delete(key);
  for (const listener of listeners) {
    try { listener(); } catch (error) { console.warn('[pageReview] listener failed:', error); }
  }
}

/** The file is a page in review (any file of the page: the `.ts` the editor writes, or the page by its name). */
export function isPageInReview(file: { project: number | string; folder: string; shortName: string } | null | undefined): boolean {
  if (!file) return false;
  return inReview.has(keyOf({ project: Number(file.project), folder: file.folder, shortName: file.shortName }));
}

const aiUndo = new Set<string>();

/**
 * The page's last applied AI change can still be discarded (the AI tab offers it). That discard goes back through the
 * page timeline when the page changed since, so the timeline must not be cleared meanwhile.
 */
export function setPageAiUndo(page: IReviewPage, on: boolean): void {
  const key = keyOf(page);
  if (on === aiUndo.has(key)) return;
  if (on) aiUndo.add(key); else aiUndo.delete(key);
  for (const listener of listeners) {
    try { listener(); } catch (error) { console.warn('[pageReview] listener failed:', error); }
  }
}

export function hasPageAiUndo(file: { project: number | string; folder: string; shortName: string } | null | undefined): boolean {
  if (!file) return false;
  return aiUndo.has(keyOf({ project: Number(file.project), folder: file.folder, shortName: file.shortName }));
}

export function onPageReviewChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
