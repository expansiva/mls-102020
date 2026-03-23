/// <mls fileReference="_102020_/l2/skills/molecules/groupToogle.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupToggle

## Metadata

- **Name:** groupToggle
- **Category:** Data Entry & Editing
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow the user to switch between **two mutually exclusive states** (on/off, yes/no, true/false).

### When to Use

- Binary choice with immediate effect
- Enable/disable settings
- Yes/no answers
- Feature flags

### When NOT to Use

- More than two options → use **SelectOne**
- Multiple selections → use **SelectMany**
- Action that requires confirmation → use **ActionButton**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'boolean' | 'false' | | '@propertyDataSource' | Current state (true = on) |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Toggle label |
| 'labelOn' | 'string' | '''' | | '@propertyCompositeDataSource' | Label when on |
| 'labelOff' | 'string' | '''' | | '@propertyCompositeDataSource' | Label when off |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates mandatory field |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.isEnabled}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Enable {{page1.featureName}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: boolean }' | Fired when state changes |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **off** | Toggle is off (false) | Inactive appearance |
| **on** | Toggle is on (true) | Active appearance |
| **hover** | Cursor over the component | Visual feedback |
| **focus** | Component has focus | Visual focus indicator |
| **disabled** | Component is disabled | Non-interactive, visually dimmed |
| **readonly** | Read-only mode | Displays state, no interaction |
| **loading** | Loading state | Displays loading indicator |
| **error** | Error state | Visual error feedback |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| 'Space' | Toggles state |
| 'Enter' | Toggles state (some variants) |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="switch"' | For switch variants |
| 'role="checkbox"' | For checkbox variants |
| 'aria-checked' | Current state |
| 'aria-disabled' | Indicates disabled state |
| 'aria-readonly' | Indicates readonly state |
| 'aria-label' | Accessible name |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Switch** | iOS-style sliding toggle | Settings, preferences |
| **Checkbox** | Traditional checkbox | Forms, agreements |
| **Yes/No** | Labeled binary buttons | Explicit choices |
| **Icon Toggle** | Icon-based toggle | Compact UI, toolbars |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`