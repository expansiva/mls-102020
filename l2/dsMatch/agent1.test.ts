/// <mls fileReference="_102020_/l2/dsMatch/agent1.test.ts" enhancement="_blank" />

// Tests for the pure parts of agent1.ts (Fase B): extractOrganisms,
// validateAgent1Output and a buildAgent1HumanPrompt smoke check. No `mls` runtime
// needed. Exposes `runAgent1Tests()` — throws on failure, returns the case count.

import {
    extractOrganisms,
    validateAgent1Output,
    buildAgent1HumanPrompt,
} from '/_102020_/l2/dsMatch/agent1.js';
import type { GroupInfo } from '/_102020_/l2/dsMatch/groupCatalog.js';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`[agent1.test] FAIL: ${msg}`);
}

const fakePlan = {
    data: {
        pageDefinition: {
            sections: [
                {
                    sectionName: 'Create',
                    organisms: [{
                        organismName: 'form',
                        purpose: 'Create an item',
                        userActions: ['informarNome', 'informarPreco'],
                        requiredEntities: ['itemEntity'],
                        readsFields: [],
                        writesFields: ['Item.nome', 'Item.preco'],
                        rulesApplied: [],
                    }],
                },
                {
                    sectionName: 'List',
                    organisms: [{ organismName: 'list', purpose: 'Show items' }],
                },
            ],
        },
        bffCommands: [{ commandName: 'createItem', kind: 'command', input: {}, output: {} }],
    },
};

const groups: GroupInfo[] = [
    { group: 'groupEnterText', description: 'Enter free-form text.' },
    { group: 'groupEnterNumber', description: 'Enter a numeric value.' },
    { group: 'groupViewData', description: 'Display a collection of records.' },
];

export function runAgent1Tests(): { passed: number } {
    let passed = 0;

    // 1. extractOrganisms flattens sections and defaults missing arrays.
    {
        const orgs = extractOrganisms(fakePlan);
        assert(orgs.length === 2, `expected 2 organisms, got ${orgs.length}`);
        assert(orgs[0].organismName === 'form' && orgs[0].sectionName === 'Create', 'first organism wrong');
        assert(orgs[0].writesFields.length === 2, 'writesFields not captured');
        assert(Array.isArray(orgs[1].userActions) && orgs[1].userActions.length === 0, 'missing arrays should default to []');
        passed++;
    }

    // 2. Malformed plan → empty list (no throw).
    {
        assert(extractOrganisms({}).length === 0, 'empty plan should yield no organisms');
        assert(extractOrganisms(null).length === 0, 'null plan should yield no organisms');
        passed++;
    }

    // 3. validateAgent1Output: drop unknown groups, dedupe, keep order, drop nameless.
    {
        const valid = new Set(['groupEnterText', 'groupEnterNumber', 'groupViewData']);
        const raw = {
            path: 'p.defs.ts',
            perOrganism: [
                { organismName: 'form', groups: ['groupEnterText', 'groupEnterText', 'groupBogus', 'groupEnterNumber'] },
                { organismName: 'list', groups: ['groupViewData'] },
                { groups: ['groupEnterText'] }, // no organismName → dropped
            ],
        };
        const out = validateAgent1Output(raw, valid, 'fallback.defs.ts');
        assert(out.path === 'p.defs.ts', 'path should come from raw when present');
        assert(out.perOrganism.length === 2, `expected 2 organisms, got ${out.perOrganism.length}`);
        assert(JSON.stringify(out.perOrganism[0].groups) === JSON.stringify(['groupEnterText', 'groupEnterNumber']),
            `form groups wrong: ${JSON.stringify(out.perOrganism[0].groups)}`);
        assert(out.perOrganism[1].groups.length === 1, 'list groups wrong');
        passed++;
    }

    // 4. validateAgent1Output: empty/garbage input → empty perOrganism, fallback path.
    {
        const out = validateAgent1Output({}, new Set(['groupEnterText']), 'fallback.defs.ts');
        assert(out.path === 'fallback.defs.ts' && out.perOrganism.length === 0, 'garbage should yield empty output');
        passed++;
    }

    // 5. buildAgent1HumanPrompt smoke: includes page path, organism and group list.
    {
        const prompt = buildAgent1HumanPrompt('cafe/menu.defs.ts', fakePlan, groups);
        assert(prompt.includes('cafe/menu.defs.ts'), 'prompt missing page path');
        assert(prompt.includes('form'), 'prompt missing organism');
        assert(prompt.includes('groupEnterText: Enter free-form text.'), 'prompt missing group list');
        assert(prompt.includes('bffCommands'), 'prompt missing field evidence');
        passed++;
    }

    console.log(`[agent1.test] OK — ${passed} cases`);
    return { passed };
}
