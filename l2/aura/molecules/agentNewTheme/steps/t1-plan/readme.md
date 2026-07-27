# t1-plan

The cheap planning call — it is the ROOT's own message call (`agentNewTheme.ts`), not a
separate step agent: the root creates the task with `prompt.md` as its system prompt and
handles the answer in `afterPromptStep`. This folder owns the prompt and the gate.

Input: `{ prompt }` (the user's free style description; may be empty).
Output: `l4/agentNewTheme/plan.json` (`validInput`, `userLanguage`, `title`, `known`,
`questions`) + the planted step tree.
Admission (the project must NOT already have `l2/skills/theme.ts`) is checked earlier, in
`beforePromptImplicit`, so an existing theme costs no LLM call.

Gate (`gate.ts`, pure): tolerant normalization of the payload (`flexible` envelope, raw
JSON, malformed questions dropped, capped at 8) + validation — questions must target
canonical fields, never repeat, never re-ask something already in `known`, offer ≥ 2
options with enum-valid ids and at most one `recommended`. NO retry: a failure is readable
and immediate.

Empty `questions` = fast path: `t2-clarify` is not planted at all and `t3-generate` runs
first.

Known LLM traps: guessing a field into `known` to avoid asking; using localized labels as
option `id`s (the id must be the enum value); asking about surface/text colors (they are
derived from `background.kind`).
