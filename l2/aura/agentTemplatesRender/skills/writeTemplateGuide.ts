/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/writeTemplateGuide.ts" enhancement="_blank"/>

// Skill for agentTplWriteTemplate: write a REUSABLE template guide (.md) for a style model.
// The canonical example (salesforceStyle/inventoryControl) is embedded so there is no runtime
// dependency on _102020_/l4/collabux.

export const skill = `
# CollabUX · Write a reusable TEMPLATE guide (.md)

Produce a Markdown guide that tells a page generator HOW to build pages of a given SHAPE in a given
STYLE. It is a GUIDE, not a page: it must be reusable across projects.

## Hard rules (scope)
- NO project-specific detail: no project ids, page ids, routes, seed data, concrete BFF/operation names,
  screenshots, or generated implementation code. Generalize from the evidence.
- Describe the interaction pattern of the style (regions, actions, states). Never reference logos, brand
  colors, proprietary icons, or extracted CSS/HTML.
- Keep BFF/backend names OUT of the visible UI it prescribes; labels are business-language.

## Required sections (mirror this structure)
1. **Title + one-line intent** — what shape of workspace this template serves.
2. **Input shape** — the L4 workspace this template expects (e.g. a paginated list query returning an item
   array + total; an entity; commands like create/update/delete/adjust; optional boolean signals).
3. **Classification** — a fenced block:
   \`\`\`ts
   uxClassification: { family: "<enterpriseSaas|...>", style: "<styleModel>", template: "<templateId>", layout: "<patternLabel>" }
   \`\`\`
4. **Page structure** — the regions, in order/hierarchy (e.g. object header; summary/KPI strip; list/grid
   card with filter toolbar + footer pagination; record/detail panel). Describe each region's job.
5. **Region → L4 mapping rules** — generic rules for mapping title/purpose/primary query/commands/filters
   into the regions (by ROLE, not by concrete names).
6. **Flow rules** — create / edit / contextual action / destructive action; where each lives; how selection
   drives the detail panel; how commands give feedback.
7. **Empty / loading / error / validation states** — what to show for each.
8. **Labels policy** — business labels in the app language; NEVER expose raw BFF names, \`page\`, or
   \`pageSize\`; pagination lives in the grid footer, not the top filter row.
9. **Acceptance criteria** — a short, VERIFIABLE checklist (these become the critique's checklist).

## Reference example (salesforceStyle / inventoryControl) — imitate the FORM, not the content
\`\`\`md
# Inventory Control Template
Use for inventory/stock-management workspaces across client projects.
## Input shape
- one paginated query returning an item array and a total count;
- an entity representing a stock/inventory item/SKU/material;
- optional boolean alert field (e.g. isLowStock);
- commands for create, update, delete, optionally adjustment/movement.
## Classification
uxClassification: { family: "enterpriseSaas", style: "salesforceStyle", template: "inventoryControl", layout: "listViewWithRecordPanel" }
## Page structure
Object Header (module eyebrow, title, purpose, primary action)
Summary Strip (total items, low-stock count, optional last updated)
List View Card (title + count, search/filter toolbar, data grid, FOOTER pagination)
Record Panel (selected item summary, editable details, adjustment action, destructive action separated)
## Region → L4 mapping rules
- Object header title/purpose ← workspace.title/purpose; primary action ← the create command.
- Grid rows ← the paginated query's item array; grid count ← its total field.
- Search filter ← the query's string filter; boolean pill ← a boolean filter.
- Row edit ← the update command; adjustment ← the adjustment command; danger ← the delete command.
## Flow rules
- Primary header action opens the record panel in CREATE mode; required fields visibly marked.
- Selecting a row opens the panel; save/cancel live in the panel footer; delete separated as danger.
## States
- loading: skeleton rows; empty: short message + primary create; query error: retry in the card;
  validation: field-level errors + one concise page alert.
## Labels policy
- Business labels in the app language; never show listX/editX/page/pageSize; pagination in the footer.
## Acceptance criteria
- Top filter row has no raw pagination fields; footer has pagination.
- Primary action creates; edit happens in the record panel; delete is a separated destructive action.
- Alert/threshold info visible without row expansion; validation visible and actionable.
\`\`\`

Return ONLY the complete Markdown file for the requested templateId (generalized to the workspace shape
you were given), via the submit tool.
`;
