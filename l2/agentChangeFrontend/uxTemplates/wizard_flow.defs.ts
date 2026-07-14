/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/wizard_flow.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const wizardFlowTemplate = {
  id: "wizard_flow",
  title: "Wizard Flow",
  version: 1,
  tags: ["workflow", "wizard", "multiStep", "guided"],
  description: "Guided multi-step experience for complex tasks with staged inputs, review and final submission.",
  userJourney: "User follows a clear sequence of steps, completes each stage, reviews the collected information and submits the final command once the prerequisites are satisfied.",
  appliesWhen: {
    workspaceKinds: ["workflow", "form"],
    accessPatterns: ["commandInput"],
    selection: ["none", "single"],
    operationKinds: ["create", "update", "command", "transition"],
    requiredSignals: ["multi-step story or many grouped inputs"],
    optionalSignals: ["review step", "dependent fields", "parent-child input"]
  },
  rejectsWhen: [
    "The task is a simple short form.",
    "The user primarily needs to scan a list or queue.",
    "The operation should be completed as a quick row action.",
    "There is no meaningful order among input groups."
  ],
  slots: {
    primarySurface: "stepper",
    secondarySurfaces: ["stepForm", "reviewSummary", "completionState"],
    toolbarActions: [],
    rowActions: [],
    bulkActions: [],
    confirmationActions: ["submitFinal"],
    contextualInputs: ["currentWorkspace", "selectedEntity", "previousStepOutput"],
    hiddenInputs: ["systemDefault"],
    navigationTargets: ["previousStep", "nextStep"],
    actionPresentation: {
      create: "inline",
      update: "inline",
      command: "inline",
      transition: "inline"
    }
  },
  layoutGuidance: [
    "Represent steps semantically; a simple renderer can show them as stacked sections if needed.",
    "Do not submit child inputs separately when the contract expects one composed payload.",
    "Use a review step when the command is high-impact or has many fields.",
    "Keep context-derived fields out of manual input."
  ],
  llmGuidance: [
    "Follow operation story steps closely.",
    "Group fields by user decision, not by technical entity.",
    "Make progress and completion criteria clear.",
    "Avoid inventing intermediate BFF actions.",
    "Microcopy example: subtitle 'Build the order in guided steps', action 'Confirm order', empty state 'Complete this step to continue'."
  ],
  wiring: {
    minimumStates: ["formDraft", "loading", "mutationFeedback"],
    transitions: ["submit->textualFeedback->refresh->clearFormAndSelection"],
    microcopy: { actionLabels: "domainAction", emptyState: "nextStep", mutationFeedback: "textualDismissible" }
  },
  validationChecks: [
    { id: "has-wizard-steps" },
    { id: "single-submit-action" },
    { id: "all-form-inputs-covered" }
  ],
  exampleUseCases: [
    "Create a complex order.",
    "Onboard a customer.",
    "Configure a product bundle.",
    "Run a guided approval process."
  ]
} as const satisfies UxTemplateDefinition;

export default wizardFlowTemplate;
