/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterDateTime/usage.ts" enhancement="_blank"/>

export const skill = `

# enter + datetime — Usage

> Quick reference for using molecules in the **enter + datetime** group.
> Use this when you need the user to provide a **date and time together**.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Field label shown above the input |
| \`Helper\` | Descriptive text shown below the input when there is no error |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string \| null\` | \`null\` | Selected datetime in ISO 8601 format (\`"YYYY-MM-DDTHH:mm:ss"\`) |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`locale\` | \`string\` | \`''\` | Display locale, e.g. \`'en-US'\`, \`'pt-BR'\` |
| \`timezone\` | \`string\` | \`''\` | IANA timezone, e.g. \`'America/Sao_Paulo'\`. Empty = local |
| \`minDatetime\` | \`string\` | \`''\` | Minimum selectable datetime (ISO 8601) |
| \`maxDatetime\` | \`string\` | \`''\` | Maximum selectable datetime (ISO 8601) |
| \`minuteStep\` | \`number\` | \`1\` | Minutes increment in the time picker (e.g. 5, 15, 30) |
| \`placeholder\` | \`string\` | \`''\` | Placeholder text when no value is selected |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = input mode, \`false\` = read-only formatted text |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents editing but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks the field as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator inside the field |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: string \| null }\` | Fired when the user confirms a datetime selection |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Stored and emitted as **ISO 8601**: \`"YYYY-MM-DDTHH:mm:ss"\`
- \`null\` when no value is selected
- Time is always in **24-hour format** internally, regardless of display locale

---

## Examples

### Basic

\`\`\`html
<molecules--datetime-input-102020
  value="{{ui.form.scheduledAt}}"
  error="{{ui.form.scheduledAtError}}"
  locale="en-US"
  required>
  <Label>Scheduled At</Label>
</molecules--datetime-input-102020>
\`\`\`

### With helper and minute step

\`\`\`html
<molecules--datetime-input-102020
  value="{{ui.meeting.startsAt}}"
  error="{{ui.meeting.startsAtError}}"
  locale="pt-BR"
  minuteStep="15"
  minDatetime="2026-01-01T00:00:00"
  required>
  <Label>Meeting Start</Label>
  <Helper>Select a date and time at least 15 minutes from now</Helper>
</molecules--datetime-input-102020>
\`\`\`

### View mode (read-only display)

\`\`\`html
<molecules--datetime-input-102020
  value="{{ui.order.confirmedAt}}"
  isEditing="false"
  locale="en-US">
  <Label>Confirmed At</Label>
</molecules--datetime-input-102020>
\`\`\`

### Disabled

\`\`\`html
<molecules--datetime-input-102020
  value="{{ui.form.lockedAt}}"
  disabled="true"
  locale="en-US">
  <Label>Locked At</Label>
</molecules--datetime-input-102020>
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