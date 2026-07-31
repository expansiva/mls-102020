# analyticalList — experience `chartLedTable` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

One chart leads, and it is not decoration — it is the control. The user finds the pattern
with their eyes (the tall bar, the odd segment, the dip), selects it ON the chart, and the
table below narrows to exactly those rows, ready to be acted on. Seeing and querying are
the same gesture. Where `kpiFilterTable` asks with filters and reads with tiles, this page
asks by pointing at the picture — built for the analyst who does not yet know what they
are looking for and needs the shape of the data to tell them.

## How to instantiate from the defs (the slots)

- **One chart, from the contract's declared series or grouping** — the largest thing on
  the page, above the table. The chart form follows the data's own shape (categories
  compare, time runs, parts total); it plots ONLY values the contract provides, with
  their units. If the contract declares no series or grouping, this experience does not
  apply — never invent an axis.
- **Selection on the chart IS the filter**: picking a bar, segment or range narrows the
  table to those rows. Multiple picks combine when the contract's query can express it;
  otherwise a new pick replaces the old — never pretend a combination the query cannot do.
- **The current selection is stated in words** between chart and table ("Showing: South
  region · March") with one clear control to release it; releasing restores the whole
  set. The sentence is the page's single source of truth about what the table shows.
- **The table is the narrowed evidence**: the contract's columns, numbers right-aligned
  and tabular, flags coloring their own cell, sorting as the contract declares. Each row
  drills down to its record; selection commands from the contract appear beside the
  selection count, labels naming outcome and count.
- **Conventional filter inputs, if the contract declares them**, sit quietly above the
  chart and reshape it — the chart remains the protagonist; the filter row is its stage
  crew, never a rival table-filter.
- **Session/context inputs never render as fields**; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The chart — the shape of the whole, and the way to interrogate it.
2. The selection sentence — what is currently under the lens, in words.
3. The table — the rows behind the selected shape, actionable.
4. Chart-level inputs and export, quiet at the edges.

## Loops

- Read the shape → select the anomaly on the chart → the table narrows → drill into a row
  or act on a selection → release the pick → the whole picture returns, chart unchanged.
- Reshape with a chart-level input (period) → the chart redraws → point again. The loop
  is always eye → pick → rows → act.

## Feedback & feedforward

- The chart announces its interactivity by response: what is selectable responds on
  approach, the current pick stays visibly held, and everything unselected dims WHILE a
  pick is active — the chart itself shows what the table is showing.
- While the table narrows, it skeletons in place; the chart never blocks. A region that
  fails reports inside itself, in normal body color, with retry; the other stays live.
- Selection actions stay disabled until rows are selected; success is the rows updating
  in place, and the chart recomputes to match — the two never disagree. No page banners,
  no redirects.
- An empty pick ("no rows behind this slice") is said plainly under the selection
  sentence — never an unexplained empty table.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both: chart picks filter, rows drill down,
  selection buttons act — no control does two jobs.
- Link color only on real links; the selection sentence, axis labels and captions are
  muted text.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A KPI tile row commanding the top, with filters as the steering wheel — that is the
  `kpiFilterTable` experience, not this one.
- A chart that does not filter the table (decoration), or a table that can disagree with
  the chart's current selection.
- More than one chart competing for the lead; charts of values the contract does not
  declare; invented axes, trends or forecasts.
- Alarm color as chart decoration — only on facts the contract flags.
- A pick that survives invisibly (filtered table with no selection sentence); typed ids
  anywhere.
- Toasts carrying validation; blocking dialogs; full page reloads on pick or release.
