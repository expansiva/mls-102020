/// <mls fileReference="_102020_/l2/skills/molecules/groupTreeView.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupTreeView

## Metadata

- **Name:** groupTreeView
- **Category:** Data Display
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Display **hierarchical data structures** with expandable/collapsible nodes.

### When to Use

- File/folder structures
- Organizational hierarchies
- Category trees
- Nested navigation

### When NOT to Use

- Flat lists → use **DataTable** or **SelectOne**
- Non-hierarchical data → use appropriate flat component
- Simple parent-child → consider **DataTable** with grouping

---

## Contract

### Node Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'id' | 'string \| number' | ✓ | Unique node identifier |
| 'label' | 'string' | ✓ | Display text |
| 'children' | 'Node[]' | | Child nodes |
| 'icon' | 'string' | | Node icon |
| 'disabled' | 'boolean' | | Node is disabled |
| 'selectable' | 'boolean' | | Node can be selected |
| 'data' | 'object' | | Additional node data |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'data' | 'Node[]' | '[]' | ✓ | '@propertyDataSource' | Tree data |
| 'selectedNodes' | 'Array<string \| number>' | '[]' | | '@propertyDataSource' | Selected node IDs |
| 'expandedNodes' | 'Array<string \| number>' | '[]' | | '@propertyDataSource' | Expanded node IDs |
| 'selectable' | 'boolean' | 'false' | | '@property' | Enable node selection |
| 'multiSelect' | 'boolean' | 'false' | | '@property' | Enable multi-selection |
| 'checkable' | 'boolean' | 'false' | | '@property' | Show checkboxes |
| 'draggable' | 'boolean' | 'false' | | '@property' | Enable drag and drop |
| 'showLines' | 'boolean' | 'true' | | '@property' | Show connecting lines |
| 'expandOnClick' | 'boolean' | 'true' | | '@property' | Expand node on click |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.treeData}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'nodeClick' | '{ node }' | Fired when node is clicked |
| 'nodeSelect' | '{ selectedNodes }' | Fired when selection changes |
| 'nodeExpand' | '{ node, expanded }' | Fired when node expands/collapses |
| 'nodeCheck' | '{ node, checked, checkedNodes }' | Fired when checkbox changes |
| 'nodeDrop' | '{ node, target, position }' | Fired when node is dropped |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows tree structure |
| **loading** | Loading state | Skeleton or spinner |
| **empty** | No data | Empty state message |
| **disabled** | Disabled | Non-interactive |
| **error** | Error state | Error display |

### Node States

| State | Description |
|-------|-------------|
| **default** | Normal node |
| **hover** | Cursor over node |
| **selected** | Node is selected |
| **expanded** | Node is expanded |
| **collapsed** | Node is collapsed |
| **disabled** | Node is disabled |
| **dragging** | Node being dragged |
| **drop-target** | Valid drop target |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Enter/exit tree |
| 'Arrow Up/Down' | Navigate nodes |
| 'Arrow Right' | Expand node / Move to child |
| 'Arrow Left' | Collapse node / Move to parent |
| 'Enter' / 'Space' | Select node |
| 'Home' | First node |
| 'End' | Last visible node |
| '*' | Expand all siblings |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="tree"' | Tree container |
| 'role="treeitem"' | Each node |
| 'aria-expanded' | Expansion state |
| 'aria-selected' | Selection state |
| 'aria-level' | Nesting level |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Tree** | Standard tree view | File systems, categories |
| **Org Chart** | Organizational hierarchy | Company structures |
| **Cascader** | Cascading selection | Location, category picking |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`