/// <mls fileReference="_102020_/l2/skills/molecules/groupFilter.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupFilter

## Metadata

- **Name:** groupFilter
- **Category:** Search, Lookup & Filters
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to **narrow down visible data** by applying criteria and conditions.

### When to Use

- Reducing large datasets to relevant items
- Multi-criteria data filtering
- Saved filter configurations
- Table/list column filtering

### When NOT to Use

- Finding a specific record → use **Search** or **Lookup**
- Single selection → use **SelectOne**
- Data entry → use form components

---

## Contract

### Filter Condition Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'field' | 'string' | ✓ | Field to filter on |
| 'operator' | 'string' | ✓ | Comparison operator |
| 'value' | 'any' | ✓ | Filter value(s) |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'FilterCondition[]' | '[]' | | '@propertyDataSource' | Active filter conditions |
| 'fields' | 'FieldDefinition[]' | '[]' | ✓ | '@propertyDataSource' | Available filterable fields |
| 'presets' | 'FilterPreset[]' | '[]' | | '@propertyDataSource' | Saved filter presets |
| 'maxConditions' | 'number' | '10' | | '@property' | Maximum filter conditions |
| 'showPresets' | 'boolean' | 'true' | | '@property' | Show saved presets |
| 'allowSave' | 'boolean' | 'false' | | '@property' | Allow saving filter presets |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.activeFilters}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: FilterCondition[] }' | Fired when filters change |
| 'apply' | '{ value: FilterCondition[] }' | Fired when filters are applied |
| 'clear' | '{ }' | Fired when filters are cleared |
| 'save' | '{ name: string, conditions: FilterCondition[] }' | Fired when preset is saved |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | No filters active | Shows add filter option |
| **active** | Filters are applied | Shows active filter count/chips |
| **expanded** | Filter panel open | Full filter builder visible |
| **disabled** | Component is disabled | Non-interactive |
| **loading** | Loading state | Shows loading indicator |
| **error** | Error state | Visual error feedback |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Navigate between filter elements |
| 'Enter' | Apply filter / Confirm selection |
| 'Escape' | Close expanded panel |
| 'Delete' | Remove filter condition |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="group"' | Filter container |
| 'aria-label' | Describes filter purpose |
| 'aria-live' | Announces filter changes |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Quick Filter** | Simple dropdown filters | Common filters, tables |
| **Advanced Filter** | Full filter builder | Complex queries, power users |
| **Filter Chips** | Tag-based active filters | Visual filter display |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`