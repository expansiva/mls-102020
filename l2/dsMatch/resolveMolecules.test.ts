/// <mls fileReference="_102020_/l2/dsMatch/resolveMolecules.test.ts" enhancement="_blank" />

// Tests for the pure parts of resolveMolecules.ts (Fase C): collectUsedGroups,
// resolveMolecules, assignMoleculesToPage, collectUsagePaths. No `mls` runtime.
// Exposes `runResolveMoleculesTests()` — throws on failure, returns case count.

import {
    collectUsedGroups,
    resolveMolecules,
    assignMoleculesToPage,
    collectUsagePaths,
} from '/_102020_/l2/dsMatch/resolveMolecules.js';
import type { ResolvedLayoutRules, MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';
import type { Agent1Output } from '/_102020_/l2/dsMatch/agent1.js';

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

    // 1. collectUsedGroups: dedupe across pages/organisms, sorted.
    {
        const outputs: Agent1Output[] = [
            { path: 'a.ts', perOrganism: [{ organismName: 'o1', groups: ['groupEnterText', 'groupNotifyUser'] }] },
            { path: 'b.ts', perOrganism: [{ organismName: 'o2', groups: ['groupEnterText'] }] },
        ];
        const used = collectUsedGroups(outputs);
        assert(JSON.stringify(used) === JSON.stringify(['groupEnterText', 'groupNotifyUser']), `used groups wrong: ${JSON.stringify(used)}`);
        passed++;
    }

    // 2. resolveMolecules: picks per DS, deterministically; records matched/fallback.
    {
        const resolved = resolveMolecules(ds({ labelPlacement: 'floating', feedback: 'toast' }), catalog);
        assert(resolved['groupEnterText'].variant === 'ml-floating-text-input', 'text should resolve to floating');
        assert(resolved['groupEnterText'].matched === true, 'text should be matched');
        assert(resolved['groupNotifyUser'].variant === 'ml-toast', 'notify should resolve to toast');
        passed++;
    }

    // 3. No match (and no wildcard) → group is OMITTED (no fallback, no assignment).
    {
        const resolved = resolveMolecules(ds({ labelPlacement: 'top', feedback: 'inline' }), catalog);
        assert(resolved['groupEnterText'].variant === 'ml-enter-text', 'text should pick wildcard');
        assert(resolved['groupNotifyUser'] === undefined, 'notify must be omitted (no inline molecule, no fallback)');
        passed++;
    }

    // 3b. (2) Gating: a group is skipped when the DS configured no axis governing it.
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

    // 5. assignMoleculesToPage: maps groups → {group, tag, purpose}, drops unresolved.
    {
        const resolved = resolveMolecules(ds({ labelPlacement: 'floating', feedback: 'toast' }), catalog);
        const output: Agent1Output = {
            path: 'menu.ts',
            perOrganism: [
                { organismName: 'form', groups: ['groupEnterText', 'groupUnresolved'] },
                { organismName: 'list', groups: [] },
            ],
        };
        const assignment = assignMoleculesToPage(output, resolved);
        assert(assignment.path === 'menu.ts', 'path preserved');
        assert(assignment.organisms[0].molecules.length === 1, 'unresolved group should be dropped');
        const m = assignment.organisms[0].molecules[0];
        assert(m.group === 'groupEnterText' && m.tag.includes('ml-floating-text-input') && m.purpose === 'obj-ml-floating-text-input',
            `assigned molecule wrong: ${JSON.stringify(m)}`);
        assert(m.project === 102040, `assigned molecule project wrong: ${m.project}`);
        assert(assignment.organisms[1].molecules.length === 0, 'empty organism stays empty');
        passed++;
    }

    // 6. collectUsagePaths: distinct usage paths for the page.
    {
        const resolved = resolveMolecules(ds({ labelPlacement: 'floating', feedback: 'toast' }), catalog);
        const output: Agent1Output = {
            path: 'menu.ts',
            perOrganism: [{ organismName: 'form', groups: ['groupEnterText', 'groupNotifyUser'] }],
        };
        const paths = collectUsagePaths(assignMoleculesToPage(output, resolved), resolved);
        assert(paths.length === 2, `expected 2 usage paths, got ${paths.length}`);
        assert(paths.every(p => p.endsWith('/usage.ts')), 'usage paths malformed');
        passed++;
    }

    console.log(`[resolveMolecules.test] OK — ${passed} cases`);
    return { passed };
}
