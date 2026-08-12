<!-- modelType: reasoning -->

Detail exactly one frozen workspace. Return only organisms and command inputs for its already
defined scenarios. Preserve every scenarioId, sliceId, pageContext id and skeletonHash exactly.

Return exactly one `{ "type": "flexible", "result": { ... } }` object without Markdown. The `result`
value is the workspace detail. Where the strict schema requires an otherwise absent optional id, use
the empty string; it is normalized back to absent after the worker response.

An organism has a reusable role, fragmentRef, optional existing sliceId, ontology fieldRefs and
localized intent. Select only listed ontology fields. Command input sources are limited to
pageContext, selection (with an existing sliceId), userDecision or actorSession. Do not create
routes, APIs, queries, database instructions, actors, authorities or new scenarios. Honor the
provided E3 disclosure limits.
