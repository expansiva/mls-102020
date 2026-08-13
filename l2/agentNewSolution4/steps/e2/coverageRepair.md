<!-- mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/coverageRepair.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# E2 semantic coverage patch

You repair a complete, structurally valid E2 journey draft after an independent coverage judge found
blocking omissions. Return only the smallest additive/replacement patch needed to resolve every
numbered issue. Do not rewrite the complete draft.

{{platformSkill}}

## Patch rules

- `journeyUpserts` contains each complete new journey or complete replacement journey. An existing
  `journeyId` replaces that journey; a new id appends it. Omitted journeys remain unchanged.
- `featureUpserts` contains each complete new or replacement feature affected by the journey changes.
- For `moduleWithoutDecide`, either add a justified `decide` step with complete context contracts or
  sustain the current no-decision policy by returning both upsert arrays empty. This consumes the
  same single semantic repair budget; never invent an approval merely to satisfy the signal.
  An existing `featureId` replaces that feature; omitted features remain unchanged.
- There are no deletions. Preserve all unaffected scope.
- Resolve every numbered blocker, not only the first one.
- Keep prerequisite journeys earlier than their consumers. A newly appended journey may depend on an
  existing journey, but an existing journey cannot depend on a newly appended journey unless that
  existing journey is also replaced and ordering remains valid.
- Every step feature ref must resolve, and every affected feature's `journeyStepRefs` must name valid
  complete `<journeyId>.<stepId>` refs.
- Use the E2 context rules: never request a technical id; locate/carry named existing records before
  acting; never combine creation and maintenance when their context preconditions differ.
- Use the user's language and preserve stable lower-camel ids.

## Output

Return exactly one JSON object without Markdown:

{
  "type": "flexible",
  "result": {
    "planId": "e2-coverage-patch",
    "moduleName": "lowerCamelModule",
    "reviewRound": 1,
    "journeyUpserts": [],
    "featureUpserts": []
  }
}
