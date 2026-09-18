/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/shared40/agentP2Shared.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { moduleFile, readJson, writeJson } from '/_102035_/l2/solution/fs.js';
import {
  P2_STEP_IDS,
  createP2RetryStep,
  markP2Step,
  p2AgentFile,
  p2DraftFile,
  p2PipelineFile,
  readP2AgentText,
  readP2Pipeline,
  type P2PipelineState,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  P2_STEP_HOOKS,
  drainWaitingSiblings,
  updateStatus,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import {
  composeP2SystemPrompt,
  loadP2L4Sources,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/agentP2Workspaces.js';
import type { P2L4Sources, P2WorkspacesDraft } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  collectP2FieldCatalog,
  fieldByPath,
  unwrapP2ArtifactPayload,
  type P2ContractsDraft,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import { writeP2Text } from '/_102020_/l2/agentPlannerL2/steps/contracts30/agentP2Contracts.js';
import {
  assembleP2SharedDefinition,
  buildP2SharedTool,
  callsOf,
  collectP2SharedBases,
  deriveP2SharedBase,
  emitP2SharedDefs,
  normalizeP2SharedPayload,
  p2SharedFile,
  suggestP2SharedJudgment,
  type P2SharedDraft,
} from '/_102020_/l2/agentPlannerL2/steps/shared40/contracts.js';
import {
  formatP2SharedGate,
  validateP2Shared,
} from '/_102020_/l2/agentPlannerL2/steps/shared40/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;

interface SharedArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export function buildP2SharedHumanPrompt(input: {
  sources: P2L4Sources;
  workspaces: P2WorkspacesDraft;
  contracts: P2ContractsDraft;
  project: number;
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const catalog = fieldByPath(collectP2FieldCatalog(input.sources));
  const bases = collectP2SharedBases(input.workspaces, input.contracts, input.sources, input.project);
  const suggestions = input.workspaces.workspaces.map(workspace => suggestP2SharedJudgment(
    workspace,
    callsOf(input.contracts, workspace.workspaceId),
    catalog,
    input.workspaces.moduleName,
  ));
  return [
    `## userLanguage`,
    input.sources.userLanguage,
    '',
    '## Workspaces (already gated)',
    JSON.stringify(input.workspaces.workspaces, null, 2),
    '',
    '## Contracts (already gated; cite these calls only)',
    JSON.stringify(input.contracts.workspaces, null, 2),
    '',
    '## Derived base (code writes these keys; do not resubmit)',
    JSON.stringify(bases, null, 2),
    '',
    '## Mechanical starting cut (judgment you may keep or change)',
    JSON.stringify(suggestions, null, 2),
    input.gateFeedback ? `\n## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `\n## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(item => item !== '').join('\n');
}

export async function beforeP2SharedPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentPlannerL2:shared40] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const sources = await loadP2L4Sources(moduleName);
    const workspaces = await readJson<P2WorkspacesDraft>(p2DraftFile(moduleName, 'workspaces20'));
    if (!workspaces) throw new Error('workspaces20-draft.json is missing; workspaces20 must run first.');
    const contracts = await readJson<P2ContractsDraft>(p2DraftFile(moduleName, 'contracts30'));
    if (!contracts) throw new Error('contracts30-draft.json is missing; contracts30 must run first.');
    const [skill, prompt, schema, previous] = await Promise.all([
      readP2AgentText('skills', 'shared', '.md'),
      readP2AgentText('steps/shared40', 'prompt', '.md'),
      readJson<Record<string, unknown>>(p2AgentFile('schemas', 'shared.schema', '.json')),
      moduleName ? readJson(p2DraftFile(moduleName, 'shared40')) : Promise.resolve(null),
    ]);
    if (!schema) throw new Error('shared.schema.json is missing.');
    const tool = buildP2SharedTool(schema);
    const humanPrompt = buildP2SharedHumanPrompt({
      sources,
      workspaces,
      contracts,
      project: moduleFile(moduleName).project,
      gateFeedback: parsed.gateFeedback,
      previousDraft: previous,
    });
    return [promptReady(
      context,
      parentStep,
      hookSequential,
      args || String(step.prompt || ''),
      composeP2SystemPrompt(skill, prompt),
      humanPrompt,
      tool,
    )];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

export async function afterP2SharedPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, step.prompt);
    moduleName = parsed.moduleName;
    const mutationParent = findMutableParent(context, parentStep);
    const payload = unwrapP2ArtifactPayload(step.interaction?.payload?.[0]);
    if (!isRecord(payload)) {
      const failure = readPromptFailure(step, 'shared40 returned no usable shared artifact.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createP2RetryStep('shared40', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `shared40 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const sources = await loadP2L4Sources(moduleName);
    const workspaces = await readJson<P2WorkspacesDraft>(p2DraftFile(moduleName, 'workspaces20'));
    if (!workspaces) throw new Error('workspaces20-draft.json is missing; workspaces20 must run first.');
    const contracts = await readJson<P2ContractsDraft>(p2DraftFile(moduleName, 'contracts30'));
    if (!contracts) throw new Error('contracts30-draft.json is missing; contracts30 must run first.');
    const draft = normalizeP2SharedPayload(payload, moduleName);
    let pipeline = await requirePipeline(moduleName);
    pipeline = await writeStepState(pipeline, {
      status: 'running',
      updatedAt: new Date().toISOString(),
    });
    const draftPath = await writeJson(p2DraftFile(moduleName, 'shared40'), draft);
    const project = moduleFile(moduleName).project;
    const gate = validateP2Shared(draft, workspaces, contracts, sources, project);
    if (!gate.ok) {
      const feedback = formatP2SharedGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createP2RetryStep('shared40', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `shared40 gate scheduled repair ${parsed.repairAttempt + 1}.`),
        ];
      }
      await writeStepState(pipeline, {
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: feedback,
        artifactPaths: [draftPath],
      });
      throw new Error(feedback);
    }

    const artifactPaths = [draftPath];
    for (const workspace of draft.workspaces) {
      const cut = workspaces.workspaces.find(item => item.workspaceId === workspace.workspaceId);
      if (!cut) continue;
      const definition = assembleP2SharedDefinition(
        deriveP2SharedBase({
          project,
          moduleName,
          workspace: cut,
          calls: callsOf(contracts, workspace.workspaceId),
          sources,
        }),
        workspace,
      );
      const source = emitP2SharedDefs({
        project,
        moduleName,
        workspaceId: workspace.workspaceId,
        definition,
      });
      artifactPaths.push(await writeP2Text(p2SharedFile(moduleName, workspace.workspaceId), source));
    }

    await writeStepState(pipeline, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
      artifactPaths,
    });
    return [
      doneAnchor(context, mutationParent, moduleName, draft, artifactPaths),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `shared40 approved: ${artifactPaths.join(', ')}`),
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

async function requirePipeline(moduleName: string): Promise<P2PipelineState> {
  const pipeline = await readP2Pipeline(moduleName);
  if (!pipeline) throw new Error(`l2 pipeline.json is missing for ${moduleName}; entry10 must run first.`);
  return pipeline;
}

async function writeStepState(
  pipeline: P2PipelineState,
  next: P2PipelineState['steps']['shared40'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<P2PipelineState> {
  const updated = markP2Step(pipeline, 'shared40', next);
  await writeJson(p2PipelineFile(pipeline.moduleName), updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readP2Pipeline(moduleName);
    if (!pipeline) return;
    await writeJson(p2PipelineFile(moduleName), markP2Step(pipeline, 'shared40', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
    }));
  } catch { /* task trace remains the fallback */ }
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): SharedArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'shared40',
    moduleName,
    repairAttempt: integer(root.repairAttempt),
    transportAttempt: integer(root.transportAttempt),
    gateFeedback: text(root.gateFeedback),
  };
}

function promptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  tool: mls.msg.LLMTool,
): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [tool],
    toolChoice: { type: 'function', function: { name: tool.function.name } },
  };
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  draft: P2SharedDraft,
  artifactPaths: string[],
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Shared done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName,
      artifactPaths,
      workspaceIds: draft.workspaces.map(workspace => workspace.workspaceId),
      completedStep: 'shared40',
      nextStep: P2_STEP_IDS[4],
    }),
    planning: { planId: 'shared40-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

function findMutableParent(
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

function readPromptFailure(step: mls.msg.AIAgentStep, fallback: string): string {
  const payload = step.interaction?.payload?.[0];
  const recordValue = isRecord(payload) ? payload : parseRecord(payload);
  if (typeof recordValue.result === 'string' && recordValue.result.trim()) return recordValue.result.trim();
  return fallback;
}

function parseRecord(value: unknown): Record<string, unknown> {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? parsed : {};
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

P2_STEP_HOOKS.shared40 = {
  beforePromptStep: beforeP2SharedPromptStep,
  afterPromptStep: afterP2SharedPromptStep,
};
