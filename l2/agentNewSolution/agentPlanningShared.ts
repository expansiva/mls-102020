/// <mls fileReference="_102020_/l2/agentNewSolution/agentPlanningShared.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { getAgentStepByAgentName, getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  getDiscoverSolutionScopeOutput,
  wantsInitialMetricsDashboard,
} from '/_102020_/l2/agentNewSolution/agentDiscoverSolutionScope.js';
import type { DiscoverSolutionScopeOutput } from '/_102020_/l2/agentNewSolution/agentDiscoverSolutionScope.js';
import {
  getRecommendImplementationsOutput,
} from '/_102020_/l2/agentNewSolution/agentRecommendImplementations.js';
import type { RecommendImplementationsOutput } from '/_102020_/l2/agentNewSolution/agentRecommendImplementations.js';
import {
  getRequirementsClarificationAnswer,
} from '/_102020_/l2/agentNewSolution/agentNewSolutionRequirements.js';
import type {
  ImplementationDecisionResult,
  RequirementsClarificationAnswer,
} from '/_102020_/l2/agentNewSolution/agentNewSolutionRequirements.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution/agentNewSolutionPlan.js';
import {
  extractPlannerOutput,
  parseMaybeJson,
  PLANNER_SCHEMA_VERSION as PLANNER_SCHEMA_VERSION_VALUE,
  type PlannerExtractConfig,
  type PlannerOutput,
} from '/_102020_/l2/agentNewSolution/agentPlanningExtract.js';
import {
  getApprovedModuleName,
  readAllNewSolutionStepOutputs,
  readSavedPlanArtifactDataList,
} from '/_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.js';
import type { NewSolutionStepOutputRecord } from '/_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.js';

export {
  PLANNER_SCHEMA_VERSION,
  assertArray,
  assertPriority,
  assertRecord,
  assertString,
  assertStringArray,
  createPlannerToolSchema,
  createPlannerVariableToolSchema,
  extractPlannerOutput,
  isRecord,
  normalizeStringList,
  optionalString,
  parseMaybeJson,
} from '/_102020_/l2/agentNewSolution/agentPlanningExtract.js';
export type {
  PlannerExtractConfig,
  PlannerOutput,
  PlannerStatus,
  Priority,
} from '/_102020_/l2/agentNewSolution/agentPlanningExtract.js';

export interface InitialNewSolutionPlanSummary {
  userLanguage: string;
  requestKind: string;
  moduleName: string;
  userPrompt: string;
  titles?: Record<string, string>;
  todoItems?: unknown[];
  openDetails?: unknown[];
}

export interface PlanningContextSnapshot {
  initialPlan: InitialNewSolutionPlanSummary;
  clarificationAnswer: RequirementsClarificationAnswer;
  discoveredScope: DiscoverSolutionScopeOutput;
  recommendations: RecommendImplementationsOutput;
  implementationDecisions: ImplementationDecisionResult;
  initialMetricsRequested: boolean;
}

export function createPlannerPromptReadyIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  toolSchema: mls.msg.LLMTool,
  toolName: string,
): mls.msg.AgentIntentPromptReady {
  if (!context.task) throw new Error('[createPlannerPromptReadyIntent] task invalid');

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
    toolChoice: {
      type: 'function',
      function: { name: toolName },
    },
  };
}

export function createPlannerUpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
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

//#region F-06: canonical step-output hydration cache
// The task keeps only orchestration + in-flight payloads; completed payloads are cleaned
// (cleaner 'input_output') AFTER the canonical copy in l2/{module}/outputs/ is verified.
// Sync getters stay sync: hooks call hydrateNewSolutionOutputs(context) (async, once per task)
// and the getters fall back to this cache when a step payload is no longer in the task.

const hydratedOutputsByTask = new WeakMap<object, NewSolutionStepOutputRecord[]>();

/** Loads every canonical output of the run into the per-task cache. Never throws; safe to call
 * at the start of any hook (no-op when the task or the approved module name do not exist yet). */
export async function hydrateNewSolutionOutputs(context: mls.msg.ExecutionContext): Promise<void> {
  try {
    if (!context.task) return;
    const moduleName = getApprovedModuleName(context);
    if (!moduleName) return;
    const records = await readAllNewSolutionStepOutputs(moduleName);
    hydratedOutputsByTask.set(context.task as object, records);
  } catch (error) {
    console.warn('[hydrateNewSolutionOutputs] skipped:', error);
  }
}

function getHydratedRecords(context: mls.msg.ExecutionContext): NewSolutionStepOutputRecord[] {
  if (!context.task) return [];
  return hydratedOutputsByTask.get(context.task as object) || [];
}

/**
 * Public accessor for CUSTOM getters that read step payloads directly (outside getPlannerOutput).
 * Without this fallback a cleaned payload makes them throw "payload not found" (regression seen
 * on getDiscoverSolutionScopeOutput at the recommend-implementations step, 2026-06-12).
 */
export function getHydratedStepPayload(context: mls.msg.ExecutionContext, agentName: string, stepId?: number): unknown {
  return getHydratedPayload(context, agentName, stepId);
}

/** Latest hydrated payload for an agent (optionally pinned to a stepId). */
function getHydratedPayload(context: mls.msg.ExecutionContext, agentName: string, stepId?: number): unknown {
  let best: NewSolutionStepOutputRecord | undefined;
  for (const record of getHydratedRecords(context)) {
    if (record.agentName !== agentName) continue;
    if (stepId !== undefined && record.stepId === stepId) return record.payload;
    if (!best || record.stepId > best.stepId) best = record;
  }
  return stepId !== undefined ? undefined : best?.payload;
}

//#endregion

export function getPlannerOutput<T>(
  context: mls.msg.ExecutionContext,
  agentName: string,
  config: PlannerExtractConfig<T>,
  validate?: (output: PlannerOutput<T>) => void,
): PlannerOutput<T> {
  if (!context.task) throw new Error('[getPlannerOutput] task invalid');

  const agentStep = getAgentStepByAgentName(context.task, agentName) as mls.msg.AIAgentStep | null;
  if (!agentStep) throw new Error(`[getPlannerOutput] ${agentName} step not found`);

  // F-06: payload-first (in-flight steps), canonical outputs cache as fallback (cleaned steps).
  const payload = agentStep.interaction?.payload?.[0] ?? getHydratedPayload(context, agentName, agentStep.stepId) ?? getHydratedPayload(context, agentName);
  if (!payload) throw new Error(`[getPlannerOutput] ${agentName} payload not found (task and outputs/ both empty — was hydrateNewSolutionOutputs awaited?)`);

  const output = extractPlannerOutput(payload, config);
  validate?.(output);
  return output;
}

export function getPlannerOutputs<T>(
  context: mls.msg.ExecutionContext,
  agentName: string,
  config: PlannerExtractConfig<T>,
  validate?: (output: PlannerOutput<T>) => void,
): PlannerOutput<T>[] {
  if (!context.task) throw new Error('[getPlannerOutputs] task invalid');

  const allSteps = getAllSteps(context.task.iaCompressed?.nextSteps);
  const outputs: PlannerOutput<T>[] = [];

  for (const step of allSteps) {
    if (step.type !== 'agent' || (step as mls.msg.AIAgentStep).agentName !== agentName) continue;
    // F-06: cleaned steps fall back to their canonical output (matched by stepId).
    const payload = step.interaction?.payload?.[0] ?? getHydratedPayload(context, agentName, step.stepId);
    if (!payload) continue;
    const output = extractPlannerOutput(payload, config);
    validate?.(output);
    outputs.push(output);
  }

  return outputs;
}

/**
 * read fan-out definition outputs preferring task payloads, falling back
 * to the saved .defs.ts artifacts when the payload was cleared with cleaner="input_output".
 * Saved artifacts are reconstructed into PlannerOutput via config.normalizeResult; task payloads
 * override file copies (more recent within the same run). Results are deduped/sorted by getId.
 */
export async function getPlannerOutputsWithFileFallback<T>(
  context: mls.msg.ExecutionContext,
  agentName: string,
  artifactType: string,
  config: PlannerExtractConfig<T>,
  getId: (output: PlannerOutput<T>) => string,
  validate?: (output: PlannerOutput<T>) => void,
): Promise<PlannerOutput<T>[]> {
  const byId = new Map<string, PlannerOutput<T>>();

  for (const data of await readSavedPlanArtifactDataList(context, artifactType)) {
    let output: PlannerOutput<T>;
    try {
      output = {
        runId: 'from-file',
        stepId: config.stepId,
        schemaVersion: PLANNER_SCHEMA_VERSION_VALUE,
        status: 'ok',
        result: config.normalizeResult(data),
        questions: [],
        trace: [],
      };
      validate?.(output);
    } catch {
      continue;
    }
    byId.set(getId(output), output);
  }

  for (const output of getPlannerOutputs(context, agentName, config, validate)) {
    byId.set(getId(output), output);
  }

  return [...byId.values()].sort((a, b) => getId(a).localeCompare(getId(b)));
}

export function findStepByPlanId(context: mls.msg.ExecutionContext, planId: string): mls.msg.AIPayload | null {
  if (!context.task) throw new Error('[findStepByPlanId] task invalid');
  const allSteps = getAllSteps(context.task.iaCompressed?.nextSteps);
  return allSteps.find(step => (step as any).planning?.planId === planId) || null;
}

export function createDynamicAgentStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  agentName: string,
  planId: string,
  stepTitle: string,
  args: string,
  parentInsertStep?: mls.msg.AIAgentStep,
): mls.msg.AgentIntentAddStep {
  const parentPlanning = (parentStep as any).planning;
  const dependencyPlanId = parentPlanning?.dynamicSource?.sourcePlanId || parentPlanning?.planId || '';
  const insertParent = parentInsertStep || parentStep;

  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: insertParent.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle,
      status: 'waiting_human_input',
      nextSteps: [],
      agentName,
      prompt: args,
      rags: [],
      planning: {
        planId,
        dependsOn: dependencyPlanId ? [dependencyPlanId] : [],
        executionMode: 'sequential',
        executionHost: 'client',
      },
    } as mls.msg.AIAgentStep,
  };
}

export function createParallelDynamicAgentStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  agentName: string,
  planId: string,
  stepTitle: string,
  args: string[],
  maxParallel: number = 5,
): mls.msg.AgentIntentAddStep {
  if (!context.task) throw new Error('[createParallelDynamicAgentStepIntent] task invalid');
  if (args.length === 0) throw new Error('[createParallelDynamicAgentStepIntent] args empty');

  const parentPlanning = (parentStep as any).planning;
  const dependencyPlanId = parentPlanning?.dynamicSource?.sourcePlanId || parentPlanning?.planId || '';

  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    parentStepId: parentStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: {
        input: [{
          type: 'system',
          content: '<!-- modelType: codeinstruct -->',
        }],
        cost: 0,
        trace: [`queued ${args.length} parallel dynamic args for ${agentName}`],
        payload: null,
      },
      stepTitle,
      status: 'in_progress',
      nextSteps: [],
      agentName,
      prompt: JSON.stringify({ planId }),
      rags: [],
      planning: {
        planId,
        dependsOn: dependencyPlanId ? [dependencyPlanId] : [],
        executionMode: 'parallel_dynamic',
        executionHost: 'client',
        dynamicSource: parentPlanning?.dynamicSource,
      },
    } as mls.msg.AIAgentStep,
    executionMode: {
      type: 'parallel',
      args,
      maxParallel,
    },
  };
}

// Platform baseline skill — capabilities the platform already provides (auth/RBAC, i18n,
// multi-tenant, file storage, LLM proxy, ...). Injected into the decision agents' system prompt so
// they reference these instead of (re)planning modules/horizontals for them. Read once from
// l2/agentNewSolution/skills/platform.md in the agent project (102020); cached for the session.
let _platformSkillCache: string | null = null;
export async function readPlatformSkill(): Promise<string> {
  if (_platformSkillCache !== null) return _platformSkillCache;
  try {
    const key = mls.stor.getKeyToFile({ project: 102020, level: 2, folder: 'agentNewSolution/skills', shortName: 'platform', extension: '.md' });
    const file = mls.stor.files[key];
    const raw = file ? await file.getContent() : '';
    _platformSkillCache = typeof raw === 'string' ? raw : '';
  } catch {
    _platformSkillCache = '';
  }
  return _platformSkillCache;
}

/** Appends the platform baseline to a system prompt (no-op when the skill file is missing). */
export function withPlatformSkill(systemPrompt: string, platformSkill: string): string {
  return platformSkill ? `${systemPrompt}\n\n${platformSkill}` : systemPrompt;
}

//#region T-006: parallel_dynamic fan-out reconciliation (E-007/E-008)

export const MAX_FAN_OUT_RECONCILE_ROUNDS = 2;
const FAN_OUT_TERMINAL_STATUSES: mls.msg.AIStepStatus[] = ['completed', 'failed'];

export interface FanOutReconcileOptions {
  /** Selectors frozen in the approved index (one definition artifact expected per selector). */
  expectedSelectors: string[];
  /** Selector ids already materialized as saved artifacts (from the plan artifacts manifest). */
  savedSelectors: Set<string>;
}

/**
 * T-006: reconcile a parallel_dynamic fan-out against the approved index selectors.
 * Called from a definition child's afterPromptStep AFTER its own artifact save. When this child
 * is the last live one and selectors are missing from the manifest, re-spawn a smaller fan-out
 * with only the missing selectors (max MAX_FAN_OUT_RECONCILE_ROUNDS rounds). When rounds are
 * exhausted and selectors are still missing, fail the fan-out step listing them instead of
 * letting the orchestrator complete it silently with partial coverage.
 * The returned intents MUST be placed BEFORE the child's own update-status intent, so the
 * fan-out step always keeps a non-terminal child and is not auto-finalized by the orchestrator.
 */
export function reconcileParallelDynamicFanOut(
  context: mls.msg.ExecutionContext,
  fanOutStep: mls.msg.AIAgentStep,
  currentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  options: FanOutReconcileOptions,
): mls.msg.AgentIntent[] {
  const planning = (fanOutStep as any)?.planning;
  if (planning?.executionMode !== 'parallel_dynamic') return [];

  // Finished children are deleted by the backend; queued/pre-allocated ones are non-terminal.
  // Only the last live child (every visible sibling terminal) runs the reconciliation.
  const siblings = (fanOutStep.nextSteps || []).filter(child => child.stepId !== currentStep.stepId);
  if (siblings.some(child => !FAN_OUT_TERMINAL_STATUSES.includes(child.status))) return [];

  const missing = options.expectedSelectors.filter(selector => selector && !options.savedSelectors.has(selector));
  if (missing.length === 0) return [];

  const planId = String(planning?.planId || '');
  const planIdBase = planId.split(':reconcile:')[0];
  const roundMatch = /:reconcile:(\d+)$/.exec(planId);
  const round = roundMatch ? Number(roundMatch[1]) : 0;

  if (round >= MAX_FAN_OUT_RECONCILE_ROUNDS) {
    const traceMsg = `fan-out ${planIdBase} incomplete after ${round} reconcile round(s); missing selectors: ${missing.join(', ')}`;
    console.error(`[reconcileParallelDynamicFanOut] ${traceMsg}`);
    const fanOutParent = findParentStepOfStep(context, fanOutStep.stepId);
    const parentForUpdate = (fanOutParent && fanOutParent.type === 'agent' ? fanOutParent : fanOutStep) as mls.msg.AIAgentStep;
    return [createPlannerUpdateStatusIntent(context, parentForUpdate, fanOutStep, hookSequential, 'failed', traceMsg)];
  }

  console.warn(`[reconcileParallelDynamicFanOut] ${planIdBase}: re-spawning ${missing.length} missing selector(s), round ${round + 1}: ${missing.join(', ')}`);
  return [
    createParallelDynamicAgentStepIntent(
      context,
      fanOutStep,
      currentStep.agentName,
      `${planIdBase}:reconcile:${round + 1}`,
      `${fanOutStep.stepTitle || planIdBase} (retry ${round + 1})`,
      missing,
      5,
    ),
  ];
}

//#endregion

// critic/repair checkpoint support for plan indices.
export const CRITIC_PLAN_INDEX_AGENT_NAME = 'agentCriticPlanIndex';
export const REPAIR_PLAN_INDEX_AGENT_NAME = 'agentRepairPlanIndex';
export const MAX_PLAN_INDEX_CRITIC_ATTEMPTS = 3; // initial critic + up to 2 repair/critic rounds

export interface PlanIndexReviewArgs {
  indexName: string;
  attempt: number;
}

export function buildPlanIndexReviewArgs(indexName: string, attempt: number): string {
  return JSON.stringify({ indexName, attempt });
}

export function parsePlanIndexReviewArgs(args: string | undefined): PlanIndexReviewArgs {
  const parsed = parseMaybeJson(args || '');
  if (!isRecordValue(parsed)) throw new Error(`[parsePlanIndexReviewArgs] invalid args: ${args}`);
  const indexName = typeof parsed.indexName === 'string' ? parsed.indexName : '';
  const attempt = typeof parsed.attempt === 'number' && parsed.attempt > 0 ? parsed.attempt : 1;
  if (!indexName) throw new Error(`[parsePlanIndexReviewArgs] missing indexName in args: ${args}`);
  return { indexName, attempt };
}

export function repairPlanIndexToolName(indexName: string): string {
  const safe = indexName.replace(/[^a-zA-Z0-9]/g, '');
  return `submitRepaired${safe.charAt(0).toUpperCase()}${safe.slice(1)}`;
}

/**
 * Resolves the INDEX step for a critic/repair child. The hooks' parentStep is trusted only when
 * it really is the index step (same agentName); otherwise the step is found by the source agent
 * name. Defense for orchestration variants where afterPromptStep hooks carried the step itself
 * as parent (server-side scheduler) — that nested review steps under each other and deadlocked
 * the approval loop (task5 metricsIndex incident, 2026-06-11).
 */
export function resolveIndexStepForReview(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  sourceAgentName: string,
): mls.msg.AIAgentStep {
  if (parentStep && parentStep.type === 'agent' && parentStep.agentName === sourceAgentName) return parentStep;
  if (!context.task) return parentStep;
  const found = getAgentStepByAgentName(context.task, sourceAgentName) as mls.msg.AIAgentStep | null;
  if (found && found.type === 'agent') {
    console.warn(`[resolveIndexStepForReview] hook parentStep (${parentStep?.stepId}/${parentStep?.agentName}) is not the index step; resolved ${sourceAgentName} -> step ${found.stepId}`);
    return found;
  }
  return parentStep;
}

/**
 * Creates the critic step as a direct child of the index step.
 * The index step must stay non-terminal (in_progress) while critic/repair children run,
 * so downstream steps that depend on the index planId remain locked until approval.
 */
export function createPlanIndexReviewStepIntent(
  context: mls.msg.ExecutionContext,
  indexStep: mls.msg.AIAgentStep,
  agentName: string,
  indexName: string,
  attempt: number,
  stepTitle: string,
): mls.msg.AgentIntentAddStep {
  const kind = agentName === REPAIR_PLAN_INDEX_AGENT_NAME ? 'repair' : 'critic';
  return createDynamicAgentStepIntent(
    context,
    indexStep,
    agentName,
    `plan-index-${kind}:${indexName}:${attempt}`,
    stepTitle,
    buildPlanIndexReviewArgs(indexName, attempt),
  );
}

/** Intents returned by an index agent to hold the step open and start the critic checkpoint. */
export function createHoldIndexForReviewIntents(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  indexStep: mls.msg.AIAgentStep,
  hookSequential: number,
  indexName: string,
): mls.msg.AgentIntent[] {
  return [
    createPlannerUpdateStatusIntent(
      context,
      parentStep,
      indexStep,
      hookSequential,
      'in_progress',
      `index generated; waiting critic/repair checkpoint for ${indexName}`,
    ),
    createPlanIndexReviewStepIntent(context, indexStep, CRITIC_PLAN_INDEX_AGENT_NAME, indexName, 1, `Review ${indexName} (critic 1)`),
  ];
}

export function findParentStepOfStep(context: mls.msg.ExecutionContext, stepId: number): mls.msg.AIPayload | null {
  if (!context.task) throw new Error('[findParentStepOfStep] task invalid');
  const allSteps = getAllSteps(context.task.iaCompressed?.nextSteps);
  for (const step of allSteps) {
    if (step.nextSteps?.some(child => child.stepId === stepId)) return step;
    if (step.interaction?.payload?.some(child => child.stepId === stepId)) return step;
  }
  return null;
}

export function findLatestPlanIndexReviewStep(
  context: mls.msg.ExecutionContext,
  agentName: string,
  indexName: string,
  onlyCompleted: boolean = true,
): mls.msg.AIAgentStep | null {
  if (!context.task) throw new Error('[findLatestPlanIndexReviewStep] task invalid');
  const allSteps = getAllSteps(context.task.iaCompressed?.nextSteps);
  let latest: mls.msg.AIAgentStep | null = null;

  for (const step of allSteps) {
    if (step.type !== 'agent') continue;
    const agentStep = step as mls.msg.AIAgentStep;
    if (agentStep.agentName !== agentName) continue;
    if (onlyCompleted && agentStep.status !== 'completed') {
      // A repair/critic may be held in_progress by the orchestrator's delayed-completion rule
      // even though its payload is final — accept it when the payload exists (task5 incident:
      // critics revalidated the ORIGINAL index because repairs never reached 'completed').
      // Failed steps are never accepted: their payload was rejected by validation.
      const hasPayload = !!agentStep.interaction?.payload?.length;
      if (agentStep.status === 'failed' || !hasPayload) continue;
    }
    try {
      const args = parsePlanIndexReviewArgs(agentStep.prompt);
      if (args.indexName !== indexName) continue;
    } catch {
      continue;
    }
    if (!latest || agentStep.stepId > latest.stepId) latest = agentStep;
  }

  return latest;
}

/**
 * read a plan index output preferring the latest completed repaired version.
 * Falls back to the original index agent payload when no repair step exists.
 */
export function getPlannerOutputWithRepair<T>(
  context: mls.msg.ExecutionContext,
  sourceAgentName: string,
  indexName: string,
  config: PlannerExtractConfig<T>,
  validate?: (output: PlannerOutput<T>) => void,
): PlannerOutput<T> {
  const repairStep = findLatestPlanIndexReviewStep(context, REPAIR_PLAN_INDEX_AGENT_NAME, indexName, true);
  // F-06: cleaned repair steps fall back to the canonical output (matched by stepId).
  const repairPayload = repairStep?.interaction?.payload?.[0]
    ?? (repairStep ? getHydratedPayload(context, REPAIR_PLAN_INDEX_AGENT_NAME, repairStep.stepId) : undefined);

  if (repairPayload) {
    const repairConfig: PlannerExtractConfig<T> = {
      ...config,
      toolName: repairPlanIndexToolName(indexName),
      stepId: `repair:${indexName}`,
      stepIdAliases: [config.stepId, ...(config.stepIdAliases || []), `repair:${indexName}`],
    };
    const output = extractPlannerOutput(repairPayload, repairConfig);
    validate?.(output);
    return output;
  }

  return getPlannerOutput(context, sourceAgentName, config, validate);
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ..009: token-reduction helpers. Each definition/index agent only needs the
// artifacts its selector references, not the full plan. These build reduced, per-item context.

/** Keep only records whose id (any of `keys`) is in `ids`. Non-records are dropped. */
export function pickRecordsByIds(items: unknown[] | undefined, ids: Set<string>, keys: string[]): unknown[] {
  if (!Array.isArray(items) || ids.size === 0) return [];
  return items.filter(item => {
    if (!isRecordValue(item)) return false;
    return keys.some(key => {
      const value = item[key];
      return typeof value === 'string' && ids.has(value);
    });
  });
}

/** Project records down to a small set of fields (drops everything else). */
export function summarizeRecords(items: unknown[] | undefined, keys: string[]): unknown[] {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (!isRecordValue(item)) return item;
    const summary: Record<string, unknown> = {};
    for (const key of keys) {
      if (item[key] !== undefined) summary[key] = item[key];
    }
    return Object.keys(summary).length > 0 ? summary : item;
  });
}

/**
 * (R1): compact view of the final solution plan for the index agents' prompts.
 * Drops the heavy parts (ontology entity `fields` by default, full approvedArtifacts bodies) and
 * keeps ids/titles/refs — which is all the index agents need to decide scope. Cuts the biggest
 * input contributor (the full final plan, ~29KB) to a few KB. Pass includeOntologyFields=true
 * only when a consumer genuinely needs field shapes.
 */
export function compactFinalPlan(finalPlanResultValue: unknown, includeOntologyFields: boolean = false): Record<string, unknown> {
  const finalPlanResult = isRecordValue(finalPlanResultValue) ? finalPlanResultValue : {};
  const ontology = isRecordValue(finalPlanResult.ontology) ? finalPlanResult.ontology : {};
  const entities = isRecordValue(ontology.entities) ? ontology.entities : {};
  const ontologyEntities: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entities)) {
    if (!isRecordValue(value)) { ontologyEntities[key] = value; continue; }
    ontologyEntities[key] = {
      title: value.title,
      kind: value.kind,
      ownership: value.ownership,
      statusEnum: value.statusEnum,
      lifecycleStates: value.lifecycleStates,
      ...(includeOntologyFields ? { fields: value.fields } : {}),
    };
  }
  const approved = isRecordValue(finalPlanResult.approvedArtifacts) ? finalPlanResult.approvedArtifacts : {};
  const summ = (value: unknown, keys: string[]) => summarizeRecords(Array.isArray(value) ? value : [], keys);

  return {
    module: finalPlanResult.module,
    actors: summ(finalPlanResult.actors, ['actorId', 'title']),
    capabilities: summ(finalPlanResult.capabilities, ['capabilityId', 'title', 'actor', 'priority']),
    userActions: summ(finalPlanResult.userActions, ['actionId', 'id', 'title', 'actor', 'capabilityId']),
    rules: summ(finalPlanResult.rules, ['ruleId', 'title']),
    ontologyEntities,
    approvedArtifacts: {
      pages: summ(approved.pages, ['pageId', 'id', 'title', 'actor']),
      workflows: summ(approved.workflows, ['workflowId', 'id', 'title', 'executionMode']),
      plugins: summ(approved.plugins, ['pluginId', 'id', 'provider']),
      agents: summ(approved.agents, ['agentId', 'id', 'title']),
      horizontalModules: summ(approved.horizontalModules, ['horizontalModuleId', 'id', 'title']),
      mdm: summ(approved.mdm, ['domainId', 'id', 'title']),
      metricTables: summ(approved.metricTables, ['metricTableId', 'id', 'title']),
      metricDashboards: summ(approved.metricDashboards, ['metricDashboardId', 'id', 'title', 'actor']),
      usecaseEntities: summ(approved.usecaseEntities, ['usecaseEntityId', 'id', 'title']),
    },
  };
}

/**
 * single source for the actor contract. All agents/validators compare against
 * `finalPlan.result.actors[].actorId` — never hard-coded names ("admin", "administrator", ...)
 * or translations. This keeps the flow language-agnostic (pt-BR/en-US/...). Pass the actors array.
 */
export function getActorIdSet(actors: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(actors)) return ids;
  for (const actor of actors) {
    if (isRecordValue(actor) && typeof actor.actorId === 'string' && actor.actorId.trim()) ids.add(actor.actorId);
  }
  return ids;
}

/**
 * T-001: data-owning ontology entities (mdmOwned/moduleOwned, or no ownership declared)
 * must declare at least one field — empty shapes break .defs.ts materialization (E-001).
 * Throws listing the offending entity ids.
 */
export function assertOntologyEntityFields(entities: Record<string, unknown>, source: string): void {
  const missing: string[] = [];
  for (const [entityId, value] of Object.entries(entities)) {
    if (!isRecordValue(value)) continue;
    const ownership = typeof value.ownership === 'string' ? value.ownership : '';
    const ownsData = !ownership || ownership === 'mdmOwned' || ownership === 'moduleOwned';
    if (!ownsData) continue;
    const fields = Array.isArray(value.fields) ? value.fields : [];
    if (fields.length === 0) missing.push(entityId);
  }
  if (missing.length > 0) {
    throw new Error(`${source}: ontology entities missing fields (mdmOwned/moduleOwned entities must declare at least one field): ${missing.join(', ')}`);
  }
}

/** Collect non-empty string values from the given fields of a record into a target set. */
export function collectStringRefs(record: unknown, fields: string[], target: Set<string>): void {
  if (!isRecordValue(record)) return;
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) target.add(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === 'string' && item.trim()) target.add(item);
    }
  }
}

export function getPlanningContextSnapshot(context: mls.msg.ExecutionContext): PlanningContextSnapshot {
  const clarificationAnswer = getRequirementsClarificationAnswer(context);
  return {
    initialPlan: getInitialNewSolutionPlanSummary(context),
    clarificationAnswer,
    discoveredScope: getDiscoverSolutionScopeOutput(context),
    recommendations: getRecommendImplementationsOutput(context),
    implementationDecisions: getImplementationDecisionResult(context),
    initialMetricsRequested: wantsInitialMetricsDashboard(clarificationAnswer),
  };
}

export function getInitialNewSolutionPlanSummary(context: mls.msg.ExecutionContext): InitialNewSolutionPlanSummary {
  if (!context.task) throw new Error('[getInitialNewSolutionPlanSummary] task invalid');

  const agentStep = getAgentStepByAgentName(context.task, 'agentNewSolution') as mls.msg.AIAgentStep | null;
  const payload = agentStep?.interaction?.payload?.[0] as mls.msg.AIFlexibleResultStep | undefined;
  const result = payload?.type === 'flexible' ? payload.result as InitialNewSolutionPlanSummary : undefined;

  if (!result || typeof result !== 'object') throw new Error('[getInitialNewSolutionPlanSummary] initial plan not found');
  if (!result.userPrompt || typeof result.userPrompt !== 'string') throw new Error('[getInitialNewSolutionPlanSummary] user prompt not found');
  result.moduleName = normalizeModuleFolderName(result.moduleName, result.userPrompt);
  return result;
}

export function getImplementationDecisionResult(context: mls.msg.ExecutionContext): ImplementationDecisionResult {
  if (!context.task) throw new Error('[getImplementationDecisionResult] task invalid');

  const allSteps = getAllSteps(context.task.iaCompressed?.nextSteps);
  const step = allSteps.find(item =>
    item.type === 'result' &&
    (item as any).planning?.planId === 'req-implementation-decisions' &&
    (item as mls.msg.AIResultStep).result
  ) as mls.msg.AIResultStep | undefined;

  if (!step?.result) throw new Error('[getImplementationDecisionResult] implementation decisions not found');
  const parsed = parseMaybeJson(step.result) as ImplementationDecisionResult;
  if (!parsed || !Array.isArray(parsed.decisions)) throw new Error('[getImplementationDecisionResult] invalid implementation decisions');
  return parsed;
}

export function hasAcceptedArtifact(decisions: ImplementationDecisionResult, artifactType: string): boolean {
  return decisions.decisions.some(item => item.artifactType === artifactType && item.accepted && item.decidedPriority !== 'never');
}

export function hasAcceptedNowArtifact(decisions: ImplementationDecisionResult, artifactType: string): boolean {
  return decisions.decisions.some(item => item.artifactType === artifactType && item.accepted && item.decidedPriority === 'now');
}
