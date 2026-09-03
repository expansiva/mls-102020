/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/matchVariant.test.ts" enhancement="_blank" />

// Tests for matchVariant (Fase A3). matchVariant is pure, so it runs without the
// `mls` runtime. There is no test framework in the repo: this exports
// `runMatchVariantTests()`, which throws on failure and returns the case count on success.

import { matchVariant, type MatchResult } from '/_102020_/l2/aura/helpers/dsMatch/matchVariant.js';
import type { ResolvedLayoutRules, MoleculeCatalogEntry } from '/_102020_/l2/aura/helpers/dsMatch/types.js';

function entry(group: string, variant: string, layoutConfig: Record<string, string>): MoleculeCatalogEntry {
    return { project: 102040, group, variant, tag: `${group.toLowerCase()}--${variant}`, layoutConfig, objective: '', description: '', usagePath: '' };
}

function ds(rules: Record<string, string>): ResolvedLayoutRules {
    return rules as ResolvedLayoutRules;
}

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`[matchVariant.test] FAIL: ${msg}`);
}

function tag(r: MatchResult | null): string {
    return r ? r.entry.variant : '<null>';
}

export function runMatchVariantTests(): { passed: number } {
    let passed = 0;

    // Sample catalog — ORDER matters (it is the tie-break).
    const catalog: MoleculeCatalogEntry[] = [
        entry('groupEnterText', 'ml-enter-text', {}),                                  // wildcard
        entry('groupEnterText', 'ml-floating-text-input', { labelPlacement: 'floating' }),
        entry('groupEnterText', 'ml-floating-alt', { labelPlacement: 'floating' }),    // ties with the previous
        entry('groupEnterText', 'ml-compact-floating', { labelPlacement: 'floating', density: 'compact' }),
        entry('groupNotifyUser', 'ml-toast', { feedback: 'toast' }),
        entry('groupNotifyUser', 'ml-banner', { feedback: 'banner' }),
    ];

    // 1. Simple match on a single axis.
    {
        const r = matchVariant('groupNotifyUser', ds({ feedback: 'toast' }), catalog);
        assert(tag(r) === 'ml-toast', `simple match expected ml-toast, got ${tag(r)}`);
        assert(r!.matched && r!.specificity === 1, 'simple match should be matched=true, spec=1');
        passed++;
    }

    // 2. Specificity: the 2-axis one beats the 1-axis one and the wildcard.
    {
        const r = matchVariant('groupEnterText', ds({ labelPlacement: 'floating', density: 'compact' }), catalog);
        assert(tag(r) === 'ml-compact-floating', `specificity expected ml-compact-floating, got ${tag(r)}`);
        assert(r!.specificity === 2, 'specificity should be 2');
        passed++;
    }

    // 3. Tie (same specificity) → first in catalog order.
    {
        // density != compact, so ml-compact-floating is eliminated; two spec-1 remain.
        const r = matchVariant('groupEnterText', ds({ labelPlacement: 'floating', density: 'comfortable' }), catalog);
        assert(tag(r) === 'ml-floating-text-input', `tie expected the first (ml-floating-text-input), got ${tag(r)}`);
        passed++;
    }

    // 4. Wildcard wins when no specific one matches (labelPlacement=top).
    {
        const r = matchVariant('groupEnterText', ds({ labelPlacement: 'top' }), catalog);
        assert(tag(r) === 'ml-enter-text', `wildcard expected ml-enter-text, got ${tag(r)}`);
        assert(r!.matched === true && r!.specificity === 0, 'wildcard should be matched=true, spec=0');
        passed++;
    }

    // 5. Nothing matches AND no wildcard → null (NO assignment, no arbitrary fallback).
    {
        const r = matchVariant('groupNotifyUser', ds({ feedback: 'inline' }), catalog);
        assert(r === null, `no match should return null, got ${tag(r)}`);
        passed++;
    }

    // 6. Non-existent group → null.
    {
        const r = matchVariant('groupDoesNotExist', ds({}), catalog);
        assert(r === null, 'non-existent group should return null');
        passed++;
    }

    // 7. Determinism: two identical calls → same result (cross-page consistency).
    {
        const a = matchVariant('groupEnterText', ds({ labelPlacement: 'floating', density: 'comfortable' }), catalog);
        const b = matchVariant('groupEnterText', ds({ labelPlacement: 'floating', density: 'comfortable' }), catalog);
        assert(tag(a) === tag(b), 'same input should yield the same molecule');
        passed++;
    }

    console.log(`[matchVariant.test] OK — ${passed} cases`);
    return { passed };
}
