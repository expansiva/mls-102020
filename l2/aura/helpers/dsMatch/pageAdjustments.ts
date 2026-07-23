/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/pageAdjustments.ts" enhancement="_blank" />

// User "page adjustments" — the persisted record of pointed VISUAL edit requests applied to a
// page (TASK-102020-agent-manage-page). Stored as `export const pageAdjustments = [ … ] as const;`
// in the page's `.defs.ts`, so every future re-materialization (including a DS/layout change or a
// genome "refazer página") can REPLAY them. The edit becomes DATA in the defs, never a silent
// side-effect on the generated `.ts`.
//
// All functions here are PURE (no mls.*) — the surgical splice is string-aware so it survives
// braces inside JSON string values (the greedy/lazy-regex pitfall of designSystem writes). It only
// touches the named export, preserving every other export (works for genome AND mode page defs).

export type PageAdjustmentKind = 'structural' | 'cosmetic';

export interface PageAdjustment {
    id: string;            // 'adj-001' — stable per page
    at: string;            // ISO timestamp (audit only)
    request: string;       // the user's request, verbatim
    kind: PageAdjustmentKind;
    notes?: string;        // agent note: what/where it applied
    imageUrl?: string;     // optional reference-image link (registered as text; LLM does not see it yet)
}

const EXPORT_NAME = 'pageAdjustments';

// ─── string-aware balanced scan ──────────────────────────────────────────────

/** From `content[from]` (which must equal `open`), return the index AFTER the matching `close`,
 *  skipping over double-quoted string literals (with escapes). -1 when unbalanced. */
export function scanBalanced(content: string, from: number, open: '{' | '[', close: '}' | ']'): number {
    if (content[from] !== open) return -1;
    let depth = 0;
    let inStr = false;
    for (let i = from; i < content.length; i++) {
        const c = content[i];
        if (inStr) {
            if (c === '\\') { i++; continue; }   // skip the escaped char
            if (c === '"') inStr = false;
            continue;
        }
        if (c === '"') { inStr = true; continue; }
        if (c === open) depth++;
        else if (c === close) { depth--; if (depth === 0) return i + 1; }
    }
    return -1;
}

/** Locate `export const <name> = <value>;` where value opens with `{` or `[`. Returns the full
 *  span (incl. optional ` as const` and the `;`) plus the opening char. Null when absent/malformed. */
export function findExportConst(content: string, name: string): { start: number; valueStart: number; end: number; open: '{' | '[' } | null {
    const re = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*`, 'g');
    const m = re.exec(content);
    if (!m) return null;
    const valueStart = m.index + m[0].length;
    const open = content[valueStart];
    if (open !== '{' && open !== '[') return null;
    const close = open === '{' ? '}' : ']';
    const valueEnd = scanBalanced(content, valueStart, open, close);
    if (valueEnd < 0) return null;
    const tail = content.slice(valueEnd).match(/^\s*(?:as\s+const)?\s*;/);
    const end = tail ? valueEnd + tail[0].length : valueEnd;
    return { start: m.index, valueStart, end, open };
}

/** Replace the whole `export const <name> = …;` block with `replacement`. Null if not found. */
export function replaceExportConst(content: string, name: string, replacement: string): string | null {
    const span = findExportConst(content, name);
    if (!span) return null;
    return content.slice(0, span.start) + replacement + content.slice(span.end);
}

/** Parse an `export const <name> = <object|array>;` value as JSON. Null when absent/invalid.
 *  Works for the `definition` object and the `pageAdjustments` array (both JSON-serializable). */
export function parseExportValue(content: string, name: string): any | null {
    const span = findExportConst(content, name);
    if (!span) return null;
    const close = span.open === '{' ? '}' : ']';
    const end = scanBalanced(content, span.valueStart, span.open, close);
    if (end < 0) return null;
    try {
        return JSON.parse(content.slice(span.valueStart, end));
    } catch {
        return null;
    }
}

// ─── pageAdjustments read/write ──────────────────────────────────────────────

/** Parse the `pageAdjustments` export (empty when absent/invalid). */
export function parsePageAdjustments(content: string): PageAdjustment[] {
    const arr = parseExportValue(content, EXPORT_NAME);
    return Array.isArray(arr) ? arr.filter(isAdjustment) : [];
}

function isAdjustment(x: any): x is PageAdjustment {
    return !!x && typeof x.id === 'string' && typeof x.request === 'string'
        && (x.kind === 'structural' || x.kind === 'cosmetic');
}

/** Serialize the export line. */
export function renderPageAdjustmentsExport(adj: PageAdjustment[]): string {
    return `export const ${EXPORT_NAME} = ${JSON.stringify(adj, null, 2)} as const;`;
}

/** Next id 'adj-00N' from the highest existing numeric suffix. */
export function nextAdjustmentId(existing: PageAdjustment[]): string {
    let max = 0;
    for (const a of existing) {
        const m = /^adj-(\d+)$/.exec(a.id);
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `adj-${String(max + 1).padStart(3, '0')}`;
}

/** Upsert the pageAdjustments export into a defs source: replace when present, else insert right
 *  after the `definition` export (fallback: append at end). Never touches other exports. */
export function upsertPageAdjustments(content: string, adj: PageAdjustment[]): string {
    const block = renderPageAdjustmentsExport(adj);
    const replaced = replaceExportConst(content, EXPORT_NAME, block);
    if (replaced != null) return replaced;
    const defSpan = findExportConst(content, 'definition');
    if (defSpan) return `${content.slice(0, defSpan.end)}\n\n${block}${content.slice(defSpan.end)}`;
    return `${content.replace(/\s*$/, '')}\n\n${block}\n`;
}
