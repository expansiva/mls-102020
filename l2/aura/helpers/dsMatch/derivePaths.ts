/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/derivePaths.ts" enhancement="_blank" />

// Path derivation for the DS-implementation flow.
//
// Page folder convention: page{layout}{ds}  (page11 = layout 1 + ds 1).
// The DESTINATION is always page{layout}{ds}. The ORIGIN (structural source of the
// defs) is resolved PER PAGE by fallback: page{L}{D} → page{L}1 → page11 — the first
// whose `.defs.ts` actually exists in mls.stor. So a variation reuses the closest
// same-layout ancestor already generated (e.g. page32 derives from page31) instead of
// always cloning page11's structure. Falls back to page11 when nothing else exists.
//
// Full layout under a module: {module}/web/{device}/page{layout}{ds}/<page>.{ts|defs.ts}

export const DEFAULT_DEVICE = 'desktop';

/** 'page12' for layout 1, ds 2. */
export function variationFolder(layout: number | string, ds: number | string): string {
    return `page${layout}${ds}`;
}

/** Folder as stored in mls.stor (relative, no project/level), e.g. 'cafeFlow/web/desktop/page12'. */
export function pageFolder(module: string, layout: number | string, ds: number | string, device = DEFAULT_DEVICE): string {
    return `${module}/web/${device}/${variationFolder(layout, ds)}`;
}

/** Full file reference, e.g. '_102043_/l2/cafeFlow/web/desktop/page12/cardapioEstoque.defs.ts'. */
export function pageRef(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    ext: '.ts' | '.defs.ts',
    device = DEFAULT_DEVICE,
): string {
    return `_${project}_/l2/${pageFolder(module, layout, ds, device)}/${page}${ext}`;
}

export interface PageWorkItem {
    page: string;          // shortName, e.g. 'cardapioEstoque'
    defsOrigem: string;    // resolved-origin .defs.ts file reference (structure input)
    defsDestino: string;   // page{layout}{ds} .defs.ts file reference (output)
    originFolder: string;  // resolved-origin folder, e.g. 'page31' (agentGenDefs repoints from this)
}

/** Build the work item for one page. Origin resolved by fallback (see resolveOriginCoords). */
export function buildWorkItem(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): PageWorkItem {
    const [ol, od] = resolveOriginCoords(project, module, layout, ds, page, device);
    return {
        page,
        defsOrigem: pageRef(project, module, ol, od, page, '.defs.ts', device),
        defsDestino: pageRef(project, module, layout, ds, page, '.defs.ts', device),
        originFolder: variationFolder(ol, od),
    };
}

// ─── origin resolution (fallback page{L}{D} → page{L}1 → page11) ──────────────

/** Ordered, de-duplicated origin candidates for a variation: [[L,D],[L,1],[1,1]]. Pure. */
export function originCandidates(
    layout: number | string,
    ds: number | string,
): Array<[number | string, number | string]> {
    const raw: Array<[number | string, number | string]> = [[layout, ds], [layout, 1], [1, 1]];
    const seen = new Set<string>();
    const out: Array<[number | string, number | string]> = [];
    for (const [l, d] of raw) {
        const key = `${l}|${d}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push([l, d]);
    }
    return out;
}

/** Does the `.defs.ts` for this exact page variation exist in mls.stor? Synchronous.
 *  Returns false when stor is unavailable (test/no-stor context). */
export function pageDefsExists(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): boolean {
    const files = (typeof mls !== 'undefined') ? (mls as any)?.stor?.files : undefined;
    if (!files) return false;
    const folder = pageFolder(module, layout, ds, device);
    return Object.values(files as Record<string, any>).some(sf =>
        sf &&
        sf.project === project &&
        sf.level === 2 &&
        sf.folder === folder &&
        sf.extension === '.defs.ts' &&
        sf.shortName === page,
    );
}

/** Resolve the origin coordinates [layout, ds] for one page by fallback. Defensive:
 *  with no stor (test context) returns [1, 1] to preserve the page11 baseline. */
function resolveOriginCoords(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): [number | string, number | string] {
    const files = (typeof mls !== 'undefined') ? (mls as any)?.stor?.files : undefined;
    if (!files) return [1, 1];
    for (const [l, d] of originCandidates(layout, ds)) {
        if (pageDefsExists(project, module, l, d, page, device)) return [l, d];
    }
    return [1, 1];
}

/** The resolved-origin `.defs.ts` reference for one page (first existing candidate; page11 fallback). */
export function resolveDefsOrigem(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): string {
    const [l, d] = resolveOriginCoords(project, module, layout, ds, page, device);
    return pageRef(project, module, l, d, page, '.defs.ts', device);
}

// ─── runtime (needs mls.stor) ────────────────────────────────────────────────

/** Distinct page shortNames present in the origin (page11) folder of a module.
 *  Enumerated by `.defs.ts` (the structural source of truth the flow reads) — NOT the
 *  rendered `.ts`, which the new defs-driven flow no longer depends on. */
export function listPages(project: number, module: string, device = DEFAULT_DEVICE): string[] {
    const folder = `${module}/web/${device}/page11`;
    const pages = Object.values(mls.stor.files as Record<string, any>)
        .filter(sf =>
            sf &&
            sf.project === project &&
            sf.level === 2 &&
            sf.folder === folder &&
            sf.extension === '.defs.ts' &&
            typeof sf.shortName === 'string' &&
            sf.shortName,
        )
        .map(sf => sf.shortName as string);
    return [...new Set(pages)].sort();
}

/** Work items for every page of a module, targeting page{layout}{ds}. */
export function listWorkItems(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    device = DEFAULT_DEVICE,
): PageWorkItem[] {
    return listPages(project, module, device).map(p => buildWorkItem(project, module, layout, ds, p, device));
}
