/// <mls fileReference="_102020_/l2/skills/molecules/groupInputText.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupInputText

## Metadata

- **Name:** groupInputText
- **Category:** Data Entry & Editing
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to enter and edit **free-form text** content.

### When to Use

- User needs to input arbitrary text
- Names, descriptions, comments, notes
- Any textual data entry

### When NOT to Use

- Selecting from predefined options → use **SelectOne** or **SelectMany**
- Numeric input only → use **InputNumber**
- Date/time input → use **DateTime**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'string' | '''' | | '@propertyDataSource' | Current text value |
| 'placeholder' | 'string' | '''' | | '@propertyCompositeDataSource' | Hint text when empty |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Field label |
| 'maxlength' | 'number' | 'undefined' | | '@property' | Maximum character count |
| 'minlength' | 'number' | 'undefined' | | '@property' | Minimum character count |
| 'pattern' | 'string' | 'undefined' | | '@property' | Regex validation pattern |
| 'mask' | 'string' | 'undefined' | | '@property' | Input mask format |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates mandatory field |
| 'autocomplete' | 'string' | ''off'' | | '@property' | Browser autocomplete hint |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.userName}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Enter {{page1.fieldName}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: string }' | Fired when value changes (on blur) |
| 'input' | '{ value: string }' | Fired on each keystroke |
| 'focus' | '{ }' | Fired when component receives focus |
| 'blur' | '{ }' | Fired when component loses focus |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Interactive, awaiting input |
| **hover** | Cursor over the component | Visual feedback |
| **focus** | Component has focus | Visual focus indicator, cursor active |
| **disabled** | Component is disabled | Non-interactive, visually dimmed |
| **readonly** | Read-only mode | Displays value, no cursor |
| **loading** | Loading state | Displays loading indicator |
| **error** | Error state | Visual error feedback (color, icon) |
| **filled** | Has content | May show clear button |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| Standard text editing | All standard keyboard shortcuts |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'aria-label' | Accessible name if no visible label |
| 'aria-describedby' | Links to helper/error text |
| 'aria-disabled' | Indicates disabled state |
| 'aria-required' | Indicates required field |
| 'aria-invalid' | Indicates error state |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Text** | Single-line text input | Short text, names, titles |
| **Textarea** | Multi-line text input | Long text, descriptions, comments |
| **Rich Text** | Formatted text editor | Content with styling, HTML |
| **Masked** | Input with format mask | Phone, SSN, formatted codes |
| **Password** | Hidden text input | Passwords, secrets |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |
`