/// <mls fileReference="_102020_/l2/skills/molecules/groupViewCard/usage.ts" enhancement="_blank"/>

export const skill = `

# view + card — Usage

> Quick reference for using molecules in the **view + card** group.
> Use this when you need to **display an item as an independent visual unit**.
> This is a composition primitive — the page or organism arranges cards in grids, lists, carousels, etc.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`CardHeader\` | Top section, typically contains title and description |
| \`CardTitle\` | Main title text inside the header |
| \`CardDescription\` | Secondary text inside the header |
| \`CardContent\` | Main body area |
| \`CardFooter\` | Bottom section |
| \`CardAction\` | Actionable element (button, link) |

All slots are optional. The card renders only what is present.

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`clickable\` | \`boolean\` | \`false\` | Entire card is clickable |
| \`selected\` | \`boolean\` | \`false\` | Card is visually highlighted |
| \`disabled\` | \`boolean\` | \`false\` | Card is dimmed and non-interactive |
| \`loading\` | \`boolean\` | \`false\` | Show skeleton placeholder instead of content |
| \`isEditing\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Change all children web components, atribute is-editing  |
---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`cardClick\` | \`{}\` | Fired when the card is clicked (only when \`clickable=true\`) |

---

## Examples

### Basic product card

\`\`\`html
<molecules--card-102020>
  <CardHeader>
    <CardTitle>Wireless Headphones</CardTitle>
    <CardDescription>Noise cancelling, 30h battery</CardDescription>
  </CardHeader>
  <CardContent>
    <img src="headphones.jpg" alt="Headphones" />
  </CardContent>
  <CardFooter>$299.00</CardFooter>
</molecules--card-102020>
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