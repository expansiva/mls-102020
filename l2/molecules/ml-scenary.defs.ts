/// <mls fileReference="_102020_/l2/molecules/ml-scenary.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code.

export const group = 'molecules';
// Design-system axes this molecule candidates for (matched by the DS agent).
export const layoutConfig = {};

export const skill = `# Metadata
- TagName: molecules--ml-scenary-102020

# Objective
Show exactly one named scene of page content at a time, keeping every other scene in the DOM (hidden) so nested state is preserved. The host has two modes: \`scenary\` (the app commands which scene is visible; an optional back control on a scene) and \`tabs\` (the user picks a scene from a tab bar). A boolean \`revealall\` stacks every scene for page-IDE inspection. The molecule owns no business logic, no i18n, and no URL.

# Responsibilities
- Accept content areas named \`Scene\` with required unique \`value\`, already-translated \`title\`, optional \`nav="back"\`, optional \`backTo\`, and optional \`disabled\`.
- Keep every Scene in the DOM; inactive scenes receive \`hidden\` rather than being unrendered, so returning does not rebuild nested widgets (scroll, filters, partial forms).
- Honour host \`value\` as the active scene (first enabled Scene when the value is missing or points at a disabled scene). Setting \`value\` from outside does not emit \`change\`.
- In \`mode="tabs"\` (and more than one Scene): render a tablist of Scene titles with tab/tabpanel roles, ArrowLeft/ArrowRight skipping disabled tabs, Enter/Space activating the focused tab.
- In \`mode="scenary"\` (and more than one Scene): render no tab bar; a Scene with \`nav="back"\` renders a back control labelled by host \`backLabel\` that navigates to \`backTo\` or the first enabled Scene; move focus to the scene heading after an internal change; label the visible region with the Scene title.
- With a single Scene: render that Scene's content with no tab bar, no back control, and no visual chrome.
- When \`revealall\` is true: ignore \`value\`, emit no events, and stack every Scene with a discrete badge of \`value\` + \`title\`.
- Dispatch bubbling, composed \`change\` with \`{ value, previous, title }\` only on internal navigation (tab click/keyboard, back control).
- Block internal navigation while host \`disabled\` or \`loading\` is true; expose \`loading\` as \`aria-busy\`.
- Carry no literal user-facing copy of its own — visible text comes from Scene \`title\` and host \`backLabel\`.

# Constraints
- Only one Scene is visible per host, except \`revealall\`.
- Do not access the URL; do not decide when a form is done; do not translate strings.
- Keyboard navigation must skip disabled Scenes.
- Disabled Scenes must not dispatch \`change\`.
- Duplicate or empty Scene \`value\`s are ignored (first unique non-empty value wins).
- Do not introduce slots, properties, or events beyond this contract (\`mode\`, \`value\`, \`backLabel\`, \`disabled\`, \`loading\`, \`revealall\`, \`change\`).
# Notes
- \`change\` detail is \`{ value, previous, title }\`.
- \`title\` on Scene is supplied already translated by the page (\`this.msg\`).
- Simultaneous scenes (master-detail) are composition of two hosts, not an exception inside one host.`;
