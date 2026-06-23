/// <mls fileReference="_102020_/l2/dsMatch/dsVersion.test.ts" enhancement="_blank" />

// Tests for the pure parts of dsVersion. No mls runtime. Exposes `runDsVersionTests()`.

import {
    effectiveRulesSignature,
    moleculeContentSignature,
    parseUsedMolecules,
    decidePageDsCheck,
    renderDsVersionExport,
    type PageDsStamp,
    type UsedMolecule,
} from '/_102020_/l2/dsMatch/dsVersion.js';
import type { MoleculeCatalogEntry, ResolvedDs } from '/_102020_/l2/dsMatch/types.js';

function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(`[dsVersion.test] FAIL: ${msg}`); }

function mol(project: number, group: string, tag: string, layoutConfig: Record<string, string> = {}, description = `desc-${tag}`): MoleculeCatalogEntry {
    return { project, group, tag, variant: tag, layoutConfig, objective: '', description, usagePath: '' };
}
function ds(rules: Record<string, string>): ResolvedDs { return rules as ResolvedDs; }

export function runDsVersionTests(): { passed: number } {
    let passed = 0;

    // ── effectiveRulesSignature ──────────────────────────────────────────────
    {
        assert(
            effectiveRulesSignature({ boolean: 'toggle', recordsView: 'table' }) ===
            effectiveRulesSignature({ recordsView: 'table', boolean: 'toggle' }),
            'rules signature should be order-independent',
        );
        assert(effectiveRulesSignature({ recordsView: 'table' }) !== effectiveRulesSignature({ recordsView: 'grid' }), 'value change should change hash');
        assert(effectiveRulesSignature({}) === effectiveRulesSignature({}), 'empty rules should be stable');
        passed++;
    }

    // ── moleculeContentSignature (definition / description) ───────────────────
    {
        const a = moleculeContentSignature(mol(102040, 'g', 'ml-x', {}, 'same'));
        const b = moleculeContentSignature(mol(102040, 'g', 'ml-x', {}, 'same'));
        const c = moleculeContentSignature(mol(102040, 'g', 'ml-x', {}, 'changed'));
        assert(a === b, 'same description → same signature');
        assert(a !== c, 'changed description → changed signature');
        passed++;
    }

    // ── parseUsedMolecules (flat, unique by project|tag) ──────────────────────
    {
        const flat = `export const moleculeAssignments = ${JSON.stringify([
            { project: 102040, group: 'g1', tag: 'ml-toast' },
            { project: 102040, group: 'g1', tag: 'ml-toast' }, // repeated
            { project: 102041, group: 'g2', tag: 'ml-grid' },
        ], null, 2)} as const;`;
        assert(parseUsedMolecules(flat).length === 2, 'should dedupe to 2 molecules');
        assert(parseUsedMolecules('nothing here').length === 0, 'missing export → empty');
        passed++;
    }

    // ── decidePageDsCheck ─────────────────────────────────────────────────────
    const catalog: MoleculeCatalogEntry[] = [
        mol(102040, 'groupNotifyUser', 'ml-toast', { feedback: 'toast' }, 'v1'),
        mol(102041, 'groupViewData', 'ml-grid', { recordsView: 'grid' }, 'v1'), // different source project
    ];
    const used: UsedMolecule[] = [{ project: 102040, tag: 'ml-toast', group: 'groupNotifyUser' }];
    const rules = ds({ feedback: 'toast' });
    const configuredAxes = new Set(['feedback']);
    const freshStamp: PageDsStamp = {
        ds: 2, dsName: 'X', rulesHash: effectiveRulesSignature({ feedback: 'toast' }),
        moleculesSeen: { '102040|ml-toast': moleculeContentSignature(catalog[0]) }, generatedAt: 't',
    };
    const base = { used, catalog, rules, configuredAxes, currentRulesHash: effectiveRulesSignature({ feedback: 'toast' }) };

    // 4. No stamp → stale.
    { const r = decidePageDsCheck({ ...base, stamp: null }); assert(r.status === 'stale' && r.staleReason === 'no-stamp', 'no stamp → stale'); passed++; }

    // 5. Everything matches → fresh.
    { assert(decidePageDsCheck({ ...base, stamp: freshStamp }).status === 'fresh', 'all unchanged → fresh'); passed++; }

    // 6. Rules changed → stale (reason 'rules').
    { const r = decidePageDsCheck({ ...base, stamp: { ...freshStamp, rulesHash: 'different' } }); assert(r.status === 'stale' && r.staleReason === 'rules', 'rules change → stale'); passed++; }

    // 7. Used molecule removed → stale (reason + offending molecule).
    {
        const r = decidePageDsCheck({ ...base, catalog: [catalog[1]], stamp: freshStamp });
        assert(r.status === 'stale' && r.staleReason === 'molecule-removed' && r.staleMolecule?.tag === 'ml-toast', 'removed → stale');
        passed++;
    }

    // 8. Used molecule no longer compatible (DS now wants feedback=banner) → stale.
    {
        const r = decidePageDsCheck({
            ...base, rules: ds({ feedback: 'banner' }), currentRulesHash: effectiveRulesSignature({ feedback: 'banner' }),
            stamp: { ...freshStamp, rulesHash: effectiveRulesSignature({ feedback: 'banner' }) },
        });
        assert(r.status === 'stale' && r.staleReason === 'molecule-incompatible', 'incompatible → stale');
        passed++;
    }

    // 9. Unrelated molecule (other project, not used) changed → still fresh.
    {
        const catalog2 = [catalog[0], mol(102041, 'groupViewData', 'ml-grid', { recordsView: 'grid' }, 'v2-changed')];
        assert(decidePageDsCheck({ ...base, catalog: catalog2, stamp: freshStamp }).status === 'fresh', 'unrelated change → fresh');
        passed++;
    }

    // 10. Used molecule changed (still present + compatible) → review, lists the molecule.
    {
        const catalog2 = [mol(102040, 'groupNotifyUser', 'ml-toast', { feedback: 'toast' }, 'v2-changed'), catalog[1]];
        const r = decidePageDsCheck({ ...base, catalog: catalog2, stamp: freshStamp });
        assert(r.status === 'review' && r.changed.length === 1 && r.changed[0].tag === 'ml-toast', 'used molecule changed → review');
        passed++;
    }

    // ── renderDsVersionExport ─────────────────────────────────────────────────
    {
        const stamp: PageDsStamp = { ds: 2, dsName: 'Collab design', rulesHash: 'ab12cd34', moleculesSeen: { '102040|ml-toast': '9f2a' }, generatedAt: '2026-06-22T10:00:00Z' };
        const src = renderDsVersionExport(stamp);
        assert(src.startsWith('export const dsVersion = ') && src.trimEnd().endsWith('as const;'), 'valid as-const export');
        assert(src.includes('"moleculesSeen"'), 'should carry moleculesSeen');
        passed++;
    }

    return { passed };
}
