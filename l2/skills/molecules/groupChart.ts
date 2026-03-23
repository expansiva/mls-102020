/// <mls fileReference="_102020_/l2/skills/molecules/groupChart.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupChart

## Metadata

- **Name:** groupChart
- **Category:** Data Display
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Visualize **data relationships and patterns** through graphical representations.

### When to Use

- Showing trends over time
- Comparing values across categories
- Displaying distributions
- Data visualization dashboards

### When NOT to Use

- Single metric → use **KpiMetric**
- Tabular data → use **DataTable**
- Textual data → use **DisplayText**

---

## Contract

### Data Point Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'label' | 'string' | ✓ | Data point label |
| 'value' | 'number' | ✓ | Data point value |
| 'category' | 'string' | | Grouping category |
| 'color' | 'string' | | Custom color |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'data' | 'DataPoint[] \| object' | '[]' | ✓ | '@propertyDataSource' | Chart data |
| 'labels' | 'string[]' | '[]' | | '@propertyDataSource' | Axis labels |
| 'series' | 'SeriesConfig[]' | '[]' | | '@propertyDataSource' | Multi-series configuration |
| 'title' | 'string' | '''' | | '@propertyCompositeDataSource' | Chart title |
| 'xAxisLabel' | 'string' | '''' | | '@propertyCompositeDataSource' | X-axis label |
| 'yAxisLabel' | 'string' | '''' | | '@propertyCompositeDataSource' | Y-axis label |
| 'showLegend' | 'boolean' | 'true' | | '@property' | Display legend |
| 'showGrid' | 'boolean' | 'true' | | '@property' | Display grid lines |
| 'showTooltip' | 'boolean' | 'true' | | '@property' | Enable tooltips |
| 'animate' | 'boolean' | 'true' | | '@property' | Enable animations |
| 'stacked' | 'boolean' | 'false' | | '@property' | Stack series (bar/area) |
| 'interactive' | 'boolean' | 'true' | | '@property' | Enable interactions |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.chartData}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | '{{page1.metric}} by {{page1.dimension}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'pointClick' | '{ point, series, index }' | Fired when data point is clicked |
| 'legendClick' | '{ series, visible }' | Fired when legend item is clicked |
| 'zoom' | '{ range }' | Fired when chart is zoomed |
| 'brush' | '{ selection }' | Fired when range is selected |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows chart |
| **loading** | Loading state | Skeleton or spinner |
| **empty** | No data | Empty state message |
| **error** | Error state | Error display |
| **zoomed** | Zoomed view | Shows zoom controls |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Navigate chart elements |
| 'Arrow Keys' | Navigate data points |
| 'Enter' | Select/activate point |
| 'Escape' | Reset zoom/selection |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="img"' | Chart container |
| 'aria-label' | Chart description |
| 'aria-describedby' | Links to data table |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Line Chart** | Connected data points | Trends over time |
| **Bar Chart** | Vertical/horizontal bars | Categorical comparison |
| **Pie Chart** | Circular segments | Part-to-whole |
| **Donut Chart** | Ring segments | Part-to-whole with center |
| **Gauge** | Radial progress | Progress, targets |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`