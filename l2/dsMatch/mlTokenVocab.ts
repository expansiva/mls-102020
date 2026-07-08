/// <mls fileReference="_102020_/l2/dsMatch/mlTokenVocab.ts" enhancement="_blank" />

// Molecule token vocabulary (--ml-*) for DS↔molecule reconciliation.
//
// Each molecule group's usage skill (skills/molecules/<group>/usage.ts) declares a
// "## Design Tokens" markdown table: `| `--ml-x` | `default` | Purpose |`. The --ml-*
// names are a SHARED vocabulary across groups, so the reconciliation is resolved once per
// DS (not per page): we collect the union of --ml-* tokens from the USED groups, then an
// agent maps each to a --ds-* expression (see agentReconcileTokens + buildGlobalCss).

import { collabImport } from '/_102027_/l2/collabImport.js';
import { type DsTokenReconciliation } from '/_102029_/l2/designSystemBase.js';

// The reconciliation shape lives on the DS entry in `_<project>_/l2/designSystem.ts`
// (single home of the tokens). The interface is defined in the runtime-clean _102029_
// core; re-export it here so the reconcile agent keeps one import site.
export type { DsTokenReconciliation };

export interface MlToken {
    token: string;       // e.g. '--ml-on-surface'
    default: string;     // e.g. '#1c1b1f'
    description: string; // e.g. 'Primary text'
}

// ─── pure: parse the usage skill's Design Tokens table ───────────────────────

/** Parse the `## Design Tokens` markdown table from a usage skill string. */
export function parseMlTokensFromUsage(skillText: string): MlToken[] {
    const out: MlToken[] = [];
    const seen = new Set<string>();
    for (const raw of String(skillText || '').split('\n')) {
        const line = raw.trim();
        if (!line.startsWith('|')) continue;
        const cells = line.split('|').map(c => c.trim().replace(/^`+|`+$/g, '').trim());
        // cells[0] is '' (leading pipe): token=cells[1], default=cells[2], description=cells[3]
        const token = cells[1] ?? '';
        if (!/^--ml-[a-z0-9-]+$/i.test(token)) continue; // skips header/separator rows
        if (seen.has(token)) continue;
        seen.add(token);
        out.push({ token, default: cells[2] ?? '', description: cells[3] ?? '' });
    }
    return out;
}

/** Union of tokens by name (first description/default wins — the vocabulary is shared). */
export function mergeVocab(lists: MlToken[][]): MlToken[] {
    const byToken = new Map<string, MlToken>();
    for (const list of lists) for (const t of list) if (!byToken.has(t.token)) byToken.set(t.token, t);
    return [...byToken.values()].sort((a, b) => a.token.localeCompare(b.token));
}

/** FNV-1a 32-bit — stable, no deps (same family as dsVersion). */
export function fnv1a(s: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

export function mlVocabHash(vocab: MlToken[]): string {
    return fnv1a(vocab.map(t => t.token).sort().join(','));
}

export function dsTokensHash(tokens: unknown): string {
    return fnv1a(JSON.stringify(tokens ?? {}));
}

// ─── runtime: read usage skills / page assignments (needs mls.stor) ──────────

/** Read + parse one group's --ml-* tokens from its usage skill. */
export async function readGroupUsageTokens(group: string): Promise<MlToken[]> {
    try {
        const mod = await collabImport({ project: 102020, folder: `skills/molecules/${group}`, shortName: 'usage', extension: '.ts' });
        const skill = (mod as any)?.skill;
        return typeof skill === 'string' ? parseMlTokensFromUsage(skill) : [];
    } catch {
        return [];
    }
}

/** Raw defs source straight from the stor (fresh — avoids collabImport module-cache staleness). */
async function readRawDefsContent(defsRef: string): Promise<string> {
    try {
        const norm = defsRef.startsWith('/') ? defsRef.slice(1) : defsRef;
        const info = mls.stor.convertFileReferenceToFile(norm);
        if (!info) return '';
        const key = mls.stor.getKeyToFile(info as any);
        const sf = (mls.stor.files as Record<string, any>)[key];
        if (!sf) return '';
        const content = await sf.getContent();
        return typeof content === 'string' ? content : '';
    } catch {
        return '';
    }
}

/** Groups used by one generated page — regex-parsed from its `moleculeAssignments` export
 *  (raw source, NOT collabImport: the page defs is written earlier in the same run and the
 *  module cache can be stale). */
export async function readPageGroups(defsRef: string): Promise<string[]> {
    const content = await readRawDefsContent(defsRef);
    const m = content.match(/export\s+const\s+moleculeAssignments\s*=\s*(\[[\s\S]*?\])\s+as\s+const\s*;/);
    if (!m) return [];
    let arr: Array<{ group?: string }>;
    try { arr = JSON.parse(m[1]); } catch { return []; }
    return [...new Set(arr.map(x => x?.group).filter((g): g is string => typeof g === 'string' && !!g))];
}

/** Build the --ml-* vocabulary (union) for a set of used groups. */
export async function buildMlVocab(groups: string[]): Promise<MlToken[]> {
    const lists = await Promise.all([...new Set(groups)].sort().map(g => readGroupUsageTokens(g)));
    return mergeVocab(lists);
}
