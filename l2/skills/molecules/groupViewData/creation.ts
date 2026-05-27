/// <mls fileReference="_102020_/l2/skills/molecules/groupViewData/creation.ts" enhancement="_blank"/>

export const skill = `# groupViewData — Creation

> Implementation reference for creating molecules in the **groupViewData** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupViewData\` |
| **Category** | Data Display |
| **Version** | \`1.1.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Columns\` | ✓ | Container for column definitions |
| \`Column\` | ✓ (min. 1) | Defines a column/field |
| \`Rows\` | ✓ | Container for data rows |
| \`Row\` | ✓ (min. 1) | A data row/item |
| \`Cell\` | ✓ | A data cell — accepts any content |
| \`Empty\` | No | Displayed when there are no rows |
| \`Loading\` | No | Displayed when \`loading\` is true |

\`\`\`typescript
slotTags = ['Columns', 'Column', 'Rows', 'Row', 'Cell', 'Empty', 'Loading'];
\`\`\`

### Slot Hierarchy

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

| Tag | Valid Parent |
|-----|-------------|
| \`Columns\` | root |
| \`Column\` | \`Columns\` |
| \`Rows\` | root |
| \`Row\` | \`Rows\` |
| \`Cell\` | \`Row\` |
| \`Empty\` | root |
| \`Loading\` | root |

### Column attributes

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| \`field\` | \`string\` | ✓ | Field identifier |
| \`header\` | \`string\` | ✓ | Header/label text |
| \`width\` | \`string\` | | Suggested width (e.g., \`"120px"\`, \`"20%"\`) |
| \`align\` | \`'left' \| 'center' \| 'right'\` | | Content alignment |
| \`hidden\` | \`boolean\` | | Hides the column |

### Row attributes

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| \`selected\` | \`boolean\` | | Marks row as selected |
| \`disabled\` | \`boolean\` | | Disables row interaction |

### Cell attributes

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| \`colspan\` | \`number\` | | Span multiple columns |

---

## 3. Properties

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Shows loading state — renders \`<Loading>\` slot if present |
| \`selectable\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Enables row/item selection |
| \`hoverable\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Highlights row/item on hover |

> Additional properties may be added by specific implementations (e.g., \`striped\`, \`bordered\` for table implementations).

---

## 4. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`row-click\` | \`{ index: number, data: Element }\` | ✓ | Fired when a row/item is clicked |
| \`selection-change\` | \`{ selected: number[] }\` | ✓ | Fired when the selection changes |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('row-click', {
  bubbles: true,
  composed: true,
  detail: { index: rowIndex, data: rowElement }
}));
\`\`\`

---

## 5. Validation Rules

| Rule | Type | Message |
|------|------|---------|
| \`<Columns>\` missing | error | \`Missing required slot <Columns>\` |
| \`<Rows>\` missing | error | \`Missing required slot <Rows>\` |
| No \`<Column>\` inside Columns | error | \`At least 1 <Column> is required inside <Columns>\` |
| \`<Column>\` without \`field\` | error | \`<Column> requires attribute "field"\` |
| \`<Column>\` without \`header\` | error | \`<Column> requires attribute "header"\` |
| Unknown tag found | warning | \`Unknown slot <TagName> ignored\` |

---

## 6. Visual States

| State | Behavior |
|-------|----------|
| **Default** | Normal row/item appearance |
| **Hover** | Subtle highlight on row/item (when \`hoverable=true\`) |
| **Selected** | Row/item visually marked as selected |
| **Disabled** | Row/item at reduced opacity, no interaction |
| **Loading** | Renders \`<Loading>\` slot content; hides rows |
| **Empty** | Renders \`<Empty>\` slot content when no rows exist |

---

## 7. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Busy state | \`aria-busy="true"\` when \`loading\` is true |
| Selected rows | \`aria-selected="true"\` on selected rows/items |
| Disabled rows | \`aria-disabled="true"\` on disabled rows/items |

---

## 8. Possible Implementations

| Component | Description |
|-----------|-------------|
| **Data Table** | Traditional tabular layout with header row and data rows |
| **Card Grid** | Each row rendered as a card in a responsive grid |
| **List View** | Compact vertical list, one row per item |
| **Responsive View** | Adapts between table and card based on viewport width |
| **Compact Table** | Dense table for high-information-density contexts |
| **Kanban Board** | Rows grouped by a status column into lanes |

All implementations share the same slot tag contract and events — they are fully interchangeable by swapping the component tag.

---

## 9. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-13 | Initial contract definition |
| 1.1.0 | 2026-04-13 | Removed view-specific properties; focus on data structure only |

`
