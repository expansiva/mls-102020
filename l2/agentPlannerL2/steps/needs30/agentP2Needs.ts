/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/agentP2Needs.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { displayPath, readJson, writeJson } from '/_102035_/l2/solution/fs.js';
import {
  readPoolMessage,
  tracePoolAt,
  writePoolMessage,
  type PoolMessage,
} from '/_102035_/l2/solution/pool.js';
import {
  P2_MENU_DEVICE,
  markP2Complete,
  markP2Step,
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
import { loadP2MenuSources } from '/_102020_/l2/agentPlannerL2/steps/menu20/agentP2Menu.js';
import type { P2MenuFile } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { receivedPoolFile } from '/_102020_/l2/agentPlannerL2/steps/requests50/agentP2Requests.js';
import {
  buildP2NeedsFile,
  buildP2NeedsMessage,
  type P2NeedsFile,
} from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import {
  formatP2NeedsGate,
  validateP2Needs,
} from '/_102020_/l2/agentPlannerL2/steps/needs30/gate.js';

export interface P2DeliverNeedsResult {
  needs: P2NeedsFile;
  needsPath: string;
  message: PoolMessage;
  messagePath: string;
}

export async function executeP2Needs(moduleName: string, now: Date): Promise<P2DeliverNeedsResult> {
  const pipeline = await requirePipeline(moduleName);
  const menu = await readJson<P2MenuFile>(p2MenuFile(moduleName, pipeline.device || P2_MENU_DEVICE));
  if (!menu) throw new Error(`pool/l2/${pipeline.device || P2_MENU_DEVICE}/menu.json is missing; menu20 must run first.`);
  const menuSources = await loadP2MenuSources(moduleName);
  const needs = buildP2NeedsFile({
    menu,
    sources: menuSources.sources,
    grants: menuSources.grants,
    processes: menuSources.processes,
    now,
  });
  const gate = validateP2Needs(needs, menu, menuSources.sources);
  if (!gate.ok) throw new Error(formatP2NeedsGate(gate.issues));

  const receivedFile = receivedPoolFile(moduleName, pipeline.messageFile);
  const received = await readPoolMessage(receivedFile);
  const message = buildP2NeedsMessage({ file: needs, received });
  const needsInfo = p2NeedsFile(moduleName, needs.device);
  const needsPath = await writeJson(needsInfo, needs);
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
  return { needs, needsPath, message, messagePath };
}

export async function beforeP2NeedsPromptStep(
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
    if (!moduleName) throw new Error('needs30 needs a moduleName.');
    const mutationParent = findOpenParent(context, parentStep);
    const delivered = await executeP2Needs(moduleName, new Date());
    await writeApproved(moduleName, [delivered.needsPath, delivered.messagePath]);
    return [
      doneAnchor(context, mutationParent, moduleName, [delivered.needsPath, delivered.messagePath]),
      updateStatus(
        context,
        mutationParent,
        step,
        hookSequential,
        'completed',
        `needs30 wrote ${delivered.needsPath}`,
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

export async function afterP2NeedsPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'needs30 already recorded.')];
}

async function requirePipeline(moduleName: string): Promise<P2PipelineState> {
  const pipeline = await readP2Pipeline(moduleName);
  if (!pipeline) throw new Error(`l2 pipeline.json is missing for ${moduleName}; entry10 must run first.`);
  return pipeline;
}

async function writeApproved(moduleName: string, artifactPaths: string[]): Promise<void> {
  const pipeline = await requirePipeline(moduleName);
  const updated = markP2Step(pipeline, 'needs30', {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths,
  });
  await writeJson(p2PipelineFile(moduleName), markP2Complete(updated));
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readP2Pipeline(moduleName);
    if (!pipeline) return;
    await writeJson(p2PipelineFile(moduleName), markP2Step(pipeline, 'needs30', {
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
    stepTitle: 'Needs done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName,
      artifactPaths,
      completedStep: 'needs30',
    }),
    planning: { planId: 'needs30-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

P2_STEP_HOOKS.needs30 = {
  beforePromptStep: beforeP2NeedsPromptStep,
  afterPromptStep: afterP2NeedsPromptStep,
};
