# analyticalList — experience `kpiFilterTable` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

One filtered set, told twice: a row of KPIs that summarize it and a table that itemizes
it — and the filters rule them BOTH. Change a filter and the numbers above and the rows
below move together, because they are the same truth at two altitudes. This is analysis
that ends in action: the table is not a report, its rows drill down and its selection
acts. Where `chartLedTable` lets a picture drive the questioning, this page trusts the
numbers and the grid — ask with filters, read the summary, act on the rows.

## How to instantiate from the defs (the slots)

- **Filters come only from contract inputs**, one row at the top — the page's steering
  wheel, in one place, never per-section, never per-KPI. Session/context inputs never
  render as fields; ids are never typed (references are pickers).
- **KPIs come from the contract's aggregates**, one tile each: value large and tabular
  with its unit or currency, label small below, comparison only if the contract provides
  it. Same size, one row, never padded with invented metrics — fewer real numbers means
  fewer tiles. Every tile is visibly a summary OF THE FILTERED SET, recomputed on every
  filter change; a KPI that ignores the filters is a lie and must not render.
- **The table is the same filtered set, itemized**: the contract's columns, numbers
  right-aligned and tabular, flags coloring their own cell (an over-budget variance in
  alarm color) — never the row. Sorting and grouping only as the contract declares.
- **Rows act**: each row is a drill-down link to its record, and when the contract
  declares selection commands, rows become selectable with the actions appearing beside
  the selection count ("Approve 3 selected") — disabled until something is selected.
- **Export, when the contract declares it**, is one quiet action near the table,
  exporting exactly the filtered set the user is looking at.

## Attention hierarchy (the spine of this experience)

1. The filter row — the question being asked.
2. The KPI row — the answer, summarized.
3. The table — the evidence, itemized and actionable.
4. Export and secondary tools, quiet at the edge.

## Loops

- Adjust a filter → KPIs and table update together, always in agreement → scan the tiles
  for the number that looks off → sort or group the table to find its rows → drill down
  or select-and-act → return to the same filters, same scroll.
- Narrowing until KPIs read clean is the analysis; acting on what remains is the point.

## Feedback & feedforward

- While recomputing, tiles dim their stale values — they never show zeros or spinners
  pretending to be data; the table skeletons below. A failed tile shows an em dash.
- A region that fails (KPIs or table) reports inside itself, in normal body color, with
  retry; the filters and the other region stay live.
- Selection actions stay disabled until a selection exists and their labels name the
  outcome with the count. Failure lands beside the action, success is the rows updating
  in place — no page banners, no redirects.
- An empty filtered set says so once, plainly, with the KPIs honestly at zero only when
  zero is the contract's real answer.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (no section titled "Export" above an Export button).
- A control is navigation OR action, never both: rows drill down, selection buttons act,
  filters filter — no control does two jobs.
- Link color only on real links; tile labels, counts and captions are muted text.

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
Everything above holds: one filtered set told twice, the filters ruling both, rows that drill down
and act, feedback and disciplines. Only the shape changes, because a filter row, a tile row and a
wide table cannot fit the width. Where this section and the layout described above differ, this
section wins on mobile.

- **Still the same question, in the same order**: filters, then the summary, then the rows. The
  phone still answers "what do the numbers say about this set, and which rows are behind them?",
  and every KPI is still recomputed from the filtered set.
- **The filter row becomes a compact bar** at the top: the one or two main filters inline when
  they fit, the others behind a "Filters" control that shows how many are active and opens them as
  a view of its own, one per line, with apply; back returns to the list at the same place.
- **The KPI row wraps into a block of two per row**, every tile the same size, value large and
  tabular, label small; still one block, still above the list, never a carousel.
- **The table becomes a list of rows**, one record per row: identity first, then the one or two
  decisive numbers right-aligned and never truncated; a flag still colors only its own number. The
  row is the drill-down; back returns to the same filters and the same scroll.
- **Selection is an explicit mode**: when the contract declares selection commands, one "Select"
  control turns rows into checkable rows; a bar fixed at the bottom shows the count and the actions
  named with it ("Approve 3 selected"). Leaving the mode clears the selection.
- **Export** (only when declared) stays one quiet action, at the foot of the list or in the bar.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the filter bar with its active count, 2. the KPI block, 3. the list
of rows, 4. the selection bar, when in select mode.

Forbidden on mobile:
- wide tables or any horizontal scroll, including the KPI block;
- KPIs that stop following the filters, or filters split between the bar and the list;
- checkboxes always visible on every row outside select mode;
- truncated numbers in tiles or rows.

## Forbidden

- An interactive chart as the page's main control, with the table reacting to selections
  made on it — that is the `chartLedTable` experience, not this one.
- KPIs computed over unfiltered data while the table is filtered (the page's one deadly
  sin); tiles whose numbers are not in the contract.
- Charts above or among the KPI tiles; decorative sparklines.
- Alarm color on tiles or rows as decoration — only on the flagged fact itself.
- Per-column filter bars competing with the filter row; a full page reload on filter
  change; typed ids anywhere.
- Toasts carrying validation; blocking dialogs on selection actions.
