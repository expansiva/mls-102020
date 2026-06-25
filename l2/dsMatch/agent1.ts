/// <mls fileReference="_102020_/l2/dsMatch/agent1.ts" enhancement="_blank" />

// Fase B pure core — load a page (rendered .ts + its .defs.ts `definition` text),
// build the Agent1 human prompt, and validate the LLM output. These are
// pure/testable; the IAgentAsync wrapper lives in
// agentImplementsDesignSystem/agentSelectMoleculeGroups.ts.
//
// Decision D7 (revised): Agent1 runs AFTER creative-mode generation, so the page is
// materialized. PRIMARY input is the rendered `.ts` (the actual HTML the creative
// LLM produced). The `.defs.ts` is also sent — as RAW TEXT, not parsed.
//
// Why raw text (Option A): the page defs `definition` is authored as a loose
// JSON-ish block meant to be fed to an LLM (single quotes, unquoted keys), not
// strict JSON — JSON.parse fails on it. The rest of the system treats `definition`
// as text-for-LLM, so we do the same: the model reads the organisms straight from it.

import { collabImport } from '/_102027_/l2/collabImport.js';
import { renderGroupList, type GroupInfo } from '/_102020_/l2/dsMatch/groupCatalog.js';

export interface Agent1PerOrganism {
    organismName: string;
    groups: string[];   // camelCase group names, subset of the valid groups
}

export interface Agent1Output {
    path: string;
    perOrganism: Agent1PerOrganism[];
}

// ─── loaders (runtime: need mls.stor) ───────────────────────────────────────

/** File info for a page path, regardless of which extension was passed. */
function fileInfo(path: string): any {
    const norm = path.startsWith('/') ? path.slice(1) : path;
    return mls.stor.convertFileReferenceToFile(norm);
}

/**
 * Load the rendered page source (the `.ts` Lit component). PRIMARY input.
 * Returns '' (with a warning) if the page is not materialized yet.
 */
export async function loadPageSource(path: string): Promise<string> {
    const f = fileInfo(path);
    if (!f) return '';
    const key = mls.stor.getKeyToFiles(f.project, 2, f.shortName, f.folder, '.ts');
    const sf = mls.stor.files[key];
    if (!sf) { console.warn(`[agent1] rendered .ts not found: ${path}`); return ''; }
    const content = await sf.getContent();
    return typeof content === 'string' ? content : '';
}

/**
 * Load the page defs `definition` export as RAW TEXT (not parsed).
 * Returns '' (with a warning) if missing.
 */
export async function loadPageDefinitionText(path: string): Promise<string> {
    const f = fileInfo(path);
    if (!f) return '';
    try {
        const mod = await collabImport({ project: f.project, folder: f.folder, shortName: f.shortName, extension: '.defs.ts' });
       if (mod && mod.definition) return JSON.stringify(mod.definition);
        console.warn(`[agent1] page defs has no string 'definition' export: ${path}`);
        return '';
    } catch (err) {
        console.warn(`[agent1] defs not loadable: ${path}`, err);
        return '';
    }
}

// ─── prompt + validation (pure) ──────────────────────────────────────────────

/**
 * Build the human prompt for one page:
 *   rendered .ts (primary) + raw defs `definition` text (structure) + group list.
 */
export function buildAgent1HumanPrompt(
    path: string,
    pageSource: string,
    definitionText: string,
    groups: GroupInfo[],
): string {
    const parts = [
        `## Page\n${path}`,
        pageSource
            ? `## Rendered page (Lit component — HTML + Tailwind). This is the real UI to map.\n\`\`\`typescript\n${pageSource}\n\`\`\``
            : `## Rendered page\n(not available — fall back to the page definition below)`,
        definitionText
            ? `## Page definition (sections, organisms, fields). Use the organismName values here to group your answer.\n${definitionText}`
            : `## Page definition\n(not available)`,
        `## Molecule groups (choose from these only)\n${renderGroupList(groups)}`,
    ];

    return parts.join('\n\n');
}

/**
 * Validate raw LLM output against the valid group set:
 *   - keep only known groups (drop unknown silently — Agent1 must omit, not guess);
 *   - dedupe groups per organism;
 *   - preserve organism order.
 * Organism names are NOT validated (we don't parse the defs — Option A).
 */
export function validateAgent1Output(raw: any, validGroups: Set<string>, path: string): Agent1Output {
    const perOrganismRaw = Array.isArray(raw?.perOrganism) ? raw.perOrganism : [];
    const perOrganism: Agent1PerOrganism[] = [];

    for (const item of perOrganismRaw) {
        const organismName = typeof item?.organismName === 'string' ? item.organismName : '';
        if (!organismName) continue;
        const seen = new Set<string>();
        const groups: string[] = [];
        for (const g of arr(item?.groups)) {
            if (validGroups.has(g) && !seen.has(g)) { seen.add(g); groups.push(g); }
        }
        perOrganism.push({ organismName, groups });
    }

    return { path: raw?.path || path, perOrganism };
}

function arr(v: unknown): string[] {
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
