/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/templateRules.ts" enhancement="_blank"/>

// The `## Molecule rules` block of a UX template (`l4/collabux/templates/<category>/<experience>.md`): the groups the
// template forbids, for the input20 gate of the UX variants.
//
// COPY of `extractTemplateRules` in `_102020_/l2/aura/helpers/templateRules.ts` (template rules, phase 2, 22/10/2026),
// private to this agent (README: self-contained, no import from another folder). Keep the extraction identical; the
// parity test in templateRules.test.ts runs both on the real templates. Differences, on purpose:
// - no `validateTemplateRules` (it needs the axis vocabulary and the catalog group ids): `l2TemplateForbiddenGroups`
//   reads only `groups.forbid` and calls any other shape of it an error.
//
// PURE: the caller supplies the markdown.

export type L2TemplateRulesExtraction =
  | { kind: 'rules'; rules: unknown }
  | { kind: 'none' }
  | { kind: 'error'; message: string };

export const L2_MOLECULE_RULES_HEADING = '## Molecule rules';

const FENCE = /^\s{0,3}(```+|~~~+)\s*([^\s`]*)/;

/** The first ```json fence of the `## Molecule rules` section, parsed; `none` for a legacy template without it. */
export function l2ExtractTemplateRules(markdown: string): L2TemplateRulesExtraction {
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
    if (lines[i].trimEnd() === L2_MOLECULE_RULES_HEADING) headings.push(i);
  }
  if (headings.length === 0) return { kind: 'none' };
  if (headings.length > 1) return { kind: 'error', message: `more than one "${L2_MOLECULE_RULES_HEADING}" heading` };

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
  if (open) return { kind: 'error', message: `unterminated code block in "${L2_MOLECULE_RULES_HEADING}"` };
  if (blocks.length === 0) return { kind: 'error', message: `"${L2_MOLECULE_RULES_HEADING}" has no \`\`\`json block` };
  if (blocks.length > 1) return { kind: 'error', message: `"${L2_MOLECULE_RULES_HEADING}" has ${blocks.length} \`\`\`json blocks; exactly one is allowed` };

  try {
    return { kind: 'rules', rules: JSON.parse(blocks[0]) };
  } catch (e) {
    return { kind: 'error', message: `invalid JSON in "${L2_MOLECULE_RULES_HEADING}": ${(e as Error).message}` };
  }
}

/**
 * The groups a template forbids (`groups.forbid`), lower-cased for a case-insensitive match against the tag prefix
 * (`groupviewtable--ml-data-table` → `groupviewtable`). `none`: a legacy template without the section, no restriction.
 */
export function l2TemplateForbiddenGroups(markdown: string): { kind: 'none' } | { kind: 'forbid'; groups: string[] } | { kind: 'error'; message: string } {
  const extracted = l2ExtractTemplateRules(markdown);
  if (extracted.kind !== 'rules') return extracted;
  const rules = extracted.rules;
  const groups = typeof rules === 'object' && rules !== null && !Array.isArray(rules) ? (rules as { groups?: unknown }).groups : undefined;
  const forbid = typeof groups === 'object' && groups !== null && !Array.isArray(groups) ? (groups as { forbid?: unknown }).forbid : undefined;
  if (!Array.isArray(forbid) || forbid.some(item => typeof item !== 'string')) return { kind: 'error', message: `"${L2_MOLECULE_RULES_HEADING}" has no "groups.forbid" list of group ids` };
  return { kind: 'forbid', groups: (forbid as string[]).map(item => item.toLowerCase()) };
}
