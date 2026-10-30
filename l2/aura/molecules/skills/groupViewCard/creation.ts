/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewCard/creation.ts" enhancement="_blank"/>

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

## 2.9 Live slots in this group

The molecules of this group opt in with \`protected usesLiveSlots = true;\` and split the slots
like this. **A new molecule of this group must follow the same split** — otherwise it becomes the
only one where a component placed in the slot does not really work, and nobody notices.

| slot | path | how to render |
|---|---|---|
| \`CardFooter\` | **LIVE** | \`\\\${this.renderLiveSlot('CardFooter')}\` |
| \`CardAction\` | **LIVE** | \`\\\${this.renderLiveSlot('CardAction')}\` |
| \`CardHeader\` | snapshot | \`\\\${unsafeHTML(this.getSlotContent('CardHeader'))}\` |
| \`CardTitle\` | snapshot | \`\\\${unsafeHTML(this.getSlotContent('CardTitle'))}\` |
| \`CardDescription\` | snapshot | \`\\\${unsafeHTML(this.getSlotContent('CardDescription'))}\` |
| \`CardContent\` | snapshot | \`\\\${unsafeHTML(this.getSlotContent('CardContent'))}\` |

> The rule and the three traps are in §10.1 of the general generation skill. The one that bites
> here: **decide whether to render a live slot with \`hasSlot\`, never with \`getSlotContent\`** —
> the source is empty once the nodes are projected.

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

Where each slot's classes go:

| Slot | Applied to | Read with |
|------|------------|-----------|
| \`CardHeader\` | the element that wraps the header, **always**, also when it holds \`CardTitle\` and \`CardDescription\`; when the molecule uses the header as the card's image (e.g. a media card with \`ratio\`), the image box, which exists with or without the image | \`this.getSlotClass('CardHeader')\` |
| \`CardTitle\` | the title element | \`this.getSlotClass('CardTitle')\` |
| \`CardDescription\` | the description element | \`this.getSlotClass('CardDescription')\` |
| \`CardContent\` | the body element | \`this.getSlotClass('CardContent')\` |
| \`CardFooter\` | the element the molecule renders around \`renderLiveSlot('CardFooter')\` (§2.9) | \`this.getSlotClass('CardFooter')\` |
| \`CardAction\` | the element the molecule renders around \`renderLiveSlot('CardAction')\` (§2.9) | \`this.getSlotClass('CardAction')\` |

**\`CardTitle\` and \`CardDescription\` inside \`CardHeader\`.** \`hasSlot\` and \`getSlotClass\` find them nested too. In a molecule whose header holds the title and the description (not the image of a media card), when the card has a \`CardTitle\` or a \`CardDescription\`, render each one through its own element (with its class) inside the header wrapper; render the header's raw content only when the card has neither (free HTML in the header). Never dump the raw header when it holds them: they would come out as unknown tags, with no class and no base style. In such a molecule, free HTML in the header is not combined with a title: when there is a title, the header's free HTML is not rendered.

\`\`\`typescript
// in the header render:
if (hasHeader && !hasTitle && !hasDescription) {
  return html\`<div class="\${cn('flex flex-col gap-1', this.getSlotClass('CardHeader'))}">
    \${unsafeHTML(this.getSlotContent('CardHeader'))}
  </div>\`;
}
return html\`<div class="\${cn('flex flex-col gap-1', this.getSlotClass('CardHeader'))}">
  \${hasTitle ? html\`<div class="\${cn('text-base font-semibold', this.getSlotClass('CardTitle'))}">…</div>\` : html\`\`}
  \${hasDescription ? html\`<div class="\${cn('text-sm', this.getSlotClass('CardDescription'))}">…</div>\` : html\`\`}
</div>\`;
\`\`\`

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
| 1.1.0 | 2026-10-29 | §9 data-class: where each slot's classes go (\`CardHeader\` → the header wrapper, always, or the image box of a media card; \`CardFooter\`/\`CardAction\` → the element around the live slot); \`CardTitle\`/\`CardDescription\` inside \`CardHeader\` are rendered through their own elements, never as the header's raw HTML |

`;
