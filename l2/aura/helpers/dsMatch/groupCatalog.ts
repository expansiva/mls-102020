/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/groupCatalog.ts" enhancement="_blank" />

// Fase B helper — the list of molecule groups, each with a description, used to
// prompt Agent1 (group selection).
//
// The group LIST comes from the live molecule catalog (buildMoleculeCatalog) so it
// never goes stale. Descriptions are NOT duplicated here: they come from the
// canonical skills index `_102020_/l2/aura/molecules/skills/index.ts` (the same source
// the creation/usage skills use). A humanized fallback covers any group the index
// does not describe (e.g. groupNavigateMain).

import { buildMoleculeCatalog } from '/_102020_/l2/aura/helpers/dsMatch/buildMoleculeCatalog.js';
import { skills as moleculeSkills } from '/_102020_/l2/aura/molecules/skills/index.js';

export interface GroupInfo {
    group: string;        // camelCase, e.g. 'groupEnterText'
    description: string;  // purpose, from the canonical skills index
}

/** name → description, from the canonical skills index. */
function descriptionByGroup(): Map<string, string> {
    const map = new Map<string, string>();
    for (const s of (moleculeSkills as Array<{ name?: string; description?: string }>)) {
        if (s?.name && s?.description) map.set(s.name, s.description);
    }
    return map;
}

/** Distinct groups present in the live catalog, with descriptions, sorted by name. */
export async function buildGroupList(): Promise<GroupInfo[]> {
    const catalog = await buildMoleculeCatalog();
    const descById = descriptionByGroup();
    const groups = [...new Set(catalog.map(m => m.group))].sort();
    return groups.map(group => ({
        group,
        description: descById.get(group) ?? humanize(group),
    }));
}

/** Markdown bullet list for the prompt: `- groupName: description`. */
export function renderGroupList(groups: GroupInfo[]): string {
    return groups.map(g => `- ${g.group}: ${g.description}`).join('\n');
}

/** 'groupEnterText' → 'Enter text.' (fallback only when the index has no description). */
function humanize(group: string): string {
    const noPrefix = group.replace(/^group/, '');
    const words = noPrefix.replace(/([a-z])([A-Z])/g, '$1 $2');
    return words.charAt(0).toUpperCase() + words.slice(1) + '.';
}
