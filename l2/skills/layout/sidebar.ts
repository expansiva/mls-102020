/// <mls fileReference="_102020_/l2/skills/layout/sidebar.ts" enhancement="_blank"/>

export const skill = `

# Sidebar Design System Skill

## Purpose

The "Sidebar" design model is a visual composition system based on a persistent lateral navigation panel alongside a main content area.

The main goal of Sidebar layouts is to provide constant access to navigation, tools, or contextual information while keeping the main content area focused and uninterrupted.

The layout should communicate:

- persistent navigation
- application structure
- workspace efficiency
- hierarchical organization
- professional tool interface
- contextual access

---

# Core Concept

A Sidebar Layout splits the viewport into two primary zones: a fixed lateral navigation panel and a flexible main content area.

Unlike top-navigation layouts where navigation competes with content, Sidebar layouts intentionally:

- separate navigation from content spatially
- provide persistent access to all sections
- support deep navigation hierarchies
- maximize vertical content space
- create an application-like experience

The final composition should feel structured, navigable, and workspace-oriented.

---

# Layout Structure

A Sidebar layout should always be based on:

- a fixed or sticky sidebar on the left (or right)
- a flexible main content area
- optional top bar within the content area
- clear visual separation between sidebar and content

Conceptual example:

\`\`\`txt
[SIDEBAR][ TOP BAR / BREADCRUMB           ]
[       ][                                 ]
[ NAV   ][ MAIN CONTENT                   ]
[ NAV   ][ MAIN CONTENT                   ]
[ NAV   ][ MAIN CONTENT                   ]
[       ][                                 ]
[BOTTOM ][ FOOTER (optional)              ]
\`\`\`

---

# Mandatory Characteristics

## 1. Persistent Sidebar Panel

The sidebar must remain accessible at all times.

The sidebar should:

- occupy a fixed width on the left side (most common)
- remain visible or easily toggleable
- span the full height of the viewport
- contain primary navigation items
- support collapsed/expanded states

Common sidebar behaviors:

- always visible (desktop default)
- collapsible to icons only (mini sidebar)
- overlay mode (slides over content on mobile)
- hidden by default with toggle (mobile)

---

## 2. Clear Navigation Hierarchy

The sidebar should organize navigation in a structured hierarchy.

Structure:

- primary sections at the top level
- sub-navigation nested under primary items
- expandable/collapsible groups
- clear visual nesting indicators (indentation, icons, lines)
- active item clearly highlighted

---

## 3. Spatial Separation

Sidebar and content must be visually distinct.

Techniques:

- different background colors (sidebar darker or tinted)
- subtle border or shadow between zones
- clear width boundary
- independent scrolling (sidebar and content scroll separately)
- elevation difference (sidebar slightly raised or recessed)

---

## 4. Content Area Independence

The main content area should function as a complete view.

Requirements:

- own scroll context
- optional top bar with breadcrumbs, search, or actions
- full-width or max-width content within the area
- no dependency on sidebar visibility for content comprehension
- support for any content type (tables, forms, cards, text)

---

## 5. Sidebar State Management

The sidebar should support multiple states gracefully.

States:

- expanded (full labels + icons)
- collapsed (icons only, mini mode)
- hidden (completely off-screen)
- overlay (floating over content)

Transitions between states should be smooth and predictable.

---

# Recommended Structure

\`\`\`txt
APP SHELL
 ├── Sidebar
 │    ├── Logo / Brand
 │    ├── Primary Navigation
 │    │    ├── Nav Item 1 (active)
 │    │    ├── Nav Item 2
 │    │    │    ├── Sub Item A
 │    │    │    └── Sub Item B
 │    │    ├── Nav Item 3
 │    │    └── Nav Item 4
 │    ├── Section Divider
 │    ├── Secondary Navigation
 │    │    ├── Settings
 │    │    └── Help
 │    └── User Profile / Footer
 └── Main Area
      ├── Top Bar (optional)
      │    ├── Breadcrumb
      │    ├── Search
      │    └── Actions / Profile
      └── Content
           ├── Page Header
           ├── Content Sections
           └── Footer (optional)
\`\`\`

---

# Responsiveness

## Desktop

- sidebar always visible (expanded or collapsed)
- content area uses remaining width
- hover to expand collapsed sidebar (optional)
- independent scrolling zones
- wide content layouts

## Tablet

- sidebar collapsed to icon-only by default
- expand on click/tap
- content area uses most of the width
- optional overlay mode

## Mobile

- sidebar hidden by default
- hamburger menu toggle to reveal
- overlay sidebar (slides from left)
- backdrop overlay on content when sidebar is open
- full-width content area
- swipe gesture to open/close

---

# Sidebar Composition Rules

## Use:

- clear icon + label navigation items
- grouped navigation sections with dividers
- active item highlight (background, border, or indicator)
- consistent item height and padding
- hover states for interactive feedback
- nested items with indentation
- badge/counter for notifications
- user profile or avatar at the bottom
- logo at the top
- collapse/expand toggle button

## Avoid:

- more than 2 levels of nesting visible at once
- sidebar wider than 280px (expanded) or 64px (collapsed)
- navigation items without icons (icons aid collapsed state)
- inconsistent item spacing
- scrollable sidebar without scroll indicators
- competing navigation between sidebar and content top bar
- decorative elements that reduce navigation space

---

# Sidebar Variants

## Full Sidebar

Always expanded with icons and labels.

Characteristics:

- 220px–280px width
- icon + label for each item
- grouped sections
- best for desktop-first applications
- clear at a glance

---

## Mini / Collapsed Sidebar

Icons only with tooltip labels.

Characteristics:

- 56px–72px width
- icon-only display
- tooltip on hover showing full label
- expand on hover or click
- maximizes content area

---

## Overlay Sidebar

Floats over content.

Characteristics:

- hidden by default
- slides in from the left
- backdrop darkens content area
- dismiss on outside click or swipe
- primary pattern for mobile

---

## Dual Sidebar

Two-level navigation.

Characteristics:

- thin primary sidebar with section icons
- secondary panel expands with sub-navigation
- content area to the right
- suits complex applications (email, project management)
- enterprise pattern

---

# Content Area Components

## Top Bar

Horizontal bar within the content area.

Contains:

- breadcrumb navigation
- page title
- search input
- action buttons
- user profile / notifications
- sidebar toggle button (mobile)

---

## Page Header

Content page introduction.

Contains:

- page title
- description or subtitle
- page-level actions (create, export, filter)
- tab navigation (if page has sub-sections)

---

## Content Body

The main working area.

Supports:

- data tables
- form layouts
- card grids
- rich text
- dashboards
- media galleries
- any content type

---

## Detail Panel (optional)

A secondary panel on the right side.

Use for:

- item detail view (select from list, see details)
- context panels
- chat or activity feeds
- property editors
- inspector panels

---

# Visual Style

Sidebar layouts commonly use:

- darker or tinted sidebar background
- lighter content area background
- icon-based navigation with labels
- subtle dividers between nav groups
- active state with accent color or left border indicator
- smooth collapse/expand transitions
- minimal shadow or border between zones
- consistent iconography system
- user avatar in sidebar footer
- logo in sidebar header
- clean sans-serif typography
- status badges and counters

---

# Mental Model

A Sidebar layout should feel like a combination of:

- desktop application
- admin dashboard
- email client
- project management tool
- IDE or code editor
- settings management interface
- SaaS application shell

---

# Visual Rhythm

The layout should provide rhythm through:

- consistent sidebar as the structural anchor
- varied content layouts per page/section
- navigation hierarchy depth
- active state drawing the eye
- content area breathing room contrasting sidebar density

This rhythm creates a workspace feel with clear spatial orientation.

---

# Recommended Proportions

Common examples:

| Element | Specification |
|---|---|
| Sidebar width (expanded) | 220px–280px |
| Sidebar width (collapsed) | 56px–72px |
| Nav item height | 40px–48px |
| Nav item padding | 12px–16px horizontal |
| Top bar height | 48px–64px |
| Content padding | 24px–32px |
| Active indicator | 3px left border or full background |

---

# Recommended Semantic Structure

Each navigation item may define:

\\\json
{
  "type": "nav-item",
  "label": "Dashboard",
  "icon": "chart-bar",
  "active": true,
  "badge": 5,
  "children": [
    { "label": "Analytics", "icon": "trending-up" },
    { "label": "Reports", "icon": "file-text" }
  ]
}
\\\

---

# Expected Visual Feeling

The design should communicate:

- application structure
- workspace control
- navigational clarity
- persistent orientation
- professional tooling
- hierarchical organization
- operational readiness

---
---

# Summary

Sidebar Design is a composition system based on:

- persistent lateral navigation panel
- flexible main content area
- clear spatial separation
- hierarchical navigation structure
- multiple sidebar states (expanded, collapsed, overlay)
- independent scrolling zones
- responsive sidebar behavior

The primary goal is to provide constant, structured navigation access while keeping the main content area focused, creating an application-like workspace experience.

`