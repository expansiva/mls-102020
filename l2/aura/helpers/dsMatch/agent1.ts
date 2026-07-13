/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/agent1.ts" enhancement="_blank" />

// Fase B pure core — Agent1 (group selection), element-level.
//
// New page defs declare the concrete UI explicitly in `definition.layout`
// (intentions → fields/filters/actions, plus collection/summary/status containers).
// So Agent1 reads the LAYOUT (not the rendered HTML) and chooses, PER ELEMENT id, which
// molecule GROUP best represents it (or omits it). The concrete variant is resolved
// deterministically later (matchVariant) — the LLM only picks the group.
//
// These helpers are pure/testable; the IAgentAsync wrapper lives in
// agentImplementGenome/agentSelectGroups.ts.

import { collabImport } from '/_102027_/l2/collabImport.js';
import { renderGroupList, type GroupInfo } from '/_102020_/l2/aura/helpers/dsMatch/groupCatalog.js';
import { listLayoutElements, type LayoutElement } from '/_102020_/l2/aura/helpers/dsMatch/layoutElements.js';

/** One element's chosen molecule group (id references a node in `definition.layout`). */
export interface ElementGroup {
    id: string;
    group: string;
}

/** One element's chosen molecule variant (Agent2 output; id references a layout node).
 *  `tag: null` = Agent2 rejected/omitted the element — it keeps its plain control; the group
 *  is preserved so agentGenDefs can stamp the layout rules that govern it (task 13). */
export interface VariantSelection {
    id: string;
    group: string;
    tag: string | null;
}

export interface Agent1Output {
    path: string;
    assignments: ElementGroup[];
}

// ─── loaders (runtime: need mls.stor) ───────────────────────────────────────

/** File info for a page path, regardless of which extension was passed. */
function fileInfo(path: string): any {
    const norm = path.startsWith('/') ? path.slice(1) : path;
    return mls.stor.convertFileReferenceToFile(norm);
}

/** Load a page defs `definition.layout` object (via collabImport). Null if missing. */
export async function loadPageLayout(path: string): Promise<any | null> {
    const f = fileInfo(path);
    if (!f) return null;
    try {
        const mod = await collabImport({ project: f.project, folder: f.folder, shortName: f.shortName, extension: '.defs.ts' });
        const layout = (mod as any)?.definition?.layout;
        if (layout && typeof layout === 'object') return layout;
        console.warn(`[agent1] page defs has no 'definition.layout': ${path}`);
        return null;
    } catch (err) {
        console.warn(`[agent1] defs not loadable: ${path}`, err);
        return null;
    }
}

/** Raw defs source straight from the stor (fresh — avoids collabImport module-cache staleness
 *  on files written earlier in the SAME run, e.g. Agent1→Agent2→gen handoffs). */
async function readRawDefs(defsRef: string): Promise<string> {
    const f = fileInfo(defsRef);
    if (!f) return '';
    try {
        const key = mls.stor.getKeyToFile(f);
        const sf = (mls.stor.files as Record<string, any>)[key];
        if (!sf) return '';
        const content = await sf.getContent();
        return typeof content === 'string' ? content : '';
    } catch {
        return '';
    }
}

/** Parse `export const <name> = [ … ] as const;` from raw source. */
function parseConstArray(content: string, name: string): any[] {
    const m = content.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s+as\\s+const\\s*;`));
    if (!m) return [];
    try { const v = JSON.parse(m[1]); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** Read the element-level group selections Agent1 wrote (`export const groupSelections`). */
export async function loadElementGroupSelections(defsRef: string): Promise<ElementGroup[]> {
    return parseConstArray(await readRawDefs(defsRef), 'groupSelections')
        .filter(s => s && typeof s.id === 'string' && typeof s.group === 'string')
        .map(s => ({ id: s.id, group: s.group }));
}

/** Read the element-level variant selections Agent2 wrote (`export const variantSelections`).
 *  Accepts `tag: null` (rejected/omitted element — kept for its group, task 13). */
export async function loadVariantSelections(defsRef: string): Promise<VariantSelection[]> {
    return parseConstArray(await readRawDefs(defsRef), 'variantSelections')
        .filter(s => s && typeof s.id === 'string' && typeof s.group === 'string' && (typeof s.tag === 'string' || s.tag === null))
        .map(s => ({ id: s.id, group: s.group, tag: s.tag }));
}

// ─── prompt + validation (pure) ──────────────────────────────────────────────

/** One compact line per element for the prompt. */
function renderElement(e: LayoutElement): string {
    const bits = [
        `id=${e.id}`,
        e.kind,
        `intent=${e.intent}`,
        e.inputType ? `inputType=${e.inputType}` : '',
        e.labelKey ? `label=${e.labelKey}` : '',
    ].filter(Boolean);
    return `- ${bits.join(' | ')}`;
}

/**
 * Build the human prompt for one page: the list of layout elements (each with a stable id)
 * + the valid molecule groups. The LLM answers with one { id, group } per element it maps.
 */
export function buildAgent1HumanPrompt(
    path: string,
    elements: LayoutElement[],
    groups: GroupInfo[],
): string {
    const elementList = elements.length
        ? elements.map(renderElement).join('\n')
        : '(no eligible elements)';
    return [
        `## Page\n${path}`,
        `## Layout elements (each has a stable id — answer per id)\n${elementList}`,
        `## Molecule groups (choose from these only)\n${renderGroupList(groups)}`,
    ].join('\n\n');
}

/**
 * Validate raw LLM output:
 *   - keep only assignments whose `id` exists in the layout and whose `group` is valid;
 *   - one group per id (first wins);
 *   - preserve order.
 */
export function validateAgent1Output(
    raw: any,
    validIds: Set<string>,
    validGroups: Set<string>,
    path: string,
): Agent1Output {
    const rawAssignments = Array.isArray(raw?.assignments) ? raw.assignments : [];
    const seen = new Set<string>();
    const assignments: ElementGroup[] = [];
    for (const a of rawAssignments) {
        const id = typeof a?.id === 'string' ? a.id : '';
        const group = typeof a?.group === 'string' ? a.group : '';
        if (!id || !group) continue;
        if (!validIds.has(id) || !validGroups.has(group)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        assignments.push({ id, group });
    }
    return { path: raw?.path || path, assignments };
}

/** Convenience: valid ids for a layout. */
export function layoutElementIds(layout: any): Set<string> {
    return new Set(listLayoutElements(layout).map(e => e.id));
}
