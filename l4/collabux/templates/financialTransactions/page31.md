# financialTransactions — experience `cashflowReview` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields, filters — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A **bank-statement reading**: entries grouped by day or period, each group closed by its
subtotal, the whole page read top to bottom like an extrato — money as a story of what
came in and went out, not a grid to be worked. The person here is reviewing and
understanding, not settling; actions exist but stay secondary. Where `ledgerTable` is a
workbench of filters, selection and batch settlement, this page is a calm reading of the
flow. Target: "where did the money go this week?" answered by scrolling once, without
touching a single control.

## How to instantiate from the defs (the slots)

- **Groups come from the entry dates**: one group per day (or per period the contract's
  query declares), newest first or oldest first per the contract's ordering — consistent
  all the way down. The group header is the date in plain words plus that group's
  subtotal, right-aligned, tabular, with currency.
- **Entries inside a group are simple lines**, not table rows: identity/description
  leading, category or counterpart muted beside it when declared, amount at the line's
  end — in and out distinguished by the contract's semantic and by sign, never by color
  alone.
- **The period's summary sits at the top**: total in, total out, resulting balance for
  the range in view — computed from contract data, a quiet line of value+label pairs, not
  tiles, not charts.
- **The period selector is the one prominent control**, top of the page, only if the
  contract declares such an input. Other declared filters stay in one quiet secondary
  row.
- **Actions are per entry and secondary**: declared commands (pay, cancel) live behind
  one quiet control at the end of the line — never a checkbox column, never a batch bar.
  The entry's identity may link to its detail.
- **Session/context inputs never render as fields**; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The period summary — in, out, balance, one glance.
2. Group headers with subtotals — the skeleton of the story.
3. The entry lines — the detail, read in order.
4. Filters and per-entry actions, demoted.

## Loops

- Pick a period → read the summary → scroll the groups top to bottom → a subtotal looks
  off → read that group's lines → drill into one entry if needed → come back; the page is
  exactly where it was.
- Comparing loop: switch the period and read the same shape again — group anatomy and
  summary position never change between periods; the reader learns the page by position.
- A day with no entries appears as its header with a quiet "no movement" line only when
  the contract's data includes it; the page never fabricates empty days.

## Feedback & feedforward

- Loading: summary first as skeleton, then groups in reading order — the shape before
  the numbers; unavailable values show an em dash, never a fake zero.
- A group or the summary that fails to load reports inside its own region, in normal
  body color, with retry — the groups already rendered stay.
- A per-entry action that moves money confirms once, plainly, restating the entry and its
  amount; while it runs only that line locks. Success is the line's own status change —
  no page banner.
- Alarm color only on facts the contract flags (overdue, bounced) — a statement that is
  all red tells no story.

## Disciplines (transversal — always)

- The page name appears once, in the header; group headers are dates, never the page
  title, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the identity link navigates, the quiet
  end-of-line control acts.
- Link color only on real links; subtotals and captions are muted; amounts everywhere in
  tabular figures with currency, right-aligned at one consistent edge.
- Subtotals must visibly reconcile with the summary — same currency treatment, same
  species of number.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A dense filter-and-select table with pinned totals and batch reconcile/pay — that is
  the `ledgerTable` experience, not this one.
- Checkbox columns, selection counts, select-all, or any bulk action bar.
- Breaking the grouping (a flat ungrouped list) or mixing group granularities in one
  reading.
- Charts replacing the groups; sparklines or graphs the contract's data does not back.
- Typed ids for entries, accounts, or anything the defs marks as
  selection/session/context.
- Page-level toasts carrying validation; redirects after an action; inventing subtotals,
  balances or periods the contract does not declare.
