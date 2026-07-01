/// <mls fileReference="_102020_/l2/skills/molecules/groupViewChart/creation.ts" enhancement="_blank"/>

export const skill = `
# groupViewChart — Creation

> Implementation reference for creating molecules in the **groupViewChart** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupViewChart\` |
| **Category** | Data Display |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Chart title displayed above the chart |
| \`Series\` | No | Named data series. Attributes: \`name\` (required), \`color\`. Contains \`<Point>\` children |
| \`Point\` | Yes | Single data point. Attributes: \`label\` (required), \`value\` (required), \`color\` |
| \`Empty\` | No | Content shown when no data is provided |

\`\`\`typescript
slotTags = ['Label', 'Series', 'Point', 'Empty'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Label>
├── <Series name="..." color="...">
│   └── <Point label="..." value="..." />
├── <Point label="..." value="..." color="..." />
└── <Empty>
\`\`\`

### Single Series vs Multi Series

- **Multi series:** \`<Point>\` inside \`<Series>\`. Each series has its own \`name\` and \`color\`
- **Single series:** \`<Point>\` directly in the root (no \`<Series>\` wrapper). Used for Pie, Donut, Funnel, and simple charts. Each Point can have its own \`color\`

---

## 3. Properties

### 3.1 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`showLegend\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Display the legend |
| \`showValues\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Display numeric values on data points |

### 3.2 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state — show placeholder instead of chart |

---

## 4. Value Contract

This component has **no \`value\` property**. It is a display-only component. Data comes entirely from slot tags.

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`pointClick\` | \`{ label: string, value: number, series?: string }\` | ✓ | Fired when the user clicks a data point |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('pointClick', {
  bubbles: true,
  composed: true,
  detail: { label: 'Jan', value: 1200, series: '2024' }
}));
\`\`\`

---

## 6. Reading Data

- **Multi series:** read \`<Series>\` elements, each containing nested \`<Point>\` elements. Series has \`name\` and \`color\` attributes. Points have \`label\` and \`value\`
- **Standalone points:** read root-level \`<Point>\` elements (not inside a \`<Series>\`). Each has \`label\`, \`value\`, and optional \`color\`
- Use \`getSlots\` from the base class to read slot tag elements from the template

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Chart rendered with data |
| **Loading** | Placeholder or skeleton instead of chart |
| **Empty** | No points provided — render empty state message |
| **Hover** | Tooltip with point details on hover |

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Container | \`role="img"\` with \`aria-label\` from Label slot content |
| Data table | Provide a visually hidden \`<table>\` with the raw data as alternative |
| Interactive points | \`role="button"\`, \`aria-label\` with label + value |

---

## 9. Design Tokens

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

## 10. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
| 1.1.0 | 2026-04-21 | Removed animate, width, height props; added Empty slot; removed implementation code |
`;
