/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.ts" enhancement="_blank"/>

// The i0-classify result, as the steps read it back.
//
// i0-classify has no step agent of its own — the ROOT does the cheap classification and its answer
// travels in the root step's own payload (flow.json: "agentName: the root itself"). Every step that
// needs the target, the language or the runKey reads it from here.
//
// DELIBERATE DIFFERENCE FROM agentNewMolecule2, which keeps these accessors in its root file
// (agentNewMolecule2.ts:150-176) and has each step import the root: that makes step → root → gate a
// module cycle. Here they live in helpers/, which both the root and the steps import. It also means
// a step is testable without the root existing.

import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { isRecord, parseMaybeJson } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { IM_AGENT_NAME } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

export interface ImRootPlan {
  /** What the classifier read out of the prose: 'ml-data-table' or 'groupviewtable/ml-data-table'. */
  target: string;
  runKey: string;
  /** The language the USER wrote in — every message back to them is written in it. */
  userLanguage: string;
  title: string;
  /** false = the prose is not a request to change a molecule; `reason` says why, in userLanguage. */
  validInput: boolean;
  reason: string;
}

const EMPTY: ImRootPlan = { target: '', runKey: '', userLanguage: '', title: '', validInput: false, reason: '' };

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * PURE — the parser of the classifier's output, which is why it is exported and tested.
 * Everything is optional in the payload and defaulted here; the gate is what rejects the result.
 */
export function normalizeImRootPlan(payload: unknown): ImRootPlan {
  const parsed = parseMaybeJson(payload);
  const record = isRecord(parsed) ? parsed : {};
  const resultRaw = parseMaybeJson(record.result);
  const result = isRecord(resultRaw) ? resultRaw : record;

  return {
    target: str(result.target),
    runKey: str(result.runKey),
    userLanguage: str(result.userLanguage) || 'en',
    title: str(result.title),
    // Absent means "not classified yet", which is not valid. Only an explicit true passes.
    validInput: result.validInput === true,
    reason: str(result.reason),
  };
}

export function getImRootPlan(context: mls.msg.ExecutionContext): ImRootPlan {
  if (!context.task) throw new Error('[getImRootPlan] task invalid');
  const root = getAllSteps(context.task.iaCompressed?.nextSteps).find(
    item => item.type === 'agent' && (item as mls.msg.AIAgentStep).agentName === IM_AGENT_NAME,
  ) as mls.msg.AIAgentStep | undefined;
  return root ? normalizeImRootPlan(root.interaction?.payload?.[0]) : EMPTY;
}

/** The prose of the mention, published to task memory by the root. */
export function getImInput(context: mls.msg.ExecutionContext): { prompt: string } {
  const memory = context.task?.iaCompressed?.longMemory || {};
  const prompt = typeof memory.prompt === 'string' ? memory.prompt : '';
  if (!prompt) throw new Error('[getImInput] missing prompt in task memory');
  return { prompt };
}

/**
 * Steps locate their l4 artifacts by runKey. It travels in each step's own args (planted by the
 * root); task memory and then the root plan are the fallbacks for a step re-run outside the
 * original batch. Same precedence as agentNewMolecule2.
 */
export function getImRunKey(context: mls.msg.ExecutionContext, stepArgsRunKey?: string): string {
  if (stepArgsRunKey) return stepArgsRunKey;
  const memory = context.task?.iaCompressed?.longMemory || {};
  const fromMemory = typeof memory.runKey === 'string' ? memory.runKey : '';
  if (fromMemory) return fromMemory;
  const plan = getImRootPlan(context);
  if (plan.runKey) return plan.runKey;
  throw new Error('[getImRunKey] runKey not available — the root did not plant it');
}
