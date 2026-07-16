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
| \`value\` | \`string\` | \`''\` | Comma-separated selected row indices (e.g. \`"0,2,5"\`) when selectable |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`selectable\` | \`boolean\` | \`false\` | Enable row selection with checkboxes |
| \`is-editing\` | \`boolean\` | \`false\` | Propagates \`is-editing\` attribute to web components inside cells |
| \`page\` | \`number\` | \`1\` | Current page number (1-based) |
| \`page-size\` | \`number\` | \`0\` | Rows per page (0 = no pagination) |
| \`total-items\` | \`number\` | \`0\` | Total number of items for pagination |
| \`disabled\` | \`boolean\` | \`false\` | Disables all interaction |
| \`loading\` | \`boolean\` | \`false\` | Shows loading state |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: string }\` | Selection changed (comma-separated row indices) |
| \`sort\` | \`{ key: string, direction: string }\` | Column sort triggered |
| \`pageChange\` | \`{ page: number }\` | Page navigation triggered |
| \`rowClick\` | \`{ index: number }\` | Row clicked |

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