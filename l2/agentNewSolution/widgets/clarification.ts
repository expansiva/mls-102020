/// <mls fileReference="_102020_/l2/agentNewSolution/widgets/clarification.ts" enhancement="_102027_/l2/enhancementLit"/>

/** Public contract shared by the clarification widgets. The agent consumes it; it is not a widget-internal detail. */
export type Ns4ClarificationAction = 'approve' | 'requestChanges' | 'cancel';

export type Ns4ClarificationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type Ns4ClarificationFeedback = {
  kind: 'error' | 'success' | 'information';
  message: string;
  issues?: Ns4ClarificationIssue[];
};

export type Ns4ClarificationEvent<TReview> = {
  action: Ns4ClarificationAction;
  review: TReview;
  adjustment: string;
};

export interface Ns4ClarificationWidgetApi {
  msgError: string;
  msgOk: string;
  setFeedback(feedback: Ns4ClarificationFeedback | null): void;
  setSubmitting(submitting: boolean): void;
}
