---
name: salesforce-style
description: Generate enterprise SaaS pages inspired by Salesforce Lightning patterns from collab.codes L4 workspace definitions. Use when a page31 generator or UX enrichment agent must transform an L4 workspace into a cleaner object/list/detail UI with object headers, list views, compact filters, record panels, safe actions, validation states, and grid footer pagination.
---

# Salesforce Style Page Generator

Use this CollabUX product skill to turn an L4 workspace definition into a Salesforce Lightning-inspired page design for generated `page31` frontend code.

This is a style/template guide, not a request to copy Salesforce assets. Do not use Salesforce logos, proprietary icons, exact brand colors, or branded text. Reuse the interaction pattern: object workspace, list view, compact actions, record detail, clear status, and safe command placement.

## Workflow

1. Read the L4 workspace definition.
2. Classify the workspace using entity, kind, BFF calls, sections, and operations.
3. Select the matching template folder.
4. Generate or validate the page using the template rules.
5. Keep backend/BFF names out of the visible UI.
6. Put pagination in the grid footer, not in the top filter row.
7. Prefer safe, contextual actions over large scattered command forms.

## Template selection

- Use `inventoryControl/` when the workspace manages stock/inventory items, has a paginated list query, has low-stock or threshold signals, and includes commands such as create, update, delete, or stock adjustment.

## Product structure

- Generic style and template definitions live under `mls-102020/l4/collabux/templates/`.
- Project-specific mappings, screenshots, and generated examples live under `mls-102020/l4/collabux/examples/`.
- Client project folders such as `mls-102051` are generation inputs or outputs, not the canonical home for CollabUX templates.

If no specific folder matches, stop and ask for a new classification/template instead of forcing an unrelated layout.

## Global layout rules

- Use an object header at the top of the content area:
  - eyebrow/module name;
  - page title;
  - short purpose;
  - primary action on the right.
- Use compact KPI cards only when the workspace exposes count, status, threshold, or alert fields.
- Use a filter/search toolbar above the grid, but keep pagination controls in the grid footer.
- Use a primary list/grid as the main working surface.
- Use a right-side record panel for selected item details and edit/create forms when the screen is list-centric.
- Use row-level actions for contextual commands.
- Use danger styling only for destructive actions.
- Render validation errors next to the relevant field and show one concise page-level message.

## Output expectation

The generated page should feel like a production SaaS admin screen:

- readable hierarchy;
- fewer exposed technical controls;
- obvious primary action;
- contextual secondary actions;
- predictable table behavior;
- clear empty/loading/error/validation states.
