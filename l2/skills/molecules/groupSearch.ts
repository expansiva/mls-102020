/// <mls fileReference="_102020_/l2/skills/molecules/groupSearch.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupSearch

## Metadata

- **Name:** groupSearch
- **Category:** Search, Lookup & Filters
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to **find content** across the application or dataset using text queries.

### When to Use

- Global or section-wide content search
- Finding records, pages, or actions
- Navigation through search
- Command palette functionality

### When NOT to Use

- Selecting a specific field value → use **Lookup**
- Filtering visible data → use **Filter**
- Text input for forms → use **InputText**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'string' | '''' | | '@propertyDataSource' | Current search query |
| 'placeholder' | 'string' | ''Search...'' | | '@propertyCompositeDataSource' | Hint text |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Field label |
| 'searchEndpoint' | 'string' | '''' | | '@propertyDataSource' | API endpoint for search |
| 'minSearchLength' | 'number' | '1' | | '@property' | Minimum chars to trigger search |
| 'debounceMs' | 'number' | '300' | | '@property' | Debounce delay for search |
| 'showHistory' | 'boolean' | 'false' | | '@property' | Show recent searches |
| 'showSuggestions' | 'boolean' | 'false' | | '@property' | Show search suggestions |
| 'hotkey' | 'string' | '''' | | '@property' | Keyboard shortcut (e.g., 'cmd+k') |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.searchQuery}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Search in {{page1.section}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'search' | '{ query: string }' | Fired when search is submitted |
| 'input' | '{ query: string }' | Fired on each keystroke |
| 'clear' | '{ }' | Fired when search is cleared |
| 'resultSelect' | '{ result: object }' | Fired when a result is selected |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Ready for input |
| **hover** | Cursor over the component | Visual feedback |
| **focus** | Component has focus | Input active, may show suggestions |
| **searching** | Search in progress | Loading indicator |
| **results** | Results available | Results displayed |
| **no-results** | No matches found | Empty state message |
| **disabled** | Component is disabled | Non-interactive |
| **error** | Error state | Visual error feedback |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| 'Enter' | Submit search / Select result |
| 'Arrow Down/Up' | Navigate results |
| 'Escape' | Clear / Close results |
| Hotkey (e.g., 'Cmd+K') | Focus search |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="search"' | Search container |
| 'role="searchbox"' | Search input |
| 'aria-label' | Accessible description |
| 'aria-expanded' | Results visibility |
| 'aria-controls' | Links to results |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Simple Search** | Basic search input | Section search, tables |
| **Expanded Search** | Search with filters | Advanced search pages |
| **Command Search** | Cmd+K style palette | Power users, navigation |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`