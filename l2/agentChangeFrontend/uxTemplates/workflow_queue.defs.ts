/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/workflow_queue.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const workflowQueueTemplate = {
  id: "workflow_queue",
  title: "Workflow Queue",
  version: 1,
  tags: ["workflow", "queue", "operations", "status"],
  description: "Operational queue for work items that move through statuses and require quick contextual transitions.",
  userJourney: "User opens a live queue, sees prioritized items by status, selects an item, performs the next valid transition and watches the item move or update.",
  appliesWhen: {
    workspaceKinds: ["workflow"],
    accessPatterns: ["queue", "list"],
    selection: ["single"],
    operationKinds: ["query", "transition", "update", "command"],
    requiredSignals: ["status field or lifecycle states", "query/list of work items"],
    optionalSignals: ["priority", "assigned actor", "next transition"]
  },
  rejectsWhen: [
    "There is no status or lifecycle concept.",
    "The user task is pure entity administration.",
    "The main output is a static report.",
    "The workflow is spatial or calendar-based."
  ],
  slots: {
    primarySurface: "queueList",
    secondarySurfaces: ["statusBuckets", "selectedWorkItem", "nextActions"],
    toolbarActions: ["refresh"],
    rowActions: ["transition", "update"],
    bulkActions: [],
    confirmationActions: [],
    contextualInputs: ["selectedEntity", "activeLifecycleInstance"],
    hiddenInputs: ["technicalId"],
    navigationTargets: [],
    actionPresentation: {
      query: "toolbar",
      transition: "rowAction",
      update: "drawer",
      command: "rowAction"
    }
  },
  layoutGuidance: [
    "Represent the current work queue before command forms.",
    "Show item status, priority and next allowed action.",
    "Do not render every transition as a separate always-visible form.",
    "Use selectedEntity or activeLifecycleInstance for transition inputs."
  ],
  llmGuidance: [
    "Design for speed and operational clarity.",
    "Make stale/loading states visible.",
    "Group queue items by status when the lifecycle has clear stages.",
    "Keep the next action close to the selected work item.",
    "Microcopy example: subtitle 'Handle orders awaiting preparation', action 'Start preparation', empty state 'New orders will appear here when received'."
  ],
  wiring: {
    minimumStates: ["selectedId", "loading", "mutationFeedback"],
    transitions: ["rowSelect->selectedId->prepopulateDraft", "submit->textualFeedback->refresh->clearFormAndSelection"],
    microcopy: { actionLabels: "domainAction", emptyState: "nextStep", mutationFeedback: "textualDismissible" }
  },
  validationChecks: [
    { id: "has-workflow-status" },
    { id: "has-selection-context" },
    { id: "has-row-action-context" },
    { id: "has-refresh" }
  ],
  exampleUseCases: [
    "Kitchen ticket queue.",
    "Support ticket triage.",
    "Order fulfillment queue.",
    "Approval inbox."
  ]
} as const satisfies UxTemplateDefinition;

export default workflowQueueTemplate;
