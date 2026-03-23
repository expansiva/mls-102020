/// <mls fileReference="_102020_/l2/skills/molecules/groupProgress.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupProgress

## Metadata

- **Name:** groupProgress
- **Category:** Feedback & States
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Indicate **loading, progress, or completion status** of operations or processes.

### When to Use

- Long-running operations
- File uploads/downloads
- Step completion tracking
- Loading states

### When NOT to Use

- Multi-step wizard → use **Stepper**
- Simple loading → use component loading state
- Instant actions → no progress needed

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'number' | '0' | | '@propertyDataSource' | Progress value (0-100) |
| 'max' | 'number' | '100' | | '@property' | Maximum value |
| 'indeterminate' | 'boolean' | 'false' | | '@property' | Unknown duration |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Progress label |
| 'showValue' | 'boolean' | 'false' | | '@property' | Display percentage |
| 'status' | ''active' \| 'success' \| 'error' \| 'paused'' | ''active'' | | '@propertyDataSource' | Progress status |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.uploadProgress}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Uploading {{page1.fileName}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'complete' | '{ }' | Fired when progress reaches 100% |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **active** | In progress | Animated progress |
| **indeterminate** | Unknown progress | Continuous animation |
| **success** | Completed successfully | Success styling |
| **error** | Failed | Error styling |
| **paused** | Temporarily stopped | Paused appearance |

---

## Accessibility (Recommended)

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="progressbar"' | Progress container |
| 'aria-valuenow' | Current value |
| 'aria-valuemin' | Minimum value |
| 'aria-valuemax' | Maximum value |
| 'aria-label' | Accessible description |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Progress Bar** | Horizontal bar | File uploads, loading |
| **Progress Ring** | Circular progress | Compact displays |
| **Progress Steps** | Step indicators | Multi-phase operations |
| **Skeleton** | Content placeholder | Page/component loading |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;