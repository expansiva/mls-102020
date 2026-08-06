/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/agentNs4E4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import {
  createNs4E4Step,
  createNs4E4RepairStep,
  isNs4Pipeline,
  markNs4E3Approved,
  markNs4E4Approved,
  markNs4E4Failed,
  markNs4E4Running,
  markNs4E4WaitingHuman,
  markNs4ModuleE4Approved,
  Ns4ApprovedBy,
  Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  ns4E2DraftFile,
  ns4AccessMatrixFile,
  ns4E4DraftFile,
  readNs4AgentText,
  readNs4DefsJson,
  readNs4Module,
  readNs4Pipeline,
  readNs4Text,
  writeNs4E4Draft,
  writeNs4Module,
  writeNs4OntologyEntity,
  writeNs4OntologyIndex,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import { normalizeNs4E2Review, Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import {
  normalizeNs4E3Review,
  Ns4AccessMatrixArtifact,
  Ns4E3Review,
} from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import {
  buildNs4OntologyArtifacts,
  normalizeNs4E4Review,
  Ns4E4Review,
  Ns4E4ReviewEvent,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import { validateNs4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/gate.js';
import { resolveNs4E4HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e4/hookArgs.js';

interface Ns4E4Args {
  planId: 'e4-ontology';
  moduleName?: string;
  adjustment?: string;
  reviewRound?: number;
  solutionMode: 'new';
  repairAttempt?: number;
  gateFeedback?: string;
}

const MAX_E4_GATE_REPAIRS = 1;

interface Ns4PersistedE4 {
  moduleName: string;
  solutionMode: 'new';
  entityCount: number;
  relationshipCount: number;
  artifactPaths: string[];
}

export async function beforeNs4E4PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution4:e4] task invalid');
  const hookArgs = resolveNs4E4HookArgs(args, step.prompt);
  let moduleName = '';
  try {
    const parsed = resolveE4Args(context, hookArgs);
    moduleName = parsed.moduleName;
    const handoff = findE3Handoff(context, moduleName);
    const storedPipeline = await readNs4Pipeline(moduleName);
    if (!isNs4Pipeline(storedPipeline)) {
      throw new Error(`E3 approved pipeline not found for ${moduleName}.`);
    }
    let pipeline = storedPipeline;
    if (pipeline.steps.e3?.status !== 'approved') {
      if (!handoff) throw new Error(`E3 approved pipeline state not found for ${moduleName}.`);
      pipeline = markNs4E3Approved(
        pipeline, handoff.approvedBy, handoff.artifactPath, handoff.approvedAt,
      );
      await writeNs4Pipeline(pipeline);
    }
    const [moduleArtifact, journeys, access, prompt, platform] = await Promise.all([
      readNs4Module(moduleName),
      readApprovedJourneys(moduleName),
      handoff?.approvedReview ? Promise.resolve(handoff.approvedReview) : readApprovedAccess(moduleName),
      readNs4AgentText('steps/e4', 'prompt'),
      readNs4AgentText('skills', 'platform'),
    ]);
    if (!moduleArtifact) {
      throw new Error(`E3 approved artifacts not found for ${moduleName}.`);
    }
    const reviewRound = parsed.reviewRound || pipeline.steps.e4?.reviewRound || 1;
    const previousDraft = parsed.adjustment || parsed.gateFeedback ? await readDraftFromStorage(moduleName) : null;
    const humanPrompt = [
      '## Explicit delivery mode for this run\nnew solution; new persistence design; no legacy database contract', '',
      '## Approved module contract', JSON.stringify(moduleArtifact), '',
      '## Approved E2 journeys', JSON.stringify(journeys), '',
      '## Approved E3 access matrix', JSON.stringify(access), '',
      `## Required review round\n${reviewRound}`,
      parsed.adjustment ? `## Human structural change request\n${parsed.adjustment}` : '',
      parsed.gateFeedback ? `## Deterministic gate repair required\n${parsed.gateFeedback}` : '',
      previousDraft ? `## Current E4 draft, including direct human edits\n${JSON.stringify(previousDraft)}` : '',
    ].filter(Boolean).join('\n');
    return [{
      type: 'prompt_ready', args: hookArgs, messageId: context.message.orderAt,
      threadId: context.message.threadId, taskId: context.task.PK, hookSequential,
      parentStepId: parentStep.stepId, systemPrompt: prompt.replace('{{platformSkill}}', platform), humanPrompt,
    } as mls.msg.AgentIntentPromptReady];
  } catch (error) {
    const message = errorMessage(error);
    await recordNs4E4Failure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

export async function afterNs4E4PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const args = resolveE4Args(context, step.prompt);
    moduleName = args.moduleName;
    const pipeline = await requirePipeline(moduleName);
    await writeNs4Pipeline(markNs4E4Running(pipeline, args.reviewRound || pipeline.steps.e4?.reviewRound || 1));
    const payload = unwrapPayload(step.interaction?.payload?.[0]);
    if (!isRecord(payload) || payload.type !== 'clarification' || !isRecord(payload.json)) {
      const message = readE4FailureMessage(payload);
      await recordNs4E4Failure(moduleName, message);
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }
    const review = normalizeNs4E4Review(payload.json, moduleName);
    review.moduleName = moduleName;
    review.reviewRound = args.reviewRound || review.reviewRound;
    const [journeys, access] = await Promise.all([readApprovedJourneys(moduleName), readApprovedAccess(moduleName)]);
    const gate = validateNs4E4Review(review, journeys, access);
    if (!gate.ok) {
      const message = gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
      await writeNs4E4Draft(moduleName, review);
      const repairAttempt = args.repairAttempt || 0;
      if (repairAttempt < MAX_E4_GATE_REPAIRS) {
        const repairParent = findMutableParentStep(context, parentStep);
        const repairStep = createNs4E4RepairStep(
          moduleName, review.reviewRound, repairAttempt + 1, message,
          pipeline.presentation.stepTitles['e4-ontology'],
        );
        return [
          addStep(context, repairParent, repairStep),
          gateRepairResultStep(context, repairParent, moduleName, review.reviewRound, repairAttempt + 1, message),
          updateStatus(context, repairParent, step, hookSequential, 'completed', `E4 gate requested automatic repair ${repairAttempt + 1}.`, 'input_output'),
        ];
      }
      await recordNs4E4Failure(moduleName, message);
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }
    const draftPath = await writeNs4E4Draft(moduleName, review);
    await writeNs4Pipeline(markNs4E4WaitingHuman(await requirePipeline(moduleName), review.reviewRound, draftPath));
    if (!isFast(context)) return [];
    const saved = await persistNs4E4(moduleName, review, 'auto', journeys, access);
    return [
      resultStep(context, parentStep, saved, 'E4 ontology auto-approved'),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `E4 auto-approved ${saved.entityCount} entities.`, 'input_output'),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordNs4E4Failure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

export async function beforeNs4E4ClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const review = normalizeNs4E4Review(parseMaybeJson(json));
  const [journeys, access] = await Promise.all([readApprovedJourneys(review.moduleName), readApprovedAccess(review.moduleName)]);
  const gate = validateNs4E4Review(review, journeys, access);
  if (!gate.ok) {
    const message = gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await recordNs4E4Failure(review.moduleName, message);
    throw new Error(message);
  }
  await import('/_102020_/l2/agentNewSolution4/steps/e4/widgetNs4Ontology.js');
  const element = document.createElement('widget-ns4-ontology-102020');
  (element as unknown as { value: Ns4E4Review }).value = review;
  element.addEventListener('ns4-ontology-review', (event: Event) => {
    const detail = (event as CustomEvent<Ns4E4ReviewEvent>).detail;
    void applyNs4E4Review(context, parentStep, step, hookSequential, detail)
      .catch(error => console.error(`[${agent.agentName}] ${errorMessage(error)}`));
  });
  return element;
}

async function applyNs4E4Review(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  event: Ns4E4ReviewEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution4:e4] task invalid');
  const mutationParent = findMutableParentStep(context, parentStep);
  try {
    const [journeys, access] = await Promise.all([
      readApprovedJourneys(event.review.moduleName), readApprovedAccess(event.review.moduleName),
    ]);
    const gate = validateNs4E4Review(event.review, journeys, access);
    if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    await writeNs4E4Draft(event.review.moduleName, event.review);
    if (event.action === 'approve') {
      const saved = await persistNs4E4(event.review.moduleName, event.review, 'human', journeys, access);
      await applyIntents(context, [
        resultStep(context, mutationParent, saved, 'E4 ontology approved'),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
      ]);
    } else {
      if (!event.adjustment.trim()) throw new Error('Structural change request cannot be empty.');
      const nextRound = event.review.reviewRound + 1;
      await writeNs4Pipeline(markNs4E4Running(await requirePipeline(event.review.moduleName), nextRound));
      await applyIntents(context, [
        addStep(context, mutationParent, createNs4E4Step(event.review.moduleName, nextRound, event.adjustment)),
        adjustmentResultStep(context, mutationParent, event.review.moduleName, event.review.reviewRound, event.adjustment),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
      ]);
    }
    await continuePoolingTask(context);
  } catch (error) {
    const message = errorMessage(error);
    await recordNs4E4Failure(event.review.moduleName, message);
    await applyIntents(context, [updateStatus(context, mutationParent, step, hookSequential, 'failed', message)]);
  }
}

async function persistNs4E4(
  moduleName: string,
  review: Ns4E4Review,
  approvedBy: Ns4ApprovedBy,
  journeys: Ns4E2Review,
  access: Ns4E3Review,
): Promise<Ns4PersistedE4> {
  const gate = validateNs4E4Review(review, journeys, access);
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const [moduleArtifact, pipeline] = await Promise.all([readNs4Module(moduleName), requirePipeline(moduleName)]);
  if (!moduleArtifact || moduleArtifact.module.moduleName !== moduleName) throw new Error(`Invalid module artifact for ${moduleName}.`);
  const approvedAt = new Date().toISOString();
  const artifacts = await buildNs4OntologyArtifacts(review, approvedBy, approvedAt);
  const artifactPaths: string[] = [];
  for (const entity of artifacts.entities) artifactPaths.push(await writeNs4OntologyEntity(moduleName, entity.entityId, entity));
  artifactPaths.push(await writeNs4OntologyIndex(moduleName, artifacts.index));
  await writeNs4Module(moduleName, markNs4ModuleE4Approved(moduleArtifact, approvedBy, approvedAt));
  await writeNs4Pipeline(markNs4E4Approved(pipeline, approvedBy, artifactPaths, approvedAt));
  return { moduleName, solutionMode: 'new', entityCount: review.entities.length, relationshipCount: review.relationships.length, artifactPaths };
}

async function readApprovedJourneys(moduleName: string): Promise<Ns4E2Review> {
  const raw = await readNs4Text(ns4E2DraftFile(moduleName), false);
  if (!raw.trim()) throw new Error(`Approved E2 journey review not found for ${moduleName}.`);
  try { return normalizeNs4E2Review(JSON.parse(raw), moduleName); }
  catch { throw new Error(`Invalid approved E2 journey review for ${moduleName}.`); }
}

async function readApprovedAccess(moduleName: string): Promise<Ns4E3Review> {
  const artifact = await readNs4DefsJson<Ns4AccessMatrixArtifact>(ns4AccessMatrixFile(moduleName));
  if (!artifact) throw new Error(`Approved E3 access artifact not found for ${moduleName}.`);
  return normalizeNs4E3Review(artifact, moduleName);
}

async function readDraftFromStorage(moduleName: string): Promise<unknown> {
  const raw = await readNs4Text(ns4E4DraftFile(moduleName), false);
  try { return raw.trim() ? JSON.parse(raw) : null; } catch { return null; }
}

async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const pipeline = await readNs4Pipeline(moduleName);
  if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution4 pipeline not found for ${moduleName}.`);
  return pipeline;
}

async function recordNs4E4Failure(moduleName: string, failure: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readNs4Pipeline(moduleName);
    if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E4Failed(pipeline, failure));
  } catch { /* task trace is the fallback */ }
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

function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step };
}

function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, saved: Ns4PersistedE4, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [],
    result: JSON.stringify({ ...saved, completedStep: 'e4-ontology', nextStep: 'e5-rules' }, null, 2),
    planning: { planId: 'e4-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function adjustmentResultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, moduleName: string, round: number, adjustment: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `E4 changes requested after round ${round}`,
    status: 'completed', nextSteps: [], result: JSON.stringify({ moduleName, reviewRound: round, adjustment }, null, 2),
    planning: { planId: `e4-adjustment-request-${Date.now()}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function gateRepairResultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  round: number,
  repairAttempt: number,
  gateFeedback: string,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `E4 gate repair ${repairAttempt}`,
    status: 'completed', nextSteps: [], result: JSON.stringify({ moduleName, reviewRound: round, repairAttempt, gateFeedback }, null, 2),
    planning: { planId: `e4-gate-repair-${round}-${repairAttempt}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E4 intents.');
  const applied = response as mls.msg.ResponseApplyIntents;
  context.task = applied.task;
  if (applied.message) context.message = applied.message;
}

function parseE4Args(value: unknown): Ns4E4Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed) || parsed.planId !== 'e4-ontology') throw new Error('Invalid E4 step arguments.');
  return {
    planId: 'e4-ontology', solutionMode: 'new',
    ...(typeof parsed.moduleName === 'string' && parsed.moduleName.trim() ? { moduleName: parsed.moduleName.trim() } : {}),
    ...(typeof parsed.adjustment === 'string' && parsed.adjustment.trim() ? { adjustment: parsed.adjustment.trim() } : {}),
    ...(typeof parsed.reviewRound === 'number' ? { reviewRound: parsed.reviewRound } : {}),
    ...(typeof parsed.repairAttempt === 'number' ? { repairAttempt: parsed.repairAttempt } : {}),
    ...(typeof parsed.gateFeedback === 'string' && parsed.gateFeedback.trim() ? { gateFeedback: parsed.gateFeedback.trim() } : {}),
  };
}

function resolveE4Args(context: mls.msg.ExecutionContext, value: unknown): Ns4E4Args & { moduleName: string } {
  const parsed = parseE4Args(value);
  const moduleName = parsed.moduleName || findE3ModuleName(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E3 module result not found for E4.');
  return { ...parsed, moduleName };
}

function findE3ModuleName(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e3-result');
  if (!result || result.type !== 'result' || !result.result) return '';
  const parsed = parseMaybeJson(result.result);
  return isRecord(parsed) && typeof parsed.moduleName === 'string' ? parsed.moduleName.trim() : '';
}

interface Ns4E3Handoff {
  moduleName: string;
  artifactPath: string;
  approvedBy: Ns4ApprovedBy;
  approvedAt: string;
  approvedReview?: Ns4E3Review;
}

function findE3Handoff(context: mls.msg.ExecutionContext, moduleName: string): Ns4E3Handoff | null {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps)
    .find(step => step.planning?.planId === 'e3-result');
  if (!result || result.type !== 'result' || !result.result) return null;
  const parsed = parseMaybeJson(result.result);
  if (!isRecord(parsed) || parsed.moduleName !== moduleName
    || typeof parsed.artifactPath !== 'string' || !parsed.artifactPath.trim()
    || (parsed.approvedBy !== 'human' && parsed.approvedBy !== 'auto')
    || typeof parsed.approvedAt !== 'string' || !parsed.approvedAt.trim()) return null;
  const approvedReview = isRecord(parsed.approvedReview)
    ? normalizeNs4E3Review(parsed.approvedReview, moduleName)
    : undefined;
  return {
    moduleName,
    artifactPath: parsed.artifactPath.trim(),
    approvedBy: parsed.approvedBy,
    approvedAt: parsed.approvedAt.trim(),
    ...(approvedReview ? { approvedReview } : {}),
  };
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

function isFast(context: mls.msg.ExecutionContext): boolean { return context.task?.iaCompressed?.longMemory?.fastMode === 'true'; }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function readE4FailureMessage(payload: unknown): string {
  if (isRecord(payload) && payload.type === 'result' && typeof payload.result === 'string' && payload.result.trim()) return payload.result.trim();
  return 'E4 returned an invalid ontology payload.';
}
