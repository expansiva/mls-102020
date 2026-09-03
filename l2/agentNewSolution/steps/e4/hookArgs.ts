/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e4/hookArgs.ts" enhancement="_blank"/>

export function resolveNs4E4HookArgs(args: unknown, prompt: unknown): string {
  if (typeof args === 'string') return args;
  if (typeof prompt === 'string') return prompt;
  return '';
}

/** Materialized parallel children have a selector arg but no prompt/planning metadata. */
export function resolveNs4E4InvocationArgs(hookArgs: string, entityId: string): string {
  return entityId
    ? JSON.stringify({ planId: 'e4-ontology', solutionMode: 'new' })
    : hookArgs;
}
