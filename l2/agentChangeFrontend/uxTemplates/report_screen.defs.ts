/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/report_screen.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const reportScreenTemplate = {
  id: "report_screen",
  title: "Report Screen",
  version: 1,
  tags: ["report", "analytics", "export", "read"],
  description: "Analytics and reporting screen with filters, generated results, summaries and optional export actions.",
  userJourney: "User chooses filters and a date range, generates the report, reviews summary metrics and detailed rows, then exports or shares the result if available.",
  appliesWhen: {
    workspaceKinds: ["report", "dashboard"],
    accessPatterns: ["report", "dashboard", "list"],
    selection: ["none", "single"],
    operationKinds: ["query", "report", "command"],
    requiredSignals: ["report generation or aggregate query"],
    optionalSignals: ["date range", "export command", "summary metrics", "grouped rows"]
  },
  rejectsWhen: [
    "The page's main task is create/update/delete.",
    "There are no aggregate outputs or report semantics.",
    "The operation only returns a normal entity list for administration.",
    "The user must process live queue items."
  ],
  slots: {
    primarySurface: "reportResults",
    secondarySurfaces: ["filterPanel", "summaryMetrics", "detailRows", "exportActions"],
    toolbarActions: ["generate", "export"],
    rowActions: ["view"],
    bulkActions: [],
    confirmationActions: [],
    contextualInputs: ["currentWorkspace", "activeLifecycleInstance"],
    hiddenInputs: [],
    navigationTargets: ["drillDown"],
    actionPresentation: {
      query: "toolbar",
      report: "toolbar",
      command: "toolbar",
      view: "rowAction"
    }
  },
  layoutGuidance: [
    "Put filters before results but keep them compact.",
    "Show summary metrics above detailed rows.",
    "Use export actions only when a matching operation exists.",
    "Do not add edit/delete actions unless the report explicitly supports them."
  ],
  llmGuidance: [
    "Design for analysis, not data maintenance.",
    "Use date ranges and grouping only if they are present in the contract or L4 story.",
    "Separate report generation from normal list refresh when both exist.",
    "Keep report output read-only by default."
  ],
  validationChecks: [
    "The page has report or aggregate semantics.",
    "Export action maps to a real command if shown.",
    "No unsupported CRUD actions are introduced.",
    "Date range filters are business filters, not audit timestamps."
  ],
  exampleUseCases: [
    "Shift closing report.",
    "Sales report.",
    "Stock movement report.",
    "Occupancy analytics."
  ]
} as const satisfies UxTemplateDefinition;

export default reportScreenTemplate;

