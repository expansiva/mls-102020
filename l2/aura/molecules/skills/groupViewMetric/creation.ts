/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewMetric/creation.ts" enhancement="_blank"/>

export const skill = `
# groupViewMetric — Creation

> Implementation reference for creating molecules in the **groupViewMetric** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupViewMetric\` |
| **Category** | Data Display |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Metric name/title |
| \`Value\` | Yes | The main metric value (text, formatted number, HTML) |
| \`Icon\` | No | Icon displayed alongside the metric |
| \`Trend\` | No | Trend indicator content (arrow, percentage, text). Attributes: \`direction\` (\`'up'\`, \`'down'\`, \`'neutral'\`) |
| \`Helper\` | No | Supporting text below the metric (e.g. period, comparison) |

\`\`\`typescript
slotTags = ['Label', 'Value', 'Icon', 'Trend', 'Helper'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Icon>
├── <Label>
├── <Value>
├── <Trend direction="up|down|neutral">
└── <Helper>
\`\`\`

---

## 3. Properties

### 3.1 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show skeleton placeholder instead of metric |

---

## 4. Value Contract

This component has **no \`value\` property**. The metric data is provided entirely via slot tags. The \`<Value>\` slot contains the main number/text to display.

This allows full flexibility — the page formats the number, adds currency symbols, percentages, etc. directly in the slot content.

---

## 5. Events

This component emits **no events**. It is purely visual.

---

## 6. Trend Attribute

The \`<Trend>\` slot tag has an optional \`direction\` attribute:

| Direction | Meaning |
|-----------|---------|
| \`up\` | Positive trend — typically styled green |
| \`down\` | Negative trend — typically styled red |
| \`neutral\` | No change — typically styled grey |

The content inside \`<Trend>\` is free (arrow emoji, percentage text, SVG icon).

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Metric displayed with all available slots |
| **Loading** | Skeleton placeholder matching the metric layout |

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Container | \`role="figure"\`, \`aria-label\` from Label slot content |
| Value | \`aria-live="polite"\` to announce updates |
| Trend | \`aria-label\` describing the direction (e.g. "Trend: up") |

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

`;