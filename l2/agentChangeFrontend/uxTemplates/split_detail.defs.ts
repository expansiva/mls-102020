/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/split_detail.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const splitDetailTemplate = {
  id: "split_detail",
  title: "Split Detail",
  version: 1,
  tags: ["list", "detail", "crud", "desktop"],
  description: "Master-detail workspace with a persistent list and a side panel for details, edit forms and contextual actions.",
  userJourney: "User reviews a list on the left, selects an item, sees details on the right, edits fields in context or starts a new item without losing the list.",
  appliesWhen: {
    workspaceKinds: ["entityManagement", "detail"],
    accessPatterns: ["list", "detail"],
    selection: ["single"],
    operationKinds: ["query", "view", "create", "update", "delete"],
    requiredSignals: ["list operation", "single selected entity"],
    optionalSignals: ["detail view operation", "long edit form", "related records"]
  },
  rejectsWhen: [
    "The screen is primarily mobile.",
    "The entity has too few fields to justify a detail panel.",
    "The workflow does not have a selected entity concept.",
    "The main task requires a full-screen canvas or map."
  ],
  slots: {
    primarySurface: "masterList",
    secondarySurfaces: ["detailPanel", "editPanel", "relatedItems"],
    toolbarActions: ["create"],
    rowActions: ["select"],
    bulkActions: [],
    confirmationActions: ["delete"],
    contextualInputs: ["selectedEntity"],
    hiddenInputs: ["technicalId"],
    navigationTargets: ["detailPanel"],
    actionPresentation: {
      query: "toolbar",
      view: "inline",
      create: "drawer",
      update: "inline",
      delete: "confirmation"
    }
  },
  layoutGuidance: [
    "Keep the selected record visible while editing.",
    "Use the detail panel for current state, history, related records or forms.",
    "Avoid duplicating create, update and delete as separate full-width sections.",
    "Show a helpful empty detail state before selection."
  ],
  llmGuidance: [
    "Write the layout as a focused workbench.",
    "Make selection state explicit in dataBindings.",
    "Use progressive disclosure inside the detail panel for advanced fields.",
    "Keep the list scannable and the detail panel action-oriented."
  ],
  validationChecks: [
    "The layout has one master list and one detail area.",
    "A selected entity drives detail/edit/delete actions.",
    "No selectedEntity input is manually typed.",
    "The empty selection state is defined."
  ],
  exampleUseCases: [
    "Manage catalog items with many fields.",
    "Review customer profiles.",
    "Manage support tickets.",
    "Inspect stock item details and movements."
  ]
} as const satisfies UxTemplateDefinition;

export default splitDetailTemplate;

