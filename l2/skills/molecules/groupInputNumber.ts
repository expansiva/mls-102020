/// <mls fileReference="_102020_/l2/skills/molecules/groupInputNumber.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupInputNumber

## Metadata

- **Name:** groupInputNumber
- **Category:** Data Entry & Editing
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to enter and edit **numeric values**.

### When to Use

- User needs to input numbers
- Quantities, counts, measurements
- Numeric calculations or settings

### When NOT to Use

- Currency values → use **InputCurrency**
- Date/time values → use **DateTime**
- Free text → use **InputText**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'number \| null' | 'null' | | '@propertyDataSource' | Current numeric value |
| 'placeholder' | 'string' | '''' | | '@propertyCompositeDataSource' | Hint text when empty |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Field label |
| 'min' | 'number' | 'undefined' | | '@property' | Minimum allowed value |
| 'max' | 'number' | 'undefined' | | '@property' | Maximum allowed value |
| 'step' | 'number' | '1' | | '@property' | Increment/decrement step |
| 'precision' | 'number' | 'undefined' | | '@property' | Decimal places |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates mandatory field |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.quantity}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Enter {{page1.unit}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: number \| null }' | Fired when value changes |
| 'input' | '{ value: number \| null }' | Fired on each input |
| 'increment' | '{ value: number }' | Fired when value incremented |
| 'decrement' | '{ value: number }' | Fired when value decremented |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Interactive, awaiting input |
| **hover** | Cursor over the component | Visual feedback |
| **focus** | Component has focus | Visual focus indicator |
| **disabled** | Component is disabled | Non-interactive, visually dimmed |
| **readonly** | Read-only mode | Displays value only |
| **loading** | Loading state | Displays loading indicator |
| **error** | Error state | Visual error feedback |
| **min-reached** | At minimum value | Decrement disabled |
| **max-reached** | At maximum value | Increment disabled |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| 'Arrow Up' | Increment value by step |
| 'Arrow Down' | Decrement value by step |
| 'Page Up' | Increment by larger step |
| 'Page Down' | Decrement by larger step |
| 'Home' | Set to minimum (if defined) |
| 'End' | Set to maximum (if defined) |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="spinbutton"' | For stepper variants |
| 'aria-valuenow' | Current value |
| 'aria-valuemin' | Minimum value |
| 'aria-valuemax' | Maximum value |
| 'aria-disabled' | Indicates disabled state |
| 'aria-required' | Indicates required field |
| 'aria-invalid' | Indicates error state |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Number Field** | Standard numeric input | General numeric entry |
| **Stepper** | Input with +/- buttons | Quantity selection |
| **Slider** | Draggable range slider | Ranges, settings |
| **Calculator** | Input with calculator pad | Complex calculations |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`