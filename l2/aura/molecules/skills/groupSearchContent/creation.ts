/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSearchContent/creation.ts" enhancement="_blank"/>

export const skill = `
# groupSearchContent — Creation

> Implementation reference for creating molecules in the **groupSearchContent** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupSearchContent\` |
| **Category** | Data Discovery |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Label displayed above the search field |
| \`Helper\` | No | Help text displayed below the search field |
| \`Suggestion\` | No | One search suggestion. Attributes: \`value\` (required). Content = display label |
| \`Empty\` | No | Content shown when no suggestions match |

\`\`\`typescript
slotTags = ['Label', 'Helper', 'Suggestion', 'Empty'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Label>
├── <Suggestion value="...">...label...</Suggestion>
├── <Empty>
└── <Helper>
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | Confirmed value — either a suggestion's \`value\` or the raw typed text |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`placeholder\` | \`string\` | \`''\` | \`@propertyDataSource\` | Placeholder text for the search input |
| \`debounce\` | \`number\` | \`300\` | \`@propertyDataSource\` | Debounce time in ms before emitting \`search\` event |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Disables the search field |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Shows loading indicator (e.g. while fetching suggestions) |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`query\` | \`string\` | \`''\` | \`@state\` | Current text in the search input |
| \`isOpen\` | \`boolean\` | \`false\` | \`@state\` | Whether the suggestions panel is open |

---

## 4. Value Contract

### Confirmation Logic

- **User selects a suggestion:** \`value\` = suggestion's \`value\` attribute, \`query\` = suggestion's label
- **User presses Enter without selecting:** \`value\` = raw \`query\` text
- **User clears the input:** \`value\` = \`null\`, \`query\` = \`''\`

### Search Flow

\`\`\`
1. User types → update query, debounce, emit \`search\` with { query }
2. Page calls BFF, updates <Suggestion> slot tags
3. Component renders suggestion list
4. User selects suggestion → value = suggestion.value, emit \`change\`
   OR user presses Enter → value = query text, emit \`change\`
5. Suggestions panel closes
\`\`\`

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`search\` | \`{ query: string }\` | ✓ | Fired (debounced) when user types — page should update suggestions |
| \`change\` | \`{ value: string \| null }\` | ✓ | Fired when a value is confirmed (suggestion selected or Enter pressed) |
| \`clear\` | \`{}\` | ✓ | Fired when the user clears the search |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('search', {
  bubbles: true,
  composed: true,
  detail: { query: this.query }
}));

this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value }
}));
\`\`\`

---

## 6. Reading Suggestions

Read suggestions inline using \`getSlots\`:

\`\`\`typescript
const suggestions = this.getSlots('Suggestion').map(el => ({
  value: el.getAttribute('value') || '',
  label: el.innerHTML,
}));
\`\`\`

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Empty** | Placeholder visible, no suggestions |
| **Typing** | Input active, suggestions panel may open |
| **Open** | Suggestions panel visible |
| **Loading** | Loading indicator inside the suggestions area |
| **Selected** | Value confirmed, input shows selected label or query |
| **Disabled** | Dimmed, no interaction |
| **Error** | Error border/style, error message visible |

---

## 7.1 Portal — Suggestions Panel Rendering

> The suggestions panel MUST be rendered outside the component tree, in \`<body>\`,
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
| \`portalWidgetName\` | \`protected\` | \`string\` — value of the \`data-widget\` attribute set on the portal container (the molecule tag name; the \`.less\` targets it via \`div[data-widget="..."]\`) |
| \`getPortalTemplate()\` | \`protected\` | Returns \`TemplateResult\` with the suggestions panel content. Subclasses override this to render themed variants |

### Key difference from selectOne/selectMany

The search input stays **inside the component** — only the suggestions panel
goes into the portal. The user types in the component, and suggestions appear
in the portal below it.

### Lifecycle integration

| Hook | Action |
|------|--------|
| When \`isOpen\` becomes \`true\` | Call \`createPortal()\` |
| When \`isOpen\` becomes \`false\` | Call \`destroyPortal()\` |
| \`disconnectedCallback()\` | Call \`destroyPortal()\` for cleanup |
| \`updated()\` | When \`isOpen && portalContainer\`: call \`renderPortalContent()\` + \`updatePanelPosition()\` to keep portal in sync with reactive state (query changes, new suggestions) |

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

private destroyPortal() { /* same pattern as selectOne */ }

private updatePanelPosition() {
  if (!this.portalContainer) return;
  const input = this.querySelector('input[role="combobox"]') as HTMLElement;
  if (!input) return;
  const rect = input.getBoundingClientRect();
  Object.assign(this.portalContainer.style, {
    position: 'fixed',
    top: \\\`\\\${rect.bottom + 4}px\\\`,
    left: \\\`\\\${rect.left}px\\\`,
    width: \\\`\\\${rect.width}px\\\`,
    zIndex: '9999',
  });
}
\\\`\\\`\\\`

### Outside click — include portal

\\\`\\\`\\\`typescript
if (!this.contains(target) && !this.portalContainer?.contains(target)) {
  this.closePanel();
}
\\\`\\\`\\\`

### render() — no inline panel

The main \`render()\` includes only the input field, label, helper, and error.
The suggestions panel is rendered exclusively via \`renderPortalContent()\`.

### CSS — shared selector for portal

\\\`\\\`\\\`less
my-component,
div[data-widget="my-component"] {
  .suggestions-panel { /* panel styles */ }
  .suggestion-item   { /* item styles */ }
}
\\\`\\\`\\\`

### Reference implementation

\`mls-102040/l2/molecules/groupselectone/ml-card-selector.ts\` (same portal pattern)

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Input | \`role="combobox"\`, \`aria-expanded\`, \`aria-autocomplete="list"\` |
| Suggestions panel | \`role="listbox"\` |
| Suggestion items | \`role="option"\`, \`aria-selected\` |
| Label | \`aria-labelledby\` pointing to rendered label |
| Error | \`aria-describedby\` pointing to error element |
| Invalid | \`aria-invalid="true"\` when error exists |
| Clear button | \`aria-label="Clear search"\` |
| Keyboard | \`ArrowDown\`/\`ArrowUp\` navigate suggestions; \`Enter\` confirms; \`Escape\` closes panel |

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
| 1.1.0 | 2026-06-22 | Added §7.1 Portal — suggestions panel must render in \`<body>\` via \`litRender\`; input stays in component, only suggestions go to portal |
`;
