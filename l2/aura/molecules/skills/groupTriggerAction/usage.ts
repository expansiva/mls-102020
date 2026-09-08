/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupTriggerAction/usage.ts" enhancement="_blank"/>

export const skill = `
# trigger + action — Usage

> Quick reference for using molecules in the **trigger + action** group.
> Use this when the user needs to **execute an action or command**.
> All implementations share the same slot tag contract.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Button text content |
| \`Icon\` | Icon content (SVG, emoji, HTML) displayed alongside or instead of the label |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`data-variant\` | \`string\` | \`'primary'\` | Visual tone: \`'primary'\`, \`'secondary'\`, \`'danger'\`, \`'ghost'\`, \`'link'\`. **This is the only way to change how the button looks** — see below |
| \`size\` | \`string\` | \`'md'\` | Button size: \`'xs'\`, \`'sm'\`, \`'md'\`, \`'lg'\` |
| \`type\` | \`string\` | \`'button'\` | HTML button type: \`'button'\`, \`'submit'\`, \`'reset'\` |
| \`icon-position\` | \`string\` | \`'start'\` | Icon placement: \`'start'\` or \`'end'\` |
| \`disabled\` | \`boolean\` | \`false\` | Disables the button |
| \`loading\` | \`boolean\` | \`false\` | Shows loading indicator, blocks interaction |

### Tone comes from \`data-variant\`, never from \`data-class\`

Each variant maps to a class the molecule's own stylesheet defines (\`primary\` → \`.ml-button-primary\`,
\`danger\` → \`.ml-button-danger\`, and so on), coloured from the \`--ml-*\` tokens. So the theme decides the
palette and the page only declares intent.

**Do not try to restyle the button with \`data-class\` background/text utilities.** \`data-class\` is
appended to the same element that already carries the variant class, both are single-class selectors, so
neither wins by specificity — the one emitted later in the CSS does. In practice the variant's background
survives and the override silently does nothing: a button meant to read as destructive stays the primary
colour. Reach for \`data-class\` only for what the variant does not set (margin, width, alignment).

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`action\` | \`{}\` | Fired when the button is clicked |

---

## Examples

### Primary button

\`\`\`html
<molecules--button-102020
  size="md">
  <Label>Save Changes</Label>
</molecules--button-102020>
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
| \`--ml-border-style\` | \`solid\` | Border style |
| \`--ml-border-width\` | \`1px\` | Border width |
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |

---

`;