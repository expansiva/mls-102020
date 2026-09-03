# aiAssistedAuthoring — experience `generateReviewShare` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, inputs, artifacts — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

A guided passage from intent to published artifact: **configure → generate → review →
publish**, in that order, each act earning the next. The machine drafts; the human judges.
The page's promise is that nothing leaves it unreviewed — publishing is the LAST thing,
reachable only through the review. Where `draftCanvas` is a desk where the human writes
and the AI assists at the side, this is a corridor the artifact travels through, with the
human as the gatekeeper at its end.

## The acts

- **Act 1 — Configure.** The generate command's inputs become a compact configuration
  panel: period, target, options — selection inputs as pickers, ids never typed.
  Session/context inputs never render as fields; show them, if useful, as a quiet
  caption ("Reporting as Maria · Q3"). The single generate button names the outcome
  ("Generate status report") and stays disabled until the configuration is valid.
- **Act 2 — Generate.** The button shows a running state; the preview region shows an
  honest in-progress state, never fake content. The configuration stays visible and
  locked while running. If the contract declares a cancel, it is one quiet control.
- **Act 3 — Review.** The generated artifact renders as a readable preview at center
  stage. Beside it, the AI's findings from the contract — risks, suggestions, notes —
  as a quiet side rail, each pointing in plain words at what it concerns. Regenerate
  (when declared) lives with the configuration: change an input, generate again, the new
  draft replaces the old with one plain confirm if the old one was unshared.
- **Act 4 — Publish.** The publish/share command is ONE contextual button that appears
  with the reviewed artifact, label naming the outcome ("Publish to client portal").
  Its confirmation states, in plain words, what goes where and to whom — exactly as the
  contract declares. After it, the act closes: a quiet confirmation of what was
  published and when, with regeneration still possible for a new version.

## How to instantiate from the defs (the slots)

- The artifact preview renders ONLY what the generate command returned — never invented
  sections, scores or summaries. The side rail renders ONLY findings the contract
  returns; no findings returned means no rail, silently.
- Publish/share options (audience, channel) come from the publish command's inputs, as
  pickers, asked at publish time — not before there is something to publish.
- Acts advance forward on success; the user can always return to configuration. The
  page never advances on its own past the review.

## Feedback & feedforward

- Configuration validation is field-level, at the field — never a toast.
- Generation failure renders inside the preview region, in normal body color, with
  retry; the configuration is never lost.
- Publish failure renders beside the publish button with retry; the artifact stays.
- Success is local: the published state replaces the publish button in place. No
  page-level banners, no redirects.
- Every act's primary button is disabled until its act is ready, and its label names
  the act's outcome — "Generate", never "Next"; "Publish", never "Finish".

## Disciplines (transversal — always)

- The page name appears once, in the header. Act regions carry short business titles,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: generate generates, publish publishes,
  and neither ever navigates.
- Link color only on real links; the rail's findings and captions are muted, not blue.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- An editable artifact canvas with per-suggestion accept/discard controls — that is the
  `draftCanvas` experience, not this one; here the artifact is reviewed, not edited in
  place.
- Publishing reachable before a generated artifact exists and is on screen, or any
  auto-publish on generation success.
- Invented AI findings, scores or confidence values the contract does not return.
- A fake progress narrative during generation (fabricated steps, percentages the
  contract does not report) — a running state must be honest.
- Typed ids for anything the defs marks as selection/session/context.
- Blocking success dialogs, page-level toasts carrying validation, redirects after
  publish.
