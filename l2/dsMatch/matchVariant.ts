/// <mls fileReference="_102020_/l2/dsMatch/matchVariant.ts" enhancement="_blank" />

// Fase A3 — resolve which molecule of a group to use for a DS (DSDefinition.md §2).
//
// PURE function: same (group, dsRules, catalog order) → same result.
// This is what guarantees consistency by construction (page 1 and page 2 cannot diverge).
//
//   1. AND over declared axes      (an omitted axis = wildcard)
//   2. specificity wins            (more coincident axes)
//   3. tie → catalog order         (the first one wins)
//   4. nothing matches → fallback  (first molecule of the group in catalog order)

import type { ResolvedDs, MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';

export interface MatchResult {
    entry: MoleculeCatalogEntry;
    /** true: matched by axes; false: it is the fallback (no molecule matched). */
    matched: boolean;
    /** number of declared axes that coincided (0 for wildcard/fallback). */
    specificity: number;
}

/**
 * @returns the match, or `null` only when the group has no molecules at all.
 */
export function matchVariant(
    group: string,
    dsRules: ResolvedDs,
    catalog: MoleculeCatalogEntry[],
): MatchResult | null {

    // `filter` preserves catalog order → basis of the tie-break.
    const candidates = catalog.filter(m => m.group === group);
    if (candidates.length === 0) return null;

    let best: { entry: MoleculeCatalogEntry; specificity: number } | null = null;

    for (const entry of candidates) {
        const declared = Object.entries(entry.layoutConfig);

        // AND: every declared axis must match the DS.
        let ok = true;
        for (const [axis, value] of declared) {
            if (dsRules[axis as keyof ResolvedDs] !== value) { ok = false; break; }
        }
        if (!ok) continue;

        const specificity = declared.length;
        // Strict `>` keeps the FIRST on a tie (catalog order).
        if (!best || specificity > best.specificity) {
            best = { entry, specificity };
        }
    }

    if (best) return { entry: best.entry, matched: true, specificity: best.specificity };

    // Deterministic fallback: no molecule matched → first of the group in catalog order.
    return { entry: candidates[0], matched: false, specificity: 0 };
}
