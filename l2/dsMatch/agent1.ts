/// <mls fileReference="_102020_/l2/dsMatch/agent1.ts" enhancement="_blank" />

// Fase B pure core — extract organisms from a PagePlan, build the Agent1 human
// prompt, and validate the LLM output. These are pure/testable; the IAgentAsync
// wrapper that actually calls the LLM lives in
// agents/newModule/agentSelectMoleculeGroups.ts.
//
// Decision D7: the structural truth is the page `.defs.ts` (the PagePlan object).
// Pages here are not materialized yet, so there is no rendered `.ts` to use as
// extra evidence; bffCommands I/O is included instead as field-type evidence.

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

/**
 * Load a PagePlan object from a `.defs.ts` path. Supports the `export default`
 * plan and any `*PagePlan` named export.
 */
export async function loadPagePlan(path: string): Promise<any> {
    const pathNorm = path.startsWith('/') ? path.slice(1) : path;
    const f = mls.stor.convertFileReferenceToFile(pathNorm);
    const key = mls.stor.getKeyToFile(f);
    const sf = mls.stor.files[key];
    if (!sf) throw new Error(`[agent1] page defs not found: ${path}`);

    const mod = await collabImport({
        project: sf.project,
        folder: sf.folder,
        shortName: sf.shortName,
        extension: '.defs.ts',
    });
    if (!mod) throw new Error(`[agent1] could not import page defs: ${path}`);

    if (mod.default) return mod.default;
    const planKey = Object.keys(mod).find(k => k.endsWith('PagePlan'));
    if (planKey) return mod[planKey];
    throw new Error(`[agent1] no PagePlan export in ${path}`);
}

/** Flatten `data.pageDefinition.sections[].organisms[]` into a typed list. */
export function extractOrganisms(pagePlan: any): OrganismInfo[] {
    const sections = pagePlan?.data?.pageDefinition?.sections;
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

/** Compact field-type evidence from bffCommands (commandName + input/output shapes). */
export function extractFieldEvidence(pagePlan: any): string {
    const cmds = pagePlan?.data?.bffCommands;
    if (!Array.isArray(cmds) || cmds.length === 0) return '';
    const lines = cmds.map((c: any) =>
        `- ${c.commandName} (${c.kind}): input=${JSON.stringify(c.input ?? {})} output=${JSON.stringify(c.output ?? {})}`
    );
    return lines.join('\n');
}

/** Build the human prompt for one page. */
export function buildAgent1HumanPrompt(path: string, pagePlan: any, groups: GroupInfo[]): string {
    const organisms = extractOrganisms(pagePlan);
    const evidence = extractFieldEvidence(pagePlan);

    const organismBlocks = organisms.map(o => [
        `### ${o.organismName}  (section: ${o.sectionName})`,
        `purpose: ${o.purpose}`,
        `userActions: ${o.userActions.join(', ') || '—'}`,
        `requiredEntities: ${o.requiredEntities.join(', ') || '—'}`,
        `readsFields: ${o.readsFields.join(', ') || '—'}`,
        `writesFields: ${o.writesFields.join(', ') || '—'}`,
        `rulesApplied: ${o.rulesApplied.join(', ') || '—'}`,
    ].join('\n')).join('\n\n');

    const parts = [
        `## Page\n${path}`,
        `## Organisms\n${organismBlocks || '(none)'}`,
        evidence ? `## Field-type evidence (bffCommands)\n${evidence}` : '',
        `## Molecule groups (choose from these only)\n${renderGroupList(groups)}`,
    ].filter(Boolean);

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
