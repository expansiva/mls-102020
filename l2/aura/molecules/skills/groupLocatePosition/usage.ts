/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupLocatePosition/usage.ts" enhancement="_blank"/>

export const skill = `

# locate + position — Usage

> Quick reference for using molecules in the **locate + position** group.
> Use this when you need the user to **inform or visualize a geographic location**.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Label displayed above or beside the field |
| \`Helper\` | Descriptive text shown below the field when there is no error |
| \`Trigger\` | Custom label for the geolocation button |
| \`Suggestions\` | Container for suggestion items, populated by the page |
| \`Item\` | One suggestion inside \`<Suggestions>\`. Attribute: \`value\` = \`"lat,lng"\`. Content = address label |
| \`Empty\` | Content shown when no location is selected or no suggestions found |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string \| null\` | \`null\` | Coordinates as \`"lat,lng"\` (e.g. \`"-23.55,-46.63"\`) or \`null\` |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`placeholder\` | \`string\` | \`''\` | Placeholder text for the search input |
| \`show-map\` | \`boolean\` | \`false\` | Show an embedded map preview of the selected location |
| \`allow-geolocation\` | \`boolean\` | \`false\` | Show a button to capture the user's current position |
| \`is-editing\` | \`boolean\` | \`true\` | \`true\` = interactive input, \`false\` = read-only text |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents editing but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks a location as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator (e.g. while fetching suggestions) |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: string \| null }\` | Fired when a location is selected. Value is \`"lat,lng"\` or null |
| \`search\` | \`{ query: string }\` | Fired when the user types. Page must update \`<Suggestions>\` items in response |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- \`value\` is a plain **string** in \`"lat,lng"\` format (e.g. \`"-23.55,-46.63"\`)
- \`null\` when nothing is selected
- Suggestions are provided via \`<Item>\` elements inside the \`<Suggestions>\` slot tag

---

## Search Flow

The molecule does **not** call any API directly. The page is responsible for fetching suggestions:

\`\`\`
1. User types → molecule emits \`search\` with { query }
2. Page calls BFF, receives address list
3. Page updates <Suggestions> slot with <Item> elements
4. Molecule renders the suggestion list
5. User selects → molecule sets value = item.value, emits \`change\`
\`\`\`

---

## Examples

### Address autocomplete

\`\`\`html
<molecules--address-autocomplete-102020
  value="{{ui.order.deliveryCoords}}"
  error="{{ui.order.addressError}}"
  placeholder="Search address..."
  required>
  <Label>Delivery Address</Label>
  <Suggestions>
    <Item value="-23.55,-46.63">São Paulo, SP</Item>
    <Item value="-22.90,-43.17">Rio de Janeiro, RJ</Item>
  </Suggestions>
</molecules--address-autocomplete-102020>
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