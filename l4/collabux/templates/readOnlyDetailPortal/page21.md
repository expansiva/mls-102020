# readOnlyDetailPortal — experience `summaryFirstStatement` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, fields, values — never contradict it); this skill is the flavor:
> how the page prioritizes, reads and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A stakeholder — often external, often in a hurry — opens this page to answer ONE
question: how much, what status, am I fine. The page answers **before they read
anything else**: the decisive number or status is GIANT at the top, the breakdown that
justifies it sits below, notes and fine print come last. Zero write actions — this is a
statement, not a workspace. Where `printableDocument` is a formal sheet whose layout IS
the deliverable, this is a screen built around one headline answer.

## How to instantiate from the defs (the slots)

- **The headline comes from the contract's primary value**: the main total, balance or
  status of the record. Render it as the largest thing on the page, with its unit or
  currency as the contract declares it, and one short muted label naming what it is
  ("Total due" / "Order status"). One headline — if the contract offers several values,
  the primary one is the headline and the others wait below; never a row of competing
  heroes.
- **The breakdown comes from the record's line items or component values**: a quiet
  tabulated section, numbers right-aligned and tabular, ordered as the contract orders
  them. It exists to justify the headline, not to compete with it.
- **Reference facts** (dates, parties, identifiers) form a compact muted block between
  headline and breakdown — small, scannable, never editable.
- **Notes and free text last**, visually quiet.
- **The only actions are the ones the contract declares** (acknowledge, print): a single
  contextual control whose label names the outcome ("Confirm receipt"). No command in
  the contract means NO buttons at all — and that is correct, not a gap.
- Never invent totals, comparisons, charts or statuses the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The headline — the answer, readable from across the room.
2. Reference facts — is this mine, which period, who issued it.
3. The breakdown — why the headline is what it is.
4. Notes and fine print.

## Loops

- Open → read the headline → maybe scan the breakdown → leave. The page succeeds when
  it is closed in seconds, satisfied.
- If the contract declares an acknowledge command, its consequence appears in place:
  the control is replaced by a quiet confirmation with the moment it happened.

## Feedback & feedforward

- Loading: the headline's skeleton first — the page's shape promises the answer before
  the numbers arrive.
- A region that fails to load reports inside its own region, in normal body color, with
  retry; the rest of the page stays.
- The acknowledge control (when declared) stays disabled until the data it confirms has
  loaded; while running it shows a running state; failure renders beside it with retry.
- Success is local and permanent-looking — no banners, no redirects.
- Alarm color only if the contract flags a true problem (overdue, rejected) — and only
  on the flagged value, never on the frame.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both; on this page almost nothing is either —
  passive text is muted, and link color appears on nothing that is not clickable.
- Every number carries its unit or currency as the contract declares it — a bare number
  is a guess.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A formal document sheet — parties' letterhead, tabulated document body, attribution
  footer — as the page's shape: that is the `printableDocument` experience, not this one.
- Any write affordance: edit icons, editable-looking fields, forms, or actions beyond
  the contract's declared commands.
- Charts, trends, KPIs or comparisons the contract does not declare.
- Burying the headline below a hero image, banner, or reference block.
- Tables with filters, sorting or pagination — the breakdown is a statement, not a grid.
- Steps, tabs, or any act-like progression — this page is one glance deep.
