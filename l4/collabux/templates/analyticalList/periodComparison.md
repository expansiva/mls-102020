# analyticalList — experience `periodComparison`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Every number on this page stands next to its own past: **this period against the previous
one, with the difference spelled out, and the rows that moved most come first**. The person
does not ask "how much?" but **"what changed, and where?"** — the summary shows the totals of
both periods and their delta, the table lists each item with its two values and its change,
sorted by the size of the change, and acting on the movers is the point. Where `kpiFilterTable`
reads one filtered set at one moment and `chartLedTable` finds patterns by pointing at a
picture, this page is built on the pair of periods. Target: a manager in a monthly or weekly
review, explaining variance and acting on the items behind it.

## How to instantiate from the defs (the slots)

- **The period pair comes from the contract's period inputs**: the current period as one choice
  (month, week, range — as declared), the previous one derived as the immediately preceding span
  of the same length, or taken from a second declared input when the contract offers it. Both
  periods are always stated in words above the table ("March 2026 vs February 2026").
- **Values per period come only from the contract**: the query must return each item's value
  for both periods (two fields, or two runs of the same query with the two periods). Without a
  way to obtain the previous value, this experience degrades to a single period table with a
  quiet note that comparison is unavailable — never invented previous values.
- **The summary line** shows, for each aggregate the contract declares: current, previous, and
  the delta in absolute value and percentage. Same size, one compact row; no tiles beyond it.
- **Each table row** carries identity, current value, previous value, absolute delta and
  percentage delta, all right-aligned and tabular with units. A row new in this period shows
  "new" instead of a percentage; a row gone shows "none" for current — never divide by zero.
- **Default order is by size of absolute change**, largest first, increases and decreases mixed;
  a toggle "increases first / decreases first" is the only extra ordering offered.
- **Delta color stays neutral** unless the contract declares the good direction or flags the
  value; then increases or decreases take success or alarm color, only on the delta cell.
- **Rows act**: drill-down to the record, selection commands named with outcome and count.
  Session/context inputs never render as fields; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The movers at the top of the table — the rows with the largest change.
2. The summary line — how much the whole moved between the two periods.
3. The period pair, stated in words, with its control.
4. Selection actions and export, quiet at the edge.

## Loops

- Read the summary delta → scan the movers → drill into the biggest change → return → act on a
  selection of movers → their rows update in place.
- Change the current period → the previous one follows → summary and rows recompute and re-sort
  together; the stated pair updates first, so the person always knows what is compared.

## Feedback & feedforward

- While recomputing, deltas dim their stale values; never zeros pretending to be data.
- A failed previous-period read keeps the current values readable and marks the comparison
  columns with an em dash and retry — the page never shows a delta it could not compute.
- An item with no change at all sinks to the bottom and reads "no change"; a set with no change
  says so once, plainly.
- Selection actions stay disabled until rows are selected; failure lands beside them.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**.
- A control is navigation OR action, never both: rows drill down, buttons act, the period
  control filters.
- Every delta carries its sign explicitly (+ / −) and its unit; percentages are rounded the same
  way everywhere.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; the change-size order is the page's own.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the stated period pair, the summary of both periods, movers first, neutral
delta color, feedback and disciplines. Only the row shape changes, because five numeric columns do
not fit the width. Where this section and the layout described above differ, this section wins on
mobile.

- **The period pair is one line** at the top, in words, with the period control beside it.
- **The summary wraps** into one block: per aggregate, the current value large, and under it the
  delta and the previous value small.
- **Each row is a list row**: identity on the left; the delta (absolute and percentage) as the
  right-aligned lead value; current and previous as a small "now / before" line under it. Never
  truncated.
- **The order toggle** (largest change / increases / decreases) is one compact control above
  the list.
- **Selection is an explicit mode** with a bar fixed at the bottom, count and outcome-named
  action; the row drills down as a view of its own, back returns to the same place.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the movers at the top of the list, 2. the summary block, 3. the
period pair, 4. the selection bar.

Forbidden on mobile:
- a wide table of current/previous/delta columns, or any horizontal scroll;
- hiding the previous value behind a tap;
- re-sorting the list by anything but change without the person asking;
- a delta without its sign.

## Forbidden

- KPI tiles summarizing a single period over a plain table — that is the `kpiFilterTable`
  experience, not this one.
- An interactive chart driving the table — that is the `chartLedTable` experience, not this one.
- Previous values that are invented, estimated or taken from a different span length.
- Green-up / red-down by default; color without a declared good direction or flag.
- Default ordering by name or by current value; percentages divided by zero.
- Toasts carrying validation; blocking dialogs on selection actions.

## Signals (how to check the generated page)

1. **S1 Pair stated:** the two periods being compared are written in words above the results.
2. **S2 Two values and a delta:** each row shows current, previous and the change with its sign;
   when the previous value cannot be obtained, a note says comparison is unavailable instead.
3. **S3 Movers first:** the default order is by size of change, not by name or by value.
4. **S4 Neutral deltas:** delta cells carry no success/alarm color unless the contract declares a
   good direction or a flag.
