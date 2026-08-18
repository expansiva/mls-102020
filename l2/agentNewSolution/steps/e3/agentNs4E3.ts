/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e3/agentNs4E3.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution/helpers/ns4StepTree.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution/helpers/ns4Clarification.js';
import {
  readNs4ApprovedAccess, readNs4ApprovedJourneys,
} from '/_102020_/l2/agentNewSolution/helpers/ns4ApprovedArtifacts.js';
import {
  createNs4E3Step,
  isNs4Pipeline,
  markNs4E3Approved,
  markNs4E3Failed,
  markNs4E3Running,
  markNs4E3WaitingHuman,
  markNs4ModuleE3Approved,
  Ns4ApprovedBy,
  Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  readNs4AgentText,
  readNs4Module,
  readNs4Pipeline,
  writeNs4AccessMatrix,
  writeNs4E3Draft,
  writeNs4Module,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Fs.js';
import { Ns4E2Review } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import {
  buildNs4AccessMatrixArtifact,
  normalizeNs4E3Review,
  Ns4E3Review,
  Ns4E3ReviewEvent,
} from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import { validateNs4E3Review } from '/_102020_/l2/agentNewSolution/steps/e3/gate.js';
import { resolveNs4E3HookArgs } from '/_102020_/l2/agentNewSolution/steps/e3/hookArgs.js';

interface Ns4E3Args {
  planId: 'e3-access-matrix';
  moduleName?: string;
  adjustment?: string;
  reviewRound?: number;
}

interface Ns4PersistedE3 {
  moduleName: string;
  profileCount: number;
  authorityCount: number;
  grantCount: number;
  artifactPath: string;
  approvedBy: Ns4ApprovedBy;
  approvedAt: string;
  approvedReview: Ns4E3Review;
}

export async function beforeNs4E3PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution:e3] task invalid');
  const hookArgs = resolveNs4E3HookArgs(args, step.prompt);
  let moduleName = '';
  try {
    const parsed = resolveE3Args(context, hookArgs);
    moduleName = parsed.moduleName;
    const [moduleArtifact, pipeline, journeys, prompt, platform] = await Promise.all([
      readNs4Module(moduleName),
      readNs4Pipeline(moduleName),
      readNs4ApprovedJourneys(moduleName),
      readNs4AgentText('steps/e3', 'prompt'),
      readNs4AgentText('skills', 'platform'),
    ]);
    if (!moduleArtifact || !isNs4Pipeline(pipeline) || pipeline.steps.e2?.status !== 'approved') {
      throw new Error(`E2 approved artifacts not found for ${moduleName}.`);
    }
    const reviewRound = parsed.reviewRound || pipeline.steps.e3?.reviewRound || 1;
    const previousDraft = parsed.adjustment ? await readNs4ApprovedAccess(moduleName) : null;
    const humanPrompt = [
      '## Approved module contract', JSON.stringify(moduleArtifact), '',
      '## Approved E2 journeys', JSON.stringify(journeys), '',
      `## Required review round\n${reviewRound}`,
      parsed.adjustment ? `## Human adjustment request\n${parsed.adjustment}` : '',
      previousDraft ? `## Previous E3 access matrix draft\n${JSON.stringify(previousDraft)}` : '',
    ].filter(Boolean).join('\n');
    return [{
      type: 'prompt_ready', args: hookArgs, messageId: context.message.orderAt,
      threadId: context.message.threadId, taskId: context.task.PK, hookSequential,
      parentStepId: parentStep.stepId, systemPrompt: prompt.replace('{{platformSkill}}', platform), humanPrompt,
    } as mls.msg.AgentIntentPromptReady];
  } catch (error) {
    const message = errorMessage(error);
    await recordNs4E3Failure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

export async function afterNs4E3PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const args = resolveE3Args(context, step.prompt);
    moduleName = args.moduleName;
    const pipeline = await requirePipeline(moduleName);
    await writeNs4Pipeline(markNs4E3Running(pipeline, args.reviewRound || pipeline.steps.e3?.reviewRound || 1));
    const mutationParent = findMutableParentStep(context, parentStep, step);
    const payload = unwrapPayload(step.interaction?.payload?.[0]);
    if (!isRecord(payload) || payload.type !== 'clarification' || !isRecord(payload.json)) {
      const message = readE3FailureMessage(payload);
      await recordNs4E3Failure(moduleName, message);
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }
    const review = normalizeNs4E3Review(payload.json, moduleName);
    review.moduleName = moduleName;
    review.reviewRound = args.reviewRound || review.reviewRound;
    const journeys = await readNs4ApprovedJourneys(moduleName);
    const gate = validateNs4E3Review(review, journeys);
    if (!gate.ok) {
      const message = gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
      await recordNs4E3Failure(moduleName, message);
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }
    const draftPath = await writeNs4E3Draft(moduleName, review);
    await writeNs4Pipeline(markNs4E3WaitingHuman(await requirePipeline(moduleName), review.reviewRound, draftPath));
    if (!isFast(context)) return [];
    const saved = await persistNs4E3(moduleName, review, 'auto', journeys);
    return [
      resultStep(context, mutationParent, saved, 'E3 access matrix auto-approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `E3 auto-approved ${saved.authorityCount} authorities.`, 'input_output'),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordNs4E3Failure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

export async function beforeNs4E3ClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const review = normalizeNs4E3Review(parseMaybeJson(json));
  const journeys = await readNs4ApprovedJourneys(review.moduleName);
  const gate = validateNs4E3Review(review, journeys);
  if (!gate.ok) {
    const message = gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await recordNs4E3Failure(review.moduleName, message);
    throw new Error(message);
  }
  await import('/_102020_/l2/agentNewSolution/widgets/widgetNs4AccessMatrix.js');
  const element = document.createElement('widget-ns4-access-matrix-102020');
  (element as unknown as { value: Ns4E3Review }).value = review;
  element.addEventListener('ns4-access-matrix-review', (event: Event) => {
    const detail = (event as CustomEvent<Ns4E3ReviewEvent>).detail;
    void applyNs4E3Review(context, parentStep, step, hookSequential, detail)
      .catch(error => { showNs4ClarificationError(element, error); console.error(`[${agent.agentName}] ${errorMessage(error)}`); });
  });
  return element;
}

async function applyNs4E3Review(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  event: Ns4E3ReviewEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution:e3] task invalid');
  const mutationParent = findMutableParentStep(context, parentStep);
  if (event.action === 'cancel') throw new Error('Cancelamento terminal ainda depende de suporte explícito do collab-messages; esta revisão foi mantida aberta sem alterar o pipeline.');
  const journeys = await readNs4ApprovedJourneys(event.review.moduleName);
  if (event.action === 'approve') {
    const saved = await persistNs4E3(event.review.moduleName, event.review, 'human', journeys);
    await applyIntents(context, [
      resultStep(context, mutationParent, saved, 'E3 access matrix approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  } else {
    if (!event.adjustment.trim()) throw new Error('Adjustment request cannot be empty.');
    const nextRound = event.review.reviewRound + 1;
    await writeNs4E3Draft(event.review.moduleName, event.review);
    await writeNs4Pipeline(markNs4E3Running(await requirePipeline(event.review.moduleName), nextRound));
    await applyIntents(context, [
      addStep(context, mutationParent, createNs4E3Step(event.review.moduleName, nextRound, event.adjustment)),
      adjustmentResultStep(context, mutationParent, event.review.moduleName, event.review.reviewRound, event.adjustment),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  }
  await continuePoolingTask(context);
}

async function persistNs4E3(
  moduleName: string,
  review: Ns4E3Review,
  approvedBy: Ns4ApprovedBy,
  journeys: Ns4E2Review,
): Promise<Ns4PersistedE3> {
  const gate = validateNs4E3Review(review, journeys);
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const [moduleArtifact, pipeline] = await Promise.all([readNs4Module(moduleName), requirePipeline(moduleName)]);
  if (!moduleArtifact || moduleArtifact.module.moduleName !== moduleName) throw new Error(`Invalid module artifact for ${moduleName}.`);
  const approvedAt = new Date().toISOString();
  const artifact = await buildNs4AccessMatrixArtifact(review, approvedBy, approvedAt);
  const artifactPath = await writeNs4AccessMatrix(moduleName, artifact);
  await writeNs4Module(moduleName, markNs4ModuleE3Approved(moduleArtifact, approvedBy, approvedAt));
  await writeNs4Pipeline(markNs4E3Approved(pipeline, approvedBy, artifactPath, approvedAt, review.reviewRound));
  return {
    moduleName, profileCount: review.profiles.length, authorityCount: review.authorities.length,
    grantCount: review.grants.length, artifactPath, approvedBy, approvedAt, approvedReview: review,
  };
}

function findMutableParentStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  phaseStep?: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parentStep, phaseStep);
}

async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const pipeline = await readNs4Pipeline(moduleName);
  if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution pipeline not found for ${moduleName}.`);
  return pipeline;
}

async function recordNs4E3Failure(moduleName: string, failure: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readNs4Pipeline(moduleName);
    if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E3Failed(pipeline, failure));
  } catch {
    // The task trace remains the fallback when the pipeline cannot be persisted.
  }
}

function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step };
}

function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, saved: Ns4PersistedE3, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [],
    result: JSON.stringify({ ...saved, completedStep: 'e3-access-matrix', nextStep: 'e4-ontology' }, null, 2),
    planning: { planId: 'e3-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function adjustmentResultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, moduleName: string, round: number, adjustment: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `E3 changes requested after round ${round}`,
    status: 'completed', nextSteps: [], result: JSON.stringify({ moduleName, reviewRound: round, adjustment }, null, 2),
    planning: { planId: `e3-adjustment-request-${Date.now()}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function updateStatus(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIPayload, step: mls.msg.AIPayload,
  hookSequential: number, status: mls.msg.AIStepStatus, traceMsg?: string, cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  return { type: 'update-status', hookSequential, messageId: context.message.orderAt,
    threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
    stepId: step.stepId, status, ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}) };
}

async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E3 intents.');
  const applied = response as mls.msg.ResponseApplyIntents;
  context.task = applied.task;
  if (applied.message) context.message = applied.message;
}

function parseE3Args(value: unknown): Ns4E3Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed) || parsed.planId !== 'e3-access-matrix') throw new Error('Invalid E3 step arguments.');
  return {
    planId: 'e3-access-matrix',
    ...(typeof parsed.moduleName === 'string' && parsed.moduleName.trim() ? { moduleName: parsed.moduleName.trim() } : {}),
    ...(typeof parsed.adjustment === 'string' && parsed.adjustment.trim() ? { adjustment: parsed.adjustment.trim() } : {}),
    ...(typeof parsed.reviewRound === 'number' ? { reviewRound: parsed.reviewRound } : {}),
  };
}

function resolveE3Args(context: mls.msg.ExecutionContext, value: unknown): Ns4E3Args & { moduleName: string } {
  const parsed = parseE3Args(value);
  const moduleName = parsed.moduleName || findE2ModuleName(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E2 module result not found for E3.');
  return { ...parsed, moduleName };
}

function findE2ModuleName(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e2-result');
  if (!result || result.type !== 'result' || !result.result) return '';
  const parsed = parseMaybeJson(result.result);
  return isRecord(parsed) && typeof parsed.moduleName === 'string' ? parsed.moduleName.trim() : '';
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function unwrapPayload(value: unknown): unknown {
  const parsed = parseMaybeJson(value);
  if (isRecord(parsed) && parsed.type === 'flexible') return parseMaybeJson(parsed.result);
  return parsed;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function isFast(context: mls.msg.ExecutionContext): boolean {
  return context.task?.iaCompressed?.longMemory?.fastMode === 'true';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readE3FailureMessage(payload: unknown): string {
  if (isRecord(payload) && payload.type === 'result' && typeof payload.result === 'string' && payload.result.trim()) return payload.result.trim();
  return 'E3 returned an invalid access matrix payload.';
}
