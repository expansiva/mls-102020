/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSearchContent/usage.ts" enhancement="_blank"/>

export const skill = `
# search + content — Usage

> Quick reference for using molecules in the **search + content** group.
> Use this when the user needs to **find content using text search**.
> The component emits \`search\` events; the page provides suggestions via slot tags.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Label displayed above the search field |
| \`Helper\` | Descriptive text shown below the field when there is no error |
| \`Suggestion\` | One search result. Attributes: \`value\` (required). Content = display label |
| \`Empty\` | Content shown when no suggestions match |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string \| null\` | \`null\` | Confirmed value — suggestion value or typed text. \`null\` = nothing confirmed |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`placeholder\` | \`string\` | \`''\` | Placeholder text for the search input |
| \`debounce\` | \`number\` | \`300\` | Debounce time in ms before emitting \`search\` event |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field |
| \`loading\` | \`boolean\` | \`false\` | Shows loading indicator while fetching suggestions |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`search\` | \`{ query: string }\` | Fired (debounced) when user types. Page should update suggestions |
| \`change\` | \`{ value: string \| null }\` | Fired when value is confirmed (suggestion selected or Enter pressed) |
| \`clear\` | \`{}\` | Fired when the user clears the search |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- \`value\` is a **string** — either the selected suggestion's \`value\` attribute or the raw typed text
- \`null\` when nothing is confirmed
- User selects suggestion → \`value\` = suggestion value
- User presses Enter → \`value\` = typed text

---

## Examples

### Product search with suggestions

\`\`\`html
<molecules--search-field-102020
  value="{{ui.catalog.selectedProduct}}"
  error="{{ui.catalog.searchError}}"
  loading="{{ui.catalog.isSearching}}"
  placeholder="Search products..."
  debounce="300">
  <Label>Product Search</Label>
  <Suggestion value="prod-001">Wireless Headphones</Suggestion>
  <Suggestion value="prod-002">Bluetooth Speaker</Suggestion>
  <Suggestion value="prod-003">USB-C Cable</Suggestion>
  <Empty>No products found</Empty>
</molecules--search-field-102020>
\`\`\`

---

## Customization via data-class

### On the component host

Pass extra CSS classes via \`data-class\`:

\`\`\`html
<component data-class="w-full mt-4">
  <Label>Text</Label>
</component>
\`\`\`

### On slot tags

Pass CSS classes on slot tags via \`data-class\`:

\`\`\`html
<component>
  <Label data-class="uppercase tracking-wide">Text</Label>
  <Helper data-class="italic">Help text</Helper>
</component>
\`\`\`

---

## Design Tokens

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom properties on a parent element:

\`\`\`css
.my-container {
  --ml-primary: #7c3aed;
  --ml-radius-sm: 10px;
  --ml-font-family: 'Inter', sans-serif;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-surface\` | \`#ffffff\` | Component background |
| \`--ml-surface-dim\` | \`#f5f5f5\` | Hover background |
| \`--ml-on-surface\` | \`#1c1b1f\` | Primary text |
| \`--ml-on-surface-muted\` | \`#49454f\` | Secondary text |
| \`--ml-on-surface-faint\` | \`#79747e\` | Placeholder |
| \`--ml-primary\` | \`#3b82f6\` | Primary action color |
| \`--ml-on-primary\` | \`#ffffff\` | Text on primary |
| \`--ml-error\` | \`#ef4444\` | Error color |
| \`--ml-on-error\` | \`#ffffff\` | Text on error |
| \`--ml-outline-variant\` | \`#e2e8f0\` | Default border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-radius-sm\` | \`6px\` | Default radius |
| \`--ml-shadow-1\` | \`0 1px 3px rgba(0,0,0,0.1)\` | Subtle shadow |
| \`--ml-font-family\` | \`system-ui, sans-serif\` | Font family |
| \`--ml-font-weight-medium\` | \`500\` | Medium weight |
| \`--ml-transition\` | \`200ms ease\` | Transition |
| \`--ml-focus-ring-color\` | \`rgba(59,130,246,0.4)\` | Focus ring |
| \`--ml-disabled-opacity\` | \`0.5\` | Disabled opacity |

`;