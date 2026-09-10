/// <mls fileReference="_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtTypes.ts" enhancement="_blank"/>

// Types and constants for agentMigrateGroupTokens (spec: todo/moleculetokens/todo-casca-migracao-por-grupo.md).
// Pure — no I/O, no mls.* access.

export const MGT_AGENT_NAME = 'agentMigrateGroupTokens';
export const MGT_AGENT_FOLDER = 'aura/molecules/agentMigrateGroupTokens';
export const MGT_AGENT_PROJECT = 102020;

/**
 * The one step this agent plants and handles itself, reentrantly — same shape as IM2's own
 * `i2r-route` (agentImproveMolecule2.ts), which is the router planted once and handled by the
 * root's own `beforePromptStep` when it becomes runnable.
 *
 * ⚠️ REUSED VERBATIM ACROSS EVERY ITERATION, on purpose: only ONE instance of this planId is ever
 * `waiting_dependency` at a time (the previous one already completed before the next is planted),
 * which is the whole point of the reentrant design — see the control's "O plantio em lote NÃO
 * funciona" section for why N simultaneous branches cannot share `i1-done`/`i2-done` anchors.
 */
export const ADVANCE_PLAN_ID = 'mgt-advance';

/** A molecule the pre-validation kept OUT of the queue, and why. */
export interface MgtSkipped {
  shortName: string;
  reason: string;
}

/**
 * l4/agentMigrateGroupTokens/<runKey>/progress.json — the only state the reentrant step needs to
 * know where the chain is. `runKey` here is the CASCA's own — distinct from each molecule's own
 * `tokens-<shortName>` runKey, which lives only in that molecule's own l4 folder.
 */
export interface MgtProgress {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  groupFolder: string;
  groupCanonical: string;
  /** Set when nothing could be planted at all — a bad mention, an unknown group, or every
   *  molecule of the group failing pre-validation. The report step reads this and plants nothing. */
  refusal: string;
  /** Every molecule this run intends to touch, in order — already filtered by pre-validation and
   *  by the 'a partir de' starting point. Empty when `refusal` is set. */
  queue: string[];
  /** Index into `queue` of the molecule whose i1/i2/i2r triple is CURRENTLY planted. */
  current: number;
  /** Molecules the pre-validation rejected before ever being queued (defs_missing). */
  skipped: MgtSkipped[];
  /** Short names the queue has already advanced past (their pipeline reached i7-done). */
  done: string[];
}
