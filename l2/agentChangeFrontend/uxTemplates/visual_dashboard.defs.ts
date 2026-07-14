/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/visual_dashboard.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const visualDashboardTemplate = {
  id: "visual_dashboard",
  title: "Visual Dashboard",
  version: 1,
  tags: ["dashboard", "visual", "spatial", "interactive"],
  description: "Visual workspace for entities that have spatial, map, floor-plan or diagram semantics.",
  userJourney: "User opens a visual map, identifies objects by position and status, clicks an object to inspect it, and performs contextual actions from a side panel.",
  appliesWhen: {
    workspaceKinds: ["dashboard", "workflow", "entityManagement"],
    accessPatterns: ["dashboard", "detail", "list"],
    selection: ["single"],
    operationKinds: ["query", "view", "update", "transition", "command"],
    requiredSignals: ["spatial coordinates, area, map, floor plan or visual position"],
    optionalSignals: ["status field", "shape", "zone", "capacity"]
  },
  rejectsWhen: [
    "There is no spatial or visual model in L4.",
    "The entity is only a standard administrative record.",
    "The workflow needs dense tabular editing.",
    "The page is a pure report or command form."
  ],
  slots: {
    primarySurface: "visualMap",
    secondarySurfaces: ["sidePanel", "legend", "statusSummary"],
    toolbarActions: ["filter", "refresh"],
    rowActions: ["view", "update", "transition"],
    bulkActions: [],
    confirmationActions: [],
    contextualInputs: ["selectedEntity"],
    hiddenInputs: ["technicalId"],
    navigationTargets: ["objectDetail"],
    actionPresentation: {
      query: "toolbar",
      view: "drawer",
      update: "drawer",
      transition: "drawer",
      command: "drawer"
    }
  },
  layoutGuidance: [
    "Only choose this when L4 has visual or spatial fields.",
    "The map or visual field is the main surface.",
    "Provide a fallback list for accessibility or missing visual data.",
    "Use a side panel for selected object details and actions."
  ],
  llmGuidance: [
    "Do not invent coordinates or floor plan data.",
    "Use visual grouping only when backed by ontology fields.",
    "Keep legends and status labels explicit.",
    "Treat object selection like selectedEntity context."
  ],
  validationChecks: [
    "The template has an explicit spatial signal.",
    "A selected visual object maps to a stable entity key.",
    "There is an accessible non-visual fallback.",
    "No fake map data is invented by the layout."
  ],
  exampleUseCases: [
    "Restaurant floor map.",
    "Warehouse location map.",
    "Asset placement dashboard.",
    "Facility room status map."
  ]
} as const satisfies UxTemplateDefinition;

export default visualDashboardTemplate;

