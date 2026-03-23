/// <mls fileReference="_102020_/l2/skills/molecules/groupMenu.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupMenu

## Metadata

- **Name:** groupMenu
- **Category:** Actions & Navigation
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Present a **list of actions or options** in a dropdown or contextual overlay.

### When to Use

- Multiple related actions
- Context-specific options
- Overflow actions
- Navigation submenus

### When NOT to Use

- Single action → use **ActionButton**
- Form selection → use **SelectOne**
- Primary navigation → use **Tabs** or nav components

---

## Contract

### Menu Item Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'id' | 'string' | ✓ | Unique identifier |
| 'label' | 'string' | ✓ | Display text |
| 'icon' | 'string' | | Item icon |
| 'shortcut' | 'string' | | Keyboard shortcut |
| 'disabled' | 'boolean' | | Item is disabled |
| 'danger' | 'boolean' | | Destructive action styling |
| 'children' | 'MenuItem[]' | | Submenu items |
| 'divider' | 'boolean' | | Render as divider |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'items' | 'MenuItem[]' | '[]' | ✓ | '@propertyDataSource' | Menu items |
| 'open' | 'boolean' | 'false' | | '@propertyDataSource' | Menu visibility |
| 'trigger' | ''click' \| 'hover' \| 'contextmenu'' | ''click'' | | '@property' | Open trigger |
| 'placement' | 'string' | ''bottom-start'' | | '@property' | Menu placement |
| 'closeOnSelect' | 'boolean' | 'true' | | '@property' | Close after selection |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the menu |
| 'loading' | 'boolean' | 'false' | | '@property' | Loading state |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.menuItems}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'select' | '{ item }' | Fired when item is selected |
| 'open' | '{ }' | Fired when menu opens |
| 'close' | '{ }' | Fired when menu closes |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **closed** | Menu not visible | Trigger element only |
| **open** | Menu visible | Shows menu items |
| **disabled** | Menu disabled | Cannot be opened |
| **loading** | Loading items | Loading indicator |

### Item States

| State | Description |
|-------|-------------|
| **default** | Normal item |
| **hover** | Cursor over item |
| **focus** | Item has focus |
| **disabled** | Item disabled |
| **active** | Item activated |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Enter' / 'Space' | Open menu / Select item |
| 'Arrow Down' | Next item |
| 'Arrow Up' | Previous item |
| 'Arrow Right' | Open submenu |
| 'Arrow Left' | Close submenu |
| 'Escape' | Close menu |
| 'Home' | First item |
| 'End' | Last item |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="menu"' | Menu container |
| 'role="menuitem"' | Each item |
| 'aria-haspopup' | Has submenu |
| 'aria-expanded' | Open state |
| 'aria-disabled' | Disabled state |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Dropdown Menu** | Click-triggered dropdown | Action menus |
| **Context Menu** | Right-click menu | Contextual actions |
| **Overflow Menu** | More actions button | Toolbars, cards |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`