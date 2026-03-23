/// <mls fileReference="_102020_/l2/skills/molecules/groupDataTable.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupDataTable

## Metadata

- **Name:** groupDataTable
- **Category:** Data Display
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Display and interact with **structured tabular data** with support for sorting, filtering, pagination, and editing.

### When to Use

- Displaying lists of records
- Comparing data across rows
- Bulk data operations
- CRUD interfaces

### When NOT to Use

- Single record display → use **DataCard**
- Simple key-value pairs → use **DisplayText**
- Visual data representation → use **Chart**

---

## Contract

### Column Definition Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'key' | 'string' | ✓ | Data field key |
| 'label' | 'string' | ✓ | Column header text |
| 'type' | 'string' | | Data type for formatting |
| 'sortable' | 'boolean' | | Enable column sorting |
| 'filterable' | 'boolean' | | Enable column filtering |
| 'editable' | 'boolean' | | Enable inline editing |
| 'width' | 'string' | | Column width |
| 'align' | 'string' | | Text alignment |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'data' | 'Array<object>' | '[]' | ✓ | '@propertyDataSource' | Table data rows |
| 'columns' | 'ColumnDefinition[]' | '[]' | ✓ | '@propertyDataSource' | Column configurations |
| 'selectedRows' | 'Array<string \| number>' | '[]' | | '@propertyDataSource' | Selected row identifiers |
| 'sortField' | 'string' | '''' | | '@propertyDataSource' | Current sort field |
| 'sortOrder' | ''asc' \| 'desc'' | ''asc'' | | '@propertyDataSource' | Sort direction |
| 'page' | 'number' | '1' | | '@propertyDataSource' | Current page |
| 'pageSize' | 'number' | '10' | | '@property' | Rows per page |
| 'totalRows' | 'number' | '0' | | '@propertyDataSource' | Total row count (server pagination) |
| 'selectable' | 'boolean' | 'false' | | '@property' | Enable row selection |
| 'multiSelect' | 'boolean' | 'false' | | '@property' | Enable multi-row selection |
| 'editable' | 'boolean' | 'false' | | '@property' | Enable inline editing |
| 'expandable' | 'boolean' | 'false' | | '@property' | Enable row expansion |
| 'reorderable' | 'boolean' | 'false' | | '@property' | Enable row reordering |
| 'stickyHeader' | 'boolean' | 'true' | | '@property' | Fixed header on scroll |
| 'virtualized' | 'boolean' | 'false' | | '@property' | Virtual scrolling for large datasets |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.tableData}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'rowClick' | '{ row, index }' | Fired when row is clicked |
| 'rowSelect' | '{ selectedRows }' | Fired when selection changes |
| 'sort' | '{ field, order }' | Fired when sort changes |
| 'page' | '{ page, pageSize }' | Fired when page changes |
| 'cellEdit' | '{ row, field, oldValue, newValue }' | Fired when cell is edited |
| 'rowExpand' | '{ row, expanded }' | Fired when row expands/collapses |
| 'rowReorder' | '{ oldIndex, newIndex }' | Fired when row is reordered |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows data rows |
| **loading** | Loading data | Skeleton or spinner |
| **empty** | No data | Empty state message |
| **error** | Error state | Error message display |
| **disabled** | Disabled | Non-interactive |

### Row States

| State | Description |
|-------|-------------|
| **default** | Normal row display |
| **hover** | Cursor over row |
| **selected** | Row is selected |
| **expanded** | Row is expanded |
| **editing** | Row/cell in edit mode |
| **dragging** | Row being reordered |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Navigate to/from table |
| 'Arrow Keys' | Navigate cells |
| 'Space' | Select row / Toggle expansion |
| 'Enter' | Activate row / Edit cell |
| 'Escape' | Cancel edit |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="grid"' | Table container |
| 'role="row"' | Each row |
| 'role="columnheader"' | Header cells |
| 'role="gridcell"' | Data cells |
| 'aria-sort' | Sort state |
| 'aria-selected' | Selection state |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Table** | Standard data table | General data display |
| **Editable Grid** | Spreadsheet-like editing | Data entry, bulk edit |
| **Virtualized Table** | Virtual scrolling | Large datasets (1000+ rows) |
| **Tree Table** | Hierarchical data | Parent-child relationships |
| **Pivot Table** | Aggregated data views | Analytics, summaries |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;