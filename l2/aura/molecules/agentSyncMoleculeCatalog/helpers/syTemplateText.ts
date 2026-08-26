/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTemplateText.ts" enhancement="_blank"/>

// Making arbitrary prose safe to embed in a generated TEMPLATE LITERAL. Pure.
//
// ⚠️ WHY THIS EXISTS, and it is not hypothetical. Both catalog levels publish their markdown as
// `export const skill = \`…\`;`, and the prose inside comes from sources this agent does not control:
// the group description in skills/index.ts (hand-written) and each molecule's `# Objective` (written by
// the molecule's own author). On 2026-08-26 a real generated skill.ts was BROKEN in the editor because
// groupSelectOne's description says:
//
//     Layout is chosen via the `variant` property: dropdown/combobox (default), radio group, …
//
// The first backtick of `variant` CLOSED the template literal 29 lines early, and everything after it
// was parsed as code. The file still wrote and still synced — nothing failed loudly; it just stopped
// being valid TypeScript. Markdown prose using backticks for inline code is completely normal, so this
// was going to happen the moment any author wrote one.
//
// `${` matters for the same reason and is rarer only by luck: it would turn prose into an interpolation
// and either fail to compile or silently evaluate something.

/**
 * Escapes the two sequences that can break out of a template literal: a backtick, and the `${` that
 * opens an interpolation. The backslash itself goes first — escaping it afterwards would double the
 * backslashes this function had just added.
 *
 * The result is meant to be placed BETWEEN backticks by the caller; it does not add the delimiters.
 */
export function syEscapeTemplateLiteral(text: string): string {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}
