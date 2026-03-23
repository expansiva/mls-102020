/// <mls fileReference="_102020_/l2/skills/molecules/groupDataCard.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupDataCard

## Metadata

- **Name:** groupDataCard
- **Category:** Data Display
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Display structured information within a visually delimited container, optimized for **data presentation**.

### When to Use

- Present grouped, related information
- Display items in a list or grid
- Showcase content with visual hierarchy
- Kanban or card-based interfaces

### When NOT to Use

- Tabular data comparison → use **DataTable**
- Single metric highlight → use **KpiMetric**
- Simple text display → use **DisplayText**

---

## Contract

### Component Properties

#### Content Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'title' | 'string' | '''' | | '@propertyCompositeDataSource' | Card title |
| 'subtitle' | 'string' | '''' | | '@propertyCompositeDataSource' | Subtitle or short description |
| 'description' | 'string' | '''' | | '@propertyCompositeDataSource' | Longer descriptive text |
| 'image' | 'string' | '''' | | '@propertyDataSource' | URL of the image/media |
| 'icon' | 'string' | '''' | | '@propertyDataSource' | Card icon identifier |
| 'metadata' | 'object' | '{}' | | '@propertyDataSource' | Additional info (date, author, tags) |
| 'data' | 'object' | '{}' | | '@propertyDataSource' | Full data record |

#### Behavior Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'clickable' | 'boolean' | 'false' | | '@property' | Entire card is clickable |
| 'hoverable' | 'boolean' | 'false' | | '@property' | Visual effect on hover |
| 'selectable' | 'boolean' | 'false' | | '@property' | Can be selected |
| 'selected' | 'boolean' | 'false' | | '@propertyDataSource' | Card is currently selected |
| 'expandable' | 'boolean' | 'false' | | '@property' | Can expand to show more |
| 'expanded' | 'boolean' | 'false' | | '@propertyDataSource' | Card is currently expanded |
| 'dismissible' | 'boolean' | 'false' | | '@property' | Can be closed/removed |
| 'draggable' | 'boolean' | 'false' | | '@property' | Can be dragged |

#### State Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'disabled' | 'boolean' | 'false' | | '@property' | Card is disabled |
| 'loading' | 'boolean' | 'false' | | '@property' | Loading content (skeleton) |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.cardImage}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | '{{page1.userName}} - {{page1.role}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'click' | '{ data }' | Fired when card is clicked |
| 'select' | '{ selected, data }' | Fired when card is selected/deselected |
| 'expand' | '{ expanded }' | Fired when card is expanded/collapsed |
| 'dismiss' | '{ data }' | Fired when card is closed |
| 'action' | '{ action, data }' | Fired when a card action is triggered |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Standard appearance |
| **hover** | Cursor over the card | Visual feedback |
| **focus** | Card has focus | Visual focus indicator |
| **disabled** | Card is disabled | Non-interactive, visually dimmed |
| **loading** | Loading content | Displays skeleton/placeholder |
| **selected** | Card is selected | Visual selection indicator |
| **expanded** | Card is expanded | Shows additional content |
| **error** | Error state | Visual error feedback |
| **dragging** | Card is being dragged | Visual drag feedback |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the card |
| 'Enter' / 'Space' | Activates card action |
| 'Escape' | Closes expanded card |
| 'Arrow Keys' | Navigate between cards |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="article"' | Card container (informational) |
| 'role="button"' | Card container (if clickable) |
| 'aria-selected' | Indicates selected state |
| 'aria-expanded' | Indicates expanded state |
| 'aria-disabled' | Indicates disabled state |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Info Card** | Basic information display | General content |
| **Metric Card** | KPI/statistic display | Dashboard metrics |
| **Kanban Card** | Draggable task card | Project management |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`