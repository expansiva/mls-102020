/// <mls fileReference="_102020_/l2/skills/molecules/groupEmptyState.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupEmptyState

## Metadata

- **Name:** groupEmptyState
- **Category:** Feedback & States
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Communicate **absence of content** and guide users on next steps.

### When to Use

- No search results
- Empty lists/tables
- First-time use
- No data available

### When NOT to Use

- Loading state → use **Progress** or skeleton
- Error state → use error handling
- Hidden content → use appropriate messaging

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'title' | 'string' | '''' | ✓ | '@propertyCompositeDataSource' | Empty state title |
| 'description' | 'string' | '''' | | '@propertyCompositeDataSource' | Explanatory text |
| 'icon' | 'string' | '''' | | '@propertyDataSource' | Icon or illustration |
| 'image' | 'string' | '''' | | '@propertyDataSource' | Illustration image URL |
| 'actionLabel' | 'string' | '''' | | '@propertyCompositeDataSource' | Primary action button |
| 'secondaryActionLabel' | 'string' | '''' | | '@propertyCompositeDataSource' | Secondary action button |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.emptyIcon}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'No {{page1.itemType}} found' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'action' | '{ }' | Fired when primary action clicked |
| 'secondaryAction' | '{ }' | Fired when secondary action clicked |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Standard empty state | Shows content |

---

## Accessibility (Recommended)

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="status"' | Empty state announcement |
| 'aria-label' | Accessible description |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Illustration** | Large visual empty state | First-time use |
| **Minimal** | Text-only empty state | Tables, compact areas |
| **Action** | Empty state with CTA | Guided next steps |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;
