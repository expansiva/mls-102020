<!-- mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->

Classify and describe exactly one page in two presentations: desktop and mobile. Call `submitD2Pages` once.
Provide pageIntent in userLanguage: the authorized actor's purpose and scope. The emitted page11 is a textual definition; structured coverage is derived from approved shared.coverage. Code fills each organism's contentRef and capabilityRefs from shared.coverage by organismId. For each capability, cite output fields only using the exact structured reference `${outputTypeRef}.${path}` from that organism's `outputFieldsByCapability[capability]`; cite only what supports the description, and never guess or combine fields across capabilities. Never turn a state setter, hidden snapshot, route or session value into an editable visual field.
Mobile is its own composition for narrow fluid viewports: preview 390px, validate 360/430px, accessible touch targets, readable sequential panels or cards where appropriate, without horizontal overflow or a squeezed desktop table. Do not freeze a grid or choose one layout for every page.
The selected category Markdown and any explicit style/layout preference guide materialization. Shared, DTOs, grants and rule references prevail over suggestions for totals, tab saves or filters.

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

The earlier research pass already assessed every catalog group. For each supplied needId in
moleculeShortlist, return moleculeResearch with semantic roles and choices based on the actually read
group index and usage contract. Each role has a preferred exact tag, a specific reason, at most one
useful alternative and reasons for discarded candidates. No role or tag may be inferred from a legacy
recommendation. With no shortlisted group, return no roles and an honest noMatchReason. Recommendations
are consultative and may differ by device. Do not repeat group assessments in this final response.

Names, paths, semantic references and receipt metadata are derived by code. Return only
the schema fields. On repair, correct the whole two-device unit using the diagnostic and prior answer.
