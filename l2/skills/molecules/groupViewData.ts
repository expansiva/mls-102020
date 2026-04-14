/// <mls fileReference="_102020_/l2/skills/molecules/groupViewData.ts" enhancement="_blank"/>

export const skill = `
# Skill: view + data

## Metadata

- **Name:** viewData
- **Version:** 1.1.0
- **Category:** Data Display
- **Last Updated:** 13/04/2026

---

## Short Description

> **view + data**: Adaptive visualization of data collection. Display multiple records with defined fields and rich content. The component implementation decides the best presentation format.

---

## Definition

### Essence

Allow the user to **visualize a collection of data**. The group defines the data structure (columns, rows, cells), and each component implementation decides how to render it.

### When to Use

- Display collection of records
- Multiple fields per record
- Rich content in cells (badges, actions, composed layouts)
- When you need a standardized data structure

### When NOT to Use

- Single metrics → use **view + metric**
- Hierarchical data → use **view + hierarchy**
- Charts/graphs → use **view + chart**

### Possible Implementations

- Data Table
- Card Grid
- List View
- Responsive View (adapts to viewport)
- Compact Table
- Kanban Board

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| \`loading\` | \`boolean\` | \`false\` | | \`@property\` | Shows loading state |
| \`selectable\` | \`boolean\` | \`false\` | | \`@property\` | Enables row/item selection |
| \`hoverable\` | \`boolean\` | \`true\` | | \`@property\` | Highlight on hover |

> **Note:** Additional properties may be added by specific implementations (e.g., \`striped\`, \`bordered\` for table implementations).

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| \`row-click\` | \`{ index: number, data: Element }\` | Fired when a row/item is clicked |
| \`selection-change\` | \`{ selected: number[] }\` | Fired when selection changes |

---

## Slot Tags

Slot tags are **unknown HTML elements** (not registered Custom Elements). The parent component reads and interprets these tags to build its structure.

**Important:** Use ONLY the tags defined below. Do NOT create custom tags.

### Summary

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`<Columns>\` | ✓ | Container for column definitions |
| \`<Column>\` | ✓ (min. 1) | Defines a column/field |
| \`<Rows>\` | ✓ | Container for data rows |
| \`<Row>\` | ✓ (min. 1) | A data row/item |
| \`<Cell>\` | ✓ | A data cell |
| \`<Empty>\` | | Empty state content |
| \`<Loading>\` | | Loading state content |

---

### \`<Columns>\`

Container for column definitions. **Required.**

**Accepts:** \`<Column>\`

\`\`\`html
<Columns>
  <Column field="id" header="ID" />
  <Column field="name" header="Name" />
</Columns>
\`\`\`

---

### \`<Column>\`

Defines a column/field. **Required** (minimum 1).

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| \`field\` | \`string\` | ✓ | Field identifier (for reference) |
| \`header\` | \`string\` | ✓ | Header/label text |
| \`width\` | \`string\` | | Suggested width (e.g., "100px", "20%") |
| \`align\` | \`'left' \| 'center' \| 'right'\` | | Content alignment |
| \`hidden\` | \`boolean\` | | Hides the column |

**Accepts:** None (self-closing)

\`\`\`html
<Column field="id" header="Order ID" width="120px" />
<Column field="status" header="Status" align="center" />
<Column field="internal" header="Internal" hidden />
\`\`\`

---

### \`<Rows>\`

Container for data rows. **Required.**

**Accepts:** \`<Row>\`

\`\`\`html
<Rows>
  <Row>...</Row>
  <Row>...</Row>
</Rows>
\`\`\`

---

### \`<Row>\`

A data row/item. **Required** (minimum 1 for non-empty state).

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| \`selected\` | \`boolean\` | | Marks row as selected |
| \`disabled\` | \`boolean\` | | Disables row interaction |

**Accepts:** \`<Cell>\`

\`\`\`html
<Row>
  <Cell>Value 1</Cell>
  <Cell>Value 2</Cell>
</Row>

<Row selected>
  <Cell>Selected Row</Cell>
</Row>

<Row disabled>
  <Cell>Disabled Row</Cell>
</Row>
\`\`\`

---

### \`<Cell>\`

A data cell. **Required** (should match number of Columns).

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| \`colspan\` | \`number\` | | Span multiple columns |

**Accepts:** Any content (text, elements, components)

\`\`\`html
<!-- Simple text -->
<Cell>John Doe</Cell>

<!-- Composed content -->
<Cell>
  <div class="font-medium">William Little</div>
  <div class="text-sm text-slate-500">william@email.com</div>
</Cell>

<!-- Badge -->
<Cell>
  <span class="badge badge-success">Active</span>
</Cell>

<!-- Actions -->
<Cell>
  <div class="flex gap-2">
    <button>Edit</button>
    <button>Delete</button>
  </div>
</Cell>
\`\`\`

---

### \`<Empty>\`

Displayed when there are no rows.

**Accepts:** Any content

\`\`\`html
<Empty>
  <div class="text-center py-8">
    <span class="text-4xl">📭</span>
    <p class="mt-2 text-slate-500">No records found</p>
  </div>
</Empty>
\`\`\`

---

### \`<Loading>\`

Displayed when \`loading\` property is true.

**Accepts:** Any content

\`\`\`html
<Loading>
  <div class="text-center py-8">
    <Spinner />
    <p class="mt-2">Loading...</p>
  </div>
</Loading>
\`\`\`

---

## Slot Hierarchy

\`\`\`
component (root)
├── <Columns>
│   └── <Column>
├── <Rows>
│   └── <Row>
│       └── <Cell>
├── <Empty>
└── <Loading>
\`\`\`

| Tag | Valid Parents |
|-----|---------------|
| \`<Columns>\` | root |
| \`<Column>\` | \`<Columns>\` |
| \`<Rows>\` | root |
| \`<Row>\` | \`<Rows>\` |
| \`<Cell>\` | \`<Row>\` |
| \`<Empty>\` | root |
| \`<Loading>\` | root |

---

## Validation Rules

| Rule | Type | Message |
|------|------|---------|
| \`<Columns>\` missing | error | \`Missing required slot <Columns>\` |
| \`<Rows>\` missing | error | \`Missing required slot <Rows>\` |
| No \`<Column>\` in Columns | error | \`At least 1 <Column> is required inside <Columns>\` |
| \`<Column>\` without \`field\` | error | \`<Column> requires attribute "field"\` |
| \`<Column>\` without \`header\` | error | \`<Column> requires attribute "header"\` |
| Unknown tag found | warning | \`Unknown slot <TagName> ignored\` |

---

## Row States

| State | Description |
|-------|-------------|
| **default** | Normal state |
| **hover** | Mouse over (if hoverable) |
| **selected** | Row is selected |
| **disabled** | Row interaction disabled |

---

## Accessibility (Recommended)

| Attribute | Application |
|-----------|-------------|
| \`aria-busy\` | When loading is true |
| \`aria-selected\` | On selected rows |
| \`aria-disabled\` | On disabled rows |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 13/04/2026 | Initial contract definition |
| 1.1.0 | 13/04/2026 | Removed view-specific properties. Focus on data structure only |

`