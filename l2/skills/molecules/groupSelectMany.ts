/// <mls fileReference="_102020_/l2/skills/molecules/groupSelectMany.ts" enhancement="_blank"/>

export const skill = `
# Skill: groupSelectMany

## Metadata

- **Name:** groupSelectMany
- **Category:** Data Entry & Editing
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to choose **one or more options** from several available.

### When to Use

- User can select multiple items simultaneously
- Multiple answers are valid
- Building a collection of selected items

### When NOT to Use

- User must select exactly one option → use **SelectOne**
- Simple on/off state → use **Toggle**
- Free text input → use **InputText**

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
| 'value' | 'Array<string \| number>' | '[]' | | '@propertyDataSource' | Array of selected option values |
| 'options' | 'Option[]' | '[]' | ✓ | '@propertyDataSource' | List of available options |
| 'placeholder' | 'string' | '''' | | '@propertyCompositeDataSource' | Text displayed when no option is selected |
| 'min' | 'number' | '0' | | '@property' | Minimum selections required |
| 'max' | 'number' | 'Infinity' | | '@property' | Maximum selections allowed |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the entire component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates asynchronous loading |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates at least one selection required |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.selectedIds}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Select {{page1.itemType}}s' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: Array, added?: Option, removed?: Option }' | Fired when selection changes |

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
| **selected** | Option is currently selected |
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
| 'Space' | Toggles selection of focused option |
| 'Ctrl/Cmd + A' | Select all (if allowed) |
| 'Escape' | Closes dropdown (if applicable) |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="listbox"' | Options container |
| 'aria-multiselectable="true"' | Indicates multiple selection |
| 'role="option"' | Each individual option |
| 'aria-selected' | Indicates selected option |
| 'aria-disabled' | Indicates disabled option/component |
| 'aria-required' | Indicates required field |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Checkbox Group** | Group of checkboxes | Few options, all visible |
| **Tags/Chips** | Selectable tag pills | Visual selection, removable items |
| **Dual List** | Two-panel transfer list | Large datasets, bulk selection |
| **Multi-select Dropdown** | Dropdown with checkboxes | Many options, limited space |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`