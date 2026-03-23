/// <mls fileReference="_102020_/l2/skills/molecules/groupKpiMetric.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupKpiMetric

## Metadata

- **Name:** groupKpiMetric
- **Category:** Data Display
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Display **key performance indicators** and metrics with visual emphasis and trend indicators.

### When to Use

- Dashboard metrics and KPIs
- Numeric highlights
- Trend visualization
- Performance indicators

### When NOT to Use

- Full chart visualization → use **Chart**
- Tabular metrics → use **DataTable**
- General text → use **DisplayText**

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'number \| string' | '''' | ✓ | '@propertyDataSource' | Primary metric value |
| 'label' | 'string' | '''' | | '@propertyCompositeDataSource' | Metric label/title |
| 'unit' | 'string' | '''' | | '@property' | Unit of measurement |
| 'format' | 'string' | ''number'' | | '@property' | Value format (number, currency, percent) |
| 'precision' | 'number' | '0' | | '@property' | Decimal places |
| 'previousValue' | 'number' | 'undefined' | | '@propertyDataSource' | Previous value for trend |
| 'trend' | ''up' \| 'down' \| 'neutral'' | 'undefined' | | '@propertyDataSource' | Trend direction |
| 'trendValue' | 'number \| string' | 'undefined' | | '@propertyDataSource' | Trend change value |
| 'sparklineData' | 'number[]' | '[]' | | '@propertyDataSource' | Data for sparkline chart |
| 'target' | 'number' | 'undefined' | | '@propertyDataSource' | Target/goal value |
| 'thresholds' | 'object' | '{}' | | '@property' | Color thresholds |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.revenue}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | '{{page1.metricName}} ({{page1.period}})' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'click' | '{ value, label }' | Fired when metric is clicked |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows metric value |
| **loading** | Loading state | Skeleton placeholder |
| **positive** | Positive trend/value | Green/positive styling |
| **negative** | Negative trend/value | Red/negative styling |
| **neutral** | Neutral trend | Neutral styling |
| **error** | Error state | Error display |

---

## Accessibility (Recommended)

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="status"' | For live-updating metrics |
| 'aria-label' | Full metric description |
| 'aria-live' | For dynamic updates |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Big Number** | Large prominent metric | Primary KPIs |
| **Sparkline** | Metric with mini chart | Trend visualization |
| **Trend** | Metric with change indicator | Comparisons, growth |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`