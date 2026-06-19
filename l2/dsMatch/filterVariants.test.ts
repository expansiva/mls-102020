/// <mls fileReference="_102020_/l2/dsMatch/filterVariants.test.ts" enhancement="_blank" />

// Tests for filterCompatibleVariants (pure). Exposes `runFilterVariantsTests()`.

import { filterCompatibleVariants } from '/_102020_/l2/dsMatch/filterVariants.js';
import type { ResolvedDs, MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';

function entry(group: string, variant: string, layoutConfig: Record<string, string>): MoleculeCatalogEntry {
    return { project: 102040, group, variant, tag: `${group.toLowerCase()}--${variant}`, layoutConfig, objective: '', description: '', usagePath: '' };
}
function ds(rules: Record<string, string>): ResolvedDs { return rules as ResolvedDs; }
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(`[filterVariants.test] FAIL: ${msg}`); }
function variants(list: MoleculeCatalogEntry[]): string[] { return list.map(m => m.variant).sort(); }

const catalog: MoleculeCatalogEntry[] = [
    entry('groupViewData', 'ml-calendar-view', { recordsView: 'calendar' }),
    entry('groupViewData', 'ml-card-grid', { recordsView: 'grid' }),
    entry('groupViewData', 'ml-kanban-board', { recordsView: 'kanban' }),
    entry('groupViewData', 'ml-vertical-record-list', { recordsView: 'list' }),
    entry('groupEnterText', 'ml-enter-text', {}),                                  // wildcard
    entry('groupEnterText', 'ml-floating-text-input', { labelPlacement: 'floating' }),
];

export function runFilterVariantsTests(): { passed: number } {
    let passed = 0;

    // 1. DS silent on recordsView → ALL groupViewData variants are valid candidates.
    {
        const r = filterCompatibleVariants('groupViewData', ds({}), new Set<string>(), catalog);
        assert(r.length === 4, `expected all 4 viewData variants, got ${r.length}`);
        passed++;
    }

    // 2. DS recordsView=grid (configured) → only the grid variant survives.
    {
        const r = filterCompatibleVariants('groupViewData', ds({ recordsView: 'grid' }), new Set(['recordsView']), catalog);
        assert(JSON.stringify(variants(r)) === JSON.stringify(['ml-card-grid']), `expected only grid, got ${variants(r)}`);
        passed++;
    }

    // 3. DS recordsView=table (configured) on groupViewData → EMPTY (table lives in groupViewTable).
    {
        const r = filterCompatibleVariants('groupViewData', ds({ recordsView: 'table' }), new Set(['recordsView']), catalog);
        assert(r.length === 0, `expected empty, got ${variants(r)}`);
        passed++;
    }

    // 4. Wildcard always compatible; non-wildcard filtered by configured axis.
    {
        // labelPlacement configured = top → floating variant out, wildcard stays.
        const r = filterCompatibleVariants('groupEnterText', ds({ labelPlacement: 'top' }), new Set(['labelPlacement']), catalog);
        assert(JSON.stringify(variants(r)) === JSON.stringify(['ml-enter-text']), `expected wildcard only, got ${variants(r)}`);
        // labelPlacement NOT configured → both valid.
        const r2 = filterCompatibleVariants('groupEnterText', ds({}), new Set<string>(), catalog);
        assert(r2.length === 2, `expected both text variants, got ${r2.length}`);
        passed++;
    }

    console.log(`[filterVariants.test] OK — ${passed} cases`);
    return { passed };
}
