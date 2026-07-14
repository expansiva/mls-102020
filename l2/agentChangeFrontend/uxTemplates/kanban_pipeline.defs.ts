/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/kanban_pipeline.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const kanbanPipelineTemplate = {
  id: "kanban_pipeline",
  title: "Kanban Pipeline",
  version: 1,
  tags: ["workflow", "kanban", "pipeline", "status"],
  description: "Column-based board for work items that move between well-defined lifecycle stages.",
  userJourney: "User scans columns by status, identifies bottlenecks, opens a card for context and moves or advances cards through allowed transitions.",
  appliesWhen: {
    workspaceKinds: ["workflow"],
    accessPatterns: ["board", "queue", "list"],
    selection: ["single"],
    operationKinds: ["query", "transition", "update"],
    requiredSignals: ["finite lifecycle states", "items grouped by status"],
    optionalSignals: ["drag transition", "assignee", "priority"]
  },
  rejectsWhen: [
    "There are fewer than three meaningful lifecycle states.",
    "The workflow must be processed strictly as a FIFO queue.",
    "The output is too dense for card summaries.",
    "Bulk table editing is the main task."
  ],
  slots: {
    primarySurface: "statusBoard",
    secondarySurfaces: ["cardDetail", "laneMetrics"],
    toolbarActions: ["refresh", "filter"],
    rowActions: ["transition", "update"],
    bulkActions: [],
    confirmationActions: [],
    contextualInputs: ["selectedEntity"],
    hiddenInputs: ["technicalId"],
    navigationTargets: ["cardDetail"],
    actionPresentation: {
      query: "toolbar",
      transition: "rowAction",
      update: "drawer"
    }
  },
  layoutGuidance: [
    "Create one lane per lifecycle state or grouped status.",
    "Cards should show identity, status, owner and the next important field.",
    "Transitions must respect allowed lifecycle movement from L4.",
    "Do not use this template for simple CRUD."
  ],
  llmGuidance: [
    "Emphasize flow and bottlenecks.",
    "Use card summaries instead of full field dumps.",
    "Keep transition actions contextual to the selected card.",
    "Represent drag-and-drop only as a semantic enhancement, not a requirement for every renderer.",
    "Microcopy example: subtitle 'Move opportunities through the sales stages', action 'Advance opportunity', empty state 'Add an opportunity to start the pipeline'."
  ],
  wiring: {
    minimumStates: ["selectedId", "loading", "mutationFeedback"],
    transitions: ["rowSelect->selectedId->prepopulateDraft", "submit->textualFeedback->refresh->clearFormAndSelection"],
    microcopy: { actionLabels: "domainAction", emptyState: "nextStep", mutationFeedback: "textualDismissible" }
  },
  validationChecks: [
    { id: "has-board" },
    { id: "has-selection-context" },
    { id: "has-row-action-context" }
  ],
  exampleUseCases: [
    "Sales opportunity pipeline.",
    "Ticket workflow board.",
    "Hiring candidate stages.",
    "Production task board."
  ]
} as const satisfies UxTemplateDefinition;

export default kanbanPipelineTemplate;
