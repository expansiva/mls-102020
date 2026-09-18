/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/requests50/agentP2Requests.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { displayPath, moduleFile, readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import {
  deletePoolMessageAt,
  listPoolBox,
  readPoolMessage,
  tracePoolAt,
  writePoolMessage,
  type PoolMessage,
} from '/_102035_/l2/solution/pool.js';
import {
  markP2Step,
  p2DraftFile,
  p2PipelineFile,
  readP2Pipeline,
  type P2PipelineState,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  P2_STEP_HOOKS,
  drainWaitingSiblings,
  updateStatus,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import { loadP2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/agentP2Workspaces.js';
import type { P2WorkspacesDraft } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  collectP2FieldCatalog,
  fieldByPath,
  type P2ContractsDraft,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import {
  buildP2L1Requests,
  p2RequestNow,
} from '/_102020_/l2/agentPlannerL2/steps/requests50/contracts.js';
import {
  formatP2RequestGate,
  validateP2Requests,
} from '/_102020_/l2/agentPlannerL2/steps/requests50/gate.js';

export interface P2DeliveredRequest {
  file: Ns5FileInfo;
  path: string;
  message: PoolMessage;
}

export interface P2DeliverRequestsInput {
  moduleName: string;
  receivedFile: Ns5FileInfo;
  received: PoolMessage;
  requests: readonly PoolMessage[];
  now: Date;
}

export interface P2DeliverRequestsResult {
  written: P2DeliveredRequest[];
  processedTraceId: string;
  deliveredTraceIds: string[];
}

export function receivedPoolFile(moduleName: string, messageFile: string): Ns5FileInfo {
  const found = listPoolBox(moduleName, 'l2').find(file => displayPath(file) === messageFile);
  if (!found) throw new Error(`pool/l2 message not found: ${messageFile}`);
  return found;
}

/**
 * Write every pool/l1 request, then trace on the l2 pipeline, then delete the
 * pool/l2 message. Any throw before the delete leaves the received message in place.
 */
export async function deliverP2Requests(input: P2DeliverRequestsInput): Promise<P2DeliverRequestsResult> {
  const pipelineInfo = p2PipelineFile(input.moduleName);
  const written: P2DeliveredRequest[] = [];
  for (let index = 0; index < input.requests.length; index += 1) {
    const file = await writePoolMessage(input.moduleName, input.requests[index], p2RequestNow(input.now, index));
    written.push({ file, path: displayPath(file), message: input.requests[index] });
  }

  const at = input.now.toISOString();
  const receivedPath = displayPath(input.receivedFile);
  const processedTraceId = await tracePoolAt(pipelineInfo, {
    at,
    file: receivedPath,
    from: input.received.from,
    to: input.received.to,
    thread: input.received.thread,
    round: input.received.round,
    mode: input.received.mode,
    outcome: 'processed',
  });
  const deliveredTraceIds: string[] = [];
  for (const item of written) {
    deliveredTraceIds.push(await tracePoolAt(pipelineInfo, {
      at,
      file: item.path,
      from: item.message.from,
      to: item.message.to,
      thread: item.message.thread,
      round: item.message.round,
      mode: item.message.mode,
      outcome: 'delivered',
    }));
  }

  await deletePoolMessageAt(pipelineInfo, input.receivedFile, processedTraceId);
  return { written, processedTraceId, deliveredTraceIds };
}

export async function executeP2Requests(moduleName: string, now: Date): Promise<P2DeliverRequestsResult> {
  const pipeline = await requirePipeline(moduleName);
  const receivedFile = receivedPoolFile(moduleName, pipeline.messageFile);
  const received = await readPoolMessage(receivedFile);
  const workspaces = await readJson<P2WorkspacesDraft>(p2DraftFile(moduleName, 'workspaces20'));
  if (!workspaces) throw new Error('workspaces20-draft.json is missing; workspaces20 must run first.');
  const contracts = await readJson<P2ContractsDraft>(p2DraftFile(moduleName, 'contracts30'));
  if (!contracts) throw new Error('contracts30-draft.json is missing; contracts30 must run first.');
  const sources = await loadP2L4Sources(moduleName);
  const requests = buildP2L1Requests({
    project: moduleFile(moduleName).project,
    moduleName,
    received,
    contracts,
    workspaces,
    sources,
    catalog: fieldByPath(collectP2FieldCatalog(sources)),
  });
  const gate = validateP2Requests(requests, contracts, received);
  if (!gate.ok) throw new Error(formatP2RequestGate(gate.issues));
  return deliverP2Requests({ moduleName, receivedFile, received, requests, now });
}

export async function beforeP2RequestsPromptStep(
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
    if (!moduleName) throw new Error('requests50 needs a moduleName.');
    const mutationParent = findOpenParent(context, parentStep);
    const delivered = await executeP2Requests(moduleName, new Date());
    const artifactPaths = delivered.written.map(item => item.path);
    await writeApproved(moduleName, artifactPaths);
    return [
      doneAnchor(context, mutationParent, moduleName, artifactPaths),
      updateStatus(
        context,
        mutationParent,
        step,
        hookSequential,
        'completed',
        `requests50 delivered ${artifactPaths.length} pool/l1 messages`,
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

export async function afterP2RequestsPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'requests50 already recorded.')];
}

async function requirePipeline(moduleName: string): Promise<P2PipelineState> {
  const pipeline = await readP2Pipeline(moduleName);
  if (!pipeline) throw new Error(`l2 pipeline.json is missing for ${moduleName}; entry10 must run first.`);
  return pipeline;
}

async function writeApproved(moduleName: string, artifactPaths: string[]): Promise<void> {
  const pipeline = await requirePipeline(moduleName);
  const updated = markP2Step(pipeline, 'requests50', {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths,
  });
  await writeJson(p2PipelineFile(moduleName), {
    ...updated,
    status: 'complete',
    awaitingStep: undefined,
  });
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readP2Pipeline(moduleName);
    if (!pipeline) return;
    await writeJson(p2PipelineFile(moduleName), markP2Step(pipeline, 'requests50', {
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
    stepTitle: 'Requests done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName,
      artifactPaths,
      completedStep: 'requests50',
    }),
    planning: { planId: 'requests50-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

P2_STEP_HOOKS.requests50 = {
  beforePromptStep: beforeP2RequestsPromptStep,
  afterPromptStep: afterP2RequestsPromptStep,
};
