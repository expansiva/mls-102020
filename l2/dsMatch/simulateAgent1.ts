/// <mls fileReference="_102020_/l2/dsMatch/simulateAgent1.ts" enhancement="_blank" />

// Fase B simulation (non-LLM half). Validates that, against a REAL page, we can:
// load the rendered .ts, load the raw .defs.ts `definition` text, build the group
// list, and assemble the Agent1 prompt. It does NOT call the LLM — it prints the prompt.
//
// Run inside the app runtime (needs `mls.stor`). Pass the page .ts path:
//   import { simulateAgent1 } from '/_102020_/l2/dsMatch/simulateAgent1.js';
//   await simulateAgent1('_102043_/l2/cafeFlow/web/desktop/page11/menuManagement.ts');

import { runAgent1Tests } from '/_102020_/l2/dsMatch/agent1.test.js';
import { loadPageSource, loadPageDefinitionText, buildAgent1HumanPrompt } from '/_102020_/l2/dsMatch/agent1.js';
import { buildGroupList } from '/_102020_/l2/dsMatch/groupCatalog.js';

export interface Agent1SimReport {
    path: string;
    renderedSourceFound: boolean;
    definitionFound: boolean;
    groupCount: number;
    prompt: string;
}

export async function simulateAgent1(
    path = '_102043_/l2/cafeFlow/menuManagement.ts',
): Promise<Agent1SimReport> {

    // Pure tests first.
    try {
        const { passed } = runAgent1Tests();
        console.log(`PASS  agent1 pure tests — ${passed} cases`);
    } catch (err: any) {
        console.log(`FAIL  agent1 pure tests — ${String(err?.message ?? err)}`);
    }

    const pageSource = await loadPageSource(path);
    const definitionText = await loadPageDefinitionText(path);
    const groups = await buildGroupList();
    const prompt = buildAgent1HumanPrompt(path, pageSource, definitionText, groups);

    console.log(`\n=== Agent1 simulation — ${path} ===`);
    console.log(`Rendered .ts found: ${pageSource ? 'yes' : 'NO (page not materialized yet)'}`);
    console.log(`Definition text found: ${definitionText ? 'yes' : 'NO'}`);
    console.log(`Groups available: ${groups.length}`);
    console.log(`\n----- PROMPT (human) -----\n${prompt}\n--------------------------`);

    return {
        path,
        renderedSourceFound: !!pageSource,
        definitionFound: !!definitionText,
        groupCount: groups.length,
        prompt,
    };
}
