/// <mls fileReference="_102020_/l2/skills/molecules/groupEnterMoney/usage.ts" enhancement="_blank"/>

export const skill = `
# enter + money — Usage

> Quick reference for using molecules in the **enter + money** group.
> Use this when you need the user to provide a **monetary value** with locale-aware formatting.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Label displayed above or beside the field |
| \`Helper\` | Descriptive text shown below the field when there is no error |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`number \| null\` | \`null\` | Monetary value as a plain number (e.g. \`1500.50\`). \`null\` = not yet provided |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`currency\` | \`string\` | \`'USD'\` | ISO 4217 currency code, e.g. \`'USD'\`, \`'BRL'\`, \`'EUR'\` |
| \`locale\` | \`string\` | \`''\` | Display locale, e.g. \`'en-US'\`, \`'pt-BR'\` |
| \`decimals\` | \`number\` | \`2\` | Decimal places (use \`0\` for currencies without cents, e.g. JPY) |
| \`min\` | \`number \| null\` | \`null\` | Minimum allowed value (null = no minimum) |
| \`max\` | \`number \| null\` | \`null\` | Maximum allowed value (null = no maximum) |
| \`showSymbol\` | \`boolean\` | \`true\` | Display currency symbol alongside the input |
| \`placeholder\` | \`string\` | \`''\` | Placeholder when value is null |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = input mode, \`false\` = formatted read-only text |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents editing but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks the value as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator inside the field |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: number \| null }\` | Fired when value is confirmed on blur |
| \`input\` | \`{ value: number \| null }\` | Fired on each keystroke |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Value stored and emitted as a plain JavaScript **number** (e.g. \`1500.50\`)
- \`null\` when not yet provided
- **Never** includes currency symbols or thousand separators — those are display only
- Display formatting respects \`locale\`, \`currency\`, and \`decimals\`

---

## Examples

### Product price (USD)

\`\`\`html
<molecules--currency-input-102020
  value="{{ui.product.price}}"
  error="{{ui.product.priceError}}"
  currency="USD"
  locale="en-US"
  min="0"
  required>
  <Label>Price</Label>
</molecules--currency-input-102020>
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
