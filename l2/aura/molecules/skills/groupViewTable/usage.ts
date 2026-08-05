/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewTable/usage.ts" enhancement="_blank"/>

export const skill = `
# view + table — Usage

> Quick reference for using molecules in the **view + table** group.
> Use this when the user needs to **visualize structured data in tabular format**.
> All implementations share the same slot tag contract.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Caption\` | Table caption/title |
| \`TableHeader\` | Header section container |
| \`TableBody\` | Body section container |
| \`TableRow\` | A table row (inside TableHeader, TableBody, TableFooter) |
| \`TableHead\` | Header cell. Attributes: \`key\` (required), \`sortable\` (presence) |
| \`TableCell\` | Data cell. May contain text or web components |
| \`TableFooter\` | Footer section container |
| \`Empty\` | Content shown when no rows exist |
| \`Loading\` | Content shown during loading state |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string\` | \`''\` | Comma-separated selected row indices (e.g. \`"0,2,5"\`). Drives the selected-row highlight **independently of \`selectable\`** — set it to mark a row without any checkbox column |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`selectable\` | \`boolean\` | \`false\` | Renders the per-row checkbox column. It does NOT gate the highlight — see \`value\` |
| \`is-editing\` | \`boolean\` | \`false\` | Propagates \`is-editing\` attribute to web components inside cells |
| \`page\` | \`number\` | \`1\` | Current page number (1-based) |
| \`page-size\` | \`number\` | \`0\` | Rows per page (0 = no pagination) |
| \`total-items\` | \`number\` | \`0\` | Total number of items. **Leaving it at 0 is what selects INTERNAL mode** — see below |

### Pagination and sorting: pick one of the two modes

| | write all rows in \`<TableBody>\`, leave \`total-items\` at \`0\` | write only the current page, set \`total-items\` to the full count |
|---|---|---|
| mode | **INTERNAL** | **EXTERNAL** |
| who sorts | the molecule, over the whole set | **you**, over the whole set |
| who slices the page | the molecule | you, on \`pageChange\` |
| what you write | everything once | requery on \`sort\` and on \`pageChange\` |

**Do not mix them.** In EXTERNAL mode the molecule does not reorder rows — it holds a single page,
and reordering there would order 10 rows out of 60. It still emits \`sort\` so you can requery.
If you sort in your page **and** expect the molecule to sort too, the result is rows ordered by
one criterion carrying content from another.
| \`disabled\` | \`boolean\` | \`false\` | Disables all interaction |
| \`loading\` | \`boolean\` | \`false\` | Shows loading state |
| \`fit-height\` | \`boolean\` | \`false\` | Take the container's height instead of growing with the rows: **only the body scrolls**, the column header stays stuck to the top, and pagination stays visible at the bottom without scrolling. Use it whenever the table lives inside a bounded viewport (split view, side panel) — without it the rows push pagination out of sight. Requires the parent to have a defined height |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: string }\` | Selection changed (comma-separated row indices) |
| \`sort\` | \`{ key: string, direction: string }\` | Column sort triggered |
| \`pageChange\` | \`{ page: number }\` | Page navigation triggered |
| \`rowClick\` | \`{ index: number }\` | Row clicked. Does NOT select by itself: selection is a controlled prop, so echo the choice back through \`value\` or the row stays unmarked |

---

## Examples

### Simple data table with sorting

\`\`\`html
<molecules--data-table-102020>
  <Caption>Order List</Caption>
  <TableHeader>
    <TableRow>
      <TableHead key="id" sortable>ID</TableHead>
      <TableHead key="customer" sortable>Customer</TableHead>
      <TableHead key="total" sortable>Total</TableHead>
      <TableHead key="status">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>#001</TableCell>
      <TableCell>John Doe</TableCell>
      <TableCell>$150.00</TableCell>
      <TableCell>Completed</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>#002</TableCell>
      <TableCell>Jane Smith</TableCell>
      <TableCell>$89.50</TableCell>
      <TableCell>Pending</TableCell>
    </TableRow>
  </TableBody>
  <Empty>No orders found</Empty>
</molecules--data-table-102020>
\`\`\`

---

## Customization via data-class

### On the component host

Pass extra CSS classes via \`data-class\`:

\`\`\`html
<component data-class="w-full mt-4">
  <Label>Text</Label>
</component>
\`\`\`

### On slot tags

Pass CSS classes on slot tags via \`data-class\`:

\`\`\`html
<component>
  <Label data-class="uppercase tracking-wide">Text</Label>
  <Helper data-class="italic">Help text</Helper>
</component>
\`\`\`

---

## Design Tokens

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom properties on a parent element:

\`\`\`css
.my-container {
  --ml-primary: #7c3aed;
  --ml-radius-sm: 10px;
  --ml-font-family: 'Inter', sans-serif;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-surface\` | \`#ffffff\` | Component background |
| \`--ml-surface-dim\` | \`#f5f5f5\` | Hover background |
| \`--ml-on-surface\` | \`#1c1b1f\` | Primary text |
| \`--ml-on-surface-muted\` | \`#49454f\` | Secondary text |
| \`--ml-on-surface-faint\` | \`#79747e\` | Placeholder |
| \`--ml-primary\` | \`#3b82f6\` | Primary action color |
| \`--ml-on-primary\` | \`#ffffff\` | Text on primary |
| \`--ml-error\` | \`#ef4444\` | Error color |
| \`--ml-on-error\` | \`#ffffff\` | Text on error |
| \`--ml-outline-variant\` | \`#e2e8f0\` | Default border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-radius-sm\` | \`6px\` | Default radius |
| \`--ml-shadow-1\` | \`0 1px 3px rgba(0,0,0,0.1)\` | Subtle shadow |
| \`--ml-font-family\` | \`system-ui, sans-serif\` | Font family |
| \`--ml-font-weight-medium\` | \`500\` | Medium weight |
| \`--ml-transition\` | \`200ms ease\` | Transition |
| \`--ml-focus-ring-color\` | \`rgba(59,130,246,0.4)\` | Focus ring |
| \`--ml-disabled-opacity\` | \`0.5\` | Disabled opacity |

`;