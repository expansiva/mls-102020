/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2Shared.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Orchestration glue shared by every agentNewSolution2 agent: intent builders, payload getters,
// the parallel_dynamic fan-out intent, and the deterministic helpers that keep entity references
// honest (the analise11/12 guardrail: refs must be canonical ontology ids, never aggregate names).
// Getters read straight from the task payloads — Stage 1 keeps payloads in the task until the final
// step clears them, so there is no hydration cache to consult.

import { getAgentStepByAgentName, getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  extractPlannerOutput,
  isRecord,
  parseMaybeJson,
  type PlannerExtractConfig,
  type PlannerOutput,
} from '/_102020_/l2/agentNewSolution2/ns2Extract.js';

export type { PlannerExtractConfig, PlannerOutput, PlannerStatus, Priority } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
export { assertArray, assertRecord, assertString, assertPriority, optionalString, optionalStringArray, isRecord, normalizeStringList } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';

const ROOT_AGENT_NAME = 'agentNewSolution2';

// ── intents ────────────────────────────────────────────────────────────────────

export function createPromptReadyIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  toolSchema: mls.msg.LLMTool,
  toolName: string,
): mls.msg.AgentIntentPromptReady {
  if (!context.task) throw new Error('[createPromptReadyIntent] task invalid');
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [toolSchema],
    toolChoice: { type: 'function', function: { name: toolName } },
  };
}

export function createUpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  const intent: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
  };
  if (cleaner) intent.cleaner = cleaner;
  return intent;
}

/** A completed `result` step carrying a JSON payload, keyed by planId (used for module-name-final,
 * clarification answers, implementation decisions). */
export function createResultStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  planId: string,
  dependsOn: string[],
  stepTitle: string,
  result: unknown,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'result',
      stepId: 0,
      interaction: null,
      stepTitle,
      status: 'completed',
      nextSteps: [],
      result: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      planning: { planId, dependsOn, executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  };
}

/** Spawn a parallel_dynamic fan-out: one child per selector (args), bounded by maxParallel. */
export function createParallelDynamicAgentStepIntent(
  context: mls.msg.ExecutionContext,
  placeholderStep: mls.msg.AIAgentStep,
  agentName: string,
  planId: string,
  stepTitle: string,
  args: string[],
  maxParallel = 5,
): mls.msg.AgentIntentAddStep {
  if (!context.task) throw new Error('[createParallelDynamicAgentStepIntent] task invalid');
  if (args.length === 0) throw new Error('[createParallelDynamicAgentStepIntent] args empty');
  const planning = (placeholderStep as { planning?: { dynamicSource?: unknown; planId?: string } }).planning;
  const dependencyPlanId = (planning?.dynamicSource as { sourcePlanId?: string } | undefined)?.sourcePlanId || planning?.planId || '';
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    parentStepId: placeholderStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: { input: [{ type: 'system', content: '<!-- modelType: codeinstruct -->' }], cost: 0, trace: [`queued ${args.length} parallel args for ${agentName}`], payload: null },
      stepTitle,
      status: 'in_progress',
      nextSteps: [],
      agentName,
      prompt: JSON.stringify({ planId }),
      rags: [],
      planning: { planId, dependsOn: dependencyPlanId ? [dependencyPlanId] : [], executionMode: 'parallel_dynamic', executionHost: 'client', dynamicSource: planning?.dynamicSource },
    } as mls.msg.AIAgentStep,
    executionMode: { type: 'parallel', args, maxParallel },
  };
}

// ── getters (task payloads) ──────────────────────────────────────────────────────

export function findStepByPlanId(context: mls.msg.ExecutionContext, planId: string): mls.msg.AIPayload | null {
  if (!context.task) return null;
  return getAllSteps(context.task.iaCompressed?.nextSteps).find(step => (step as { planning?: { planId?: string } }).planning?.planId === planId) || null;
}

export function getPlannerOutput<T>(context: mls.msg.ExecutionContext, agentName: string, config: PlannerExtractConfig<T>, validate?: (output: PlannerOutput<T>) => void): PlannerOutput<T> {
  if (!context.task) throw new Error('[getPlannerOutput] task invalid');
  const agentStep = getAgentStepByAgentName(context.task, agentName) as mls.msg.AIAgentStep | null;
  if (!agentStep) throw new Error(`[getPlannerOutput] ${agentName} step not found`);
  const payload = agentStep.interaction?.payload?.[0];
  if (!payload) throw new Error(`[getPlannerOutput] ${agentName} payload not found`);
  const output = extractPlannerOutput(payload, config);
  validate?.(output);
  return output;
}

/** All outputs for an agent that fanned out (one step per selector). */
export function getPlannerOutputs<T>(context: mls.msg.ExecutionContext, agentName: string, config: PlannerExtractConfig<T>): PlannerOutput<T>[] {
  if (!context.task) return [];
  const outputs: PlannerOutput<T>[] = [];
  for (const step of getAllSteps(context.task.iaCompressed?.nextSteps)) {
    if (step.type !== 'agent' || (step as mls.msg.AIAgentStep).agentName !== agentName) continue;
    const payload = step.interaction?.payload?.[0];
    if (!payload) continue;
    try {
      outputs.push(extractPlannerOutput(payload, config));
    } catch {
      // skip unparseable fan-out child
    }
  }
  return outputs;
}

export function getResultByPlanId<T>(context: mls.msg.ExecutionContext, planId: string): T | null {
  const step = findStepByPlanId(context, planId);
  if (!step || step.type !== 'result' || !(step as mls.msg.AIResultStep).result) return null;
  const parsed = parseMaybeJson((step as mls.msg.AIResultStep).result);
  return isRecord(parsed) ? (parsed as T) : null;
}

/** Progress title for a parallel_dynamic fan-out. The runtime substitutes {{completed}}/{{total}}/
 * {{failed}} live, so the step shows e.g. "Detalhando entidades 3/10, falhas 0". Localized by the
 * run's userLanguage (pt vs en). */
export function parallelProgressTitle(context: mls.msg.ExecutionContext, ptLabel: string, enLabel: string): string {
  let lang = '';
  try { lang = String(getInitialPlanSummary(context).userLanguage || '').toLowerCase(); } catch { /* default en */ }
  const isPt = lang.startsWith('pt');
  return isPt ? `${ptLabel} {{completed}}/{{total}}, falhas {{failed}}` : `${enLabel} {{completed}}/{{total}}, errors: {{failed}}`;
}

export function getInitialPlanSummary(context: mls.msg.ExecutionContext): Record<string, unknown> {
  if (!context.task) throw new Error('[getInitialPlanSummary] task invalid');
  const rootStep = getAgentStepByAgentName(context.task, ROOT_AGENT_NAME) as mls.msg.AIAgentStep | null;
  const payload = rootStep?.interaction?.payload?.[0] as mls.msg.AIFlexibleResultStep | undefined;
  const result = payload?.type === 'flexible' && isRecord(payload.result) ? payload.result : undefined;
  if (!result || typeof result.userPrompt !== 'string') throw new Error('[getInitialPlanSummary] initial plan not found');
  return result;
}

// ── platform baseline skill ──────────────────────────────────────────────────────

let _platformSkillCache: string | null = null;
export async function readPlatformSkill(): Promise<string> {
  if (_platformSkillCache !== null) return _platformSkillCache;
  try {
    const key = mls.stor.getKeyToFile({ project: 102020, level: 2, folder: 'agentNewSolution2/skills', shortName: 'platform', extension: '.md' });
    const file = mls.stor.files[key];
    const raw = file ? await file.getContent() : '';
    _platformSkillCache = typeof raw === 'string' ? raw : '';
  } catch {
    _platformSkillCache = '';
  }
  return _platformSkillCache;
}

export function withPlatformSkill(systemPrompt: string, platformSkill: string): string {
  return platformSkill ? `${systemPrompt}\n\n${platformSkill}` : systemPrompt;
}

// ── reduce / reference helpers ───────────────────────────────────────────────────

export function pickRecordsByIds(items: unknown[] | undefined, ids: Set<string>, keys: string[]): unknown[] {
  if (!Array.isArray(items) || ids.size === 0) return [];
  return items.filter(item => isRecord(item) && keys.some(key => typeof item[key] === 'string' && ids.has(item[key] as string)));
}

export function summarizeRecords(items: unknown[] | undefined, keys: string[]): unknown[] {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (!isRecord(item)) return item;
    const out: Record<string, unknown> = {};
    for (const key of keys) if (item[key] !== undefined) out[key] = item[key];
    return Object.keys(out).length > 0 ? out : item;
  });
}

// Experience/build status for generation todo files. Stage 1 seeds l5/{module}/todoFrontend.defs.ts
// and todoBackend.defs.ts with every workflow/operation owner as 'toCreate'; l4 owners stay read-only.
export type ExperienceStatus = 'toCreate' | 'toUpdate' | 'toRemove' | 'inProgress' | 'done';
export const EXPERIENCE_STATUS_INITIAL: ExperienceStatus = 'toCreate';

/** Resolve capability ids against the (finalize) capabilities list into compact info to attach to a
 * workflow/operation: { capabilityId, title, actor, priority }. Deterministic; unknown ids kept id-only. */
export function resolveCapabilityInfo(ids: string[], capabilities: unknown[]): { capabilityId: string; title: string; actor?: string; priority?: string }[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const c of Array.isArray(capabilities) ? capabilities : []) {
    if (isRecord(c) && typeof c.capabilityId === 'string') byId.set(c.capabilityId, c);
  }
  return ids.filter(Boolean).map(id => {
    const c = byId.get(id);
    return {
      capabilityId: id,
      title: (c && typeof c.title === 'string' ? c.title : id),
      actor: c && typeof c.actor === 'string' ? c.actor : undefined,
      priority: c && typeof c.priority === 'string' ? c.priority : undefined,
    };
  });
}

export function getActorIdSet(actors: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(actors)) return ids;
  for (const actor of actors) if (isRecord(actor) && typeof actor.actorId === 'string' && actor.actorId.trim()) ids.add(actor.actorId);
  return ids;
}

/** Canonical ontology entity ids: the keys of ontology.entities, plus cross-module `mod:Entity` ids. */
export function getOntologyEntityIdSet(ontologyEntities: unknown): Set<string> {
  const ids = new Set<string>();
  if (isRecord(ontologyEntities)) for (const key of Object.keys(ontologyEntities)) if (key.trim()) ids.add(key);
  return ids;
}

export function collectStringRefs(record: unknown, fields: string[], target: Set<string>): void {
  if (!isRecord(record)) return;
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) target.add(value);
    else if (Array.isArray(value)) for (const item of value) if (typeof item === 'string' && item.trim()) target.add(item);
  }
}

/** Cross-module ids (`cafeFlow:Order`) resolve on their local part; same-module ids must be known. */
export function isKnownEntityRef(ref: string, knownIds: Set<string>): boolean {
  if (knownIds.has(ref)) return true;
  const colon = ref.indexOf(':');
  return colon > 0; // qualified cross-module ref — accepted, owned by another module's ontology
}

/** Wrap a stray single string into an array for statusEnum/lifecycleStates (models sometimes do this). */
export function coerceOntologyEnumArrays(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const ontology = isRecord(value.ontology) ? value.ontology : undefined;
  const entities = ontology && isRecord(ontology.entities) ? ontology.entities : undefined;
  if (!entities) return value;
  for (const entityValue of Object.values(entities)) {
    if (!isRecord(entityValue)) continue;
    for (const key of ['statusEnum', 'lifecycleStates']) {
      const current = entityValue[key];
      if (current === undefined || Array.isArray(current)) continue;
      if (typeof current === 'string' && current.trim()) entityValue[key] = [current.trim()];
      else delete entityValue[key];
    }
  }
  return value;
}
