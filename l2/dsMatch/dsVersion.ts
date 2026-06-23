/// <mls fileReference="_102020_/l2/dsMatch/dsVersion.ts" enhancement="_blank" />

// Page-level DS version stamp + status check (fresh | review | stale).
//
// A generated page defs is a SELECTION artifact: it records WHICH molecule each organism
// uses and HOW it is placed. A molecule's implementation is consumed at runtime, so a page
// is only "stale" (must re-materialize) when the SELECTION itself becomes invalid:
//   - the page's effective DS rules changed (project → module → page cascade), OR
//   - a molecule it used was removed, OR
//   - a molecule it used is no longer COMPATIBLE with the page's effective rules.
// When a used molecule merely CHANGED (still present + compatible) the selection is still
// valid — we flag "review" (informational), not "stale".
//
// Everything is per page, so the invalidation radius equals the influence radius of the
// change. The stamp stores `rulesHash` (the page doesn't otherwise record its rules) and a
// per-used-molecule content signature `moleculesSeen` (to detect "review"); molecule
// presence/compatibility is recomputed live (no global catalog version, no cross-project
// invalidation). See resolveRulesForPage (cascade) and filterCompatibleVariants.

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { resolveRulesForPage } from '/_102020_/l2/dsMatch/resolveRulesForPage.js';
import { pageRef, DEFAULT_DEVICE } from '/_102020_/l2/dsMatch/derivePaths.js';
import { buildMoleculeCatalog } from '/_102020_/l2/dsMatch/buildMoleculeCatalog.js';
import { filterCompatibleVariants } from '/_102020_/l2/dsMatch/filterVariants.js';
import type { ResolvedDs, MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';

export type PageDsStatus = 'fresh' | 'review' | 'stale';

/** A molecule a page used, identified across projects by (project, tag). */
export interface UsedMolecule { project: number; tag: string; }

/** What gets stamped on each generated page defs as `export const dsVersion`. */
export interface PageDsStamp {
    ds: number | string;
    dsName: string;
    rulesHash: string;                      // hash of THIS page's effective (configured) DS rules
    moleculesSeen: Record<string, string>;  // "project|tag" → molecule content signature at gen time
    generatedAt: string;                    // audit only (ISO)
}

// ─── pure: signatures ─────────────────────────────────────────────────────────

/**
 * Deterministic hash of a page's configured DS rules (axis → value). Canonical form:
 * sorted "axis=value" pairs joined by "\n", then FNV-1a. Order-independent; only the
 * axes that actually drive generation feed it (vocabulary defaults never change).
 */
export function effectiveRulesSignature(rules: Record<string, string>): string {
    const serialized = Object.keys(rules).sort().map(k => `${k}=${rules[k]}`).join('\n');
    return hash(serialized);
}

/**
 * Content signature of a molecule's DEFINITION (its `.defs.ts` skill text). Every relevant
 * change to a molecule is reflected in its defs, so this captures "the molecule changed"
 * for the `review` signal. Candidacy (layoutConfig) is handled by compatibility, not here.
 */
export function moleculeContentSignature(entry: MoleculeCatalogEntry): string {
    return hash(entry.description ?? '');
}

/** Serialize the stamp into the `export const dsVersion` line appended to a page defs. */
export function renderDsVersionExport(stamp: PageDsStamp): string {
    return `export const dsVersion = ${JSON.stringify(stamp, null, 2)} as const;`;
}

/** FNV-1a 32-bit — no mls dependency, testable. */
function hash(s: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

// ─── pure: parse from defs source ──────────────────────────────────────────────

/** Parse the `export const dsVersion = { ... } as const;` object from raw source. */
export function parseDsVersion(content: string): PageDsStamp | null {
    const m = content.match(/export\s+const\s+dsVersion\s*=\s*(\{[\s\S]*?\})\s+as\s+const\s*;/);
    if (!m) return null;
    try {
        const v = JSON.parse(m[1]);
        return v && typeof v === 'object' ? v as PageDsStamp : null;
    } catch {
        return null;
    }
}

/** Parse the page's used molecules from its (flat) `moleculeAssignments` export, unique by project|tag. */
export function parseUsedMolecules(content: string): UsedMolecule[] {
    const m = content.match(/export\s+const\s+moleculeAssignments\s*=\s*(\[[\s\S]*?\])\s+as\s+const\s*;/);
    if (!m) return [];
    let arr: Array<{ project?: number; tag?: string }>;
    try { arr = JSON.parse(m[1]); } catch { return []; }
    const out = new Map<string, UsedMolecule>();
    for (const mol of arr ?? []) {
        if (!mol?.tag) continue;
        const project = typeof mol.project === 'number' ? mol.project : 0;
        out.set(`${project}|${mol.tag}`, { project, tag: mol.tag });
    }
    return [...out.values()];
}

// ─── pure: status decision ─────────────────────────────────────────────────────

/**
 * Decide a page's status from its stamp + used molecules vs the CURRENT rules/catalog.
 *   stale  → rules changed, or a used molecule was removed or is no longer compatible.
 *   review → all used molecules still valid, but at least one changed (or is unstamped).
 *   fresh  → nothing changed.
 * Pure — the runtime wrappers gather the inputs.
 */
export function decidePageDsStatus(params: {
    stamp: PageDsStamp | null;
    used: UsedMolecule[];
    catalog: MoleculeCatalogEntry[];
    rules: ResolvedDs;
    configuredAxes: Set<string>;
    currentRulesHash: string;
}): PageDsStatus {
    const { stamp, used, catalog, rules, configuredAxes, currentRulesHash } = params;
    if (!stamp) return 'stale';
    if (stamp.rulesHash !== currentRulesHash) return 'stale';

    const byKey = new Map(catalog.map(m => [`${m.project}|${m.tag}`, m]));
    let review = false;
    for (const u of used) {
        const key = `${u.project}|${u.tag}`;
        const entry = byKey.get(key);
        if (!entry) return 'stale'; // used molecule removed → must repick

        const compatible = filterCompatibleVariants(entry.group, rules, configuredAxes, catalog)
            .some(m => m.project === entry.project && m.tag === entry.tag);
        if (!compatible) return 'stale'; // selection now violates the DS

        const seen = stamp.moleculesSeen?.[key];
        if (seen === undefined || seen !== moleculeContentSignature(entry)) review = true;
    }
    return review ? 'review' : 'fresh';
}

// ─── runtime: build / read / compare ──────────────────────────────────────────

/** The configured axis→value map for a page (only axes set across the cascade, post-unset). */
function configuredFrom(rules: ResolvedDs, configuredAxes: Set<string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const axis of configuredAxes) out[axis] = (rules as Record<string, string>)[axis];
    return out;
}

/** Read the raw .defs.ts source from the stor (current saved content — no compile/cache lag). */
async function readDefsContent(defsFile: { project: number; folder: string; shortName: string }): Promise<string> {
    try {
        const info = { project: defsFile.project, level: 2, folder: defsFile.folder, shortName: defsFile.shortName, extension: '.defs.ts' };
        const key = mls.stor.getKeyToFile(info as any);
        const sf = (mls.stor.files as Record<string, any>)[key];
        if (!sf) return '';
        const content = await sf.getContent();
        return typeof content === 'string' ? content : '';
    } catch {
        return '';
    }
}

/**
 * Build the stamp for a page from the CURRENT project config + catalog. `defsContent` is the
 * page's defs source (its `moleculeAssignments` is the source of which molecules it used).
 */
export async function buildPageDsStamp(
    project: number,
    module: string,
    ds: number | string,
    page: string,
    generatedAt: string,
    defsContent: string,
): Promise<PageDsStamp> {
    const { rules, configuredAxes } = await resolveRulesForPage(project, module, page, ds);
    const config: any = await getConfigProject(project);
    const dsEntry = config?.designSystems?.[String(ds)] ?? {};
    const catalog = await buildMoleculeCatalog();
    const byKey = new Map(catalog.map(m => [`${m.project}|${m.tag}`, m]));

    const moleculesSeen: Record<string, string> = {};
    for (const u of parseUsedMolecules(defsContent)) {
        const entry = byKey.get(`${u.project}|${u.tag}`);
        if (entry) moleculesSeen[`${u.project}|${u.tag}`] = moleculeContentSignature(entry);
    }

    return {
        ds,
        dsName: dsEntry.name ?? String(ds),
        rulesHash: effectiveRulesSignature(configuredFrom(rules, configuredAxes)),
        moleculesSeen,
        generatedAt,
    };
}

/** Page status given its defs file location (project/folder/shortName). */
export async function pageDsStatusByDefs(
    defsFile: { project: number; folder: string; shortName: string },
    module: string,
    ds: number | string,
): Promise<PageDsStatus> {
    const content = await readDefsContent(defsFile);
    const stamp = parseDsVersion(content);
    if (!stamp) return 'stale';
    const { rules, configuredAxes } = await resolveRulesForPage(defsFile.project, module, defsFile.shortName, ds);
    const catalog = await buildMoleculeCatalog();
    return decidePageDsStatus({
        stamp,
        used: parseUsedMolecules(content),
        catalog,
        rules,
        configuredAxes,
        currentRulesHash: effectiveRulesSignature(configuredFrom(rules, configuredAxes)),
    });
}

/** Page status addressed by (project, module, layout, ds, page, device). */
export async function pageDsStatus(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): Promise<PageDsStatus> {
    const ref = pageRef(project, module, layout, ds, page, '.defs.ts', device);
    const norm = ref.startsWith('/') ? ref.slice(1) : ref;
    const f = mls.stor.convertFileReferenceToFile(norm);
    return pageDsStatusByDefs({ project: f.project, folder: f.folder, shortName: f.shortName }, module, ds);
}

/** True when the page must be re-materialized (status 'stale'). For the materialize trigger. */
export async function isPageStale(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): Promise<boolean> {
    return (await pageDsStatus(project, module, layout, ds, page, device)) === 'stale';
}
