/// <mls fileReference="_102020_/l2/skills/molecules/groupViewTable.ts" enhancement="_blank"/>

export const skill = `

# Skill: view + table

## Metadata

- **Name:** viewTable
- **Version:** 1.0.0
- **Category:** Data Display
- **Last Updated:** 04/02/2026

---

## Definition

### Essence

Allow the user to **visualize structured data** in tabular format.

### When to Use

- Display list of records
- Compare data across columns
- Show structured information
- CRUD interfaces

### When NOT to Use

- Few items with visual identity → use **view + cards**
- Hierarchical data → use **view + hierarchy**
- Single metrics → use **view + metric**

### Possible Implementations

- Data Table (full-featured)
- Table (simple display)
- Editable Grid
- Virtualized Table
- Tree Table

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| \`loading\` | \`boolean\` | \`false\` | | \`@property\` | Shows loading state |
| \`striped\` | \`boolean\` | \`false\` | | \`@property\` | Zebra-striped rows |
| \`hoverable\` | \`boolean\` | \`true\` | | \`@property\` | Highlight row on hover |
| \`bordered\` | \`boolean\` | \`false\` | | \`@property\` | Borders on all cells |
| \`compact\` | \`boolean\` | \`false\` | | \`@property\` | Reduced padding |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| \`@property\` | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| \`row-click\` | \`{ index: number, row: Element }\` | Fired when a row is clicked |

---

## Slot Tags

Slot tags are **unknown HTML elements** (not registered Custom Elements). The parent component reads and interprets these tags to build its structure.

### Summary

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`<TableHeader>\` | ✓ | Header section container |
| \`<TableBody>\` | ✓ | Body section container |
| \`<TableRow>\` | ✓ | A table row |
| \`<TableHead>\` | ✓ | Header cell |
| \`<TableCell>\` | ✓ | Data cell |
| \`<TableFooter>\` | | Footer section container |
| \`<Caption>\` | | Table caption/title |
| \`<Empty>\` | | Empty state content |
| \`<Loading>\` | | Loading state content |


### \`<Caption>\`

Table caption or title. Usually displayed above the table.

**Accepts:** Any content (text, elements)

\`\`\`html
<Caption>List of Users</Caption>
\`\`\`

---

### \`<TableHeader>\`

Container for header rows. **Required.**

**Accepts:** \`<TableRow>\`

\`\`\`html
<TableHeader>
  <TableRow>
    <TableHead>Name</TableHead>
    <TableHead>Email</TableHead>
  </TableRow>
</TableHeader>
\`\`\`

---

### \`<TableBody>\`

Container for data rows. **Required.**

**Accepts:** \`<TableRow>\`

\`\`\`html
<TableBody>
  <TableRow>
    <TableCell>John Doe</TableCell>
    <TableCell>john@email.com</TableCell>
  </TableRow>
</TableBody>
\`\`\`

---

### \`<TableFooter>\`

Container for footer rows.

**Accepts:** \`<TableRow>\`

\`\`\`html
<TableFooter>
  <TableRow>
    <TableCell colspan="2">Total: 100 records</TableCell>
  </TableRow>
</TableFooter>
\`\`\`

---

### \`<TableRow>\`

A table row. **Required** (minimum 1 in header and body).

**Accepts:** \`<TableHead>\` (inside TableHeader) or \`<TableCell>\` (inside TableBody/TableFooter)

\`\`\`html
<TableRow>
  <TableCell>Data 1</TableCell>
  <TableCell>Data 2</TableCell>
</TableRow>
\`\`\`

---

### \`<TableHead>\`

A header cell. **Required** (minimum 1).

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| \`colspan\` | \`number\` | | Span multiple columns |
| \`rowspan\` | \`number\` | | Span multiple rows |

**Accepts:** Any content (text, icons, sort indicators)

\`\`\`html
<TableHead>Name</TableHead>
<TableHead colspan="2">Contact Info</TableHead>
\`\`\`

---

### \`<TableCell>\`

A data cell. **Required** (minimum 1 per row).

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| \`colspan\` | \`number\` | | Span multiple columns |
| \`rowspan\` | \`number\` | | Span multiple rows |

**Accepts:** Any content (text, badges, buttons, etc.)

\`\`\`html
<TableCell>John Doe</TableCell>
<TableCell>
  <Badge>Active</Badge>
</TableCell>
<TableCell>
  <Button size="sm">Edit</Button>
</TableCell>
\`\`\`

---

### \`<Empty>\`

Displayed when there are no rows in the table.

**Accepts:** Any content

\`\`\`html
<Empty>
  <Icon name="inbox" />
  <span>No records found</span>
</Empty>
\`\`\`

---

### \`<Loading>\`

Displayed when the table is in loading state.

**Accepts:** Any content

\`\`\`html
<Loading>
  <Spinner />
  <span>Loading data...</span>
</Loading>
\`\`\`

---

## Slot Hierarchy

\`\`\`
component (root)
│── <Caption>
│── <TableHeader>
│   └── <TableRow>
│       └── <TableHead>
│── <TableBody>
│   └── <TableRow>
│       └── <TableCell>
│── <TableFooter>
│       └── <TableRow>
│           └── <TableCell>
├── <Empty>
└── <Loading>
\`\`\`

| Tag | Valid Parents |
|-----|---------------|
| \`<Caption>\` | \`<Table>\` |
| \`<TableHeader>\` | \`<Table>\` |
| \`<TableBody>\` | \`<Table>\` |
| \`<TableFooter>\` | \`<Table>\` |
| \`<TableRow>\` | \`<TableHeader>\`, \`<TableBody>\`, \`<TableFooter>\` |
| \`<TableHead>\` | \`<TableRow>\` (inside TableHeader) |
| \`<TableCell>\` | \`<TableRow>\` (inside TableBody or TableFooter) |
| \`<Empty>\` | root |
| \`<Loading>\` | root |

---

## Validation Rules

### Slot Validation

| Rule | Type | Message |
|------|------|---------|
| \`<TableHeader>\` missing | error | \`Missing required slot <TableHeader>\` |
| \`<TableBody>\` missing | error | \`Missing required slot <TableBody>\` |
| No \`<TableRow>\` in header | error | \`At least 1 <TableRow> is required inside <TableHeader>\` |
| No \`<TableHead>\` in header row | error | \`At least 1 <TableHead> is required inside header <TableRow>\` |
| Unknown tag found | warning | \`Unknown slot <TagName> ignored\` |
| Tag in invalid position | warning | \`<TagName> is not valid inside <ParentTag>, ignored\` |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows table with data |
| **loading** | Loading data | Shows loading indicator, hides body |
| **empty** | No data | Shows empty state message |
| **striped** | Zebra rows | Alternating row background colors |
| **hoverable** | Row hover | Highlight row on mouse over |

### Row States

| State | Description |
|-------|-------------|
| **default** | Normal row |
| **hover** | Mouse over row |
| **selected** | Row is selected (if selection enabled) |

### Cell States

| State | Description |
|-------|-------------|
| **default** | Normal cell |
| **truncated** | Content overflow with ellipsis |

---

## Accessibility (Recommended)

### Semantic Structure

| Element | Renders As |
|---------|------------|
| \`<Caption>\` | \`<caption>\` |
| \`<TableHeader>\` | \`<thead>\` |
| \`<TableBody>\` | \`<tbody>\` |
| \`<TableFooter>\` | \`<tfoot>\` |
| \`<TableRow>\` | \`<tr>\` |
| \`<TableHead>\` | \`<th scope="col">\` |
| \`<TableCell>\` | \`<td>\` |

### ARIA

| Attribute | Application |
|-----------|-------------|
| \`role="table"\` | Applied automatically via semantic HTML |
| \`aria-busy\` | When loading is true |
| \`aria-rowcount\` | Total number of rows (if known) |
| \`aria-colcount\` | Total number of columns |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| \`Tab\` | Move between interactive elements in cells |
| \`Arrow Keys\` | Navigate between cells (if cell navigation enabled) |

---

Each implementation decides internally:
- Visual styling (spacing, borders, colors)
- Additional features (sorting, filtering, pagination)
- How it renders each slot tag

The contract ensures **structural compatibility** across all implementations in the group.

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 04/02/2026 | Initial contract definition |
`