/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4ReviewPolicy.ts" enhancement="_blank"/>

/**
 * E2-E6 checkpoint policy.
 * `/fast` (longMemory.fastMode) or reviewPolicy.mode=automatic skip later reviews.
 * guided always opens. smart opens on Type A, Type B / a relevant decision, or
 * when the stage has no classified signal; it skips only-C (or empty classified)
 * stages and records autoReason "nenhum finding A" next to approvedBy=auto.
 * E1 itself always opens.
 */

export interface Ns4ReviewPolicyContext {
  task?: { iaCompressed?: { longMemory?: Record<string, unknown> } };
}

export const NS4_SMART_SKIP_REASON = 'nenhum finding A' as const;

export type Ns4SmartSignal =
  | { available: false }
  | { available: true; classA: boolean; classB: boolean };

export const NS4_UNAVAILABLE_SMART_SIGNAL: Ns4SmartSignal = { available: false };

export function isNs4AutomaticCheckpoint(
  context: Ns4ReviewPolicyContext,
  module?: { reviewPolicy?: { mode?: string } } | null,
): boolean {
  if (context.task?.iaCompressed?.longMemory?.fastMode === 'true') return true;
  return module?.reviewPolicy?.mode === 'automatic';
}

export function decideNs4LaterCheckpoint(
  context: Ns4ReviewPolicyContext,
  module?: { reviewPolicy?: { mode?: string } } | null,
  signal: Ns4SmartSignal = NS4_UNAVAILABLE_SMART_SIGNAL,
): { open: boolean; autoReason?: typeof NS4_SMART_SKIP_REASON } {
  if (isNs4AutomaticCheckpoint(context, module)) return { open: false };
  if (module?.reviewPolicy?.mode !== 'smart') return { open: true };
  if (!signal.available || signal.classA || signal.classB) return { open: true };
  return { open: false, autoReason: NS4_SMART_SKIP_REASON };
}

/** E2 coverage records Type B as systemDecisions; journey policyDecisions are reversible choices. Type A does not reach the checkpoint. */
export function ns4E2SmartSignal(review: {
  systemDecisions?: readonly unknown[];
  journeys?: readonly { policyDecisions?: readonly unknown[] }[];
}): Ns4SmartSignal {
  return {
    available: true,
    classA: false,
    classB: Boolean(review.systemDecisions?.length)
      || Boolean(review.journeys?.some(journey => journey.policyDecisions?.length)),
  };
}

/**
 * E4 has NO A/B vocabulary: its systemDecisions are Type C label backfills, and nothing else on the
 * review expresses "a human should look at this". That is absence of SIGNAL, not evidence that the
 * ontology is uncontroversial — so the checkpoint OPENS, per the rule "sem sinal, mostra".
 *
 * Reporting `available: true, classA/B: false` instead would hardcode "never open the ontology", and
 * because `smart` is the DEFAULT policy that would quietly remove the entity/enum review from every
 * run. When E4 gains real A/B findings, return them here and it joins the same decider.
 */
export function ns4E4SmartSignal(_review?: { systemDecisions?: readonly unknown[] }): Ns4SmartSignal {
  return NS4_UNAVAILABLE_SMART_SIGNAL;
}
