/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/registerPageGenome.test.ts" enhancement="_blank" />

// Tests for the pure parts of registerPageGenome (buildGenomeEntry + upsertModuleGenome).
// No mls runtime. Exposes `runRegisterPageGenomeTests()` — throws on failure, returns count.

import { buildGenomeEntry, upsertModuleGenome } from '/_102020_/l2/aura/helpers/dsMatch/registerPageGenome.js';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`[registerPageGenome.test] FAIL: ${msg}`);
}

// The real module.ts shape: typed, single-quoted keys, `as const`.
const existing = `/// <mls fileReference="_102043_/l2/cafeFlow/module.ts" enhancement="_blank" />

import type { AuraModuleFrontendDefinition, IPaths, ISkill, IGenomeConfig } from '/_102029_/l2/contracts/bootstrap.js';

export const moduleGenome: Record<string, IGenomeConfig> = {
  'web/desktop/page11': {
    designSystem: 'default',
    device: 'desktop',
    layout: 'standard',
  }
} as const;
`;

export function runRegisterPageGenomeTests(): { passed: number } {
    let passed = 0;

    // 1. buildGenomeEntry: folder key uses indices; value uses names.
    {
        const e = buildGenomeEntry(1, 2, 'ERP Compact', 'standard');
        assert(e.key === 'web/desktop/page12', `key wrong: ${e.key}`);
        assert(e.value.designSystem === 'ERP Compact' && e.value.layout === 'standard' && e.value.device === 'desktop', 'value wrong');
        passed++;
    }

    // 2. upsert ADDS into the existing object — no second moduleGenome block, page11 kept.
    {
        const out = upsertModuleGenome(existing, 'web/desktop/page12', { designSystem: 'ERP Compact', device: 'desktop', layout: 'standard' });
        assert(out != null, 'upsert returned null on a valid module.ts');
        const blocks = (out!.match(/export const moduleGenome/g) || []).length;
        assert(blocks === 1, `expected ONE moduleGenome block, got ${blocks}`);
        assert(out!.includes(`'web/desktop/page11'`), 'page11 entry was lost');
        assert(out!.includes(`"web/desktop/page12"`), 'page12 entry not added');
        assert(out!.includes('as const'), '`as const` suffix lost');
        assert(out!.includes('Record<string, IGenomeConfig>'), 'type annotation lost');
        // page11 must get a trailing comma before page12.
        assert(/\},\s*"web\/desktop\/page12"/.test(out!), 'missing comma between entries');
        passed++;
    }

    // 3. Idempotent UPDATE: re-upsert the same key replaces its value, no duplicate key.
    {
        const once = upsertModuleGenome(existing, 'web/desktop/page12', { designSystem: 'A', device: 'desktop', layout: 'standard' })!;
        const twice = upsertModuleGenome(once, 'web/desktop/page12', { designSystem: 'B', device: 'desktop', layout: 'standard' })!;
        const keyCount = (twice.match(/web\/desktop\/page12/g) || []).length;
        assert(keyCount === 1, `expected page12 once, got ${keyCount}`);
        assert(twice.includes('"designSystem": "B"'), 'value not updated to B');
        assert(!twice.includes('"designSystem": "A"'), 'old value A still present');
        passed++;
    }

    // 4. No moduleGenome declaration → returns null (caller appends/creates).
    {
        assert(upsertModuleGenome('export const foo = 1;', 'web/desktop/page12', {}) === null, 'should return null without moduleGenome');
        passed++;
    }

    console.log(`[registerPageGenome.test] OK — ${passed} cases`);
    return { passed };
}
