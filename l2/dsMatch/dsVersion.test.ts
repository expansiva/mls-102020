/// <mls fileReference="_102020_/l2/dsMatch/dsVersion.test.ts" enhancement="_blank" />

// Tests for the pure parts of dsVersion (effectiveRulesSignature, renderDsVersionExport).
// No mls runtime. Exposes `runDsVersionTests()`.

import { effectiveRulesSignature, renderDsVersionExport, type PageDsStamp } from '/_102020_/l2/dsMatch/dsVersion.js';

function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(`[dsVersion.test] FAIL: ${msg}`); }

export function runDsVersionTests(): { passed: number } {
    let passed = 0;

    // 1. Signature is order-independent (sorted canonical form).
    {
        const a = effectiveRulesSignature({ boolean: 'toggle', recordsView: 'table' });
        const b = effectiveRulesSignature({ recordsView: 'table', boolean: 'toggle' });
        assert(a === b, `signature should be order-independent: ${a} vs ${b}`);
        passed++;
    }

    // 2. Signature changes when a value changes.
    {
        const before = effectiveRulesSignature({ recordsView: 'table' });
        const after = effectiveRulesSignature({ recordsView: 'grid' });
        assert(before !== after, 'signature should change when an axis value changes');
        passed++;
    }

    // 3. Signature changes when an axis is added/removed (configured set matters).
    {
        const base = effectiveRulesSignature({ recordsView: 'table' });
        const extra = effectiveRulesSignature({ recordsView: 'table', density: 'compact' });
        assert(base !== extra, 'signature should change when an axis is added');
        passed++;
    }

    // 4. Empty rules (default DS) is stable.
    {
        assert(effectiveRulesSignature({}) === effectiveRulesSignature({}), 'empty rules should be stable');
        passed++;
    }

    // 5. renderDsVersionExport emits a valid `as const` export carrying the fields.
    {
        const stamp: PageDsStamp = { ds: 2, dsName: 'Collab design', rulesHash: 'ab12cd34', catalogVersion: '145-efeb16b3', generatedAt: '2026-06-22T10:00:00Z' };
        const src = renderDsVersionExport(stamp);
        assert(src.startsWith('export const dsVersion = '), 'should declare dsVersion');
        assert(src.trimEnd().endsWith('as const;'), 'should be `as const`');
        assert(src.includes('"rulesHash": "ab12cd34"'), 'should carry the rulesHash');
        passed++;
    }

    return { passed };
}
