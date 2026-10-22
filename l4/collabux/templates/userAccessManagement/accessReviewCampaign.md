# userAccessManagement — experience `accessReviewCampaign`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (corridor dialect — one pass, then a review)

A **recertification pass**: the reviewer walks through the people in scope one at a time and,
for each grant they hold, says keep or revoke — then reviews the tally and commits. The
question is "is everyone's access still justified, and how far through am I?". Where
`memberDirectory` administers any person on demand and `roleMatrix` designs the access model
itself, this page does neither: it audits the existing grants, person after person, until the
list is exhausted. Nobody is skipped silently and nothing is revoked without being seen.
Target: every grant in scope carries an explicit verdict, and the revocations are committed as
one deliberate act.

## How to instantiate from the defs (the slots)

- **The corridor is the users query**, in its declared order (or by name when none),
  narrowed by the declared scope inputs (team, role, status) chosen once at the start. Each
  person becomes one stop.
- **A stop shows the person and their grants**: identity (name, the declared identifier),
  access status and, when declared, last activity or since-when as facts — then each role or
  permission they hold as one line with two verdicts, Keep and Revoke. Only grants the
  contract returns; never invented ones.
- **Verdicts are page state until commit**: choosing Keep or Revoke marks the line; nothing is
  sent yet. "Keep all" for the person is one quiet control, never preselected.
- **Progress is counted in people**: "Person 12 of 40", plus the verdict tally so far
  ("3 revocations"). A person is done when every grant has a verdict.
- **Commit** uses the declared commands that remove a role or disable access, applied to the
  Revoke verdicts only. If the contract declares a review/attest command, Keep verdicts are
  recorded through it; otherwise Keep sends nothing and the page says so in the review.
- **Session/context inputs never render as fields**: the reviewer is known. Ids are never
  typed — people come in order, grants are lines, verdicts are clicks.

## Attention hierarchy (the spine of this experience)

1. The current person's grants, each awaiting its verdict.
2. The progress — which person of how many, and the tally of revocations.
3. The person's identity and activity facts, to justify the verdict.
4. Previous / next and the scope chosen at the start, demoted.

## Loops

- Verdict loop: read the person → set Keep or Revoke on each grant → "Next person" enables
  only when every grant has a verdict → the next person arrives, scrolled to the top.
- Back loop: "Previous person" returns with the verdicts still marked; changing one is a
  click.
- Review: after the last person, a summary lists every Revoke verdict grouped by person,
  each removable from the list, with the count and one commit ("Revoke 5 grants for 3
  people"). Back from the review returns to the last person.
- After commit, each line reports its own result; failed lines stay listed with retry.

## Feedback & feedforward

- The Next control states what is missing ("2 grants without a verdict") instead of failing
  silently; the missing lines are marked.
- A Revoke verdict on the reviewer's own access shows a self-lockout warning on that line.
- The commit confirms once, restating the count of people and grants affected; danger style
  lives on that one commit, nowhere else.
- While committing, the review locks and shows per-line progress; partial failure never hides
  the successes.
- An empty scope says so in words naming the scope, with the way back to change it.

## Disciplines (transversal — always)

- The page name appears once, in the header; the stop's heading is the person's name, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: Previous / Next move through people,
  verdicts mark state, commit acts; no verdict commits by itself.
- Keep and Revoke are a two-way choice with one consistent shape on every line, readable as
  text, never color alone.
- Link color only on real links; facts and tallies are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the corridor loads people as it goes.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: one person at a time, a verdict on every grant, progress counted in
people, the review before one commit, and the disciplines. A phone fits the corridor naturally;
only the verdict pairs and the navigation move to fit the thumb. Where this section and the layout
described above differ, this section wins on mobile.

- **Progress on top**: "Person 12 of 40 · 3 revocations" on one line, then the person's name and
  facts, wrapping.
- **Each grant is a block**: the role or permission in words on its own line, then Keep and Revoke
  as two full-width halves of one segmented control under it.
- **Previous and Next sit at the bottom**, where the thumb reaches; Next names what is missing
  while disabled.
- **The review is a view of its own**: revocations grouped by person, one per row, the commit at the
  bottom with its count.
- **Keep all** stays a quiet text control above the grants.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the current person's grants and their verdicts, 2. the progress
line, 3. Previous / Next at the bottom.

Forbidden on mobile:
- swipe as the only way to give a verdict;
- a table of people × grants, or any horizontal scroll;
- committing from a person's stop without the review;
- losing marked verdicts when going back.

## Forbidden

- A searchable directory with a person panel as the structure — that is `memberDirectory`;
  here people come in order and none is opened on demand.
- A role × permission matrix — that is `roleMatrix`; this page audits grants, it does not
  design roles.
- Verdicts that commit one by one, or revocations applied without the review.
- Preselected verdicts, or a "Keep all for everyone" control.
- Adding grants or inviting people during a review.
- Page-level toasts carrying validation; inventing grants, activity facts or review commands
  the contract does not declare.

## Signals (how to check the generated page)

1. **S1 one person:** a single person's grants are shown at a time, with Previous / Next.
2. **S2 two verdicts per grant:** every grant line carries a Keep and a Revoke choice.
3. **S3 progress:** a visible "N of M" counter for people in scope.
4. **S4 review before commit:** revocations are committed from a summary view listing them,
   never directly from a verdict.
