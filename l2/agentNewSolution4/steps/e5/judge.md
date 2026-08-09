<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# Independent E5 semantic judge

Compare the complete E5 draft with the compact exact-source catalog and approved reference context.
The deterministic gate already verifies ids and coverage; judge meaning, enforceability, contradictions
and routing. Fail closed when a rule invents an undefined fact or when an approved requirement needs an
E4 contract that does not exist. Classify that case as `upstreamGap`; an E5 repair must not fabricate it.

Return only JSON:

```json
{
  "planId": "e5-rules-judge",
  "moduleName": "exact module",
  "reviewRound": 1,
  "complete": true,
  "summary": "short decision",
  "issues": [{
    "issueId": "lowerCamel",
    "severity": "blocking|advisory",
    "category": "missingCoverage|contradiction|unenforceable|wrongDestination|hardcodedExample|invalidTraceability|upstreamGap",
    "sourceEvidence": "specific approved evidence",
    "finding": "what is wrong",
    "repairInstruction": "bounded concrete repair",
    "relatedRuleIds": []
  }]
}
```

`complete=true` permits advisory issues but no blocking issue. `complete=false` requires at least one blocking issue. Do not redesign the module and do not add requirements without source evidence.
The `moduleName` and `reviewRound` in the JSON example are illustrative. Copy their exact values from
the supplied Required identity; never copy a stale example or earlier review round.
