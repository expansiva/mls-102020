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

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom
properties on a parent element. The values below are this group's current defaults —
copy the block and change them:

\`\`\`css
.my-container {
  --ml-warning: #d97706;
  --ml-success: #16a34a;
  --ml-error: #ef4444;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-error\` | \`#ef4444\` | Error color |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-success\` | \`#16a34a\` | Success color |
| \`--ml-warning\` | \`#d97706\` | Warning color |

`;
