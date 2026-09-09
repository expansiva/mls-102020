/// <mls fileReference="_102020_/l2/aura/studio/studioMoveEdit.ts" enhancement="_blank" />
// Moving an element among its siblings, in the source (TASK-102020-move-elements).
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
