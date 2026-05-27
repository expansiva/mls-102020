/// <mls fileReference="_102020_/l2/skills/layout/compact.ts" enhancement="_blank"/>

export const skill = `

# Compact Design System Skill

## Purpose

The "Compact" design model is a visual composition system optimized for dense information display within a condensed layout.

The main goal of Compact layouts is to maximize information density without sacrificing readability, creating efficient interfaces where users can scan and access large amounts of data quickly.

The layout should communicate:

- efficiency
- information density
- organized complexity
- data-driven design
- professional utility
- rapid scanning

---

# Core Concept

A Compact Layout prioritizes showing the maximum amount of relevant information in the minimum amount of space.

Unlike spacious layouts that use generous whitespace, Compact layouts intentionally optimize:

- reduced spacing between elements
- smaller typography scales
- tighter padding and margins
- multi-column data presentation
- collapsed or collapsible sections
- abbreviated content displays

The final composition should feel efficient, organized, and functionally dense without becoming cluttered or unreadable.

---

# Layout Structure

A Compact layout should always be based on:

- tight grid systems
- reduced vertical and horizontal spacing
- multi-column arrangements
- collapsible sections
- condensed header and navigation

Conceptual example:

\`\`\`txt
[ HEADER (slim)                       ]
[ METRIC ][ METRIC ][ METRIC ][ METRIC ]
[ TABLE / LIST DATA                   ]
[ TABLE / LIST DATA                   ]
[ SUMMARY ][ ACTIONS ][ STATUS        ]
\`\`\`

---

# Mandatory Characteristics

## 1. Reduced Spacing

All spacing should be intentionally tighter than standard layouts.

Guidelines:

- section gaps reduced by 40–60% compared to standard
- card padding kept to minimum viable whitespace
- line heights tighter but still legible
- margins condensed without touching
- gutters narrow but consistent

Key: reduce spacing, never eliminate it.

---

## 2. Smaller Typography Scale

Typography should be scaled down to support density.

Recommendations:

- base body text: 13px–14px
- secondary text: 11px–12px
- headings: 16px–20px (avoid large display headings)
- monospace fonts for data-heavy areas
- shorter line lengths within multi-column layouts

---

## 3. Multi-Column Data Presentation

Compact layouts should use horizontal space aggressively.

Techniques:

- 3–6 column grids for metrics
- side-by-side data panels
- multi-column lists
- horizontal key-value pairs
- table-based data displays

---

## 4. Collapsible and Progressive Content

Not all information needs to be visible at once.

Patterns:

- accordion sections
- expand/collapse toggles
- show more / show less
- tooltip-based details
- hover-reveal information
- tabbed sub-sections

---

## 5. Information Hierarchy Through Density

Importance is communicated through density variation.

| Priority | Treatment |
|---|---|
| Critical | Visible, bold, color-highlighted |
| Important | Visible, normal weight |
| Secondary | Collapsed, smaller text, muted color |
| Tertiary | Hidden, accessible on hover or click |

---

# Recommended Structure

\`\`\`txt
PAGE
 ├── Slim Header
 │    ├── Logo (compact)
 │    ├── Navigation (icon-based or abbreviated)
 │    └── Quick Actions
 ├── Metrics Bar
 │    ├── KPI Card
 │    ├── KPI Card
 │    ├── KPI Card
 │    └── KPI Card
 ├── Primary Data Area
 │    ├── Data Table or List
 │    ├── Filters / Controls (inline)
 │    └── Pagination
 ├── Secondary Panels
 │    ├── Summary Panel
 │    ├── Activity Feed
 │    └── Quick Actions
 └── Minimal Footer
\`\`\`

---

# Responsiveness

## Desktop

- full multi-column density
- maximum information visible
- hover interactions for secondary data
- side-by-side panels and tables
- minimal wasted space

## Tablet

- reduce columns from 4–6 to 2–3
- stack secondary panels below primary
- maintain data tables with horizontal scroll
- keep metrics bar visible

## Mobile

- single-column stacking
- collapsible sections by default
- swipeable panels
- sticky filters or controls
- prioritize critical data, hide tertiary
- touch-friendly targets (minimum 44px)

---

# Composition Rules

## Use:

- tight consistent spacing
- small but legible typography
- data tables and lists
- inline filters and controls
- icon-based navigation
- color coding for status
- badges and tags for categorization
- truncated text with tooltips
- horizontal key-value pairs
- condensed card layouts

## Avoid:

- large hero sections
- excessive whitespace
- decorative imagery
- large display typography
- spacious card layouts
- full-width single-content sections
- unnecessary visual embellishments
- empty state areas without purpose

---

# Component Types

## Metrics Bar

A horizontal strip of key performance indicators.

Characteristics:

- 3–6 metrics displayed inline
- number + label format
- optional trend indicators (arrows, sparklines)
- color-coded status
- compact card or borderless style

---

## Data Table

The primary content display for Compact layouts.

Features:

- dense rows with reduced row height
- sortable columns
- inline actions
- row hover highlights
- fixed headers on scroll
- optional column resizing
- pagination or virtual scrolling

---

## Condensed Card

Smaller cards optimized for scanning.

Contains:

- minimal padding
- title + 1–2 data points
- status indicator
- compact action buttons
- truncated descriptions

---

## Filter Bar

Inline filtering and search.

Features:

- horizontal layout
- dropdown filters
- search input
- active filter tags
- clear all option
- results count

---

## Activity Feed

Compact list of recent events.

Contains:

- timestamp + action + actor
- icon indicators
- truncated descriptions
- link to full details
- grouped by time period

---

## Summary Panel

Aggregated data display.

Features:

- key-value pairs
- mini charts (sparklines, progress bars)
- status indicators
- compact spacing

---

# Visual Style

Compact layouts commonly use:

- monospace or condensed typefaces for data
- subtle borders for separation (not spacing)
- muted color palette with accent highlights
- minimal shadows
- thin dividers between rows
- icon-heavy navigation
- badge and tag systems
- status color coding (green, yellow, red, blue)
- hover states for additional context
- minimal border-radius
- flat or very subtle depth

---

# Mental Model

A Compact layout should feel like a combination of:

- analytics dashboard
- admin panel
- data management tool
- monitoring console
- professional back-office interface
- IDE or developer tool

---

# Visual Rhythm

The layout should alternate between:

- dense data sections and summary sections
- tabular data and metric cards
- active controls and passive displays
- structured grids and flexible lists

This rhythm maintains usability despite high density.

---

# Recommended Proportions

Common examples:

| Element | Specification |
|---|---|
| Header height | 40px–52px |
| Row height (table) | 32px–40px |
| Card padding | 8px–16px |
| Section gap | 8px–16px |
| Metric card width | 150px–250px |
| Typography base | 13px–14px |

---

# Recommended Semantic Structure

Each element may define:

\\\json
{
  "type": "metric",
  "importance": "critical",
  "collapsible": false,
  "density": "high"
}
\\\

---

# Expected Visual Feeling

The design should communicate:

- efficiency
- productivity
- data mastery
- professional utility
- organized complexity
- operational control
- functional precision

---
---

# Summary

Compact Design is a composition system based on:

- reduced spacing and tight grids
- high information density
- smaller typography scales
- multi-column data presentation
- collapsible progressive content
- status-driven color coding
- responsive density adaptation

The primary goal is to maximize information visibility and scanning efficiency within a condensed, organized, and functional interface.

`