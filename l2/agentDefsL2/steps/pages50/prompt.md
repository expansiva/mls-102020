<!-- mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->

Define one page in desktop and mobile. Call submitD2Pages once. Return the exact schema:
desktop and mobile each contain definition and needs; categoryReason explains the shared category.
In each definition, template contains category only. Code derives experience from the catalog.
Intent, section purposes and organism text describe what the page shows and why, in userLanguage.
Give every organism its own intents array, even if empty. Use submit or navigate only.
For a submit, to is empty. For navigate, to is an accessible page id from the menu.

The needs draft is internal: every organism has reads, edits, selects and submits. Field paths
must exist in ontology and be disclosed by the actor's grants. selects is a target organism id
or empty. Every submit intent has a matching intentId and an Entity.operation write declared in
the page needs. Cover every page write with a submit or a navigate to an accessible page that
declares the same write. Do not invent writes, fields, routes or permissions.

Molecule recommendations are by organism and role. Preferred and optional alternative must
be exact tags from one of that organism's selected group indexes. Do not copy a catalog into
the definition. Leave organisms without compatible molecules out of molecules.
The research IDs organism1, organism2 and so on refer to menu organisms in source order;
map each one to the semantic id you assign to that organism in both definitions.

Page11 is for rendering. Do not include fields, rules, states, functions, pipeline, hashes,
capability refs, shared refs, HTML, CSS, fixed grids or implementation classes. Describe mobile
as fluid narrow content around 390px, also usable at 360px and 430px.

If repairing, replace the whole desktop/mobile pair and the internal drafts using the diagnostic.
