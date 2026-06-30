/// <mls fileReference="_102020_/l2/skills/molecules/groupViewCard/creation.ts" enhancement="_blank"/>

export const skill = `
# groupViewCard — Creation

> Implementation reference for creating molecules in the **groupViewCard** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupViewCard\` |
| **Category** | Data Display |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`CardHeader\` | No | Top section of the card, typically contains title and description |
| \`CardTitle\` | No | Main title text inside the header |
| \`CardDescription\` | No | Secondary text inside the header |
| \`CardContent\` | No | Main body area of the card |
| \`CardFooter\` | No | Bottom section of the card |
| \`CardAction\` | No | Actionable element (button, link) inside the card |

\`\`\`typescript
slotTags = ['CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter', 'CardAction'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <CardHeader>
│   ├── <CardTitle>
│   └── <CardDescription>
├── <CardContent>
├── <CardFooter>
└── <CardAction>
\`\`\`

### Flexible Composition

All slots are optional. The card renders only the slots that are present:

- Header only: quick info card
- Content only: media card
- Header + Content + Footer: full structured card
- Any combination is valid

---

## 3. Properties

### 3.1 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`clickable\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Entire card is clickable (adds hover effect and cursor pointer) |
| \`selected\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Card is visually selected/highlighted |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Card is dimmed and non-interactive |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show skeleton placeholder instead of content |
| \`isEditing\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Change all children web components, atribute is-editing  |


---

## 4. Value Contract

This component has **no \`value\` property**. It is a visual composition primitive. The page or organism that contains the card is responsible for data and state.

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`cardClick\` | \`{}\` | ✓ | Fired when the card is clicked (only when \`clickable=true\`) |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('cardClick', {
  bubbles: true,
  composed: true,
  detail: {}
}));
\`\`\`

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Hover** | Subtle hover effect (only when \`clickable=true\`) |
| **Selected** | Highlighted border or background |
| **Disabled** | Reduced opacity, no interaction |
| **Loading** | Skeleton placeholder matching the card layout |

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Clickable card | \`role="button"\`, \`tabindex="0"\` |
| Keyboard | \`Enter\`/\`Space\` triggers \`cardClick\` when clickable |
| Disabled | \`aria-disabled="true"\` |
| Selected | \`aria-selected="true"\` |
| Non-clickable | No role needed, renders as plain \`<div>\` |

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
