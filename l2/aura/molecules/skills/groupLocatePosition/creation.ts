/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupLocatePosition/creation.ts" enhancement="_blank"/>

export const skill = `

# groupLocatePosition — Creation

> Implementation reference for creating molecules in the **groupLocatePosition** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupLocatePosition\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Label displayed above or beside the field |
| \`Helper\` | No | Help text displayed below the field |
| \`Trigger\` | No | Custom content for the geolocation button |
| \`Suggestions\` | No | Container for address suggestion items, populated by the page |
| \`Item\` | No | One suggestion inside \`<Suggestions>\`. Attribute: \`value\` = \`"lat,lng"\`. Content = address label |
| \`Empty\` | No | Content shown when no location is selected or no suggestions available |

\`\`\`typescript
slotTags = ['Label', 'Helper', 'Trigger', 'Suggestions', 'Item', 'Empty'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Label>
├── <Trigger>
├── <Suggestions>
│   └── <Item value="lat,lng">
├── <Empty>
└── <Helper>
\`\`\`

---


## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | Selected coordinates as \`"lat,lng"\` (e.g. \`"-23.55,-46.63"\`) or \`null\` |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`placeholder\` | \`string\` | \`''\` | \`@propertyDataSource\` | Placeholder text for the search input |
| \`showMap\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show an embedded map preview of the selected location |
| \`allowGeolocation\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show a button to use the browser's geolocation API |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isEditing\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Edit mode (true) or view mode (false) |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | A location is required |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state (e.g. fetching suggestions or resolving geolocation) |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`searchQuery\` | \`string\` | \`''\` | \`@state\` | Current text in the search input |
| \`isOpen\` | \`boolean\` | \`false\` | \`@state\` | Whether the suggestions panel is open |

---

## 4. Value Contract

### Storage Format

- \`value\` is a plain **string** in the format \`"lat,lng"\` (e.g. \`"-23.55,-46.63"\`)
- \`null\` means no location selected
- Parsing:

\`\`\`typescript
private parseValue(): { lat: number; lng: number } | null {
  if (!this.value) return null;
  const [lat, lng] = this.value.split(',').map(Number);
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
}
\`\`\`

### Suggestions via Slot Tags

Suggestions are provided by the page as \`<Item>\` elements inside \`<Suggestions>\`:

\`\`\`html
<Suggestions>
  <Item value="-23.55,-46.63">São Paulo, SP - Brazil</Item>
  <Item value="-22.90,-43.17">Rio de Janeiro, RJ - Brazil</Item>
</Suggestions>
\`\`\`

Read suggestions inline using \`getSlots\`:

\`\`\`typescript
const suggestionsContainer = this.getSlot('Suggestions');
const items = suggestionsContainer
  ? Array.from(suggestionsContainer.querySelectorAll('Item')).map(el => ({
      value: el.getAttribute('value') || '',
      label: el.innerHTML,
    }))
  : [];
\`\`\`

The page updates \`<Suggestions>\` content in response to the \`search\` event.

### View Mode

- If \`value\` is \`null\`: render Empty slot content or \`"—"\`
- Otherwise: find the matching \`<Item>\` label for the current value, or display the raw coordinates
- If \`showMap=true\`: render map preview with pin at the parsed lat/lng

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: string \| null }\` | ✓ | Location confirmed — value is \`"lat,lng"\` or null |
| \`search\` | \`{ query: string }\` | ✓ | User typed in search input — page should update \`<Suggestions>\` items |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Search Flow

\`\`\`
User types in search input
  → emit \`search\` with { query }
  → Page calls BFF, updates <Suggestions> slot with <Item> elements
  → Component re-renders suggestion list
  → User selects a suggestion
  → Component sets value = item.value ("lat,lng"), emits \`change\`
  → isOpen = false, searchQuery = selected item label
\`\`\`

### Geolocation Flow

\`\`\`
User clicks geolocation button
  → browser navigator.geolocation.getCurrentPosition()
  → on success: set value = "lat,lng", emit \`change\`
  → emit \`search\` with { query: "lat,lng" } so page can resolve address
  → page updates <Suggestions> with resolved address
\`\`\`

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value }
}));

this.dispatchEvent(new CustomEvent('search', {
  bubbles: true,
  composed: true,
  detail: { query: this.searchQuery }
}));
\`\`\`

---

## 6. isEditing Mode

| Mode | \`isEditing\` | Behavior |
|------|-------------|----------|
| **Edit** | \`true\` | Renders search input, suggestions panel, optional map |
| **View** | \`false\` | Renders address as static text, optional map |

- In view mode: no input, no suggestions, no search events, no error, no helper

---

## 6.1 Portal — Suggestions Panel Rendering

> The address suggestions panel MUST be rendered outside the component tree, in
> \`<body>\`, using the **portal pattern** with \`litRender\`. This prevents the
> panel from being clipped or hidden behind sibling elements when any ancestor
> uses \`backdrop-filter\`, \`transform\`, \`overflow: hidden\`, or explicit \`z-index\`
> (all of which create new CSS stacking contexts).
>
> Only the suggestions dropdown goes into the portal. The search input and the
> map preview (when \`showMap=true\`) stay inside the component.

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

### Lifecycle integration

| Hook | Action |
|------|--------|
| When \`isOpen\` becomes \`true\` | Call \`createPortal()\` |
| When \`isOpen\` becomes \`false\` | Call \`destroyPortal()\` |
| \`disconnectedCallback()\` | Call \`destroyPortal()\` for cleanup |
| \`updated()\` | When \`isOpen && portalContainer\`: call \`renderPortalContent()\` + \`updatePanelPosition()\` — re-renders when new suggestions arrive from the page |

### Positioning — relative to search input

\\\`\\\`\\\`typescript
private updatePanelPosition() {
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

### CSS — shared selector for portal

Panel styles must work both inside the component and in the body-level portal.
Use a shared selector in the \`.less\` file:

\\\`\\\`\\\`less
my-component,
div[data-widget="my-component"] {
  .suggestions-panel { /* panel styles */ }
}
\\\`\\\`\\\`

Both selectors are TOP-LEVEL — the list is a sibling of the main
\`my-component { ... }\` block, NEVER nested inside it (nesting compiles to a
descendant selector that never matches the body-level portal, so the panel
renders unstyled). \`my-component\` is always this molecule's OWN tag.

### Reference implementation

\`mls-102040/l2/molecules/groupselectone/ml-card-selector.ts\` (same portal pattern)

---

## 7. Validation Rules

| Rule | Behavior |
|------|----------|
| \`required\` and \`value === null\` | Error state until a location is selected |
| No \`<Item>\` inside \`<Suggestions>\` | Render Empty slot or default "No results" message |

---

## 8. Error Handling

| \`error\` value | Behavior |
|---------------|----------|
| \`''\` | No error — show Helper if slot exists |
| \`'any message'\` | Show error message, apply error visual state |

- Error never shown in view mode
- Page/Organism is responsible for setting the error message

---

## 9. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Focused** | Search input border highlighted |
| **Open** | Suggestions panel visible |
| **Selected** | Address displayed in input, map pin updated |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No editing, text selectable |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator; suggestions panel disabled |
| **View Mode** | Address as plain text, optional map |

---

## 10. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Search input | \`role="combobox"\`, \`aria-expanded\`, \`aria-autocomplete="list"\` |
| Suggestions panel | \`role="listbox"\` |
| Suggestion items | \`role="option"\`, \`aria-selected\` |
| Label | \`aria-labelledby\` pointing to rendered label |
| Error | \`aria-describedby\` pointing to error element |
| Invalid | \`aria-invalid="true"\` when error exists |
| Required | \`aria-required="true"\` |
| Geolocation button | \`aria-label="Use current location"\` |

---

## 11. Design Tokens

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

## 12. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-20 | Initial creation reference |
| 1.1.0 | 2026-04-21 | Suggestions via Slot Tags; value simplified to "lat,lng" string |
| 1.2.0 | 2026-06-22 | Added §6.1 Portal — suggestions panel must render in \`<body>\` via \`litRender\`; map preview stays inline |
| 1.3.0 | 2026-07-17 | Added CSS — shared selector for portal (top-level, never nested; own tag only) |
`;
