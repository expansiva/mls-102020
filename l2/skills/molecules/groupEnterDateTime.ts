/// <mls fileReference="_102020_/l2/skills/molecules/groupEnterDateTime.ts" enhancement="_blank"/>

export const skill = `
# Skill Group Contract: \`enter + datetime\`

> Official contract for molecules in the **enter + datetime** group in the Collab Aura system.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`enter + datetime\` |
| **Category** | Data Entry |
| **Intent** | User wants to provide a **date and/or time** |
| **Version** | \`1.0.0\` |

---

## 2. When to Use

- Date selection
- Time scheduling
- Deadline definition
- Date ranges and periods
- Appointments and bookings
- Birth dates, expiration dates

---

## 3. When NOT to Use

| Scenario | Use instead |
|----------|-------------|
| Generic number | \`enter + number\` |
| Duration or elapsed time | \`enter + number\` with formatting |
| Free-form text | \`enter + text\` |

---

## 4. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Field label |
| \`Prefix\` | No | Content before input (calendar icon) |
| \`Suffix\` | No | Content after input (clear button, actions) |
| \`Helper\` | No | Help text displayed below the field |
| \`Error\` | No | Error message (displayed when \`error=true\`) |

### HTML Structure

\`\`\`html
<molecules--date-picker-102020 value="2026-04-14" min="2026-01-01" required>
  <Label>Event Date</Label>
  <Prefix><Icon name="calendar" /></Prefix>
  <Helper>Select a date in 2026</Helper>
  <e>Invalid date</e>
</molecules--date-picker-102020>
\`\`\`

---

## 5. Properties

### 5.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | Current value (ISO format) |
| \`name\` | \`string\` | \`''\` | \`@property\` | Field name (for forms) |

#### Value Formats (ISO 8601)

| Mode | Format | Example |
|------|--------|---------|
| Date | \`YYYY-MM-DD\` | \`2026-04-14\` |
| Time | \`HH:mm\` or \`HH:mm:ss\` | \`14:30\` or \`14:30:00\` |
| DateTime | \`YYYY-MM-DDTHH:mm\` | \`2026-04-14T14:30\` |
| Date Range | \`YYYY-MM-DD/YYYY-MM-DD\` | \`2026-04-14/2026-04-20\` |
| Month | \`YYYY-MM\` | \`2026-04\` |
| Year | \`YYYY\` | \`2026\` |

### 5.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`mode\` | \`string\` | \`'date'\` | \`@property\` | Selection mode |
| \`min\` | \`string\` | \`undefined\` | \`@property\` | Minimum allowed value (ISO) |
| \`max\` | \`string\` | \`undefined\` | \`@property\` | Maximum allowed value (ISO) |
| \`placeholder\` | \`string\` | \`''\` | \`@property\` | Placeholder text |
| \`format\` | \`string\` | \`undefined\` | \`@property\` | Display format (locale-aware) |
| \`locale\` | \`string\` | \`undefined\` | \`@property\` | Locale for formatting |
| \`firstDayOfWeek\` | \`number\` | \`0\` | \`@property\` | First day of week (0=Sunday, 1=Monday) |

#### Valid values for \`mode\`

| Value | Description |
|-------|-------------|
| \`date\` | Single date selection |
| \`time\` | Time only selection |
| \`datetime\` | Date and time selection |
| \`daterange\` | Date range (start and end) |
| \`month\` | Month and year selection |
| \`year\` | Year only selection |

### 5.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@property\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@property\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@property\` | Field is required |
| \`loading\` | \`boolean\` | \`false\` | \`@property\` | Loading state |
| \`error\` | \`boolean\` | \`false\` | \`@property\` | Error state  |
| \`open\` | \`boolean\` | \`false\` | \`@property\` | Picker is open |

---

## 6. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: string \| null }\` | ✓ | Value changed (after selection or blur) |
| \`input\` | \`{ value: string \| null }\` | ✓ | Value changed (on each interaction) |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |
| \`open\` | \`{}\` | ✓ | Picker opened |
| \`close\` | \`{}\` | ✓ | Picker closed |

### Event Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value }
}));
\`\`\`

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance, calendar icon |
| **Focus** | Highlighted border or outline |
| **Hover** | Subtle visual feedback |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No editing allowed, value visible |
| **Error** | Error visual indicator |
| **Loading** | Loading indicator visible |
| **Open** | Picker dropdown visible |

---

## 8. Rendering Logic

\`\`\`
RENDER:

1. Main container
   - Apply state styles (disabled, error, etc.)

2. IF hasSlot('Label'):
   - Render label above input
   - IF required: add visual indicator (*)

3. Input wrapper (trigger):
   a. IF hasSlot('Prefix'):
      - Render Prefix content on the left
   ELSE:
      - Render default calendar icon
   
   b. Display element:
      - Show formatted value or placeholder
      - Click opens picker
   
   c. IF loading:
      - Render loading indicator
   ELSE IF hasSlot('Suffix'):
      - Render Suffix content on the right

4. Picker dropdown (when open):
   - Calendar grid for date modes
   - Time selectors for time modes
   - Navigation controls (prev/next month/year)

5. Below input:
   IF error AND hasSlot('Error'):
      - Render error message
   ELSE IF hasSlot('Helper'):
      - Render help text
\`\`\`

---

## 9. Picker Behavior

### Calendar Navigation

| Action | Behavior |
|--------|----------|
| Previous month | Navigate to previous month |
| Next month | Navigate to next month |
| Month click | Open month selector |
| Year click | Open year selector |
| Today | Jump to current date |

### Date Selection

| Mode | Selection Behavior |
|------|-------------------|
| \`date\` | Single click selects and closes |
| \`time\` | Hour/minute selection |
| \`datetime\` | Date first, then time |
| \`daterange\` | First click = start, second = end |
| \`month\` | Month grid selection |
| \`year\` | Year grid selection |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| \`ArrowLeft\` | Previous day |
| \`ArrowRight\` | Next day |
| \`ArrowUp\` | Previous week |
| \`ArrowDown\` | Next week |
| \`Enter\` | Select focused date |
| \`Escape\` | Close picker |
| \`Tab\` | Move focus within picker |

---

## 10. Validation

| Rule | Condition | Behavior |
|------|-----------|----------|
| Min | \`value < min\` | Date disabled in picker, show error |
| Max | \`value > max\` | Date disabled in picker, show error |
| Required | \`value === null && required\` | Show error |
| Invalid | Value doesn't match mode format | Show error |

---

## 11. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Associated label | \`aria-labelledby\` or \`<label for>\` |
| Error announced | \`aria-describedby\` pointing to error |
| Invalid state | \`aria-invalid="true"\` when error |
| Required field | \`aria-required="true"\` |
| Expanded state | \`aria-expanded\` on trigger |
| Popup role | \`role="dialog"\` on picker |
| Grid role | \`role="grid"\` on calendar |
| Cell role | \`role="gridcell"\` on dates |

### ID Structure

\`\`\`html
<label id="date-label-{uid}">...</label>
<button 
  aria-labelledby="date-label-{uid}"
  aria-describedby="date-helper-{uid} date-error-{uid}"
  aria-expanded="false"
  aria-haspopup="dialog"
/>
<div role="dialog" aria-label="Choose date">
  <div role="grid" aria-label="April 2026">...</div>
</div>
<div id="date-helper-{uid}">...</div>
<div id="date-error-{uid}">...</div>
\`\`\`

---

## 13. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-14 | Initial contract version |


`