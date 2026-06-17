/// <mls fileReference="_102020_/l2/dsMatch/buildMoleculeCatalog.ts" enhancement="_blank" />

// Fase A2 — build the molecule catalog from the `ml-*.defs.ts` files of mls-102040.
// Each molecule exports `group`, `layoutConfig` and `skill` (the latter contains
// `- TagName:` and `# Objective`).
//
// The catalog ORDER is stable and deterministic (by folder, then shortName): this
// order is the tie-break used by matchVariant (decision D4 — there is no `priority`
// field).

import { collabImport } from '/_102027_/l2/collabImport.js';
import { isValidAxisValue } from '/_102020_/l2/designSystemAuraBase.js';
import type { MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';

const MOLECULES_PROJECT = 102040;

let catalogCache: MoleculeCatalogEntry[] | null = null;

/** Build (and cache) the catalog. Pass `force` to rebuild. */
export async function buildMoleculeCatalog(force = false): Promise<MoleculeCatalogEntry[]> {
    if (catalogCache && !force) return catalogCache;

    const files = Object.values(mls.stor.files as Record<string, any>).filter(sf =>
        sf &&
        sf.project === MOLECULES_PROJECT &&
        sf.level === 2 &&
        typeof sf.folder === 'string' &&
        sf.folder.startsWith('molecules/') &&
        sf.extension === '.defs.ts' &&
        typeof sf.shortName === 'string' &&
        sf.shortName.startsWith('ml-')
    );

    // Stable order → becomes the tie-break in matchVariant.
    files.sort((a, b) =>
        a.folder === b.folder ? cmp(a.shortName, b.shortName) : cmp(a.folder, b.folder)
    );

    const catalog: MoleculeCatalogEntry[] = [];
    for (const sf of files) {
        const ref = `${sf.folder}/${sf.shortName}`;
        try {
            const mod = await collabImport({
                project: MOLECULES_PROJECT,
                folder: sf.folder,
                shortName: sf.shortName,
                extension: '.defs.ts',
            });
            if (!mod || typeof mod.group !== 'string') {
                console.warn(`[buildMoleculeCatalog] ${ref}: missing 'group' export (skipped)`);
                continue;
            }

            const group: string = mod.group;
            const skill: string = typeof mod.skill === 'string' ? mod.skill : '';

            catalog.push({
                group,
                tag: parseTag(skill) || `${group.toLowerCase()}--${sf.shortName}`,
                variant: sf.shortName,
                layoutConfig: sanitizeLayoutConfig(mod.layoutConfig, ref),
                objective: parseObjective(skill),
                usagePath: `_102020_/l2/skills/molecules/${group}/usage.ts`,
            });
        } catch (err) {
            console.error(`[buildMoleculeCatalog] failed to load ${ref}`, err);
        }
    }

    catalogCache = catalog;
    return catalog;
}

/** Clear the cache (e.g. after editing molecules). */
export function clearMoleculeCatalogCache(): void { catalogCache = null; }

// ─── helpers ──────────────────────────────────────────────────────────────

function cmp(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

/** Keep only axis=value pairs that are valid in the vocabulary; drop the rest (with a warning). */
function sanitizeLayoutConfig(raw: unknown, ref: string): Record<string, string> {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [axis, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value !== 'string') continue;
        if (!isValidAxisValue(axis, value)) {
            console.warn(`[buildMoleculeCatalog] ${ref}: invalid axis value ${axis}=${String(value)} (ignored)`);
            continue;
        }
        out[axis] = value;
    }
    return out;
}

/** Extract the TagName from the skill's `# Metadata` block. */
function parseTag(skill: string): string | null {
    const m = skill.match(/^-\s*TagName:\s*(.+?)\s*$/m);
    return m ? m[1].trim() : null;
}

/** First non-empty line right after the `# Objective` heading. */
function parseObjective(skill: string): string {
    const m = skill.match(/#\s*Objective\s*\n([\s\S]*?)(?:\n#|$)/);
    if (!m) return '';
    const firstLine = m[1].split('\n').map(s => s.trim()).find(Boolean);
    return firstLine ?? '';
}
