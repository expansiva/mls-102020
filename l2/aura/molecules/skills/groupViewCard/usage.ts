/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewCard/usage.ts" enhancement="_blank"/>

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

> **Tag names:** every molecule in this group is \`groupviewcard--ml-<name>\` (e.g. \`groupviewcard--ml-vertical-card\`), with no \`molecules--\` prefix and no project suffix. Copy the exact tag from the molecule's \`.defs.ts\` (\`TagName\`); never compose it.

### Basic product card

\`\`\`html
<groupviewcard--ml-vertical-card>
  <CardHeader>
    <CardTitle>Wireless Headphones</CardTitle>
    <CardDescription>Noise cancelling, 30h battery</CardDescription>
  </CardHeader>
  <CardContent>
    <img src="headphones.jpg" alt="Headphones" />
  </CardContent>
  <CardFooter>$299.00</CardFooter>
</groupviewcard--ml-vertical-card>
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

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom
properties on a parent element. The values below are this group's current defaults —
copy the block and change them:

\`\`\`css
.my-container {
  --ml-outline-variant: #e2e8f0;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-border-style\` | \`solid\` | Border style |
| \`--ml-border-width\` | \`1px\` | Border width |
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-outline-variant\` | \`#e2e8f0\` | Default border |

`;