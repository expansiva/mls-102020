# customerManagement — experience `segmentedPortfolio`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The customer base seen as a portfolio: the page is **a stack of group sections**, one per
value of a grouping field the contract declares (segment, status, region, owner), each
headed by its name and **its count**, with its customers as compact rows inside. The person
reads the shape of the base first ("38 active, 12 inactive, 5 blocked"), opens the group
that matters and acts on it — one customer or several of the group at once. Where
`directoryProfile` is a finder for one known name with a profile beside it, and
`relationshipHub` makes one customer's relationship the whole page, here the question is
**"how is my base distributed, and what do I do with this group?"** — individual profiles
are a step away, never the stage. Target: see the base's split in one glance and act on a
whole group without hunting customers one by one.

## How to instantiate from the defs (the slots)

- **The grouping comes from a categorical field of the collection item** — the one the
  contract offers as a filter (status, segment, region, owner), the first declared when
  several exist. When the contract offers a choice of grouping fields, a small "group by"
  control switches among them; it never offers a field the contract does not declare.
- **Each section is one value of that field**: header with the value's business label and
  its count (from the query's totals or a per-value filtered call — whatever the contract
  allows; when no count is obtainable, the header shows the value alone, never an estimate).
  Order: the contract's declared order of values, else largest group first.
- **Rows inside a section** are compact: name loudest, one or two facts the contract
  exposes (city, document, owner); the grouping field itself is not repeated on the row.
  Each section pages on its own, as the query paginates; long sections show the first page
  and a "show more" at their foot.
- **Acting on a group**: each row has a checkbox; a section header offers "select all in
  this group". With a selection, a bar shows the count and the commands that accept a
  customer (move to another status/segment through the update command, deactivate, assign).
  A command the contract offers only for one id runs once per selected customer, with
  per-row results.
- **One customer's details** open in a compact panel or view from the row: identity and
  contact facts, the update command prefilled. It closes back to the same section and scroll.
- **Creation** is one "New customer" action in the header; the new row lands in its group,
  briefly marked.
- **Degrade**: with no categorical field in the contract, the page shows one section "All
  customers" with its count and keeps the group actions — never an invented segmentation.
- Session/context inputs never render as fields; ids are never typed — selection IS the id.

## Attention hierarchy (the spine of this experience)

1. The group headers with their counts — the shape of the base.
2. The open section's rows — the customers of the group in focus.
3. The selection bar and its group actions — appearing only with a selection.
4. Search, grouping control, creation and one customer's details — quiet frame.

## Loops

- Read the counts → expand a group → select all or some → move/assign/deactivate → the rows
  leave for their new group and **both counts update** → the next group.
- Search narrows rows inside every section at once and the counts show the narrowed totals;
  clearing the search restores them. Sections never reorder while the person is acting.

## Feedback & feedforward

- The selection bar names the count and the outcome before commit ("Move 12 customers to
  Inactive"); destructive outcomes confirm with the count and the group.
- Per-row results for group actions: rows that failed stay selected with the reason in words,
  the rest move; a single summary line in the bar, never a toast.
- Forms validate at the field, in words, at commit time; commit stays disabled until valid.
- Empty groups stay as a header with zero only when the contract declares the value set;
  they never render rows of placeholders.

## Disciplines (transversal — always)

- The page name appears once, in the header; section titles are the group values, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: headers expand and collapse, checkboxes
  select, the bar's buttons commit; a row's name opens the details and does nothing else.
- Link color only on real links; counts are data, never link-colored.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to each section's foot.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record
  (or the count and group, for a group action).
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names, raw
  enum codes) is never rendered as visible text — group values show their business labels.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: groups with counts as the shape of the base, acting on a group, details a
step away. On a phone the sections start collapsed so all the counts fit in the first screen.
Where this section and the layout described above differ, this section wins on mobile.

- **Group headers stack as full-width rows** with label and count; tapping one expands its rows
  below it, and the others stay collapsed.
- **Rows are list rows**, name loudest and one fact under it; a checkbox at the row's start is
  the selection, "select all in this group" sits in the expanded header.
- **The selection bar is fixed at the bottom** where the thumb reaches, with the count and the
  group actions; more than two actions fold into one "more" menu.
- **One customer's details are a view of their own** with back, inside this page; back returns
  to the same section, expanded, at the same scroll.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the group headers and counts, 2. the expanded group's rows, 3. the
selection bar.

Forbidden on mobile:
- a table, or group sections side by side or as a horizontally scrolling strip;
- details in a drawer over the list;
- long-press as the only way to select;
- losing the expanded section or the selection after visiting a customer's details.

## Forbidden

- A finder with a list on one side and a profile on the other — that is the
  `directoryProfile` experience, not this one.
- One customer's highlight band and relationship sections as the page — that is the
  `relationshipHub` experience, not this one.
- A flat list where the grouping is only a column or a filter chip; the groups ARE sections.
- Invented segments, scores or tiers; groups come only from a declared field's values.
- Charts replacing the counts; the counts are numbers in the headers.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 Group sections:** customers render inside sections headed by a group value, not as a
   single flat list.
2. **S2 Counts in headers:** each section header shows how many customers it holds (or, when the
   contract gives no count, the single "All customers" degrade, still a section).
3. **S3 Act on a group:** a section offers selecting all its customers, and a selection bar shows
   the count and at least one command.
4. **S4 Counts follow actions:** after a group action moves customers, the source and target
   counts change without reloading the page.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "list",
    "expand": "collapsible",
    "listOverflow": "load-more",
    "validation": "inline-below",
    "feedback": "inline"
  },
  "groups": { "prefer": ["groupExpandContent", "groupViewData"], "forbid": ["groupViewChart"] }
}
```
