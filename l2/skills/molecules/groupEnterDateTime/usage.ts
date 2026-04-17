/// <mls fileReference="_102020_/l2/skills/molecules/groupEnterDateTime/usage.ts" enhancement="_blank"/>

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
`