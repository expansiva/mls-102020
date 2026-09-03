/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupRateItem/usage.ts" enhancement="_blank"/>

export const skill = `
# rate + item — Usage

> Quick reference for using molecules in the **rate + item** group.
> Use this when you need the user to **rate or score an item**.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Label displayed above or beside the field |
| \`Helper\` | Descriptive text shown below the field when there is no error |
| \`Item\` | One rating option. Attribute: \`value\` (required). Content = visual label (emoji, icon, text). When no \`<Item>\` is declared, options are auto-generated from \`min\`/\`max\`/\`step\` |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`number \| null\` | \`null\` | Selected rating value. \`null\` = no rating |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`min\` | \`number\` | \`0\` | Minimum value (ignored when \`<Item>\` slots are present) |
| \`max\` | \`number\` | \`5\` | Maximum value (ignored when \`<Item>\` slots are present) |
| \`step\` | \`number\` | \`1\` | Increment between values (ignored when \`<Item>\` slots are present) |
| \`is-editing\` | \`boolean\` | \`true\` | \`true\` = interactive, \`false\` = read-only visual |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents selection but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks a rating as required |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: number \| null }\` | Fired when a rating is selected |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Value is a plain **number** representing the selected rating
- \`null\` when no rating is selected
- When using \`<Item>\` slots, \`value\` matches the item's \`value\` attribute (parsed as number)
- When auto-generated, \`value\` is in the \`min\`–\`max\` range


---

## Examples

### Star rating (auto-generated, 1–5)

\`\`\`html
<molecules--star-rating-102020
  value="{{ui.review.rating}}"
  error="{{ui.review.ratingError}}"
  min="1"
  max="5"
  required>
  <Label>Rate this product</Label>
</molecules--star-rating-102020>
\`\`\`

### Thumbs up/down

\`\`\`html
<molecules--thumbs-102020
  value="{{ui.comment.vote}}">
  <Item value="0">👎</Item>
  <Item value="1">👍</Item>
</molecules--thumbs-102020>
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

`