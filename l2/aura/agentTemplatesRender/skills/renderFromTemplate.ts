/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/renderFromTemplate.ts" enhancement="_blank"/>

// Skill for agentTplRender: materialize the page .ts from the .defs, following the TEMPLATE page
// structure. Tailwind (layout) + design-system tokens (colors). NO molecules (v1). Adapts mode6 render.

export const skill = `
# CollabUX · Render the page .ts (template-guided, Tailwind + Design System)

Implement the .defs uiSpec as the page .ts, LAID OUT according to the TEMPLATE's page structure. Colors
come from the DESIGN SYSTEM tokens; layout/spacing from Tailwind. NO web components / molecules in v1.

## You receive
- Definition: brief + businessRules + uiSpec (fields/display/collections/metrics/actions/feedback/layout/a11y).
- The TEMPLATE.md — its page structure (regions, order, flow rules) is the LAYOUT you must follow.
- The shared (base class, @property, handlers, actions, this.msg, DTO types) and all contracts.
- designSystem.ts — token vocabulary (names only; apply via var(--token, fallback)).

## Follow the TEMPLATE structure
- Lay out the regions in the template's order/hierarchy (e.g. object header → summary strip → list card
  with filter toolbar + FOOTER pagination → record/detail panel). Fill each region from the uiSpec.
- Honor the template's flow rules: primary action creates; edit in the detail/record panel; destructive
  action visually separated; selection drives the detail panel. Pagination in the grid footer.

## Implement the uiSpec (same rigor as a full render)
- Controls with label/placeholder/help; masks/format on display; validation (required, min/max, pattern,
  step); closed sets → <select> with the uiSpec options, bound to the real setter.
- Formatted display (BRL, date pt-BR, boolean ✓/—, status badge). Per-action feedback (loading/disabled,
  success, error with state, empty state). Text via this.msg when the key exists, else literal.

## STYLE = Tailwind (layout) + DESIGN SYSTEM (colors)
- Layout/structure: Tailwind utility classes (grid/flex/gap/p-*/rounded-*/shadow/etc.). No semantic CSS
  classes without a stylesheet and no inline style= (except dynamic values). The runtime only has Tailwind.
- Colors: ONLY design-system tokens via Tailwind arbitrary values with a neutral fallback INSIDE var():
  bg-[var(--surface-bg,#ffffff)], text-[var(--text-default,#0f172a)], text-[var(--text-muted,#5d6b7e)],
  border-[var(--border-default,#cfd8e3)], bg-[var(--page-bg,#eef1f5)], bg-[var(--surface-alt-bg,#f5f7fa)],
  primary action bg-[var(--button-primary-bg,#1273d4)] text-[var(--button-primary-text,#ffffff)],
  status bg-[var(--status-success-bg,#dcfce7)] text-[var(--status-success-text,#166534)] and
  bg-[var(--status-error-bg,#fee2e2)] text-[var(--status-error-text,#991b1b)].
- Use ONLY token names that exist in designSystem.ts (base tokens have -hover/-focus/-disabled variants).
  Always include the neutral fallback inside var(). Do NOT hardcode palette (#hex alone / bg-slate-500)
  for surfaces/text/borders/actions/status. Colorless structural utilities (shadow/ring/spacing) are free.
- Dark mode is the DS variables' job (the shell swaps the theme) — do NOT add dark: on tokenized colors.

## Technical contract (non-negotiable)
- MLS header of the outputPath (enhancement="_102020_/l2/enhancementAura"); import { html } from 'lit';
  import { customElement } from 'lit/decorators.js'; base class + DTO types (import type) from the page's
  shared (/_{project}_/l2/{module}/web/shared/{page}.js).
- @customElement tag = the componentTag convention for {module}/web/{device}/{genome} + page shortName
  (BREAK camelCase into kebab; e.g. reservationManagement → reservation-management). Class
  {ModulePascal}{DevicePascal}{GenomePascal}{PagePascal}Page. ONLY a render() method.
- Only the shared surface; selection via setter; read data by outputShape + contract fields. No new
  @property/setState/molecules. Masks/validation/format live in render.

## Self-check (before finishing)
- Every template region present, in order; flow rules honored; footer pagination.
- uiSpec fully implemented (control/mask/validation/feedback/layout) bound to REAL handlers/state; no dead
  control; no invented data; all scenarios covered.
- Colors ALL via var(--token,fallback) of real designSystem.ts names; nothing hardcoded on surfaces/text/
  borders/actions/status. Layout in Tailwind. Must compile under tsc strict.

Return ONLY the complete .ts via the submitGeneratedTs tool.
`;
