/// <mls fileReference="_102020_/l2/skills/molecules/groupActionButton.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupActionButton

## Metadata

- **Name:** groupActionButton
- **Category:** Actions & Navigation
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Trigger **actions and commands** through clickable interactive elements.

### When to Use

- Submit forms
- Trigger operations
- Navigate to actions
- Confirm decisions

### When NOT to Use

- Navigation links → use standard links or **Menu**
- Toggle states → use **Toggle**
- Selection → use **SelectOne** or **SelectMany**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Button text |
| 'icon' | 'string' | '''' | | '@propertyDataSource' | Icon identifier |
| 'iconPosition' | ''start' \| 'end'' | ''start'' | | '@property' | Icon placement |
| 'type' | ''button' \| 'submit' \| 'reset'' | ''button'' | | '@property' | HTML button type |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the button |
| 'loading' | 'boolean' | 'false' | | '@property' | Shows loading state |
| 'fullWidth' | 'boolean' | 'false' | | '@property' | Button takes full width |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.buttonIcon}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Save {{page1.itemName}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'click' | '{ }' | Fired when button is clicked |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial state | Ready for interaction |
| **hover** | Cursor over button | Visual feedback |
| **focus** | Button has focus | Focus indicator |
| **active** | Button pressed | Pressed appearance |
| **disabled** | Button disabled | Non-interactive, dimmed |
| **loading** | Operation in progress | Loading indicator, disabled |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Focus button |
| 'Enter' / 'Space' | Activate button |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'aria-label' | Accessible name (icon-only) |
| 'aria-disabled' | Disabled state |
| 'aria-busy' | Loading state |
| 'aria-pressed' | Toggle button state |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Primary Button** | Main action button | Primary actions |
| **Icon Button** | Icon-only button | Toolbars, compact UI |
| **Split Button** | Button with dropdown | Action with options |
| **FAB** | Floating action button | Mobile primary action |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |
`;
