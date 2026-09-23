/// <mls fileReference="_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts" enhancement="_blank"/>

export const skill = `# Generate a D2 page11 implementation

Read the generated page defs and its approved shared definition before writing code. Extend the real shared class and import only existing .defs.ts types and modules. Implement the declared capabilities without adding business decisions, endpoints, handlers, state properties, skeleton APIs or translation keys.

Use StateLitElement without Shadow DOM: page CSS belongs in the matching scoped .less file, never in static styles. Keep visible text in the project's i18n mechanism and make keyboard, focus, loading, empty and error behavior accessible. Adapt the composition to desktop or mobile without removing capabilities.

Render page content through the Scene contract published by the real shared definition. Use one scenario host and a Scene for each declared scenario; inactive scenes remain governed by that contract. Render semantic organisms inside their assigned Scene when the defs provide them. Treat molecule recommendations as optional candidates: read the selected molecule defs and usage contract first, validate slots/events against shared, and do not assume a variant.

Fail with a precise incompatibility when a required shared name, type, Scene, translation facility or referenced skill cannot be read. Do not fabricate a substitute.`;
