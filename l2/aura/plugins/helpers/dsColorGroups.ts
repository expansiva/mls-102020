/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsColorGroups.ts" enhancement="_blank"/>

// Color rows of the L5 → UI editor grouped by ROLE: the base plus its `-hover` / `-focus` /
// `-disabled` states (naming convention in `_102029_/l2/designSystemBase.ts`). Generic — custom
// tokens group the same way as the mandatory roles; a state whose base is not among the rows stays
// a group of its own. Indexes point into the ORIGINAL rows array, so remove-by-index keeps working.

export type ColorStateName = 'hover' | 'focus' | 'disabled';
export const STATE_ORDER: readonly ColorStateName[] = ['hover', 'focus', 'disabled'];

export interface IndexedRow<R> { row: R; index: number; }

export interface ColorGroup<R> {
  base: IndexedRow<R>;
  /** In STATE_ORDER; empty for a token without states. */
  states: (IndexedRow<R> & { state: ColorStateName })[];
}

/** `button-primary-bg-hover` → { base: 'button-primary-bg', state: 'hover' }; no state suffix → null. */
export function splitState(name: string): { base: string; state: ColorStateName } | null {
  const n = name.trim();
  for (const state of STATE_ORDER) {
    const suffix = `-${state}`;
    if (n.length > suffix.length && n.endsWith(suffix)) return { base: n.slice(0, -suffix.length), state };
  }
  return null;
}

export function groupColorRows<R extends { name: string }>(rows: readonly R[]): ColorGroup<R>[] {
  const baseIndex = new Map<string, number>();
  rows.forEach((r, i) => {
    const n = r.name.trim();
    if (n && !splitState(n) && !baseIndex.has(n)) baseIndex.set(n, i);
  });

  // Bases (and loose rows) first, so a state listed BEFORE its base still finds the group.
  const groups = new Map<number, ColorGroup<R>>();
  const states: (IndexedRow<R> & { state: ColorStateName; owner: number })[] = [];
  rows.forEach((row, index) => {
    const split = splitState(row.name);
    const owner = split ? baseIndex.get(split.base) : undefined;
    if (split && owner !== undefined) states.push({ row, index, state: split.state, owner });
    else groups.set(index, { base: { row, index }, states: [] });
  });
  for (const s of states) {
    const group = groups.get(s.owner)!;
    // A duplicate state name stays a loose row — never silently hidden.
    if (group.states.some(x => x.state === s.state)) groups.set(s.index, { base: { row: s.row, index: s.index }, states: [] });
    else group.states.push({ row: s.row, index: s.index, state: s.state });
  }

  return [...groups.keys()].sort((a, b) => a - b).map(i => {
    const g = groups.get(i)!;
    g.states.sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state));
    return g;
  });
}
