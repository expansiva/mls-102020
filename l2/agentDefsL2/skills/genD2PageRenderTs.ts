/// <mls fileReference="_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts" enhancement="_blank"/>

export const skill = `# Generate a D2 page11 implementation

Read the generated page defs and its approved shared definition before writing code. Extend the real shared class and import only existing .defs.ts types and modules. Implement the declared capabilities without adding business decisions, endpoints, handlers, state properties, skeleton APIs or translation keys.

Use StateLitElement without Shadow DOM: page CSS belongs in the matching scoped .less file, never in static styles. Keep visible text in the project's i18n mechanism and make keyboard, focus, loading, empty and error behavior accessible. Adapt the composition to desktop or mobile without removing capabilities.

Read \`/_102020_/l2/molecules/ml-scenary.defs.ts\` before rendering scenario content. Use one \`molecules--ml-scenary-102020\` host and exactly one \`Scene\` child for every scenario declared by the real shared definition. Bind the host value to the actual shared scenario state; do not invent \`uiScenary\`, a local state or a handler. Place every described organism in its declared contentRef Scene and keep it identifiable by organismId. Inactive Scenes stay mounted and are hidden, inert and outside focus according to the molecule contract; never conditionally remove their descendants. Error keeps the active form and its values; success and cancel change content only through behavior actually declared by shared.

Treat molecule recommendations as consultative candidates: read the selected molecule defs and usage contract first, validate slots/events against the organism's shared capabilities, and choose the compatible variant during materialization rather than assuming or rendering every candidate.

Fail with a precise incompatibility when a required shared name, type, Scene, translation facility or referenced skill cannot be read. Do not fabricate a substitute.`;
