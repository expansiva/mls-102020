/// <mls fileReference="_102020_/l2/aura/agentImplementGenome/skills/layout/genCfePageLayoutStandard.ts" enhancement="_blank"/>

export const skill = `

# Standard Design System Skill

## Purpose

The "Standard" design model is a visual composition system based on a top header with a full-width content area below.

The main goal of Standard layouts is to create clean, professional, and familiar interfaces where content takes center stage with clear top-level navigation.

The layout should communicate:

- clarity
- professionalism
- familiarity
- content-first design
- straightforward navigation
- wide readability

---

# Core Concept

A Standard Layout follows the most widely adopted web composition pattern: a persistent top header followed by a full-width content area.

Unlike complex multi-panel layouts, Standard layouts prioritize:

- maximum content width
- clear top-level navigation
- linear reading flow
- minimal cognitive overhead
- broad content flexibility

The final composition should feel clean, professional, and immediately understandable.

---

# Layout Structure

A Standard layout should always be based on:

- a fixed or sticky top header
- a full-width content area below
- optional footer at the bottom
- vertical stacking of sections

Conceptual example:

\`\`\`txt
[        HEADER / NAVBAR              ]
[                                     ]
[        HERO / BANNER                ]
[                                     ]
[        CONTENT SECTION 1            ]
[                                     ]
[        CONTENT SECTION 2            ]
[                                     ]
[        FOOTER                       ]
\`\`\`

---

# Mandatory Characteristics

## 1. Persistent Top Header

The header must always be visible or easily accessible.

The header should:

- span the full width of the viewport
- contain the logo or brand identity on the left
- contain primary navigation links
- optionally include utility actions on the right (search, profile, CTA)
- maintain a consistent height

Common header patterns:

- fixed at the top (remains visible on scroll)
- sticky (becomes fixed after scrolling past it)
- static (scrolls with the page)

---

## 2. Full-Width Content Area

The content area below the header should utilize the full available width.

This area should:

- use a max-width container for readability
- center content horizontally
- allow flexible section layouts within it
- support hero banners, grids, text blocks, media, and cards

---

## 3. Linear Vertical Flow

Content should stack vertically in a logical reading order.

The page should read top-to-bottom with clear:

- section breaks
- visual separators (spacing, background changes, or dividers)
- content grouping
- progressive disclosure of information

---

## 4. Visual Hierarchy Through Sections

Each section should have a distinct visual identity.

Techniques:

- alternating background colors
- varying content density
- different section heights
- typographic scale changes
- whitespace variation between sections

---

## 5. Consistent Spacing

Standard layouts rely on rhythm and repetition.

Use:

- consistent vertical spacing between sections
- uniform horizontal padding
- aligned content within the max-width container
- predictable gutters

Avoid irregular or inconsistent spacing between sections.

---

# Recommended Structure

\`\`\`txt
PAGE
 ├── Header
 │    ├── Logo
 │    ├── Navigation
 │    └── Utility Actions
 ├── Hero Section
 ├── Content Section (features, cards, text)
 ├── Content Section (testimonials, stats)
 ├── Content Section (CTA, newsletter)
 └── Footer
      ├── Links
      ├── Social
      └── Legal
\`\`\`

---

# Responsiveness

## Desktop

- full-width header with horizontal navigation
- centered content container (max-width 1200px–1440px)
- multi-column content sections where appropriate
- generous whitespace

## Tablet

- header may collapse navigation into a hamburger menu
- content sections reduce columns
- maintain readable line lengths
- adjust section padding

## Mobile

- hamburger or drawer navigation
- single-column content stacking
- full-width sections
- touch-friendly tap targets
- reduced padding but maintained spacing rhythm

---

# Header Composition Rules

## Use:

- clear brand placement (logo left)
- horizontal navigation links (desktop)
- utility actions grouped on the right
- subtle bottom border or shadow for separation
- consistent height (56px–80px)
- high contrast for readability

## Avoid:

- overcrowded headers with too many items
- multiple navigation rows (keep it single-level)
- excessive decoration or heavy backgrounds
- navigation that competes with content
- inconsistent alignment between header elements

---

# Content Section Types

## Hero Section

The first visual element below the header.

Characteristics:

- large visual impact
- strong headline and subheadline
- primary CTA button
- optional background image or gradient
- full-width or contained within max-width

---

## Feature Section

Presents key features or benefits.

May contain:

- icon + title + description cards
- 2–4 column grid
- alternating icon-text layouts

---

## Stats Section

Displays metrics or social proof.

Examples:

- numbers with labels
- animated counters
- comparison data
- achievement highlights

---

## Testimonial Section

Social proof through user feedback.

May contain:

- quote cards
- avatar + name + role
- carousel or grid layout

---

## CTA Section

Conversion-focused block.

Purpose:

- drive specific user action
- prominent button(s)
- clear value proposition
- contrasting background for emphasis

---

## Footer

Closing section of the page.

Contains:

- navigation links (grouped by category)
- social media icons
- legal information (copyright, privacy, terms)
- optional newsletter signup
- brand logo repetition

---

# Visual Style

Standard layouts commonly use:

- clean sans-serif typography
- generous line heights
- subtle section dividers
- consistent color palette
- high-contrast text
- balanced whitespace
- minimal decorative elements
- professional photography or illustrations
- clear button styles
- predictable interaction patterns

---

# Mental Model

A Standard layout should feel like a combination of:

- corporate website
- product landing page
- professional blog
- SaaS homepage
- editorial publication

---

# Visual Rhythm

The layout should alternate between:

- dense and airy sections
- light and dark backgrounds
- text-heavy and media-heavy sections
- wide and constrained content areas

This rhythm creates flow and prevents monotony.

---

# Recommended Proportions

Common examples:

| Element | Specification |
|---|---|
| Header height | 56px–80px |
| Max content width | 1200px–1440px |
| Section vertical padding | 64px–120px |
| Hero height | 400px–600px or viewport-relative |
| Footer height | flexible, 200px–400px |

---

# Recommended Semantic Structure

Each section may define:

\\\json
{
  "type": "hero",
  "importance": "high",
  "fullWidth": true,
  "background": "gradient"
}
\\\

---

# Expected Visual Feeling

The design should communicate:

- professionalism
- trustworthiness
- clarity
- accessibility
- content-focused
- modern simplicity
- institutional quality

---
---

# Summary

Standard Design is a composition system based on:

- persistent top header navigation
- full-width content areas
- linear vertical flow
- clear section separation
- consistent spacing rhythm
- professional visual hierarchy
- responsive adaptability

The primary goal is to create a clean, familiar, content-first experience that users can navigate effortlessly.

`