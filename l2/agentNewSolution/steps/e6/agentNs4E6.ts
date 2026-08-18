/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6/agentNs4E6.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution/helpers/ns4StepTree.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import {
  createNs4E6Step, isNs4Pipeline, markNs4E6Approved, markNs4E6Failed, markNs4E6Running,
  markNs4E6WaitingHuman, markNs4ModuleE6Approved, plainNs4StepTitle, Ns4ApprovedBy,
  Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution/helpers/ns4Clarification.js';
import {
  readNs4ApprovedJourneys, readNs4ApprovedOntology,
} from '/_102020_/l2/agentNewSolution/helpers/ns4ApprovedArtifacts.js';
import {
  ns4E6DraftFile, ns4RulesFile, readNs4AgentText, readNs4DefsJson, readNs4Module,
  readNs4Pipeline, readNs4Text, writeNs4Composition, writeNs4E6Approved, writeNs4E6Draft,
  writeNs4Module, writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Fs.js';
import { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution/steps/e5/contracts.js';
import {
  buildNs4CompositionArtifact, normalizeNs4E6Review, Ns4E6Review, Ns4E6ReviewEvent,
} from '/_102020_/l2/agentNewSolution/steps/e6/contracts.js';
import { validateNs4E6Review } from '/_102020_/l2/agentNewSolution/steps/e6/gate.js';

interface Ns4E6Args {
  planId: 'e6-behaviors';
  moduleName?: string;
  reviewRound?: number;
  adjustment?: string;
  gateFeedback?: string;
  repairAttempt?: number;
  transportRetryAttempt?: number;
}

interface Ns4PersistedE6 {
  moduleName: string;
  recommendationCount: number;
  artifactPath: string;
  approvedPath: string;
}

const MAX_REPAIRS = 1;
const MAX_TRANSPORT_RETRIES = 1;

export async function beforeNs4E6PromptStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution:e6] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    if (pipeline.steps.e5?.status !== 'approved') throw new Error(`E5 approved pipeline not found for ${moduleName}.`);
    const [source, prompt, previous] = await Promise.all([
      readCompactSource(moduleName), readNs4AgentText('steps/e6', 'prompt'), readDraft(moduleName),
    ]);
    const round = parsed.reviewRound || pipeline.steps.e6?.reviewRound || 1;
    const humanPrompt = [
      `## Required identity\nmoduleName=${moduleName}; reviewRound=${round}; userLanguage=${source.userLanguage}`,
      `## Compact approved L4\n${JSON.stringify(source)}`,
      parsed.adjustment ? `## Human change request\n${parsed.adjustment}` : '',
      parsed.gateFeedback ? `## Deterministic repair required\n${parsed.gateFeedback}` : '',
      previous ? `## Current proposal; preserve unrelated items\n${JSON.stringify(previous)}` : '',
    ].filter(Boolean).join('\n\n');
    return [promptReady(context, parentStep, hookSequential, args || String(step.prompt || ''), prompt, humanPrompt)];
  } catch (error) {
    const message = errorMessage(error); await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function afterNs4E6PromptStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args?: string,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    const round = parsed.reviewRound || pipeline.steps.e6?.reviewRound || 1;
    await writeNs4Pipeline(markNs4E6Running(pipeline, round));
    const mutationParent = findParent(context, parentStep, step);
    const payload = unwrap(step.interaction?.payload?.[0]);
    if (!isRecord(payload)) {
      const failure = readPromptFailure(step, 'E6 returned no usable composition proposal.');
      const attempt = parsed.transportRetryAttempt || 0;
      if (attempt < MAX_TRANSPORT_RETRIES) return [
        addStep(context, mutationParent, createNs4E6Step(moduleName, round, '', [], pipeline.presentation.stepTitles['e6-behaviors'], '', 0, attempt + 1)),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `E6 transport retry ${attempt + 1} scheduled: ${failure}`, 'input_output'),
      ];
      throw new Error(failure);
    }

    const module = await readNs4Module(moduleName); if (!module) throw new Error(`Module artifact not found for ${moduleName}.`);
    const review = normalizeNs4E6Review(payload, moduleName);
    review.moduleName = moduleName; review.userLanguage = module.presentation.userLanguage; review.reviewRound = round;
    const gate = validateNs4E6Review(review, module);
    const draftPath = await writeNs4E6Draft(moduleName, review);
    if (!gate.ok) {
      const feedback = formatGate(gate.issues); const attempt = parsed.repairAttempt || 0;
      if (attempt < MAX_REPAIRS) return [
        addStep(context, mutationParent, createNs4E6Step(moduleName, round, '', [], pipeline.presentation.stepTitles['e6-behaviors'], feedback, attempt + 1)),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E6 composition gate scheduled one bounded repair.', 'input_output'),
      ];
      throw new Error(feedback);
    }

    await writeNs4Pipeline(markNs4E6WaitingHuman(await requirePipeline(moduleName), round, draftPath));
    if (isFast(context)) {
      const saved = await persist(moduleName, review, 'auto');
      return [resultStep(context, mutationParent, saved, 'E6 composition auto-approved'),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `E6 approved ${saved.recommendationCount} recommendations.`, 'input_output')];
    }
    return [clarificationStep(context, mutationParent, review, pipeline.presentation.stepTitles['e6-behaviors']),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E6 composition ready for human approval.', 'input_output')];
  } catch (error) {
    const message = errorMessage(error); await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function beforeNs4E6ClarificationStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep, hookSequential: number, json: unknown,
): Promise<HTMLElement> {
  const review = normalizeNs4E6Review(parse(json));
  const module = await readNs4Module(review.moduleName); if (!module) throw new Error(`Module artifact not found for ${review.moduleName}.`);
  const gate = validateNs4E6Review(review, module); if (!gate.ok) throw new Error(formatGate(gate.issues));
  await import('/_102020_/l2/agentNewSolution/widgets/widgetNs4Composition.js');
  const element = document.createElement('widget-ns4-composition-102020');
  (element as unknown as { value: Ns4E6Review }).value = review;
  element.addEventListener('ns4-composition-review', (event: Event) => {
    const detail = (event as CustomEvent<Ns4E6ReviewEvent>).detail;
    void applyReview(context, parentStep, step, hookSequential, detail)
      .catch(error => { showNs4ClarificationError(element, error); console.error(`[${agent.agentName}] ${errorMessage(error)}`); });
  });
  return element;
}

async function applyReview(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep,
  hookSequential: number, event: Ns4E6ReviewEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution:e6] task invalid');
  if (event.action === 'cancel') throw new Error('Cancelamento terminal ainda depende de suporte explícito do collab-messages; esta revisão foi mantida aberta sem alterar o pipeline.');
  const mutationParent = findParent(context, parentStep);
  if (event.action === 'approve') {
    const saved = await persist(event.review.moduleName, normalizeNs4E6Review(event.review), 'human');
    await applyIntents(context, [resultStep(context, mutationParent, saved, 'E6 composition approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output')]);
  } else {
    const adjustment = event.adjustment.trim(); if (!adjustment) throw new Error('Descreva a alteração desejada antes de enviar.');
    const review = normalizeNs4E6Review(event.review); const nextRound = review.reviewRound + 1;
    const pipeline = await requirePipeline(review.moduleName);
    await writeNs4E6Draft(review.moduleName, review);
    await writeNs4Pipeline(markNs4E6Running(pipeline, nextRound));
    await applyIntents(context, [
      addStep(context, mutationParent, createNs4E6Step(review.moduleName, nextRound, adjustment, [], pipeline.presentation.stepTitles['e6-behaviors'])),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  }
  await continuePoolingTask(context);
}

async function persist(moduleName: string, review: Ns4E6Review, approvedBy: Ns4ApprovedBy): Promise<Ns4PersistedE6> {
  const module = await readNs4Module(moduleName); if (!module) throw new Error(`Module artifact not found for ${moduleName}.`);
  const gate = validateNs4E6Review(review, module); if (!gate.ok) throw new Error(formatGate(gate.issues));
  const approvedAt = new Date().toISOString();
  const artifact = await buildNs4CompositionArtifact(review, approvedBy, approvedAt);
  const artifactPath = await writeNs4Composition(moduleName, artifact);
  const approvedPath = await writeNs4E6Approved(moduleName, review);
  const pipeline = await requirePipeline(moduleName);
  await writeNs4Module(moduleName, markNs4ModuleE6Approved(module, approvedBy, approvedAt));
  await writeNs4Pipeline(markNs4E6Approved(pipeline, approvedBy, [artifactPath, approvedPath], approvedAt));
  return { moduleName, recommendationCount: artifact.recommendations.length, artifactPath, approvedPath };
}

async function readCompactSource(moduleName: string): Promise<Record<string, unknown>> {
  const [module, journeys, ontology, rules] = await Promise.all([
    readNs4Module(moduleName), readNs4ApprovedJourneys(moduleName), readNs4ApprovedOntology(moduleName),
    readNs4DefsJson<Ns4RulesArtifact>(ns4RulesFile(moduleName), true),
  ]);
  if (!module || !rules) throw new Error(`Approved E1 or E5 artifact not found for ${moduleName}.`);
  return {
    userLanguage: module.presentation.userLanguage,
    module: {
      purpose: module.module.purpose, businessScope: module.businessScope,
      declaredConstraints: module.declaredConstraints,
    },
    journeys: journeys.journeys.map(journey => ({
      journeyId: journey.journeyId, actorRef: journey.business.actorRef, goal: journey.business.goal,
      steps: journey.business.steps.map(step => ({ entity: step.entity, title: step.title, description: step.description })),
      outcome: journey.business.outcome.statement,
    })),
    ontology: ontology.entities.map(entity => ({
      entityId: entity.entityId, kind: entity.kind, description: entity.description,
      storageTarget: entity.storage.target,
    })),
    rules: rules.rules,
  };
}

async function readDraft(moduleName: string): Promise<Ns4E6Review | null> {
  const raw = await readNs4Text(ns4E6DraftFile(moduleName), false); const parsed = parse(raw);
  return isRecord(parsed) ? normalizeNs4E6Review(parsed, moduleName) : null;
}
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const state = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(state)) throw new Error(`agentNewSolution pipeline not found for ${moduleName}.`); return state;
}
async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return; try { const state = await readNs4Pipeline(moduleName); if (isNs4Pipeline(state)) await writeNs4Pipeline(markNs4E6Failed(state, error)); } catch { /* task trace fallback */ }
}
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E6Args & { moduleName: string } {
  const root = parse(value); if (!isRecord(root) || root.planId !== 'e6-behaviors') throw new Error('Invalid E6 step arguments.');
  const moduleName = text(root.moduleName) || findE5Module(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E5 module result not found for E6.');
  return { planId: 'e6-behaviors', moduleName,
    ...(number(root.reviewRound) ? { reviewRound: number(root.reviewRound) } : {}),
    ...(text(root.adjustment) ? { adjustment: text(root.adjustment) } : {}),
    ...(text(root.gateFeedback) ? { gateFeedback: text(root.gateFeedback) } : {}),
    ...(number(root.repairAttempt) ? { repairAttempt: number(root.repairAttempt) } : {}),
    ...(number(root.transportRetryAttempt) ? { transportRetryAttempt: number(root.transportRetryAttempt) } : {}) };
}
function findE5Module(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e5-result');
  const parsed = result?.type === 'result' ? parse(result.result) : null; return isRecord(parsed) ? text(parsed.moduleName) : '';
}
function findParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, phaseStep?: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parentStep, phaseStep);
}
function promptReady(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, hookSequential: number, args: string, systemPrompt: string, humanPrompt: string): mls.msg.AgentIntentPromptReady {
  return { type: 'prompt_ready', args, messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt, humanPrompt };
}
function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step };
}
function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, saved: Ns4PersistedE6, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, { type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [],
    result: JSON.stringify({ ...saved, completedStep: 'e6-behaviors', nextStep: 'e7-realization' }, null, 2),
    planning: { planId: 'e6-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep);
}
function clarificationStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, review: Ns4E6Review, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, { type: 'clarification', stepId: 0, interaction: null, stepTitle: plainNs4StepTitle(title), status: 'pending', nextSteps: [], json: JSON.stringify(review),
    planning: { planId: `e6-composition-review-round-${review.reviewRound}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' } } as mls.msg.AIClarificationStep);
}
function updateStatus(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, status: mls.msg.AIStepStatus, traceMsg?: string, cleaner?: 'input' | 'input_output'): mls.msg.AgentIntentUpdateStatus {
  return { type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId, status,
    ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}) };
}
async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E6 intents.');
  const applied = response as mls.msg.ResponseApplyIntents; context.task = applied.task; if (applied.message) context.message = applied.message;
}
function unwrap(value: unknown): unknown { const root = parse(value); return isRecord(root) && root.type === 'flexible' ? parse(root.result) : root; }
function parse(value: unknown): unknown { if (typeof value !== 'string') return value; const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); try { return JSON.parse(clean); } catch { return value; } }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function readPromptFailure(step: mls.msg.AIAgentStep, fallback: string): string { const trace = Array.isArray(step.interaction?.trace) ? step.interaction.trace.map(String) : []; const failure = [...trace].reverse().find(line => /429 Too Many Requests|Error invoking Collab LLM proxy|AI request failed/i.test(line)); return failure ? `${fallback} ${failure}` : fallback; }
function formatGate(issues: Array<{ code: string; path: string; message: string }>): string { return issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function number(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0; }
function memoryString(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function isFast(context: mls.msg.ExecutionContext): boolean { return memoryString(context, 'fastMode') === 'true'; }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
