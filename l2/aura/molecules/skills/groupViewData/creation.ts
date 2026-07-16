/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewData/creation.ts" enhancement="_blank"/>

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

## 8. Design Tokens

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

## 9. Possible Implementations

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

## 10. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-13 | Initial contract definition |
| 1.1.0 | 2026-04-13 | Removed view-specific properties; focus on data structure only |

`
