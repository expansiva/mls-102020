/// <mls fileReference="_102020_/l2/dsMatch/matchVariant.ts" enhancement="_blank" />

// Fase A3 — resolve which molecule of a group to use for a DS (DSDefinition.md §2).
//
// PURE function: same (group, dsRules, catalog order) → same result.
// This is what guarantees consistency by construction (page 1 and page 2 cannot diverge).
//
//   1. AND over declared axes      (an omitted axis = wildcard)
//   2. specificity wins            (more coincident axes)
//   3. tie → catalog order         (the first one wins)
//   4. nothing matches → null      (NO assignment; a wrong molecule is worse than none —
//                                   the organism keeps its original UI. No arbitrary fallback.)

import type { ResolvedDs, MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';

export interface MatchResult {
    entry: MoleculeCatalogEntry;
    /** always true now (a result is only returned on a real match/wildcard). */
    matched: boolean;
    /** number of declared axes that coincided (0 for a wildcard match). */
    specificity: number;
}

/**
 * @returns the matched molecule, or `null` when nothing matches the DS for this group
 *          (no AND match and no wildcard) — in which case NO molecule is assigned.
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

    // No molecule matches this DS for the group → NO assignment. Returning an arbitrary
    // variant (e.g. the catalog-first one) produced wrong choices (a grid became a
    // calendar). Better to assign nothing and keep the organism's original UI.
    return null;
}
