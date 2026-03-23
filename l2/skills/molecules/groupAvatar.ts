/// <mls fileReference="_102020_/l2/skills/molecules/groupAvatar.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupAvatar

## Metadata

- **Name:** groupAvatar
- **Category:** Identity & Status
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Represent **user or entity identity** through visual indicators.

### When to Use

- User profiles
- Contact lists
- Comment authors
- Entity representation

### When NOT to Use

- Status only → use **BadgeStatus**
- Generic icons → use icon components
- Images/media → use image components

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'src' | 'string' | '''' | | '@propertyDataSource' | Image URL |
| 'name' | 'string' | '''' | | '@propertyCompositeDataSource' | Name for initials fallback |
| 'initials' | 'string' | '''' | | '@propertyDataSource' | Custom initials |
| 'icon' | 'string' | '''' | | '@propertyDataSource' | Fallback icon |
| 'status' | ''online' \| 'offline' \| 'busy' \| 'away'' | 'undefined' | | '@propertyDataSource' | Presence status |
| 'badge' | 'string \| number' | 'undefined' | | '@propertyDataSource' | Badge content |
| 'clickable' | 'boolean' | 'false' | | '@property' | Avatar is clickable |
| 'loading' | 'boolean' | 'false' | | '@property' | Loading state |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.userAvatar}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | '{{page1.firstName}} {{page1.lastName}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'click' | '{ }' | Fired when avatar is clicked |
| 'error' | '{ }' | Fired when image fails to load |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **image** | Has valid image | Shows photo |
| **initials** | Image failed/missing | Shows initials |
| **icon** | No name available | Shows icon |
| **loading** | Loading image | Skeleton/placeholder |
| **hover** | Cursor over (if clickable) | Hover feedback |

### Status States

| Status | Description |
|--------|-------------|
| **online** | User is online (green) |
| **offline** | User is offline (gray) |
| **busy** | User is busy (red) |
| **away** | User is away (yellow) |

---

## Accessibility (Recommended)

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="img"' | Image representation |
| 'aria-label' | User name/description |
| 'alt' | Image alt text |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Photo** | Image-based avatar | User profiles |
| **Initials** | Letter-based avatar | Fallback, lists |
| **Group** | Stacked avatars | Team display |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;