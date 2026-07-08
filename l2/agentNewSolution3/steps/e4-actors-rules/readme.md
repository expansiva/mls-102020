# E4 — Actors, rules and external refs (agentNs3ActorsRules)

Single LLM call (`planId: e4-actors-rules-refs`, tool `submitNs3ActorsRules`) that consolidates,
from the frozen E2/E3 artifacts:

1. **Actor roster** — every E2 actor (extra supporting actors allowed), with title/description in
   the user's language. `roleScope` (`{module}:{actorId}`) is attached deterministically in
   `prepareE4Artifact`, never produced by the LLM.
2. **Consolidated rule set** — the per-journey `businessRules` from E2 are the PRIMARY source: each
   journey rule is absorbed by exactly one consolidated rule via `sourceJourneyRules` (verbatim
   string copies). Each rule declares `appliesTo` (E3 entity ids) and `layer`
   (`domain | application`).
3. **External refs** — `mdm` / `horizontals` / `plugins` / `agents` `{title, reason}` lists
   (all may be empty). E7 copies this block into `module.defs.ts` `approvedArtifacts`.

Inputs (disk only): `pipeline/e2-journeys.json` (actors, journeys[].businessRules, features) and
`pipeline/e3-model.json` (entities/relationships). Module resolution: `args.moduleName`, else the
first module whose pipeline has `e3-ontology` approved and E4 not approved.

Outputs on a green gate: `l4/actors/{module}Actors.defs.ts`, `l4/rules/{module}Rules.defs.ts`
(written even when the rule set is empty), `pipeline/e4-actors-rules.json` (full artifact incl.
externalRefs + sourceJourneyRules), `pipeline/e4-actors-rules.md`, pipeline approval (`auto`) and
the completed `e4-done` anchor that unlocks E5. The actors/rules defs are contract/documentation
artifacts (not machine-read by Stage 2/3).

Gate (`gate.ts` + `schemas/e4-actors-rules.schema.json`): schema (ids, description >= 20 chars,
appliesTo minItems 1, layer enum) + invariants — every E2 actor present (`actor.missing`), unique
actor/rule ids, `roleScope` format, `appliesTo` resolves to E3 entities
(`rule.appliesTo.unknown`), `sourceJourneyRules` match E2 strings exactly after trim
(`rule.sourceRule.unknown`), unabsorbed journey rules warn (`journeyRule.unmapped`). 1 retry with
the gate error in context; artifact JSON and trace are written on failure too.
