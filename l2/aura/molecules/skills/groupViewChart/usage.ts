/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewChart/usage.ts" enhancement="_blank"/>

export const skill = 
`# view + chart — Usage

> Quick reference for using molecules in the **view + chart** group.
> Use this when the system needs to **display data through a chart**.
> All chart implementations share the same slot tag contract — swap the tag to change the visualization.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Chart title displayed above the chart |
| \`Series\` | Named data series. Attributes: \`name\` (required), \`color\`. Contains \`<Point>\` children |
| \`Point\` | Single data point. Attributes: \`label\` (required), \`value\` (required), \`color\` |
| \`Empty\` | Content shown when no data is provided |

### When to use Series vs standalone Points

- **Multi series** (Line, Bar, Area, Radar, Scatter): wrap \`<Point>\` inside \`<Series>\`
- **Single series** (Pie, Donut, Funnel): put \`<Point>\` directly in the root, each with its own \`color\`

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`show-legend\` | \`boolean\` | \`true\` | Display the legend |
| \`show-values\` | \`boolean\` | \`false\` | Display numeric values on data points |
| \`loading\` | \`boolean\` | \`false\` | Show loading placeholder instead of chart |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`pointClick\` | \`{ label: string, value: number, series?: string }\` | Fired when the user clicks a data point |

---

## Examples

### Bar chart — monthly revenue comparison

\`\`\`html
<molecules--bar-chart-102020
  show-values="true">
  <Label>Monthly Revenue</Label>
  <Series name="2024" color="#3b82f6">
    <Point label="Jan" value="1200" />
    <Point label="Feb" value="1800" />
    <Point label="Mar" value="950" />
  </Series>
  <Series name="2025" color="#10b981">
    <Point label="Jan" value="1500" />
    <Point label="Feb" value="2100" />
    <Point label="Mar" value="1300" />
  </Series>
</molecules--bar-chart-102020>
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
  --ml-on-surface: #1c1b1f;
  --ml-surface: #fff;
  --ml-outline-variant: #e2e8f0;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-on-surface\` | \`#1c1b1f\` | Primary text |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-outline-variant\` | \`#e2e8f0\` | Default border |
| \`--ml-surface\` | \`#fff\` | Component background |

`;