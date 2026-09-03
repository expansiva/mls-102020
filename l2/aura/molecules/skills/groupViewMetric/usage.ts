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