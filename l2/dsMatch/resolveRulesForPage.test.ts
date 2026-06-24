/// <mls fileReference="_102020_/l2/dsMatch/resolveRulesForPage.test.ts" enhancement="_blank" />

// Tests for the pure cascade core (mergeRuleLevels, toResolvedLayoutRules, effectiveRulesProvenance).
// No mls runtime. Exposes `runResolveRulesForPageTests()`.

import { mergeRuleLevels, toResolvedLayoutRules, effectiveRulesProvenance, UNSET } from '/_102020_/l2/dsMatch/resolveRulesForPage.js';
import { layoutRuleDefaults } from '/_102020_/l2/designSystemAuraBase.js';

function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(`[resolveRulesForPage.test] FAIL: ${msg}`); }

export function runResolveRulesForPageTests(): { passed: number } {
    let passed = 0;

    // 1. Cascade: page wins over module wins over project.
    {
        const m = mergeRuleLevels(
            { recordsView: 'table', feedback: 'toast', selectOne: 'dropdown' }, // project
            { feedback: 'banner' },                                             // module
            { recordsView: 'grid' },                                            // page
        );
        assert(m.recordsView === 'grid', `recordsView should be page's grid, got ${m.recordsView}`);
        assert(m.feedback === 'banner', `feedback should be module's banner, got ${m.feedback}`);
        assert(m.selectOne === 'dropdown', 'selectOne should stay project');
        passed++;
    }

    // 2. unset removes an inherited axis → not configured.
    {
        const m = mergeRuleLevels({ feedback: 'toast', recordsView: 'table' }, undefined, { feedback: UNSET });
        assert(!('feedback' in m), 'feedback should be removed by unset');
        assert(m.recordsView === 'table', 'recordsView untouched');
        passed++;
    }

    // 2b. A concrete value AFTER unset (more specific) re-sets it.
    {
        // project sets feedback, module unsets, page re-sets → page wins.
        const m = mergeRuleLevels({ feedback: 'toast' }, { feedback: UNSET }, { feedback: 'banner' });
        assert(m.feedback === 'banner', `re-set after unset should win, got ${m.feedback}`);
        passed++;
    }

    // 3. No overrides → identical to project (backward compat).
    {
        const m = mergeRuleLevels({ recordsView: 'table', labelPlacement: 'floating' });
        assert(JSON.stringify(m) === JSON.stringify({ recordsView: 'table', labelPlacement: 'floating' }), `compat failed: ${JSON.stringify(m)}`);
        passed++;
    }

    // 4. Invalid axis value is ignored.
    {
        const m = mergeRuleLevels({ recordsView: 'bogus', feedback: 'toast' });
        assert(!('recordsView' in m), 'invalid value should be ignored');
        assert(m.feedback === 'toast', 'valid value kept');
        passed++;
    }

    // 5. toResolvedLayoutRules fills defaults; configured overrides default.
    {
        const resolved = toResolvedLayoutRules({ recordsView: 'grid' });
        const defs = layoutRuleDefaults();
        assert(resolved.recordsView === 'grid', 'configured value applied');
        assert(resolved.feedback === defs.feedback, 'unconfigured axis falls to default');
        assert(Object.keys(resolved).length === Object.keys(defs).length, 'all axes present');
        passed++;
    }

    // 6. Provenance: source per axis + unset set.
    {
        const { effective, unset } = effectiveRulesProvenance(
            { recordsView: 'table', feedback: 'toast' },
            { feedback: 'banner' },
            { recordsView: 'grid', selectOne: UNSET },
        );
        assert(effective.recordsView.source === 'page' && effective.recordsView.value === 'grid', 'recordsView provenance wrong');
        assert(effective.feedback.source === 'module' && effective.feedback.value === 'banner', 'feedback provenance wrong');
        assert(unset.has('selectOne'), 'selectOne should be marked unset');
        passed++;
    }

    console.log(`[resolveRulesForPage.test] OK — ${passed} cases`);
    return { passed };
}
