/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/single_form.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const singleFormTemplate = {
  id: "single_form",
  title: "Single Form",
  version: 1,
  tags: ["form", "command", "create", "simple"],
  description: "Focused command screen for a single create/update/request operation without a list as the primary surface.",
  userJourney: "User opens a focused form, completes the required fields, reviews inline validation, submits once and receives clear success or error feedback.",
  appliesWhen: {
    workspaceKinds: ["form", "entityManagement"],
    accessPatterns: ["commandInput"],
    selection: ["none", "single"],
    operationKinds: ["create", "update", "command"],
    requiredSignals: ["single command operation"],
    optionalSignals: ["short form", "no list output", "system-generated identifier"]
  },
  rejectsWhen: [
    "There are multiple unrelated commands.",
    "A list must be shown before the command.",
    "The command has a multi-step approval or review process.",
    "The user needs to compare existing records while editing."
  ],
  slots: {
    primarySurface: "commandForm",
    secondarySurfaces: ["validationSummary", "successState"],
    toolbarActions: [],
    rowActions: [],
    bulkActions: [],
    confirmationActions: [],
    contextualInputs: ["currentWorkspace", "activeLifecycleInstance"],
    hiddenInputs: ["systemDefault"],
    navigationTargets: [],
    actionPresentation: {
      create: "inline",
      update: "inline",
      command: "inline"
    }
  },
  layoutGuidance: [
    "Keep one clear form and one clear submit action.",
    "Group fields by intent when the form is long.",
    "Do not create placeholder lists or summaries unless the operation requires them.",
    "Show system-resolved context as read-only text only when it helps the user."
  ],
  llmGuidance: [
    "Favor clarity over density.",
    "Make required fields obvious.",
    "Use field ordering from the operation story.",
    "Avoid technical context fields in the visible form.",
    "Microcopy example: subtitle 'Provide the supplier details', action 'Register supplier', empty state 'Complete the required fields to register the supplier'."
  ],
  wiring: {
    minimumStates: ["formDraft", "loading", "mutationFeedback"],
    transitions: ["submit->textualFeedback->refresh->clearFormAndSelection"],
    microcopy: { actionLabels: "domainAction", emptyState: "nextStep", mutationFeedback: "textualDismissible" }
  },
  validationChecks: [
    { id: "has-command-form" },
    { id: "single-submit-action" },
    { id: "all-form-inputs-covered" }
  ],
  exampleUseCases: [
    "Create a supplier.",
    "Request a password reset.",
    "Submit a manual stock adjustment.",
    "Create a new project."
  ]
} as const satisfies UxTemplateDefinition;

export default singleFormTemplate;
