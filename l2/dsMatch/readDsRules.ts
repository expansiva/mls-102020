/// <mls fileReference="_102020_/l2/dsMatch/readDsRules.ts" enhancement="_blank" />

// Resolve the rule axes of a project's LAYOUT (base rules).
// Reads project.json via libProjectConfig and fills undeclared axes with the
// vocabulary `default` (an undeclared axis falls back to its default).

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { layoutRuleDefaults, isValidAxisValue, type LayoutAxisKey } from '/_102020_/l2/designSystemAuraBase.js';
import type { ResolvedLayoutRules } from '/_102020_/l2/dsMatch/types.js';

/**
 * @param project project number (e.g. 102043)
 * @param layout  layout index in `layouts` (e.g. 1 or "1")
 * @returns every axis resolved (layout base rules layered over the vocabulary defaults)
 */
export async function readLayoutRules(project: number, layout: number | string): Promise<ResolvedLayoutRules> {

    const config: any = await getConfigProject(project);
    if (!config) throw new Error(`[readLayoutRules] project config not found: ${project}`);

    const layouts = config.layouts;
    if (!layouts || typeof layouts !== 'object') {
        throw new Error(`[readLayoutRules] no 'layouts' in project ${project}`);
    }

    const key = String(layout);
    const lay = (layouts as Record<string, any>)[key];
    if (!lay) throw new Error(`[readLayoutRules] layout '${key}' not found in project ${project}`);

    const rules: Record<string, string> =
        (lay.rules && typeof lay.rules === 'object') ? lay.rules : {};

    // Start from every axis at its default, then override with the layout's valid rules.
    const resolved = layoutRuleDefaults() as ResolvedLayoutRules;
    for (const [axis, value] of Object.entries(rules)) {
        if (typeof value !== 'string') continue;
        if (!isValidAxisValue(axis, value)) {
            console.warn(`[readLayoutRules] ${project}/layout${key}: ignoring invalid axis value ${axis}=${String(value)}`);
            continue;
        }
        resolved[axis as LayoutAxisKey] = value;
    }

    return resolved;
}

/**
 * The axis keys the LAYOUT configured EXPLICITLY (the raw base `rules`, not the defaults).
 * Used to gate assignment: only swap an organism for a molecule when the layout actually
 * expressed a preference for an axis that governs that molecule's group.
 */
export async function readConfiguredAxisKeys(project: number, layout: number | string): Promise<Set<string>> {
    const config: any = await getConfigProject(project);
    const lay = config?.layouts?.[String(layout)];
    const rules = (lay?.rules && typeof lay.rules === 'object') ? lay.rules : {};
    const set = new Set<string>();
    for (const [axis, value] of Object.entries(rules)) {
        if (typeof value === 'string' && isValidAxisValue(axis, value)) set.add(axis);
    }
    return set;
}
