/// <mls fileReference="_102020_/l2/dsMatch/resolveMolecules.ts" enhancement="_blank" />

// Fase C — deterministic variant resolution + the per-DS resolution table.
//
// The key idea: a DS axis is page-wide, so the molecule chosen for a group is
// resolved ONCE per DS (not per page/organism). matchVariant is already a pure
// function of (group, dsRules, catalog), so two pages cannot diverge — consistency
// by construction (this is what makes Fase D / Agent3 a mere audit, not the
// mechanism).
//
// Pipeline here:
//   1. collectUsedGroups  — distinct groups Agent1 selected across all pages
//   2. resolveMolecules   — (group → molecule) for the DS, via matchVariant
//   3. assignMoleculesToPage — combine Agent1 output + the table → per-organism molecules
//   4. persistResolvedMolecules — write the table into designSystems[dsIndex]
//
// Scale overrides (selectOne, listOverflow) depend on runtime volume (option/record
// counts) not available here; they are applied later at generation time, NOT in this
// deterministic table.

import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { matchVariant } from '/_102020_/l2/dsMatch/matchVariant.js';
import type { ResolvedDs, MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';
import type { Agent1Output } from '/_102020_/l2/dsMatch/agent1.js';

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

export interface AssignedMolecule { project: number; group: string; tag: string; purpose: string; }
export interface OrganismAssignment { organismName: string; molecules: AssignedMolecule[]; }
export interface PageAssignment { path: string; organisms: OrganismAssignment[]; }

/** Distinct groups Agent1 selected across all pages, sorted. */
export function collectUsedGroups(outputs: Agent1Output[]): string[] {
    const set = new Set<string>();
    for (const out of outputs) {
        for (const po of out.perOrganism) {
            for (const g of po.groups) set.add(g);
        }
    }
    return [...set].sort();
}

/**
 * Resolve one molecule per group for the DS (DSDefinition §2, deterministic).
 * @param groups optional subset to resolve; defaults to every distinct group in the catalog.
 */
export function resolveMolecules(
    dsRules: ResolvedDs,
    catalog: MoleculeCatalogEntry[],
    groups?: string[],
): ResolvedMolecules {
    const target = (groups && groups.length)
        ? [...new Set(groups)]
        : [...new Set(catalog.map(m => m.group))];

    const out: ResolvedMolecules = {};
    for (const group of target) {
        const r = matchVariant(group, dsRules, catalog);
        if (!r) { console.warn(`[resolveMolecules] no molecules for group '${group}' (skipped)`); continue; }
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

/**
 * Combine one page's Agent1 output with the resolution table into per-organism
 * molecule assignments (the canonical defs shape: { group, tag, purpose }).
 * Groups absent from the table are skipped.
 */
export function assignMoleculesToPage(output: Agent1Output, resolved: ResolvedMolecules): PageAssignment {
    const organisms: OrganismAssignment[] = output.perOrganism.map(po => ({
        organismName: po.organismName,
        molecules: po.groups
            .map(g => resolved[g])
            .filter((rm): rm is ResolvedMolecule => !!rm)
            .map(rm => ({ project: rm.project, group: rm.group, tag: rm.tag, purpose: rm.objective })),
    }));
    return { path: output.path, organisms };
}

/** Distinct usagePaths for a page's assignment (feeds `moleculesPaths` in the pipeline, Fase E). */
export function collectUsagePaths(assignment: PageAssignment, resolved: ResolvedMolecules): string[] {
    const set = new Set<string>();
    for (const org of assignment.organisms) {
        for (const m of org.molecules) {
            const rm = resolved[m.group];
            if (rm?.usagePath) set.add(rm.usagePath);
        }
    }
    return [...set].sort();
}

/**
 * Persist the resolution table as `designSystems[dsIndex].resolvedMolecules` in
 * project.json. Idempotent: re-running with the same DS overwrites the same field.
 */
export async function persistResolvedMolecules(
    project: number,
    dsIndex: number | string,
    resolved: Record<string, unknown>, // the table to write (slim or full)
    catalogVersion?: string,
): Promise<void> {
    const config: any = await getConfigProject(project);
    if (!config) throw new Error(`[persistResolvedMolecules] project config not found: ${project}`);

    const designSystems = config.designSystems;
    if (!designSystems || typeof designSystems !== 'object') {
        throw new Error(`[persistResolvedMolecules] no 'designSystems' in project ${project}`);
    }

    const key = String(dsIndex);
    const ds = designSystems[key];
    if (!ds) throw new Error(`[persistResolvedMolecules] designSystem '${key}' not found in project ${project}`);

    ds.resolvedMolecules = resolved;
    if (catalogVersion !== undefined) ds.catalogVersion = catalogVersion;
    await updateConfigProject(project, config);
}
