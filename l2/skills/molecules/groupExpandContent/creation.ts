/// <mls fileReference="_102020_/l2/skills/molecules/groupExpandContent/creation.ts" enhancement="_blank"/>

export const skill = `

# groupExpandContent — Creation

> Implementation reference for creating molecules in the **groupExpandContent** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupExpandContent\` |
| **Category** | Data Display |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Title displayed above the component |
| \`Section\` | Yes | One expandable section. Attributes: \`title\` (required), \`disabled\`, \`expanded\` |

\`\`\`typescript
slotTags = ['Label', 'Section'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Label>
└── <Section title="..." expanded disabled>
      ...content...
    </Section>
\`\`\`

### Section Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| \`title\` | \`string\` | Header text displayed in the trigger area |
| \`expanded\` | \`boolean\` (presence) | Section starts expanded |
| \`disabled\` | \`boolean\` (presence) | Section cannot be toggled |

---

## 3. Properties

### 3.1 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`multiple\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Allow multiple sections open simultaneously. \`false\` = only one at a time (accordion) |

### 3.2 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Disables all sections |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show loading placeholder |

### 3.3 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`openSections\` | \`Set<number>\` | from \`expanded\` attrs | \`@state\` | Indices of currently open sections |

---

## 4. Value Contract

This component has **no \`value\` property**. It is a layout/interaction component. Open/closed state is managed internally.

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`toggle\` | \`{ index: number, title: string, expanded: boolean }\` | ✓ | Fired when a section is expanded or collapsed |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('toggle', {
  bubbles: true,
  composed: true,
  detail: { index: 0, title: 'FAQ 1', expanded: true }
}));
\`\`\`

---

## 6. Reading Sections

Read sections inline using \`getSlots\`:

\`\`\`typescript
const sections = this.getSlots('Section').map((el, index) => ({
  index,
  title: el.getAttribute('title') || '',
  disabled: el.hasAttribute('disabled'),
  expanded: this.openSections.has(index),
}));
\`\`\`

Initialize \`openSections\` from \`expanded\` attributes in \`firstUpdated\`:

\`\`\`typescript
firstUpdated() {
  this.getSlots('Section').forEach((el, index) => {
    if (el.hasAttribute('expanded')) {
      this.openSections.add(index);
    }
  });
  this.requestUpdate();
}
\`\`\`

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Collapsed** | Only section header visible |
| **Expanded** | Header + content visible, with expand animation |
| **Disabled (section)** | Individual section dimmed, cannot toggle |
| **Disabled (component)** | All sections dimmed, no interaction |
| **Loading** | Placeholder instead of sections |

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Section header | \`role="button"\`, \`tabindex="0"\`, \`aria-expanded\` |
| Section content | \`role="region"\`, \`aria-labelledby\` pointing to header |
| Disabled | \`aria-disabled="true"\` on header |
| Keyboard | \`Enter\`/\`Space\` toggles section; \`ArrowDown\`/\`ArrowUp\` navigate between headers |

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

### Semantic classes

| Class | Purpose |
|-------|---------|
| ml-accordion-header | Section header (background, border, radius, font, hover, focus) |
| ml-accordion-header-open | Header when section is expanded |
| ml-accordion-content | Section content area |
| ml-accordion-chevron | Expand/collapse icon |
| ml-accordion-chevron-open | Icon when section is expanded |
| ml-label | Top-level label |
| ml-text-muted | Muted text |
| ml-skeleton | Loading placeholder |
| ml-disabled | Disabled state |

---

## 10. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
`;