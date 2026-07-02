/// <mls fileReference="_102020_/l2/agentMaterializeSolution/skills/genPageDS.ts" enhancement="_blank"/>

export const skill = `
# SKILL: Render a page with the Design System's molecules

Generate the Lit render file for a page{layout}{ds} genome (derived from page11). This file
extends the shared base class and ONLY renders — it owns no state, defines no handlers and
duplicates no i18n. The difference from page11: wherever the page definition assigns a
\`molecule\` to a UI element, render THAT molecule (a web component) instead of a hand-built
control, and apply the design system's visual tokens.

## Input contract

The definition is the page{layout}{ds} \`.defs.ts\` object. The render structure lives in
\`definition.layout.sections[].organisms[].intentions[]\`:
- Each intention has an \`intent\` plus \`fields[]\`, \`columns[]\`, \`filters[]\`, \`toolbar[]\`, \`rowActions[]\`, \`actions[]\`.
- ANY of those elements — and, for collection/summary/status intents, the intention itself —
  MAY carry a \`molecule\` object: \`{ project, group, tag, purpose, import }\`.
  - \`molecule\` PRESENT → render that molecule for this element (see "Rendering a molecule").
  - \`molecule\` ABSENT  → render a plain control, exactly like page11.

Context files provided:
- shared \`.defs.ts\` / shared \`.ts\`: the base class, @property states, handlers and msg keys.
- the DS global stylesheet (\`styles/<ds>/global.css\`): visual tokens — already linked; just use them.
- one molecule USAGE skill per used group (\`…/skills/molecules/<group>/usage.ts\`): the slots,
  properties and variants of each molecule. ALWAYS consult the matching usage skill before
  rendering a molecule.

## Mandatory first step

Read the shared \`.ts\` and extract: the base class name, every @property() field name, every
handler (methods starting with \`handle\`), every method referenced by shared actions, and every
msg key. Use ONLY those names in render(). Never invent property, handler or msg names.

## Rendering a molecule (the key rule)

For each element that has a \`molecule\`:
1. Import it for its side effect (this registers the custom element):
   \`import '<molecule.import>';\`
2. Render its tag: \`<molecule.tag …></molecule.tag>\`. The tag IS the chosen variant — render
   exactly the assigned molecule; never swap it for another tag or group.
3. Configure it from its group's USAGE skill (group = \`molecule.group\`):
   - bind its value/selection property to the shared property found via \`field.stateKey\`
     (look the stateKey up in shared \`.defs.ts\`, then use the real @property name from shared \`.ts\`);
   - fill its slots (e.g. \`Label\`, \`Item\`, \`Column\`, \`Cell\`, \`Empty\`) from the field/column/option data;
   - bind its change/input/submit events ONLY to existing shared handlers;
   - for an action molecule, bind the click/submit to the handler resolved via
     \`action.actionKey\` / \`action.action\` in shared \`.defs.ts\` → shared \`.ts\`.
4. If a molecule needs a property/handler that does not exist in shared \`.ts\`, degrade gracefully
   (render it read-only / disabled). Never invent names.

Elements WITHOUT a \`molecule\` keep page11 behavior: a native input/table/button, still bound to
the shared state/handlers and msg keys.

## Mapping the layout → render

Use \`definition.layout.sections[]\`. Use \`section.titleKey\` / \`organism.titleKey\` /
\`intention.titleKey\` / \`intention.emptyKey\` / \`field.labelKey\` / \`action.labelKey\` only as keys
into \`this.msg\` (render a safe empty string when a key is missing — do not invent keys).

Per intent:
- \`commandForm\`    → a form; each field is its molecule (if assigned) or a plain input; \`actions\` are submit/confirm buttons.
- \`queryList\`      → a collection; if the intention has a molecule (e.g. a data table/grid) render it fed by the shared collection state + \`columns\`; \`filters\`/\`toolbar\`/\`rowActions\` use their molecules or plain controls.
- \`summary\`        → a summary/metric block; its molecule (if assigned) shows the metric.
- \`actionList\`     → a row of action buttons (molecules or plain).
- \`workflowStatus\` → a status/progress block; its molecule (if assigned) shows the progress/steps.

## Design & tokens

Apply the DS visual tokens from the global stylesheet (colors, spacing, typography). Use Tailwind
utility classes with dark variants. Your job is layout, hierarchy and wiring — molecules carry
their own internal styling, so do not re-style their internals. Each organism should read as a
distinct, purpose-built section.

## Interaction rules

- Inputs/molecules bind their value from shared properties; change/input/submit bind only to existing shared handlers.
- Buttons (and action molecules) bind only to existing shared handlers.
- No inline assignment like \`this.field = value\`; inline arrows only to pass item context to an existing handler.

## Guardrails

- render() must compile even when some optional layout hints are missing; prefer omitting an interaction over inventing one.
- No @property fields, no helper methods, no setState, no duplicated i18n.
- Do not replace or rename the molecule tag chosen in the defs — render exactly the assigned one.
- Every visible text uses \`this.msg\` when the key exists; never use \`this.purpose\`.
`;
