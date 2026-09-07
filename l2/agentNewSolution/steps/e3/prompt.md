<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e3/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# E3 — human-approved access matrix

Design the permanent business access contract for a generated system. Write human-facing text in the
user's language. Return access intent, not users, JWT implementation, pages, routes, database fields or
APIs. Authentication, JWT issuance and runtime authority assignment belong to collab-auth.

{{platformSkill}}

## Separation of concepts

- E2 actors describe business participation. E3 profiles describe recognizable access archetypes.
- Split composite E2 actors into useful profiles when necessary, while preserving traceability through
  `actorRefs`. One E2 actorRef may be mapped by several profiles.
- Do not mint a profile per demographic persona. A profile exists only when its grants differ in
  permissions (authorities) or data scope from every other profile. `<PersonaA>` and `<PersonaB>`
  (demographic personas doing the same things are one actor) who receive the same authorities and
  the same scope are **one** public (or otherwise shared) profile. A request that says "anyone" /
  "the public" is one external public profile, plus the privileged profiles the request names
  (admin, and so on).
- `authorityRef` is the stable collab-auth JWT authority and MUST use lowercase `domain:code` syntax,
  for example `billing:mrk`. Treat codes as opaque identifiers; explain their meaning in title and
  description.
- A JWT may contain many authorities. Grants are many-to-many between profiles and authorities.
- Authorities protect journey steps or a declared read-only `informationNeeds` capability.

## One grant per pair

Each `profileRef` x `authorityRef` pair appears in AT MOST ONE grant. Never emit two grants for the
same pair. When one profile needs different record scopes for different steps, choose one of two
sanctioned outputs:

- ONE grant whose `dataScope` covers every step that profile performs, with the per-facet limits
  spelled out in `disclosure.allowedInformation`, `disclosure.deniedInformation` and `useRules`; or
- DISTINCT authorities when the scopes are genuinely different capabilities. This is the same split
  already described above for "an external actor may see a published summary but not the whole
  `<Record>`": a limited information authority next to a related-record grant, each with its own
  single grant.

Splitting one pair into a public grant, an own grant and a related grant is not an option: the
contract carries a single scope decision per pair, and downstream phases compile one projection from
it.

## Access and disclosure

- Every grant declares why it exists, its record scope and its disclosure boundary.
- Scope modes: `organization`, `assigned`, `own`, `related`, `public`, `custom`.
- Disclosure modes: `fullRecord`, `summaryOnly`, `fieldsOnly`, `aggregateOnly`.
- External profiles must never receive organization-wide scope.
- `summaryOnly`, `fieldsOnly` and `aggregateOnly` must list `allowedInformation`. Use
  `deniedInformation` to make sensitive exclusions explicit.
- A request such as "an external actor may see a published summary but not the whole `<Record>`"
  becomes a limited information authority and a related-record grant. It must not grant full
  `<Entity>` access. Later phases will compile a backend projection from this approved boundary.
- Frontend hiding is never a security boundary. Describe backend-enforceable intent.

## Coverage

- Cover every E2 actorRef with at least one profile.
- Every internal profile maps to at least one E2 actorRef. An external profile may be introduced for a
  declared information need even when E2 has no dedicated journey.
- Protect every journey step referenced by a `now` feature with at least one authority.
- Every authority is granted to at least one profile, and every profile receives at least one grant.
- `landingIntent` states the useful starting point for that profile without designing a page.

## Adjustment rounds

When a human adjustment and previous draft are supplied, return a complete replacement matrix. Apply
the request without dropping unaffected profiles, authorities, grants, scopes or disclosure limits.
Populate `changeSummary` with the substantive differences in this round. Never weaken existing access
limits unless the human explicitly requested it.

## Output

Examples are placeholders in English; write every human-facing value in the user's language (`userLanguage`).

Return exactly one JSON object without Markdown:

{
  "type": "clarification",
  "json": {
    "planId": "e3-access-review",
    "moduleName": "lowerCamelModule",
    "userLanguage": "<userLanguage>",
    "title": "<localized title>",
    "reviewRound": 1,
    "profiles": [
      {
        "profileId": "<profileId>",
        "title": "<localized title>",
        "kind": "external",
        "description": "<description in the user's language>",
        "actorRefs": [],
        "landingIntent": "<landing intent in the user's language>"
      }
    ],
    "authorities": [
      {
        "authorityRef": "domain:code",
        "title": "<localized title>",
        "description": "<description in the user's language>",
        "journeyStepRefs": [],
        "informationNeeds": ["<information need in the user's language>"]
      }
    ],
    "grants": [
      {
        "profileRef": "<profileId>",
        "authorityRef": "domain:code",
        "reason": "<reason in the user's language>",
        "dataScope": {
          "mode": "related",
          "description": "<scope description in the user's language>"
        },
        "disclosure": {
          "mode": "summaryOnly",
          "description": "<disclosure description in the user's language>",
          "allowedInformation": ["<allowed information in the user's language>"],
          "deniedInformation": ["<denied information in the user's language>"]
        },
        "useRules": ["<ruleId>"]
      }
    ],
    "changeSummary": ["<change summary in the user's language>"]
  }
}
