/// <mls fileReference="_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts" enhancement="_blank"/>

export const skill = `# Generate a D2 page11 implementation

The materializer writes TypeScript only, not LESS/CSS. Never add a local stylesheet import unless that exact stylesheet already exists in the supplied artifact context. A matching filename is not evidence of existence. Preserve imports of real existing stylesheets; do not fabricate a side-effect import to a missing .less file.

Read the generated page defs and its approved shared definition before writing code. Extend the real shared class and import only existing .defs.ts types and modules. Implement the declared capabilities without adding business decisions, endpoints, handlers, state properties, skeleton APIs or translation keys.
Read definition as prose and pipeline.coverage as derived evidence, not an editable second specification. Resolve pipeline.templateSelection sources and their hashes; follow only the selected experience/style within shared/DTO/grant/rule authority. Render every organism in coverage and bind its actual public shared members. A state setter is a handler, not a visual field: editable userInput/form states permit fields, selection states need authorized pickers, and hidden/route/session values stay out of forms. Preserve enum values and labels and loading/error feedback without inventing defaults.
Use the exact destination MLS header, path-derived custom-element tag and exported class. Import ml-scenary implementation for registration as a side effect in addition to reading its defs. render() only derives DOM from state; do not fetch, write state, schedule work or mutate DOM in render.
Mobile uses fluid width: preview 390px, inspect 360px and 430px. Choose its reading/action sequence for this page, with touch-accessible actions and readable cards/lists/panels as appropriate. Do not squeeze a desktop table or allow horizontal overflow. Keep custom CSS in the matching LESS under the custom element selector; no Shadow DOM/static styles or invented tokens.

Use StateLitElement without Shadow DOM: page CSS belongs in the matching scoped .less file, never in static styles. Keep visible text in the project's i18n mechanism and make keyboard, focus, loading, empty and error behavior accessible. Adapt the composition to desktop or mobile without removing capabilities.

Read the declared project-level \`l2/designSystem.ts\` context. Use only token names that it actually exposes, through \`var(--<token>, <neutral fallback>)\`; never invent a token, copy token values into the page, or infer a palette when the dependency is missing.

Read \`/_102020_/l2/molecules/ml-scenary.defs.ts\` before rendering scenario content. Use one \`molecules--ml-scenary-102020\` host and exactly one \`Scene\` child for every scenario declared by the real shared definition. Bind the host value to the actual shared scenario state; do not invent \`uiScenary\`, a local state or a handler. Place every described organism in its declared contentRef Scene and keep it identifiable by organismId. Inactive Scenes stay mounted and are hidden, inert and outside focus according to the molecule contract; never conditionally remove their descendants. Error keeps the active form and its values; success and cancel change content only through behavior actually declared by shared.

Treat molecule recommendations as consultative candidates: read the selected molecule defs and usage contract first, validate slots/events against the organism's shared capabilities, and choose the compatible variant during materialization rather than assuming or rendering every candidate.

Fail with a precise incompatibility when a required shared name, type, Scene, translation facility or referenced skill cannot be read. Do not fabricate a substitute.`;
