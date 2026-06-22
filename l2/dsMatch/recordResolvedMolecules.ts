/// <mls fileReference="_102020_/l2/dsMatch/recordResolvedMolecules.ts" enhancement="_blank" />

// Record the DS-level molecule resolution table on the design system itself
// (designSystems[ds].resolvedMolecules), so a DS is self-documenting: which concrete
// molecule each group resolves to, plus matched/fallback and the source project.
//
// This is MODULE-AGNOSTIC: it is a pure function of (DS rules + molecule catalog), so
// it can be computed when the DS is created/edited — it does not need a derivation run.
// A `catalogVersion` signature is stored alongside so staleness can be detected when the
// molecule catalog changes (recompute when it differs).

import { readDsRules } from '/_102020_/l2/dsMatch/readDsRules.js';
import { buildMoleculeCatalog } from '/_102020_/l2/dsMatch/buildMoleculeCatalog.js';
import { resolveMolecules, persistResolvedMolecules, type ResolvedMolecules } from '/_102020_/l2/dsMatch/resolveMolecules.js';
import { listWorkItems } from '/_102020_/l2/dsMatch/derivePaths.js';
import type { MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';

export interface DsResolution {
    resolvedMolecules: ResolvedMolecules;
    catalogVersion: string;
}

/** What actually gets written on the DS: only `project` + `tag` per group (slim). */
export type SlimResolvedMolecules = Record<string, { project: number; tag: string }>;

/** Project the rich resolution table down to { project, tag } per group (for persistence). */
export function toSlimTable(resolved: ResolvedMolecules): SlimResolvedMolecules {
    const slim: SlimResolvedMolecules = {};
    for (const [group, m] of Object.entries(resolved)) slim[group] = { project: m.project, tag: m.tag };
    return slim;
}

/**
 * Pure: deterministic signature of the catalog (count + hash of tag+layoutConfig).
 * Changes whenever a molecule is added/removed or its candidacy (layoutConfig) changes.
 */
export function catalogSignature(catalog: MoleculeCatalogEntry[]): string {
    const serialized = [...catalog]
        .map(m => `${m.project}|${m.group}|${m.tag}|${JSON.stringify(sortedAxes(m.layoutConfig))}`)
        .sort()
        .join('\n');
    return `${catalog.length}-${hash(serialized)}`;
}

/** Pure: build the DS-level resolution (full table over every catalog group) + signature. */
export function buildDsResolution(
    dsRules: Parameters<typeof resolveMolecules>[0],
    catalog: MoleculeCatalogEntry[],
): DsResolution {
    const resolvedMolecules = resolveMolecules(dsRules, catalog); // full table (module-agnostic)
    return { resolvedMolecules, catalogVersion: catalogSignature(catalog) };
}

/**
 * Compute and persist the resolution table for designSystems[dsIndex].
 * @param project the project whose project.json holds the DS (e.g. 102043)
 */
export async function recordResolvedMolecules(project: number, dsIndex: number | string): Promise<DsResolution> {
    const dsRules = await readDsRules(project, dsIndex);
    const catalog = await buildMoleculeCatalog();
    const resolution = buildDsResolution(dsRules, catalog);
    await persistResolvedMolecules(project, dsIndex, toSlimTable(resolution.resolvedMolecules), resolution.catalogVersion);
    return resolution;
}

// ─── record ONLY the molecules the pages actually used (flow terminal step) ──

/**
 * The molecules the pages ACTUALLY used, read from each page's `moleculeAssignments`
 * export (written by Agent2 — the LLM's per-page choice). Keyed by group → { project, tag }
 * (slim). Since the choice is now per page (LLM), we record what was used, NOT a
 * deterministic re-resolution.
 *
 * Reads the RAW .defs.ts source from the stor (not collabImport): this runs right after
 * the agent saved the defs, and collabImport serves the compiled `.defs.js` at a fixed,
 * cache-busterless URL — which lags the just-written source and would miss the export.
 */
export async function collectUsedMoleculesFromPages(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    device: string,
): Promise<SlimResolvedMolecules> {
    const items = listWorkItems(project, module, layout, ds, device);
    const out: SlimResolvedMolecules = {};
    for (const item of items) {
        try {
            const content = await readDefsSource(item.defsDestino);
            const assignments = parseMoleculeAssignments(content);
            if (!Array.isArray(assignments)) { console.warn(`[collectUsedMoleculesFromPages] no moleculeAssignments in ${item.page}`); continue; }
            for (const org of assignments) {
                for (const m of (org?.molecules || [])) {
                    if (m?.group && m?.tag && !out[m.group]) out[m.group] = { project: m.project ?? 0, tag: m.tag };
                }
            }
        } catch (err) {
            console.warn(`[collectUsedMoleculesFromPages] skip ${item.page}`, err);
        }
    }
    return out;
}

/** Read raw .defs.ts source from the stor (current saved content — no compile/cache lag). */
async function readDefsSource(ref: string): Promise<string> {
    const norm = ref.startsWith('/') ? ref.slice(1) : ref;
    const info = mls.stor.convertFileReferenceToFile(norm);
    const key = mls.stor.getKeyToFile(info);
    const sf = (mls.stor.files as Record<string, any>)[key];
    if (!sf) return '';
    const content = await sf.getContent();
    return typeof content === 'string' ? content : '';
}

/** Parse the `export const moleculeAssignments = [...] as const;` array from raw source. */
function parseMoleculeAssignments(
    content: string,
): Array<{ molecules?: Array<{ project?: number; group?: string; tag?: string }> }> | null {
    const m = content.match(/export\s+const\s+moleculeAssignments\s*=\s*(\[[\s\S]*?\])\s+as\s+const\s*;/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch { return null; }
}

/**
 * Flow terminal step: record on the DS ONLY the molecules the pages actually used
 * (the LLM's per-page choices), as the slim `{ project, tag }` table + catalogVersion.
 * @param project the project that holds the module + DS (e.g. 102043)
 */
export async function recordUsedMolecules(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    device = 'desktop',
): Promise<{ resolvedMolecules: SlimResolvedMolecules; catalogVersion: string }> {
    const used = await collectUsedMoleculesFromPages(project, module, layout, ds, device);
    const catalogVersion = catalogSignature(await buildMoleculeCatalog());
    await persistResolvedMolecules(project, ds, used, catalogVersion);
    return { resolvedMolecules: used, catalogVersion };
}

// ─── helpers ──────────────────────────────────────────────────────────────

function sortedAxes(axes: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of Object.keys(axes).sort()) out[k] = axes[k];
    return out;
}

/** Small deterministic string hash (FNV-1a, 32-bit) — no mls dependency, testable. */
function hash(s: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}
