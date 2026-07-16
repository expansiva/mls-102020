/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSelectMany/creation.ts" enhancement="_blank"/>

export const skill = `
# groupSelectMany — Creation

> Implementation reference for creating molecules in the **groupSelectMany** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupSelectMany\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Label displayed above or beside the field |
| \`Helper\` | No | Help text displayed below the field |
| \`Trigger\` | No | Custom content for the trigger button (for dropdown implementations) |
| \`Item\` | Yes | Defines one selectable option (one **row** in \`table\`). Attributes: \`value\` (required), \`disabled\` |
| \`Cell\` | No | \`table\` only — A data cell inside an \`Item\`, one per column, in column order |
| \`Column\` | No | \`table\` only — A single column header, direct child of the component, in column order |
| \`Group\` | No | Groups items under a named heading. Attribute: \`label\` |
| \`Empty\` | No | Content shown when no items are available |

\`\`\`typescript
slotTags = ['Label', 'Helper', 'Trigger', 'Item', 'Cell', 'Column', 'Group', 'Empty'];
\`\`\`

### Slot Hierarchy — \`dropdown\` (default)

\`\`\`
component (root)
├── <Label>
├── <Trigger>
├── <Group>
│   └── <Item value="..." disabled>
├── <Item>
├── <Empty>
└── <Helper>
\`\`\`

### Slot Hierarchy — \`table\`

\`\`\`
component (root)
├── <Label>
├── <Column>Name</Column>
├── <Column>Price</Column>
├── <Item value="basic">
│   ├── <Cell>Basic</Cell>
│   └── <Cell>$10</Cell>
├── <Item value="pro">
│   ├── <Cell>Pro</Cell>
│   └── <Cell>$20</Cell>
├── <Empty>
└── <Helper>
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string\` | \`''\` | \`@propertyDataSource\` | Comma-separated selected values (e.g. \`"tag1,tag2,tag3"\`) |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`placeholder\` | \`string\` | \`''\` | \`@propertyDataSource\` | Text shown when no items are selected (fallback when no \`Trigger\` slot) |
| \`searchable\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show a search input to filter items |
| \`minSelection\` | \`number\` | \`0\` | \`@propertyDataSource\` | Minimum number of selected items (0 = no minimum) |
| \`maxSelection\` | \`number\` | \`0\` | \`@propertyDataSource\` | Maximum number of selected items (0 = no limit) |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isEditing\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Edit mode (true) or view mode (false) |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | At least one selection is required |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state (items not yet available) |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isOpen\` | \`boolean\` | \`false\` | \`@state\` | Whether the selector panel is currently open (for dropdown implementations) |
| \`searchQuery\` | \`string\` | \`''\` | \`@state\` | Current search filter text (used when \`searchable=true\`) |

---

## 4. Value Contract

### Storage Format

- Value stored as a **comma-separated string** of selected item values
- Empty string \`''\` means no items selected
- Example: \`"apple,banana,grape"\`
- Item values **must not contain commas**

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: string }\` | ✓ | Selection changed — value is comma-separated string |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value }
}));
\`\`\`

---

## 6. isEditing Mode

| Mode | \`isEditing\` | Behavior |
|------|-------------|----------|
| **Edit** | \`true\` | Renders interactive multi-select |
| **View** | \`false\` | Renders selected labels as static text or tags |

- In view mode: no trigger, no panel, no events, no error, no helper

---


## 7. Open/Close Behavior (dropdown implementations)

- Clicking the trigger toggles \`isOpen\`
- Selecting an item toggles its value but **does not close** the panel (user may select more)
- Pressing \`Escape\` closes the panel
- Clicking outside the component closes the panel
- When \`disabled\` or \`readonly\`: trigger click is ignored, panel never opens

---

## 7.1 Portal — Floating Panel Rendering (dropdown implementations)

> The dropdown panel MUST be rendered outside the component tree, in \`<body>\`,
> using the **portal pattern** with \`litRender\`. This prevents the panel from
> being clipped or hidden behind sibling elements when any ancestor uses
> \`backdrop-filter\`, \`transform\`, \`overflow: hidden\`, or explicit \`z-index\`
> (all of which create new CSS stacking contexts).

### Import

\\\`\\\`\\\`typescript
import { render as litRender } from 'lit';
\\\`\\\`\\\`

### Required members

| Member | Visibility | Description |
|--------|------------|-------------|
| \`portalContainer\` | \`protected\` | \`HTMLDivElement \\| null\` — the portal element appended to \`<body>\` |
| \`portalWidgetName\` | \`protected\` | \`string\` — value of the \`data-widget\` attribute set on the portal container (empty by default; each molecule sets its tag name, e.g. \`'groupselectmany--ml-multi-select-dropdown'\`; the \`.less\` targets it via \`div[data-widget="..."]\`) |
| \`getPortalTemplate()\` | \`protected\` | Returns \`TemplateResult\` with the panel content. Subclasses override this to render themed variants |

### Lifecycle integration

| Hook | Action |
|------|--------|
| \`openPanel()\` / \`toggleOpen()\` | Call \`createPortal()\` after setting \`isOpen = true\` |
| \`closePanel()\` | Call \`destroyPortal()\` |
| \`disconnectedCallback()\` | Call \`destroyPortal()\` for cleanup |
| \`updated()\` | When \`isOpen && portalContainer\`: call \`renderPortalContent()\` + \`updatePanelPosition()\` to keep portal in sync with reactive state |

### Portal methods

\\\`\\\`\\\`typescript
private createPortal() {
  if (this.portalContainer) return;
  this.portalContainer = document.createElement('div');
  if (this.portalWidgetName) this.portalContainer.setAttribute('data-widget', this.portalWidgetName);
  document.body.appendChild(this.portalContainer);
  this.updatePanelPosition();
  this.renderPortalContent();
  window.addEventListener('scroll', this.boundUpdatePosition, true);
  window.addEventListener('resize', this.boundUpdatePosition);
}

private destroyPortal() {
  if (!this.portalContainer) return;
  window.removeEventListener('scroll', this.boundUpdatePosition, true);
  window.removeEventListener('resize', this.boundUpdatePosition);
  this.portalContainer.remove();
  this.portalContainer = null;
}

private updatePanelPosition() {
  if (!this.portalContainer) return;
  const trigger = this.querySelector('button[role="combobox"]') as HTMLElement;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  Object.assign(this.portalContainer.style, {
    position: 'fixed',
    top: \\\`\\\${rect.bottom + 8}px\\\`,
    left: \\\`\\\${rect.left}px\\\`,
    width: \\\`\\\${rect.width}px\\\`,
    zIndex: '9999',
  });
}

private renderPortalContent() {
  if (!this.portalContainer) return;
  litRender(this.getPortalTemplate(), this.portalContainer);
}
\\\`\\\`\\\`

### Focus management — critical for multi-select

Since the panel stays open while the user selects multiple items, focus moves
between the component and the portal frequently. Handlers that check focus
ownership must include the portal:

\\\`\\\`\\\`typescript
// handleFocusOut — do NOT close when focus moves to portal
if (!related || (!this.contains(related) && !this.portalContainer?.contains(related))) {
  this.closePanel();
}

// handleDocumentClick — do NOT close when clicking inside portal
if (!target || (!this.contains(target) && !this.portalContainer?.contains(target))) {
  this.closePanel();
}
\\\`\\\`\\\`

### DOM queries — search in portal

Methods that query elements inside the panel must search the portal container:

\\\`\\\`\\\`typescript
// focusSearchInput
const container = this.portalContainer || this;
const input = container.querySelector('input[data-search]');

// moveOptionFocus / focusActiveItem
const container = this.portalContainer || this;
const options = container.querySelectorAll('[data-option]');
\\\`\\\`\\\`

### render() — no inline panel

The main \`render()\` method must **not** include the panel template. The panel
is rendered exclusively via \`renderPortalContent()\` into the portal container.

### CSS — shared selector for portal

Panel styles must work both inside the component and in the body-level portal.
Use a shared selector in the \`.less\` file:

\\\`\\\`\\\`less
my-component,
div[data-widget="my-component"] {
  .panel { /* panel styles */ }
  .item  { /* item styles */ }
}
\\\`\\\`\\\`

### Reference implementations

- \`mls-102040/l2/molecules/groupselectmany/ml-multi-select-dropdown.ts\`
- \`mls-102040/l2/molecules/groupselectmany/ml-popover-multi-select.ts\`

---

## 8. Validation Rules

| Rule | Behavior |
|------|----------|
| \`required\` and \`value === ''\` | Error state until at least one item is selected |
| Selected count < \`minSelection\` | Error state |
| Selected count >= \`maxSelection\` | Additional items cannot be selected (disabled visually) |
| Item with \`disabled\` attribute | Rendered but not selectable |

---

## 9. Error Handling

| \`error\` value | Behavior |
|---------------|----------|
| \`''\` | No error — show Helper if slot exists |
| \`'any message'\` | Show error message, apply error visual state |

- Error never shown in view mode
- Page/Organism is responsible for setting the error message

---

## 10. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Open** | Selector panel visible (dropdown implementations) |
| **Partial** | Some items selected — trigger shows count or tags |
| **Full** | \`maxSelection\` reached — unselected items visually disabled |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No interaction, selected items visible |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator; panel does not open |
| **View Mode** | Selected labels as plain text or tags |

---

## 11. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Container (checkbox/chips) | \`role="group"\` |
| Container (dropdown) | \`role="combobox"\`, \`aria-expanded\`, \`aria-haspopup="listbox"\` |
| Panel (dropdown) | \`role="listbox"\`, \`aria-multiselectable="true"\` |
| Items | \`role="option"\`, \`aria-selected\`, \`aria-disabled\` |
| Label | \`aria-labelledby\` pointing to rendered label |
| Error | \`aria-describedby\` pointing to error element |
| Invalid | \`aria-invalid="true"\` when error exists |
| Required | \`aria-required="true"\` |
| Keyboard | \`ArrowDown\`/\`ArrowUp\` navigate; \`Space\` toggles; \`Escape\` closes |

---

## 13. Variants

The component may be implemented in different layout variants. **All variants share the
same value contract** (§4): a comma-separated string of selected \`Item\` \`value\` attributes.
Only rendering and a11y differ.

| Layout | When to use |
|--------|-------------|
| \`dropdown\` | Many options, compact footprint — trigger + popover panel (default) |
| \`checkbox\` | A handful of options that benefit from being all visible — always-visible checkbox group |
| \`table\` | Each option has **multiple comparable attributes** and the user picks several rows — always-visible table with checkboxes |

### 13.1 \`table\` variant — details

Reference implementation: \`_102040_/l2/molecules/groupselectmany/ml-table-multi-select\`

**Markup**

\`\`\`html
<component required max-selection="3">
  <Label>Select plans</Label>
  <Column>Plan</Column>
  <Column>Price</Column>
  <Column>Seats</Column>
  <Item value="basic">
    <Cell>Basic</Cell>
    <Cell>$10/mo</Cell>
    <Cell>3</Cell>
  </Item>
  <Item value="pro">
    <Cell>Pro</Cell>
    <Cell>$25/mo</Cell>
    <Cell>10</Cell>
  </Item>
  <Item value="enterprise" disabled>
    <Cell>Enterprise</Cell>
    <Cell>Contact us</Cell>
    <Cell>Unlimited</Cell>
  </Item>
  <Empty>No plans available</Empty>
  <Helper>Choose up to 3 plans to compare.</Helper>
</component>
\`\`\`

**Rendering**

- Render a \`<table>\`. \`<thead>\` has one \`<th>\` per \`Column\` slot, plus a leading
  \`<th>\` with a "Select All" checkbox.
- \`<tbody>\` has one \`<tr>\` per \`Item\`. The first \`<td>\` holds
  \`<input type="checkbox">\`; the remaining \`<td>\`s render the \`Cell\` contents in order.
- A row is checked when its \`Item\` \`value\` is in the selected set.
- Clicking the row (or its checkbox) toggles the item in/out of the selection.
- The "Select All" checkbox uses \`.indeterminate\` when some (not all) are selected.
- When \`maxSelection\` is reached, unchecked items are disabled.
- \`Item\` with \`disabled\`: checkbox disabled, row not selectable.
- If \`searchable\`, filter rows by their visible cell text.
- View mode (\`isEditing=false\`): render selected items' cells as static text.

**Selection handler**

\`\`\`typescript
private handleRowToggle(item: { value: string; disabled: boolean }) {
  if (this.disabled || this.readonly || item.disabled) return;
  const selected = this.getSelectedSet();
  if (selected.has(item.value)) {
    selected.delete(item.value);
  } else {
    if (this.maxSelection > 0 && selected.size >= this.maxSelection) return;
    selected.add(item.value);
  }
  this.value = Array.from(selected).join(',');
  this.dispatchEvent(new CustomEvent('change', {
    bubbles: true, composed: true, detail: { value: this.value },
  }));
}
\`\`\`

---

## 14. Design Tokens

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

## 15. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
| 1.1.0 | 2026-06-22 | Added §7.1 Portal — floating panel must render in \`<body>\` via \`litRender\` to escape CSS stacking contexts; documented focus management and DOM query patterns for portal |
| 1.2.0 | 2026-06-22 | Added \`Cell\`/\`Column\` slot tags; added §13 Variants with \`table\` variant (checkbox table with Select All, keyed by Item value) |

`;
