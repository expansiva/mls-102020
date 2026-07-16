/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupShowProgress/usage.ts" enhancement="_blank"/>

export const skill = `
# show + progress — Usage

> Quick reference for using molecules in the **show + progress** group.
> Use this when the system needs to **indicate the progress of an operation**.
> This is a visual primitive — designed to be composed inside other components.

---


## Slot Tags

None. This component has no slot tags.

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`number \| null\` | \`null\` | Progress 0–100. \`null\` = indeterminate (unknown duration) |
| \`size\` | \`string\` | \`'md'\` | Visual size: \`'xs'\`, \`'sm'\`, \`'md'\`, \`'lg'\` |
| \`label\` | \`string\` | \`''\` | Accessible label describing what is loading |
| \`show-value\` | \`boolean\` | \`false\` | Display the percentage number alongside the indicator |

---

## Events

None. This component is purely visual.

---

## Value Format

- \`number\` (0–100): determinate progress, renders a fill at that percentage
- \`null\`: indeterminate, renders an animated loop (spinner, pulse, sliding bar)

---

## Examples

### Spinner inside a button (indeterminate)

\`\`\`html
<molecules--spinner-102020
  size="sm"
  label="Saving...">
</molecules--spinner-102020>
\`\`\`


### Determinate ring with percentage

\`\`\`html
<molecules--progress-ring-102020
  value="{{ui.report.progress}}"
  size="md"
  show-value="true"
  label="Generating report">
</molecules--progress-ring-102020>
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
