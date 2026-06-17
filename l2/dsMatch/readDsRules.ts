/// <mls fileReference="_102020_/l2/dsMatch/readDsRules.ts" enhancement="_blank" />

// Fase A1 — resolve the DS axes of a project's design system.
// Reads project.json via libProjectConfig and fills undeclared axes with the
// vocabulary `default` (DSDefinition.md §2.4: an undeclared axis falls back to its default).

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { dsDefaults, isValidAxisValue, type DsAxisKey } from '/_102020_/l2/designSystemAuraBase.js';
import type { ResolvedDs } from '/_102020_/l2/dsMatch/types.js';

/**
 * @param project  project number (e.g. 102043)
 * @param dsIndex  design system index in `designSystems` (e.g. 2 or "2")
 * @returns every axis resolved (DS rules layered over the vocabulary defaults)
 */
export async function readDsRules(project: number, dsIndex: number | string): Promise<ResolvedDs> {

    const config: any = await getConfigProject(project);
    if (!config) throw new Error(`[readDsRules] project config not found: ${project}`);

    const designSystems = config.designSystems;
    if (!designSystems || typeof designSystems !== 'object') {
        throw new Error(`[readDsRules] no 'designSystems' in project ${project}`);
    }

    const key = String(dsIndex);
    const ds = (designSystems as Record<string, any>)[key];
    if (!ds) throw new Error(`[readDsRules] designSystem '${key}' not found in project ${project}`);

    const rules: Record<string, string> =
        (ds.rules && typeof ds.rules === 'object') ? ds.rules : {};

    // Start from every axis at its default, then override with the DS's valid rules.
    const resolved = dsDefaults() as ResolvedDs;
    for (const [axis, value] of Object.entries(rules)) {
        if (typeof value !== 'string') continue;
        if (!isValidAxisValue(axis, value)) {
            console.warn(`[readDsRules] ${project}/ds${key}: ignoring invalid axis value ${axis}=${String(value)}`);
            continue;
        }
        resolved[axis as DsAxisKey] = value;
    }

    return resolved;
}
