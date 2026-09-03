/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.ts" enhancement="_blank"/>

export type UxWorkspaceKind =
  | "entityManagement"
  | "workflow"
  | "dashboard"
  | "report"
  | "adjustment"
  | "detail"
  | "form"
  | "calendar";

export type UxAccessPattern =
  | "list"
  | "detail"
  | "commandInput"
  | "dashboard"
  | "queue"
  | "calendar"
  | "report"
  | "board";

export type UxSelectionMode = "none" | "single" | "multiple";

export type UxOperationKind =
  | "query"
  | "view"
  | "create"
  | "update"
  | "delete"
  | "adjust"
  | "transition"
  | "report"
  | "command";

export type UxActionPresentation =
  | "toolbar"
  | "rowAction"
  | "bulkAction"
  | "drawer"
  | "modal"
  | "inline"
  | "routeChild"
  | "confirmation"
  | "floatingAction"
  | "hiddenContext"
  | "automation";

export interface UxTemplateAppliesWhen {
  workspaceKinds: UxWorkspaceKind[];
  accessPatterns: UxAccessPattern[];
  selection: UxSelectionMode[];
  operationKinds: UxOperationKind[];
  requiredSignals?: string[];
  optionalSignals?: string[];
}

export interface UxTemplateSlots {
  primarySurface: string;
  secondarySurfaces: string[];
  toolbarActions: string[];
  rowActions: string[];
  bulkActions: string[];
  confirmationActions: string[];
  contextualInputs: string[];
  hiddenInputs: string[];
  navigationTargets: string[];
  actionPresentation: Record<string, UxActionPresentation>;
}

export interface UxTemplateWiring {
  minimumStates: string[];
  transitions: string[];
  microcopy: {
    actionLabels: 'domainAction';
    emptyState: 'nextStep';
    mutationFeedback: 'textualDismissible';
  };
}

export interface UxTemplateDefinition {
  id: string;
  title: string;
  version: number;
  tags: string[];
  description: string;
  userJourney: string;
  appliesWhen: UxTemplateAppliesWhen;
  rejectsWhen: string[];
  slots: UxTemplateSlots;
  layoutGuidance: string[];
  llmGuidance: string[];
  validationChecks: string[];
  /** Structured interaction contract. Omitted by legacy templates only; selection derives it from slots. */
  wiring?: UxTemplateWiring;
  exampleUseCases: string[];
}
