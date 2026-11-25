/// <mls fileReference="_102020_/l2/aura/plugins/editBatchCore.ts" enhancement="_blank"/>

// Pure rules of a page change asked of several pages at once (the AI tab of selectPage). No DOM, no mls.*: the panel
// does the reading and the agent calls; this module decides which pages, in which order, and what each row says.

/** Which pages the request goes to. */
export type EditScopeKind = 'page' | 'module' | 'molecule' | 'pick';

/** Where one page of the batch stands. */
export type BatchRowState =
  | 'planning' | 'planned' | 'refused'
  | 'waiting' | 'generating' | 'review' | 'failed' | 'unchanged'
  | 'applied' | 'discarded' | 'skipped';

export interface BatchRow {
  state: BatchRowState;
  /** Why it was refused or failed, as the agent said it. */
  reason?: string;
  /** Ticked: planned → goes to the preview; in review → applied by "Apply the ticked". */
  include: boolean;
  /** Where the page stands with the last adjustment of the batch (the page itself stays in review). */
  adjust?: BatchAdjustState;
  /** Why the adjustment was refused or failed, as the agent said it. */
  adjustReason?: string;
  /** The rules of the common standard the page's result does not carry (by their `what`). */
  misses?: string[];
}

/**
 * The rules of a standard a page source does not carry: a rule is followed when every one of its classes appears in
 * the source as a whole class (between spaces, quotes or backticks). A check, not a proof — the class could sit on
 * another element — so it only warns.
 */
export function standardMisses(source: string, standard: { rules: ReadonlyArray<{ what: string; classes: string }> } | null | undefined): string[] {
  if (!standard?.rules.length) return [];
  const has = (cls: string) => new RegExp(`(^|[\\s"'\`])${cls.replace(/[.*+?^${}()|[\]\\/]/gu, '\\$&')}(?=[\\s"'\`]|$)`, 'u').test(source);
  return standard.rules.filter(rule => !rule.classes.split(/\s+/u).filter(Boolean).every(has)).map(rule => rule.what);
}

/** An adjustment of a page in review: analyzed first (its plan waits for the person), then generated. */
export type BatchAdjustState = 'queued' | 'planning' | 'planned' | 'refused' | 'generating' | 'done' | 'failed';

/** The pages an adjustment of the batch goes to: ticked, in review, under the limit of adjustments, in list order. */
export function batchAdjustTargets(rows: Readonly<Record<string, BatchRow>>, adjustCount: (name: string) => number, max: number): string[] {
  return Object.entries(rows).filter(([name, row]) => row.state === 'review' && row.include && adjustCount(name) < max).map(([name]) => name);
}

/** The pages whose adjustment was analyzed and waits for "Generate". */
export function batchAdjustReady(rows: Readonly<Record<string, BatchRow>>): string[] {
  return Object.entries(rows).filter(([, row]) => row.state === 'review' && row.adjust === 'planned').map(([name]) => name);
}

/** An adjustment is under way or waiting for the person: the decision of the batch waits for it. */
export function batchAdjusting(rows: Readonly<Record<string, BatchRow>>): boolean {
  return Object.values(rows).some(row => row.state === 'review'
    && (row.adjust === 'queued' || row.adjust === 'planning' || row.adjust === 'planned' || row.adjust === 'generating'));
}

/** The molecule tags a page source uses (`<group--ml-name`), each once, in the order they first appear. */
export function moleculeTagsIn(source: string): string[] {
  const tags: string[] = [];
  for (const match of source.matchAll(/<([a-z][a-z0-9]*--ml-[a-z0-9-]+)[\s>/]/gu)) {
    if (!tags.includes(match[1])) tags.push(match[1]);
  }
  return tags;
}

/** The pages whose source uses the tag (an opening tag, not a mention in a comment or a string of another tag). */
export function pagesUsingTag(sources: ReadonlyArray<{ name: string; source: string }>, tag: string): string[] {
  return sources.filter(item => moleculeTagsIn(item.source).includes(tag)).map(item => item.name);
}

/**
 * The order the pages are changed in: one at a time, as listed, and the page on screen LAST — its change is the one
 * the person sees happen, and it is not replaced on screen by another page's remount.
 */
export function batchOrder(pages: readonly string[], onScreen: string | null): string[] {
  const rest = pages.filter(name => name !== onScreen);
  return onScreen && pages.includes(onScreen) ? [...rest, onScreen] : rest;
}

/** Runs `work` over the items, at most `limit` at a time; the results keep the items' order. */
export async function runLimited<T, R>(items: readonly T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
}

/** How many rows are in each state (only the states present). */
export function batchCounts(rows: Readonly<Record<string, BatchRow>>): Partial<Record<BatchRowState, number>> {
  const counts: Partial<Record<BatchRowState, number>> = {};
  for (const row of Object.values(rows)) counts[row.state] = (counts[row.state] ?? 0) + 1;
  return counts;
}

/** The pages still waiting for the person's decision: while any is, the batch is open (and those pages locked). */
export function batchOpen(rows: Readonly<Record<string, BatchRow>>): boolean {
  return Object.values(rows).some(row => row.state === 'planning' || row.state === 'planned' || row.state === 'waiting'
    || row.state === 'generating' || row.state === 'review');
}

/**
 * The decision "Apply the ticked": every page in review is applied when ticked and discarded when not. Pages in
 * any other state are left as they are.
 */
export function batchDecision(rows: Readonly<Record<string, BatchRow>>): { apply: string[]; discard: string[] } {
  const apply: string[] = [];
  const discard: string[] = [];
  for (const [name, row] of Object.entries(rows)) {
    if (row.state !== 'review') continue;
    (row.include ? apply : discard).push(name);
  }
  return { apply, discard };
}

/** The scope's pages, the page asked from first; null with the reason when it cannot go (too few or too many). */
export function scopePages(origin: string, candidates: readonly string[], max: number): { pages: string[] } | { refusal: 'none' | 'tooMany'; count: number } {
  const pages = [origin, ...candidates.filter(name => name !== origin)].filter((name, i, all) => all.indexOf(name) === i);
  if (pages.length < 2) return { refusal: 'none', count: pages.length };
  if (pages.length > max) return { refusal: 'tooMany', count: pages.length };
  return { pages };
}
