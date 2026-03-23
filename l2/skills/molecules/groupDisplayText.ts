/// <mls fileReference="_102020_/l2/skills/molecules/groupDisplayText.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupDisplayText

## Metadata

- **Name:** groupDisplayText
- **Category:** Data Display
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Present **text content** with semantic meaning and visual hierarchy.

### When to Use

- Displaying labels and values
- Showing paragraphs of content
- Highlighting important text
- Static text presentation

### When NOT to Use

- Editable text → use **InputText**
- Numeric metrics → use **KpiMetric**
- Structured data → use **DataCard** or **DataTable**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'string' | '''' | ✓ | '@propertyCompositeDataSource' | Text content to display |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Optional label above text |
| 'format' | 'string' | ''text'' | | '@property' | Format type (text, html, markdown) |
| 'truncate' | 'boolean' | 'false' | | '@property' | Truncate with ellipsis |
| 'maxLines' | 'number' | 'undefined' | | '@property' | Maximum lines before truncation |
| 'copyable' | 'boolean' | 'false' | | '@property' | Show copy button |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyCompositeDataSource' | Binds to multiple composed states | '{{page1.firstName}} {{page1.lastName}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'copy' | '{ value: string }' | Fired when text is copied |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows text content |
| **loading** | Loading state | Skeleton placeholder |
| **truncated** | Content truncated | Shows ellipsis, expand option |
| **copied** | Just copied | Brief visual feedback |

---

## Accessibility (Recommended)

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'aria-label' | Accessible description if needed |
| 'aria-live' | For dynamic content updates |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Label** | Simple text label | Form labels, headings |
| **Paragraph** | Multi-line text | Descriptions, content |
| **Highlight** | Emphasized text | Important values, alerts |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`