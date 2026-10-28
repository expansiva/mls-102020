/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/variationStatus.ts" enhancement="_blank" />

// Per-VARIATION status of a module for the selectModule panel (TASK-102020-genome-ux-3, part C): the IO half.
// A variation is a genome UX — UX 1 = page11 (the base), UX N = page{N}1 (agentGenomeUx) — on BOTH devices; the
// design system is not part of it. The statuses and their order live in variationStatusCore.ts (pure, tested).
//
// Read per page: the agentGenomeUx receipt + stale verdict (readGenomeUxPageStatus, without the catalog hash: a
// catalog change does not mark every variant stale), the defs and .ts of each device, and agentMaterializeL2's
// input20 snapshot (l2/<module>/pipeline/agentMaterializeL2/input.json) for the refused verdict. The base (page11)
// reads the agentGenomeUx view only when it has a UX 1 template choice or a base receipt (TASK-102020-genome-ux-4).

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { readStorText, storTextExists } from '/_102020_/l2/agentMaterializeL2/helpers/storText.js';
import { m4OwnedFile } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { defsWithoutHistory } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import { getPageTemplate, uxPageKey, type IUxLayout } from '/_102020_/l2/aura/helpers/uxTemplates.js';
import { genomeUxReceiptExists, listGenomeUxPages, readGenomeUxPageStatus } from '/_102020_/l2/aura/agentGenomeUx/genomeUxIo.js';
import {
    VARIATION_DEVICES, aggregateVariationStatus, genomeUxFolder, genomeUxNumbers, orphanVariationFolders, pageVariationEntry, snapshotVerdictFor,
    type PageVariationEntry, type PageVariationStatus, type VariationDevice, type VariationInputSnapshot, type VariationKind, type VariationPageFacts,
} from '/_102020_/l2/aura/helpers/dsMatch/variationStatusCore.js';

export type { PageVariationEntry, PageVariationStatus, VariationDevice, VariationKind } from '/_102020_/l2/aura/helpers/dsMatch/variationStatusCore.js';
export { VARIATION_DEVICES, VARIATION_STATUS_ORDER, aggregateVariationStatus, variationAction } from '/_102020_/l2/aura/helpers/dsMatch/variationStatusCore.js';

export interface ModuleVariationStatus {
    variation: string;            // folder: 'page11', 'page21', or an orphan 'page32'
    kind: VariationKind;
    layout: number | null;        // UX number (1 for page11); null for an orphan
    name: string;                 // config.layouts[N].name, or 'UX N' / the folder
    ownTemplates: number;         // pages of this module with their own template in layouts[N].templates.pages
    orphan: boolean;
    status: PageVariationStatus;  // aggregated (worst stage wins)
    counts: Record<PageVariationStatus, number>;
    pages: PageVariationEntry[];
}

type StorInfo = { project: number; level: number; folder: string; shortName: string; extension: string };

function info(project: number, module: string, device: VariationDevice, folder: string, page: string, extension: string): StorInfo {
    return { project, level: 2, folder: `${module}/web/${device}/${folder}`, shortName: page, extension };
}

/**
 * The defs hash compared with the materializer snapshot. The Studio edit history (helpers/defsHistory) is cut off:
 * an edit made in the Studio does not make the page need a new materialization.
 */
async function textHash(file: StorInfo): Promise<string | null> {
    if (!storTextExists(file)) return null;
    try { return await sha256Text(defsWithoutHistory(await readStorText(file))); } catch { return null; }
}

async function defsHashes(project: number, module: string, folder: string, page: string): Promise<Record<VariationDevice, string | null>> {
    return {
        desktop: await textHash(info(project, module, 'desktop', folder, page, '.defs.ts')),
        mobile: await textHash(info(project, module, 'mobile', folder, page, '.defs.ts')),
    };
}

function tsExists(project: number, module: string, folder: string, page: string): Record<VariationDevice, boolean> {
    return {
        desktop: storTextExists(info(project, module, 'desktop', folder, page, '.ts')),
        mobile: storTextExists(info(project, module, 'mobile', folder, page, '.ts')),
    };
}

/** agentMaterializeL2's input20 snapshot of the module, or null when it never ran (or the file is unreadable). */
export async function readVariationInputSnapshot(project: number, module: string): Promise<VariationInputSnapshot | null> {
    const file = m4OwnedFile({ project, module }, 'input');
    if (!storTextExists(file)) return null;
    try { return JSON.parse(await readStorText(file)) as VariationInputSnapshot; } catch { return null; }
}

/** Distinct page\d+ folder segments under web/desktop and web/mobile of the module. */
function scanVariationSegments(project: number, module: string): string[] {
    const out = new Set<string>();
    for (const device of VARIATION_DEVICES) {
        const prefix = `${module}/web/${device}/`;
        for (const f of Object.values(mls.stor.files) as any[]) {
            if (!f || f.project !== project || f.level !== 2 || f.status === 'deleted') continue;
            const folder = String(f.folder || '');
            if (!folder.startsWith(prefix)) continue;
            const seg = folder.slice(prefix.length);
            if (/^page\d+$/.test(seg)) out.add(seg);
        }
    }
    return [...out];
}

/** One page of one variation: the facts, then the pure status. */
async function pageEntry(
    project: number, module: string, kind: VariationKind, folder: string, layout: number | null, layoutEntry: IUxLayout | null,
    page: string, snapshot: VariationInputSnapshot | null,
): Promise<PageVariationEntry> {
    const facts: VariationPageFacts = {
        page, kind, hasReceipt: false, staleReasons: [], diagnostic: null,
        defsHashes: { desktop: null, mobile: null }, ts: tsExists(project, module, folder, page),
    };
    if (kind === 'ux' && layout !== null) {
        const status = await readGenomeUxPageStatus(project, module, layout, page, { layoutEntry });
        if (status.kind === 'ok') {
            facts.hasReceipt = status.receipt !== null;
            facts.staleReasons = status.verdict.reasons;
            facts.defsHashes = status.current.variantHashes;
        } else {
            facts.diagnostic = status.diagnostic;
            facts.defsHashes = await defsHashes(project, module, folder, page);
        }
    } else {
        facts.defsHashes = await defsHashes(project, module, folder, page);
        // Base (TASK-102020-genome-ux-4): a UX 1 template choice, or a receipt of agentGenomeUx base mode, brings the
        // agent's view; without either the base is agentDefsL2's page11 alone (no extra read).
        const chosen = kind === 'base' ? getPageTemplate(layoutEntry, uxPageKey(module, page)) : null;
        if (kind === 'base' && (chosen || genomeUxReceiptExists(project, module, folder, page))) {
            const status = await readGenomeUxPageStatus(project, module, 1, page, { layoutEntry });
            if (status.kind === 'ok') {
                facts.templateChoice = status.context.template.isDefault ? null : status.context.template.path;
                facts.hasReceipt = status.receipt !== null;
                facts.staleReasons = status.verdict.reasons;
            } else if (chosen) {
                // The choice cannot be applied as things are (e.g. the template file is missing): show why.
                facts.templateChoice = chosen;
                facts.diagnostic = status.diagnostic;
            }
        }
    }
    return pageVariationEntry(facts, snapshotVerdictFor(snapshot, page, folder, facts.defsHashes));
}

async function variation(
    project: number, module: string, kind: VariationKind, folder: string, layout: number | null, layoutEntry: IUxLayout | null,
    pages: string[], snapshot: VariationInputSnapshot | null,
): Promise<ModuleVariationStatus> {
    const entries: PageVariationEntry[] = [];
    for (const page of pages) entries.push(await pageEntry(project, module, kind, folder, layout, layoutEntry, page, snapshot));
    const { status, counts } = aggregateVariationStatus(entries);
    const name = typeof layoutEntry?.name === 'string' && layoutEntry.name ? layoutEntry.name : layout !== null ? `UX ${layout}` : folder;
    // Own template = an entry in layouts[N].templates.pages for a page of this module (uxTemplates' key); for the
    // base, a UX 1 choice still waiting to be applied to page11.
    const ownTemplates = kind === 'ux' ? pages.filter(page => getPageTemplate(layoutEntry, uxPageKey(module, page))).length
        : kind === 'base' ? entries.filter(entry => entry.templateChoice).length : 0;
    return { variation: folder, kind, layout, name, ownTemplates, orphan: kind === 'orphan', status, counts, pages: entries };
}

/**
 * UX 1 (page11, the base), then one entry per configured UX N (2..9 → page{N}1; never-generated ones show as
 * 'generation'), then the page\d+ folders found in the stor outside them (orphans, e.g. old page{L}{D} variants).
 * The pages are the module's page11 desktop defs (the agentGenomeUx page list).
 */
export async function listVariationsStatus(project: number, module: string): Promise<ModuleVariationStatus[]> {
    let layoutsMap: Record<string, IUxLayout> = {};
    try {
        const config: any = await getConfigProject(project);
        layoutsMap = config?.layouts ?? {};
    } catch { /* no project config */ }

    const pages = listGenomeUxPages(project, module);
    const snapshot = await readVariationInputSnapshot(project, module);
    const uxNumbers = genomeUxNumbers(layoutsMap);

    const out: ModuleVariationStatus[] = [];
    out.push(await variation(project, module, 'base', 'page11', 1, layoutsMap['1'] ?? null, pages, snapshot));
    for (const layout of uxNumbers) {
        out.push(await variation(project, module, 'ux', genomeUxFolder(layout), layout, layoutsMap[String(layout)] ?? null, pages, snapshot));
    }
    for (const folder of orphanVariationFolders(scanVariationSegments(project, module), uxNumbers)) {
        out.push(await variation(project, module, 'orphan', folder, null, null, pages, snapshot));
    }
    return out;
}
