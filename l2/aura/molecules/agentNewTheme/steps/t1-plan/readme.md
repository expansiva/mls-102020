# t1-plan

The cheap planning call — it is the ROOT's own message call (`agentNewTheme.ts`), not a
separate step agent: the root creates the task with `prompt.md` as its system prompt and
handles the answer in `afterPromptStep`. This folder owns the prompt and the gate.

Input: `{ prompt }` (the user's free style description; may be empty).
Output: `l4/agentNewTheme/plan.json` (`validInput`, `userLanguage`, `title`, `known`,
`questions`) + the planted step tree.
Admission (the project must NOT already have `l2/skills/theme.ts`) is checked earlier, in
`beforePromptImplicit`, so an existing theme costs no LLM call.

The split that matters: `known` carries ONLY what the prompt STATES. Anything the model
concluded on its own becomes a question with the conclusion pre-selected, so the human sees
it. "tema brutalismo" states nothing about the name — and a plan that treated that inference
as fact is how a theme shipped as `brutalismo`, with every molecule suffixed `-brutalismo`,
without the user ever being asked.

Gate (`gate.ts`, pure): tolerant normalization of the payload (`flexible` envelope, raw
JSON, malformed questions dropped, capped at 14) + validation — questions must target
canonical fields, never repeat, and a question about a value already in `known` must carry
it as a recommended option (`question_not_preselected`); CLOSED fields offer ≥ 2 options with
enum-valid ids and at most one `recommended`; OPEN fields may have none, but then `allowNotes`.
NO retry: a failure is readable and immediate.

Empty `questions` = fast path: `t2-clarify` is not planted at all and `t3-generate` runs
first. That happens only when the prompt states everything.

Known LLM traps: passing an inference off as `known` (that is what the pre-selection rule
guards); using localized labels as option `id`s (the id must be the enum value); asking about
surface/text colors (they are derived from `background.kind`); proposing a long `name` — it
becomes the suffix of every molecule (`ml-button-standard-<name>`), so the human form belongs
in `displayName`.
