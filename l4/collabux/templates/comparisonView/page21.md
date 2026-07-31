# comparisonView — experience `sideBySideColumns` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A comparison table turned on its side: the items under comparison — quotes, products,
versions, candidates — stand as columns, and every attribute is a row cutting across all
of them, perfectly aligned so the eye reads differences horizontally. Everything is on
stage at once; the user adds or removes items, collapses what is identical, and chooses
directly at the top of the winning column. Where `championChallenger` interrogates one
challenger at a time against a fixed reference, this lays the whole field out and lets
the eye referee.

## How to instantiate from the defs (the slots)

- **Items become columns**, chosen through a picker fed by the contract's selection input
  — never typed ids. Each column header carries the item's identity (name plus the one
  subtitle fact the contract provides) and the column's own choose action.
- **Attributes become rows**, one per compared field, in the contract's declared order;
  the row label sits once at the left, never repeated per column. Values align by row —
  numbers right-aligned and tabular, with their units as the contract declares them.
- **Differences are highlighted, sameness is folded**: a row where values differ gets
  visual weight on the differing values (weight and emphasis, not alarm color — alarm is
  reserved for values the contract itself flags as bad). Rows where all columns agree
  collapse into one quiet expander ("11 identical attributes") that opens on demand.
- **The choose command lives in each column header**, labeled with the outcome and the
  item ("Choose ACME quote", never "Select"); removing a column is a quiet secondary on
  the header. Merge, when the contract declares it, is one action above the table acting
  on the current set.
- **Session/context inputs never render as fields**; nothing on this page is typed except
  through the contract's own inputs.

## Attention hierarchy (the spine of this experience)

1. Column headers — who is competing, and the way to pick a winner.
2. Differing rows — the substance of the decision.
3. The folded identical rows — proof of fairness, out of the way.
4. The item picker — quiet, at the top edge.

## Loops

- Add an item → a column joins and every row realigns; remove one → the table closes the
  gap. The row set is the union of the contract's compared fields — a value an item lacks
  shows an em dash, never a fake zero or an invented value.
- Scan differing rows → expand the identical fold to double-check → choose in a header.
- With fewer than two items chosen, the page says once, quietly, that comparison starts
  at two — it never fabricates a placeholder column.

## Feedback & feedforward

- Choose stays disabled until the choice is actionable, and its label names the outcome.
- A choose or merge that fails reports inside the header (or above the table, for merge),
  in normal body color, with retry; the table stays untouched.
- Success is local: the chosen column is marked in place, the others quiet down. No page
  banners, no redirects, no blocking dialogs.
- While a column's data loads, that column skeletons alone; the others stay readable.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (a column header is the item's name, never "Choose").
- A control is navigation OR action, never both: headers act, an item's identity may link
  to its record — as its own distinct control.
- Link color only on real links; row labels, dashes and the folded expander are muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A fixed reference with one challenger swapped in and out, showing only differences —
  that is the `championChallenger` experience, not this one.
- Hiding identical rows entirely (they fold, they never vanish) or hiding a difference.
- Alarm color as difference highlighting — different is not wrong.
- Repeating the attribute label inside every column; unaligned rows; per-column ordering
  of attributes.
- Typed ids for items; inventing attributes, scores or rankings the contract does not
  declare.
- Choosing anywhere but on the column itself (no detached "pick a winner" form).
