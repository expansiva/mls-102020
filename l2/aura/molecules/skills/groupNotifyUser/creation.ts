/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupNotifyUser/creation.ts" enhancement="_blank"/>

export const skill = `
# groupNotifyUser — Creation

> Implementation reference for creating molecules in the **groupNotifyUser** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupNotifyUser\` |
| **Category** | Feedback |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Title\` | No | Notification title/heading |
| \`Message\` | Yes | Notification body content |
| \`Action\` | No | Actionable element (button, link) inside the notification |
| \`Icon\` | No | Custom icon content |

\`\`\`typescript
slotTags = ['Title', 'Message', 'Action', 'Icon'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Icon>
├── <Title>
├── <Message>
└── <Action>
\`\`\`

---

## 2.9 Live slots in this group

The molecules of this group opt in with \`protected usesLiveSlots = true;\` and split the slots
like this. **A new molecule of this group must follow the same split** — otherwise it becomes the
only one where a component placed in the slot does not really work, and nobody notices.

| slot | path | how to render |
|---|---|---|
| \`Action\` | **LIVE** | \`\\\${this.renderLiveSlot('Action')}\` |
| \`Title\` | snapshot | \`\\\${unsafeHTML(this.getSlotContent('Title'))}\` |
| \`Message\` | snapshot | \`\\\${unsafeHTML(this.getSlotContent('Message'))}\` |
| \`Icon\` | snapshot | \`\\\${unsafeHTML(this.getSlotContent('Icon'))}\` |

> The rule and the three traps are in §10.1 of the general generation skill. The one that bites
> here: **decide whether to render a live slot with \`hasSlot\`, never with \`getSlotContent\`** —
> the source is empty once the nodes are projected.

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`type\` | \`string\` | \`'info'\` | \`@propertyDataSource\` | Notification type: \`'info'\`, \`'success'\`, \`'warning'\`, \`'error'\` |
| \`visible\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Controls whether the notification is shown |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`dismissible\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Show a close/dismiss button |
| \`duration\` | \`number\` | \`0\` | \`@propertyDataSource\` | Auto-dismiss after N milliseconds (0 = no auto-dismiss) |
| \`position\` | \`string\` | \`''\` | \`@propertyDataSource\` | Positioning hint: \`'top'\`, \`'bottom'\`, \`'top-right'\`, \`'bottom-right'\`, etc. Empty = inline |

---

## 4. Value Contract

This component has **no \`value\` property**. It is a feedback/display component controlled by the \`visible\` property.

- Page sets \`visible=true\` to show the notification
- Page sets \`visible=false\` or user dismisses to hide it
- When \`duration > 0\`, the component auto-sets \`visible=false\` after the timeout

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`dismiss\` | \`{}\` | ✓ | Fired when the notification is dismissed (by user or auto-timeout) |
| \`action\` | \`{}\` | ✓ | Fired when the Action slot content is clicked |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('dismiss', {
  bubbles: true,
  composed: true,
  detail: {}
}));
\`\`\`

---

## 6. Auto-Dismiss Logic

When \`duration > 0\` and \`visible=true\`:

- Start a timer on render
- After \`duration\` ms: set \`visible=false\`, emit \`dismiss\`
- If user dismisses manually before timeout: clear the timer
- If \`visible\` changes to \`false\` externally: clear the timer

---

## 6.1 Portal — Notification Rendering

> Positioned notifications (\`position\` is not empty) MUST be rendered outside
> the component tree, in \`<body>\`, using the **portal pattern** with \`litRender\`.
> This ensures the notification appears at the correct screen position regardless
> of where the component is in the DOM, and avoids being clipped or hidden by
> ancestor stacking contexts.
>
> When \`position\` is empty (inline notification), no portal is needed — render
> directly inside the component.

### Import

\\\`\\\`\\\`typescript
import { render as litRender } from 'lit';
\\\`\\\`\\\`

### Key difference from other groups

Unlike dropdowns and pickers, notifications do NOT position relative to a
trigger element. They use **fixed screen coordinates** based on the \`position\`
property:

\\\`\\\`\\\`typescript
private updatePanelPosition() {
  if (!this.portalContainer || !this.position) return;
  const styles: Record<string, string> = {
    position: 'fixed', zIndex: '9999',
  };
  if (this.position.includes('top'))    styles.top = '1rem';
  if (this.position.includes('bottom')) styles.bottom = '1rem';
  if (this.position.includes('right'))  styles.right = '1rem';
  if (this.position.includes('left'))   styles.left = '1rem';
  if (!this.position.includes('left') && !this.position.includes('right')) {
    styles.left = '50%';
    styles.transform = 'translateX(-50%)';
  }
  Object.assign(this.portalContainer.style, styles);
}
\\\`\\\`\\\`

### Lifecycle integration

| Hook | Action |
|------|--------|
| When \`visible\` becomes \`true\` and \`position\` is set | Call \`createPortal()\` |
| When \`visible\` becomes \`false\` | Call \`destroyPortal()\` (after exit animation) |
| \`disconnectedCallback()\` | Call \`destroyPortal()\` for cleanup |
| Auto-dismiss timeout fires | Call \`destroyPortal()\` after emitting \`dismiss\` |

### No scroll/resize listeners needed

Since positioned notifications use fixed screen coordinates (not relative to
a trigger), scroll and resize listeners are not needed — the position is static.

### Reference implementation

\`mls-102040/l2/molecules/groupselectone/ml-card-selector.ts\` (portal creation/destruction pattern)

---

## 7. Type Semantics

| Type | Usage |
|------|-------|
| \`info\` | General information, neutral |
| \`success\` | Action completed successfully |
| \`warning\` | Attention needed, non-critical |
| \`error\` | Something failed, requires attention |

The type drives the visual styling (colors, default icon). The component does not define specific colors — those are handled via Tailwind classes per type.

---

## 8. Visual States

| State | Behavior |
|-------|----------|
| **Hidden** | \`visible=false\` — nothing rendered |
| **Visible** | Notification displayed with enter animation |
| **Dismissing** | Exit animation, then hidden |

---

## 9. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Container | \`role="alert"\` for error/warning, \`role="status"\` for info/success |
| Live region | \`aria-live="assertive"\` for error, \`aria-live="polite"\` for others |
| Dismiss button | \`aria-label="Dismiss notification"\` |
| Action | Inherits a11y from the content inside Action slot |

---


## 10. CSS classes

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

## 11. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
| 1.1.0 | 2026-06-22 | Added §6.1 Portal — positioned notifications must render in \`<body>\` via \`litRender\`; fixed screen coordinates instead of trigger-relative; no scroll/resize listeners needed |

`;