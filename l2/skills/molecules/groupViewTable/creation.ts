/// <mls fileReference="_102020_/l2/skills/molecules/groupViewTable/creation.ts" enhancement="_blank"/>

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

\`\`\`typescript
slotTags = ['Caption', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell', 'TableFooter', 'Empty', 'Loading'];
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
│       └── <TableCell>
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

## 9. Pagination

When \`pageSize > 0\`:

- Calculate total pages: \`Math.ceil(totalItems / pageSize)\`
- Render pagination controls below the table (prev, page numbers, next)
- On page click: update \`page\`, emit \`pageChange\`
- The page listens to \`pageChange\` and updates the \`<TableBody>\` content via BFF

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