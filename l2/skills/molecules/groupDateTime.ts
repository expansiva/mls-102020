/// <mls fileReference="_102020_/l2/skills/molecules/groupDateTime.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupDateTime

## Metadata

- **Name:** groupDateTime
- **Category:** Data Entry & Editing
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to select or enter **date and/or time** values.

### When to Use

- User needs to input dates, times, or both
- Scheduling, deadlines, timestamps
- Date ranges and periods

### When NOT to Use

- Duration or elapsed time → use **InputNumber** with formatting
- Age or years only → use **InputNumber**
- Recurring patterns → consider specialized scheduler

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'string \| Date \| null' | 'null' | | '@propertyDataSource' | Selected date/time (ISO 8601) |
| 'valueEnd' | 'string \| Date \| null' | 'null' | | '@propertyDataSource' | End date for range selection |
| 'placeholder' | 'string' | '''' | | '@propertyCompositeDataSource' | Hint text when empty |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Field label |
| 'min' | 'string \| Date' | 'undefined' | | '@property' | Minimum selectable date/time |
| 'max' | 'string \| Date' | 'undefined' | | '@property' | Maximum selectable date/time |
| 'format' | 'string' | ''YYYY-MM-DD'' | | '@property' | Display format |
| 'locale' | 'string' | ''en-US'' | | '@property' | Locale for formatting |
| 'timezone' | 'string' | ''local'' | | '@property' | Timezone for display |
| 'firstDayOfWeek' | 'number' | '0' | | '@property' | Week start (0=Sunday) |
| 'disabledDates' | 'Array<string \| Date>' | '[]' | | '@propertyDataSource' | Dates that cannot be selected |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates mandatory field |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.dueDate}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Select {{page1.dateType}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: string, valueEnd?: string }' | Fired when selection changes |
| 'monthChange' | '{ month: number, year: number }' | Fired when visible month changes |
| 'clear' | '{ }' | Fired when value is cleared |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Interactive, awaiting input |
| **hover** | Cursor over the component | Visual feedback |
| **focus** | Component has focus | Calendar/picker visible |
| **disabled** | Component is disabled | Non-interactive, visually dimmed |
| **readonly** | Read-only mode | Displays formatted value |
| **loading** | Loading state | Displays loading indicator |
| **error** | Error state | Visual error feedback |
| **open** | Picker is open | Calendar/time picker visible |

### Date/Time Cell States

| State | Description |
|-------|-------------|
| **default** | Available for selection |
| **selected** | Currently selected |
| **today** | Current date indicator |
| **disabled** | Cannot be selected |
| **hover** | Cursor over the cell |
| **in-range** | Part of selected range |
| **range-start** | Start of range |
| **range-end** | End of range |
| **other-month** | Date from adjacent month |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| 'Enter' / 'Space' | Open picker / Select date |
| 'Arrow Keys' | Navigate days/months/years |
| 'Page Up/Down' | Previous/next month |
| 'Home' | First day of month |
| 'End' | Last day of month |
| 'Escape' | Close picker |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="dialog"' | Calendar popup |
| 'role="grid"' | Calendar grid |
| 'aria-label' | Accessible date description |
| 'aria-selected' | Indicates selected date |
| 'aria-disabled' | Indicates disabled date |
| 'aria-current="date"' | Indicates today |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Date Picker** | Calendar date selection | Single date selection |
| **DateTime** | Date and time combined | Appointments, scheduling |
| **Time Picker** | Time-only selection | Times without dates |
| **Date Range** | Start and end date | Periods, date spans |
| **Inline Calendar** | Always-visible calendar | Dashboard widgets, scheduling views |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`