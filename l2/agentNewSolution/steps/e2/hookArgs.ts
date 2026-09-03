/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2/hookArgs.ts" enhancement="_blank"/>

export function resolveNs4E2HookArgs(args?: string, stepPrompt?: string): string {
  return args || stepPrompt || JSON.stringify({ planId: 'e2-journeys', reviewRound: 1 });
}
