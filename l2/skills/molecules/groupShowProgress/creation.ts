/// <mls fileReference="_102020_/l2/skills/molecules/groupShowProgress/creation.ts" enhancement="_blank"/>

export const skill = `
# groupShowProgress — Creation

> Implementation reference for creating molecules in the **groupShowProgress** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupShowProgress\` |
| **Category** | Feedback |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

This component has **no slot tags**. It is a visual primitive designed to be composed inside other components (e.g. button with spinner, upload zone with progress bar).

\`\`\`typescript
slotTags = [];
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`number \| null\` | \`null\` | \`@propertyDataSource\` | Progress percentage 0–100. \`null\` = indeterminate mode |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`size\` | \`string\` | \`'md'\` | \`@propertyDataSource\` | Visual size: \`'xs'\`, \`'sm'\`, \`'md'\`, \`'lg'\` |
| \`label\` | \`string\` | \`''\` | \`@propertyDataSource\` | Accessible label describing what is loading |
| \`showValue\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Display the numeric percentage alongside the indicator |

---

## 4. Value Contract

### Determinate Mode (\`value\` is a number)

- \`value\` is clamped to \`0–100\` before rendering
- Represents the completion percentage of the operation
- When \`showValue=true\`, display formatted as \`"42%"\`

### Indeterminate Mode (\`value\` is \`null\`)

- Renders an animated indicator with no specific progress
- \`showValue\` is ignored — no percentage to display
- Used when the total duration or size is unknown

---

## 5. Events

This component emits **no events**. It is purely visual.

---

## 6. Visual States

| State | Condition | Behavior |
|-------|-----------|----------|
| **Indeterminate** | \`value === null\` | Animated loop (spinning, pulsing, or sliding) |
| **Progress** | \`value >= 0 && value < 100\` | Partial fill reflecting the percentage |
| **Complete** | \`value === 100\` | Full fill, animation stops |

---

## 7. Size Mapping

| Size | Typical dimension |
|------|-------------------|
| \`xs\` | 12–16px (inline with text) |
| \`sm\` | 20–24px (inside buttons) |
| \`md\` | 32–40px (standalone) |
| \`lg\` | 48–64px (prominent, page-level) |

Exact dimensions are implementation-specific (bar height, ring diameter, spinner size).

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Role | \`role="progressbar"\` |
| Label | \`aria-label\` from \`label\` prop |
| Determinate | \`aria-valuenow\`, \`aria-valuemin="0"\`, \`aria-valuemax="100"\` |
| Indeterminate | Omit \`aria-valuenow\` (screen readers announce as indeterminate) |

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