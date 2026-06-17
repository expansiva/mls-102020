/// <mls fileReference="_102020_/l2/dsMatch/simulateAgent1.ts" enhancement="_blank" />

// Fase B simulation (non-LLM half). Validates that, against a REAL page defs,
// we can: load the PagePlan, extract organisms, build the group list, and assemble
// the Agent1 prompt. It does NOT call the LLM — it prints the prompt to eyeball.
//
// Run inside the app runtime (needs `mls.stor`):
//   import { simulateAgent1 } from '/_102020_/l2/dsMatch/simulateAgent1.js';
//   await simulateAgent1('_102043_/l2/cafeFlow/menuManagement.defs.ts');

import { runAgent1Tests } from '/_102020_/l2/dsMatch/agent1.test.js';
import { loadPagePlan, extractOrganisms, buildAgent1HumanPrompt } from '/_102020_/l2/dsMatch/agent1.js';
import { buildGroupList } from '/_102020_/l2/dsMatch/groupCatalog.js';

export interface Agent1SimReport {
    path: string;
    organismCount: number;
    groupCount: number;
    organismNames: string[];
    prompt: string;
}

export async function simulateAgent1(
    path = '_102043_/l2/cafeFlow/menuManagement.defs.ts',
): Promise<Agent1SimReport> {

    // Pure tests first.
    try {
        const { passed } = runAgent1Tests();
        console.log(`PASS  agent1 pure tests — ${passed} cases`);
    } catch (err: any) {
        console.log(`FAIL  agent1 pure tests — ${String(err?.message ?? err)}`);
    }

    const pagePlan = await loadPagePlan(path);
    const organisms = extractOrganisms(pagePlan);
    const groups = await buildGroupList();
    const prompt = buildAgent1HumanPrompt(path, pagePlan, groups);

    console.log(`\n=== Agent1 simulation — ${path} ===`);
    console.log(`Organisms: ${organisms.length}  |  Groups available: ${groups.length}`);
    console.log(`Organism names: ${organisms.map(o => o.organismName).join(', ')}`);
    console.log(`\n----- PROMPT (human) -----\n${prompt}\n--------------------------`);

    return {
        path,
        organismCount: organisms.length,
        groupCount: groups.length,
        organismNames: organisms.map(o => o.organismName),
        prompt,
    };
}
