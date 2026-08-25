/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e1/agentNs4E1.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import {
  createNs4E1Step,
  createNs4Pipeline,
  isNs4Pipeline,
  markNs4E1Approved,
  markNs4E1Failed,
  normalizeNs4ModuleName,
  normalizeNs4RootPlan,
  Ns4ApprovedBy,
  Ns4ModuleArtifact,
  Ns4RootPlan,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  buildNs4ModuleArtifactFromReview,
  Ns4E1Review,
  Ns4E1ReviewEvent,
  normalizeNs4E1Review,
  validateNs4E1Review,
} from '/_102020_/l2/agentNewSolution/steps/e1/contracts.js';
import {
  showNs4ClarificationError,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Clarification.js';
import {
  listNs4ModuleFolders,
  readNs4AgentText,
  readNs4Pipeline,
  writeNs4Module,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Fs.js';
import { validateNs4E1Module } from '/_102020_/l2/agentNewSolution/steps/e1/gate.js';

interface Ns4PersistedE1 {
  artifact: Ns4ModuleArtifact;
  artifactPath: string;
}

interface Ns4ClarificationAnswer {
  review: Ns4E1Review;
  approvedBy: Ns4ApprovedBy;
}

export async function loadNs4E1SystemPrompt(): Promise<string> {
  const [prompt, platform] = await Promise.all([
    readNs4AgentText('steps/e1', 'prompt'),
    readNs4AgentText('skills', 'platform'),
  ]);
  return prompt.replace('{{platformSkill}}', platform);
}

export async function loadNs4StatusPrompt(message: string): Promise<string> {
  const prompt = await readNs4AgentText('steps/e1', 'promptStatus');
  return prompt.replace('{{message}}', escapePromptMessage(message));
}

export async function beforeNs4E1PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution:e1] task invalid');
  const parsed = parseRecord(args || step.prompt);
  if (parsed.planId === 'e1-clarification') {
    const plan = getNs4RootPlan(context);
    const reviewRound = positiveInteger(parsed.reviewRound, 1);
    const previousReview = isRecord(parsed.previousReview) ? parsed.previousReview : null;
    const adjustment = typeof parsed.adjustment === 'string' ? parsed.adjustment.trim() : '';
    return [{
      type: 'prompt_ready',
      args: args || step.prompt || JSON.stringify({ planId: 'e1-clarification' }),
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task.PK,
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: await loadNs4E1SystemPrompt(),
      humanPrompt: [
        '## Initial request',
        plan.userPrompt,
        '',
        '## Root planner clarification seed',
        JSON.stringify(plan.clarification, null, 2),
        '',
        `## Required review round\n${reviewRound}`,
        previousReview ? `## Current E1 review, including direct human edits\n${JSON.stringify(previousReview, null, 2)}` : '',
        adjustment ? `## Human adjustment request\n${adjustment}` : '',
      ].join('\n'),
    } as mls.msg.AgentIntentPromptReady];
  }
  if (parsed.planId === 'e1-compile') {
    return compileNs4E1(context, parentStep, step, hookSequential);
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', 'Invalid E1 step arguments.')];
}

export async function afterNs4E1PromptStep(
  agent: unknown,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const payload = unwrapPayload(step.interaction?.payload?.[0]);
  if (isRecord(payload) && payload.type === 'result') {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', readResultMessage(payload))];
  }
  if (!isRecord(payload) || payload.type !== 'clarification' || !isRecord(payload.json)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', 'E1 returned an invalid clarification payload.')];
  }
  const review = normalizeNs4E1Review(payload.json);
  const gate = validateNs4E1Review(review);
  if (!gate.ok) {
    return [updateStatus(
      context, parentStep, step, hookSequential, 'failed',
      gate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n'),
    )];
  }
  return [];
}

export async function beforeNs4E1ClarificationStep(
  agent: unknown,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const plan = getNs4RootPlan(context);
  const review = normalizeNs4E1Review(parseRecord(json), {
    userLanguage: plan.presentation.userLanguage,
    moduleName: plan.clarification.questions.moduleName.answer,
    productLanguages: plan.clarification.questions.productLanguages.answer,
    mainActors: plan.clarification.questions.mainActors.answer,
    mainGoal: plan.clarification.questions.mainGoal.answer,
    boundaries: plan.clarification.questions.boundaries.answer,
    sourcePrompt: plan.userPrompt,
  });
  await import('/_102020_/l2/agentNewSolution/widgets/widgetNs4Intake.js');
  const wrapper = document.createElement('div');
  const element = document.createElement('widget-ns4-intake-102020');
  (element as unknown as { value: Ns4E1Review }).value = review;
  element.addEventListener('ns4-intake-review', (event: Event) => {
    const detail = (event as CustomEvent<Ns4E1ReviewEvent>).detail;
    void applyNs4E1Clarification(context, parentStep, step, hookSequential, detail)
      .catch(error => {
        console.error(`[agentNewSolution:e1] ${errorMessage(error)}`);
        showNs4ClarificationError(element, error);
      });
  });
  wrapper.appendChild(element);
  return wrapper;
}

async function applyNs4E1Clarification(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  event: Ns4E1ReviewEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution:e1] task invalid');
  const mutationParent = findMutableParentStep(context, parentStep);
  if (event.action === 'cancel') {
    throw new Error('O cancelamento terminal ainda depende do suporte cancelled no collab-messages; a execução foi mantida aberta.');
  }
  if (event.action === 'requestChanges') {
    if (!event.adjustment.trim()) throw new Error('Descreva a alteração necessária antes de gerar outra proposta.');
    const nextRound = event.review.reviewRound + 1;
    const plan = getNs4RootPlan(context);
    await applyIntents(context, [
      addStep(context, mutationParent, createNs4E1Step(
        nextRound,
        event.adjustment,
        event.review,
        [],
        plan.presentation.stepTitles['e1-clarification'],
      )),
      adjustmentResultStep(context, mutationParent, event.review, event.adjustment),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
    await continuePoolingTask(context);
    return;
  }
  const gate = validateNs4E1Review(event.review);
  if (!gate.ok) {
    const errors = gate.issues.filter(issue => issue.severity === 'error');
    throw new Error(errors.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  }
  await applyIntents(context, [
    clarificationAnswerStep(context, mutationParent, {
      review: event.review,
      approvedBy: isFast(context) ? 'auto' : 'human',
    }),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
  ]);
  await continuePoolingTask(context);
}

async function compileNs4E1(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const answer = getClarificationAnswer(context);
    if (!answer) throw new Error('E1 clarification answer not found.');
    const saved = await persistNs4E1(context, answer.review, answer.approvedBy);
    const mutationParent = findMutableParentStep(context, parentStep);
    return [
      e1ResultStep(context, mutationParent, saved, getNs4RootPlan(context)),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `E1 compiled: ${saved.artifactPath}`, 'input_output'),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordNs4E1Failure(context, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function persistNs4E1(
  context: mls.msg.ExecutionContext,
  review: Ns4E1Review,
  approvedBy: Ns4ApprovedBy,
): Promise<Ns4PersistedE1> {
  const plan = getNs4RootPlan(context);
  const sourcePrompt = plan.userPrompt || memoryString(context, 'sourcePrompt') || 'new module';
  const artifact = buildNs4ModuleArtifactFromReview(review, sourcePrompt, approvedBy, plan.presentation);
  const moduleName = artifact.module.moduleName;
  const resumeModule = normalizeOptionalModuleName(memoryString(context, 'resumeModule'));
  if (resumeModule && moduleName !== resumeModule) {
    throw new Error(`A retomada pertence ao módulo "${resumeModule}"; mantenha esse moduleName ou inicie uma nova execução.`);
  }
  const rebuildModule = normalizeOptionalModuleName(memoryString(context, 'rebuildModule'));
  const existingPipeline = await readNs4Pipeline(moduleName);
  if (listNs4ModuleFolders().has(moduleName)) {
    const allowedResume = resumeModule === moduleName && isNs4Pipeline(existingPipeline);
    // A /rebuild run is a legitimate reason for the folder to still be there: the archive is a
    // soft-delete and the module keeps l2 files this flow does not own, so `listNs4ModuleFolders`
    // still reports it. The guard stays exactly as strict for every other collision.
    const allowedRebuild = rebuildModule === moduleName;
    if (!allowedResume && !allowedRebuild) {
      throw new Error(`Módulo "${moduleName}" já existe e não pertence a uma retomada válida do agentNewSolution. Para regenerar, use "@@newSolution ${moduleName} /rebuild" (tudo) ou "@@newSolution ${moduleName} /rebuild e10" (a partir de um step).`);
    }
  }

  const now = new Date().toISOString();
  const running = isNs4Pipeline(existingPipeline)
    ? {
      ...existingPipeline,
      sourcePrompt: existingPipeline.sourcePrompt || sourcePrompt,
      presentation: existingPipeline.presentation || plan.presentation,
      steps: { ...existingPipeline.steps, e1: { status: 'running' as const, updatedAt: now } },
      updatedAt: now,
    }
    : createNs4Pipeline(moduleName, sourcePrompt, now, plan.presentation);
  await writeNs4Pipeline(running);

  const gate = validateNs4E1Module(artifact);
  if (!gate.ok) {
    const message = gate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNs4Pipeline(markNs4E1Failed(running, message || 'E1 module gate failed.'));
    throw new Error(message || 'E1 module gate failed.');
  }
  const artifactPath = await writeNs4Module(moduleName, artifact);
  await writeNs4Pipeline(markNs4E1Approved(running, approvedBy, artifactPath));
  return { artifact, artifactPath };
}

async function recordNs4E1Failure(context: mls.msg.ExecutionContext, failure: string): Promise<void> {
  try {
    const answer = getClarificationAnswer(context);
    const answerModule = answer ? normalizeNs4ModuleName(answer.review.module.moduleName) : '';
    const moduleName = normalizeOptionalModuleName(memoryString(context, 'resumeModule')) || answerModule;
    if (!moduleName) return;
    const pipeline = await readNs4Pipeline(moduleName);
    if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E1Failed(pipeline, failure));
  } catch {
    // The step trace remains the fallback when the pipeline itself cannot be read or written.
  }
}

function clarificationAnswerStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  answer: Ns4ClarificationAnswer,
): mls.msg.AgentIntentAddStep {
  return addResultStep(context, parentStep, 'e1-clarification-answer', answer.review.module.title || 'Initial solution definition', answer);
}

function adjustmentResultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  review: Ns4E1Review,
  adjustment: string,
): mls.msg.AgentIntentAddStep {
  return addResultStep(
    context,
    parentStep,
    `e1-adjustment-request-${review.reviewRound}-${Date.now()}`,
    `E1 changes requested after round ${review.reviewRound}`,
    { reviewRound: review.reviewRound, adjustment, review },
  );
}

function e1ResultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  saved: Ns4PersistedE1,
  plan: Ns4RootPlan,
): mls.msg.AgentIntentAddStep {
  return addResultStep(context, parentStep, 'e1-result', plan.presentation.stepTitles['e1-compile'], {
    moduleName: saved.artifact.module.moduleName,
    artifact: saved.artifactPath,
    completedStep: 'e1',
    nextStep: 'e2-journeys',
  });
}

function addResultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  planId: string,
  stepTitle: string,
  result: unknown,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
    step: {
      type: 'result', stepId: 0, interaction: null, stepTitle, status: 'completed', nextSteps: [],
      result: JSON.stringify(result, null, 2),
      planning: { planId, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  };
}

function addStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step,
  };
}

function getNs4RootPlan(context: mls.msg.ExecutionContext): Ns4RootPlan {
  const root = context.task?.iaCompressed?.nextSteps?.[0] as mls.msg.AIAgentStep | undefined;
  return normalizeNs4RootPlan(root?.interaction?.payload?.[0], memoryString(context, 'sourcePrompt'));
}

function getClarificationAnswer(context: mls.msg.ExecutionContext): Ns4ClarificationAnswer | null {
  const step = getAllSteps(context.task?.iaCompressed?.nextSteps).find(item => item.planning?.planId === 'e1-clarification-answer');
  if (!step || step.type !== 'result' || !step.result) return null;
  const parsed = parseMaybeJson(step.result);
  return isRecord(parsed) && isRecord(parsed.review)
    ? parsed as unknown as Ns4ClarificationAnswer
    : null;
}

function findMutableParentStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const all = getAllSteps(context.task?.iaCompressed?.nextSteps);
  const current = all.find(item => item.stepId === parentStep.stepId);
  if (current?.type === 'agent' && current.status !== 'completed' && current.status !== 'failed') return current;
  for (const candidate of all) {
    if (candidate.type !== 'agent') continue;
    if (candidate.nextSteps?.some(child => child.stepId === parentStep.stepId)
      || candidate.interaction?.payload?.some(child => child.stepId === parentStep.stepId)) {
      if (candidate.status !== 'completed' && candidate.status !== 'failed') return candidate;
    }
  }
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function updateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', hookSequential, messageId: context.message.orderAt,
    threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
    stepId: step.stepId, status, ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}),
  };
}

async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) {
    throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E1 intents.');
  }
  const applied = response as mls.msg.ResponseApplyIntents;
  context.task = applied.task;
  if (applied.message) context.message = applied.message;
}

function unwrapPayload(value: unknown): unknown {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) && parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
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

function isFast(context: mls.msg.ExecutionContext): boolean {
  return memoryString(context, 'fastMode') === 'true';
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalModuleName(value: string): string {
  return value ? normalizeNs4ModuleName(value) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readResultMessage(payload: Record<string, unknown>): string {
  return typeof payload.result === 'string' && payload.result.trim() ? payload.result.trim() : 'E1 clarification failed.';
}

function escapePromptMessage(message: string): string {
  return String(message || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
