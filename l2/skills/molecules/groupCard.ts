/// <mls fileReference="_102020_/l2/skills/molecules/groupCard.ts" enhancement="_blank"/>

export const skill = `

# Skill: GroupCard

## Metadata

- **Name:** GroupCard
- **Category:** Display Molecules
- **Version:** 1.0.0
- **Last Updated:** 20/03/2026

---

## Definition

### Essence

Display structured information within a visually delimited container.

### When to Use

- Present grouped, related information
- Display items in a list or grid
- Showcase content with visual hierarchy
- Create interactive content blocks

### When NOT to Use

- Simple text display without grouping → use **Text/Typography**
- Single action button → use **Button**
- Navigation items → use **Menu/Nav**
- Tabular data → use **Table**

---

## Contract

### Anatomy

| Area | Description | Required |
|------|-------------|:--------:|
| 'header' | Top area (title, actions) | |
| 'media' | Image, video, or visual content | |
| 'body' | Main content area | |
| 'footer' | Bottom area (actions, metadata) | |

All areas are flexible slots. A valid Card must have at least one area populated.

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

#### Behavior Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'clickable' | 'boolean' | 'false' | | '@property' | Entire card is clickable |
| 'hoverable' | 'boolean' | 'false' | | '@property' | Visual effect on hover |
| 'selectable' | 'boolean' | 'false' | | '@property' | Can be selected (checkbox/radio) |
| 'selected' | 'boolean' | 'false' | | '@propertyDataSource' | Card is currently selected |
| 'expandable' | 'boolean' | 'false' | | '@property' | Can expand to show more content |
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
| 'click' | '{ }' | Fired when card is clicked (if 'clickable') |
| 'select' | '{ selected: boolean }' | Fired when card is selected/deselected (if 'selectable') |
| 'expand' | '{ expanded: boolean }' | Fired when card is expanded/collapsed (if 'expandable') |
| 'dismiss' | '{ }' | Fired when card is closed (if 'dismissible') |
| 'action' | '{ action: string }' | Fired when a card action is triggered |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Standard appearance |
| **hover** | Cursor over the card | Visual feedback (if 'hoverable') |
| **focus** | Card has focus | Visual focus indicator |
| **disabled** | Card is disabled | Non-interactive, visually dimmed |
| **loading** | Loading content | Displays skeleton/placeholder |
| **selected** | Card is selected | Visual selection indicator |
| **expanded** | Card is expanded | Shows additional content |
| **error** | Error state | Visual error feedback |
| **dragging** | Card is being dragged | Visual drag feedback (if 'draggable') |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the card |
| 'Enter' / 'Space' | Activates card (click, select, or expand) |
| 'Escape' | Closes expanded card or cancels drag |
| 'Arrow Keys' | Navigate between cards in a grid/list |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="article"' | Card container (informational) |
| 'role="button"' | Card container (if 'clickable') |
| 'role="checkbox"' | Card container (if 'selectable') |
| 'aria-selected' | Indicates selected state |
| 'aria-expanded' | Indicates expanded state |
| 'aria-disabled' | Indicates disabled state |
| 'aria-busy' | Indicates loading state |
| 'aria-grabbed' | Indicates dragging state |


## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 20/03/2026 | Initial contract definition |

`