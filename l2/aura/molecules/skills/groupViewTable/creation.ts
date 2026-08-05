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
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Caption\` | No | Table caption/title |
| \`TableHeader\` | Yes | Header section container |
| \`TableBody\` | Yes | Body section container |
| \`TableRow\` | Yes | A table row (used inside TableHeader, TableBody, TableFooter) |
| \`TableHead\` | Yes | Header cell. Attributes: \`key\` (required, column identifier), \`sortable\` (presence) |
| \`TableCell\` | Yes | Data cell. May contain text or web components |
| \`TableFooter\` | No | Footer section container |
| \`Empty\` | No | Content shown when TableBody has no rows |
| \`Loading\` | No | Content shown during loading state |
| \`Detail\` | No | Content shown when a record is expanded. Only implementations that offer expansion read it — see **Detail Slot** below |

\`\`\`typescript
// Drop 'Detail' from the array if the molecule has no row-expansion feature.
slotTags = ['Caption', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell', 'TableFooter', 'Empty', 'Loading', 'Detail'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Caption>
├── <TableHeader>
│   └── <TableRow>
│       └── <TableHead key="..." sortable>
├── <TableBody>
│   └── <TableRow>
│       ├── <TableCell>
│       └── <Detail>          (optional, expansion only)
├── <TableFooter>
│   └── <TableRow>
│       └── <TableCell>
├── <Empty>
└── <Loading>
\`\`\`

### TableHead Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| \`key\` | \`string\` | Column identifier, used for sorting |
| \`sortable\` | \`boolean\` (presence) | Column can be sorted |

### Detail Slot — row detail

Holds what appears when a record is expanded: the detail row shown immediately below its record.

| Rule | Value |
|------|-------|
| Where | Direct child of \`<TableRow>\`, inside \`<TableBody>\` **only** — never in TableHeader or TableFooter |
| How many | One per \`<TableRow>\`. Read it as \`:scope > Detail\`, so a nested one is not found |
| Accepts | Text, web components, another table — the same freedom as \`<TableCell>\` |
| Who fills it | The **consumer**, usually after \`rowClick\` (the lazy flow). Empty until then is a valid state, not a defect |

**Only implementations that offer expansion read it.** A molecule in this group without a
row-expansion feature simply leaves \`Detail\` out of its \`slotTags\`, and ignoring the slot is not a
contract violation.

**It must be a LIVE slot** — \`usesLiveSlots\` with \`renderLiveSlotFrom(detailEl)\`, never the
serialized path. Detail content is exactly where consumers put buttons and nested tables, and
serializing a slot destroys their handlers and component identity.

A molecule that DOES declare \`Detail\` has to carry it all the way: list it among the content areas
of its own \`.defs.ts\` and exercise it in its playground. The playground's slot list is generated
from the defs, so a slot missing there produces a demo whose detail area opens blank — measured on
2026-08-05 with \`ml-lazy-record-detail-table\`.

> ⚠️ **Do not build the detail row by re-projecting the record's own \`<TableCell>\` nodes.** A live
> slot MOVES nodes, and \`renderLiveSlotFrom\` keys the anchor by source ELEMENT — so a cell projected
> into both the record row and the detail row gives two anchors ONE key, and the second steals the
> nodes from the first. The visible cells go empty the moment the row expands. That is inherent to
> moving, not a bug to work around: the detail needs a source of its own, which is what \`<Detail>\`
> is for.

**Not a general accordion.** To expand arbitrary content that is not a record inside a table, the
group is \`groupExpandContent\`.

---

## 3. Properties

### 3.1 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`selectable\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Enable row selection with checkboxes |
| \`isEditing\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Propagates \`is-editing\` attribute to all web components inside cells |
| \`page\` | \`number\` | \`1\` | \`@propertyDataSource\` | Current page number (1-based) |
| \`pageSize\` | \`number\` | \`0\` | \`@propertyDataSource\` | Rows per page (0 = no pagination, show all) |
| \`totalItems\` | \`number\` | \`0\` | \`@propertyDataSource\` | Total number of items (for calculating total pages) |

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
| \`rowClick\` | \`{ index: number }\` | ✓ | Row clicked (not from checkbox selection) |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('sort', {
  bubbles: true,
  composed: true,
  detail: { key: this.sortKey, direction: this.sortDirection }
}));

this.dispatchEvent(new CustomEvent('pageChange', {
  bubbles: true,
  composed: true,
  detail: { page: 2 }
}));
\`\`\`

---

## 6. isEditing Propagation

When \`isEditing\` changes, the table must propagate the \`is-editing\` attribute to all web components (custom elements) found inside \`<TableCell>\` elements. This ensures child components switch between view and edit mode automatically.

- Propagate on first render and whenever \`isEditing\` changes
- Only target custom elements (tags containing a hyphen)
- Set \`is-editing="true"\` or \`is-editing="false"\`

---

## 7. Sorting

- The component handles sorting internally by reordering \`<TableRow>\` elements inside \`<TableBody>\`
- Clicking a sortable \`<TableHead>\` toggles between ascending and descending order
- Sort is based on the text content of the cell at the matching column index
- After sorting, emit \`sort\` event with \`{ key, direction }\`

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

The consumer wrote all rows in \`<TableBody>\` and did not set \`total-items\` (or set it to the
same count). Then the molecule owns both operations:

- total pages: \`Math.ceil(rowCount / pageSize)\`
- **sorts the whole set**, then slices to the current page
- emits \`sort\` and \`pageChange\` so the consumer can mirror the state — but does not depend on it

Simplest mode for a consumer with data already in hand. Prefer it in demo and internal pages.

### 9.2 EXTERNAL mode — the consumer already sliced

The consumer queried a BFF and wrote only the current page, setting \`total-items\` to the full
count. Then:

- total pages: \`Math.ceil(totalItems / pageSize)\`
- **the molecule MUST NOT reorder**: it holds one page, so sorting there would order 10 rows out
  of 60. It renders in the order received
- it still emits \`sort\` (with \`key\` and \`direction\`) and \`pageChange\`; the consumer requeries
  and rewrites \`<TableBody>\`

> **Why "must not reorder" is not a style preference.** Clicking the header makes the molecule
> schedule its own render *before* it emits \`sort\`. So the molecule's render runs first and reads
> the PREVIOUS cell text, while the consumer updates those same projected nodes right after —
> producing rows ordered by old values carrying new content. Measured on 2026-08-04 with
> \`mls-102053/l2/demo/tabela-responsiva\`. On top of that, sorting by cell TEXT breaks any column
> whose text does not order like the data (\`01/12/2025\` before \`02/01/2026\`, masked currency,
> status labels) — which the consumer, holding the real values, orders correctly.

### 9.3 Known limitation of the signal

\`totalItems > rowCount\` is a heuristic. It cannot tell INTERNAL apart from a consumer that
sliced **and** set \`total-items\` equal to the number of rows sent. An explicit property
(\`sort-mode\`, for example) would remove the ambiguity, and is an open item for the group.

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

| Requirement | Implementation |
|-------------|----------------|
| Table | \`role="table"\` or native \`<table>\` |
| Caption | \`<caption>\` or \`aria-label\` |
| Header | \`role="rowgroup"\` |
| Header cells | \`role="columnheader"\`, \`aria-sort\` when sortable |
| Body | \`role="rowgroup"\` |
| Rows | \`role="row"\` |
| Cells | \`role="cell"\` |
| Select all | \`aria-label="Select all rows"\` |
| Row checkbox | \`aria-label="Select row N"\` |
| Pagination | \`role="navigation"\`, \`aria-label="Table pagination"\` |
| Keyboard | \`ArrowUp\`/\`ArrowDown\` navigate rows; \`Space\` toggles selection; \`Enter\` on header sorts |

---

## 12. Design Tokens

### Tokens

This group uses CSS custom properties (tokens) for all visual styling.
All tokens are consumed in the .less file via var(--ml-token, fallback).
The fallback ensures the component renders without external configuration.

#### Surface and text
- --ml-surface (#ffffff) — background
- --ml-surface-dim (#f5f5f5) — hover background
- --ml-on-surface (#1c1b1f) — primary text
- --ml-on-surface-muted (#49454f) — secondary text
- --ml-on-surface-faint (#79747e) — placeholder

#### Action and feedback
- --ml-primary (#3b82f6) — primary action color
- --ml-on-primary (#ffffff) — text on primary
- --ml-error (#ef4444) — error color
- --ml-on-error (#ffffff) — text on error

#### Border and shape
- --ml-outline-variant (#e2e8f0) — default border
- --ml-outline-focus (#3b82f6) — focus border
- --ml-outline-error (#ef4444) — error border
- --ml-radius-sm (6px) — default radius
- --ml-radius-full (9999px) — circular radius
- --ml-border-width (1px) — border thickness
- --ml-border-style (solid) — border style

#### Elevation, typography, motion, focus, state
- --ml-shadow-0 (none) — no shadow
- --ml-shadow-1 (0 1px 3px rgba(0,0,0,0.1)) — subtle shadow
- --ml-shadow-2 (0 4px 6px rgba(0,0,0,0.1)) — medium shadow
- --ml-font-family (system-ui, -apple-system, sans-serif) — font
- --ml-font-weight-medium (500) — medium weight
- --ml-transition (200ms ease) — default transition
- --ml-focus-ring-color (rgba(59,130,246,0.4)) — focus ring color
- --ml-focus-ring-width (2px) — focus ring width
- --ml-disabled-opacity (0.5) — disabled opacity

### data-class

The component accepts \`data-class\` for consumer-provided CSS classes:
- On host: \`<component data-class="w-full mt-4">\`
- On slots: \`<Label data-class="uppercase tracking-wide">\`

### Shared semantic classes

| Class | Purpose |
|-------|---------|
| ml-label | Field label |
| ml-helper | Helper text |
| ml-error-text | Error message |
| ml-text | Default text |
| ml-text-muted | Secondary text |
| ml-text-faint | Placeholder text |
| ml-disabled | Disabled state |
| ml-skeleton | Loading placeholder |
| ml-spinner | Loading spinner |

Group-specific semantic classes will be defined during component migration.

---

## 13. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
| 1.1.0 | 2026-04-21 | Removed implementation code; skill defines contract only |
`;