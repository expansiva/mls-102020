/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/variationStatusCore.ts" enhancement="_blank" />

// PURE part of the per-variation status of a module (TASK-102020-genome-ux-3, part C). No `mls.*`, no IO:
// variationStatus.ts reads the stor and hands the facts here.
//
// A variation is a genome UX: UX N (config.layouts[N], 2..9) → folder page{N}1, on BOTH devices; UX 1 is page11
// (the base, written by agentDefsL2). The design system is not part of the genome. Other page\d+ folders are orphans.
//
// Per-page status, per device, in pipeline order (the worst device wins the page, the worst page wins the variation):
//   generation   → UX N: no agentGenomeUx receipt, or the variant defs of the device is missing (or the page cannot
//                  be read: missing page11/template, see `diagnostic`); base/orphan: the defs is missing;
//                  base: also a UX 1 template choice (layouts["1"].templates.pages) that differs from the page11
//                  template.category (TASK-102020-genome-ux-4: agentGenomeUx layout 1 applies it)
//   stale        → UX N: the receipt does not match the inherited part of page11, the template, its rules,
//                  useMolecules or the written defs (genomeUxStale reasons); base: only when a base receipt exists
//                  (agentGenomeUx base mode ran) and genomeUxStale says so (e.g. page11 rewritten afterwards)
//   refused      → the agentMaterializeL2 input20 snapshot (input.json) refused the page (page11) or the variant,
//                  for the defs that are on disk now (same sha256); the reasons are the snapshot's problem messages
//   materialize  → the rendered .ts of the device is missing, or the snapshot did not see the current defs yet
//   fresh        → everything current

import type { M4InputProblem } from '/_102020_/l2/agentMaterializeL2/steps/input20/gate.js';

export type VariationDevice = 'desktop' | 'mobile';
export const VARIATION_DEVICES: readonly VariationDevice[] = ['desktop', 'mobile'];

export type PageVariationStatus = 'generation' | 'stale' | 'refused' | 'materialize' | 'fresh';

/** Pipeline order — the worst (earliest) stage present wins. */
export const VARIATION_STATUS_ORDER: PageVariationStatus[] = ['generation', 'stale', 'refused', 'materialize', 'fresh'];

/** `ux` = UX N (page{N}1, agentGenomeUx); `base` = UX 1 (page11); `orphan` = any other page\d+ folder. */
export type VariationKind = 'ux' | 'base' | 'orphan';

/** The input20 verdict on the defs on disk now. `outdated` = the snapshot saw other defs (or none) for this page. */
export type VariationSnapshotVerdict =
    | { kind: 'absent' }
    | { kind: 'outdated' }
    | { kind: 'accepted' }
    | { kind: 'refused'; reasons: string[] };

/** The part of agentMaterializeL2's input.json (`M4InputSnapshot`, steps/input20/run.ts) this status reads. */
export interface VariationInputSnapshot {
    pages?: Array<{
        pageId: string;
        status: 'accepted' | 'refused';
        inputs?: Partial<Record<string, { path: string; sha256: string } | null>>;
        problems?: M4InputProblem[];
        variants?: Array<{
            genome: string;
            status: 'accepted' | 'refused';
            inputs?: Partial<Record<VariationDevice, { path: string; sha256: string } | null>>;
        }>;
    }>;
}

/** What the IO layer found for one page of one variation. */
export interface VariationPageFacts {
    page: string;
    kind: VariationKind;
    /** UX N / base: the agentGenomeUx receipt exists. Ignored for orphans. */
    hasReceipt: boolean;
    /** UX N / base: genomeUxStale reasons ('receipt' when there is none). Base: counted only with a receipt. */
    staleReasons: string[];
    /** UX N / base: readGenomeUxPageStatus could not read the page (missing page11 / template, unreadable rules). */
    diagnostic: string | null;
    /** Base only: the UX 1 template chosen for the page when it differs from the page11 template.category. */
    templateChoice?: string | null;
    /** sha256 (sha256Text format) of the defs of each device in this folder; null = missing. */
    defsHashes: Record<VariationDevice, string | null>;
    /** The rendered .ts of each device exists in this folder. */
    ts: Record<VariationDevice, boolean>;
}

export interface PageVariationEntry {
    page: string;
    status: PageVariationStatus;
    devices: Record<VariationDevice, PageVariationStatus>;
    /** genomeUxStale reasons (UX N), empty otherwise. */
    staleReasons: string[];
    /** input20 messages when refused. */
    refusedReasons: string[];
    diagnostic: string | null;
    /** Base only: the UX 1 template waiting to be applied to page11 (null = none). */
    templateChoice: string | null;
}

export function worstVariationStatus(statuses: Iterable<PageVariationStatus>): PageVariationStatus {
    const present = new Set(statuses);
    return VARIATION_STATUS_ORDER.find(status => present.has(status)) ?? 'fresh';
}

/**
 * The input20 verdict for one page folder (`genome`: page11 or a variant) against the defs on disk now. A verdict on
 * other defs (a sha256 that differs, a page or variant the snapshot does not list) is `outdated`: the materializer
 * has to run again before its verdict means anything.
 */
export function snapshotVerdictFor(
    snapshot: VariationInputSnapshot | null | undefined,
    pageId: string,
    genome: string,
    defsHashes: Record<VariationDevice, string | null>,
): VariationSnapshotVerdict {
    if (!snapshot || !Array.isArray(snapshot.pages)) return { kind: 'absent' };
    const page = snapshot.pages.find(item => item.pageId === pageId);
    if (!page) return { kind: 'outdated' };
    const problems = page.problems ?? [];
    const pageErrors = problems.filter(item => item.severity === 'error').map(item => item.message);
    const sameDefs = (inputs: Partial<Record<string, { sha256: string } | null>> | undefined) =>
        VARIATION_DEVICES.every(device => (inputs?.[device]?.sha256 ?? null) === defsHashes[device]);

    if (genome === 'page11') {
        if (!sameDefs(page.inputs)) return { kind: 'outdated' };
        if (page.status !== 'refused') return { kind: 'accepted' };
        return { kind: 'refused', reasons: pageErrors.length ? pageErrors : problems.map(item => item.message) };
    }

    const variant = page.variants?.find(item => item.genome === genome);
    if (!variant || !sameDefs(variant.inputs)) return { kind: 'outdated' };
    if (variant.status !== 'refused') return { kind: 'accepted' };
    // gate.ts paths of a variant: `<genome>:` (M4_INPUT_VARIANT_REFUSED) or `<genome>/<device>:…` (molecule, rules).
    const own = problems
        .filter(item => item.path === `${genome}:` || item.path.startsWith(`${genome}/`) || item.path.startsWith(`${genome}:`))
        .map(item => item.message);
    // A variant of a refused page is left out with it (the page's errors say why).
    const reasons = [...new Set([...own, ...(page.status === 'refused' ? pageErrors : [])])];
    return { kind: 'refused', reasons: reasons.length ? reasons : [`input20 refused ${genome} of ${pageId}.`] };
}

/** The status of one page of a variation from its facts and the input20 verdict. */
export function pageVariationEntry(facts: VariationPageFacts, verdict: VariationSnapshotVerdict): PageVariationEntry {
    const ux = facts.kind === 'ux';
    const base = facts.kind === 'base';
    const templateChoice = base ? facts.templateChoice ?? null : null;
    // UX N always has a receipt to compare; the base only once agentGenomeUx base mode wrote one.
    const tracked = ux || (base && facts.hasReceipt);
    const staleReasons = tracked ? facts.staleReasons.filter(reason => reason !== 'receipt' || facts.hasReceipt) : [];
    const devices = {} as Record<VariationDevice, PageVariationStatus>;
    for (const device of VARIATION_DEVICES) {
        if (facts.defsHashes[device] === null || (ux && (facts.diagnostic !== null || !facts.hasReceipt)) || templateChoice !== null) devices[device] = 'generation';
        else if (staleReasons.length) devices[device] = 'stale';
        else if (verdict.kind === 'refused') devices[device] = 'refused';
        else if (verdict.kind === 'outdated' || !facts.ts[device]) devices[device] = 'materialize';
        else devices[device] = 'fresh';
    }
    const status = worstVariationStatus(Object.values(devices));
    return {
        page: facts.page,
        status,
        devices,
        staleReasons: status === 'stale' ? staleReasons : [],
        refusedReasons: status === 'refused' && verdict.kind === 'refused' ? verdict.reasons : [],
        diagnostic: ux || base ? facts.diagnostic : null,
        templateChoice,
    };
}

/** Aggregate per-page statuses into the variation status + counts. */
export function aggregateVariationStatus(pages: PageVariationEntry[]): {
    status: PageVariationStatus;
    counts: Record<PageVariationStatus, number>;
} {
    const counts: Record<PageVariationStatus, number> = { generation: 0, stale: 0, refused: 0, materialize: 0, fresh: 0 };
    for (const p of pages) counts[p.status]++;
    return { status: worstVariationStatus(pages.map(p => p.status)), counts };
}

/** UX numbers of `config.layouts` that have a genome folder: integer keys 2..9 (page{N}1), sorted. */
export function genomeUxNumbers(layouts: Record<string, unknown> | null | undefined): number[] {
    return Object.keys(layouts ?? {})
        .filter(key => /^[2-9]$/.test(key))
        .map(Number)
        .sort((a, b) => a - b);
}

/** `page{N}1` of UX N, `page11` for UX 1. */
export function genomeUxFolder(layout: number): string {
    return `page${layout}1`;
}

/** The page\d+ folders that are neither page11 nor the page{N}1 of a configured UX, sorted. */
export function orphanVariationFolders(segments: Iterable<string>, layouts: readonly number[]): string[] {
    const known = new Set(['page11', ...layouts.map(genomeUxFolder)]);
    return [...new Set(segments)].filter(seg => /^page\d+$/.test(seg) && !known.has(seg)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
}

/**
 * The pages for the action of a variation: `generate` (UX N with generation/stale pages; base: pages with a UX 1
 * template choice or a stale base receipt) → agentGenomeUx with those pages (layout 1 for the base);
 * `regenerate` (UX N whose only problem is refused pages) → agentGenomeUx with them and force; `materialize`
 * (pending .ts) → agentMaterializeL2 with the genome scope; null = nothing to do (or an orphan). A base page whose
 * page11 defs is missing is agentDefsL2's, never part of `generate`.
 */
export function variationAction(kind: VariationKind, pages: PageVariationEntry[]):
    | { kind: 'generate' | 'regenerate'; pages: string[] }
    | { kind: 'materialize' }
    | null {
    if (kind === 'orphan') return null;
    if (kind === 'ux') {
        const pending = pages.filter(p => p.status === 'generation' || p.status === 'stale').map(p => p.page);
        if (pending.length) return { kind: 'generate', pages: pending };
    }
    if (kind === 'base') {
        const pending = pages.filter(p => p.status === 'stale' || (p.status === 'generation' && !!p.templateChoice)).map(p => p.page);
        if (pending.length) return { kind: 'generate', pages: pending };
    }
    if (pages.some(p => p.status === 'materialize')) return { kind: 'materialize' };
    if (kind === 'ux') {
        const refused = pages.filter(p => p.status === 'refused').map(p => p.page);
        if (refused.length) return { kind: 'regenerate', pages: refused };
    }
    return null;
}
