/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/bulk_actions.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const bulkActionsTemplate = {
  id: "bulk_actions",
  title: "Bulk Actions",
  version: 1,
  tags: ["list", "advanced", "bulk", "table"],
  description: "Advanced list interface with multi-select, batch operations and confirmation flows.",
  userJourney: "User filters a large list, selects multiple records, reviews the selected set, applies a bulk action and confirms the effect before submission.",
  appliesWhen: {
    workspaceKinds: ["entityManagement", "workflow"],
    accessPatterns: ["list"],
    selection: ["multiple"],
    operationKinds: ["query", "update", "delete", "command", "transition"],
    requiredSignals: ["multiple selection", "bulk-compatible command"],
    optionalSignals: ["bulk status change", "bulk delete", "batch assignment"]
  },
  rejectsWhen: [
    "The L4 access pattern only supports single selection.",
    "There is no bulk-compatible command.",
    "The user task is simple CRUD for a small list.",
    "The workflow action needs item-by-item review."
  ],
  slots: {
    primarySurface: "selectableList",
    secondarySurfaces: ["bulkToolbar", "selectionSummary", "bulkConfirmation"],
    toolbarActions: ["filter"],
    rowActions: ["view"],
    bulkActions: ["bulkUpdate", "bulkDelete", "bulkTransition", "bulkCommand"],
    confirmationActions: ["bulkDelete", "bulkUpdate", "bulkTransition", "bulkCommand"],
    contextualInputs: ["selectedEntities"],
    hiddenInputs: ["technicalIds"],
    navigationTargets: [],
    actionPresentation: {
      query: "toolbar",
      update: "bulkAction",
      delete: "confirmation",
      command: "bulkAction",
      transition: "bulkAction"
    }
  },
  layoutGuidance: [
    "Only enable bulk actions after at least one selection.",
    "Show selected count and affected records summary.",
    "Require confirmation for destructive or broad changes.",
    "Do not use this template when selection is single."
  ],
  llmGuidance: [
    "Design for careful batch operations.",
    "Make scope and consequences visible.",
    "Avoid accidental destructive actions.",
    "Keep per-row actions secondary to the bulk toolbar.",
    "Microcopy example: subtitle 'Apply a status to selected stock items', action 'Activate selected items', empty state 'Select at least one item to continue'."
  ],
  wiring: {
    minimumStates: ["selectedId", "formDraft", "loading", "mutationFeedback"],
    transitions: ["rowSelect->selectedId->prepopulateDraft", "submit->textualFeedback->refresh->clearFormAndSelection"],
    microcopy: { actionLabels: "domainAction", emptyState: "nextStep", mutationFeedback: "textualDismissible" }
  },
  validationChecks: [
    { id: "has-list" },
    { id: "has-bulk-selection" },
    { id: "has-destructive-confirmation" }
  ],
  exampleUseCases: [
    "Bulk activate or deactivate users.",
    "Bulk update stock item status.",
    "Bulk assign tickets.",
    "Bulk archive records."
  ]
} as const satisfies UxTemplateDefinition;

export default bulkActionsTemplate;
