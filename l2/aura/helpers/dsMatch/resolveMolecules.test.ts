/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/resolveMolecules.test.ts" enhancement="_blank" />

// Tests for the pure parts of resolveMolecules.ts (Fase C): resolveMolecules + the DS gate.
// No `mls` runtime. Exposes `runResolveMoleculesTests()` — throws on failure, returns count.

import { resolveMolecules } from '/_102020_/l2/aura/helpers/dsMatch/resolveMolecules.js';
import type { ResolvedLayoutRules, MoleculeCatalogEntry } from '/_102020_/l2/aura/helpers/dsMatch/types.js';

function entry(group: string, variant: string, layoutConfig: Record<string, string>): MoleculeCatalogEntry {
    return {
        project: 102040,
        group, variant,
        tag: `${group.toLowerCase()}--${variant}`,
        layoutConfig,
        objective: `obj-${variant}`,
        description: `desc-${variant}`,
        usagePath: `_102020_/l2/skills/molecules/${group}/usage.ts`,
    };
}

function ds(rules: Record<string, string>): ResolvedLayoutRules { return rules as ResolvedLayoutRules; }

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`[resolveMolecules.test] FAIL: ${msg}`);
}

const catalog: MoleculeCatalogEntry[] = [
    entry('groupEnterText', 'ml-enter-text', {}),
    entry('groupEnterText', 'ml-floating-text-input', { labelPlacement: 'floating' }),
    entry('groupNotifyUser', 'ml-toast', { feedback: 'toast' }),
    entry('groupNotifyUser', 'ml-banner', { feedback: 'banner' }),
];

export function runResolveMoleculesTests(): { passed: number } {
    let passed = 0;

    // 1. resolveMolecules: picks per DS, deterministically; records matched/fallback.
    {
        const resolved = resolveMolecules(ds({ labelPlacement: 'floating', feedback: 'toast' }), catalog);
        assert(resolved['groupEnterText'].variant === 'ml-floating-text-input', 'text should resolve to floating');
        assert(resolved['groupEnterText'].matched === true, 'text should be matched');
        assert(resolved['groupNotifyUser'].variant === 'ml-toast', 'notify should resolve to toast');
        passed++;
    }

    // 2. No match (and no wildcard) → group is OMITTED (no fallback, no assignment).
    {
        const resolved = resolveMolecules(ds({ labelPlacement: 'top', feedback: 'inline' }), catalog);
        assert(resolved['groupEnterText'].variant === 'ml-enter-text', 'text should pick wildcard');
        assert(resolved['groupNotifyUser'] === undefined, 'notify must be omitted (no inline molecule, no fallback)');
        passed++;
    }

    // 3. Gating: a group is skipped when the DS configured no axis governing it.
    {
        // feedback configured → groupNotifyUser eligible; groupEnterText NOT (labelPlacement not configured).
        const resolved = resolveMolecules(ds({ feedback: 'toast' }), catalog, undefined, new Set(['feedback']));
        assert(!!resolved['groupNotifyUser'], 'groupNotifyUser should resolve (feedback configured)');
        assert(resolved['groupEnterText'] === undefined, 'groupEnterText should be skipped (labelPlacement not configured)');
        passed++;
    }

    // 4. resolveMolecules: restrict to a subset of groups.
    {
        const resolved = resolveMolecules(ds({ feedback: 'toast' }), catalog, ['groupNotifyUser']);
        assert(Object.keys(resolved).length === 1 && !!resolved['groupNotifyUser'], 'should resolve only the requested group');
        passed++;
    }

    console.log(`[resolveMolecules.test] OK — ${passed} cases`);
    return { passed };
}
