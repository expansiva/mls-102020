/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/resolveMolecules.ts" enhancement="_blank" />

// Fase C — deterministic variant resolution (pure helpers).
//
// The key idea: a DS axis is page-wide, so the molecule chosen for a group is
// resolved ONCE per DS (not per page/organism). matchVariant is already a pure
// function of (group, dsRules, catalog), so two pages cannot diverge — consistency
// by construction.
//
//   resolveMolecules — (group → molecule) for the DS, via matchVariant.
//   groupHasConfiguredAxis — the DS gate (skip groups the DS has no opinion on).
// Placement onto the page layout is done element-by-element in agentGenDefs (the LLM
// picks the group per element; matchVariant resolves the variant deterministically).
//
// Scale overrides (selectOne, listOverflow) depend on runtime volume (option/record
// counts) not available here; they are applied later at generation time, NOT in this
// deterministic table.

import { matchVariant } from '/_102020_/l2/aura/helpers/dsMatch/matchVariant.js';
import type { ResolvedLayoutRules, MoleculeCatalogEntry } from '/_102020_/l2/aura/helpers/dsMatch/types.js';

export interface ResolvedMolecule {
    project: number;      // molecule component project (e.g. 102040) — import origin
    group: string;
    tag: string;
    variant: string;
    objective: string;
    usagePath: string;
    matched: boolean;     // false = fallback (no molecule matched the DS axes)
    specificity: number;
}

/** group → the single molecule this DS resolves to. */
export type ResolvedMolecules = Record<string, ResolvedMolecule>;

export interface AssignedMolecule { project: number; group: string; tag: string; purpose: string; import?: string; }

/** True if any candidacy axis used by the group's molecules was explicitly configured in the DS. */
export function groupHasConfiguredAxis(group: string, catalog: MoleculeCatalogEntry[], configuredAxes: Set<string>): boolean {
    for (const m of catalog) {
        if (m.group !== group) continue;
        for (const axis of Object.keys(m.layoutConfig)) {
            if (configuredAxes.has(axis)) return true;
        }
    }
    return false;
}

/**
 * Resolve one molecule per group for the DS (DSDefinition §2, deterministic).
 * @param groups optional subset to resolve; defaults to every distinct group in the catalog.
 * @param configuredAxes optional set of axis keys the DS configured EXPLICITLY. When given,
 *        a group is only resolved if at least one of its molecules' candidacy axes
 *        (layoutConfig keys) was explicitly configured — otherwise the DS has no opinion on
 *        that group and we DON'T swap the organism (it keeps its original UI). Groups with no
 *        DS axis at all (chart/media/locate/scancode) are therefore never auto-assigned.
 */
export function resolveMolecules(
    dsRules: ResolvedLayoutRules,
    catalog: MoleculeCatalogEntry[],
    groups?: string[],
    configuredAxes?: Set<string>,
): ResolvedMolecules {
    const target = (groups && groups.length)
        ? [...new Set(groups)]
        : [...new Set(catalog.map(m => m.group))];

    const out: ResolvedMolecules = {};
    for (const group of target) {
        // (2) Gate: only assign when the DS explicitly configured an axis that governs this group.
        if (configuredAxes && !groupHasConfiguredAxis(group, catalog, configuredAxes)) {
            continue;
        }
        const r = matchVariant(group, dsRules, catalog);
        if (!r) continue; // (1) nothing matches → no assignment (keep original UI)
        out[group] = {
            project: r.entry.project,
            group,
            tag: r.entry.tag,
            variant: r.entry.variant,
            objective: r.entry.objective,
            usagePath: r.entry.usagePath,
            matched: r.matched,
            specificity: r.specificity,
        };
    }
    return out;
}

