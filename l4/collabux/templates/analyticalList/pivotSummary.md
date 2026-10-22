# analyticalList — experience `pivotSummary`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The filtered set arrives already grouped: **one row per group, with its count and subtotals,
and each group opens in place to the items behind it**. The person reads the set by its
structure first — which supplier, which region, which status carries the weight — and only then
descends into the rows that matter and acts on them. The summary is not a strip above the table;
it IS the table, at the group level. Where `kpiFilterTable` summarizes the whole set in tiles
over a flat grid and `chartLedTable` lets a picture drive the narrowing, this page answers
**"how is the set made up, and which items are inside that part?"** Target: an analyst or
coordinator who thinks in categories and acts on the items of one category at a time.

## How to instantiate from the defs (the slots)

- **Grouping comes from the contract**: a declared group-by input, a grouped query, or a field
  the contract marks as a category (status, owner, reference). When several are declared, one
  "Group by" choice at the top switches between them; only declared groupings are offered.
  Without any declared grouping, the page groups by the first enumerated or reference field of
  the items and says so in the group header caption — never by free text, dates or ids.
- **Each group row** carries: the group's business label, the item count, and one subtotal per
  numeric column the contract declares, right-aligned and tabular, aligned under the item
  columns. Subtotals are computed over the filtered set only; a column with no number has an
  empty subtotal cell, never a count disguised as a sum.
- **A grand total row** closes the table, heavier than the subtotals, with the same columns.
- **Expanding a group** reveals its items inline, indented under it, with the contract's item
  columns; collapsing hides them again. Groups start collapsed, unless only one group exists.
- **Items act**: each item row drills down to its record; selection commands from the contract
  make item rows selectable, and a group row offers "select all in group". Actions appear beside
  the selection count ("Approve 5 selected"), disabled until a selection exists.
- **Filters come only from contract inputs**, one row above the table, ruling groups, subtotals
  and items together. Session/context inputs never render as fields; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The group rows with their subtotals — the composition of the set.
2. The expanded group's items — the evidence behind the part in focus.
3. The selection count with its actions.
4. Filters, group-by choice and export, quiet at the top edge.

## Loops

- Read the subtotals → the heaviest group stands out → expand it → scan its items → select and
  act, or drill into one → return to the same expanded group, same scroll.
- Switch the grouping → the same filtered set regroups; the grand total does not change, which
  proves it is the same set.
- After an action, the affected items update in place and their group's subtotal recomputes.

## Feedback & feedforward

- While recomputing, subtotals dim their stale values; items skeleton inside the expanded group.
- A group whose items fail to load reports inside its expansion with retry; other groups stay.
- A filter that empties a group removes that group row; a filter that empties the set says so
  once, plainly, with the grand total honestly at zero.
- Selection actions name outcome and count; failure lands beside them; no page banners.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**; group labels are data, not headings.
- A control is navigation OR action, never both: the group row's expander expands, an item row
  drills down, selection buttons act.
- Link color only on real links; counts and captions are muted; numbers right-aligned, tabular.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields — paging, when needed, lives inside an expanded group.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: groups first with their subtotals, expand to items, act on items, filters
ruling all, feedback and disciplines. Only the columns change, because a row of subtotals per
numeric column cannot fit the width. Where this section and the layout described above differ,
this section wins on mobile.

- **Group rows become list rows**: the group label and count on the left, the ONE leading
  subtotal (the first numeric column of the contract) right-aligned; the other subtotals as small
  label and value pairs under it, never truncated.
- **Expanding a group opens its items under it** as list rows: identity first, the one or two
  decisive numbers right-aligned. The item row drills down as a view of its own; back returns to
  the same expanded group.
- **Group-by and filters** sit in one compact bar; extra filters open as a view of their own,
  one per line, with apply.
- **Selection is an explicit mode**: one "Select" control makes item rows checkable; a bar fixed
  at the bottom shows the count and the outcome-named actions.
- **The grand total** closes the list, heavier than the group rows.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the group rows with their leading subtotal, 2. the expanded
group's items, 3. the selection bar, 4. the filter bar.

Forbidden on mobile:
- a wide table of subtotal columns, or any horizontal scroll;
- groups expanding into a separate page instead of in place;
- checkboxes on every row outside select mode;
- truncated subtotals.

## Forbidden

- A KPI tile row over a flat, ungrouped table — that is the `kpiFilterTable` experience, not
  this one.
- An interactive chart as the main control narrowing the table — that is the `chartLedTable`
  experience, not this one.
- Subtotals that ignore the filters, or a grand total that changes when only the grouping does.
- Grouping by fields the contract does not declare as groupable; inventing ratios or averages
  the contract does not return.
- Multi-level nested pivots beyond one grouping level plus items; drag-to-pivot as the only way
  to group.
- Toasts carrying validation; blocking dialogs on selection actions.

## Signals (how to check the generated page)

1. **S1 Groups first:** on load the table shows group rows (label, count, subtotals), not a flat
   list of items.
2. **S2 Expand in place:** opening a group reveals its items inline under it, on the same page.
3. **S3 Grand total:** a total row closes the table and matches the sum of the group subtotals.
4. **S4 Act on items:** item rows (not group rows) drill down; selection actions name the count.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "table",
    "expand": "collapsible",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupViewTable", "groupExpandContent"],
    "forbid": ["groupViewChart", "groupViewMetric"]
  }
}
```
