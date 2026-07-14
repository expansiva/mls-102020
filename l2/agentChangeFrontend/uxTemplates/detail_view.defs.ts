/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/detail_view.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const detailViewTemplate = {
  id: "detail_view",
  title: "Detail View",
  version: 1,
  tags: ["detail", "read", "history", "actions"],
  description: "Dedicated record detail screen with key fields, related data, history and contextual actions.",
  userJourney: "User opens a specific record from another screen, reviews the complete information, checks history or related data, and performs allowed contextual actions.",
  appliesWhen: {
    workspaceKinds: ["detail", "entityManagement"],
    accessPatterns: ["detail"],
    selection: ["single"],
    operationKinds: ["view", "update", "delete", "command"],
    requiredSignals: ["selected entity or route entity id"],
    optionalSignals: ["history", "audit trail", "related records", "attachments"]
  },
  rejectsWhen: [
    "There is no selected or routed entity.",
    "The page is only a create form.",
    "The primary task is scanning a large list.",
    "The entity has no meaningful detail beyond list columns."
  ],
  slots: {
    primarySurface: "recordSummary",
    secondarySurfaces: ["detailSections", "historyTimeline", "relatedRecords", "actionPanel"],
    toolbarActions: ["update"],
    rowActions: [],
    bulkActions: [],
    confirmationActions: ["delete"],
    contextualInputs: ["selectedEntity", "routeParam"],
    hiddenInputs: ["technicalId"],
    navigationTargets: ["backToList"],
    actionPresentation: {
      view: "inline",
      update: "drawer",
      delete: "confirmation",
      command: "toolbar"
    }
  },
  layoutGuidance: [
    "Start with the record identity and current status.",
    "Group secondary information into compact detail sections.",
    "Use history/timeline only when there is an event-like output.",
    "Keep contextual actions visible but not dominant."
  ],
  llmGuidance: [
    "Design the page as a record profile.",
    "Do not repeat list filters.",
    "Use read-only detail fields unless an edit action is active.",
    "Preserve traceability to the selected entity.",
    "Microcopy example: subtitle 'Review order details and history', action 'Update order', empty state 'Return to the list and select an order'."
  ],
  wiring: {
    minimumStates: ["selectedId", "formDraft", "loading", "mutationFeedback"],
    transitions: ["rowSelect->selectedId->prepopulateDraft", "submit->textualFeedback->refresh->clearFormAndSelection"],
    microcopy: { actionLabels: "domainAction", emptyState: "nextStep", mutationFeedback: "textualDismissible" }
  },
  validationChecks: [
    { id: "has-detail-surface" },
    { id: "has-selection-context" }
  ],
  exampleUseCases: [
    "Customer profile.",
    "Order detail.",
    "Ticket detail.",
    "Invoice detail."
  ]
} as const satisfies UxTemplateDefinition;

export default detailViewTemplate;
