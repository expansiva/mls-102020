/// <mls fileReference="_102020_/l2/agentImplementGenome/skills/layout/genCfePageLayoutTabs.ts" enhancement="_blank"/>

export const skill = `

# Tabs Design System Skill

## Purpose

The "Tabs" design model is a visual composition system based on tab navigation that separates content into distinct, switchable sections.

The main goal of Tabs layouts is to organize large amounts of related content into logical groups, allowing users to navigate between sections without leaving the page.

The layout should communicate:

- organization
- content segmentation
- contextual navigation
- structured exploration
- focused attention
- efficient space usage

---

# Core Concept

A Tabs Layout divides content into multiple panels, each accessible through a tab control.

Unlike single-flow layouts where all content is visible at once, Tabs layouts intentionally:

- segment content into logical categories
- show only one section at a time
- provide persistent navigation between sections
- reduce page length and scrolling
- maintain user context within a single view

The final composition should feel organized, focused, and navigable without losing user orientation.

---

# Layout Structure

A Tabs layout should always be based on:

- a persistent tab bar (horizontal or vertical)
- distinct content panels per tab
- a clear active/inactive tab state
- optional header above tabs for page-level context

Conceptual example:

\`\`\`txt
[        HEADER / PAGE TITLE          ]
[ TAB 1 ][ TAB 2 ][ TAB 3 ][ TAB 4  ]
[                                     ]
[        ACTIVE TAB CONTENT           ]
[        ACTIVE TAB CONTENT           ]
[        ACTIVE TAB CONTENT           ]
[                                     ]
\`\`\`

---

# Mandatory Characteristics

## 1. Clear Tab Navigation

The tab bar must be immediately recognizable as navigation.

The tab bar should:

- clearly indicate which tab is active
- use visual differentiation (color, border, background, underline)
- maintain consistent tab sizing or proportional sizing
- be horizontally scrollable if tabs overflow (mobile)
- stay visible while interacting with content

Common tab styles:

- underline indicator (minimal)
- filled background (bold)
- bordered/boxed tabs (classic)
- pill-shaped tabs (modern)

---

## 2. Content Isolation

Each tab panel should be self-contained.

Requirements:

- content within a tab should make sense independently
- no critical dependencies between tabs (user should not need Tab 1 to understand Tab 3)
- each panel can have its own internal layout
- switching tabs should not lose user input (preserve state)
- transitions between tabs should feel instant

---

## 3. Logical Content Grouping

Tabs should represent meaningful categories.

Good tab grouping:

- related content clusters (Overview, Details, Reviews)
- workflow stages (Draft, Review, Published)
- data views (Table, Chart, Map)
- user roles (Admin, User, Guest)
- time periods (Daily, Weekly, Monthly)

Bad tab grouping:

- arbitrary splits of a single narrative
- too many tabs (more than 7)
- tabs with wildly different content volumes
- single-item tabs (one paragraph only)

---

## 4. Active State Clarity

The user must always know which tab is selected.

Active tab indicators:

- bold or different color text
- underline or bottom border
- filled background
- elevated or raised appearance
- connected to content area (no visual gap)

Inactive tab indicators:

- muted text color
- no underline or border
- transparent or subtle background
- hover state for interactivity cue

---

## 5. Consistent Tab Bar Position

The tab bar should remain in a predictable position.

Options:

- directly below the page header (most common)
- at the top of a card or panel
- sticky at the top during scroll (for long content)
- left-aligned vertical tabs (for many categories)

Never place tabs at the bottom of content or in unpredictable locations.

---

# Recommended Structure

\`\`\`txt
PAGE
 ├── Header
 │    ├── Page Title
 │    ├── Description (optional)
 │    └── Page-Level Actions (optional)
 ├── Tab Bar
 │    ├── Tab 1 (active)
 │    ├── Tab 2
 │    ├── Tab 3
 │    └── Tab 4
 └── Tab Content Area
      ├── Panel 1 (visible when Tab 1 active)
      │    ├── Section A
      │    ├── Section B
      │    └── Section C
      ├── Panel 2 (hidden)
      ├── Panel 3 (hidden)
      └── Panel 4 (hidden)
\`\`\`

---

# Responsiveness

## Desktop

- full horizontal tab bar
- all tabs visible without scrolling (up to 7)
- content panel uses full available width
- optional vertical tab variant for many categories

## Tablet

- horizontal tabs may truncate labels
- scrollable tab bar if needed
- content panel adapts to reduced width
- maintain active state visibility

## Mobile

- horizontally scrollable tab bar
- abbreviated or icon-only tabs
- full-width content panel
- swipe gesture support between tabs
- consider converting to dropdown selector for 5+ tabs
- sticky tab bar during scroll

---

# Tab Bar Composition Rules

## Use:

- clear active/inactive visual distinction
- consistent tab height and alignment
- readable labels (1–3 words per tab)
- optional icons paired with labels
- optional badge/counter on tabs (e.g., "Messages (3)")
- subtle hover states on inactive tabs
- smooth transition on tab switch

## Avoid:

- more than 7 tabs in a single bar
- multi-line tab labels
- tabs with no content
- mixing tab styles (underline + filled)
- tab bars that compete with page navigation
- deep nesting (tabs within tabs within tabs)
- inconsistent tab widths that cause layout shifts

---

# Tab Variants

## Horizontal Underline Tabs

The most common pattern.

Characteristics:

- tabs aligned horizontally
- active tab indicated by bottom border/underline
- minimal visual weight
- suits 2–5 tabs

---

## Horizontal Filled Tabs

Bolder visual presence.

Characteristics:

- active tab has filled background
- inactive tabs are transparent
- suits dashboard and app interfaces
- stronger visual separation

---

## Pill / Segmented Tabs

Modern rounded style.

Characteristics:

- rounded pill-shaped active indicator
- often used in toggle-like contexts
- suits 2–4 options
- compact and modern feel

---

## Vertical Tabs

Side-aligned navigation for many categories.

Characteristics:

- tabs stacked vertically on the left
- content area to the right
- supports many categories (10+)
- label + optional icon
- suits settings, documentation, admin panels

---

# Content Panel Types

## Overview Panel

Summary or dashboard view.

Contains:

- key metrics
- summary cards
- quick links to other tabs
- recent activity

---

## Detail Panel

In-depth information display.

Contains:

- form fields
- rich text content
- detailed data tables
- media galleries

---

## List/Table Panel

Data-centric content.

Contains:

- sortable/filterable tables
- list views with actions
- pagination
- bulk operations

---

## Settings Panel

Configuration and preferences.

Contains:

- form controls (toggles, dropdowns, inputs)
- grouped settings sections
- save/cancel actions
- validation feedback

---

## Activity/History Panel

Chronological event display.

Contains:

- timeline of events
- user actions log
- status changes
- date-grouped entries

---

# Visual Style

Tabs layouts commonly use:

- clean typography with clear hierarchy
- subtle color for active tab indication
- consistent content panel backgrounds
- smooth transitions between tabs (fade or slide)
- minimal decorative elements within tab bar
- clear separation between tab bar and content
- consistent internal padding within panels
- neutral backgrounds with accent colors for active states

---

# Mental Model

A Tabs layout should feel like a combination of:

- browser tabs
- settings panel
- multi-section form
- documentation viewer
- dashboard with multiple views
- content management interface

---

# Visual Rhythm

The layout should provide rhythm through:

- consistent tab bar as the anchor point
- varied content density per panel
- clear panel boundaries
- predictable content start position
- internal section variation within panels

This rhythm maintains orientation while allowing content diversity.

---

# Recommended Proportions

Common examples:

| Element | Specification |
|---|---|
| Tab bar height | 44px–56px |
| Tab padding | 12px–24px horizontal |
| Active indicator | 2px–3px underline or full background |
| Content panel padding | 24px–32px |
| Max tabs (horizontal) | 5–7 |
| Max tabs (vertical) | 10–15 visible |

---

# Recommended Semantic Structure

Each tab may define:

\\\json
{
  "type": "tab",
  "label": "Overview",
  "icon": "chart",
  "badge": 3,
  "active": true,
  "panelContent": "overview"
}
\\\

---

# Expected Visual Feeling

The design should communicate:

- order
- categorization
- focused content
- navigable structure
- efficient organization
- clean segmentation
- contextual awareness

---
---

# Summary

Tabs Design is a composition system based on:

- tab navigation for content segmentation
- distinct content panels per category
- clear active/inactive tab states
- logical content grouping
- persistent tab bar positioning
- smooth transitions between sections
- responsive tab adaptations

The primary goal is to organize complex content into navigable, focused sections that users can switch between effortlessly while maintaining context and orientation.

`