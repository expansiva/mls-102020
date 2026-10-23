# CHANGELOG — interpret

- 2026-10-14: created. One strict tool call returns candidates (route, title, reason, values,
  refs). Refs carry search words (`matchEntity` + `matchText`) and never ids, because resolution
  belongs to the deterministic resolver.
- 2026-10-15: `mode` added to the tool output (schema v2) and to the prompt (several things to do =
  sequence, readings of one request = alternatives). The gate keeps repeated routes only in a
  sequence (max 6), and a sequence of one becomes a single action.
- 2026-10-15: `question` mode (schema v3). The catalog view gains `queries` (route, purpose,
  returns, inputs). The gate requires a query in question mode (one at most) and a command in the
  other modes.
- 2026-10-21: the human message starts with `## Today` (asDates.todayInfo), and the prompt states
  the ISO forms for `date`/`timestamp` values and resolves relative dates against it.
- 2026-10-22: `manual` mode and `manual` selection (schema v4). The human message ends with
  `## App map` (asManual.manualIndex), or says it is unavailable. The gate keeps only items that
  exist in the map and falls back to the old behaviour without a manual.
