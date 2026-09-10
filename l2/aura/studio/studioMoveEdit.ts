/// <mls fileReference="_102020_/l2/aura/studio/studioMoveEdit.ts" enhancement="_blank" />
// An element as a SLICE of the source: moving it, duplicating it, removing it.
//
// The name is historical — it started as the move (TASK-102020-move-elements) and duplicate/remove
// (TASK-102020-duplicate-remove) landed here because they are the same primitive: a slice and a
// position. Three operations, one delimitation, one undo discipline.
//
// WHY THIS IS THE THIRD OPERATION AND NOT THE FIRST
// The editor swaps TEXT and swaps CLASSES; both rewrite a span in place. Moving is the first one that
// touches the TREE, and the whole difficulty is that the tree already exists — as offsets. An element
// is `[openStart, end)` in the source, children and `${...}` included, so a move is: cut that slice,
// put it back somewhere else. One write, through the path every other edit takes, undone by the stack
// every other edit uses.
//
// WHAT IT REACHES, measured with the real scanner over the real pages: reordering siblings covers
// 614 of the 767 elements of the 102047 (80,1%) and 4.873 of the 6.155 of the 102046 (79,2%). What it
// does not reach is a different parent (13-14%, and a real risk — see the task) and a helper's call
// site (5-6%).
//
// WHY THE DOM DECIDES WHO MAY MOVE
// Statically, two siblings sharing one `${...}` are ambiguous: they can be the two cells of a row
// (they coexist) or the two arms of a ternary (they never do). The gesture settles it for free —
// the user points at two elements that are BOTH on screen, which is the proof that they coexist. So
// this module answers about the SOURCE (same parent, different nodes, closed slice) and lets the
// caller bring two elements it saw together.

import type { ITemplateTree } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import type { IMessageRef } from '/_102020_/l2/aura/studio/studioMessages.js';

export const MOVE_NOT_SIBLING: IMessageRef = { id: 'reason.moveNotSibling' };
export const MOVE_SAME_NODE: IMessageRef = { id: 'reason.moveSameNode' };
export const MOVE_MOUNTED_ROOT: IMessageRef = { id: 'reason.moveMountedRoot' };
export const MOVE_UNCLOSED: IMessageRef = { id: 'reason.moveUnclosed' };
export const MOVE_NO_TARGET: IMessageRef = { id: 'reason.moveNoTarget' };
export const MOVE_STALE: IMessageRef = { id: 'reason.moveStale' };

export interface IMovePlan {
  ok: true;
  /** The element's slice in the source handed to `applyMove` — its whole subtree. */
  slice: { start: number; end: number };
  /**
   * Where the slice goes, IN THAT SAME SOURCE — before the cut, not after it.
   *
   * Keeping both offsets in one coordinate system is deliberate: the caller never has to know that
   * cutting first shifts everything to the right of it. `applyMove` owns that adjustment, in one
   * place, with a test for each direction.
   */
  insertAt: number;
}

export type MovePlan = IMovePlan | { ok: false; reason: IMessageRef };

export type MoveResult =
  | { ok: true; source: string; moved: { start: number; end: number } }
  | { ok: false; reason: IMessageRef };

/** Roots mounted by a `${this.renderX()}` — moving one of those moves the CALL, which is not this. */
function isMountedRoot(tree: ITemplateTree, index: number): boolean {
  return tree.links.some((link) => link.root === index);
}

/**
 * Whether the slice really is one whole element.
 *
 * `end` is `source.length` for an element the scanner never saw closed, and cutting THAT would take
 * the rest of the file with it. It is the one failure of this operation that destroys work, so it is
 * checked on the text and not on a flag: a slice has to start at `<` and finish at `>`.
 */
function sliceIsWhole(source: string, start: number, end: number): boolean {
  if (start < 0 || end <= start || end > source.length) return false;
  if (end >= source.length) return false;
  return source[start] === '<' && source[end - 1] === '>';
}

/**
 * The move, as two offsets — or the reason it cannot happen.
 *
 * Everything it refuses is refused BEFORE the gesture, so a button that is enabled is a button that
 * writes. The source is a parameter (and not only the tree) because the strongest check there is —
 * "is this slice a whole, closed element" — is a question about the text.
 */
export function planMove(
  source: string,
  tree: ITemplateTree,
  moved: number,
  target: number,
  side: 'before' | 'after',
): MovePlan {
  const from = tree.elements[moved];
  const to = tree.elements[target];
  if (!from || !to) return { ok: false, reason: MOVE_NO_TARGET };

  // The same source node behind two screen elements is a `.map()`: reordering it would not move
  // markup, it would reorder the DATA — which is not what anyone pointing at two cells is asking for.
  if (moved === target) return { ok: false, reason: MOVE_SAME_NODE };

  // BEFORE the parent comparison, and not after it: a mounted root's `parent` is -1 (it is the root
  // of its own helper template) while the element it sits among has a real parent, so comparing first
  // would report "not a sibling" for something that IS one on screen and is refused for another
  // reason entirely.
  if (isMountedRoot(tree, moved) || isMountedRoot(tree, target)) {
    return { ok: false, reason: MOVE_MOUNTED_ROOT };
  }
  if (from.parent !== to.parent) return { ok: false, reason: MOVE_NOT_SIBLING };
  if (!sliceIsWhole(source, from.openStart, from.end)) return { ok: false, reason: MOVE_UNCLOSED };
  if (!sliceIsWhole(source, to.openStart, to.end)) return { ok: false, reason: MOVE_UNCLOSED };

  const insertAt = side === 'before' ? to.openStart : to.end;
  // Landing inside the slice being cut would splice the element into itself. The sibling rule already
  // prevents it (a sibling is never nested), but the check is cheap and the failure is unreadable.
  if (insertAt > from.openStart && insertAt < from.end) return { ok: false, reason: MOVE_NOT_SIBLING };

  return { ok: true, slice: { start: from.openStart, end: from.end }, insertAt };
}

/**
 * Cut and paste, byte for byte.
 *
 * The one thing this has to get right is that CUTTING FIRST MOVES THE DESTINATION: everything to the
 * right of the slice slides left by its length, so a forward move lands at `insertAt - length` while
 * a backward move lands at `insertAt` untouched. Both directions have a test, and so does the case
 * where the offsets touch (moving past the immediately next sibling).
 *
 * The slice travels verbatim — no reindenting, no trimming. Its `${...}` and its children come along
 * unchanged, and what is left behind may be a double space. That is cosmetic and reindenting a
 * generated one-line template would be worse.
 */
export function applyMove(source: string, plan: IMovePlan): MoveResult {
  const { start, end } = plan.slice;
  if (!sliceIsWhole(source, start, end)) return { ok: false, reason: MOVE_UNCLOSED };
  if (plan.insertAt > start && plan.insertAt < end) return { ok: false, reason: MOVE_NOT_SIBLING };
  if (plan.insertAt < 0 || plan.insertAt > source.length) return { ok: false, reason: MOVE_NO_TARGET };

  const text = source.slice(start, end);
  const cut = source.slice(0, start) + source.slice(end);
  const at = plan.insertAt <= start ? plan.insertAt : plan.insertAt - text.length;
  return {
    ok: true,
    source: cut.slice(0, at) + text + cut.slice(at),
    moved: { start: at, end: at + text.length },
  };
}

/**
 * The plan that puts a moved slice back exactly where it was.
 *
 * NOT a re-planned move, and that difference is the whole reason this exists: planning the opposite
 * move would put the element back in the right ORDER but not in the right BYTES — the whitespace that
 * used to sit between the siblings has migrated, and undo would leave a file that differs from the
 * original. Replaying the exact inverse splice restores the file byte for byte.
 *
 * Revalidated on the TEXT, never on the offsets: an agent (or the user, in the code editor) can
 * rewrite the file between the edit and the undo, and a stale offset would cut something else. If the
 * slice is not where the step says it is, the step is refused and the stack goes with it.
 */
export function planReverse(
  source: string,
  landed: { start: number; end: number },
  slice: string,
  originalStart: number,
): MovePlan {
  if (source.slice(landed.start, landed.end) !== slice) return { ok: false, reason: MOVE_STALE };
  // `originalStart` is an offset in the source BEFORE the slice was inserted at `landed.start`, so it
  // has to be brought into the current coordinates first — everything that was after the insertion
  // point moved right by the slice's length.
  const insertAt = originalStart <= landed.start ? originalStart : originalStart + slice.length;
  if (insertAt > landed.start && insertAt < landed.end) return { ok: false, reason: MOVE_NOT_SIBLING };
  return { ok: true, slice: { ...landed }, insertAt };
}

/**
 * The siblings of a node in the source tree, in render order.
 *
 * Mirrors `childrenWithTag` (studioClassEdit) minus the tag filter: the children written in the same
 * template AND the helper templates mounted among them, which interleave by where they appear.
 */
export function siblingsOf(tree: ITemplateTree, index: number): number[] {
  const element = tree.elements[index];
  if (!element) return [];
  const parent = element.parent;
  const mounted = new Set(tree.links.map((link) => link.root));
  const found: { index: number; order: number }[] = [];

  for (const [i, candidate] of tree.elements.entries()) {
    if (candidate.parent !== parent) continue;
    if (parent === -1 && mounted.has(i)) continue;
    found.push({ index: i, order: candidate.openStart });
  }
  for (const link of tree.links) {
    if (link.parent !== parent) continue;
    found.push({ index: link.root, order: link.order });
  }

  return [...new Map(found.sort((a, b) => a.order - b.order).map((e) => [e.index, e])).values()]
    .map((e) => e.index);
}

// ── Duplicating and removing: the same slice, one step simpler (TASK-102020-duplicate-remove) ────
//
// Moving is cut + paste of the slice; these two are each HALF of it — duplicating is the paste
// without the cut, removing is the cut without the paste. That is why they reach MORE elements than
// the move: neither needs a sibling to point at. Measured with the real scanner over the real pages,
// a usable slice (closed, not a mounted root) covers 725 of the 767 elements of the 102047 (94,5%)
// and 5.692 of the 6.155 of the 102046 (92,5%), against the move's 80,1%.
//
// They do NOT share `IMovePlan`: that shape answers about two nodes and a side, and making
// `insertAt` mean "where the hole is" for a removal is the kind of overloaded field that reads fine
// the day it is written and lies six months later.
//
// THE TWO REVALIDATIONS, and they are not the same
// Undo never trusts an offset — a file can be rewritten between the edit and the undo (an agent, the
// code editor). Undoing a DUPLICATE means taking a slice out, and the slice's own text is the
// address, exactly like `planReverse`. Undoing a REMOVE means putting text back where there is
// nothing to compare against, so the address is the NEIGHBOURHOOD: the text on each side of the hole
// has to still be there, side by side.

/**
 * The sentence about a slice that could not be delimited is the move's, deliberately reused: it talks
 * about the markup not looking closed, which is the same fact whoever asked.
 */
export const SLICE_UNCLOSED = MOVE_UNCLOSED;
export const SLICE_MOUNTED_ROOT: IMessageRef = { id: 'reason.sliceMountedRoot' };
export const SLICE_NO_TARGET: IMessageRef = { id: 'reason.sliceNoTarget' };
export const SLICE_STALE: IMessageRef = { id: 'reason.sliceStale' };

/**
 * How much text on each side of a removal is kept as its address.
 *
 * Enough to be unique in a generated one-line template (40 characters spans several attributes) and
 * short enough that a session's worth of steps is not a copy of the file.
 */
export const CONTEXT_CHARS = 40;

/** Where a duplication puts the copy: right after the original, in the SOURCE's coordinates. */
export interface IDuplicatePlan {
  ok: true;
  slice: { start: number; end: number };
  insertAt: number;
}

/** What a removal takes out. */
export interface IRemovePlan {
  ok: true;
  slice: { start: number; end: number };
}

/** Text going in at an offset — the undo of a removal, and the redo of a duplication. */
export interface IInsertPlan {
  ok: true;
  at: number;
  text: string;
}

export type DuplicatePlan = IDuplicatePlan | { ok: false; reason: IMessageRef };
export type RemovePlan = IRemovePlan | { ok: false; reason: IMessageRef };
export type InsertPlan = IInsertPlan | { ok: false; reason: IMessageRef };

export type InsertResult =
  | { ok: true; source: string; inserted: { start: number; end: number } }
  | { ok: false; reason: IMessageRef };

export type RemoveResult =
  | {
    ok: true;
    source: string;
    /** The text taken out — the payload of the undo. */
    removed: string;
    /** The text that now sits on each side of the hole: the address the undo is revalidated on. */
    before: string;
    after: string;
  }
  | { ok: false; reason: IMessageRef };

/** What both planners refuse, in the order the user needs to hear it. */
function refuseSlice(source: string, tree: ITemplateTree, index: number): IMessageRef | null {
  const element = tree.elements[index];
  if (!element) return SLICE_NO_TARGET;
  // Before the slice check: a mounted root's slice is perfectly closed, and reporting "unclosed" for
  // it would send the user looking for a bug in their markup.
  if (isMountedRoot(tree, index)) return SLICE_MOUNTED_ROOT;
  if (!sliceIsWhole(source, element.openStart, element.end)) return SLICE_UNCLOSED;
  return null;
}

/**
 * The copy goes right after the original — the only position that needs no decision.
 *
 * Not "at the end of the parent", not "where the pointer is": next to what was pointed at is what
 * "one more of these" means, and it is also the only place where the copy is certainly among
 * siblings that accept it.
 */
export function planDuplicate(source: string, tree: ITemplateTree, index: number): DuplicatePlan {
  const refusal = refuseSlice(source, tree, index);
  if (refusal) return { ok: false, reason: refusal };
  const element = tree.elements[index];
  return { ok: true, slice: { start: element.openStart, end: element.end }, insertAt: element.end };
}

/** The slice that goes away — the same delimitation, with nothing put back. */
export function planRemove(source: string, tree: ITemplateTree, index: number): RemovePlan {
  const refusal = refuseSlice(source, tree, index);
  if (refusal) return { ok: false, reason: refusal };
  const element = tree.elements[index];
  return { ok: true, slice: { start: element.openStart, end: element.end } };
}

/**
 * Takes a slice out that is expected to hold exactly `slice` — the undo of a duplication.
 *
 * Revalidated on the TEXT, like the move's `planReverse`: if the copy is not where the step says it
 * is, the step is refused and the branch goes with it.
 */
export function planRemoveSlice(
  source: string,
  span: { start: number; end: number },
  slice: string,
): RemovePlan {
  if (span.start < 0 || span.end > source.length || span.end <= span.start) {
    return { ok: false, reason: SLICE_STALE };
  }
  if (source.slice(span.start, span.end) !== slice) return { ok: false, reason: SLICE_STALE };
  return { ok: true, slice: { ...span } };
}

/**
 * Puts a removed slice back — the undo of a removal.
 *
 * There is nothing at `at` to compare against, so the address is the NEIGHBOURHOOD: the text that was
 * on each side of the hole has to still be there, side by side. That is what makes this safe against
 * a file rewritten in between — the offset alone would happily insert markup into the middle of a
 * string literal.
 */
export function planRestore(
  source: string,
  at: number,
  text: string,
  context: { before: string; after: string },
): InsertPlan {
  if (at < 0 || at > source.length) return { ok: false, reason: SLICE_STALE };
  if (source.slice(Math.max(0, at - context.before.length), at) !== context.before) {
    return { ok: false, reason: SLICE_STALE };
  }
  if (source.slice(at, at + context.after.length) !== context.after) {
    return { ok: false, reason: SLICE_STALE };
  }
  return { ok: true, at, text };
}

/** Text in, nothing else touched. The simplest of the three operations. */
export function applyInsert(source: string, plan: IInsertPlan): InsertResult {
  if (plan.at < 0 || plan.at > source.length) return { ok: false, reason: SLICE_NO_TARGET };
  if (!plan.text) return { ok: false, reason: SLICE_NO_TARGET };
  return {
    ok: true,
    source: source.slice(0, plan.at) + plan.text + source.slice(plan.at),
    inserted: { start: plan.at, end: plan.at + plan.text.length },
  };
}

/**
 * The slice out, and the address of the hole it leaves.
 *
 * Whitespace is left exactly as it is — the same decision the move made. Trimming the blank line a
 * removal leaves behind would make the undo no longer byte for byte, which is the property the whole
 * stack is built on.
 */
export function applyRemove(source: string, plan: IRemovePlan): RemoveResult {
  const { start, end } = plan.slice;
  if (!sliceIsWhole(source, start, end)) return { ok: false, reason: SLICE_UNCLOSED };
  return {
    ok: true,
    source: source.slice(0, start) + source.slice(end),
    removed: source.slice(start, end),
    before: source.slice(Math.max(0, start - CONTEXT_CHARS), start),
    after: source.slice(end, end + CONTEXT_CHARS),
  };
}

/**
 * The `id="…"` values a slice carries.
 *
 * A copy carries the id too, and the generated pages tie labels to controls with it
 * (`<label for>`, `aria-labelledby`) — two elements with the same id break that quietly. Renaming
 * cannot be done safely from here (the reference may be in another file, or computed), so the answer
 * is to NAME them and let the user decide.
 */
export function duplicatedIds(slice: string): string[] {
  const found = new Set<string>();
  for (const match of slice.matchAll(/(?<![\w.?@:-])id\s*=\s*"([^"$]+)"/gu)) found.add(match[1]);
  return [...found];
}
