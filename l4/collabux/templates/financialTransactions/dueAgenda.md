# financialTransactions — experience `dueAgenda`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Money as an agenda of what is coming due: open entries fall into **fixed urgency buckets —
Overdue, Today, This week, Later** — each a section with its count and its sum, read top to
bottom from the most urgent. Each entry offers its **one natural action inline** (pay,
receive, reschedule), done on the row without leaving the agenda, and settled entries leave
the agenda at once. Where `ledgerTable` is a filter-and-select bench for settling many
entries by selection, and `cashflowReview` reads money already moved, grouped by day, as a
statement, here the question is forward-looking: **"what must I settle now, and what is
coming?"** The calendar, not the filter, organizes the page. Target: open the page in the
morning, clear Overdue and Today one row at a time, and know the week's total due.

## How to instantiate from the defs (the slots)

- **The agenda is the entries query, restricted to open entries** when the contract declares
  a status filter (open, pending, unpaid); settled ones are not on the page.
- **Buckets come from the entry's due date**, against today: Overdue (before today), Today,
  This week (until the end of the current week), Later. Each bucket header shows its business
  label, the count, and the **sum of the entries' amounts** (the contract's measure) right-
  aligned, tabular, with currency. Buckets keep this order always; an empty bucket shows its
  header with a quiet "nothing due" line, never disappears.
- **Degrade**: with no due-date field, the entry's declared date drives the buckets and the
  first is labeled "Earlier", never "Overdue" — the page claims lateness only when the
  contract carries a due date. With paging, Later loads more at its foot; the totals of a
  bucket come from the contract's totals when declared, else they cover the loaded rows and
  say so ("first 50").
- **Rows inside a bucket** are lines: identity (description, counterparty) leading, the due
  date in short words ("3 days late", "Thu 24"), status small, the amount at the end.
- **The inline action** is the contract's settlement command (pay or receive, by the entry's
  type): one outcome-named button on the row; tapping it expands the row in place with the
  command's declared inputs (date prefilled with today when declared, method, account) and a
  confirm naming the amount. A reschedule command, when declared, sits beside it, quieter,
  with only the new date. Other commands (cancel) live in the entry's detail, never on the row.
- Declared filters (account, type, counterparty) form one quiet control above the agenda;
  the buckets recompute under it. Session/context inputs never render as fields; ids are
  never typed — the row IS the id.

## Attention hierarchy (the spine of this experience)

1. The Overdue bucket and its sum — what is already late.
2. Today's bucket — what must be settled now.
3. The inline action on the row in focus.
4. This week and Later, then filters — the horizon, quieter.

## Loops

- Open → read Overdue's count and sum → act on the first row inline → the row leaves, the
  bucket's count and sum drop → next row → then Today → glance at This week's total → done.
- Rescheduling moves the row to the bucket of its new date, with a brief highlight there;
  both buckets' totals update. Only one row is expanded at a time; opening another closes
  the first, keeping its typed values only until the page is left.

## Feedback & feedforward

- The inline confirm restates the entry and its amount in its label ("Pay R$ 380,00"); money-
  moving actions need no second dialog — the expanded row is the confirmation.
- A failed command keeps the row expanded with the reason above the confirm, values kept,
  retry; other rows and buckets stay usable.
- Bucket totals update with the action, never with a reload; an unknown sum shows an em dash.
- Alarm color only on the Overdue bucket's label and late dates — never on whole rows or on
  every amount.

## Disciplines (transversal — always)

- The page name appears once, in the header; bucket headers are time words, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the identity link opens the detail, the
  row's button opens the inline action, confirm commits.
- Amounts in tabular figures with currency, right-aligned on one edge; sums are the same
  species as the rows.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields; the agenda sorts by due date inside each bucket.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the fixed buckets with count and sum, open entries only, the inline action
on the row. An agenda is already one column; on a phone the point is that the Overdue and Today
sums are read in the first screen. Where this section and the layout described above differ, this
section wins on mobile.

- **Bucket headers keep label, count and sum on one line**, the sum right-aligned; if space runs
  out the label wraps, the sum never does.
- **Rows are two-level lines**: identity on the left, the amount right-aligned; the due words and
  status small under them; the action button full width under the line.
- **The inline action expands in the row**, one field per line, the confirm at the row's bottom.
- **Filters sit behind one control** at the top, opening as a view of its own; back returns to
  the same scroll.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the Overdue and Today headers with their sums, 2. the rows of the
bucket in view, 3. the inline action.

Forbidden on mobile:
- a table or anything that scrolls sideways;
- buckets as tabs or a swipeable strip;
- swipe as the only way to act on a row;
- truncated or currency-less amounts.

## Forbidden

- A dense table with filters, checkbox selection and batch pay — that is the `ledgerTable`
  experience, not this one.
- Groups per day of past movement read as a statement, actions demoted — that is the
  `cashflowReview` experience, not this one.
- A guided multi-scene act for each payment; the action happens on the row.
- Buckets reordered, merged, hidden when empty, or replaced by a calendar grid.
- Settled entries kept in the buckets, or "overdue" claimed without a due date.
- Typed ids for entries, accounts or anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 Fixed buckets:** entries render in sections in the order Overdue (or Earlier), Today,
   This week, Later.
2. **S2 Bucket sums:** each bucket header shows a count and a summed amount with currency.
3. **S3 Inline action:** a row's action opens its inputs inside the row, without leaving the
   agenda or opening another scene.
4. **S4 Settled leaves:** after the action commits, the row leaves its bucket and that bucket's
   count and sum change.
