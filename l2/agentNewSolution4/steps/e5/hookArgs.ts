/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/hookArgs.ts" enhancement="_blank"/>

export function resolveNs4E5HookArgs(args: unknown, prompt: unknown): string {
  if (typeof args === 'string') return args;
  if (typeof prompt === 'string') return prompt;
  return JSON.stringify({ planId: 'e5-rules', reviewRound: 1 });
}
