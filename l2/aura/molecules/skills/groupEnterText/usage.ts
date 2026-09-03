/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterText/usage.ts" enhancement="_blank"/>

export const skill = `

# enter + text — Usage

> Quick reference for using molecules in the **enter + text** group.
> Use this when you need the user to provide **free-form text**.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Label displayed above or beside the field |
| \`Helper\` | Descriptive text shown below the field when there is no error |
| \`Prefix\` | Content rendered before the input (e.g. icon, static text) |
| \`Suffix\` | Content rendered after the input (e.g. icon, action button) |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string\` | \`''\` | Current text value |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`placeholder\` | \`string\` | \`''\` | Placeholder text when value is empty |
| \`maxLength\` | \`number \| null\` | \`null\` | Maximum number of characters (null = no limit) |
| \`minLength\` | \`number \| null\` | \`null\` | Minimum number of characters (null = no minimum) |
| \`rows\` | \`number\` | \`1\` | Number of visible rows. \`1\` = input, \`>1\` = textarea |
| \`autocomplete\` | \`string\` | \`''\` | HTML autocomplete value (e.g. \`'email'\`, \`'name'\`, \`'off'\`) |
| \`inputType\` | \`string\` | \`'text'\` | Input type: \`'text'\`, \`'email'\`, \`'password'\`, \`'search'\`, \`'url'\`, \`'tel'\` |
| \`mask\` | \`string\` | \`''\` | Mask pattern. \`#\` = digit, \`A\` = letter, \`*\` = any. Literals inserted automatically |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = input mode, \`false\` = read-only text |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents editing but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks the value as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator inside the field |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: string }\` | Fired when value is confirmed on blur |
| \`input\` | \`{ value: string }\` | Fired on each keystroke |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Value is always a plain **string**
- Empty string \`''\` when not yet provided
- When \`mask\` is set, \`value\` contains the **raw unmasked string** — the formatted display is handled internally
- When \`inputType='password'\`, view mode renders \`"••••••••"\` regardless of value

---

## Examples

### Simple text field

\`\`\`html
<molecules--text-input-102020
  value="{{ui.form.firstName}}"
  error="{{ui.form.firstNameError}}"
  placeholder="John"
  maxLength="200"
  required>
  <Label>First Name</Label>
</molecules--text-input-102020>
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
