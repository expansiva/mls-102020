/// <mls fileReference="_102020_/l2/dsMatch/derivePaths.ts" enhancement="_blank" />

// Path derivation for the DS-implementation flow.
//
// Page folder convention: page{layout}{ds}  (page11 = layout 1 + ds 1).
// In this phase the ORIGIN is always page11 (layout fixed, only the DS varies);
// the DESTINATION is page{layout}{ds}.
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
    tsOrigem: string;      // page11 .ts file reference (primary input)
    defsOrigem: string;    // page11 .defs.ts file reference (structure)
    defsDestino: string;   // page{layout}{ds} .defs.ts file reference (output)
}

/** Build the work item for one page. Origin is always page11 (layout 1, ds 1). */
export function buildWorkItem(
    project: number,
    module: string,
    layout: number | string,
    ds: number | string,
    page: string,
    device = DEFAULT_DEVICE,
): PageWorkItem {
    return {
        page,
        tsOrigem: pageRef(project, module, 1, 1, page, '.ts', device),
        defsOrigem: pageRef(project, module, 1, 1, page, '.defs.ts', device),
        defsDestino: pageRef(project, module, layout, ds, page, '.defs.ts', device),
    };
}

// ─── runtime (needs mls.stor) ────────────────────────────────────────────────

/** Distinct page shortNames present in the origin (page11) folder of a module. */
export function listPages(project: number, module: string, device = DEFAULT_DEVICE): string[] {
    const folder = `${module}/web/${device}/page11`;
    const pages = Object.values(mls.stor.files as Record<string, any>)
        .filter(sf =>
            sf &&
            sf.project === project &&
            sf.level === 2 &&
            sf.folder === folder &&
            sf.extension === '.ts' &&
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
