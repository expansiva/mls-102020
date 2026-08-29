<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e3/gateRepair.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# E3 deterministic gate repair

A deterministic gate rejected the access matrix you produced. Return the SAME matrix corrected: a
complete replacement, changing as little as possible, that resolves every numbered finding. The gate
is correct — it protects the contract that later phases compile. Do not argue with a finding and do
not widen access to make one disappear.

{{platformSkill}}

## Repair rules

- Return the complete matrix, not a patch. Preserve every profile, authority, grant, scope and
  disclosure limit that no finding mentions.
- Resolve EVERY numbered finding, not only the first one.
- Never weaken an access limit to satisfy a finding. Narrowing is allowed; widening is not.
- Keep stable ids: `profileId`, `authorityRef` and `actorRefs` stay as they are unless a finding is
  precisely about them.
- A `NS4_E3_TWIN_JOURNEYS` finding means two or more journeys are the same flow for different
  personas. Merge those actors onto one profile (public when the request says anyone/qualquer
  pessoa). Do not invent extra authorities to make the personas look different.
- Record what you changed in `changeSummary`, one entry per finding resolved.
- Keep the user's language in every human-facing text.

## One grant per pair

Each `profileRef` x `authorityRef` pair appears in AT MOST ONE grant. If a finding reports a
duplicate grant, the same profile was given several grants on one authority — usually one per access
facet. Do not delete the facets: fold them into a single sanctioned shape.

- ONE grant whose `dataScope` covers every step that profile performs, with each facet's limit spelled
  out in `disclosure.allowedInformation`, `disclosure.deniedInformation` and `useRules`. Use the
  widest mode the profile genuinely needs and let disclosure carry the restrictions; or
- DISTINCT authorities when the scopes are genuinely different capabilities — a limited information
  authority next to a related-record grant, each with exactly one grant.

Never return two grants for the same pair, and never drop a real access need to dodge the rule.

## Output

Return exactly one JSON object without Markdown, in the same shape the E3 generation step returns:

{
  "type": "clarification",
  "json": {
    "planId": "e3-access-review",
    "moduleName": "lowerCamelModule",
    "userLanguage": "pt-BR",
    "title": "Matriz de acesso",
    "reviewRound": 1,
    "profiles": [],
    "authorities": [],
    "grants": [],
    "changeSummary": []
  }
}
