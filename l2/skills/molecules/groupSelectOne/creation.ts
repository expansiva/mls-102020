/// <mls fileReference="_102020_/l2/skills/molecules/groupSelectOne/creation.ts" enhancement="_blank"/>

export const skill = `# groupSelectOne — Creation

> Implementation reference for creating molecules in the **groupSelectOne** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupSelectOne\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Used by variant | Description |
|-----|:--------:|-----------------|-------------|
| \`Label\` | No | all | Label displayed above or beside the field |
| \`Helper\` | No | all | Help text displayed below the field |
| \`Trigger\` | No | \`dropdown\` only | Custom content for the trigger button. When no item is selected, this content acts as the placeholder |
| \`Item\` | Yes | all | Defines one selectable option (one **row** in \`table\`). Attributes: \`value\` (required), \`disabled\` |
| \`Cell\` | No | \`table\` only | A data cell inside an \`Item\`. One \`Cell\` per column, in column order. May contain text or web components |
| \`Column\` | No | \`table\` only | A single column header, as a direct child of the component (no wrapper). Declare them in column order |
| \`Group\` | No | \`dropdown\`, \`radio\`, \`list\` | Groups items under a named heading. Attribute: \`label\` |
| \`Empty\` | No | all | Content shown when no items are available |

\`\`\`typescript
slotTags = ['Label', 'Helper', 'Trigger', 'Item', 'Cell', 'Column', 'Group', 'Empty'];
\`\`\`

### Slot Hierarchy — \`dropdown\` (default)

\`\`\`
component (root)
├── <Label>
├── <Trigger>
├── <Group label="...">
│   └── <Item value="...">
├── <Item value="...">
├── <Empty>
└── <Helper>
\`\`\`

### Slot Hierarchy — \`table\`

\`\`\`
component (root)
├── <Label>
├── <Column>Name</Column>       ← header cells, direct children, in column order
├── <Column>Price</Column>
├── <Item value="basic">        ← one row; this value is emitted on selection
│   ├── <Cell>Basic</Cell>
│   └── <Cell>$10</Cell>
├── <Item value="pro">
│   ├── <Cell>Pro</Cell>
│   └── <Cell>$20</Cell>
├── <Empty>
└── <Helper>
\`\`\`

> The \`table\` variant is a **radiogroup rendered as a table**: column headers come from
> the \`Column\` slots, one row per \`Item\`, and the first cell of each row holds the radio control.
> The value contract is identical to \`dropdown\` — the emitted value is always the selected
> \`Item\`'s \`value\` attribute (never a row index). See **§13 Variants**.

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | Value of the currently selected item |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`variant\` | \`string\` | \`'dropdown'\` | \`@propertyDataSource\` | Layout/implementation: \`dropdown\` (combobox popover, default), \`radio\` (always-visible radio group), \`segmented\` (segmented control), \`list\` (always-visible list picker), \`table\` (radio group laid out as a table). See **§13 Variants** |
| \`placeholder\` | \`string\` | \`''\` | \`@propertyDataSource\` | Text shown when no item is selected (\`dropdown\` only; fallback when no \`Trigger\` slot) |
| \`searchable\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show a search input to filter items (\`dropdown\`, \`list\`, \`table\`) |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isEditing\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Edit mode (true) or view mode (false) |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | A selection is required |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state (items not yet available) |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isOpen\` | \`boolean\` | \`false\` | \`@state\` | Whether the selector panel is currently open (\`dropdown\` only; inline variants render items always-visible and ignore this) |
| \`searchQuery\` | \`string\` | \`''\` | \`@state\` | Current search filter text (used when \`searchable=true\`) |

---

## 4. Value Contract

### Storage Format

- Value stored and emitted as a plain **string** matching the \`value\` attribute of the selected \`<Item>\`
- \`null\` means no item selected
- The label displayed in the trigger is read from the selected \`<Item>\` inner content — never stored

### View Mode

- If value is \`null\`: display placeholder or \`"—"\`
- Otherwise: display the label of the selected item as plain text
- Label is obtained via \`this.findItem(this.value)?.label\`

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: string \| null }\` | ✓ | Selection confirmed |
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
| **Edit** | \`true\` | Renders the active variant's interactive layout (dropdown trigger+panel, or always-visible radio/segmented/list/table) |
| **View** | \`false\` | Renders selected item label as static text |

- In view mode: no trigger, no panel, no radios, no events, no error, no helper — regardless of variant

---

## 7. Open/Close Behavior

> Applies to the \`dropdown\` variant only. The inline variants (\`radio\`, \`segmented\`,
> \`list\`, \`table\`) have no panel: items are always visible and selecting one just sets
> \`value\` and emits \`change\`.

- Clicking the trigger toggles \`isOpen\`
- Selecting an item sets \`value\`, closes the panel (\`isOpen = false\`), emits \`change\`
- Pressing \`Escape\` closes the panel without changing value
- Clicking outside the component closes the panel (use a \`@click\` listener on \`document\` in \`connectedCallback\`, remove in \`disconnectedCallback\`)
- When \`disabled\` or \`readonly\`: trigger click is ignored, panel never opens

---

## 7.1 Portal — Floating Panel Rendering (\`dropdown\` variant only)

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
| \`portalClassName\` | \`protected\` | \`string\` — CSS class added to the portal (empty by default; subclasses set it for scoped styling, e.g. \`'glass-cs-portal'\`) |
| \`getPortalTemplate()\` | \`protected\` | Returns \`TemplateResult\` with the panel content. Subclasses override this to render themed variants |

### Lifecycle integration

| Hook | Action |
|------|--------|
| \`openPanel()\` | Call \`createPortal()\` after setting \`isOpen = true\` |
| \`closePanel()\` | Call \`destroyPortal()\` before/after setting \`isOpen = false\` |
| \`disconnectedCallback()\` | Call \`destroyPortal()\` for cleanup |
| \`updated()\` | When \`isOpen && portalContainer\`: call \`renderPortalContent()\` + \`updatePanelPosition()\` to keep portal in sync with reactive state |

### Portal methods

\\\`\\\`\\\`typescript
private createPortal() {
  if (this.portalContainer) return;
  this.portalContainer = document.createElement('div');
  if (this.portalClassName) this.portalContainer.classList.add(this.portalClassName);
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

### Outside click — include portal

The outside-click handler must check both the component **and** the portal:

\\\`\\\`\\\`typescript
if (!path.includes(this) && (!this.portalContainer || !path.includes(this.portalContainer))) {
  this.closePanel();
}
\\\`\\\`\\\`

### render() — no inline panel

The main \`render()\` method must **not** include the panel template. The panel
is rendered exclusively via \`renderPortalContent()\` into the portal container.

### CSS — shared selector for portal

Panel styles must work both inside the component and in the body-level portal.
Use a shared selector in the \`.less\` file:

\\\`\\\`\\\`less
my-component,
.my-portal-class {
  .panel { /* panel styles */ }
  .item  { /* item styles */ }
}
\\\`\\\`\\\`

### Reference implementation

\`mls-102040/l2/molecules/groupselectone/ml-card-selector.ts\`

---

## 8. Validation Rules

| Rule | Behavior |
|------|----------|
| \`required\` and \`value === null\` | Error state until an item is selected |
| Item with \`disabled\` attribute | Rendered but not selectable; clicking it is ignored |

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
| **Open** | (\`dropdown\`) Selector panel visible |
| **Selected** | (\`dropdown\`) Trigger shows selected item label; (inline) selected row/option highlighted and its radio checked |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No interaction, text selectable |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator; in \`dropdown\` the panel does not open |
| **View Mode** | Selected label as plain text |

---

## 11. Accessibility (a11y)

### \`dropdown\` variant

| Requirement | Implementation |
|-------------|----------------|
| Trigger | \`role="combobox"\`, \`aria-expanded\`, \`aria-haspopup="listbox"\` |
| Panel | \`role="listbox"\` |
| Items | \`role="option"\`, \`aria-selected\`, \`aria-disabled\` |
| Keyboard | \`ArrowDown\`/\`ArrowUp\` navigate items; \`Enter\` selects; \`Escape\` closes |

### Inline variants (\`radio\`, \`segmented\`, \`list\`, \`table\`)

| Requirement | Implementation |
|-------------|----------------|
| Container | \`role="radiogroup"\` (in \`table\`, set on the \`<table>\` or its wrapper) |
| Options/rows | \`role="radio"\` + \`aria-checked\`, or native \`<input type="radio">\` sharing one \`name\` (e.g. a per-instance uid). Disabled items: \`aria-disabled\` / \`disabled\` |
| Column headers | (\`table\`) real \`<th scope="col">\` from \`Column\` slots |
| Keyboard | \`ArrowUp\`/\`ArrowDown\` (and \`ArrowLeft\`/\`ArrowRight\` for \`segmented\`) move selection; \`Space\`/\`Enter\` selects |

### All variants

| Requirement | Implementation |
|-------------|----------------|
| Label | \`aria-labelledby\` pointing to rendered label |
| Error | \`aria-describedby\` pointing to error element |
| Invalid | \`aria-invalid="true"\` when error exists |
| Required | \`aria-required="true"\` |

---

## 13. Variants

The \`variant\` property selects the layout. **All variants share the same value contract**
(§4): a single string equal to the selected \`Item\`'s \`value\` attribute, \`null\` when nothing
is selected. Only rendering and a11y differ. Default is \`dropdown\` to preserve existing
behavior.

| \`variant\` | Layout | When to use |
|-----------|--------|-------------|
| \`dropdown\` | Trigger button + popover panel (combobox) | Many options, compact footprint, value chosen occasionally |
| \`radio\` | Always-visible vertical radio group | A handful of options that benefit from being all visible |
| \`segmented\` | Horizontal segmented control | 2–5 short, mutually exclusive options |
| \`list\` | Always-visible single-column list picker | Medium option counts where each row is one label |
| \`table\` | Always-visible radio group laid out as a table | Each option has **multiple comparable attributes** (e.g. plan name, price, limits) and the user picks one row |

### 13.1 \`table\` variant — details

Reference implementation: \`_102040_/l2/molecules/groupviewtable/ml-data-table-select\`
(its \`select-mode="single"\` path). That molecule lives in \`groupViewTable\` and keys its
value by **row index**; here in \`groupSelectOne\` the value is keyed by the \`Item\`'s
\`value\` attribute instead, keeping this group's contract intact.

**Markup**

\`\`\`html
<component variant="table" required>
  <Label>Choose a plan</Label>
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
    <Cell>∞</Cell>
  </Item>
  <Empty>No plans available</Empty>
  <Helper>You can change your plan later.</Helper>
</component>
\`\`\`

**Rendering**

- Render a \`<table>\`. \`<thead>\` has one \`<th scope="col">\` per \`Column\` slot, plus a leading
  empty \`<th>\` for the radio column.
- \`<tbody>\` has one \`<tr>\` per \`Item\`. The first \`<td>\` holds
  \`<input type="radio" name="\${uid}">\` (one shared \`name\` per instance so only one row can
  be checked); the remaining \`<td>\`s render the \`Cell\` contents in order.
- A row is checked when its \`Item\` \`value\` equals \`this.value\`. Clicking the row (or its
  radio) sets \`this.value = item.value\` and emits \`change\` — no panel, no \`isOpen\`.
- \`Item\` with \`disabled\`: radio disabled, row not selectable.
- If \`searchable\`, filter rows by their visible cell text.
- When no \`Column\` slots are present, render rows with no header (just the radio + cells).
- View mode (\`isEditing=false\`): render only the selected \`Item\`'s cells as static text
  (or the placeholder/\`—\` when none selected) — no table chrome, no radios.

**Selection handler (adapted from the reference's single-select path)**

\`\`\`typescript
private handleRowSelect(item: { value: string; disabled: boolean }) {
  if (this.disabled || this.readonly || item.disabled) return;
  this.value = item.value;                 // value = Item value, NOT row index
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
| 1.0.0 | 2026-04-20 | Initial creation reference |
| 1.1.0 | 2026-04-20 | Removed item parsing helpers; inline pattern in Rendering Logic |
| 1.2.0 | 2026-06-15 | Added \`variant\` property (dropdown/radio/segmented/list/table); documented inline layouts and the \`table\` variant (flat \`Column\` headers + \`Cell\` rows, radio selection) based on \`ml-data-table-select\`; made Trigger/placeholder/isOpen/open-close and combobox a11y dropdown-scoped |
| 1.3.0 | 2026-06-22 | Added §7.1 Portal — floating panel must render in \`<body>\` via \`litRender\` to escape CSS stacking contexts |

`