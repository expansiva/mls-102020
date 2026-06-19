/// <mls fileReference="_102020_/l2/dsMatch/filterVariants.ts" enhancement="_blank" />

// New model (replaces the deterministic single-pick): the DS FILTERS the candidate
// variants of a group; the LLM (Agent2) SELECTS the best one for the page.
//
// A variant is COMPATIBLE with the DS when it violates no EXPLICITLY configured axis:
//   - for each axis the variant declares that the DS configured → values must match;
//   - axes the DS did NOT configure → no constraint ("DS silent → all variants valid");
//   - a wildcard (empty layoutConfig) is always compatible.
//
// Option B (current): we filter WITHIN the group Agent1 picked. If the result is empty
// (DS demands a value no variant of this group offers — e.g. a cross-group axis like
// recordsView=table against groupViewData), no candidate is produced and the organism
// keeps its original UI. Option A (cross-group: include sibling groups of the axis) is a
// future improvement.

import type { ResolvedDs, MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';

export function filterCompatibleVariants(
    group: string,
    dsRules: ResolvedDs,
    configuredAxes: Set<string>,
    catalog: MoleculeCatalogEntry[],
): MoleculeCatalogEntry[] {
    return catalog.filter(m => {
        if (m.group !== group) return false;
        for (const [axis, value] of Object.entries(m.layoutConfig)) {
            if (configuredAxes.has(axis) && dsRules[axis as keyof ResolvedDs] !== value) return false;
        }
        return true;
    });
}
