/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterNumber/usage.ts" enhancement="_blank"/>

export const skill = `
# enter + number — Usage

> Quick reference for using molecules in the **enter + number** group.
> Use this when you need the user to provide a **numeric value**.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Label displayed above or beside the field |
| \`Helper\` | Descriptive text shown below the field when there is no error |
| \`Prefix\` | Content rendered before the input (e.g. \`#\`, \`km\`) |
| \`Suffix\` | Content rendered after the input (e.g. \`kg\`, \`%\`) |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`number \| null\` | \`null\` | Current numeric value. \`null\` = not yet provided |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`min\` | \`number \| null\` | \`null\` | Minimum allowed value (null = no minimum) |
| \`max\` | \`number \| null\` | \`null\` | Maximum allowed value (null = no maximum) |
| \`step\` | \`number\` | \`1\` | Increment/decrement step for stepper and slider |
| \`decimals\` | \`number\` | \`0\` | Number of decimal places |
| \`locale\` | \`string\` | \`''\` | Display locale, e.g. \`'en-US'\`, \`'pt-BR'\` |
| \`placeholder\` | \`string\` | \`''\` | Placeholder text when value is null |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = input mode, \`false\` = read-only formatted text |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents editing but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks the value as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator inside the field |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: number \| null }\` | Fired when value is confirmed (blur or stepper click) |
| \`input\` | \`{ value: number \| null }\` | Fired on each keystroke |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Value stored and emitted as a plain JavaScript **number**
- \`null\` when not yet provided
- Display respects \`locale\` and \`decimals\`; stored value is always a raw number

---

## Examples

### Basic quantity

\`\`\`html
<molecules--number-stepper-102020
  value="{{ui.order.quantity}}"
  error="{{ui.order.quantityError}}"
  min="1"
  max="99"
  step="1"
  required>
  <Label>Quantity</Label>
</molecules--number-stepper-102020>
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
  --ml-outline-focus: #3b82f6;
  --ml-outline-error: #ef4444;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-border-style\` | \`solid\` | Border style |
| \`--ml-border-width\` | \`1px\` | Border width |
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |

`;