# readOnlyDetailPortal — experience `printableDocument` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, fields, values — never contradict it); this skill is the flavor:
> how the page prioritizes, reads and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**The screen IS the document.** This page renders the record as a formal sheet — the kind
that gets printed, attached to an email, filed for an audit: a document header with the
parties' identity, a tabulated body, a footer with attribution. Its authority comes from
looking finished and official, on screen exactly as on paper. Where
`summaryFirstStatement` is built around one giant headline answer, this page is built
around the integrity of the whole sheet: everything present, in order, formally arranged.

## How to instantiate from the defs (the slots)

- **The sheet is one bounded region** — visibly a page within the page, calm margins,
  set at a comfortable reading width. Everything that should print lives inside it;
  screen chrome (the print control) lives outside it and never prints.
- **The document header comes from the identity fields**: issuer on one side, recipient
  on the other, plus the document's own identity — number, date, period — as the
  contract declares them. Formal, compact, no decoration.
- **The body comes from the line items**: a tabulated block with the contract's columns,
  numbers right-aligned and tabular with their units or currency, ordered as the
  contract orders them. Totals close the body, visually heavier than the lines but
  quieter than a headline — the total concludes the document, it does not open it.
- **The footer carries attribution**: who issued it, when, reference identifiers, and
  the contract's fine print or notes. Small, complete, honest.
- **Actions only if the contract declares them**: print as a quiet control outside the
  sheet; acknowledge (if declared) also outside the sheet, labeled with its outcome. No
  declared command means no controls — the sheet alone is the page.
- Never invent seals, signatures, legal text, totals or fields the contract does not
  declare — an official-looking invention is worse than a gap.

## Attention hierarchy (the spine of this experience)

1. The sheet as a whole — instantly recognizable as a document.
2. The document header — whose, which, when.
3. The body, read top to bottom like paper, totals at its foot.
4. The footer — attribution and fine print.

## Loops

- Open → recognize the document → read or print → file or leave. One sheet, one pass,
  top to bottom; the page never rearranges itself.
- Printing must yield the sheet alone: no screen chrome, no controls, nothing cut off —
  the printed page and the screen sheet are the same artifact.

## Feedback & feedforward

- Loading: the sheet's frame first, its content after — the document takes shape before
  its numbers.
- If the record fails to load, the failure renders where the sheet would be, in normal
  body color, with retry — never a half-rendered document that could be mistaken for a
  complete one.
- The acknowledge control (when declared) stays disabled until the sheet has fully
  loaded; failure renders beside it with retry; success replaces it with a quiet
  confirmation and the moment it happened.
- Alarm color only on values the contract flags — and used sparingly: this is a formal
  record, not a dashboard.

## Disciplines (transversal — always)

- The page name appears once, outside the sheet; the sheet carries the document's own
  title, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both — and no control lives inside the sheet.
- Link color appears on nothing inside the sheet; documents do not have hyperlink-blue
  text. Passive text is ink-like or muted.
- Every number carries its unit or currency as the contract declares it.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A giant headline value dominating the top with the breakdown demoted below it — that
  is the `summaryFirstStatement` experience, not this one.
- Any write affordance, editable-looking field, or action the contract does not declare.
- Screen decoration inside the sheet: cards, chips, icons, alarm-colored banners, or
  anything that would look wrong on paper.
- Charts, trends or comparisons the contract does not declare.
- Collapsible sections, tabs, pagination or filters — a document does not fold.
- Invented formality: seals, signature lines, legal boilerplate not in the contract.
