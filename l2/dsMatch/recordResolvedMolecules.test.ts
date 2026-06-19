/// <mls fileReference="_102020_/l2/dsMatch/recordResolvedMolecules.test.ts" enhancement="_blank" />

// Tests for the pure parts of recordResolvedMolecules (catalogSignature, buildDsResolution).
// No mls runtime. Exposes `runRecordResolvedMoleculesTests()`.

import { catalogSignature, buildDsResolution } from '/_102020_/l2/dsMatch/recordResolvedMolecules.js';
import type { ResolvedDs, MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';

function entry(group: string, variant: string, layoutConfig: Record<string, string>): MoleculeCatalogEntry {
    return { project: 102040, group, variant, tag: `${group.toLowerCase()}--${variant}`, layoutConfig, objective: `obj-${variant}`, description: `desc-${variant}`, usagePath: `_102020_/l2/skills/molecules/${group}/usage.ts` };
}
function ds(rules: Record<string, string>): ResolvedDs { return rules as ResolvedDs; }
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(`[recordResolvedMolecules.test] FAIL: ${msg}`); }

const catalog: MoleculeCatalogEntry[] = [
    entry('groupNotifyUser', 'ml-toast', { feedback: 'toast' }),
    entry('groupNotifyUser', 'ml-banner', { feedback: 'banner' }),
    entry('groupEnterText', 'ml-enter-text', {}),
];

export function runRecordResolvedMoleculesTests(): { passed: number } {
    let passed = 0;

    // 1. catalogSignature is deterministic and order-independent.
    {
        const a = catalogSignature(catalog);
        const b = catalogSignature([...catalog].reverse());
        assert(a === b, `signature should be order-independent: ${a} vs ${b}`);
        passed++;
    }

    // 2. catalogSignature changes when candidacy changes.
    {
        const before = catalogSignature(catalog);
        const mutated = [...catalog, entry('groupEnterText', 'ml-floating-text-input', { labelPlacement: 'floating' })];
        assert(before !== catalogSignature(mutated), 'signature should change when a molecule is added');
        passed++;
    }

    // 3. buildDsResolution resolves the full table and carries project + version.
    {
        const { resolvedMolecules, catalogVersion } = buildDsResolution(ds({ feedback: 'toast' }), catalog);
        assert(!!resolvedMolecules['groupNotifyUser'], 'groupNotifyUser missing in table');
        assert(resolvedMolecules['groupNotifyUser'].variant === 'ml-toast', 'wrong resolved variant');
        assert(resolvedMolecules['groupNotifyUser'].project === 102040, 'project not propagated');
        assert(typeof catalogVersion === 'string' && catalogVersion.includes('-'), 'catalogVersion malformed');
        // full table → also includes groupEnterText.
        assert(!!resolvedMolecules['groupEnterText'], 'full table should include every group');
        passed++;
    }

    console.log(`[recordResolvedMolecules.test] OK — ${passed} cases`);
    return { passed };
}
