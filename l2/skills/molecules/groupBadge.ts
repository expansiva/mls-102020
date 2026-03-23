/// <mls fileReference="_102020_/l2/skills/molecules/groupBadge.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupBadge

## Metadata

- **Name:** groupBadge
- **Category:** Identity & Status
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Indicate **status, category, or count** through visual badges and labels.

### When to Use

- Status indicators
- Category labels
- Notification counts
- Tags and labels

### When NOT to Use

- Progress indication → use **Progress**
- User identity → use **Avatar**
- Detailed status → use **DisplayText**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Badge text |
| 'value' | 'number' | 'undefined' | | '@propertyDataSource' | Numeric count |
| 'type' | ''default' \| 'success' \| 'warning' \| 'error' \| 'info'' | ''default'' | | '@property' | Badge type/color |
| 'max' | 'number' | '99' | | '@property' | Max displayed count |
| 'dot' | 'boolean' | 'false' | | '@property' | Show as dot only |
| 'showZero' | 'boolean' | 'false' | | '@property' | Show when count is 0 |
| 'removable' | 'boolean' | 'false' | | '@property' | Can be removed |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.notificationCount}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | '{{page1.statusLabel}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'remove' | '{ }' | Fired when badge is removed |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Standard appearance |
| **hover** | Cursor over (if interactive) | Hover feedback |

### Type States

| Type | Description |
|------|-------------|
| **default** | Neutral/gray |
| **success** | Positive/green |
| **warning** | Caution/yellow |
| **error** | Negative/red |
| **info** | Information/blue |

---

## Accessibility (Recommended)

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="status"' | Status indicator |
| 'aria-label' | Full description |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Pill** | Rounded label badge | Status, categories |
| **Dot** | Small indicator dot | Online status, alerts |
| **Tag** | Removable label | Filters, tags |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;