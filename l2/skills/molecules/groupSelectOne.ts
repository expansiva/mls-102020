/// <mls fileReference="_102020_/l2/skills/molecules/groupSelectOne.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupSelectOne

## Metadata

- **Name:** groupSelectOne
- **Version:** 1.0.0
- **Last Updated:** 20/03/2026

---

## Definition

### Essence

Allow the user to choose **exactly one option** from several available.

### When to Use

- User must make an exclusive choice
- Only one answer is valid at a time
- Options are mutually exclusive

### When NOT to Use

- User can select multiple options → use **SelectMultiple**
- There is only one option (on/off) → use **Toggle/Switch**
- Input is free/textual → use **Input**

---

## Contract

### Option Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'value' | 'string \| number' | ✓ | Unique identifier for the option |
| 'label' | 'string' | ✓ | Text displayed to the user |
| 'disabled' | 'boolean' | | If 'true', option cannot be selected |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'string \| number \| null' | 'null' | | '@propertyDataSource' | Value of the selected option |
| 'options' | 'Option[]' | '[]' | ✓ | '@propertyDataSource' | List of available options |
| 'placeholder' | 'string' | '''' | | '@propertyCompositeDataSource' | Text displayed when no option is selected |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the entire component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates asynchronous loading |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates mandatory selection |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.selectedId}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Select a {{page1.itemType}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: string \| number, option: Option }' | Fired when selection changes |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Interactive, awaiting action |
| **hover** | Cursor over the component | Visual feedback of interactivity |
| **focus** | Component has focus | Visual focus indicator (outline) |
| **disabled** | Component is disabled | Non-interactive, visually dimmed |
| **readonly** | Read-only mode | Displays value, prevents changes |
| **loading** | Loading options | Displays loading indicator |
| **error** | Error state | Visual error feedback (color, icon) |

### Option States

| State | Description |
|-------|-------------|
| **default** | Option available for selection |
| **selected** | Currently selected option |
| **disabled** | Option cannot be selected |
| **hover** | Cursor over the option |
| **focus** | Option has focus (keyboard navigation) |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| 'Arrow Up/Down' | Navigates between options |
| 'Arrow Left/Right' | Navigates between options (horizontal variants) |
| 'Enter' / 'Space' | Selects focused option |
| 'Escape' | Closes dropdown (if applicable) |
| 'Home' | Moves to first option |
| 'End' | Moves to last option |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="listbox"' | Options container |
| 'role="option"' | Each individual option |
| 'aria-selected' | Indicates selected option |
| 'aria-disabled' | Indicates disabled option/component |
| 'aria-required' | Indicates required field |
| 'aria-invalid' | Indicates error state |
| 'aria-expanded' | Indicates if dropdown is open |

---

## Validation Rules

| Rule | Condition | Suggested Message |
|------|-----------|-------------------|
| required | 'required === true && value === null' | "Please select an option" |
| invalidOption | 'value' does not exist in 'options' | "Invalid option" |

---


## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 20/03/2026 | Initial contract definition |

`
