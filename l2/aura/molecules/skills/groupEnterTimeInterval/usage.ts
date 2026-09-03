/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterTimeInterval/usage.ts" enhancement="_blank"/>

export const skill = `

# enter + time-interval — Usage

> Quick reference for using molecules in the **enter + time-interval** group.
> Use this when you need the user to provide a **time range (start and end time, no date)**.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Overall label for the range field |
| \`LabelStart\` | Label shown above the start time input |
| \`LabelEnd\` | Label shown above the end time input |
| \`Helper\` | Descriptive text shown below the field when there is no error |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`startTime\` | \`string \| null\` | \`null\` | Start time in 24h format: \`"HH:mm"\` or \`"HH:mm:ss"\` |
| \`endTime\` | \`string \| null\` | \`null\` | End time in 24h format: \`"HH:mm"\` or \`"HH:mm:ss"\` |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`locale\` | \`string\` | \`''\` | Display locale, e.g. \`'en-US'\`, \`'pt-BR'\` |
| \`hour12\` | \`boolean\` | \`false\` | Display in 12-hour format with AM/PM |
| \`showSeconds\` | \`boolean\` | \`false\` | Include seconds in the input |
| \`minuteStep\` | \`number\` | \`1\` | Minutes increment in the picker (e.g. 5, 15, 30) |
| \`minTime\` | \`string\` | \`''\` | Earliest selectable time (\`"HH:mm"\`) |
| \`maxTime\` | \`string\` | \`''\` | Latest selectable time (\`"HH:mm"\`) |
| \`minDurationMinutes\` | \`number\` | \`0\` | Minimum interval duration in minutes (0 = no minimum) |
| \`maxDurationMinutes\` | \`number\` | \`0\` | Maximum interval duration in minutes (0 = no maximum) |
| \`allowOvernight\` | \`boolean\` | \`false\` | Allow end time before start time (crosses midnight) |
| \`allowSameTime\` | \`boolean\` | \`false\` | Allow start and end at the same time |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = input mode, \`false\` = read-only formatted text |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents editing but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks both times as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator inside the field |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ startTime: string \| null, endTime: string \| null }\` | Fired when both times are confirmed |
| \`startChange\` | \`{ value: string \| null }\` | Fired when start time changes |
| \`endChange\` | \`{ value: string \| null }\` | Fired when end time changes |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Both values stored and emitted in **24-hour format**: \`"HH:mm"\` or \`"HH:mm:ss"\` when \`showSeconds=true\`
- \`null\` when not yet selected
- Display format respects \`hour12\` and \`locale\`, stored value is always 24h
- When \`allowOvernight=true\` and \`endTime < startTime\`, the interval crosses midnight

---

## Examples

### Basic

\`\`\`html
<molecules--time-interval-102020
  startTime="{{ui.form.shiftStart}}"
  endTime="{{ui.form.shiftEnd}}"
  error="{{ui.form.shiftError}}"
  minuteStep="30"
  required>
  <Label>Work Shift</Label>
  <LabelStart>From</LabelStart>
  <LabelEnd>To</LabelEnd>
</molecules--time-interval-102020>
\`\`\`

### With overnight support and AM/PM display

\`\`\`html
<molecules--time-interval-102020
  startTime="{{ui.config.openTime}}"
  endTime="{{ui.config.closeTime}}"
  error="{{ui.config.hoursError}}"
  locale="en-US"
  hour12="true"
  minuteStep="15"
  allowOvernight="true"
  minDurationMinutes="60">
  <Label>Business Hours</Label>
  <LabelStart>Opens</LabelStart>
  <LabelEnd>Closes</LabelEnd>
  <Helper>Minimum 1 hour. Overnight hours allowed</Helper>
</molecules--time-interval-102020>
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