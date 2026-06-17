/// <mls fileReference="_102020_/l2/dsMatch/agent1.test.ts" enhancement="_blank" />

// Tests for the pure parts of agent1.ts (Fase B): buildAgent1HumanPrompt and
// validateAgent1Output. No `mls` runtime needed. Exposes `runAgent1Tests()` —
// throws on failure, returns the case count.

import {
    validateAgent1Output,
    buildAgent1HumanPrompt,
} from '/_102020_/l2/dsMatch/agent1.js';
import type { GroupInfo } from '/_102020_/l2/dsMatch/groupCatalog.js';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`[agent1.test] FAIL: ${msg}`);
}

const groups: GroupInfo[] = [
    { group: 'groupEnterText', description: 'Enter free-form text.' },
    { group: 'groupEnterNumber', description: 'Enter a numeric value.' },
    { group: 'groupViewData', description: 'Display a collection of records.' },
];

export function runAgent1Tests(): { passed: number } {
    let passed = 0;

    // 1. validateAgent1Output: drop unknown groups, dedupe, keep order, drop nameless.
    {
        const valid = new Set(['groupEnterText', 'groupEnterNumber', 'groupViewData']);
        const raw = {
            path: 'p.ts',
            perOrganism: [
                { organismName: 'form', groups: ['groupEnterText', 'groupEnterText', 'groupBogus', 'groupEnterNumber'] },
                { organismName: 'list', groups: ['groupViewData'] },
                { groups: ['groupEnterText'] }, // no organismName → dropped
            ],
        };
        const out = validateAgent1Output(raw, valid, 'fallback.ts');
        assert(out.path === 'p.ts', 'path should come from raw when present');
        assert(out.perOrganism.length === 2, `expected 2 organisms, got ${out.perOrganism.length}`);
        assert(JSON.stringify(out.perOrganism[0].groups) === JSON.stringify(['groupEnterText', 'groupEnterNumber']),
            `form groups wrong: ${JSON.stringify(out.perOrganism[0].groups)}`);
        assert(out.perOrganism[1].groups.length === 1, 'list groups wrong');
        passed++;
    }

    // 2. validateAgent1Output: empty/garbage input → empty perOrganism, fallback path.
    {
        const out = validateAgent1Output({}, new Set(['groupEnterText']), 'fallback.ts');
        assert(out.path === 'fallback.ts' && out.perOrganism.length === 0, 'garbage should yield empty output');
        passed++;
    }

    // 3. buildAgent1HumanPrompt smoke: includes path, rendered source, definition text, group list.
    {
        const pageSource = '<molecules--placeholder></molecules--placeholder> <input type="text">';
        const definitionText = '## Definition\n{ organisms: [{ organismName: "form" }] }'; // raw, unparsed text
        const prompt = buildAgent1HumanPrompt('cafe/menu.ts', pageSource, definitionText, groups);
        assert(prompt.includes('cafe/menu.ts'), 'prompt missing page path');
        assert(prompt.includes(pageSource), 'prompt missing rendered .ts source');
        assert(prompt.includes(definitionText), 'prompt missing raw definition text');
        assert(prompt.includes('Rendered page'), 'prompt missing rendered-page section');
        assert(prompt.includes('groupEnterText: Enter free-form text.'), 'prompt missing group list');
        passed++;
    }

    // 4. buildAgent1HumanPrompt graceful fallbacks when inputs are missing.
    {
        const prompt = buildAgent1HumanPrompt('cafe/menu.ts', '', '', groups);
        assert(prompt.includes('not available'), 'missing-input fallback not shown');
        passed++;
    }

    console.log(`[agent1.test] OK — ${passed} cases`);
    return { passed };
}
