/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/resolveRulesForPage.ts" enhancement="_blank" />

// G1 — Layout rule cascade: base → module → page (per page file).
// All three live centrally in project.json under layouts[layout]:
//   rules           (layout base)
//   moduleOverrides : { [module]: Partial<rules> }
//   pageOverrides   : { ["{module}/{pageName}"]: Partial<rules> }
//
// The more specific level wins. A value of "unset" at any level REMOVES the axis from the
// configured set (relaxing it — the filter then imposes no constraint on that axis).
// Only valid axis values survive (invalid ones are ignored).
//
// `resolveRulesForPage` returns { rules, configuredAxes } in one pass — what Agent2
// (filterCompatibleVariants) and the staleness check consume.

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { layoutRuleDefaults, isValidAxisValue, type LayoutAxisKey } from '/_102020_/l2/aura/helpers/designSystemAuraBase.js';
import type { ResolvedLayoutRules } from '/_102020_/l2/aura/helpers/dsMatch/types.js';

/** Sentinel value that removes an inherited rule (relax the axis). Not a valid axis value. */
export const UNSET = 'unset';

export type RuleSource = 'project' | 'module' | 'page';
export interface AxisProvenance { value: string; source: RuleSource; }

export interface EffectiveRules {
    /** every axis at its default, with the cascade applied on top. */
    rules: ResolvedLayoutRules;
    /** axes explicitly configured across the cascade, minus those `unset` by a more specific level. */
    configuredAxes: Set<string>;
}

// ─── pure core ──────────────────────────────────────────────────────────────

interface Level { source: RuleSource; rules?: Record<string, string> }

/** Walk the levels (project → module → page) tracking each axis's final value + origin. */
function cascade(levels: Level[]): { effective: Record<string, AxisProvenance>; unset: Set<string> } {
    const effective: Record<string, AxisProvenance> = {};
    const unset = new Set<string>();
    for (const { source, rules } of levels) {
        if (!rules || typeof rules !== 'object') continue;
        for (const [axis, value] of Object.entries(rules)) {
            if (typeof value !== 'string') continue;
            if (value === UNSET) { delete effective[axis]; unset.add(axis); continue; }
            if (!isValidAxisValue(axis, value)) continue; // ignore invalid (vocabulary-checked)
            effective[axis] = { value, source };
            unset.delete(axis); // a later concrete value cancels an earlier unset
        }
    }
    return { effective, unset };
}

/** Pure: merge the 3 levels into the configured axis→value map (post-unset). */
export function mergeRuleLevels(
    projectRules?: Record<string, string>,
    moduleOverride?: Record<string, string>,
    pageOverride?: Record<string, string>,
): Record<string, string> {
    const { effective } = cascade([
        { source: 'project', rules: projectRules },
        { source: 'module', rules: moduleOverride },
        { source: 'page', rules: pageOverride },
    ]);
    const out: Record<string, string> = {};
    for (const [axis, p] of Object.entries(effective)) out[axis] = p.value;
    return out;
}

/** Pure: fill every unset axis with the vocabulary default → full ResolvedLayoutRules. */
export function toResolvedLayoutRules(configured: Record<string, string>): ResolvedLayoutRules {
    const resolved = layoutRuleDefaults() as ResolvedLayoutRules;
    for (const [axis, value] of Object.entries(configured)) resolved[axis as LayoutAxisKey] = value;
    return resolved;
}

/**
 * Pure: per-axis provenance (value + which level set it) + the set of axes explicitly
 * `unset` at some level. Used by the scope-aware plugin (G3) to show inherited vs overridden.
 */
export function effectiveRulesProvenance(
    projectRules?: Record<string, string>,
    moduleOverride?: Record<string, string>,
    pageOverride?: Record<string, string>,
): { effective: Record<string, AxisProvenance>; unset: Set<string> } {
    return cascade([
        { source: 'project', rules: projectRules },
        { source: 'module', rules: moduleOverride },
        { source: 'page', rules: pageOverride },
    ]);
}

// ─── runtime ────────────────────────────────────────────────────────────────

/** Read the base/module/page rule buckets of a LAYOUT from project.json. */
async function readLayoutBuckets(project: number, layout: number | string, module: string, page: string): Promise<{
    baseRules: Record<string, string>;
    moduleOverride?: Record<string, string>;
    pageOverride?: Record<string, string>;
}> {
    const config: any = await getConfigProject(project);
    const lay = config?.layouts?.[String(layout)];
    if (!lay) throw new Error(`[resolveRulesForPage] layout '${layout}' not found in project ${project}`);
    return {
        baseRules: (lay.rules && typeof lay.rules === 'object') ? lay.rules : {},
        moduleOverride: lay.moduleOverrides?.[module],
        pageOverride: lay.pageOverrides?.[`${module}/${page}`],
    };
}

/** Resolve the effective layout rules + configured axes for a specific page (cascade). */
export async function resolveRulesForPage(
    project: number,
    module: string,
    page: string,
    layout: number | string,
): Promise<EffectiveRules> {
    const { baseRules, moduleOverride, pageOverride } = await readLayoutBuckets(project, layout, module, page);
    const configured = mergeRuleLevels(baseRules, moduleOverride, pageOverride);
    return { rules: toResolvedLayoutRules(configured), configuredAxes: new Set(Object.keys(configured)) };
}
