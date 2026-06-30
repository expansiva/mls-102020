/// <mls fileReference="_102020_/l2/skills/molecules/groupEnterBoolean/usage.ts" enhancement="_blank"/>

export const skill = `
# enter + boolean — Usage

> Quick reference for using molecules in the **enter + boolean** group.
> Use this when you need the user to provide a **true/false decision**.
> Value is always \`boolean\` — starts as \`false\` until the user changes it.

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
| \`value\` | \`boolean\` | \`false\` | Current boolean value. Starts as \`false\` until the user changes it |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = interactive control, \`false\` = read-only display |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: boolean }\` | Fired when the user changes the selection |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Value is always a native **JavaScript boolean** (\`true\` or \`false\`)
- Default is \`false\` — the component always has a defined value
- In view mode: \`true\` → "Yes"; \`false\` → "No"

---

## Examples

### Simple toggle (on/off setting)

\`\`\`html
<molecules--toggle-102020
  value="{{ui.settings.notifications}}"
  error="{{ui.settings.notificationsError}}">
  <Label>Enable notifications</Label>
</molecules--toggle-102020>
\`\`\`

### Checkbox with terms acceptance

\`\`\`html
<molecules--checkbox-102020
  value="{{ui.form.acceptTerms}}"
  error="{{ui.form.acceptTermsError}}">
  <Label>I accept the terms and conditions</Label>
  <Helper>You must accept to continue</Helper>
</molecules--checkbox-102020>
\`\`\`

### Interchangeability — swapping toggle for checkbox

Both components share the same contract. Only the tag changes:

\`\`\`html
<molecules--toggle-102020
  value="{{ui.form.acceptTerms}}"
  error="{{ui.form.acceptTermsError}}">
  <Label>I accept the terms and conditions</Label>
  <Helper>You must accept to continue</Helper>
</molecules--toggle-102020>
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
