/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterDateTimeInterval/usage.ts" enhancement="_blank"/>

export const skill = `

# enter + datetime-interval — Usage

> Quick reference for using molecules in the **enter + datetime-interval** group.
> Use this when you need the user to provide a **date+time range (start and end datetime)**.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Overall label for the range field |
| \`LabelStart\` | Label shown above the start datetime input |
| \`LabelEnd\` | Label shown above the end datetime input |
| \`Helper\` | Descriptive text shown below the field when there is no error |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`startDatetime\` | \`string \| null\` | \`null\` | Start datetime in ISO 8601 format (\`"YYYY-MM-DDTHH:mm:ss"\`) |
| \`endDatetime\` | \`string \| null\` | \`null\` | End datetime in ISO 8601 format (\`"YYYY-MM-DDTHH:mm:ss"\`) |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`locale\` | \`string\` | \`''\` | Display locale, e.g. \`'en-US'\`, \`'pt-BR'\` |
| \`timezone\` | \`string\` | \`''\` | IANA timezone, e.g. \`'America/Sao_Paulo'\`. Empty = local |
| \`minDatetime\` | \`string\` | \`''\` | Minimum selectable datetime (ISO 8601) |
| \`maxDatetime\` | \`string\` | \`''\` | Maximum selectable datetime (ISO 8601) |
| \`minDurationMinutes\` | \`number\` | \`0\` | Minimum duration in minutes (0 = no minimum) |
| \`maxDurationMinutes\` | \`number\` | \`0\` | Maximum duration in minutes (0 = no maximum) |
| \`minuteStep\` | \`number\` | \`1\` | Minutes increment in the time picker (e.g. 15, 30) |
| \`allowSameInstant\` | \`boolean\` | \`false\` | Allow start and end at the exact same datetime |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = input mode, \`false\` = read-only formatted text |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents editing but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks both datetimes as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator inside the field |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ startDatetime: string \| null, endDatetime: string \| null }\` | Fired when both datetimes are confirmed |
| \`startChange\` | \`{ value: string \| null }\` | Fired when start datetime changes |
| \`endChange\` | \`{ value: string \| null }\` | Fired when end datetime changes |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Both values are ISO 8601 datetime strings: \`"YYYY-MM-DDTHH:mm:ss"\`
- \`null\` when not yet selected
- Time is always stored in **24-hour format** internally
- \`endDatetime\` is always > \`startDatetime\` (unless \`allowSameInstant=true\`)

---

## Examples

### Basic

\`\`\`html
<molecules--datetime-interval-102020
  startDatetime="{{ui.form.meetingStart}}"
  endDatetime="{{ui.form.meetingEnd}}"
  error="{{ui.form.meetingError}}"
  locale="en-US"
  minuteStep="15"
  required>
  <Label>Meeting Period</Label>
  <LabelStart>Start</LabelStart>
  <LabelEnd>End</LabelEnd>
</molecules--datetime-interval-102020>
\`\`\`

### With duration constraints

\`\`\`html
<molecules--datetime-interval-102020
  startDatetime="{{ui.booking.checkIn}}"
  endDatetime="{{ui.booking.checkOut}}"
  error="{{ui.booking.periodError}}"
  locale="pt-BR"
  minDurationMinutes="60"
  maxDurationMinutes="480">
  <Label>Reservation</Label>
  <LabelStart>Check-in</LabelStart>
  <LabelEnd>Check-out</LabelEnd>
  <Helper>Reservations between 1 and 8 hours</Helper>
</molecules--datetime-interval-102020>
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
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |

`