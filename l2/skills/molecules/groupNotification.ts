/// <mls fileReference="_102020_/l2/skills/molecules/groupNotification.ts" enhancement="_blank"/>

export const skill = `


# Skill: groupNotification

## Metadata

- **Name:** groupNotification
- **Category:** Feedback & States
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Communicate **feedback, alerts, and messages** to users about system status or actions.

### When to Use

- Success/error feedback
- System alerts
- Action confirmations
- Important announcements

### When NOT to Use

- Blocking decisions → use **ModalDialog**
- Form validation → use inline errors
- Help text → use tooltips or help components

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'message' | 'string' | '''' | ✓ | '@propertyCompositeDataSource' | Notification message |
| 'title' | 'string' | '''' | | '@propertyCompositeDataSource' | Optional title |
| 'type' | ''info' \| 'success' \| 'warning' \| 'error'' | ''info'' | | '@property' | Notification type |
| 'icon' | 'string' | '''' | | '@propertyDataSource' | Custom icon |
| 'dismissible' | 'boolean' | 'true' | | '@property' | Can be dismissed |
| 'duration' | 'number' | '5000' | | '@property' | Auto-dismiss time (ms) |
| 'action' | 'string' | '''' | | '@property' | Action button text |
| 'visible' | 'boolean' | 'false' | | '@propertyDataSource' | Visibility state |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.showNotification}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | '{{page1.itemName}} saved successfully' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'dismiss' | '{ }' | Fired when notification is dismissed |
| 'action' | '{ }' | Fired when action button is clicked |
| 'show' | '{ }' | Fired when notification appears |
| 'hide' | '{ }' | Fired when notification disappears |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **hidden** | Not visible | No display |
| **visible** | Showing | Animated entrance |
| **dismissing** | Being dismissed | Exit animation |

### Type States

| Type | Description |
|------|-------------|
| **info** | Neutral information |
| **success** | Positive feedback |
| **warning** | Caution/attention |
| **error** | Error/failure |

---

## Accessibility (Recommended)

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="alert"' | Urgent messages |
| 'role="status"' | Non-urgent updates |
| 'aria-live' | Live region updates |
| 'aria-atomic' | Full content announcement |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Toast** | Corner popup | Transient feedback |
| **Banner** | Full-width bar | System announcements |
| **Inline** | In-content alert | Contextual messages |
| **Snackbar** | Bottom bar | Brief actions |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;