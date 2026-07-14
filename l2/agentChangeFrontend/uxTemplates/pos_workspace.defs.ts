/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/pos_workspace.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const posWorkspaceTemplate = {
  id: "pos_workspace",
  title: "POS Workspace",
  version: 1,
  tags: ["workflow", "pos", "orderEntry", "transaction"],
  description: "Point-of-sale workspace with item selection, current order/cart, totals and settlement actions.",
  userJourney: "User selects customer, table or context, adds items to the current order, reviews totals and sends or settles the order from the same focused workspace.",
  appliesWhen: {
    workspaceKinds: ["workflow"],
    accessPatterns: ["commandInput", "list"],
    selection: ["none", "single"],
    operationKinds: ["create", "update", "command", "transition"],
    requiredSignals: ["order-like parent entity", "line item or repeated child input"],
    optionalSignals: ["payment or settlement", "table selection", "menu item lookup", "totals"]
  },
  rejectsWhen: [
    "There is no order/cart-like composed input.",
    "The workflow is simple entity CRUD.",
    "The user only reviews a report.",
    "The task is a passive dashboard."
  ],
  slots: {
    primarySurface: "currentTransaction",
    secondarySurfaces: ["itemPicker", "lineItems", "totalsPanel", "settlementPanel"],
    toolbarActions: ["searchItems", "selectContext"],
    rowActions: ["editLine", "removeLine"],
    bulkActions: [],
    confirmationActions: ["settle", "submitOrder"],
    contextualInputs: ["activeTransaction", "selectedEntity", "currentWorkspace"],
    hiddenInputs: ["systemDefault", "technicalId"],
    navigationTargets: ["orderQueue", "paymentResult"],
    actionPresentation: {
      create: "inline",
      update: "inline",
      command: "toolbar",
      transition: "toolbar"
    }
  },
  layoutGuidance: [
    "Keep item selection and current order visible together.",
    "Treat line items as a repeatable sub-form inside one composed payload.",
    "Do not create one independent form per item operation.",
    "Put totals and final action in a stable side or bottom panel."
  ],
  llmGuidance: [
    "Design for fast repeated input.",
    "Separate order context, item picker, line items and final action.",
    "Never turn cart line items into separate BFF saves unless L4 defines that.",
    "Make current order state obvious.",
    "Microcopy example: subtitle 'Assemble the current order', action 'Confirm order', empty state 'Add the first item to the order'."
  ],
  wiring: {
    minimumStates: ["selectedId", "formDraft", "loading", "mutationFeedback"],
    transitions: ["rowSelect->selectedId->prepopulateDraft", "submit->textualFeedback->refresh->clearFormAndSelection"],
    microcopy: { actionLabels: "domainAction", emptyState: "nextStep", mutationFeedback: "textualDismissible" }
  },
  validationChecks: [
    { id: "has-command-form" },
    { id: "has-repeatable-input" },
    { id: "single-submit-action" }
  ],
  exampleUseCases: [
    "Restaurant order entry.",
    "Retail POS.",
    "Service quote builder.",
    "Subscription checkout configuration."
  ]
} as const satisfies UxTemplateDefinition;

export default posWorkspaceTemplate;
