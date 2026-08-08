/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/hookArgs.ts" enhancement="_blank"/>

export function resolveNs4E5HookArgs(args: unknown, prompt: unknown): string {
  if (typeof args === 'string') return args;
  if (typeof prompt === 'string') return prompt;
  return JSON.stringify({ planId: 'e5-rules', reviewRound: 1 });
}


/** Materialized parallel children have a selector arg but no prompt/planning metadata. */
export function resolveNs4E5InvocationArgs(hookArgs: string, ruleId: string): string {
  return ruleId ? JSON.stringify({ planId: 'e5-rules' }) : hookArgs;
}
