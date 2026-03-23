/// <mls fileReference="_102020_/l2/skills/molecules/groupLookup.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupLookup

## Metadata

- **Name:** groupLookup
- **Category:** Search, Lookup & Filters
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to **search and select** a record or value from a large or remote dataset.

### When to Use

- Selection from large datasets (100+ items)
- Data comes from API/database
- User needs to search before selecting
- Referencing related records (foreign keys)

### When NOT to Use

- Small static list → use **SelectOne**
- Free text input → use **InputText**
- Multiple unrelated searches → use **Search**

---

## Contract

### Result Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'value' | 'string \| number' | ✓ | Unique identifier |
| 'label' | 'string' | ✓ | Display text |
| 'data' | 'object' | | Full record data |
| 'disabled' | 'boolean' | | If 'true', cannot be selected |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'string \| number \| null' | 'null' | | '@propertyDataSource' | Selected record identifier |
| 'displayValue' | 'string' | '''' | | '@propertyDataSource' | Display text for selected record |
| 'placeholder' | 'string' | '''' | | '@propertyCompositeDataSource' | Hint text when empty |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Field label |
| 'searchEndpoint' | 'string' | '''' | | '@propertyDataSource' | API endpoint for search |
| 'minSearchLength' | 'number' | '1' | | '@property' | Minimum chars to trigger search |
| 'debounceMs' | 'number' | '300' | | '@property' | Debounce delay for search |
| 'allowCreate' | 'boolean' | 'false' | | '@property' | Allow creating new records |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates mandatory field |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.customerId}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Search {{page1.entityType}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value, label, data }' | Fired when selection changes |
| 'search' | '{ query: string }' | Fired when search is triggered |
| 'create' | '{ value: string }' | Fired when new record requested |
| 'clear' | '{ }' | Fired when value is cleared |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Ready for search |
| **hover** | Cursor over the component | Visual feedback |
| **focus** | Component has focus | Input active |
| **searching** | Search in progress | Loading indicator |
| **results** | Results available | Dropdown with results |
| **no-results** | No matches found | Empty state message |
| **selected** | Value is selected | Display selected record |
| **disabled** | Component is disabled | Non-interactive |
| **readonly** | Read-only mode | Displays value only |
| **error** | Error state | Visual error feedback |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| 'Arrow Down' | Open results / Navigate down |
| 'Arrow Up' | Navigate up in results |
| 'Enter' | Select highlighted result |
| 'Escape' | Close results dropdown |
| 'Backspace' | Clear selection (when selected) |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="combobox"' | Main component |
| 'aria-expanded' | Results dropdown state |
| 'aria-autocomplete' | Autocomplete behavior |
| 'aria-controls' | Links to results list |
| 'role="listbox"' | Results container |
| 'role="option"' | Each result item |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Autocomplete** | Inline search with dropdown | Quick lookup, common use |
| **Combobox** | Search with full result list | Detailed results display |
| **Modal Lookup** | Full-screen/modal search | Complex searches, mobile |
| **Barcode Lookup** | Scan-to-search | Inventory, warehouse |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`