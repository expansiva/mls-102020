/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/variationStatus.ts" enhancement="_blank" />

// Per-VARIATION status of a module (page{layout}{ds} folders), consolidated for the
// selectModule panel: which layout×DS combinations exist and how complete each one is.
//
// Per-page status inside a variation (pipeline order):
//   generation   → .defs.ts missing (page never generated for the variation)
//   materialize  → .defs.ts exists, rendered .ts missing
//   stale        → both exist but the DS check says 'stale' (gated: only when the layout
//                  has rules AND the defs carries a pageVersion stamp — origin/page11 defs
//                  have no stamp and count as fresh)
//   fresh        → everything current ('review' is informational and does NOT demote)
//
// The variation aggregates by worst stage: generation > materialize > stale > fresh.

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { getContentByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import { dsIndexNameMap } from '/_102020_/l2/aura/helpers/dsMatch/buildDesignSystemTs.js';
import { pageDsCheckByDefs, layoutHasRules } from '/_102020_/l2/aura/helpers/dsMatch/dsVersion.js';
import { buildMoleculeCatalog } from '/_102020_/l2/aura/helpers/dsMatch/buildMoleculeCatalog.js';

export type PageVariationStatus = 'generation' | 'materialize' | 'stale' | 'fresh';

export interface PageVariationEntry {
    page: string;                 // shortName, e.g. 'dashboardGerente'
    status: PageVariationStatus;
}

export interface ModuleVariationStatus {
    variation: string;            // 'page21'
    layout: number | string;      // 2
    ds: number | string;          // 1
    layoutName: string;           // 'sidebar'
    dsName: string;               // 'sunset'
    orphan: boolean;              // page* folder exists in the stor outside the configured combos
    status: PageVariationStatus;  // aggregated (worst stage wins)
    counts: Record<PageVariationStatus, number>;
    pages: PageVariationEntry[];
}

/** Default device path segment between module and variation folder. */
const DEFAULT_DEVICE_PATH = 'web/desktop';

// ─── pure: aggregation ────────────────────────────────────────────────────────

/** Pipeline order — the worst (earliest) stage present wins the variation status. */
export const VARIATION_STATUS_ORDER: PageVariationStatus[] = ['generation', 'materialize', 'stale', 'fresh'];

/** Aggregate per-page statuses into the variation status + counts. Pure — testable without stor. */
export function aggregateVariationStatus(pages: PageVariationEntry[]): {
    status: PageVariationStatus;
    counts: Record<PageVariationStatus, number>;
} {
    const counts: Record<PageVariationStatus, number> = { generation: 0, materialize: 0, stale: 0, fresh: 0 };
    for (const p of pages) counts[p.status]++;
    const status = VARIATION_STATUS_ORDER.find(s => counts[s] > 0) ?? 'fresh';
    return { status, counts };
}

// ─── stor helpers ─────────────────────────────────────────────────────────────

function fileExists(project: number, folder: string, shortName: string, extension: string): boolean {
    try {
        const key = mls.stor.getKeyToFile({ project, level: 2, folder, shortName, extension } as any);
        const file = (mls.stor.files as Record<string, any>)[key];
        return !!file && file.status !== 'deleted';
    } catch {
        return false;
    }
}

/** Distinct page{N} variation folder segments present in the stor for module/device. */
function scanVariationSegments(project: number, module: string, devicePath: string): string[] {
    const prefix = `${module}/${devicePath}/`;
    const out = new Set<string>();
    for (const f of Object.values(mls.stor.files) as any[]) {
        if (!f || f.project !== project || f.level !== 2 || f.status === 'deleted') continue;
        const folder = String(f.folder || '');
        if (!folder.startsWith(prefix)) continue;
        const seg = folder.slice(prefix.length);
        if (/^page\d+$/.test(seg)) out.add(seg);
    }
    return [...out];
}

// ─── page list resolution ─────────────────────────────────────────────────────

/**
 * Pages (shortNames) of a module for a device. Source of truth is the l0 config.json
 * (`frontend.pages`, written by the register step); fallback is a scan of the physical
 * page11 files in the stor — the same resolution the selectPage plugin uses.
 */
export async function listModulePages(
    project: number,
    module: string,
    devicePath = DEFAULT_DEVICE_PATH,
): Promise<string[]> {
    const out = new Set<string>();

    try {
        const content = await getContentByMlsPath(`_${project}_/l0/config.json`);
        if (content) {
            const config = JSON.parse(content);
            const moduleDef = config?.projects?.[String(project)]?.modules
                ?.find((m: any) => m.moduleId === module);
            const pages: any[] = moduleDef?.frontend?.pages ?? [];
            for (const page of pages) {
                // source: e.g. "l2/cafeFlow/web/desktop/page11/dashboardGerente.ts"
                const source: string = page.source ?? '';
                const relative = source.replace(/^\.?\//, '').replace(/\.ts$/, '');
                const m = relative.match(/^l\d+\/(.+)\/([^/]+)$/);
                if (!m) continue;
                const rawFolder = m[1];
                const shortName = m[2];
                if (!shortName) continue;
                if (!rawFolder.includes(`/${devicePath}/`) && !rawFolder.endsWith(`/${devicePath}`)) continue;
                out.add(shortName);
            }
        }
    } catch { /* fall through to the stor scan below */ }

    if (out.size) return [...out].sort();

    // Fallback: physical page11 files (always present after create).
    const originFolder = `${module}/${devicePath}/page11`;
    for (const f of Object.values(mls.stor.files) as any[]) {
        if (!f || f.project !== project || f.level !== 2 || f.status === 'deleted') continue;
        if (f.extension !== '.ts' || typeof f.shortName !== 'string' || !f.shortName) continue;
        if (String(f.folder || '') !== originFolder) continue;
        out.add(f.shortName);
    }
    return [...out].sort();
}

// ─── per-page / per-variation status ──────────────────────────────────────────

/**
 * Status of one page inside a variation. `hasRules` (layoutHasRules gate) can be passed
 * in to avoid recomputing it per page; when omitted it is resolved here.
 */
export async function pageStatusInVariation(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    devicePath = DEFAULT_DEVICE_PATH,
    hasRules?: boolean,
): Promise<PageVariationStatus> {
    const folder = `${module}/${devicePath}/page${layout}${ds}`;
    if (!fileExists(project, folder, page, '.defs.ts')) return 'generation';
    if (!fileExists(project, folder, page, '.ts')) return 'materialize';

    const gate = hasRules ?? await layoutHasRules(project, layout);
    if (!gate) return 'fresh';
    try {
        const check = await pageDsCheckByDefs({ project, folder, shortName: page }, module, layout, ds);
        // 'no-stamp' = origin defs (page11) predating DS versioning → counts as fresh here.
        // 'review' is informational per page and never demotes the variation.
        if (check.status === 'stale' && check.staleReason !== 'no-stamp') return 'stale';
    } catch { /* unreadable defs → don't block the panel */ }
    return 'fresh';
}

/** Status of one variation (page{layout}{ds}) across the module's pages. */
export async function variationStatusForModule(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    devicePath = DEFAULT_DEVICE_PATH,
    opts?: { pages?: string[]; hasRules?: boolean },
): Promise<{ variation: string; status: PageVariationStatus; counts: Record<PageVariationStatus, number>; pages: PageVariationEntry[] }> {
    const pageNames = opts?.pages ?? await listModulePages(project, module, devicePath);
    const hasRules = opts?.hasRules ?? await layoutHasRules(project, layout);

    const entries: PageVariationEntry[] = [];
    for (const page of pageNames) {
        entries.push({ page, status: await pageStatusInVariation(project, module, layout, ds, page, devicePath, hasRules) });
    }
    const { status, counts } = aggregateVariationStatus(entries);
    return { variation: `page${layout}${ds}`, status, counts, pages: entries };
}

/**
 * One entry per configured combo config.layouts × designSystems (never-generated combos
 * show as 'generation'), plus page* folders found in the stor outside the combos (orphans).
 * Ordered by layout, then DS.
 */
export async function listVariationsStatus(
    project: number,
    module: string,
    devicePath = DEFAULT_DEVICE_PATH,
): Promise<ModuleVariationStatus[]> {
    let layoutsMap: Record<string, { name?: string }> = {};
    try {
        const config: any = await getConfigProject(project);
        layoutsMap = config?.layouts ?? {};
    } catch { /* no project config */ }

    let dsNames: Record<string, string> = {};
    try { dsNames = await dsIndexNameMap(project); } catch { /* no designSystem.ts */ }

    const combos: Array<{ layout: string; ds: string; orphan: boolean }> = [];
    for (const layout of Object.keys(layoutsMap)) {
        for (const ds of Object.keys(dsNames)) combos.push({ layout, ds, orphan: false });
    }

    // Orphans: existing page{N} folders outside the configured combos. Multi-digit
    // layout/DS is ambiguous by convention (concatenation) — first digit is the layout.
    const known = new Set(combos.map(c => `page${c.layout}${c.ds}`));
    for (const seg of scanVariationSegments(project, module, devicePath)) {
        if (known.has(seg)) continue;
        const digits = seg.slice('page'.length);
        combos.push({ layout: digits.slice(0, 1), ds: digits.slice(1), orphan: true });
    }

    combos.sort((a, b) => Number(a.layout) - Number(b.layout) || Number(a.ds) - Number(b.ds));

    const pages = await listModulePages(project, module, devicePath);

    const hasRulesByLayout: Record<string, boolean> = {};
    for (const layout of new Set(combos.map(c => c.layout))) {
        try { hasRulesByLayout[layout] = await layoutHasRules(project, layout); }
        catch { hasRulesByLayout[layout] = false; }
    }
    // The stale check builds the molecule catalog — warm its cache ONCE for the whole panel.
    if (pages.length && Object.values(hasRulesByLayout).some(Boolean)) {
        try { await buildMoleculeCatalog(); } catch { /* checks degrade to fresh */ }
    }

    const out: ModuleVariationStatus[] = [];
    for (const c of combos) {
        const { variation, status, counts, pages: pageEntries } = await variationStatusForModule(
            project, module, c.layout, c.ds, devicePath,
            { pages, hasRules: hasRulesByLayout[c.layout] ?? false },
        );
        out.push({
            variation,
            layout: c.layout,
            ds: c.ds,
            layoutName: layoutsMap[c.layout]?.name ?? `layout ${c.layout}`,
            dsName: dsNames[c.ds] ?? `ds ${c.ds}`,
            orphan: c.orphan,
            status,
            counts,
            pages: pageEntries,
        });
    }
    return out;
}
