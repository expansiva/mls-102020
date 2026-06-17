/// <mls fileReference="_102020_/l2/dsMatch/agent1.ts" enhancement="_blank" />

// Fase B pure core — load a page (rendered .ts + structural .defs.ts), build the
// Agent1 human prompt, and validate the LLM output. These are pure/testable; the
// IAgentAsync wrapper that actually calls the LLM lives in
// agents/agentImplementsDesignSystem/agentSelectMoleculeGroups.ts.
//
// Decision D7 (revised): Agent1 runs AFTER creative-mode generation, so the page
// is already materialized. The PRIMARY input is the rendered `.ts` (the actual
// HTML/Tailwind the creative LLM produced) — that is the real basis for knowing
// which UI elements exist. The `.defs.ts` is sent too, for the organism structure
// (so the output can be grouped per organism).

import { collabImport } from '/_102027_/l2/collabImport.js';
import { renderGroupList, type GroupInfo } from '/_102020_/l2/dsMatch/groupCatalog.js';

export interface OrganismInfo {
    sectionName: string;
    organismName: string;
    purpose: string;
    userActions: string[];
    requiredEntities: string[];
    readsFields: string[];
    writesFields: string[];
    rulesApplied: string[];
}

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

/** Load the page `.defs.ts` module (any export shape). Best-effort: null on failure. */
export async function loadPageDefs(path: string): Promise<any> {
    const f = fileInfo(path);
    if (!f) return null;
    try {
        return await collabImport({ project: f.project, folder: f.folder, shortName: f.shortName, extension: '.defs.ts' });
    } catch (err) {
        console.warn(`[agent1] defs not loadable: ${path}`, err);
        return null;
    }
}

// ─── organism extraction (defs may come in a few shapes) ─────────────────────

/**
 * Flatten organisms from a page defs. Tolerant of:
 *   - PagePlan module/object: `data.pageDefinition.sections[].organisms[]`
 *   - page11 defs: `export const definition` (string with a ```JSON block: { sections:[...] })`
 *   - a plain plan object already at the root.
 */
export function extractOrganisms(defs: any): OrganismInfo[] {
    const root = unwrapPlan(defs);
    const sections = root?.data?.pageDefinition?.sections ?? root?.sections;
    if (!Array.isArray(sections)) return [];

    const out: OrganismInfo[] = [];
    for (const section of sections) {
        const organisms = Array.isArray(section?.organisms) ? section.organisms : [];
        for (const o of organisms) {
            out.push({
                sectionName: section.sectionName ?? '',
                organismName: o.organismName ?? '',
                purpose: o.purpose ?? '',
                userActions: arr(o.userActions),
                requiredEntities: arr(o.requiredEntities),
                readsFields: arr(o.readsFields),
                writesFields: arr(o.writesFields),
                rulesApplied: arr(o.rulesApplied),
            });
        }
    }
    return out;
}

function unwrapPlan(defs: any): any {
    if (!defs || typeof defs !== 'object') return defs;
    // page11 defs: a `definition` string holding a JSON block.
    if (typeof defs.definition === 'string') {
        const parsed = parseDefinitionJson(defs.definition);
        if (parsed) return parsed;
    }
    // module with `export default <plan>`.
    if (defs.default) return defs.default;
    // module with a `*PagePlan` named export.
    const planKey = Object.keys(defs).find(k => k.endsWith('PagePlan'));
    if (planKey) return defs[planKey];
    return defs;
}

/** Extract and parse the JSON block from a `definition` string. */
function parseDefinitionJson(s: string): any | null {
    const fence = s.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
    const jsonText = fence ? fence[1] : s;
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start < 0 || end < 0) return null;
    try { return JSON.parse(jsonText.slice(start, end + 1)); } catch { return null; }
}

// ─── prompt + validation (pure) ──────────────────────────────────────────────

/** Build the human prompt for one page: rendered .ts (primary) + organism structure + group list. */
export function buildAgent1HumanPrompt(
    path: string,
    pageSource: string,
    organisms: OrganismInfo[],
    groups: GroupInfo[],
): string {
    const organismBlocks = organisms.map(o => [
        `### ${o.organismName}  (section: ${o.sectionName})`,
        `purpose: ${o.purpose}`,
        `userActions: ${o.userActions.join(', ') || '—'}`,
        `requiredEntities: ${o.requiredEntities.join(', ') || '—'}`,
        `readsFields: ${o.readsFields.join(', ') || '—'}`,
        `writesFields: ${o.writesFields.join(', ') || '—'}`,
    ].join('\n')).join('\n\n');

    const parts = [
        `## Page\n${path}`,
        pageSource
            ? `## Rendered page (Lit component — HTML + Tailwind). This is the real UI to map.\n\`\`\`typescript\n${pageSource}\n\`\`\``
            : `## Rendered page\n(not available — fall back to the organism structure below)`,
        `## Page structure (organisms)\n${organismBlocks || '(none)'}`,
        `## Molecule groups (choose from these only)\n${renderGroupList(groups)}`,
    ];

    return parts.join('\n\n');
}

/**
 * Validate raw LLM output against the valid group set:
 *   - keep only known groups (drop unknown silently — Agent1 must omit, not guess);
 *   - dedupe groups per organism;
 *   - preserve organism order.
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
