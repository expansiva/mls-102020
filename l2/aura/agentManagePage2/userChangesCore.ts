/// <mls fileReference="_102020_/l2/aura/agentManagePage2/userChangesCore.ts" enhancement="_blank" />

// The `userChanges` export of a page defs (TASK-102020-agent-manage-page-2). Pure — no mls.*.
//
// `userChanges` is NOT a log: it is the CURRENT SET of visual deviations the user wants relative to
// what the generator would produce. "Center the buttons" followed by "align them left" must leave ONE
// entry, the latter. Most of that is deterministic — same (scope, intent) axis ⇒ replace — and only
// the semantic leftovers (an order change that cancels a previous visibility change) need the model.
// Whatever the model returns is validated here: an entry is either byte-identical to one that was
// already there, or the incoming one. It can never invent history, and it can never rewrite the
// `user`/`date` of an entry it kept.

import { findExportConst, parseExportJson, scanBalancedTs, type Guard } from '/_102020_/l2/aura/agentManagePage2/patchCore.js';

export const USER_CHANGES_EXPORT = 'userChanges';

/** Normalized axes an edit can move along. Two entries on the same axis+scope cannot coexist. */
export const CHANGE_INTENTS = [
    'layout.align', 'layout.order', 'layout.density', 'layout.grouping', 'layout.size',
    'style.emphasis', 'style.color', 'style.border', 'style.shadow',
    'text.label', 'visibility',
] as const;

export type ChangeIntent = typeof CHANGE_INTENTS[number];

export interface UserChange {
    id: string;
    change: string;
    scope: string;
    intent: string;
    user: string;
    date: string;
    /** RESERVED for a reference image (not populated in this version). */
    styleReference?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Keep only well-formed entries; unknown intents are kept as-is (the list must survive a schema bump). */
export function normalizeUserChanges(raw: unknown): UserChange[] {
    const arr = Array.isArray(raw) ? raw : [];
    const out: UserChange[] = [];
    for (const item of arr) {
        if (!isRecord(item)) continue;
        const change = typeof item.change === 'string' ? item.change.trim() : '';
        const id = typeof item.id === 'string' ? item.id.trim() : '';
        if (!change || !id) continue;
        const entry: UserChange = {
            id,
            change,
            scope: typeof item.scope === 'string' && item.scope.trim() ? item.scope.trim() : 'page',
            intent: typeof item.intent === 'string' && item.intent.trim() ? item.intent.trim() : 'layout.align',
            user: typeof item.user === 'string' ? item.user : '',
            date: typeof item.date === 'string' ? item.date : '',
        };
        if (typeof item.styleReference === 'string' && item.styleReference) entry.styleReference = item.styleReference;
        out.push(entry);
    }
    return out;
}

/** Read the `userChanges` export of a defs source (empty when absent or malformed). */
export function parseUserChanges(defsSrc: string): UserChange[] {
    return normalizeUserChanges(parseExportJson(defsSrc, USER_CHANGES_EXPORT));
}

/** `uc<n>` above every id already in use. */
export function nextChangeId(list: UserChange[]): string {
    let max = 0;
    for (const entry of list) {
        const m = /^uc(\d+)$/u.exec(entry.id);
        if (m) max = Math.max(max, Number(m[1]));
    }
    return `uc${max + 1}`;
}

/** Deterministic supersede: a new entry replaces the one on the same (scope, intent) axis. */
export function supersedeDeterministic(list: UserChange[], incoming: UserChange): UserChange[] {
    const kept = list.filter(entry => !(entry.scope === incoming.scope && entry.intent === incoming.intent));
    return [...kept, incoming];
}

/**
 * Turn the model's consolidated list into the authoritative one.
 *
 * Authorship is NOT part of the model's contract: `user`/`date` are always taken from the entry this
 * agent stamped (for a new entry) or from the entry already in the file (for a kept one), so the two
 * hooks that run at different instants can never disagree. The model may only:
 *   - refine an INCOMING entry's `change`/`scope`/`intent` (the intent within CHANGE_INTENTS);
 *   - drop previous entries the new change contradicts.
 * Anything else — an invented id, a rewritten kept entry, a dropped incoming entry — is refused.
 */
export function validateConsolidated(before: UserChange[], after: unknown, incoming: UserChange[]): Guard<UserChange[]> {
    if (!Array.isArray(after)) return { ok: false, reason: 'userChanges did not come back as an array' };
    const list = normalizeUserChanges(after);
    if (list.length !== after.length) {
        return { ok: false, reason: 'userChanges carries malformed entries (each needs id + change)' };
    }
    if (!list.length && (before.length || incoming.length)) {
        return { ok: false, reason: 'userChanges came back empty — an edit was just applied' };
    }

    const beforeById = new Map(before.map(entry => [entry.id, entry]));
    const incomingById = new Map(incoming.map(entry => [entry.id, entry]));
    const seen = new Set<string>();
    const out: UserChange[] = [];

    for (const entry of list) {
        if (seen.has(entry.id)) return { ok: false, reason: `duplicated userChanges id '${entry.id}'` };
        seen.add(entry.id);

        const incomingHit = incomingById.get(entry.id);
        if (incomingHit) {
            const intent = (CHANGE_INTENTS as readonly string[]).includes(entry.intent) ? entry.intent : incomingHit.intent;
            out.push({ ...incomingHit, change: entry.change, scope: entry.scope, intent });
            continue;
        }
        const previous = beforeById.get(entry.id);
        if (!previous) return { ok: false, reason: `entry '${entry.id}' was invented — it is neither a previous entry nor the new one` };
        if (entry.change !== previous.change || entry.scope !== previous.scope || entry.intent !== previous.intent) {
            return { ok: false, reason: `entry '${entry.id}' was rewritten — a kept entry must stay as it was` };
        }
        out.push(previous);   // authorship comes from the file, never from the model
    }

    for (const entry of incoming) {
        if (!seen.has(entry.id)) return { ok: false, reason: `the new entry '${entry.id}' is missing from the consolidated list` };
    }
    return { ok: true, value: out };
}

/** The dominant line ending of a source file — generated defs on Windows are CRLF. */
export function detectEol(src: string): '\r\n' | '\n' {
    const crlf = (src.match(/\r\n/gu) ?? []).length;
    const lf = (src.match(/\n/gu) ?? []).length;
    return crlf > 0 && crlf >= lf / 2 ? '\r\n' : '\n';
}

/** Render the export block, stable and diff-friendly (one entry per line group, JSON values). */
export function renderUserChangesExport(list: UserChange[], eol: '\r\n' | '\n' = '\n'): string {
    const entries = list.map(entry => {
        const fields: string[] = [
            `"id": ${JSON.stringify(entry.id)}`,
            `"change": ${JSON.stringify(entry.change)}`,
            `"scope": ${JSON.stringify(entry.scope)}`,
            `"intent": ${JSON.stringify(entry.intent)}`,
            `"user": ${JSON.stringify(entry.user)}`,
            `"date": ${JSON.stringify(entry.date)}`,
        ];
        if (entry.styleReference) fields.push(`"styleReference": ${JSON.stringify(entry.styleReference)}`);
        return `  {${eol}    ${fields.join(`,${eol}    `)}${eol}  }`;
    });
    return `export const ${USER_CHANGES_EXPORT} = [${eol}${entries.join(`,${eol}`)}${eol}];`;
}

/**
 * Write the list into the defs source: replace the export in place, insert it right after
 * `definition` when absent, or drop it when the list is empty (a page with no deviations carries no
 * export). Never touches `definition` or `pipeline`.
 */
export function upsertUserChanges(defsSrc: string, list: UserChange[]): string {
    const span = findExportConst(defsSrc, USER_CHANGES_EXPORT);
    const eol = detectEol(defsSrc);

    if (!list.length) {
        if (!span) return defsSrc;
        let start = span.start;
        let end = span.end;
        while (start > 0 && /[ \t]/u.test(defsSrc[start - 1])) start--;
        while (start > 0 && /[\r\n]/u.test(defsSrc[start - 1])) start--;
        while (end < defsSrc.length && /[\r\n]/u.test(defsSrc[end])) end++;
        const before = defsSrc.slice(0, start);
        const after = defsSrc.slice(end);
        return before && after ? `${before}${eol}${eol}${after}` : `${before}${after}`;
    }

    const block = renderUserChangesExport(list, eol);
    if (span) return `${defsSrc.slice(0, span.start)}${block}${defsSrc.slice(span.end)}`;

    const definition = findExportConst(defsSrc, 'definition');
    if (definition) {
        return `${defsSrc.slice(0, definition.end)}${eol}${eol}${block}${defsSrc.slice(definition.end)}`;
    }
    // No definition export (unexpected): append at the end rather than losing the record.
    return `${defsSrc.replace(/\s*$/u, '')}${eol}${eol}${block}${eol}`;
}

/** True when the source already carries the export (for logging / smoke checks). */
export function hasUserChangesExport(defsSrc: string): boolean {
    const span = findExportConst(defsSrc, USER_CHANGES_EXPORT);
    return !!span && scanBalancedTs(defsSrc, span.valueStart) > 0;
}

/** Human summary of the current deviations, for the confirm panel and the record prompt. */
export function summarizeUserChanges(list: UserChange[]): string {
    if (!list.length) return '(no user change recorded yet)';
    return list.map(entry => `- [${entry.intent} @${entry.scope}] ${entry.change}`).join('\n');
}
