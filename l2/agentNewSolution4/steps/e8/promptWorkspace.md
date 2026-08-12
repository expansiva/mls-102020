<!-- modelType: reasoning -->

Detail exactly one frozen workspace. Return only organisms and command inputs for its already
defined scenarios. Preserve every scenarioId, sliceId, pageContext id and skeletonHash exactly.

An organism has a reusable role, fragmentRef, optional existing sliceId, ontology fieldRefs and
localized intent. Select only listed ontology fields. Command input sources are limited to
pageContext, selection (with an existing sliceId), userDecision or actorSession. Do not create
routes, APIs, queries, database instructions, actors, authorities or new scenarios. Honor the
provided E3 disclosure limits.
