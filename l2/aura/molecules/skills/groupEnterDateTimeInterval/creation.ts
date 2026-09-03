/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterDateTimeInterval/creation.ts" enhancement="_blank"/>

export const skill = `
# groupEnterDateTimeInterval — Creation

> Implementation reference for creating molecules in the **groupEnterDateTimeInterval** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupEnterDateTimeInterval\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Overall label for the range field |
| \`LabelStart\` | No | Label for the start datetime input |
| \`LabelEnd\` | No | Label for the end datetime input |
| \`Helper\` | No | Help text displayed below the field |

\`\`\`typescript
slotTags = ['Label', 'LabelStart', 'LabelEnd', 'Helper'];
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`startDatetime\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | Start datetime (\`"YYYY-MM-DDTHH:mm:ss"\`) |
| \`endDatetime\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | End datetime (\`"YYYY-MM-DDTHH:mm:ss"\`) |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`locale\` | \`string\` | \`''\` | \`@propertyDataSource\` | Locale for display formatting |
| \`timezone\` | \`string\` | \`''\` | \`@propertyDataSource\` | IANA timezone. Empty = local |
| \`minDatetime\` | \`string\` | \`''\` | \`@propertyDataSource\` | Minimum allowed datetime (ISO 8601) |
| \`maxDatetime\` | \`string\` | \`''\` | \`@propertyDataSource\` | Maximum allowed datetime (ISO 8601) |
| \`minDurationMinutes\` | \`number\` | \`0\` | \`@propertyDataSource\` | Minimum duration in minutes (0 = no minimum) |
| \`maxDurationMinutes\` | \`number\` | \`0\` | \`@propertyDataSource\` | Maximum duration in minutes (0 = no maximum) |
| \`minuteStep\` | \`number\` | \`1\` | \`@propertyDataSource\` | Minutes increment in time picker |
| \`allowSameInstant\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Allow start and end at the same datetime |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isEditing\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Edit mode (true) or view mode (false) |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Both datetimes are required |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`activeField\` | \`string \| null\` | \`null\` | \`@state\` | Which picker is open: \`'start'\`, \`'end'\`, or \`null\` |

---

## 4. Value Contract

### Storage Format

- Both values stored as **ISO 8601**: \`"YYYY-MM-DDTHH:mm:ss"\`
- Time always stored in **24-hour format**
- \`null\` means not yet selected
- \`endDatetime\` must be > \`startDatetime\` (unless \`allowSameInstant=true\`)

### Display Format

| Locale | Same day range | Displayed |
|--------|---------------|-----------|
| \`en-US\` | same day | \`04/17/2026 09:00 AM – 10:30 AM\` |
| \`en-US\` | different days | \`04/17/2026 09:00 AM – 04/18/2026 08:00 AM\` |
| \`pt-BR\` | same day | \`17/04/2026 09:00 – 10:30\` |

When start and end are on the same day, the date can be shown once with only the times for brevity.

### View Mode

- If both are \`null\`: display \`"—"\`
- If only \`startDatetime\` is set: display \`"startDatetime – —"\`
- If both set: display full formatted range

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ startDatetime: string \| null, endDatetime: string \| null }\` | ✓ | Both datetimes confirmed |
| \`startChange\` | \`{ value: string \| null }\` | ✓ | Start datetime changed |
| \`endChange\` | \`{ value: string \| null }\` | ✓ | End datetime changed |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: {
    startDatetime: this.startDatetime, // "2026-04-17T09:00:00"
    endDatetime: this.endDatetime      // "2026-04-17T10:30:00"
  }
}));
\`\`\`

---

## 6. isEditing Mode

| Mode | \`isEditing\` | Behavior |
|------|-------------|----------|
| **Edit** | \`true\` | Renders two datetime inputs + pickers |
| **View** | \`false\` | Renders formatted datetime range as static text |

- In view mode: no inputs, no pickers, no events, no error, no helper

---

## 7. Selection Flow

\`\`\`
1. User clicks start input → activeField = 'start'
2. Start picker opens (calendar + time)
3. User confirms start:
   - startDatetime is set
   - emit startChange
   - IF endDatetime is null: activeField = 'end' (auto-advance)
   - ELSE: activeField = null, close
4. User clicks end input → activeField = 'end'
5. End picker opens:
   - Calendar: disable dates before startDatetime date
   - Time: if same day, disable times ≤ startDatetime time
6. User confirms end:
   - endDatetime is set
   - emit endChange + change
   - activeField = null, close picker
\`\`\`

---

## 8. Duration Validation

| Rule | Behavior |
|------|----------|
| \`endDatetime ≤ startDatetime\` | Prevent selection (unless \`allowSameInstant=true\`) |
| Duration < \`minDurationMinutes\` | Grey out end times/dates that would be too short |
| Duration > \`maxDurationMinutes\` | Grey out end times/dates that would be too long |

The molecule enforces these rules visually during selection. The Page/Organism sets the \`error\` message after the fact if needed.

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
| **Active (start)** | Start picker open |
| **Active (end)** | End picker open |
| **Complete** | Both datetimes selected |
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
| Day cells | \`role="gridcell"\`, \`aria-selected\`, \`aria-disabled\` |

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
| **DateTime Range Picker** | Two inputs + separate calendar+time panels |
| **Event Scheduler** | Side-by-side pickers optimized for meeting booking |
| **Booking Widget** | Compact check-in/check-out with duration display |

---

## 14. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-17 | Initial creation reference |

`