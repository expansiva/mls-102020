/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsLlmRetry.ts" enhancement="_blank"/>

// P2 (newSolution_14): survive a TRANSIENT LLM-CALL failure on a single-call step. task3 (buildFlowFsm,
// ~1h run) died at e6 because the LLM call itself failed once and there was no retry — the framework
// marked the step 'failed' and killed the whole task. Single-call steps set
// onFailure='wait_after_prompt' (see agentNewSolution.NS_LLM_CALL_STEPS), so afterPromptStep runs even
// when the call failed; this helper detects that case (no payload) and retries ONCE before failing with
// a TRUTHFUL infra message (the 402 lesson from changeBackend — never a generic "LLM call failed").
//
// Detection mirrors agentChangeBackend/steps/gen-usecase: an LLM infra failure (proxy/credit/timeout)
// leaves NO payload; the cause is in interaction.trace. A payload present (even a status:'failed' tool
// output) is a CONTENT failure and is handled by the step's own gate/retry, not here.

import { nsAgentStepIntent, nsUpdateStatusIntent } from '/_102020_/l2/agentNewSolution/helpers/nsSteps.js';

// The infra cause when the LLM CALL failed (no payload), or null when the model produced output.
export function nsLlmInfraCause(step: mls.msg.AIAgentStep): string | null {
  const payload = step.interaction?.payload?.[0];
  if (payload) return null;
  const trace = (step.interaction?.trace ?? []).map(item => String(item));
  const infra = trace
    .filter(line => /Error invoking Collab LLM proxy|Error executing AI task|proxy|timeout|timed out|\b402\b|\b429\b|\b5\d\d\b/i.test(line))
    .slice(-1)[0];
  return infra ? infra.slice(0, 300) : 'LLM call returned no payload';
}

// When the LLM CALL failed, returns the retry-or-fail intents; otherwise null (proceed normally).
// Budget: exactly 1 retry, keyed by the `llmRetry` flag the retry step carries in its args.
export function nsLlmInfraFailureIntents(params: {
  context: mls.msg.ExecutionContext;
  mutationParent: mls.msg.AIAgentStep;
  step: mls.msg.AIAgentStep;
  hookSequential: number;
  agentName: string;
  stepId: string;
  retryPrompt: Record<string, unknown>;
  alreadyRetried: boolean;
}): mls.msg.AgentIntent[] | null {
  const cause = nsLlmInfraCause(params.step);
  if (!cause) return null;
  const { context, mutationParent, step, hookSequential } = params;
  if (params.alreadyRetried) {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `LLM infra failure: ${cause}`)];
  }
  return [
    nsAgentStepIntent(context, mutationParent, {
      agentName: params.agentName,
      stepTitle: 'Retry after LLM infra failure',
      planId: `${params.stepId}-llmretry-${Date.now()}`,
      prompt: { ...params.retryPrompt, planId: params.stepId, llmRetry: true },
      onFailure: 'wait_after_prompt',
    }),
    nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `LLM call failed, retrying once | ${cause}`, 'input_output'),
  ];
}
