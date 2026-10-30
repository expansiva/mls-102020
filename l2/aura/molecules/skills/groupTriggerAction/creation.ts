/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupTriggerAction/creation.ts" enhancement="_blank"/>

export const skill = `
# groupTriggerAction — Creation

> Implementation reference for creating molecules in the **groupTriggerAction** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupTriggerAction\` |
| **Category** | Actions |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Button text content |
| \`Icon\` | No | Icon content (SVG, emoji, HTML) displayed alongside or instead of the label |

\`\`\`typescript
slotTags = ['Label', 'Icon'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Icon>
└── <Label>
\`\`\`

### Flexible Composition

- \`Label\` only: text button
- \`Icon\` only: icon button
- \`Icon\` + \`Label\`: button with icon and text
- Neither: component uses i18n default or renders empty

---

## 3. Properties

### 3.1 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`size\` | \`string\` | \`'md'\` | \`@propertyDataSource\` | Button size: \`'xs'\`, \`'sm'\`, \`'md'\`, \`'lg'\` |
| \`type\` | \`string\` | \`'button'\` | \`@propertyDataSource\` | HTML button type: \`'button'\`, \`'submit'\`, \`'reset'\` |
| \`iconPosition\` | \`string\` | \`'start'\` | \`@propertyDataSource\` | Icon placement: \`'start'\` (before label) or \`'end'\` (after label) |
| \`data-variant\` | \`string\` | \`'primary'\` | (attribute) | Visual variant read by \`ml-button-standard\`: \`'primary'\`, \`'secondary'\`, \`'danger'\`, \`'ghost'\`, \`'link'\`. Maps to the molecule's own CSS class (e.g. \`ml-button-primary\`). Only \`ml-button-standard\` reads it. |

### 3.2 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Button is disabled |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Shows loading indicator, disables interaction |

---

## 4. Value Contract

This component has **no \`value\` property**. It is an action trigger.

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`action\` | \`{}\` | ✓ | Fired when the button is clicked (not fired when disabled or loading) |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('action', {
  bubbles: true,
  composed: true,
  detail: {}
}));
\`\`\`

---

## 6. Size Mapping

| Size | Description |
|------|-------------|
| \`xs\` | Compact, inline with text |
| \`sm\` | Small, for dense layouts |
| \`md\` | Default size |
| \`lg\` | Large, prominent action |

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Hover** | Subtle highlight |
| **Active** | Pressed/depressed visual feedback |
| **Focused** | Focus ring for keyboard navigation |
| **Disabled** | Reduced opacity, no interaction |
| **Loading** | Loading indicator replaces icon or label, interaction blocked |

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Element | Native \`<button>\` element |
| Label | \`aria-label\` from Label slot content when icon-only |
| Disabled | \`disabled\` attribute on \`<button>\` |
| Loading | \`aria-busy="true"\`, \`aria-disabled="true"\` |
| Keyboard | \`Enter\`/\`Space\` triggers action |

---

## 9. CSS classes

### data-class

The component accepts \`data-class\` for consumer-provided CSS classes:
- On host: \`<component data-class="w-full mt-4">\`
- On slots: \`<Label data-class="uppercase tracking-wide">\`

Where each slot's classes go:

| Slot | Applied to | Read with |
|------|------------|-----------|
| \`Label\` | the element that wraps the button text (a \`span\`) | \`this.getSlotClass('Label')\` in a single button |
| \`Icon\` | the element that wraps the icon (a \`span\`) | \`this.getSlotClass('Icon')\` in a single button |

A text that exists only for screen readers (\`sr-only\`, \`aria-label\` of an icon-only button) takes no class.

**Several buttons in one molecule (a button group).** Each \`<Label>\` defines one button, and the \`<Icon>\` with the same index is its icon. Keep each one's own \`data-class\` in the parse and use it on that button's text and icon. **Never use \`getSlotClass('Label')\` or \`getSlotClass('Icon')\` there**: they read only the **first** element, so the first button's classes would land on every button. Wrap the text and the icon in their own \`span\` always, also when the button has only one of them:

\`\`\`typescript
const items = this.getSlots('Label').map((labelEl, index) => {
  const iconEl = this.getSlots('Icon')[index];
  return {
    labelHtml: labelEl.innerHTML.trim(),
    iconHtml: (iconEl?.innerHTML || '').trim(),
    labelCls: labelEl.getAttribute('data-class') || '',
    iconCls: iconEl?.getAttribute('data-class') || '',
  };
});
// in each button:
const labelPart = html\`<span class="\${item.labelCls}">\${unsafeHTML(item.labelHtml)}</span>\`;
const iconPart = html\`<span class="\${item.iconCls}">\${unsafeHTML(item.iconHtml)}</span>\`;
\`\`\`

### Semantic classes

| Class | Purpose |
|-------|---------|
| ml-button | Base button (font, radius, transition, focus ring) |
| ml-button-primary | Primary variant (background, color, border, shadow) |
| ml-button-secondary | Secondary variant |
| ml-button-danger | Danger/destructive variant |
| ml-button-ghost | Ghost/transparent variant |
| ml-button-link | Link-style variant |
| ml-disabled | Disabled state |

---

## 10. Possible Implementations

| Component | Description |
|-----------|-------------|
| **Button** | Standard button with size options |
| **Icon Button** | Compact button with icon only |
| **FAB (Floating Action Button)** | Fixed-position circular action button |
| **Split Button** | Primary action + dropdown for secondary actions |
| **Button Group** | Row of related action buttons |

All implementations share the same slot tag contract.

---

## 11. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
| 1.1.0 | 2026-10-29 | §9 data-class: where \`Label\` and \`Icon\` classes go (a \`span\` around the text and around the icon; none on screen-reader-only text); in a button group, each \`Label\`/\`Icon\` keeps its own \`data-class\` in the parse, never \`getSlotClass\` |
`;