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

## Design System Roles

These are roles of the **project design system**. The client defines them in
\`l2/designSystem.ts\` (through the Design System plugin), with night mode and the
\`-hover\`/\`-focus\`/\`-disabled\` variants — and the molecule follows the theme
automatically. The Default column is what the molecule renders when the project has
**no** design system.

The \`--ml-*\` in the \`## Design Tokens\` section, by contrast, have **no** place in
\`designSystem.ts\` — they can only be adjusted by overriding the variable in CSS.

| Role | Default (no DS) | Purpose |
|------|-----------------|---------|
| \`--border-default\` | \`#e2e8f0\` | Structural border — inputs, tables, cards, floating panels |
| \`--border-default-disabled\` | \`#e2e8f0\` | Structural border — inputs, tables, cards, floating panels — disabled state |
| \`--border-default-focus\` | \`#e2e8f0\` | Structural border — inputs, tables, cards, floating panels — focus state |
| \`--border-default-hover\` | \`#e2e8f0\` | Structural border — inputs, tables, cards, floating panels — hover state |
| \`--button-danger-bg\` | \`#ef4444\` | Destructive action fill |
| \`--button-danger-bg-hover\` | \`#ff4a4a\` | Destructive action fill — hover state |
| \`--button-danger-text\` | \`#ffffff\` | Label on the destructive action |
| \`--button-primary-bg\` | \`#3b82f6\` | Primary action fill |
| \`--button-primary-bg-hover\` | \`#408fff\` | Primary action fill — hover state |
| \`--button-primary-text\` | \`#ffffff\` | Label on the primary action |
| \`--button-secondary-bg\` | \`#ffffff\` | Secondary action fill |
| \`--button-secondary-bg-hover\` | \`#f5f5f5\` | Secondary action fill — hover state |
| \`--button-secondary-border\` | \`#e2e8f0\` | Secondary action border |
| \`--button-secondary-border-hover\` | \`#e2e8f0\` | Secondary action border — hover state |
| \`--button-secondary-text\` | \`#1c1b1f\` | Label on the secondary action |
| \`--focus-ring\` | \`rgba(59, 130, 246, 0.4)\` | Keyboard focus ring |
| \`--font-family-primary\` | \`system-ui, -apple-system, sans-serif\` | Primary font stack |
| \`--font-weight-bold\` | \`500\` | Emphasis font weight |
| \`--link-text\` | \`#3b82f6\` | Link colour |
| \`--link-text-hover\` | \`#3b82f6\` | Link colour — hover state |
| \`--radius-small\` | \`6px\` | Small corner radius |
| \`--selected-bg\` | \`#f5f5f5\` | Selected item fill |
| \`--selected-bg-hover\` | \`#f5f5f5\` | Selected item fill — hover state |
| \`--selected-border\` | \`#3b82f6\` | Selected / focused border |
| \`--selected-border-hover\` | \`#3b82f6\` | Selected / focused border — hover state |
| \`--selected-text\` | \`#3b82f6\` | Selected item text |
| \`--selected-text-hover\` | \`#3b82f6\` | Selected item text — hover state |
| \`--shadow-medium\` | \`0 4px 6px rgba(0, 0, 0, 0.1)\` | Raised elevation |
| \`--shadow-small\` | \`0 1px 3px rgba(0, 0, 0, 0.1)\` | Subtle elevation |
| \`--surface-alt-bg\` | \`#f5f5f5\` | Subtle surface — zebra rows, row hover, skeleton, section headers |
| \`--surface-bg\` | \`#ffffff\` | Elevated surface — cards, panels, modals, floating menus |
| \`--text-muted\` | \`#49454f\` | Secondary text and placeholders |
| \`--text-muted-disabled\` | \`#79747e\` | Secondary text and placeholders — disabled state |
| \`--text-strong\` | \`#1c1b1f\` | Most prominent text — titles, emphasized labels |
| \`--transition-fast\` | \`200ms ease\` | Fast transition |

`;