/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/agentNs4E2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import {
  createNs4ClarificationSubmitGuard,
  isNs4Pipeline,
  markNs4E2Approved,
  markNs4E2Running,
  markNs4E2WaitingHuman,
  markNs4ModuleE2Approved,
  Ns4ApprovedBy,
  Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  readNs4AgentText,
  readNs4Text,
  readNs4Module,
  readNs4Pipeline,
  ns4E2DraftFile,
  writeNs4E2Draft,
  writeNs4Journey,
  writeNs4JourneyIndex,
  writeNs4Module,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import {
  buildNs4JourneyArtifacts,
  buildNs4JourneyIndex,
  normalizeNs4E2Review,
  Ns4E2Review,
  Ns4E2ReviewEvent,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { validateNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/gate.js';

interface Ns4E2Args {
  planId: 'e2-journeys';
  moduleName: string;
  adjustment?: string;
  reviewRound?: number;
}

interface Ns4PersistedE2 {
  moduleName: string;
  journeyCount: number;
  artifactPaths: string[];
  indexPath: string;
}

export async function beforeNs4E2PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution4:e2] task invalid');
  const parsed = parseE2Args(args || step.prompt);
  const moduleArtifact = await readNs4Module(parsed.moduleName);
  const pipeline = await readNs4Pipeline(parsed.moduleName);
  if (!moduleArtifact || !isNs4Pipeline(pipeline) || pipeline.steps.e1.status !== 'approved') {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', `E1 approved artifacts not found for ${parsed.moduleName}.`)];
  }

  const reviewRound = parsed.reviewRound || pipeline.steps.e2?.reviewRound || 1;
  const previousDraft = parsed.adjustment ? await readDraftFromStorage(parsed.moduleName) : null;
  const [prompt, platform] = await Promise.all([
    readNs4AgentText('steps/e2', 'prompt'),
    readNs4AgentText('skills', 'platform'),
  ]);
  const humanPrompt = [
    '## Approved E1 module contract',
    JSON.stringify(moduleArtifact, null, 2),
    '',
    `## Required review round\n${reviewRound}`,
    parsed.adjustment ? `## Human adjustment request\n${parsed.adjustment}` : '',
    previousDraft ? `## Previous E2 draft\n${JSON.stringify(previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');

  return [{
    type: 'prompt_ready',
    args: JSON.stringify({ ...parsed, reviewRound }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: prompt.replace('{{platformSkill}}', platform),
    humanPrompt,
  } as mls.msg.AgentIntentPromptReady];
}

export async function afterNs4E2PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseE2Args(step.prompt);
    const payload = unwrapPayload(step.interaction?.payload?.[0]);
    if (!isRecord(payload) || payload.type !== 'clarification' || !isRecord(payload.json)) {
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', 'E2 returned an invalid review payload.')];
    }
    const review = normalizeNs4E2Review(payload.json, args.moduleName);
    review.moduleName = args.moduleName;
    review.reviewRound = args.reviewRound || review.reviewRound;
    const gate = validateNs4E2Review(review);
    if (!gate.ok) {
      const message = gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
      await markE2Failed(args.moduleName);
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }

    const draftPath = await writeNs4E2Draft(args.moduleName, review);
    const pipeline = await requirePipeline(args.moduleName);
    await writeNs4Pipeline(markNs4E2WaitingHuman(pipeline, review.reviewRound, draftPath));

    if (!isFast(context)) return [];
    const saved = await persistNs4E2(args.moduleName, review, 'auto');
    return [
      resultStep(context, parentStep, saved, 'E2 journeys auto-approved'),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `E2 auto-approved ${saved.journeyCount} journeys.`, 'input_output'),
    ];
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', errorMessage(error))];
  }
}

export async function beforeNs4E2ClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const review = normalizeNs4E2Review(parseMaybeJson(json));
  const gate = validateNs4E2Review(review);
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  await import('/_102020_/l2/agentNewSolution4/steps/e2/widgetNs4Journeys.js');
  const element = document.createElement('widget-ns4-journeys-102020');
  (element as unknown as { value: Ns4E2Review }).value = review;
  const acceptSubmit = createNs4ClarificationSubmitGuard();
  element.addEventListener('ns4-journeys-review', (event: Event) => {
    if (!acceptSubmit()) return;
    (element as unknown as { readonly: boolean }).readonly = true;
    const detail = (event as CustomEvent<Ns4E2ReviewEvent>).detail;
    void applyNs4E2Review(context, parentStep, step, hookSequential, detail);
  });
  return element;
}

export function createNs4E2Step(moduleName: string, reviewRound = 1, adjustment = ''): mls.msg.AIAgentStep {
  const suffix = adjustment ? ` adjustment ${reviewRound}` : '';
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: `E2 — business journeys${suffix}`,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentNewSolution4',
    prompt: JSON.stringify({ planId: 'e2-journeys', moduleName, reviewRound, ...(adjustment ? { adjustment } : {}) }),
    rags: [],
    planning: { planId: `e2-journeys-round-${reviewRound}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

async function applyNs4E2Review(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  event: Ns4E2ReviewEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution4:e2] task invalid');
  try {
    if (event.action === 'approve') {
      const saved = await persistNs4E2(event.review.moduleName, event.review, 'human');
      await applyIntents(context, [
        resultStep(context, parentStep, saved, 'E2 journeys approved'),
        updateStatus(context, parentStep, step, hookSequential, 'completed', undefined, 'input_output'),
      ]);
    } else {
      if (!event.adjustment.trim()) throw new Error('Adjustment request cannot be empty.');
      const nextRound = event.review.reviewRound + 1;
      const pipeline = await requirePipeline(event.review.moduleName);
      await writeNs4Pipeline(markNs4E2Running(pipeline, nextRound));
      await applyIntents(context, [
        addStep(context, parentStep, createNs4E2Step(event.review.moduleName, nextRound, event.adjustment)),
        adjustmentResultStep(context, parentStep, event.review.moduleName, event.review.reviewRound, event.adjustment),
        updateStatus(context, parentStep, step, hookSequential, 'completed', undefined, 'input_output'),
      ]);
    }
    await continuePoolingTask(context);
  } catch (error) {
    await applyIntents(context, [updateStatus(context, parentStep, step, hookSequential, 'failed', errorMessage(error))]);
  }
}

async function persistNs4E2(moduleName: string, review: Ns4E2Review, approvedBy: Ns4ApprovedBy): Promise<Ns4PersistedE2> {
  const gate = validateNs4E2Review(review);
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const moduleArtifact = await readNs4Module(moduleName);
  const pipeline = await requirePipeline(moduleName);
  if (!moduleArtifact || moduleArtifact.module.moduleName !== moduleName) throw new Error(`Invalid module artifact for ${moduleName}.`);

  const artifacts = await buildNs4JourneyArtifacts(review);
  const artifactPaths: string[] = [];
  for (const artifact of artifacts) artifactPaths.push(await writeNs4Journey(moduleName, artifact.journeyId, artifact));
  const approvedAt = new Date().toISOString();
  const index = buildNs4JourneyIndex(moduleName, review, artifacts, artifactPaths, approvedBy, approvedAt);
  const indexPath = await writeNs4JourneyIndex(moduleName, index);
  await writeNs4Module(moduleName, markNs4ModuleE2Approved(moduleArtifact, approvedBy, approvedAt));
  await writeNs4Pipeline(markNs4E2Approved(pipeline, approvedBy, [...artifactPaths, indexPath], approvedAt));
  return { moduleName, journeyCount: artifacts.length, artifactPaths, indexPath };
}

async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const pipeline = await readNs4Pipeline(moduleName);
  if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution4 pipeline not found for ${moduleName}.`);
  return pipeline;
}

async function markE2Failed(moduleName: string): Promise<void> {
  const pipeline = await requirePipeline(moduleName);
  const now = new Date().toISOString();
  await writeNs4Pipeline({
    ...pipeline,
    steps: { ...pipeline.steps, e2: { status: 'failed', reviewRound: pipeline.steps.e2?.reviewRound || 1, updatedAt: now } },
    updatedAt: now,
  });
}

async function readDraftFromStorage(moduleName: string): Promise<unknown> {
  const raw = await readNs4Text(ns4E2DraftFile(moduleName), false);
  try { return raw.trim() ? JSON.parse(raw) : null; } catch { return null; }
}

function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step,
  };
}

function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, saved: Ns4PersistedE2, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [],
    result: JSON.stringify({ ...saved, completedStep: 'e2-journeys', nextStep: 'e3-ontology' }, null, 2),
    planning: { planId: `e2-result-${Date.now()}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function adjustmentResultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, moduleName: string, round: number, adjustment: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `E2 changes requested after round ${round}`, status: 'completed', nextSteps: [],
    result: JSON.stringify({ moduleName, reviewRound: round, adjustment }, null, 2),
    planning: { planId: `e2-adjustment-request-${Date.now()}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
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
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E2 intents.');
  const applied = response as mls.msg.ResponseApplyIntents;
  context.task = applied.task;
  if (applied.message) context.message = applied.message;
}

function parseE2Args(value: unknown): Ns4E2Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed) || parsed.planId !== 'e2-journeys' || typeof parsed.moduleName !== 'string' || !parsed.moduleName.trim()) {
    throw new Error('Invalid E2 step arguments.');
  }
  return {
    planId: 'e2-journeys',
    moduleName: parsed.moduleName.trim(),
    ...(typeof parsed.adjustment === 'string' && parsed.adjustment.trim() ? { adjustment: parsed.adjustment.trim() } : {}),
    ...(typeof parsed.reviewRound === 'number' ? { reviewRound: parsed.reviewRound } : {}),
  };
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
