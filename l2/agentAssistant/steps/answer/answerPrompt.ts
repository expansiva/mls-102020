/// <mls fileReference="_102020_/l2/agentAssistant/steps/answer/answerPrompt.ts" enhancement="_blank"/>

// Pure assembly of the answer call (node-testable).

import type { AsState } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';

export function buildAnswerHumanPrompt(state: AsState, purpose: string): string {
  const result = state.results[state.results.length - 1];
  return [
    `## Language\n${state.userLanguage || 'en'}`,
    `## Question\n${state.userText}`,
    `## Query that was run\n${result?.route || '(none)'}${purpose ? ` — ${purpose}` : ''}`,
    `## Parameters\n${JSON.stringify(result?.params ?? {})}`,
    `## Data returned by the app\n${typeof result?.data === 'string' ? result.data : JSON.stringify(result?.data ?? null)}`,
  ].join('\n\n');
}

// Manual questions: the documentation chosen for the question (asManual.manualContext).
export function buildManualHumanPrompt(state: AsState, documentation: string): string {
  return [
    `## Language\n${state.userLanguage || 'en'}`,
    `## Question\n${state.userText}`,
    `## App documentation\n${documentation}`,
  ].join('\n\n');
}

// The task row shows one line: the answer's first line, kept short.
export function answerStepTitle(text: string): string {
  const line = text.split('\n').find(item => item.trim()) || text;
  const trimmed = line.trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}
