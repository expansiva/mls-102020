/// <mls fileReference="_102020_/l2/skills/molecules/groupTabs.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupTabs

## Metadata

- **Name:** groupTabs
- **Category:** Actions & Navigation
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Organize content into **switchable panels** within the same context.

### When to Use

- Multiple views of related content
- Sectioned forms or settings
- Dashboard panels
- Detail page sections

### When NOT to Use

- Sequential process → use **Stepper**
- Primary navigation → use dedicated nav
- Single content area → no tabs needed

---

## Contract

### Tab Item Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'id' | 'string' | ✓ | Unique identifier |
| 'label' | 'string' | ✓ | Tab label |
| 'icon' | 'string' | | Tab icon |
| 'disabled' | 'boolean' | | Tab is disabled |
| 'badge' | 'string \| number' | | Badge/count indicator |
| 'closable' | 'boolean' | | Tab can be closed |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'tabs' | 'TabItem[]' | '[]' | ✓ | '@propertyDataSource' | Tab definitions |
| 'activeTab' | 'string' | '''' | | '@propertyDataSource' | Currently active tab ID |
| 'scrollable' | 'boolean' | 'false' | | '@property' | Enable tab scrolling |
| 'addable' | 'boolean' | 'false' | | '@property' | Allow adding tabs |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables all tabs |
| 'loading' | 'boolean' | 'false' | | '@property' | Loading state |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.tabs}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ tab }' | Fired when active tab changes |
| 'close' | '{ tab }' | Fired when tab is closed |
| 'add' | '{ }' | Fired when add tab is clicked |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows tabs |
| **disabled** | All tabs disabled | Non-interactive |
| **loading** | Loading state | Loading indicator |
| **scrollable** | Many tabs | Scroll arrows visible |

### Tab States

| State | Description |
|-------|-------------|
| **default** | Inactive tab |
| **active** | Currently selected |
| **hover** | Cursor over tab |
| **focus** | Tab has focus |
| **disabled** | Tab disabled |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Enter/exit tab list |
| 'Arrow Left/Right' | Navigate tabs (horizontal) |
| 'Arrow Up/Down' | Navigate tabs (vertical) |
| 'Enter' / 'Space' | Activate tab |
| 'Home' | First tab |
| 'End' | Last tab |
| 'Delete' | Close tab (if closable) |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="tablist"' | Tab container |
| 'role="tab"' | Each tab |
| 'role="tabpanel"' | Content panel |
| 'aria-selected' | Active state |
| 'aria-controls' | Links to panel |
| 'aria-labelledby' | Panel linked to tab |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Horizontal Tabs** | Standard top tabs | Most use cases |
| **Vertical Tabs** | Side-aligned tabs | Settings, long lists |
| **Pill Tabs** | Rounded pill style | Modern UI, filters |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;