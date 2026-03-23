/// <mls fileReference="_102020_/l2/skills/molecules/groupInputCurrency.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupInputCurrency

## Metadata

- **Name:** groupInputCurrency
- **Category:** Data Entry & Editing
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to enter and edit **monetary values** with currency context.

### When to Use

- User needs to input money amounts
- Prices, payments, financial transactions
- Any value that represents currency

### When NOT to Use

- Generic numbers without currency → use **InputNumber**
- Percentage values → use **InputNumber** with formatting
- Non-monetary quantities → use **InputNumber**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'number \| null' | 'null' | | '@propertyDataSource' | Numeric amount (unformatted) |
| 'currency' | 'string' | ''USD'' | | '@propertyDataSource' | ISO 4217 currency code |
| 'placeholder' | 'string' | '''' | | '@propertyCompositeDataSource' | Hint text when empty |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Field label |
| 'min' | 'number' | 'undefined' | | '@property' | Minimum allowed value |
| 'max' | 'number' | 'undefined' | | '@property' | Maximum allowed value |
| 'allowNegative' | 'boolean' | 'false' | | '@property' | Allow negative amounts |
| 'showSymbol' | 'boolean' | 'true' | | '@property' | Display currency symbol |
| 'symbolPosition' | ''prefix' \| 'suffix'' | ''prefix'' | | '@property' | Currency symbol position |
| 'locale' | 'string' | ''en-US'' | | '@property' | Locale for formatting |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates mandatory field |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.price}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Enter {{page1.paymentType}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: number \| null, currency: string, formatted: string }' | Fired when value changes |
| 'currencyChange' | '{ currency: string }' | Fired when currency changes (multi-currency) |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Interactive, awaiting input |
| **hover** | Cursor over the component | Visual feedback |
| **focus** | Component has focus | Visual focus indicator |
| **disabled** | Component is disabled | Non-interactive, visually dimmed |
| **readonly** | Read-only mode | Displays formatted value |
| **loading** | Loading state | Displays loading indicator |
| **error** | Error state | Visual error feedback |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| Numeric keys | Enter digits |
| '.' or ',' | Decimal separator (locale-aware) |
| '-' | Negative sign (if allowed) |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'aria-label' | Accessible name with currency |
| 'aria-describedby' | Links to currency indicator |
| 'aria-disabled' | Indicates disabled state |
| 'aria-required' | Indicates required field |
| 'aria-invalid' | Indicates error state |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Currency Field** | Standard currency input | Single currency amounts |
| **Multi-Currency** | Input with currency selector | International transactions |
| **Amount Input** | Simplified amount entry | Quick price entry |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |
`