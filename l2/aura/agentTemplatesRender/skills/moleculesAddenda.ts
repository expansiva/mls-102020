/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/moleculesAddenda.ts" enhancement="_blank"/>

// Addenda appended to the v1 skills when the molecule mode is ON (useMolecules + the template carries a
// "## Molecules" section). Keeping them separate leaves the v1 skills byte-identical, so a run without
// useMolecules produces exactly the v1 prompts.
//
// How molecules work (embedded here — no runtime dependency on _102049_ / _102020_/l4):
// they live in _102040_/l2/molecules/<grouplowercase>/ml-*.{defs.ts,ts}, are custom elements WITHOUT
// Shadow DOM (@customElement('grouplowercase--ml-name')) extending MoleculeAuraElement; data goes down by
// property, events come up as CustomEvent, theming is done through --ml-* CSS custom properties.

/** agentTplWriteTemplate: the guide must carry a Molecules section built from the plan. */
export const writeTemplateAddendum = `
---

## ADDENDUM — Molecules section (this template uses the molecule library)

A molecule PLAN was produced for this template (given in the context). Add ONE extra section to the guide,
titled exactly \`## Molecules\`, placed right after "Page structure".

Content of the section:
- A table \`| region | element | group | molecule (TagName) or "hand-drawn" |\` carrying EVERY row of the
  plan. Copy the TagNames VERBATIM from the plan — they are the contract the render implements.
- One line stating that elements marked "hand-drawn" are built with the layout/utility framework plus the
  design-system tokens (no molecule).
- One line on theming: molecules are themed by mapping the design-system tokens onto the \`--ml-*\` custom
  properties of a wrapper, never by hardcoded colors.

Rules:
- The section is a GUIDE like the rest of the template: no project names, page ids, routes, BFF names,
  field names or bindings. The binding of each molecule to real state is decided per page, in its .defs.
- Do NOT add molecules that are not in the plan, and do not drop any row of it.
- The rest of the template (all the required sections) is unchanged — Molecules is an ADDITION.
- Add to the acceptance criteria: "each element of the Molecules table is implemented by its molecule (exact
  TagName) or hand-drawn as declared".
`;

/** agentTplDefs: anchor the uiSpec on the template's molecules + the REAL shared surface. */
export const defsAddendum = `
---

## ADDENDUM — Molecules (the template carries a "## Molecules" section)

The template prescribes molecules (custom elements of the molecule library) for some of its elements. The
uiSpec must carry that decision down to this page, bound to the REAL shared surface.

- For every uiSpec entry (field/collection/metric/action/feedback) whose template region has a molecule,
  add \`molecule: { group: "<groupName>", tag: "<TagName exactly as in the template>" }\`. Use ONLY
  TagNames present in the template's Molecules table.
- Every molecule entry MUST also carry its real binding: the \`stateName\`/setter/handler of the shared that
  the molecule reads and writes. **If there is no real state/handler for it in the shared, do NOT use a
  molecule there** — mark the entry as hand-drawn instead. A molecule without a real binding is a defect.
- Elements the template marks "hand-drawn" stay hand-drawn: no \`molecule\` key.
- Closed sets (businessRules) keep their \`options\` in the uiSpec even when a selection molecule is used —
  the render feeds the molecule's item slots from them.
- In the \`layout\` description of each region, say which elements are molecules and which are hand-drawn.
- Pipeline: add to the \`dependsFiles\` of the render item the refs given in the parameters for the molecule
  defs and the group usage skills (they are the render's real inputs).

Do not invent molecules, TagNames, props or events; do not promote a hand-drawn element to a molecule.
`;

/** agentTplCritique: third criterion — molecule adherence. */
export const critiqueAddendum = `
---

## ADDENDUM — Third criterion: molecule adherence

The template carries a "## Molecules" section, so also verify (same finding format as the other criteria):

1. **Only template molecules.** Every \`molecule.tag\` in the uiSpec appears in the template's Molecules
   table, spelled EXACTLY (group prefix included). Any molecule outside the table is a finding.
2. **Nothing silently dropped.** Every template element that has a molecule is either implemented with it
   or explicitly justified in the defs as not applicable to this page.
3. **Real binding.** Each molecule entry names a stateName/setter/handler that EXISTS in the shared. A
   molecule bound to nothing (or to an invented handler) is a high-severity finding.
4. **Intent match.** A closed set of values uses the selection molecule, never a free-text one; a derived/
   read-only value is not bound to an input molecule.
5. **Hand-drawn respected.** Elements the template marks hand-drawn did not acquire a molecule.
`;

/** agentTplRender: consume the molecules (import, tag, props/events, slots, --ml-* theming). */
export const renderAddendum = `
---

## ADDENDUM — Render WITH molecules

**This addendum OVERRIDES the "NO web components / molecules" rule stated above.** This page DOES use
molecules; everything else in the skill above (template structure, uiSpec rigor, Tailwind layout, design-
system colors, technical contract, self-check) remains in force.

The template's "## Molecules" section (and the page's uiSpec) prescribe molecules: reusable custom elements
of the molecule library. They replace the hand-drawn controls for the elements that have one. Everything the
plan leaves as "hand-drawn" is still built with Tailwind + design-system tokens, exactly as described above.

You also receive, for the molecules actually chosen: their \`.defs\` (exact TagName, Objective, Constraints)
and the \`usage\` skill of each group (props, events, slot tags, examples, tokens). Those are the contract.

### Consuming a molecule
- Use the **exact TagName** from the molecule defs (e.g. \`<groupselectone--ml-combobox>\`). Do NOT run it
  through convertFileToTag — the molecule registers its own custom element.
- **Register it**: one side-effect import at the top of the file per molecule used —
  \`import '/_102040_/l2/molecules/<grouplowercase>/<ml-name>.js';\`
- **Data goes down as PROPERTIES, events come up as CustomEvent** (Lit binding):
  - \`.value=\${this.<stateProp>}\`, \`?required=\${true}\`, \`?disabled=\${this.<loadingProp>}\`,
    \`.error=\${this.<errorProp>}\`, plain attributes for enum-ish props (\`variant="table"\`);
  - \`@change=\${(e: Event) => this.<realSetterOrHandler>((e as CustomEvent<{ value: <T> }>).detail.value)}\`
    — the detail shape of each group is in its usage skill; always bind to a REAL shared member.
- **Slot tags** as children, per the group's usage (e.g. \`<Label>\`, \`<Helper>\`, \`<Item value="...">\`,
  \`<Column>\`, \`<Cell>\`, \`<Empty>\`). Fill repeated slots by iterating the REAL data (query results /
  contract fields). Labels via this.msg when a key exists, else a literal.
- \`data-class="..."\` passes extra utility classes to the host or a slot tag when needed.
- Use ONLY props/events/slots declared in that group's usage. Never invent an attribute.

### IMPORTANT — how to read the usage skills
The usage documents are written for the declarative template engine, so their examples may show
moustache bindings (\`value="{{...}}"\`) and legacy tag spellings. Take from them ONLY the CONTRACT: the
property names, event names and detail shapes, the slot tags, and the token list. The TagName always comes
from the molecule \`.defs\`, and the binding is always Lit property/event as shown above.

### Theming the molecules
Molecules read \`--ml-*\` custom properties. Theme them by MAPPING design-system tokens onto \`--ml-*\` on a
wrapper element that contains them (they inherit by cascade), always with a fallback inside var():
\`style="--ml-surface: var(--surface-bg,#ffffff); --ml-on-surface: var(--text-default,#0f172a);
--ml-on-surface-muted: var(--text-muted,#64748b); --ml-primary: var(--button-primary-bg,#1273d4);
--ml-on-primary: var(--button-primary-text,#ffffff); --ml-error: var(--status-error-text,#991b1b);
--ml-outline-variant: var(--border-default,#e2e8f0)"\`
Map only the \`--ml-*\` the used molecules actually cite. Never hardcode colors inside a molecule's props,
and never add \`dark:\` on tokenized colors — theming is the design system's job.

### Self-check (in addition to the v1 checks)
- Every molecule of the plan/uiSpec: exact TagName, module imported, props/slots/events per its usage,
  bound to REAL shared state/handlers. No molecule outside the plan; no invented attribute.
- Hand-drawn elements still fully implemented with Tailwind + \`var(--token,fallback)\`.
- Molecules are the ONLY web components allowed in the page.
`;
