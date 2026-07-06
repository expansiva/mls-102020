/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/tabular_classic.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const tabularClassicTemplate = {
  id: "tabular_classic",
  title: "Tabular Classic",
  version: 1,
  tags: ["list", "crud", "entityManagement", "desktop"],
  description: "Standard table interface with filters, a primary add action, row selection and contextual edit/delete actions.",
  userJourney: "User lands on a full table view, scans or filters the records, clicks a row action to edit or delete, and uses a prominent Add button to create a new record.",
  appliesWhen: {
    workspaceKinds: ["entityManagement"],
    accessPatterns: ["list"],
    selection: ["single"],
    operationKinds: ["query", "create", "update", "delete"],
    requiredSignals: ["query operation with list output", "stable selection key"],
    optionalSignals: ["create command", "update command", "delete command"]
  },
  rejectsWhen: [
    "There is no list or query operation.",
    "There is no stable key for row selection.",
    "The primary user task is spatial, calendar-based or queue-based.",
    "The workflow requires multi-step approval before any row action."
  ],
  slots: {
    primarySurface: "queryList",
    secondarySurfaces: ["emptyState", "selectionSummary"],
    toolbarActions: ["create"],
    rowActions: ["update", "delete"],
    bulkActions: [],
    confirmationActions: ["delete"],
    contextualInputs: ["selectedEntity"],
    hiddenInputs: ["technicalId"],
    navigationTargets: [],
    actionPresentation: {
      query: "toolbar",
      create: "drawer",
      update: "drawer",
      delete: "confirmation"
    }
  },
  layoutGuidance: [
    "Render one main list, not one visible section per operation.",
    "Use accessPattern.filters for default filters instead of every entity field.",
    "Place create as the primary toolbar action.",
    "Place update and delete as row actions that use selectedEntity context.",
    "Do not expose technical identifiers as editable fields."
  ],
  llmGuidance: [
    "Make the table the dominant surface.",
    "Keep forms hidden until the user creates or edits a record.",
    "Use concise column labels and hide audit timestamps unless they are relevant to the task.",
    "Treat destructive actions as confirmations, not full forms."
  ],
  validationChecks: [
    "The page has exactly one primary list.",
    "Create is reachable from the toolbar.",
    "Update and delete are reachable from row actions.",
    "Inputs sourced from selectedEntity are not rendered as manual fields.",
    "Delete asks for confirmation before submitting."
  ],
  exampleUseCases: [
    "Manage restaurant tables.",
    "Manage menu items.",
    "Manage stock items.",
    "Manage customers or suppliers."
  ]
} as const satisfies UxTemplateDefinition;

export default tabularClassicTemplate;

