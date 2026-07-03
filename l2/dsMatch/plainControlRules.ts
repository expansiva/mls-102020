/// <mls fileReference="_102020_/l2/dsMatch/plainControlRules.ts" enhancement="_blank" />

// Task 13 — layout rules for PLAIN controls (elements left WITHOUT a molecule).
//
// When Agent2 rejects every candidate (or Agent1 maps no group), the element keeps its
// plain HTML control — but the plain control must still follow the layout rules the page
// configured (e.g. labelPlacement=floating). agentGenDefs (Fase E) calls
// `rulesForPlainElement` per molecule-less element and stamps the result as
// `el.layoutRules` in the final defs; the render skill implements those axes on the
// plain control. Elements WITH a molecule never get `layoutRules` — the molecule was
// filtered BY those axes and already implements them.
//
// Which axes apply to an element:
//   - group known (Agent2 rejected): the configured axes whose vocabulary `groups` list
//     contains that group (layoutAxes[axis].groups — doc-maintained; task 11);
//   - any field/filter (group known or not): plus the configured input-transversal render
//     axes (labelPlacement, validation, requiredMark), which declare no `groups` in the
//     vocabulary but govern every labeled input.

import { layoutAxes, layoutAxisKeys, type ILayoutAxisDef, type LayoutAxisKey } from '/_102020_/l2/designSystemAuraBase.js';
import type { ResolvedLayoutRules } from '/_102020_/l2/dsMatch/types.js';
import type { ElementKind } from '/_102020_/l2/dsMatch/layoutElements.js';

/** Transversal render axes that govern any labeled input, even without a group. */
export const INPUT_TRANSVERSAL_AXES: readonly LayoutAxisKey[] = ['labelPlacement', 'validation', 'requiredMark'];

/** Configured axes that govern `group`, via the vocabulary's axis→groups map. */
export function axesForGroup(group: string, configuredAxes: Set<string>): LayoutAxisKey[] {
    return layoutAxisKeys.filter(k =>
        configuredAxes.has(k) && (((layoutAxes[k] as ILayoutAxisDef).groups) ?? []).includes(group));
}

/**
 * The `layoutRules` object to stamp on a molecule-less element, or null when no
 * configured axis applies (caller then OMITS the key — never write `layoutRules: {}`).
 * Axes come out in vocabulary order; values are the page's resolved cascade values.
 */
export function rulesForPlainElement(
    kind: ElementKind,
    group: string | null,
    rules: ResolvedLayoutRules,
    configuredAxes: Set<string>,
): Record<string, string> | null {
    const wanted = new Set<LayoutAxisKey>();
    if (group) for (const k of axesForGroup(group, configuredAxes)) wanted.add(k);
    if (kind === 'field' || kind === 'filter') {
        for (const k of INPUT_TRANSVERSAL_AXES) if (configuredAxes.has(k)) wanted.add(k);
    }
    if (!wanted.size) return null;

    const out: Record<string, string> = {};
    for (const k of layoutAxisKeys) if (wanted.has(k)) out[k] = rules[k];
    return out;
}
