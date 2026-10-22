# processWizard — experience `oneQuestionFlow`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, steps, fields, validations — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (conversation dialect — one question at a time)

The process as **a conversation that asks one thing at a time**: a single question in plain,
friendly words, one answer control, and every answer given so far kept above as a transcript
of question-and-answer pairs. At the end the transcript is read back as a short summary and
committed with one button. This is the shape for processes run rarely or by people who are
not experts in the form — a self-service request, a first setup — where a wall of fields
intimidates and one question invites. Where `linearStepper` groups fields into numbered
step screens and `growingDocument` collapses whole acts into recaps, this answers "what is
the ONE thing I need to tell the system right now?" — the unit is the field, not the stage.
Target: the user never sees more than one decision at once and never loses what they said.

## How to instantiate from the defs (the slots)

- **Each question comes from one required or optional field of the contract's inputs**, in
  declared order (stages, when declared, only order the questions; they never become
  screens). The question is the field's label turned into a short plain question
  ("When does this start?"), never the raw label with a colon.
- **The answer control follows the field type**: a picker for selections (never a typed id),
  choice buttons for small enumerations, the native date picker, a numeric input for numbers.
  Choosing a choice button answers and advances; typed answers advance with one "Continue".
- **Optional fields are asked with a visible "Skip"**; required ones have none. A skipped
  answer appears in the transcript as "Skipped" in muted text.
- **Session/context values are never asked** — at most one quiet line at the top ("For Maria
  · Unit 3"). Fields whose value already arrived with the page are not asked; they appear in
  the transcript as already answered, with "change".
- **Branching only when the contract declares it** (a field relevant only for a given value);
  never invent conditional questions.
- **The final turn is the summary**: the transcript condensed into plain sentences and one
  commit button naming the outcome ("Send the request"). Only this button commits.

## Attention hierarchy (the spine of this experience)

1. The current question and its answer control — the largest thing on the page.
2. The answer action (Continue, a choice, or Skip).
3. The last answered pair right above, as context.
4. The earlier transcript, quieter, one scroll away.

## Loops

- Read the question → answer → the pair joins the transcript → the next question appears
  below it, focused. One question on stage, always.
- Change an earlier answer from its "change" link: that question returns to the stage; answers
  after it are kept unless the contract makes them depend on it, in which case they are asked
  again after one plain notice.
- Last answer → summary → commit → the conversation closes with one calm sentence of what was
  done and the single next destination if the contract declares one.

## Feedback & feedforward

- Validation speaks right under the answer control, in words, before the question is left;
  Continue stays disabled until the answer is valid.
- A quiet count ("A few more questions" or "4 of 9") is allowed, never a stepped rail.
- Commit failure lands in the summary, above the commit button, with retry; every answer kept.
- Abandoning with answers given asks one plain confirm — never silent loss.

## Disciplines (transversal — always)

- The page name appears once, in the header; questions are not headings, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: Continue and choices answer, "change"
  reopens, only the summary's button commits.
- Link color only on real links ("change"); the transcript is muted, quieter than the question.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as questions or fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label — if a region has no business name, it has no
  heading.
- The tone is conversational but plain: no fake typing indicators, no avatar, no chatbot name.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: one question on stage, the transcript above, skip only for optional
fields, the summary before the commit, feedback and disciplines. A single question per turn is
already at home on a phone; only the answer control's placement changes, so it rides with the
keyboard and the thumb. Where this section and the layout described above differ, this section
wins on mobile.

- **The question sits near the top of the view**, the last answered pair just above it;
  earlier pairs scroll up and stay reachable.
- **The answer control is full width**; choice buttons stack one per line; numbers, dates,
  email and phone raise their matching keyboards.
- **Continue (and Skip, when optional) sit in a bar at the bottom** that rides above the
  on-screen keyboard, Continue on the thumb side.
- **Each transcript pair is one row**: the short question muted, the answer in plain words,
  "change" at the right; long answers wrap, never cut.
- **The summary is one column of sentences**; the commit button with its full label takes
  Continue's place in the bottom bar.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the current question and its control, 2. Continue, 3. the last
answered pair.

Forbidden on mobile:
- several questions on one screen, or fields side by side;
- a Continue hidden behind the on-screen keyboard;
- chat bubbles squeezed into narrow columns, or anything that scrolls sideways;
- truncated answers in the transcript or the summary.

## Forbidden

- Step screens grouping several fields under a numbered rail — that is `linearStepper`.
- Whole acts collapsing into recaps with the next act revealed below — that is
  `growingDocument`; here every field is its own turn.
- More than one unanswered question on screen; a form of fields at any point.
- Free-text chat input interpreted by the page, invented questions, branches or defaults.
- Committing before the summary, or an answer that persists anything by itself (unless the
  contract declares per-step commands).
- Typed ids or asking for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 One question:** at any moment exactly one unanswered question with one answer control is
   on screen; there is no multi-field form.
2. **S2 Transcript:** each answered question remains visible above as a question-and-answer pair
   with a "change" link.
3. **S3 Plain questions:** the prompt is phrased as a question in words, not a bare field label.
4. **S4 Summary then commit:** after the last question a summary of the answers appears with the
   only commit button, labeled with the outcome.
