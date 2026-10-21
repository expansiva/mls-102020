# financialTransactions — experience `ledgerTable` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields, filters — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A **working ledger**: one dense table of entries, strong filters to carve it, totals that
never leave the screen, and batch actions (reconcile, pay) driven by selection. This is
the accountant's bench — built for finding, checking and settling specific entries, dozens
at a time. Where `cashflowReview` reads money as a story flowing down the page, this page
treats money as records to be worked. Target: filter to the exact set, verify the total
matches expectation, act on the selection — without losing filters, scroll or selection.

## How to instantiate from the defs (the slots)

- **The table is the entries query**: one row per entry, dense, uniform. Columns from the
  contract's fields — date, identity/description, category or account when declared,
  status chip, and the amount LAST, right-aligned, in tabular figures with its currency.
  Debits and credits distinguished by the contract's own semantic, sign or column — never
  by color alone.
- **Filters come from the declared query inputs** (period, status, account, type): one
  filter bar above the table, applied values visible as removable tokens. Never invent a
  filter the contract does not declare.
- **Totals are anchored and always visible** — count, sum, balance of the CURRENT
  filtered set (and of the selection while one exists), computed from contract data,
  pinned so scrolling the table never hides them.
- **Selection drives batch commands**: checkboxes per row plus select-all-in-filter;
  declared commands (reconcile, pay, cancel, export) appear as actions bound to the
  selection, labeled with outcome and scope ("Pay 3 entries").
- **Session/context inputs never render as fields**; ids are never typed — rows are
  selected, accounts are picked. The entry's identity may link to its detail; that link
  is the only navigation.

## Attention hierarchy (the spine of this experience)

1. Totals of the current set — the number that says "this filter is right".
2. The table rows — the working material.
3. The filter bar — the carving tool.
4. Batch actions — quiet until a selection exists.

## Loops

- Filter → the totals recompute → scan or select rows → act on the selection → affected
  rows update status in place → totals recompute again. Filters, scroll and remaining
  selection survive the action.
- Verify loop: change one filter token at a time and watch the total move — the page must
  make cross-checking against an external figure effortless.
- Export, when declared, acts on the current filtered set and says so.

## Feedback & feedforward

- Batch actions stay disabled until a selection exists; their labels carry the scope so
  the click's consequence is known before the click.
- Destructive or money-moving commands (pay, cancel) confirm once, plainly, restating
  count and total amount — one dialog, never two.
- Failure renders in the table's own region, above the rows, in normal body color, with
  retry; partial failures say exactly which entries did not go through, keeping them
  selected.
- While a batch runs, the affected rows lock and show a running state; the rest of the
  table stays workable. Success is the rows' own status change — no page banner.
- Loading: the table skeleton keeps column widths; totals show an em dash until real —
  a dash is unknown, zero is a claim.

## Disciplines (transversal — always)

- The page name appears once, in the header; the table and totals never repeat it, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the identity link navigates, checkboxes
  select, batch buttons act.
- Link color only on real links; amounts, statuses and captions use muted or semantic
  tones. Alarm color only on facts the contract flags (overdue, insufficient), never on
  every negative amount.
- All amounts share one alignment, one tabular treatment, one currency display; totals
  are visually the same species as the rows they summarize.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the working ledger, the totals that never leave the screen, selection
driving batch commands, feedback and disciplines. Only the shape changes, because a dense table of
many columns cannot fit the width. Where this section and the layout described above differ, this
section wins on mobile.

- **Still a bench, not a story**: the phone still answers "is this filtered set right, and which
  entries do I settle?" — a flat list of entries under anchored totals, never grouped by day.
- **The totals become a bar fixed on screen** (at the bottom): count and sum of the current
  filtered set, in tabular figures with currency. While a selection exists, the bar shows the
  selection's count and total and holds the batch actions ("Pay 3 entries · 1,240.00"). This bar
  is how "totals never leave the screen" holds on a phone.
- **The table becomes a list of rows**, one entry per row: date and counterparty/description on
  the left, the amount right-aligned, tabular, with currency, never truncated; the status chip and
  account small on a second line. Debit and credit stay distinguished by sign or label, never by
  color alone.
- **The filter bar becomes compact**: the applied filters as removable tokens in one line at the
  top, and a "Filters" control with the active count that opens the declared filters as a view of
  its own; back returns to the list at the same place, totals recomputed.
- **Selection is an explicit mode**: one "Select" control turns rows into checkable rows, with
  select-all-in-filter stating how many it selects. Leaving the mode clears the selection;
  filters, scroll and the remaining selection survive a batch action.
- **The entry's identity** still links to its detail as a view of its own; back returns to the
  same filters, scroll and selection.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the totals bar, 2. the entry rows, 3. the filter tokens, 4. the
batch actions in the bar, once a selection exists.

Forbidden on mobile:
- wide tables or any horizontal scroll;
- totals that scroll away with the list, or only shown at its end;
- truncated, left-aligned or currency-less amounts;
- batch actions anywhere but the bar, or acting without a selection.

## Forbidden

- Grouping entries by day/period with subtotal headers as the page's structure — that is
  the `cashflowReview` experience, not this one.
- Totals that scroll away, live in a tooltip, or are computed from anything but the
  contract's data.
- Amounts left-aligned, in proportional figures, or stripped of currency; color as the
  only debit/credit distinction.
- Acting on entries without selection, or a select-all that silently exceeds the visible
  filtered set.
- Typed ids for entries, accounts, or anything the defs marks as
  selection/session/context.
- Page-level toasts carrying validation; redirects after an action; inventing columns,
  filters or aggregates the contract does not declare.
