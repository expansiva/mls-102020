/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4Clarification.ts" enhancement="_blank"/>

import {
  Ns4ClarificationFeedback,
  Ns4ClarificationIssue,
  Ns4ClarificationWidgetApi,
} from '/_102020_/l2/agentNewSolution4/widgets/clarification.js';

interface Ns4ClarificationElement extends HTMLElement, Partial<Ns4ClarificationWidgetApi> {
  requestUpdate?: () => void;
}

export function setNs4ClarificationFeedback(
  element: HTMLElement,
  feedback: Ns4ClarificationFeedback | null,
): void {
  const widget = element as Ns4ClarificationElement;
  if (typeof widget.setFeedback === 'function') {
    widget.setFeedback(feedback);
    return;
  }
  widget.msgError = feedback?.kind === 'error' ? feedback.message : '';
  widget.msgOk = feedback && feedback.kind !== 'error' ? feedback.message : '';
  widget.requestUpdate?.();
}

export function setNs4ClarificationSubmitting(element: HTMLElement, submitting: boolean): void {
  const widget = element as Ns4ClarificationElement;
  if (typeof widget.setSubmitting === 'function') {
    widget.setSubmitting(submitting);
    return;
  }
  if ('submitting' in widget) (widget as unknown as { submitting: boolean }).submitting = submitting;
  widget.requestUpdate?.();
}

export function showNs4ClarificationError(
  element: HTMLElement,
  error: unknown,
  issues?: Ns4ClarificationIssue[],
): void {
  const message = error instanceof Error ? error.message : String(error);
  setNs4ClarificationSubmitting(element, false);
  setNs4ClarificationFeedback(element, { kind: 'error', message, ...(issues?.length ? { issues } : {}) });
}
