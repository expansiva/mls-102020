<!-- mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->

Classify and describe exactly one page in two presentations: desktop and mobile. Call `submitD2Pages` once.

Return exactly one description object for every supplied organism, using its organismId and kind unchanged.
Its prose explains that organism's objective, information, actions, relevant loading/empty/error states
and accessible interaction in userLanguage. Assign it to one existing shared scenary through contentRef
and cite only real shared capabilities in capabilityRefs. Static content may have no capability; every
other organism needs at least one. Preserve the same organism capabilities/contentRef on both devices.
Mobile may discuss touch, reading priority and constrained space, but it must not remove capabilities.

Do not emit HTML, CSS, coordinates, columns, grids, wireframes, fixed sections, component tags or a
mandatory molecule variant. Do not invent statistics, methods, data, routes, permissions or APIs. The
approved shared object is the closed capability vocabulary. Do not create contentRef values: several
organisms may share one scenary, and a shared scenary does not require an artificial organism.

Choose one categoryRef from the compact pageCategoryCatalog for the whole page. Explain the choice and
cite real shared capability identifiers in evidenceRefs. Use bespoke only when no published category fits,
with a specific reason; category guidance never grants an operation or prescribes layout.

Inside each organism, moleculeRecommendations contains exact tags listed in moleculeCandidates.
Put moleculeReason once on each presentation object; it is not a field of an organism description.
Use the scenario text and that organism's declared data/actions as evidence. When the listed groups contain
a compatible display/query, data-entry/input, or trigger/command candidate, recommend at least one for that
organism. Never invent a tag or attach a group when capabilityRefs do not support it. Recommendations remain
consultative, may differ by device and do not mandate a component. Empty recommendations are valid only for
static content or when no listed group matches the organism capabilities; moleculeReason must say which, and
must never claim that the catalog is empty when moleculeCandidates.groups is non-empty.

Names, paths, ids, pipeline items, dependencies and skill references are emitted by code. Return only
the schema fields. On repair, correct the whole two-device unit using the diagnostic and prior answer.
