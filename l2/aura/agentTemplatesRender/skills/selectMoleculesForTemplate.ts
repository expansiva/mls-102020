/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/selectMoleculesForTemplate.ts" enhancement="_blank"/>

// Skill for agentTplSelectMolecules (useMolecules): cascade steps 3-4 — read the molecules of the chosen
// groups and pick the best one per element, or NONE. Produces the molecule PLAN (.md) that the template
// guide embeds as its "## Molecules" section. Adapted from mls-102049 mode8/selectMolecules, moved to the
// TEMPLATE level: no project bindings here (each page's defs binds the molecule to its real shared state).

export const skill = `
# CollabUX · Pick the molecules for a template (grupo → molécula)

You are the SECOND half of the cascade. The groups were already chosen; now pick, for EACH element, the
single molecule that fits — or NONE. You produce a PLAN, never render code.

## You receive
- The template being written (id, style model) and the ELEMENTS with their chosen intent group.
- For each chosen group, its molecules: ref, **TagName**, \`layoutConfig\` (the design-system axes the
  molecule serves) and Objective. This is what you decide on.

## How to choose
- Compare the element's intent + the template's density/style with each molecule's Objective and
  \`layoutConfig\`. Examples: "closed short set the user must compare by attributes" → a table-style
  selection molecule; "few options always visible" → radio/segmented; "many options, compact" → dropdown/
  combobox; "dense operational grid" → a full data table rather than a card list.
- Pick exactly ONE molecule per element. If none fits well, answer **NONE** — the render will hand-draw it
  with Tailwind + design-system tokens. NEVER force a bad molecule; NONE is a good answer.
- Use the TagName EXACTLY as written in the molecule defs. Never invent one, never rename, never pick a
  molecule from a group that was not selected.
- Prefer REUSE: the same intent in several regions takes the same molecule.
- The style model matters: it decides density and emphasis, not the intent.

## Output — the molecule PLAN (markdown)
Emit the complete .md file, exactly in this shape:

\`\`\`md
# Molecules — <templateId> (<styleModel>)

| element | region | intent | group | molecule (TagName) | why / if NONE, why not |
| --- | --- | --- | --- | --- | --- |
| ... | ... | ... | groupX | groupx--ml-y | ... |
| ... | ... | ... | — | NONE | no molecule fits: ... |

## Groups
- groupX
- groupY

## TagNames
- groupx--ml-y
- groupy--ml-z
\`\`\`

The two closing lists are read by the machinery (render loads the \`usage\` skill of each group and the
defs of each TagName) — keep them deduplicated, one item per line, exactly as shown. Elements resolved as
NONE contribute nothing to them.

## Hard rules
- This plan is TEMPLATE-level and REUSABLE: no project names, page ids, routes, BFF/operation names, field
  names or seed data. Describe elements by their role in the template's regions.
- Do NOT specify bindings here: each page's .defs binds the molecule to its real shared state/handler.
- Every element you were given appears in the table exactly once — including the ones with no group (they
  are NONE by definition).

Return ONLY the complete markdown file via the submit tool.
`;
