/// <mls fileReference="_102020_/l2/aura/helpers/templateRules.ts" enhancement="_blank" />

/**
 * The `## Molecule rules` block of a UX template (`l4/collabux/templates/<category>/<experience>.md`).
 *
 * The block is the FIRST ```json fence after the `## Molecule rules` heading, before the next `## `
 * heading; nothing else in the file is extracted. v1 applies to the whole page:
 *
 *   { "axes": { "recordsView": "grid" }, "groups": { "prefer": ["groupViewCard"], "forbid": ["groupViewTable"] } }
 *
 * - `axes`: only axes and values of `layoutAxes`; an absent axis follows the axis default.
 * - `groups.forbid`: groups the page must not use. `groups.prefer`: groups the template favors.
 * - Group ids follow the catalog folders (`aura/molecules/skills/group*`), compared ignoring case.
 *
 * Legacy `pageNN.md` templates have no section: `none` means "no restriction".
 *
 * PURE — no `mls.*`, no file system. The caller supplies the markdown and the group ids.
 */
import { layoutAxes } from '/_102020_/l2/aura/helpers/designSystemAuraBase.js';

export interface ITemplateRules {
    axes: Record<string, string>;
    groups: { prefer: string[]; forbid: string[] };
}

export type TemplateRulesExtraction =
    | { kind: 'rules'; rules: unknown }
    | { kind: 'none' }
    | { kind: 'error'; message: string };

/** The minimal axis shape the validator needs (satisfied by `layoutAxes`). */
export type TemplateRulesAxes = Readonly<Record<string, { readonly values: readonly string[] }>>;

export const MOLECULE_RULES_HEADING = '## Molecule rules';

const FENCE = /^\s{0,3}(```+|~~~+)\s*([^\s`]*)/;

/**
 * Finds the `## Molecule rules` section and parses its first ```json block.
 * `rules` is the raw parsed JSON: run `validateTemplateRules` before trusting it.
 */
export function extractTemplateRules(markdown: string): TemplateRulesExtraction {
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');

    // Locate the section heading(s), skipping fenced code (a heading inside a fence is text).
    const headings: number[] = [];
    let fence: string | undefined;
    for (let i = 0; i < lines.length; i++) {
        const m = FENCE.exec(lines[i]);
        if (fence) {
            if (m && m[1][0] === fence[0] && m[1].length >= fence.length && m[2] === '') fence = undefined;
            continue;
        }
        if (m) { fence = m[1]; continue; }
        if (lines[i].trimEnd() === MOLECULE_RULES_HEADING) headings.push(i);
    }
    if (headings.length === 0) return { kind: 'none' };
    if (headings.length > 1) return { kind: 'error', message: `more than one "${MOLECULE_RULES_HEADING}" heading` };

    // Walk the section until the next `## ` heading, collecting the json fences.
    const blocks: string[] = [];
    let open: { marker: string; json: boolean; body: string[] } | undefined;
    for (let i = headings[0] + 1; i < lines.length; i++) {
        const line = lines[i];
        const m = FENCE.exec(line);
        if (open) {
            if (m && m[1][0] === open.marker[0] && m[1].length >= open.marker.length && m[2] === '') {
                if (open.json) blocks.push(open.body.join('\n'));
                open = undefined;
            } else {
                open.body.push(line);
            }
            continue;
        }
        if (/^##\s/.test(line)) break;
        if (m) open = { marker: m[1], json: m[2].toLowerCase() === 'json', body: [] };
    }
    if (open) return { kind: 'error', message: `unterminated code block in "${MOLECULE_RULES_HEADING}"` };
    if (blocks.length === 0) return { kind: 'error', message: `"${MOLECULE_RULES_HEADING}" has no \`\`\`json block` };
    if (blocks.length > 1) return { kind: 'error', message: `"${MOLECULE_RULES_HEADING}" has ${blocks.length} \`\`\`json blocks; exactly one is allowed` };

    try {
        return { kind: 'rules', rules: JSON.parse(blocks[0]) };
    } catch (e) {
        return { kind: 'error', message: `invalid JSON in "${MOLECULE_RULES_HEADING}": ${(e as Error).message}` };
    }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Checks parsed rules against the axis vocabulary and the catalog group ids. Returns the problems,
 * one sentence each; an empty list means the rules are valid (and match `ITemplateRules`).
 */
export function validateTemplateRules(
    rules: unknown,
    axes: TemplateRulesAxes = layoutAxes,
    groupIds: readonly string[] = [],
): string[] {
    const problems: string[] = [];
    if (!isPlainObject(rules)) return ['the rules must be a JSON object with "axes" and "groups"'];

    for (const key of Object.keys(rules)) {
        if (key !== 'axes' && key !== 'groups') problems.push(`unknown top-level key "${key}"`);
    }

    // axes
    if (!('axes' in rules)) problems.push('missing "axes"');
    else if (!isPlainObject(rules.axes)) problems.push('"axes" must be an object');
    else {
        for (const [axis, value] of Object.entries(rules.axes)) {
            const def = Object.prototype.hasOwnProperty.call(axes, axis) ? axes[axis] : undefined;
            if (!def) { problems.push(`unknown axis "${axis}"`); continue; }
            if (typeof value !== 'string' || !def.values.includes(value)) {
                problems.push(`axis "${axis}": value ${JSON.stringify(value)} is not one of ${def.values.join(', ')}`);
            }
        }
    }

    // groups
    if (!('groups' in rules)) { problems.push('missing "groups"'); return problems; }
    if (!isPlainObject(rules.groups)) { problems.push('"groups" must be an object'); return problems; }
    const groups = rules.groups;
    for (const key of Object.keys(groups)) {
        if (key !== 'prefer' && key !== 'forbid') problems.push(`unknown key "groups.${key}"`);
    }

    const known = new Set(groupIds.map(g => g.toLowerCase()));
    const seen: Record<'prefer' | 'forbid', Map<string, string>> = { prefer: new Map(), forbid: new Map() };
    for (const list of ['prefer', 'forbid'] as const) {
        if (!(list in groups)) { problems.push(`missing "groups.${list}"`); continue; }
        const ids = groups[list];
        if (!Array.isArray(ids)) { problems.push(`"groups.${list}" must be an array`); continue; }
        for (const id of ids) {
            if (typeof id !== 'string') { problems.push(`"groups.${list}": ${JSON.stringify(id)} is not a string`); continue; }
            const norm = id.toLowerCase();
            if (!known.has(norm)) problems.push(`"groups.${list}": unknown group "${id}"`);
            if (seen[list].has(norm)) problems.push(`"groups.${list}": duplicate group "${id}"`);
            else seen[list].set(norm, id);
        }
    }
    for (const [norm, id] of seen.prefer) {
        if (seen.forbid.has(norm)) problems.push(`group "${id}" is both in "groups.prefer" and "groups.forbid"`);
    }
    return problems;
}
