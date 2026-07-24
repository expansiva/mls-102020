/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/classifyWorkspaces.ts" enhancement="_blank"/>

// Skill for agentTplPlan: classify L4 workspaces into a reusable template set for the chosen style.
// Self-contained (no runtime dependency on _102020_/l4): the known-style families are embedded here.

export const skill = `
# CollabUX · Planner — classify workspaces into a reusable TEMPLATE set

You receive the module's L4 workspaces and a requested STYLE MODEL (a family of interaction/organization,
e.g. salesforceStyle). Decide the set of reusable UX TEMPLATES that will guide page generation. A template
is a GUIDE (how to organize elements, which regions, which flows) — NOT a page. Many pages should share
one template (dedup). Reuse an already-existing template instead of proposing a new one.

## What a template captures (why several pages share one)
A template is chosen by the SHAPE of the workspace, not its domain:
- entity + kind (operation/workflow/analytics/wizard…);
- BFF calls: a paginated list query? a single object query? commands (create/update/delete/adjust)?
- sections/organisms roles (primarySurface, filterControl, contextualAction, detail…);
- the actor's primary goal and density.
Two workspaces with the same shape (e.g. "paginated list + row commands + detail") take the SAME template.

## Style families (interaction patterns — never logos/assets/pixel copies)
- salesforceStyle — CRM, records with history, commercial dashboards, record workspace. Patterns: record
  panel, contextual actions, tabs/sections, summary cards, entity-oriented navigation.
- dynamicsStyle — backoffice, ERP/CRM, command bar, admin forms, grids with actions. Patterns: command
  bar, list + panel, grouped actions, structured forms.
- oracleStyle — ERP, dense admin ops, tables + filters, financial/operational screens. Patterns: high
  density, strong filters, robust tables, operational efficiency.
- sapFioriStyle — enterprise processes, object pages, overview pages, guided flows. Patterns: informative
  header, cards sections, object detail, step flow.
- squarePosStyle — POS, retail, fast service, tablet/touch. Patterns: big buttons, visual catalog, side
  cart, fast flow.
- jiraBoardStyle — queues, states, kanban, status-driven ops. Patterns: columns, cards, quick status
  actions, work-in-progress focus.
- powerBiStyle — dashboards, KPIs, analysis, insights. Patterns: KPIs, cards, global filters, charts.
Respect the requested style; pick templateIds and layouts that express it. Do NOT authorize logos, asset
copies, pixel-perfect reproduction, extracted CSS/HTML, or reverse engineering.

## Naming
- templateId: camelCase, semantic, reusable across projects (e.g. inventoryControl, recordCatalog,
  operationsQueueBoard, processWizard, insightCommandCenter). Never a project/page-specific name.
- layout: a short pattern label (e.g. listViewWithRecordPanel, dashboard, splitDetail, wizard, workQueue).

## Rules
- Cover EVERY workspace: each page must belong to exactly one template.
- Prefer FEW templates (aggressive dedup) — reuse the same template for same-shape pages.
- If an existing template (listed as "Existing templates") already fits a page's shape, set status:"existing"
  and DO NOT create a new one; put those pages under that existing templateId.
- Only propose status:"new" when no existing template fits.

## Output format (JSON only — no prose, no fences)
Return exactly:
{"type":"flexible","result":{"templates":[
  {"templateId":"<camelCase>","status":"new"|"existing","layout":"<patternLabel>","pages":["<pageId>",...],"rationale":"<why: kind/entity/bffCalls/sections>"}
]}}
Every page from the input MUST appear in exactly one template's "pages".
`;
