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

    // 2b. Tolerant of other defs shapes: `export default` and `definition`-string.
    {
        const moduleWithDefault = { default: fakePlan, menuPagePlan: fakePlan };
        assert(extractOrganisms(moduleWithDefault).length === 2, 'default export shape not handled');

        const defsString = {
            definition: '## Definition\n```JSON\n{"sections":[{"sectionName":"S","organisms":[{"organismName":"o1","purpose":"p"}]}]}\n```',
            pipeline: [],
        };
        const orgs = extractOrganisms(defsString);
        assert(orgs.length === 1 && orgs[0].organismName === 'o1', 'definition-string shape not handled');
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

    // 5. buildAgent1HumanPrompt smoke: includes path, rendered source, organism, group list.
    {
        const organisms = extractOrganisms(fakePlan);
        const pageSource = '<molecules--placeholder></molecules--placeholder> <input type="text">';
        const prompt = buildAgent1HumanPrompt('cafe/menu.ts', pageSource, organisms, groups);
        assert(prompt.includes('cafe/menu.ts'), 'prompt missing page path');
        assert(prompt.includes(pageSource), 'prompt missing rendered .ts source');
        assert(prompt.includes('Rendered page'), 'prompt missing rendered-page section');
        assert(prompt.includes('form'), 'prompt missing organism');
        assert(prompt.includes('groupEnterText: Enter free-form text.'), 'prompt missing group list');
        passed++;
    }

    // 6. buildAgent1HumanPrompt without rendered source → falls back gracefully.
    {
        const prompt = buildAgent1HumanPrompt('cafe/menu.ts', '', extractOrganisms(fakePlan), groups);
        assert(prompt.includes('not available'), 'missing-source fallback not shown');
        passed++;
    }

    console.log(`[agent1.test] OK — ${passed} cases`);
    return { passed };
}
