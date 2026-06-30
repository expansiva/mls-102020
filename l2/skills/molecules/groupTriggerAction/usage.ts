/// <mls fileReference="_102020_/l2/skills/molecules/groupTriggerAction/usage.ts" enhancement="_blank"/>

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
| \`size\` | \`string\` | \`'md'\` | Button size: \`'xs'\`, \`'sm'\`, \`'md'\`, \`'lg'\` |
| \`type\` | \`string\` | \`'button'\` | HTML button type: \`'button'\`, \`'submit'\`, \`'reset'\` |
| \`icon-position\` | \`string\` | \`'start'\` | Icon placement: \`'start'\` or \`'end'\` |
| \`disabled\` | \`boolean\` | \`false\` | Disables the button |
| \`loading\` | \`boolean\` | \`false\` | Shows loading indicator, blocks interaction |

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