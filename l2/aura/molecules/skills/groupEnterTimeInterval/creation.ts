/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterTimeInterval/creation.ts" enhancement="_blank"/>

export const skill = `
# groupEnterTimeInterval — Creation

> Implementation reference for creating molecules in the **groupEnterTimeInterval** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupEnterTimeInterval\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Overall label for the range field |
| \`LabelStart\` | No | Label for the start time input |
| \`LabelEnd\` | No | Label for the end time input |
| \`Helper\` | No | Help text displayed below the field |

\`\`\`typescript
slotTags = ['Label', 'LabelStart', 'LabelEnd', 'Helper'];
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`startTime\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | Start time in 24h: \`"HH:mm"\` or \`"HH:mm:ss"\` |
| \`endTime\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | End time in 24h: \`"HH:mm"\` or \`"HH:mm:ss"\` |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`locale\` | \`string\` | \`''\` | \`@propertyDataSource\` | Locale for display formatting |
| \`hour12\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Display in 12-hour format (AM/PM) |
| \`showSeconds\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Include seconds in input and stored value |
| \`minuteStep\` | \`number\` | \`1\` | \`@propertyDataSource\` | Minutes increment in picker |
| \`minTime\` | \`string\` | \`''\` | \`@propertyDataSource\` | Earliest selectable time (\`"HH:mm"\`) |
| \`maxTime\` | \`string\` | \`''\` | \`@propertyDataSource\` | Latest selectable time (\`"HH:mm"\`) |
| \`minDurationMinutes\` | \`number\` | \`0\` | \`@propertyDataSource\` | Minimum interval duration in minutes (0 = no minimum) |
| \`maxDurationMinutes\` | \`number\` | \`0\` | \`@propertyDataSource\` | Maximum interval duration in minutes (0 = no maximum) |
| \`allowOvernight\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Allow end time before start time (crosses midnight) |
| \`allowSameTime\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Allow start and end at same time |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isEditing\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Edit mode (true) or view mode (false) |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Both times are required |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`activeField\` | \`string \| null\` | \`null\` | \`@state\` | Which picker is open: \`'start'\`, \`'end'\`, or \`null\` |

---

## 4. Value Contract

### Storage Format

- Both values stored in **24-hour format**: \`"HH:mm"\`
- When \`showSeconds=true\`: \`"HH:mm:ss"\`
- **No date component** — never store or emit date information
- \`null\` means not yet selected

### Overnight Interval

- When \`allowOvernight=true\` and \`endTime < startTime\`, the interval is valid and crosses midnight
- Duration calculation: \`(24 * 60) - toMinutes(startTime) + toMinutes(endTime)\`
- Display: append \`(+1)\` or \`(next day)\` indicator to end time

### Display Format

| \`hour12\` | Range | Displayed |
|----------|-------|-----------|
| \`false\` | \`"08:00"\` → \`"17:30"\` | \`08:00 – 17:30\` |
| \`true\` | \`"08:00"\` → \`"17:30"\` | \`08:00 AM – 05:30 PM\` |
| \`false\` (overnight) | \`"22:00"\` → \`"06:00"\` | \`22:00 – 06:00 (+1)\` |

### View Mode

- If both are \`null\`: display \`"—"\`
- If only \`startTime\` is set: display \`"startTime – —"\`
- If both set: display full formatted range with overnight indicator if applicable

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ startTime: string \| null, endTime: string \| null }\` | ✓ | Both times confirmed |
| \`startChange\` | \`{ value: string \| null }\` | ✓ | Start time changed |
| \`endChange\` | \`{ value: string \| null }\` | ✓ | End time changed |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: {
    startTime: this.startTime, // "08:00"
    endTime: this.endTime      // "17:30"
  }
}));
\`\`\`

---

## 6. isEditing Mode

| Mode | \`isEditing\` | Behavior |
|------|-------------|----------|
| **Edit** | \`true\` | Renders two time inputs + pickers |
| **View** | \`false\` | Renders formatted time range as static text |

- In view mode: no inputs, no pickers, no events, no error, no helper

---

## 7. Duration Calculation

\`\`\`typescript
// Standard (no overnight)
function calcDurationMinutes(startTime: string, endTime: string): number {
  return toMinutes(endTime) - toMinutes(startTime);
}

// Overnight
function calcDurationMinutesOvernight(startTime: string, endTime: string): number {
  return (24 * 60) - toMinutes(startTime) + toMinutes(endTime);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
\`\`\`

---

## 8. Validation Rules

| Rule | Behavior |
|------|----------|
| \`endTime ≤ startTime\` (no overnight) | Prevent selection or show error |
| \`allowOvernight=true\` and \`endTime < startTime\` | Valid — treat as overnight interval |
| Duration < \`minDurationMinutes\` | Grey out invalid end times |
| Duration > \`maxDurationMinutes\` | Grey out end times beyond maximum |
| Outside \`minTime\` / \`maxTime\` | Disable times in picker |

---

## 9. Error Handling

| \`error\` value | Behavior |
|---------------|----------|
| \`''\` | No error — show Helper if slot exists |
| \`'any message'\` | Show error message, apply error visual state |

- Error never shown in view mode
- Page/Organism is responsible for setting the error message

---

## 10. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Active (start)** | Start time picker open |
| **Active (end)** | End time picker open |
| **Complete** | Both times selected |
| **Overnight** | End time indicator shows \`(+1)\` |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No editing, text selectable |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator visible |
| **View Mode** | Formatted text only |

---

## 11. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Labels | \`aria-labelledby\` for each input |
| Error | \`aria-describedby\` pointing to error element |
| Invalid | \`aria-invalid="true"\` when error exists |
| Required | \`aria-required="true"\` |
| Picker dialogs | \`role="dialog"\`, \`aria-modal="true"\` |
| Overnight indicator | \`aria-label\` describing the next-day context |

---

## 12. Design Tokens

### Tokens

This group uses CSS custom properties (tokens) for all visual styling.
All tokens are consumed in the .less file via var(--ml-token, fallback).
The fallback ensures the component renders without external configuration.

#### Surface and text
- --ml-surface (#ffffff) — background
- --ml-surface-dim (#f5f5f5) — hover background
- --ml-on-surface (#1c1b1f) — primary text
- --ml-on-surface-muted (#49454f) — secondary text
- --ml-on-surface-faint (#79747e) — placeholder

#### Action and feedback
- --ml-primary (#3b82f6) — primary action color
- --ml-on-primary (#ffffff) — text on primary
- --ml-error (#ef4444) — error color
- --ml-on-error (#ffffff) — text on error

#### Border and shape
- --ml-outline-variant (#e2e8f0) — default border
- --ml-outline-focus (#3b82f6) — focus border
- --ml-outline-error (#ef4444) — error border
- --ml-radius-sm (6px) — default radius
- --ml-radius-full (9999px) — circular radius
- --ml-border-width (1px) — border thickness
- --ml-border-style (solid) — border style

#### Elevation, typography, motion, focus, state
- --ml-shadow-0 (none) — no shadow
- --ml-shadow-1 (0 1px 3px rgba(0,0,0,0.1)) — subtle shadow
- --ml-shadow-2 (0 4px 6px rgba(0,0,0,0.1)) — medium shadow
- --ml-font-family (system-ui, -apple-system, sans-serif) — font
- --ml-font-weight-medium (500) — medium weight
- --ml-transition (200ms ease) — default transition
- --ml-focus-ring-color (rgba(59,130,246,0.4)) — focus ring color
- --ml-focus-ring-width (2px) — focus ring width
- --ml-disabled-opacity (0.5) — disabled opacity

### data-class

The component accepts \`data-class\` for consumer-provided CSS classes:
- On host: \`<component data-class="w-full mt-4">\`
- On slots: \`<Label data-class="uppercase tracking-wide">\`

### Shared semantic classes

| Class | Purpose |
|-------|---------|
| ml-label | Field label |
| ml-helper | Helper text |
| ml-error-text | Error message |
| ml-text | Default text |
| ml-text-muted | Secondary text |
| ml-text-faint | Placeholder text |
| ml-disabled | Disabled state |
| ml-skeleton | Loading placeholder |
| ml-spinner | Loading spinner |

Group-specific semantic classes will be defined during component migration.

---

## 13. Possible Implementations

| Component | Description |
|-----------|-------------|
| **Time Range Picker** | Two inputs + scrollable column panels |
| **Time Range Slider** | Dual-handle slider on a 24h timeline |
| **Business Hours** | Compact start+end per weekday row |

---

## 14. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-17 | Initial creation reference |

`