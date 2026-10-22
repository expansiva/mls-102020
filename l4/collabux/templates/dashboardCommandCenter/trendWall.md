# dashboardCommandCenter — experience `trendWall`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

This dashboard answers **"which way is each number going?"** Every indicator is shown as a
movement, not a snapshot: a small line of its recent history, its current value, and the
direction it is heading, all in one uniform cell — and the wall of cells is read by comparing
slopes. Where `exceptionTriage` lists what is wrong now and `overviewBoard` shows the vital
signs as static tiles with sections beneath, this page puts time on stage: a number that is
fine today but falling for six weeks is the one this page exists to reveal. Target: a manager
reviewing the operation weekly or monthly, looking for drift before it becomes an exception.

## How to instantiate from the defs (the slots)

- **One cell per indicator the contract declares**: each aggregate value becomes a trend cell.
  The cell holds, in this order: label (business words), current value large and tabular with
  its unit or currency, a direction mark (up, down, flat) with the change in plain numbers, and
  a sparkline under them.
- **The sparkline comes only from a declared series**: a query that returns the indicator over
  time (by day, week, month, period). It plots exactly those points, oldest left, newest right,
  no axes, no smoothing, the last point marked. The period it spans is stated once in the cell
  caption ("last 12 weeks").
- **Direction is computed from the series**: the last point against the one before (or against
  the comparison the contract declares). Whether "up" is good is never assumed: the direction mark
  stays neutral unless the contract declares the good direction or flags the value; then and only
  then it takes the success or alarm color.
- **Degrade when there is no series**: an indicator with only a current value keeps its cell, its
  label and its value, and in place of the sparkline one muted line saying no history is
  available — never a flat fake line, never a guessed direction. If NO indicator has a series, the
  wall still renders as uniform value cells, and the page says once under the header that trends
  are not available for this data.
- **Cell = drill-down**: the whole cell opens the items or the detail behind the indicator, when
  the contract has a list for it; otherwise the cell is passive.
- **A period input** (when the contract declares one) is the one global control, top right; it
  changes the span of every sparkline together, never one cell alone.

## Attention hierarchy (the spine of this experience)

1. The wall of slopes — the shape of every line, compared at a glance.
2. The direction marks and their changes — which way, by how much.
3. The current values — where each indicator stands now.
4. The period control and freshness caption, quiet at the edge.

## Loops

- Scan the slopes → one line is bending the wrong way → read its change → open the cell → see
  the items behind it → come back; the wall has not moved.
- Change the period → every sparkline redraws over the new span together; values and directions
  follow. Comparing a short and a long span is how drift is confirmed.

## Feedback & feedforward

- Loading: the grid of cells first with empty sparkline frames, numbers after — the wall's
  geometry is stable before its data.
- A cell whose query fails shows its label, an em dash for the value and retry in place; the
  other cells stay. A dash is unknown, zero is a claim.
- Touching or focusing a sparkline reveals the value and date of the nearest point, inline in the
  cell caption — never a floating tooltip that hides other cells.
- Cells never reorder by their values; position is stable between visits.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**.
- A control is navigation OR action, never both: cells navigate, the period control filters.
- Link color only on real links; captions and spans are muted; numbers right-aligned, tabular.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields — paging belongs to the collection surface itself.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label — if a region has no business name, it has no
  heading.
- All cells share one size and one anatomy; every sparkline uses the same height and the same
  span, so slopes are comparable — never one big hero chart.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: one uniform cell per indicator, slopes compared, neutral direction unless
declared, honest degradation, stable positions, feedback and disciplines. Only the grid narrows,
because several cells side by side would shrink the sparklines below readability. Where this
section and the layout described above differ, this section wins on mobile.

- **One cell per row, full width**: label and current value on the first line, value
  right-aligned; direction mark and change on the second; the sparkline under them, the full
  width of the cell. Same height for every sparkline.
- **The period control** sits full width above the wall, the one global filter.
- **A tap on the sparkline** shows the nearest point's value and date in the cell caption; a
  second tap anywhere on the cell outside the line opens its drill-down as a view of its own, with
  back returning to the same cell.
- **Cells without a series** keep the same position and height, with the muted "no history" line
  where the sparkline would be, so the column rhythm stays even.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the sparklines, read down the column, 2. direction and change,
3. current values, 4. the period control.

Forbidden on mobile:
- a carousel of cells, or anything that scrolls sideways;
- point values reachable only by hover or long-press;
- cells of different heights or sparklines with different spans;
- reordering cells by value or direction.

## Forbidden

- Static stat tiles without history, with list sections underneath — that is the
  `overviewBoard` experience, not this one.
- A triage headline or exception lanes owning the top — that is the `exceptionTriage`
  experience, not this one.
- Sparklines drawn from data the contract does not return; interpolated, smoothed or forecast
  points; a flat line standing in for missing history.
- Green for up and red for down by default; color without a declared good direction or flag.
- One oversized chart, axes and gridlines in cells, or cells of different sizes.
- Steps, wizards, or any act-like progression — this page has no sequence.

## Signals (how to check the generated page)

1. **S1 Uniform cells:** every indicator renders in a cell of the same size and anatomy
   (label, value, direction, history area); no section lists beneath them on the first screen.
2. **S2 History slot always present:** each cell reserves the sparkline area; with no series it
   holds a muted "no history" line, never an invented line.
3. **S3 Neutral by default:** direction marks carry no success/alarm color unless the contract
   declares a good direction or a flag.
4. **S4 One period for all:** at most one period control on the page, changing every cell at
   once; no per-cell filters.
