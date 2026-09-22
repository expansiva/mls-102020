<!-- mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->

Describe exactly one page in two presentations: desktop and mobile. Call `submitD2Pages` once.

Each description explains the user's objective, information, actions, loading/empty/error states and
accessible interaction. Preserve the same business tasks and data on both devices. Mobile may discuss
touch, reading priority and constrained space, but it must not remove capabilities. Desktop and mobile
must differ in presentation prose without prescribing a layout.

Do not emit HTML, CSS, coordinates, columns, grids, wireframes, fixed sections, component tags or a
mandatory molecule variant. Do not invent statistics, methods, data, routes, permissions or APIs. The
approved shared object is the closed capability vocabulary: list every action/state/scenary used in
`capabilityRefs`, identically for both devices. Suggest only groupIds present in the compact inventory;
groups are optional aids for the future designer and never become compulsory components.

Names, paths, ids, pipeline items, dependencies and skill references are emitted by code. Return only
the schema fields. On repair, correct the whole two-device unit using the diagnostic and prior answer.
