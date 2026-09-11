/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewMetric/usage.ts" enhancement="_blank"/>

export const skill = `

# groupviewMetric — Usage

> Quick reference for using molecules in the **view + metric** group.
> Use this when the user needs to **view a highlighted indicator or metric**.
> Purely visual — all data provided via slot tags.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Metric name/title |
| \`Value\` | The main metric value (formatted number, text, HTML) |
| \`Icon\` | Icon displayed alongside the metric |
| \`Trend\` | Trend indicator. Attribute: \`direction\` (\`'up'\`, \`'down'\`, \`'neutral'\`). Content = free (arrow, percentage, text) |
| \`Helper\` | Supporting text below (period, comparison, context) |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`loading\` | \`boolean\` | \`false\` | Show skeleton placeholder instead of metric |

---

## Events

None. This component is purely visual.

---

## Examples

### Big number — monthly revenue

\`\`\`html
<molecules--big-number-102020>
  <Label>Monthly Revenue</Label>
  <Value>$127,450</Value>
  <Trend direction="up">↑ 12.5%</Trend>
  <Helper>vs last month</Helper>
</molecules--big-number-102020>
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
  --ml-success-dim: #f0fdf4;
  --ml-success-border: #bbf7d0;
  --ml-outline-focus: #3b82f6;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-success-border\` | \`#bbf7d0\` | Success border |
| \`--ml-success-dim\` | \`#f0fdf4\` | Success background |

`;