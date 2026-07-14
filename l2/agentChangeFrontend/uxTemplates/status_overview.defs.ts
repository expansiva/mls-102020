/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/status_overview.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const statusOverviewTemplate = {
  id: "status_overview",
  title: "Status Overview",
  version: 1,
  tags: ["dashboard", "status", "metrics", "operations"],
  description: "Real-time overview with key metrics, status groups and quick actions for operational monitoring.",
  userJourney: "User lands on a status dashboard, checks summary cards, drills into a status group, and performs quick contextual actions when an item needs attention.",
  appliesWhen: {
    workspaceKinds: ["dashboard", "workflow", "adjustment"],
    accessPatterns: ["dashboard", "list", "queue"],
    selection: ["none", "single"],
    operationKinds: ["query", "view", "update", "adjust", "transition"],
    requiredSignals: ["status or metric output"],
    optionalSignals: ["low stock alert", "active shift", "real-time queue", "threshold"]
  },
  rejectsWhen: [
    "There are no aggregate metrics or status fields.",
    "The screen is primarily a data-entry form.",
    "The user must edit many records in a table.",
    "The workflow is a report with date-range export as the main task."
  ],
  slots: {
    primarySurface: "metricOverview",
    secondarySurfaces: ["statusGroups", "attentionList", "quickActions"],
    toolbarActions: ["refresh", "filter"],
    rowActions: ["view", "update", "adjust", "transition"],
    bulkActions: [],
    confirmationActions: [],
    contextualInputs: ["activeLifecycleInstance", "selectedEntity"],
    hiddenInputs: ["technicalId"],
    navigationTargets: ["drillDown"],
    actionPresentation: {
      query: "toolbar",
      view: "rowAction",
      update: "drawer",
      adjust: "drawer",
      transition: "rowAction"
    }
  },
  layoutGuidance: [
    "Start with metrics that answer the user's monitoring question.",
    "Use status groups or alert lists for actionable records.",
    "Do not show raw CRUD forms as the primary experience.",
    "Keep quick actions attached to the affected item or status group."
  ],
  llmGuidance: [
    "Design for at-a-glance comprehension.",
    "Prefer summary cards, compact lists and highlighted exceptions.",
    "Use dashboard visuals only when backed by real fields or aggregate outputs.",
    "Surface active context such as current shift without making the user type it.",
    "Microcopy example: subtitle 'Monitor the active shift and exceptions', action 'Close shift', empty state 'Open a shift to start monitoring operations'."
  ],
  wiring: {
    minimumStates: ["selectedId", "loading", "mutationFeedback"],
    transitions: ["rowSelect->selectedId->prepopulateDraft", "submit->textualFeedback->refresh->clearFormAndSelection"],
    microcopy: { actionLabels: "domainAction", emptyState: "nextStep", mutationFeedback: "textualDismissible" }
  },
  validationChecks: [
    { id: "has-status-group" },
    { id: "has-selection-context" }
  ],
  exampleUseCases: [
    "Manager shift dashboard.",
    "Stock level alert overview.",
    "Live table occupancy status.",
    "Operations health monitor."
  ]
} as const satisfies UxTemplateDefinition;

export default statusOverviewTemplate;
