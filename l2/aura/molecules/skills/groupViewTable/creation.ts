/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewTable/creation.ts" enhancement="_blank"/>

export const skill = `
# groupViewTable — Creation

> Implementation reference for creating molecules in the **groupViewTable** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupViewTable\` |
| **Category** | Data Display |
| **Version** | \`1.1.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Caption\` | No | Table caption/title |
| \`TableHeader\` | Yes | Header section container |
| \`TableBody\` | Yes | Body section container |
| \`TableRow\` | Yes | A table row (inside TableHeader/TableBody/TableFooter). Optional \`key\`: row identity for edit/save/cancel/delete — **key, not index**; missing key falls back to position |
| \`TableHead\` | Yes | Header cell. Attributes: \`key\` (required, column identifier), \`sortable\` (presence) |
| \`TableCell\` | Yes | Data cell. May contain text or web components. Optional \`sort-value\` overrides what it sorts by — §7.2 |
| \`TableFooter\` | No | Footer section container |
| \`Empty\` | No | Content shown when TableBody has no rows |
| \`Loading\` | No | Content shown during loading state |
| \`Detail\` | No | Content shown when a record is expanded. Only row-expansion implementations read it — see **Detail Slot** |
| \`RowActions\` | No | Per-row action buttons, one per row — optional, row-lifecycle only |
| \`RowAction\` | No | One action; inside \`RowActions\`, or direct child of \`TableFooter\` (new-record) |
| \`NewRecordRow\` | No | Draft row for creating a record, one at a time |

\`RowActions\`/\`RowAction\`/\`NewRecordRow\` are detailed in **Row Actions & Draft Row** below.

\`\`\`typescript
// Drop 'Detail'/'RowActions'/'RowAction'/'NewRecordRow' when the molecule lacks that feature.
slotTags = ['Caption', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell', 'TableFooter', 'Empty', 'Loading', 'Detail', 'RowActions', 'RowAction', 'NewRecordRow'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Caption>
├── <TableHeader>
│   └── <TableRow>
│       └── <TableHead key="..." sortable>
├── <TableBody>
│   └── <TableRow key="...">
│       ├── <TableCell>
│       ├── <Detail>          (expansion only)
│       └── <RowActions>      (row-lifecycle only)
├── <NewRecordRow key="...">  (at most one)
├── <TableFooter>
│   └── <TableRow>
│       └── <TableCell>
├── <Empty>
└── <Loading>
\`\`\`

### Detail Slot — the expanded record

Holds what appears when a record is expanded. **PRESENTATION is up to the implementation** — a
detail row below the record, or a scene replacing the list. Same slot either way — what lets a
consumer switch implementations by changing the tag.

| Rule | Value |
|------|-------|
| Where | Direct child of \`<TableRow>\`, inside \`<TableBody>\` only — never Header/Footer |
| How many | One per \`<TableRow>\`. Read as \`:scope > Detail\`, so a nested one is not found |
| Accepts | Text, web components, another table — same freedom as \`<TableCell>\` |
| Who fills it | The **consumer**, usually after \`rowClick\`. Empty until then is valid |
| \`label\` | Optional title for a scene presentation; ignored by a detail-row one |

> ⚠️ **The attribute is \`label\`, not \`title\`.** \`title\` is a global HTML attribute and the browser
> would turn it into a tooltip on the slot tag.

**Do not derive the heading from the row's cells** — the first cell is often a composite reading as
one run; the consumer names it via \`label\` instead.

**Only implementations that offer expansion read it** — leaving it out of \`slotTags\` is not a
violation.

**It must be a LIVE slot** — \`renderLiveSlotFrom(detailEl)\`, never serialized: serializing would
destroy the handlers and identity of the buttons and tables consumers put here.

A molecule declaring \`Detail\` must list it in its own \`.defs.ts\` and exercise it in the playground
— the slot list is generated from the defs, so a missing entry opens blank (measured 2026-08-05,
\`ml-lazy-record-detail-table\`).

> ⚠️ **Do not re-project the record's own \`<TableCell>\` nodes into the detail.** A live slot MOVES
> nodes, and \`renderLiveSlotFrom\` keys the anchor by source ELEMENT — a cell projected into both the
> row and the detail gives two anchors ONE key, and the second steals the nodes. The visible cells go
> empty the moment the record expands. The detail needs a source of its own — that is what \`<Detail>\`
> is for.

**Not a general accordion.** To expand arbitrary content that is not a record inside a table, the
group is \`groupExpandContent\`.

### Row Actions & Draft Row — optional CRUD surface

Only row-lifecycle implementations read this (same rule as \`Detail\`).

| Rule | Value |
|------|-------|
| \`RowActions\` | Child of a body \`<TableRow>\`, or of \`<NewRecordRow>\`. One per row |
| \`RowAction\` | Inside \`RowActions\`; **or** direct child of \`TableFooter\` (new-record trigger) |
| Injected column | Added after the data columns only when a row/\`NewRecordRow\` supplies \`RowActions\` — mirrors \`selectable\`'s checkbox; never declared by the consumer |
| \`NewRecordRow\` | One at a time; cells projected live like a row |

| \`action\` | \`when\` inferred | transition |
|---|---|---|
| \`edit\` | view | opens row |
| \`delete\` | view | none |
| \`save\` | edit | closes row |
| \`cancel\` | edit | closes row |
| \`new\` (footer only) | always | opens draft |
| anything else | always | none — generic \`rowAction\` |

Explicit \`when\` (\`view\`\\|\`edit\`\\|\`always\`) wins over the inference. An out-of-mode control stays
present but **hidden** (\`display: none\`), out of tab order/a11y tree — never destroyed. Making its
existence conditional instead would return the consumer's node to its origin and remove/reinsert it
on every click — the double-anchor defect family, here alternating with the mode.

> ⚠️ **Emit the event FIRST, change mode AFTER — always.** The consumer must rely on the order, not
> guess it.

**Molecule owns MODE, never VALUE.** \`editingRows\` (attr \`editing-rows\`) hands the mode to the
consumer when present — present-and-empty means "no row open". Absent ⇒ molecule owns it, no round
trip. Values stay the consumer's, always — what makes "cancel without touching anything" work.

Opening a row is only half of it: **the open row's cells must receive \`is-editing\`** (§6) or the
consumer's editor never switches, and the row opens with nothing changing on screen.

---

## 2.9 Live slots in this group

Tables opt in with \`protected usesLiveSlots = true;\` — cells host consumer buttons, inputs and even
nested tables, and those must keep working.

| slot | path | how to render |
|---|---|---|
| \`TableCell\`, \`TableHead\`, \`RowAction\` | **LIVE, by ELEMENT** | \`\\\${this.renderLiveSlotFrom(cell)}\` — N per row, so a tag-name anchor cannot address them |
| \`Caption\`, \`Empty\`, \`Loading\` | **LIVE** | \`\\\${this.renderLiveSlot('Caption')}\` |
| \`Detail\` | **LIVE, by ELEMENT** | \`\\\${this.renderLiveSlotFrom(row.detailEl)}\` — see Detail Slot |
| \`TableHeader\`, \`TableBody\`, \`TableFooter\`, \`TableRow\`, \`RowActions\`, \`NewRecordRow\` | structure | \`getLiveSlot(tag)\` / \`querySelectorAll\`, never projected |

**A new table of this group must follow this split.** Today 6 of 12 do; the rest are being ported.

⚠️ **Read slot children with a SELECTOR** — \`row.querySelectorAll(':scope > TableCell')\` — never by
comparing \`tagName\`. In the DOM \`<TableRow>\` is \`TABLEROW\`: **no hyphen is inserted**, so
\`tagName === 'TABLE-ROW'\` matches nothing, silently, and the table renders as empty. A type selector
is case-insensitive here and cannot get it wrong.

### The two that bite in a table

**1. Read structure with \`getLiveSlot\`, not \`getSlot\`.** \`getSlot\` reads the SNAPSHOT, and a molecule that
projects cannot read from there: the source is emptied by the projection, and a re-snapshot after
it reads blank rows.

**2. Sorting MUST pass \`getLiveText\`.** After projection \`cell.textContent\` is empty, so sorting by
cell text silently orders by nothing — same helper as §7.1: \`cellSortKey(cell, this.getLiveText(cell))\`.

---

## 3. Properties

### 3.1 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`selectable\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Enable row selection with checkboxes |
| \`isEditing\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Propagates \`is-editing\` to web components inside cells |
| \`editingRows\` | \`string\` | unset | \`@propertyDataSource\` | **Optional.** Attr \`editing-rows\`: row keys open, comma-separated. Presence decides who owns the mode — see **Row Actions & Draft Row** |
| \`page\` | \`number\` | \`1\` | \`@propertyDataSource\` | Current page number (1-based) |
| \`pageSize\` | \`number\` | \`0\` | \`@propertyDataSource\` | Rows per page (0 = show all) |
| \`totalItems\` | \`number\` | \`0\` | \`@propertyDataSource\` | Total items, for the page count |

### 3.2 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string\` | \`''\` | \`@propertyDataSource\` | Comma-separated selected row indices (e.g. \`"0,2,5"\`) when \`selectable=true\` |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Disables all interaction |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show Loading slot content or default skeleton |
| \`fitHeight\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | **Optional.** Attr \`fit-height\`: fills parent height, body-only scroll; parent needs a defined height. In 1 of 12 today |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`sortKey\` | \`string \| null\` | \`null\` | \`@state\` | Currently sorted column key |
| \`sortDirection\` | \`string\` | \`'asc'\` | \`@state\` | Sort direction: \`'asc'\` or \`'desc'\` |

---

## 4. Value Contract

- \`value\` is a **comma-separated string** of selected row indices when \`selectable=true\`
- Empty string \`''\` means no rows selected
- Example: \`"0,2,5"\` means rows at index 0, 2, and 5 are selected

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: string }\` | ✓ | Selection changed (comma-separated row indices) |
| \`sort\` | \`{ key: string, direction: string }\` | ✓ | Column sort triggered |
| \`pageChange\` | \`{ page: number }\` | ✓ | Page navigation triggered |
| \`rowClick\` | \`{ index: number }\` | ✓ | Row clicked (not from selection or a row action) |
| \`edit\` | \`{ key }\` | ✓ | **Optional** row-lifecycle event — row entered edit mode |
| \`save\` | \`{ key }\` · draft: \`{ key, isNew: true }\` | ✓ | **Optional.** Row or draft saved |
| \`cancel\` | \`{ key }\` · draft: \`{ key, isNew: true }\` | ✓ | **Optional.** Row or draft cancelled |
| \`delete\` | \`{ key }\` | ✓ | **Optional.** Delete requested, does NOT change mode |
| \`newRecord\` | \`{}\` | ✓ | **Optional.** Draft opened, or requested with no \`NewRecordRow\` |
| \`rowAction\` | \`{ key, action }\` | ✓ | **Optional.** Generic route for \`action\` outside the vocabulary |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('sort', {
  bubbles: true,
  composed: true,
  detail: { key: this.sortKey, direction: this.sortDirection }
}));
\`\`\`

Every event dispatches with \`bubbles: true, composed: true\` — only \`detail\` changes per event.

---

## 6. is-editing Propagation — the unit is the ROW

The editor is the consumer's component inside the cell, and \`is-editing\` is the only thing that
switches it. **Propagate per ROW, carrying THAT row's mode** — never one flag for the whole table.
Global \`isEditing\` is the degenerate case: every row editing at once.

- The **draft row is ALWAYS editing** — it is a form, not a record being read
- Propagate on first render and on **every** mode change: a row opened by \`edit\`, or a key entering
  or leaving \`editing-rows\`, counts as much as \`isEditing\` flipping
- Only target custom elements (tags containing a hyphen); set \`is-editing="true"\` or \`"false"\`
- **Never create an input.** Propagation is all you do, so a plain-text \`<TableCell>\` is expected to
  show nothing new when its row opens
- **Only propagate when the table owns the editing intent** — \`is-editing\` or \`editing-rows\`
  present, a row open, the draft open, or rows supplying edit actions. Marking unconditionally
  stamps \`is-editing="false"\` on every cell and **undoes a consumer driving the mode cell by
  cell**: the table's \`updated()\` runs after the page's binding (measured 2026-08-04)
- ⚠️ **Mark BOTH the source cell AND the rendered row.** Projection MOVES the consumer's nodes out of
  \`<TableCell>\` into the anchor, so after it the source is empty and the editor lives in the rendered
  \`<tr>\` — tie them with a key attribute on the row. Marking only the source reaches nothing once
  projected; only the rendered row misses a cell not projected yet
- ⚠️ **Not propagating is NOT neutral.** An editor's own default is usually EDIT mode (measured: the
  group's text input is \`isEditing = true\`), so an unmarked cell renders as an OPEN input in a table
  being read. Silence looks like "everything editable", never like read-only

---

## 7. Sorting

- The component handles sorting internally by reordering \`<TableRow>\` elements inside \`<TableBody>\`
- Clicking a sortable \`<TableHead>\` toggles between ascending and descending order
- **Use the shared helper — do not write the comparison again** (see below)
- After sorting, emit \`sort\` event with \`{ key, direction }\`

### 7.1 \`tableSort\` — the shared comparison

\`\`\`typescript
import { cellSortKey, compareSortKeys } from '/_102033_/l2/shared/molecules/tableSort.js';

// key of the cell at the sorted column, then compare; direction is up to you
const keyA = cellSortKey(a.cells[colIndex]);
const keyB = cellSortKey(b.cells[colIndex]);
return compareSortKeys(keyA, keyB) * (this.sortDirection === 'asc' ? 1 : -1);
\`\`\`

\`compareSortKeys\` is numeric when both keys are numbers and natural-collated text otherwise, and
its number parser reads both \`1.234,50\` and \`1,234.50\` — when both separators are present the LAST
one is the decimal.

> ⚠️ **"Sort by the cell's text content" was the old rule of this contract and it is WRONG.** The
> same comparison had been written three times in this group, and all three broke on \`R$ 1.234,50\`
> — one read \`1.234\`, another \`1.2345\`, another \`1\`. That is why the helper exists. Text order is
> also wrong for every column whose text does not sort like the data: \`dd/mm/yyyy\` dates, masked
> currency, status labels.

**With LIVE slots, pass the projected text** — \`cell.textContent\` is empty once projected.

\`\`\`typescript
cellSortKey(cell, this.getLiveText(cell))
\`\`\`

### 7.2 \`sort-value\` — the consumer declares the real value

A cell may declare what it should be sorted by, and \`cellSortKey\` prefers it over the text:

\`\`\`html
<TableCell sort-value="987">R$ 987,00</TableCell>
<TableCell sort-value="2026-01-02">2 de janeiro</TableCell>
\`\`\`

Nothing to implement — \`cellSortKey\` reads it already; bypassing the helper silently breaks
\`sort-value\`.

---

## 8. Selection

When \`selectable=true\`:

- Each row renders a checkbox
- A "select all" checkbox appears in the header
- Clicking a row checkbox toggles that row index in \`value\`
- Clicking "select all" toggles all row indices in \`value\`
- After each change, emit \`change\` event with the updated comma-separated string

---

## 9. Pagination and sorting — TWO modes

A table molecule must support both, and **the mode decides whether it may reorder rows**.

The signal is implicit and must be read exactly like this:

\`\`\`
external = totalItems > (rows received in <TableBody>)
\`\`\`

### 9.1 INTERNAL mode — every row is in the DOM

The consumer wrote all rows and left \`total-items\` unset (or equal to the row count). The molecule
owns both operations:

- total pages: \`Math.ceil(rowCount / pageSize)\`
- **sorts the whole set**, then slices to the current page
- emits \`sort\`/\`pageChange\` to mirror the state, without depending on it

> ⚠️ **The slice and the page count must read the SAME rule.** If \`render()\` slices by \`pageSize\`
> while \`getTotalPages()\` derives the total from \`totalItems\` alone, INTERNAL mode silently HIDES
> rows: the table shows page 1 only, "next" disabled (count says 1), rest unreachable. Measured
> 2026-08-05 in \`ml-lazy-record-detail-table\` — 8 rows, \`page-size="5"\`, 3 unreachable. In INTERNAL
> mode the total is the ROW COUNT:
>
> \`\`\`typescript
> const declared = Number(this.totalItems) || 0;
> const total = declared > 0 ? declared : this.parseBodyRows().length;
> \`\`\`
>
> A molecule that does not slice locally is EXTERNAL-only — a page count above 1 without
> \`total-items\` would then navigate nothing. Implement both halves or neither.

### 9.2 EXTERNAL mode — the consumer already sliced

The consumer queried a BFF, wrote only the current page, and set \`total-items\` to the full count:

- total pages: \`Math.ceil(totalItems / pageSize)\`
- **MUST NOT reorder**: it holds one page — sorting there would order 10 of 60. Renders as received
- still emits \`sort\`/\`pageChange\`; the consumer requeries and rewrites \`<TableBody>\`

> **Why "must not reorder" is not a style preference.** Clicking the header makes the molecule
> schedule its own render *before* it emits \`sort\`. So the molecule's render runs first and reads
> the PREVIOUS cell text, while the consumer updates those same projected nodes right after —
> producing rows ordered by old values carrying new content. Measured on 2026-08-04 with
> \`mls-102053/l2/demo/tabela-responsiva\`. Sorting by cell TEXT also breaks any column whose text
> doesn't order like the data (dates, masked currency) — the consumer, holding real values, sorts
> it correctly.

### 9.3 Known limitation of the signal

\`totalItems > rowCount\` is a heuristic — it cannot tell INTERNAL apart from a consumer that sliced
**and** set \`total-items\` equal to the rows sent. An explicit \`sort-mode\` property would remove the
ambiguity; open item for the group.

---

## 10. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Table rendered with data |
| **Loading** | Loading slot content or default skeleton rows |
| **Empty** | Empty slot content or default message |
| **Sorted** | Sort indicator on active column header |
| **Selected** | Highlighted rows with checkboxes checked |
| **Editing** | Child components inside cells in edit mode |
| **Disabled** | All interaction blocked, dimmed |
| **Error** | Error message below the table |

---

## 11. Accessibility (a11y)

Table: \`role="table"\` or native \`<table>\`. Caption: \`<caption>\` or \`aria-label\`. Header/Body:
\`role="rowgroup"\`. Header cells: \`role="columnheader"\`, \`aria-sort\` when sortable. Rows:
\`role="row"\`. Cells: \`role="cell"\`. Select all: \`aria-label="Select all rows"\`. Row checkbox:
\`aria-label="Select row N"\`. Pagination: \`role="navigation"\`, \`aria-label="Table pagination"\`.
Keyboard: \`ArrowUp\`/\`ArrowDown\` navigate rows; \`Space\` toggles selection; \`Enter\` on header sorts.

---

## 12. Design Tokens

CSS custom properties via \`var(--ml-token, fallback)\` in \`.less\`.

\`--ml-surface\` #fff · \`--ml-surface-dim\` #f5f5f5 · \`--ml-on-surface\` #1c1b1f · \`--ml-on-surface-muted\` #49454f · \`--ml-on-surface-faint\` #79747e · \`--ml-primary\` #3b82f6 · \`--ml-on-primary\` #fff · \`--ml-error\` #ef4444 · \`--ml-on-error\` #fff · \`--ml-outline-variant\` #e2e8f0 · \`--ml-outline-focus\` #3b82f6 · \`--ml-outline-error\` #ef4444 · \`--ml-radius-sm\` 6px · \`--ml-radius-full\` 9999px · \`--ml-border-width\` 1px · \`--ml-border-style\` solid · \`--ml-shadow-0\` none · \`--ml-shadow-1\` 0 1px 3px rgba(0,0,0,.1) · \`--ml-shadow-2\` 0 4px 6px rgba(0,0,0,.1) · \`--ml-font-family\` system-ui · \`--ml-font-weight-medium\` 500 · \`--ml-transition\` 200ms ease · \`--ml-focus-ring-color\` rgba(59,130,246,.4) · \`--ml-focus-ring-width\` 2px · \`--ml-disabled-opacity\` 0.5

\`data-class\` passes consumer CSS classes on host or slot tag. Shared classes: \`ml-label\`
\`ml-helper\` \`ml-error-text\` \`ml-text\` \`ml-text-muted\` \`ml-text-faint\` \`ml-disabled\`
\`ml-skeleton\` \`ml-spinner\`.

---

## 13. Changelog

| Version | Date | Description |
|---------|------|--------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
| 1.1.0 | 2026-04-21 | Removed implementation code; skill defines contract only |
| draft | 2026-08-21 | **Not adopted.** Optional row-lifecycle surface added, measured off \`ml-inline-edit-table\` |
`;
