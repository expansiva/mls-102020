/// <mls fileReference="_102020_/l2/aura/studio/studioTourCore.ts" enhancement="_blank" />
// Pure rules of the Studio's guided tours: what a tour is, when it is offered, what was seen, which step comes
// next and where the bubble goes. No DOM and no mls.* here: studioTour.ts does the drawing and the waiting.

/** One step: the element it points at (a CSS selector, searched in shadow roots too) and its words. */
export interface TourStep {
  /** CSS selector of the element to highlight; the first match wins. */
  anchor: string;
  titleKey: string;
  textKey: string;
  /** A line that invites the person to do it ("Try it: …"); the step then also advances on `advanceOn`. */
  tryKey?: string;
  /** The tab of the panel the anchor lives in, opened before the step is shown. */
  openTab?: string;
  /** A signal that completes the step by itself (the person did what it asks). */
  advanceOn?: 'selection';
}

export interface TourDef {
  id: string;
  /** Raised when the tour changes enough to be offered again to whoever saw an older one. */
  version: number;
  welcome: { kickerKey: string; titleKey: string; lineKeys: string[] };
  steps: TourStep[];
}

/** What the person did with each tour: finished or skipped, and which version. */
export type ToursSeen = Record<string, { version: number; seen: 'done' | 'skipped' }>;

/** The stored record, shaped again: anything malformed counts as never seen. */
export function parseSeen(raw: string | null | undefined): ToursSeen {
  if (!raw) return {};
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return {}; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: ToursSeen = {};
  for (const [id, item] of Object.entries(value as Record<string, unknown>)) {
    const row = item && typeof item === 'object' ? item as { version?: unknown; seen?: unknown } : {};
    if (Number.isSafeInteger(row.version) && (row.seen === 'done' || row.seen === 'skipped')) {
      out[id] = { version: row.version as number, seen: row.seen };
    }
  }
  return out;
}

export function markSeen(seen: ToursSeen, tour: Pick<TourDef, 'id' | 'version'>, how: 'done' | 'skipped'): ToursSeen {
  return { ...seen, [tour.id]: { version: tour.version, seen: how } };
}

/**
 * Why a tour must not open by itself now. There is no "studio client" condition on purpose: the tours live inside the
 * Studio's own panels, and the Studio embedded in a client server's app (isStudioClient) is a Studio like any other.
 */
export interface TourContext {
  /** Something the person is in the middle of: an AI task running, a page in review. */
  busy: boolean;
  /** A tour is already on screen. */
  open: boolean;
}

/** Offered by itself only once per version, and never over something else. The "?" opens it regardless. */
export function shouldOffer(tour: Pick<TourDef, 'id' | 'version'>, seen: ToursSeen, context: TourContext): boolean {
  if (context.busy || context.open) return false;
  const row = seen[tour.id];
  return !row || row.version < tour.version;
}

/**
 * The step to show from `from` going `dir`, skipping the steps that cannot be shown. null = past the end (or before
 * the start): the tour is over.
 */
export function nextShowable(count: number, from: number, dir: 1 | -1, showable: (index: number) => boolean): number | null {
  for (let index = from; index >= 0 && index < count; index += dir) {
    if (showable(index)) return index;
  }
  return null;
}

/**
 * Where the step stands among the steps that exist on screen: "3 of 5" counts only those, and Back / Done follow
 * them — a step of a view that is not open (the list while one item is open) neither counts nor waits.
 */
export function stepPosition(showable: readonly boolean[], index: number): { n: number; total: number; first: boolean; last: boolean } {
  const shown = showable.map((ok, i) => (ok || i === index ? i : -1)).filter(i => i >= 0);
  const at = shown.indexOf(index);
  return { n: at + 1, total: shown.length, first: at <= 0, last: at === shown.length - 1 };
}

/**
 * How to bring the step's element into its scroll area: nothing when it is already well inside (clear of the sticky
 * bars a panel pins at its top and bottom), its top at the top when it is taller than the area, else centered.
 */
export function revealMode(element: { top: number; height: number }, area: { top: number; height: number }, clearance = 72): 'none' | 'start' | 'center' {
  const inside = element.top >= area.top + clearance && element.top + element.height <= area.top + area.height - clearance;
  if (inside) return 'none';
  return element.height > area.height - 2 * clearance ? 'start' : 'center';
}

export interface Box { left: number; top: number; width: number; height: number }

/**
 * Where the bubble goes: beside the element (right, then left), else below or above it; always inside the viewport.
 * `side` says where the arrow points from.
 */
export function placeBubble(target: Box, bubble: { width: number; height: number }, viewport: { width: number; height: number }, gap = 14): { left: number; top: number; side: 'right' | 'left' | 'below' | 'above' } {
  const margin = 8;
  const clampX = (x: number) => Math.max(margin, Math.min(x, viewport.width - bubble.width - margin));
  const clampY = (y: number) => Math.max(margin, Math.min(y, viewport.height - bubble.height - margin));
  const right = target.left + target.width + gap;
  if (right + bubble.width + margin <= viewport.width) return { left: right, top: clampY(target.top), side: 'right' };
  const left = target.left - gap - bubble.width;
  if (left >= margin) return { left, top: clampY(target.top), side: 'left' };
  const below = target.top + target.height + gap;
  if (below + bubble.height + margin <= viewport.height) return { left: clampX(target.left), top: below, side: 'below' };
  return { left: clampX(target.left), top: clampY(target.top - gap - bubble.height), side: 'above' };
}
