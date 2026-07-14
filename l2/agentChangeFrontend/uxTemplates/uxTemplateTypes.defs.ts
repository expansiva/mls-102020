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
  minimumStates: Array<'selectedId' | 'formDraft' | 'loading' | 'mutationFeedback'>;
  transitions: Array<
    | 'rowSelect->selectedId->prepopulateDraft'
    | 'submit->textualFeedback->refresh->clearFormAndSelection'
  >;
  microcopy: {
    actionLabels: 'domainAction';
    emptyState: 'nextStep';
    mutationFeedback: 'textualDismissible';
  };
}

export type UxValidationCheckId =
  | 'one-primary-list'
  | 'has-list'
  | 'has-list-fallback'
  | 'has-card-list'
  | 'has-command-form'
  | 'has-detail-surface'
  | 'has-workflow-status'
  | 'has-board'
  | 'has-status-group'
  | 'has-visual-fallback'
  | 'has-calendar'
  | 'has-report'
  | 'has-bulk-selection'
  | 'has-wizard-steps'
  | 'has-repeatable-input'
  | 'single-submit-action'
  | 'all-form-inputs-covered'
  | 'has-selection-context'
  | 'has-row-action-context'
  | 'has-destructive-confirmation'
  | 'has-refresh';

/** The id is interpreted by cfeMaterializeCore; it is data, not prompt prose. */
export interface UxValidationCheck {
  id: UxValidationCheckId;
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
  validationChecks: UxValidationCheck[];
  wiring: UxTemplateWiring;
  exampleUseCases: string[];
}
