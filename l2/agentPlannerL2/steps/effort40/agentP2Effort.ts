/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/effort40/agentP2Effort.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  displayPath,
  ontologyEntityFile,
  ontologyIndexFile,
  readDefsJson,
  readJson,
  writeJson,
} from '/_102035_/l2/solution/fs.js';
import {
  readPoolMessage,
  tracePoolAt,
  writePoolMessage,
  type PoolMessage,
} from '/_102035_/l2/solution/pool.js';
import {
  P2_MENU_DEVICE,
  isP2CandidateRoot,
  markP2Complete,
  markP2Step,
  p2BackendFile,
  p2CanonicalMenuFile,
  p2EffortFile,
  p2L4DiffFile,
  p2MenuFile,
  p2NeedsFile,
  p2PipelineFile,
  readP2Pipeline,
  type P2PipelineState,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  P2_STEP_HOOKS,
  drainWaitingSiblings,
  updateStatus,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import type { P2MenuFile } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import type { P2NeedsFile } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { receivedPoolFile } from '/_102020_/l2/agentPlannerL2/steps/requests50/agentP2Requests.js';
import {
  buildP2EffortFile,
  buildP2EffortMessage,
  parseP2BackendFile,
  parseP2L4DiffFile,
  p2EntityRulesMap,
  type P2BuildEffortCandidate,
  type P2EffortFile,
  type P2EffortUnattributed,
} from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';
import {
  formatP2EffortGate,
  validateP2Effort,
} from '/_102020_/l2/agentPlannerL2/steps/effort40/gate.js';

export interface P2DeliverEffortResult {
  effort: P2EffortFile;
  effortPath: string;
  message: PoolMessage;
  messagePath: string;
}

export async function executeP2Effort(moduleName: string, now: Date): Promise<P2DeliverEffortResult> {
  const pipeline = await requirePipeline(moduleName);
  const device = pipeline.device || P2_MENU_DEVICE;
  const menu = await readJson<P2MenuFile>(p2MenuFile(moduleName, device));
  if (!menu) throw new Error(`pool/l2/${device}/menu.json is missing; the menu flow must run first.`);
  const rawBackend = await readJson<unknown>(p2BackendFile(moduleName, device));
  if (rawBackend === null) throw new Error(`pool/l2/${device}/backend.json is missing; the l1 plan must run first.`);
  const backend = parseP2BackendFile(rawBackend);
  const candidate = await loadCandidateEffort(moduleName, device);
  const effort = buildP2EffortFile({ menu, backend, now, candidate });
  const gate = validateP2Effort(effort, menu, { screenStatusFromAction: !candidate });
  if (!gate.ok) throw new Error(formatP2EffortGate(gate.issues));

  const receivedFile = receivedPoolFile(moduleName, pipeline.messageFile);
  const received = await readPoolMessage(receivedFile);
  const message = buildP2EffortMessage({ file: effort, received });
  const effortInfo = p2EffortFile(moduleName, effort.device);
  const effortPath = await writeJson(effortInfo, effort);
  const messageInfo = await writePoolMessage(moduleName, message, now);
  const messagePath = displayPath(messageInfo);
  await tracePoolAt(p2PipelineFile(moduleName), {
    at: now.toISOString(),
    file: messagePath,
    from: message.from,
    to: message.to,
    thread: message.thread,
    round: message.round,
    mode: message.mode,
    outcome: 'delivered',
  });
  return { effort, effortPath, message, messagePath };
}

export async function beforeP2EffortPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    moduleName = resolveModuleName(context, args || step.prompt);
    if (!moduleName) throw new Error('effort40 needs a moduleName.');
    const mutationParent = findOpenParent(context, parentStep);
    const delivered = await executeP2Effort(moduleName, new Date());
    await writeApproved(moduleName, [delivered.effortPath, delivered.messagePath], delivered.effort.unattributed);
    return [
      doneAnchor(context, mutationParent, moduleName, [delivered.effortPath, delivered.messagePath]),
      updateStatus(
        context,
        mutationParent,
        step,
        hookSequential,
        'completed',
        `effort40 wrote ${delivered.effortPath}`,
      ),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

export async function afterP2EffortPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'effort40 already recorded.')];
}

async function requirePipeline(moduleName: string): Promise<P2PipelineState> {
  const pipeline = await readP2Pipeline(moduleName);
  if (!pipeline) throw new Error(`l2 pipeline.json is missing for ${moduleName}; entry10 must run first.`);
  return pipeline;
}

async function writeApproved(
  moduleName: string,
  artifactPaths: string[],
  unattributed: readonly P2EffortUnattributed[],
): Promise<void> {
  const pipeline = await requirePipeline(moduleName);
  const extra = unattributed.map(item => `unattributed ${item.changeId}: ${item.reason}`);
  const warnings = extra.length ? [...(pipeline.warnings || []), ...extra] : pipeline.warnings;
  const updated = markP2Step({ ...pipeline, warnings }, 'effort40', {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths,
  });
  await writeJson(p2PipelineFile(moduleName), markP2Complete(updated));
}

async function loadCandidateEffort(moduleName: string, device: typeof P2_MENU_DEVICE): Promise<P2BuildEffortCandidate | undefined> {
  if (!isP2CandidateRoot(moduleName)) return undefined;
  const rawDiff = await readJson<unknown>(p2L4DiffFile(moduleName, device));
  if (rawDiff === null) throw new Error(`pool/l2/${device}/l4diff.json is missing; the l4 candidate diff must run first.`);
  const needs = await readJson<P2NeedsFile>(p2NeedsFile(moduleName, device));
  if (!needs) throw new Error(`pool/l1/${device}/needs.json is missing; the menu flow must run first.`);
  const canonicalMenu = await readJson<P2MenuFile>(p2CanonicalMenuFile(moduleName, device));
  const entityRules = await loadEntityRules(moduleName);
  return {
    canonicalMenu,
    l4diff: parseP2L4DiffFile(rawDiff),
    needs,
    entityRules,
  };
}

async function loadEntityRules(moduleName: string): Promise<Map<string, readonly string[]>> {
  const index = await readDefsJson<{ entities?: { entityId?: string }[] }>(ontologyIndexFile(moduleName));
  const rows: { entityId: string; rules?: string[] }[] = [];
  for (const row of index?.entities || []) {
    const entityId = typeof row.entityId === 'string' ? row.entityId.trim() : '';
    if (!entityId) continue;
    const entity = await readDefsJson<{ rules?: unknown }>(ontologyEntityFile(moduleName, entityId));
    const rules = Array.isArray(entity?.rules)
      ? entity.rules.filter((item): item is string => typeof item === 'string' && !!item.trim()).map(item => item.trim())
      : [];
    rows.push({ entityId, rules });
  }
  return p2EntityRulesMap(rows);
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readP2Pipeline(moduleName);
    if (!pipeline) return;
    await writeJson(p2PipelineFile(moduleName), markP2Step(pipeline, 'effort40', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
    }));
  } catch { /* task trace remains the fallback */ }
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  artifactPaths: string[],
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Effort done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName,
      artifactPaths,
      completedStep: 'effort40',
    }),
    planning: { planId: 'effort40-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function addStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

function findOpenParent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  const current = allSteps(context).find(item => item.stepId === parentStep.stepId);
  if (isOpenAgent(current)) return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function isOpenAgent(step: mls.msg.AIPayload | undefined): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function allSteps(context: mls.msg.ExecutionContext): mls.msg.AIPayload[] {
  const root = context.task?.iaCompressed?.nextSteps || [];
  const out: mls.msg.AIPayload[] = [];
  const walk = (steps: mls.msg.AIPayload[]) => {
    for (const step of steps) {
      out.push(step);
      if (step.nextSteps?.length) walk(step.nextSteps);
    }
  };
  walk(root);
  return out;
}

function resolveModuleName(context: mls.msg.ExecutionContext, value: unknown): string {
  const parsed = parseRecord(value);
  return text(parsed.moduleName) || memoryString(context, 'moduleName');
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

P2_STEP_HOOKS.effort40 = {
  beforePromptStep: beforeP2EffortPromptStep,
  afterPromptStep: afterP2EffortPromptStep,
};
