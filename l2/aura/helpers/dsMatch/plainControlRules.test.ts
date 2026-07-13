/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/plainControlRules.test.ts" enhancement="_blank" />

// Tests for axesForGroup / rulesForPlainElement (pure). Exposes `runPlainControlRulesTests()`.

import { axesForGroup, rulesForPlainElement } from '/_102020_/l2/aura/helpers/dsMatch/plainControlRules.js';
import { layoutRuleDefaults } from '/_102020_/l2/designSystemAuraBase.js';
import type { ResolvedLayoutRules } from '/_102020_/l2/aura/helpers/dsMatch/types.js';

function rules(over: Record<string, string>): ResolvedLayoutRules {
    return { ...layoutRuleDefaults(), ...over } as ResolvedLayoutRules;
}
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(`[plainControlRules.test] FAIL: ${msg}`); }
function json(v: unknown): string { return JSON.stringify(v); }

export function runPlainControlRulesTests(): { passed: number } {
    let passed = 0;

    // 1. axesForGroup: only configured axes whose vocabulary `groups` contains the group.
    {
        const r = axesForGroup('groupEnterText', new Set(['labelPlacement', 'recordsView', 'selectOne']));
        assert(json(r) === json(['labelPlacement']), `expected [labelPlacement], got ${json(r)}`);
        const r2 = axesForGroup('groupViewData', new Set(['labelPlacement', 'recordsView', 'listOverflow']));
        assert(json(r2) === json(['listOverflow', 'recordsView']), `expected [listOverflow, recordsView] (vocab order), got ${json(r2)}`);
        const r3 = axesForGroup('groupEnterText', new Set<string>());
        assert(r3.length === 0, `expected no axes when nothing configured, got ${json(r3)}`);
        passed++;
    }

    // 2. Rejected text field (group known): group axes + configured input transversals.
    {
        const r = rulesForPlainElement('field', 'groupEnterText',
            rules({ labelPlacement: 'floating', requiredMark: 'asterisk' }),
            new Set(['labelPlacement', 'requiredMark']));
        assert(json(r) === json({ labelPlacement: 'floating', requiredMark: 'asterisk' }),
            `expected floating+asterisk, got ${json(r)}`);
        passed++;
    }

    // 3. Omitted field (no group): fallback = configured input transversals only.
    {
        const r = rulesForPlainElement('field', null,
            rules({ labelPlacement: 'floating', validation: 'tooltip', recordsView: 'grid' }),
            new Set(['labelPlacement', 'validation', 'recordsView']));
        assert(json(r) === json({ labelPlacement: 'floating', validation: 'tooltip' }),
            `expected transversals only (no recordsView on a field), got ${json(r)}`);
        passed++;
    }

    // 4. Rejected container (queryList → groupViewData): group axes, NO input transversals.
    {
        const r = rulesForPlainElement('container', 'groupViewData',
            rules({ recordsView: 'grid', labelPlacement: 'floating' }),
            new Set(['recordsView', 'labelPlacement']));
        assert(json(r) === json({ recordsView: 'grid' }), `expected recordsView only, got ${json(r)}`);
        passed++;
    }

    // 5. Nothing applies → null (caller must OMIT layoutRules, never write {}).
    {
        const action = rulesForPlainElement('action', null, rules({}), new Set(['labelPlacement']));
        assert(action === null, `action without group: expected null, got ${json(action)}`);
        const field = rulesForPlainElement('field', 'groupEnterText', rules({}), new Set<string>());
        assert(field === null, `no configured axis: expected null, got ${json(field)}`);
        const rejectedAction = rulesForPlainElement('action', 'groupTriggerAction', rules({}), new Set(['labelPlacement']));
        assert(rejectedAction === null, `groupTriggerAction not governed by labelPlacement: expected null, got ${json(rejectedAction)}`);
        passed++;
    }

    // 6. Rejected action (group governed by a configured axis) → that axis only.
    {
        const r = rulesForPlainElement('action', 'groupTriggerAction',
            rules({ actionStyle: 'icon', labelPlacement: 'floating' }),
            new Set(['actionStyle', 'labelPlacement']));
        assert(json(r) === json({ actionStyle: 'icon' }), `expected actionStyle only, got ${json(r)}`);
        passed++;
    }

    console.log(`[plainControlRules.test] OK — ${passed} cases`);
    return { passed };
}
