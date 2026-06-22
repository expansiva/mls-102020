/// <mls fileReference="_102020_/l2/dsMatch/dsVersion.ts" enhancement="_blank" />

// Page-level DS version stamp + staleness check.
//
// A generated page defs is "fresh" only while two things are unchanged since it was built:
//   1. the EFFECTIVE DS rules for THAT page (project → module → page cascade), and
//   2. the molecule catalog (catalogVersion, already tracked on the DS).
//
// We hash the effective rules (not a date) so a no-op DS save doesn't invalidate pages, and
// we hash them PER PAGE (not the whole DS) so editing one page's override only invalidates
// that page — the invalidation radius equals the influence radius of the edited rule.
// See resolveRulesForPage for the cascade and recordResolvedMolecules for catalogVersion.

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { resolveRulesForPage } from '/_102020_/l2/dsMatch/resolveRulesForPage.js';
import { pageRef, DEFAULT_DEVICE } from '/_102020_/l2/dsMatch/derivePaths.js';

/** What gets stamped on each generated page defs as `export const dsVersion`. */
export interface PageDsStamp {
    ds: number | string;
    dsName: string;
    rulesHash: string;       // hash of THIS page's effective (configured) DS rules
    catalogVersion: string;  // molecule-catalog signature at generation time
    generatedAt: string;     // audit only (ISO) — NOT part of the staleness decision
}

// ─── pure: rules signature ───────────────────────────────────────────────────

/**
 * Deterministic hash of a page's configured DS rules (axis → value). Canonical form:
 * sorted "axis=value" pairs joined by "\n", then FNV-1a. Order-independent; only the
 * axes that actually drive generation feed it (vocabulary defaults are deterministic
 * and never change, so they are intentionally excluded).
 */
export function effectiveRulesSignature(rules: Record<string, string>): string {
    const serialized = Object.keys(rules)
        .sort()
        .map(k => `${k}=${rules[k]}`)
        .join('\n');
    return hash(serialized);
}

/** Serialize the stamp into the `export const dsVersion` line appended to a page defs. */
export function renderDsVersionExport(stamp: PageDsStamp): string {
    return `export const dsVersion = ${JSON.stringify(stamp, null, 2)} as const;`;
}

/** FNV-1a 32-bit (mirrors recordResolvedMolecules — no mls dependency, testable). */
function hash(s: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

// ─── runtime: build / read / compare ──────────────────────────────────────────

/** The configured axis→value map for a page (only axes set across the cascade, post-unset). */
async function configuredRulesForPage(
    project: number,
    module: string,
    page: string,
    ds: number | string,
): Promise<Record<string, string>> {
    const { rules, configuredAxes } = await resolveRulesForPage(project, module, page, ds);
    const configured: Record<string, string> = {};
    for (const axis of configuredAxes) configured[axis] = (rules as Record<string, string>)[axis];
    return configured;
}

/** Build the stamp for a page from the CURRENT project config. */
export async function buildPageDsStamp(
    project: number,
    module: string,
    ds: number | string,
    page: string,
    generatedAt: string,
): Promise<PageDsStamp> {
    const configured = await configuredRulesForPage(project, module, page, ds);
    const config: any = await getConfigProject(project);
    const dsEntry = config?.designSystems?.[String(ds)] ?? {};
    return {
        ds,
        dsName: dsEntry.name ?? String(ds),
        rulesHash: effectiveRulesSignature(configured),
        catalogVersion: dsEntry.catalogVersion ?? '',
        generatedAt,
    };
}

/** Read the `dsVersion` export from a defs file location (null if absent/unreadable). */
async function readStampFromDefs(defsFile: { project: number; folder: string; shortName: string }): Promise<PageDsStamp | null> {
    // Read the raw .defs.ts source from the stor (not collabImport): collabImport serves the
    // compiled .defs.js at a cache-busterless URL, which can lag a just-written source.
    try {
        const info = { project: defsFile.project, level: 2, folder: defsFile.folder, shortName: defsFile.shortName, extension: '.defs.ts' };
        const key = mls.stor.getKeyToFile(info as any);
        const sf = (mls.stor.files as Record<string, any>)[key];
        if (!sf) return null;
        const content = await sf.getContent();
        return parseDsVersion(typeof content === 'string' ? content : '');
    } catch {
        return null;
    }
}

/** Parse the `export const dsVersion = { ... } as const;` object from raw source. */
function parseDsVersion(content: string): PageDsStamp | null {
    const m = content.match(/export\s+const\s+dsVersion\s*=\s*(\{[\s\S]*?\})\s+as\s+const\s*;/);
    if (!m) return null;
    try {
        const v = JSON.parse(m[1]);
        return v && typeof v === 'object' ? v as PageDsStamp : null;
    } catch {
        return null;
    }
}

/** Read the `dsVersion` export from a generated page defs (null if absent/unreadable). */
export async function readPageDsStamp(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): Promise<PageDsStamp | null> {
    const ref = pageRef(project, module, layout, ds, page, '.defs.ts', device);
    const norm = ref.startsWith('/') ? ref.slice(1) : ref;
    const f = mls.stor.convertFileReferenceToFile(norm);
    return readStampFromDefs({ project: f.project, folder: f.folder, shortName: f.shortName });
}

/**
 * Staleness for a page given its defs file location directly (project/folder/shortName).
 * For callers (UI) that already hold the resolved file and want to skip path/device
 * re-derivation. `page` defaults to the file's shortName (the pageOverrides key).
 */
export async function isPageStaleByDefs(
    defsFile: { project: number; folder: string; shortName: string },
    module: string,
    ds: number | string,
): Promise<boolean> {
    const stamp = await readStampFromDefs(defsFile);
    if (!stamp) return true;
    const current = await buildPageDsStamp(defsFile.project, module, ds, defsFile.shortName, stamp.generatedAt);
    return stamp.rulesHash !== current.rulesHash || stamp.catalogVersion !== current.catalogVersion;
}

/**
 * True when the page must be re-materialized: the effective DS rules or the molecule
 * catalog changed since it was generated, or it carries no stamp (old/unknown page).
 * `generatedAt` is excluded from the comparison (audit only).
 */
export async function isPageStale(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): Promise<boolean> {
    const stamp = await readPageDsStamp(project, module, layout, ds, page, device);
    if (!stamp) return true;
    const current = await buildPageDsStamp(project, module, ds, page, stamp.generatedAt);
    return stamp.rulesHash !== current.rulesHash || stamp.catalogVersion !== current.catalogVersion;
}
