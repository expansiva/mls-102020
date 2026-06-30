/// <mls fileReference="_102020_/l2/dsMatch/derivePaths.test.ts" enhancement="_blank" />

// Tests for the pure path-derivation helpers (no mls runtime). Exposes
// `runDerivePathsTests()` — throws on failure, returns the case count.

import { variationFolder, pageFolder, pageRef, buildWorkItem } from '/_102020_/l2/dsMatch/derivePaths.js';

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

    // 4. buildWorkItem: origin always page11, destination page{layout}{ds}.
    {
        const item = buildWorkItem(102043, 'cafeFlow', 1, 2, 'cardapioEstoque');
        assert(item.defsOrigem === '_102043_/l2/cafeFlow/web/desktop/page11/cardapioEstoque.defs.ts', `defsOrigem wrong: ${item.defsOrigem}`);
        assert(item.defsDestino === '_102043_/l2/cafeFlow/web/desktop/page12/cardapioEstoque.defs.ts', `defsDestino wrong: ${item.defsDestino}`);
        passed++;
    }

    console.log(`[derivePaths.test] OK — ${passed} cases`);
    return { passed };
}
