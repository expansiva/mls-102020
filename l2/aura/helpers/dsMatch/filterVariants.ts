/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/filterVariants.ts" enhancement="_blank" />

// The layout rules FILTER the candidate variants of a group; the LLM (Agent2) then picks
// among them by SEMANTIC fit. Only variants that actually ATTEND the configured layout
// reach the LLM:
//
//   Pass 1 — compatibility: a variant is out when it DECLARES a configured axis with a
//   DIFFERENT value. Axes it does not declare are wildcards; axes not configured are free.
//
//   Pass 2 — explicit match beats wildcard, per configured axis: when at least one candidate
//   DECLARES a configured axis (necessarily matching it, by pass 1), candidates that leave
//   that axis undeclared do NOT attend the layout and drop out (e.g. layout wants
//   labelPlacement=floating; ml-floating-number-input declares it → plain ml-number-input is
//   no candidate). When NO candidate declares the axis, wildcards survive — the group simply
//   has no variant for that axis and shouldn't be emptied by it.
//
// We filter WITHIN the group Agent1 picked. If the result is empty (the layout demands a
// value no variant of this group offers — e.g. recordsView=table against groupViewData),
// no candidate is produced and the element keeps its plain control.

import type { ResolvedLayoutRules, MoleculeCatalogEntry } from '/_102020_/l2/aura/helpers/dsMatch/types.js';

export function filterCompatibleVariants(
    group: string,
    dsRules: ResolvedLayoutRules,
    configuredAxes: Set<string>,
    catalog: MoleculeCatalogEntry[],
): MoleculeCatalogEntry[] {
    // Pass 1 — drop variants that contradict a configured axis they declare.
    let candidates = catalog.filter(m => {
        if (m.group !== group) return false;
        for (const [axis, value] of Object.entries(m.layoutConfig)) {
            if (configuredAxes.has(axis) && dsRules[axis as keyof ResolvedLayoutRules] !== value) return false;
        }
        return true;
    });

    // Pass 2 — per configured axis (sorted for determinism): explicit match beats wildcard.
    for (const axis of [...configuredAxes].sort()) {
        const declaring = candidates.filter(m => axis in m.layoutConfig);
        if (declaring.length > 0 && declaring.length < candidates.length) candidates = declaring;
    }
    return candidates;
}
