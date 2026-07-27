/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetDecisionClarificationLogic.ts" enhancement="_blank"/>

// Pure logic for the Decision Clarification widget (generic questions-with-options
// clarification, reusable by any agent). Kept separate from the Lit component so it
// is unit-testable without a DOM. Emits/consumes plain data.

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  recommended?: boolean;
}

export interface DecisionQuestion {
  id: string;               // stable field id (e.g. 'background.kind')
  title?: string;           // short label
  question: string;         // the prompt (localized by the caller)
  options: DecisionOption[];
  allowNotes?: boolean;     // show a free-text field for a custom answer
}

export interface DecisionClarificationValue {
  title: string;
  intro?: string;
  userLanguage?: string;
  questions: DecisionQuestion[];
}

export interface DecisionLocalAnswer {
  optionId: string;
  notes: string;
}

export interface DecisionAnswer {
  id: string;
  optionId: string;
  label: string;
  notes?: string;
}

export type DecisionAction = 'continue' | 'cancel';

// Pre-select the recommended option (or the first) so the user can accept fast.
export function initialDecisionAnswers(questions: DecisionQuestion[]): Record<string, DecisionLocalAnswer> {
  const out: Record<string, DecisionLocalAnswer> = {};
  for (const q of questions) {
    const rec = q.options.find(o => o.recommended) || q.options[0];
    out[q.id] = { optionId: rec ? rec.id : '', notes: '' };
  }
  return out;
}

// A question is answered if an option is chosen OR (notes allowed and provided).
export function isDecisionAnswered(question: DecisionQuestion, local: DecisionLocalAnswer | undefined): boolean {
  if (!local) return false;
  if (local.optionId) return true;
  return !!question.allowNotes && local.notes.trim().length > 0;
}

export function allDecisionAnswered(questions: DecisionQuestion[], local: Record<string, DecisionLocalAnswer>): boolean {
  return questions.every(q => isDecisionAnswered(q, local[q.id]));
}

// Resolve the emitted answers (label from the chosen option; notes only when allowed + present).
export function buildDecisionResult(questions: DecisionQuestion[], local: Record<string, DecisionLocalAnswer>): DecisionAnswer[] {
  return questions.map(q => {
    const a = local[q.id] || { optionId: '', notes: '' };
    const opt = q.options.find(o => o.id === a.optionId);
    const answer: DecisionAnswer = { id: q.id, optionId: a.optionId, label: opt ? opt.label : '' };
    if (q.allowNotes && a.notes && a.notes.trim()) answer.notes = a.notes.trim();
    return answer;
  });
}
