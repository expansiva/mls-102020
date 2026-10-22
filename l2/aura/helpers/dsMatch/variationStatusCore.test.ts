/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/variationStatusCore.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    aggregateVariationStatus, genomeUxNumbers, orphanVariationFolders, pageVariationEntry, snapshotVerdictFor, variationAction,
    type VariationInputSnapshot, type VariationPageFacts,
} from '/_102020_/l2/aura/helpers/dsMatch/variationStatusCore.js';

const HASHES = { desktop: 'sha256:d', mobile: 'sha256:m' };
const input = (device: string, sha256: string) => ({ path: `_102047_/l2/reembolsoDespesas/web/${device}/page21/minhas_despesas.defs.ts`, sha256 });

function facts(patch: Partial<VariationPageFacts> = {}): VariationPageFacts {
    return {
        page: 'minhas_despesas', kind: 'ux', hasReceipt: true, staleReasons: [], diagnostic: null,
        defsHashes: { ...HASHES }, ts: { desktop: true, mobile: true }, ...patch,
    };
}

function snapshot(status: 'accepted' | 'refused', sha = HASHES): VariationInputSnapshot {
    return {
        pages: [{
            pageId: 'minhas_despesas', status: 'accepted',
            inputs: { desktop: input('desktop', 'sha256:p11d'), mobile: input('mobile', 'sha256:p11m') },
            problems: [
                { severity: 'warning', code: 'M4_INPUT_VARIANT_MOLECULE_FORBIDDEN', page: 'minhas_despesas', path: 'page21/desktop:molecules.list', message: 'The desktop organism list of variant page21 uses molecule groupviewtable--ml-data-table, which template dueAgenda forbids.' },
                { severity: 'warning', code: 'M4_INPUT_VARIANT_REFUSED', page: 'minhas_despesas', path: 'page21:', message: 'Variant page21 of minhas_despesas is left out: desktop molecule groupviewtable--ml-data-table of list is of group groupViewTable, which template dueAgenda forbids.' },
                { severity: 'warning', code: 'M4_INPUT_VARIANT_REFUSED', page: 'minhas_despesas', path: 'page31:', message: 'Variant page31 is left out.' },
            ],
            variants: [{ genome: 'page21', status, inputs: { desktop: input('desktop', sha.desktop), mobile: input('mobile', sha.mobile) } }],
        }],
    };
}

void test('variationStatus generation: no receipt, or a device without variant defs, or an unreadable page', () => {
    const accepted = snapshotVerdictFor(snapshot('accepted'), 'minhas_despesas', 'page21', HASHES);
    const noReceipt = pageVariationEntry(facts({ hasReceipt: false, staleReasons: ['receipt'] }), accepted);
    assert.equal(noReceipt.status, 'generation');
    assert.deepEqual(noReceipt.staleReasons, []);
    const noMobile = pageVariationEntry(facts({ defsHashes: { desktop: 'sha256:d', mobile: null }, staleReasons: ['variant'] }), { kind: 'outdated' });
    assert.equal(noMobile.status, 'generation');
    assert.deepEqual(noMobile.devices, { desktop: 'stale', mobile: 'generation' });
    const broken = pageVariationEntry(facts({ diagnostic: 'GENOME_UX_TEMPLATE_MISSING: x.md' }), accepted);
    assert.equal(broken.status, 'generation');
    assert.equal(broken.diagnostic, 'GENOME_UX_TEMPLATE_MISSING: x.md');
});

void test('variationStatus stale: the receipt does not match (genomeUxStale reasons are kept)', () => {
    const entry = pageVariationEntry(facts({ staleReasons: ['template', 'rules'] }), snapshotVerdictFor(snapshot('accepted'), 'minhas_despesas', 'page21', HASHES));
    assert.equal(entry.status, 'stale');
    assert.deepEqual(entry.devices, { desktop: 'stale', mobile: 'stale' });
    assert.deepEqual(entry.staleReasons, ['template', 'rules']);
});

void test('variationStatus refused: from the input20 snapshot, with its reason messages for that genome only', () => {
    const verdict = snapshotVerdictFor(snapshot('refused'), 'minhas_despesas', 'page21', HASHES);
    assert.equal(verdict.kind, 'refused');
    const entry = pageVariationEntry(facts(), verdict);
    assert.equal(entry.status, 'refused');
    assert.deepEqual(entry.devices, { desktop: 'refused', mobile: 'refused' });
    assert.equal(entry.refusedReasons.length, 2);
    assert.match(entry.refusedReasons[0], /forbids/u);
    assert.ok(entry.refusedReasons.every(reason => !reason.includes('page31')));
});

void test('variationStatus refused only for the defs the snapshot saw: regenerated defs are materialize', () => {
    const verdict = snapshotVerdictFor(snapshot('refused'), 'minhas_despesas', 'page21', { desktop: 'sha256:new', mobile: 'sha256:m' });
    assert.deepEqual(verdict, { kind: 'outdated' });
    assert.equal(pageVariationEntry(facts({ defsHashes: { desktop: 'sha256:new', mobile: 'sha256:m' } }), verdict).status, 'materialize');
    assert.deepEqual(snapshotVerdictFor(snapshot('accepted'), 'minhas_despesas', 'page41', HASHES), { kind: 'outdated' });
    assert.deepEqual(snapshotVerdictFor(null, 'minhas_despesas', 'page21', HASHES), { kind: 'absent' });
});

void test('variationStatus materialize: the .ts of a device is missing', () => {
    const entry = pageVariationEntry(facts({ ts: { desktop: true, mobile: false } }), snapshotVerdictFor(snapshot('accepted'), 'minhas_despesas', 'page21', HASHES));
    assert.equal(entry.status, 'materialize');
    assert.deepEqual(entry.devices, { desktop: 'fresh', mobile: 'materialize' });
});

void test('variationStatus fresh: receipt current, accepted by input20, both .ts present', () => {
    const entry = pageVariationEntry(facts(), snapshotVerdictFor(snapshot('accepted'), 'minhas_despesas', 'page21', HASHES));
    assert.equal(entry.status, 'fresh');
    // Without a snapshot (the materializer never ran) the .ts decide.
    assert.equal(pageVariationEntry(facts(), { kind: 'absent' }).status, 'fresh');
});

void test('variationStatus base page11: no receipt check; refused page reports its errors', () => {
    const snap: VariationInputSnapshot = {
        pages: [{
            pageId: 'inicio', status: 'refused',
            inputs: { desktop: { path: 'd', sha256: 'sha256:d' }, mobile: { path: 'm', sha256: 'sha256:m' } },
            problems: [{ severity: 'error', code: 'M4_INPUT_INTENT_UNKNOWN', page: 'inicio', path: 'desktop:organisms.x', message: 'Intent x is unknown.' }],
        }],
    };
    const base = pageVariationEntry(facts({ page: 'inicio', kind: 'base', hasReceipt: false }), snapshotVerdictFor(snap, 'inicio', 'page11', HASHES));
    assert.equal(base.status, 'refused');
    assert.deepEqual(base.refusedReasons, ['Intent x is unknown.']);
    assert.equal(pageVariationEntry(facts({ page: 'inicio', kind: 'base', hasReceipt: false }), { kind: 'accepted' }).status, 'fresh');
});

void test('variationStatus aggregation, UX numbers, orphans and the action', () => {
    const fresh = pageVariationEntry(facts({ page: 'a' }), { kind: 'accepted' });
    const stale = pageVariationEntry(facts({ page: 'b', staleReasons: ['page11'] }), { kind: 'accepted' });
    const refused = pageVariationEntry(facts({ page: 'c' }), { kind: 'refused', reasons: ['r'] });
    const mat = pageVariationEntry(facts({ page: 'd', ts: { desktop: false, mobile: true } }), { kind: 'accepted' });
    const agg = aggregateVariationStatus([fresh, stale, refused, mat]);
    assert.equal(agg.status, 'stale');
    assert.deepEqual(agg.counts, { generation: 0, stale: 1, refused: 1, materialize: 1, fresh: 1 });

    assert.deepEqual(genomeUxNumbers({ '1': {}, '3': {}, '2': {}, '10': {}, x: {} }), [2, 3]);
    assert.deepEqual(orphanVariationFolders(['page11', 'page21', 'page22', 'page31', 'page12', 'tmp'], [2, 3]), ['page12', 'page22']);

    assert.deepEqual(variationAction('ux', [fresh, stale, refused, mat]), { kind: 'generate', pages: ['b'] });
    assert.deepEqual(variationAction('ux', [fresh, refused, mat]), { kind: 'materialize' });
    assert.deepEqual(variationAction('ux', [fresh, refused]), { kind: 'regenerate', pages: ['c'] });
    assert.deepEqual(variationAction('base', [stale, mat]), { kind: 'materialize' });
    assert.equal(variationAction('base', [refused]), null);
    assert.equal(variationAction('orphan', [mat]), null);
});
