/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/mobile_cards.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const mobileCardsTemplate = {
  id: "mobile_cards",
  title: "Mobile Cards",
  version: 1,
  tags: ["list", "mobile", "cards", "touch"],
  description: "Card-based layout optimized for small screens and touch interactions.",
  userJourney: "User scrolls through large, readable cards, taps a card to open actions or details, filters from a compact control, and creates records from a floating or sticky Add action.",
  appliesWhen: {
    workspaceKinds: ["entityManagement", "workflow", "detail"],
    accessPatterns: ["list", "queue", "detail"],
    selection: ["single"],
    operationKinds: ["query", "view", "create", "update", "delete", "transition"],
    requiredSignals: ["list or queue output"],
    optionalSignals: ["mobile target", "short record summary", "status field"]
  },
  rejectsWhen: [
    "The workflow requires dense spreadsheet-style comparison.",
    "The primary output has too many columns to summarize.",
    "Bulk editing is the main task.",
    "The page is a report or analytics screen."
  ],
  slots: {
    primarySurface: "cardList",
    secondarySurfaces: ["bottomSheetActions", "compactFilters"],
    toolbarActions: ["filter"],
    rowActions: ["view", "update", "delete", "transition"],
    bulkActions: [],
    confirmationActions: ["delete"],
    contextualInputs: ["selectedEntity"],
    hiddenInputs: ["technicalId"],
    navigationTargets: ["cardDetail"],
    actionPresentation: {
      query: "toolbar",
      create: "floatingAction",
      view: "routeChild",
      update: "drawer",
      delete: "confirmation",
      transition: "rowAction"
    }
  },
  layoutGuidance: [
    "Summarize each record with a title, status and two or three key attributes.",
    "Avoid wide tables.",
    "Keep primary actions thumb reachable.",
    "Use bottom sheet semantics for contextual actions when possible."
  ],
  llmGuidance: [
    "Think in touch targets and scroll rhythm.",
    "Do not overload each card with every field.",
    "Show status and next action prominently.",
    "Use compact filters; advanced filters can be progressive."
  ],
  validationChecks: [
    "Records are rendered as cards, not a desktop table.",
    "Each card has a clear primary label and status if available.",
    "Create is easy to reach.",
    "Destructive actions still require confirmation."
  ],
  exampleUseCases: [
    "Mobile stock count.",
    "Field service job list.",
    "Mobile customer list.",
    "Kitchen ticket cards on a tablet."
  ]
} as const satisfies UxTemplateDefinition;

export default mobileCardsTemplate;

