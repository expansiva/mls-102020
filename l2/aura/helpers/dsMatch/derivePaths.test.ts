/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/derivePaths.test.ts" enhancement="_blank" />

// Tests for the pure path-derivation helpers (no mls runtime). Exposes
// `runDerivePathsTests()` — throws on failure, returns the case count.

import { variationFolder, pageFolder, pageRef, buildWorkItem, originCandidates } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`[derivePaths.test] FAIL: ${msg}`);
}

export function runDerivePathsTests(): { passed: number } {
    let passed = 0;

    // 1. variationFolder
    {
        assert(variationFolder(1, 1) === 'page11', 'page11 wrong');
        assert(variationFolder(1, 2) === 'page12', 'page12 wrong');
        passed++;
    }

    // 2. pageFolder (relative stor folder)
    {
        assert(pageFolder('cafeFlow', 1, 2) === 'cafeFlow/web/desktop/page12', `pageFolder wrong: ${pageFolder('cafeFlow', 1, 2)}`);
        assert(pageFolder('cafeFlow', 1, 2, 'mobile') === 'cafeFlow/web/mobile/page12', 'device override wrong');
        passed++;
    }

    // 3. pageRef (full file reference)
    {
        const ref = pageRef(102043, 'cafeFlow', 1, 2, 'cardapioEstoque', '.defs.ts');
        assert(ref === '_102043_/l2/cafeFlow/web/desktop/page12/cardapioEstoque.defs.ts', `pageRef wrong: ${ref}`);
        passed++;
    }

    // 4. buildWorkItem: with no stor (test context) origin falls back to page11, destination page{layout}{ds}.
    {
        const item = buildWorkItem(102043, 'cafeFlow', 1, 2, 'cardapioEstoque');
        assert(item.defsOrigem === '_102043_/l2/cafeFlow/web/desktop/page11/cardapioEstoque.defs.ts', `defsOrigem wrong: ${item.defsOrigem}`);
        assert(item.defsDestino === '_102043_/l2/cafeFlow/web/desktop/page12/cardapioEstoque.defs.ts', `defsDestino wrong: ${item.defsDestino}`);
        assert(item.originFolder === 'page11', `originFolder wrong: ${item.originFolder}`);
        passed++;
    }

    // 5. originCandidates: ordered fallback with dedupe (pure — no stor).
    {
        const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
        assert(eq(originCandidates(2, 1), [[2, 1], [1, 1]]), `cand(2,1): ${JSON.stringify(originCandidates(2, 1))}`);
        assert(eq(originCandidates(3, 1), [[3, 1], [1, 1]]), `cand(3,1): ${JSON.stringify(originCandidates(3, 1))}`);
        assert(eq(originCandidates(3, 2), [[3, 2], [3, 1], [1, 1]]), `cand(3,2): ${JSON.stringify(originCandidates(3, 2))}`);
        assert(eq(originCandidates(1, 1), [[1, 1]]), `cand(1,1) dedupe: ${JSON.stringify(originCandidates(1, 1))}`);
        passed++;
    }

    // 6. resolveDefsOrigem fallback with a fake mls.stor.files (best-effort — skipped if the
    //    mls global is not writable in this runtime).
    {
        const g = globalThis as any;
        const had = 'mls' in g;
        const prev = g.mls;
        let installed = false;
        try {
            g.mls = { stor: { files: {
                f1: { project: 102043, level: 2, folder: 'cafeFlow/web/desktop/page31', extension: '.defs.ts', shortName: 'home' },
            } } };
            installed = g.mls?.stor?.files != null;
        } catch { installed = false; }

        if (installed) {
            // page32 with page31 present ⇒ origin resolves to the same-layout ancestor page31.
            const it32 = buildWorkItem(102043, 'cafeFlow', 3, 2, 'home');
            assert(it32.originFolder === 'page31', `page32 origin should be page31: ${it32.originFolder}`);
            assert(it32.defsOrigem === '_102043_/l2/cafeFlow/web/desktop/page31/home.defs.ts', `page32 defsOrigem: ${it32.defsOrigem}`);
            // a page absent from every candidate ⇒ fallback page11.
            const itMiss = buildWorkItem(102043, 'cafeFlow', 3, 2, 'ghost');
            assert(itMiss.originFolder === 'page11', `absent page must fall back to page11: ${itMiss.originFolder}`);
            passed++;
            try { if (had) g.mls = prev; else delete g.mls; } catch { /* ignore */ }
        } else {
            console.log('[derivePaths.test] skip stor-fake cases (mls global not writable)');
        }
    }

    console.log(`[derivePaths.test] OK — ${passed} cases`);
    return { passed };
}
