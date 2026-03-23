/// <mls fileReference="_102020_/l2/skills/molecules/groupModalDialog.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupModalDialog

## Metadata

- **Name:** groupModalDialog
- **Category:** Actions & Navigation
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Display **overlay content** that requires user attention or interaction before continuing.

### When to Use

- Confirmations and alerts
- Forms requiring focus
- Detail views
- Multi-step wizards
- Side panel content

### When NOT to Use

- Brief notifications → use **Notification**
- Inline content → use standard layout
- Non-blocking info → use **Notification** or tooltip

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'open' | 'boolean' | 'false' | | '@propertyDataSource' | Dialog visibility |
| 'title' | 'string' | '''' | | '@propertyCompositeDataSource' | Dialog title |
| 'description' | 'string' | '''' | | '@propertyCompositeDataSource' | Dialog description |
| 'closable' | 'boolean' | 'true' | | '@property' | Show close button |
| 'closeOnOverlay' | 'boolean' | 'true' | | '@property' | Close on overlay click |
| 'closeOnEscape' | 'boolean' | 'true' | | '@property' | Close on Escape key |
| 'preventClose' | 'boolean' | 'false' | | '@property' | Prevent closing |
| 'fullscreen' | 'boolean' | 'false' | | '@property' | Fullscreen mode |
| 'loading' | 'boolean' | 'false' | | '@property' | Loading state |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.isOpen}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Edit {{page1.itemName}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'open' | '{ }' | Fired when dialog opens |
| 'close' | '{ reason: string }' | Fired when dialog closes |
| 'confirm' | '{ }' | Fired when confirmed |
| 'cancel' | '{ }' | Fired when cancelled |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **closed** | Not visible | No overlay |
| **open** | Visible | Overlay + dialog |
| **loading** | Loading content | Loading indicator |
| **fullscreen** | Fullscreen mode | Full viewport |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Navigate within dialog |
| 'Escape' | Close dialog |
| 'Enter' | Confirm (if focused) |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="dialog"' | Dialog container |
| 'aria-modal="true"' | Modal behavior |
| 'aria-labelledby' | Dialog title |
| 'aria-describedby' | Dialog description |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Dialog** | Centered modal | Forms, confirmations |
| **Drawer** | Side panel | Detail views, filters |
| **Confirm** | Simple yes/no dialog | Confirmations |
| **Wizard** | Multi-step dialog | Complex processes |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`