/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e5/agentNs4E5.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E5 owns one maintainable catalog. Earlier artifacts reference rule ids; later compilers scan the
// complete L4 and bind those ids to pages, use cases, tables and technical enforcement.

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution/helpers/ns4StepTree.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import {
  createNs4E5Step, isNs4Pipeline, markNs4E5Approved, markNs4E5Failed, markNs4E5Running,
  markNs4E5WaitingHuman, markNs4ModuleE5Approved, plainNs4StepTitle, Ns4ApprovedBy,
  Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution/helpers/ns4Clarification.js';
import {
  readNs4ApprovedAccess, readNs4ApprovedJourneys, readNs4ApprovedOntology,
} from '/_102020_/l2/agentNewSolution/helpers/ns4ApprovedArtifacts.js';
import {
  ns4E5DraftFile, readNs4AgentText, readNs4Module, readNs4Pipeline, readNs4Text,
  writeNs4E5Approved, writeNs4E5Draft, writeNs4Module, writeNs4Pipeline, writeNs4Rules,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Fs.js';
import {
  buildNs4RulesArtifact, normalizeNs4E5Review, Ns4E5Review, Ns4E5ReviewEvent,
} from '/_102020_/l2/agentNewSolution/steps/e5/contracts.js';
import {
  collectNs4ReferencedRuleIds, Ns4E5Sources, validateNs4E5Review,
} from '/_102020_/l2/agentNewSolution/steps/e5/gate.js';
import { decideNs4LaterCheckpoint, NS4_UNAVAILABLE_SMART_SIGNAL } from '/_102020_/l2/agentNewSolution/helpers/ns4ReviewPolicy.js';

interface Ns4E5Args {
  planId: 'e5-rules';
  moduleName?: string;
  reviewRound?: number;
  adjustment?: string;
  gateFeedback?: string;
  repairAttempt?: number;
  transportRetryAttempt?: number;
}

interface Ns4PersistedE5 {
  moduleName: string;
  ruleCount: number;
  artifactPath: string;
  approvedPath: string;
}

const MAX_REPAIRS = 1;
const MAX_TRANSPORT_RETRIES = 1;

export async function beforeNs4E5PromptStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution:e5] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    if (pipeline.steps.e4?.status !== 'approved') throw new Error(`E4 approved pipeline not found for ${moduleName}.`);
    const [sources, prompt, previous] = await Promise.all([
      readSources(moduleName), readNs4AgentText('steps/e5', 'prompt'), readDraft(moduleName),
    ]);
    const round = parsed.reviewRound || pipeline.steps.e5?.reviewRound || 1;
    const humanPrompt = [
      `## Required identity\nmoduleName=${moduleName}; reviewRound=${round}; userLanguage=${sources.module.presentation.userLanguage}`,
      `## Rule ids already referenced by approved L4\n${JSON.stringify(collectNs4ReferencedRuleIds(sources))}`,
      `## Approved L4 business context\n${JSON.stringify(compactSources(sources))}`,
      parsed.adjustment ? `## Human change request\n${parsed.adjustment}` : '',
      parsed.gateFeedback ? `## Deterministic repair required\n${parsed.gateFeedback}` : '',
      previous ? `## Current catalog; preserve unrelated rules exactly\n${JSON.stringify(previous)}` : '',
    ].filter(Boolean).join('\n\n');
    return [promptReady(context, parentStep, hookSequential, args || String(step.prompt || ''), prompt, humanPrompt)];
  } catch (error) {
    const message = errorMessage(error); await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function afterNs4E5PromptStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args?: string,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    const round = parsed.reviewRound || pipeline.steps.e5?.reviewRound || 1;
    await writeNs4Pipeline(markNs4E5Running(pipeline, round));
    const mutationParent = findParent(context, parentStep, step);
    const payload = unwrap(step.interaction?.payload?.[0]);
    if (!isRecord(payload)) {
      const failure = readPromptFailure(step, 'E5 returned no usable rule catalog.');
      const attempt = parsed.transportRetryAttempt || 0;
      if (attempt < MAX_TRANSPORT_RETRIES) return [
        addStep(context, mutationParent, createNs4E5Step(moduleName, round, '', [], pipeline.presentation.stepTitles['e5-rules'], '', 0, attempt + 1)),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `E5 transport retry ${attempt + 1} scheduled: ${failure}`, 'input_output'),
      ];
      throw new Error(failure);
    }

    const sources = await readSources(moduleName);
    const review = normalizeNs4E5Review(payload, moduleName);
    review.moduleName = moduleName;
    review.userLanguage = sources.module.presentation.userLanguage;
    review.reviewRound = round;
    const gate = validateNs4E5Review(review, sources);
    const draftPath = await writeNs4E5Draft(moduleName, review);
    if (!gate.ok) {
      const feedback = formatGate(gate.issues);
      const attempt = parsed.repairAttempt || 0;
      if (attempt < MAX_REPAIRS) return [
        addStep(context, mutationParent, createNs4E5Step(moduleName, round, '', [], pipeline.presentation.stepTitles['e5-rules'], feedback, attempt + 1)),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E5 catalog gate scheduled one bounded repair.', 'input_output'),
      ];
      throw new Error(feedback);
    }

    await writeNs4Pipeline(markNs4E5WaitingHuman(await requirePipeline(moduleName), round, draftPath));
    const checkpoint = decideNs4LaterCheckpoint(context, sources.module, NS4_UNAVAILABLE_SMART_SIGNAL);
    if (!checkpoint.open) {
      const saved = await persist(moduleName, review, 'auto', checkpoint.autoReason);
      return [resultStep(context, mutationParent, saved, 'E5 rules auto-approved'),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `E5 approved ${saved.ruleCount} concise rules.`, 'input_output')];
    }
    return [clarificationStep(context, mutationParent, review, pipeline.presentation.stepTitles['e5-rules']),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E5 catalog ready for human review.', 'input_output')];
  } catch (error) {
    const message = errorMessage(error); await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function beforeNs4E5ClarificationStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep, hookSequential: number, json: unknown,
): Promise<HTMLElement> {
  const review = normalizeNs4E5Review(parse(json));
  const gate = validateNs4E5Review(review, await readSources(review.moduleName));
  if (!gate.ok) throw new Error(formatGate(gate.issues));
  await import('/_102020_/l2/agentNewSolution/widgets/widgetNs4Rules.js');
  const element = document.createElement('widget-ns4-rules-102020');
  (element as unknown as { value: Ns4E5Review }).value = review;
  element.addEventListener('ns4-rules-review', (event: Event) => {
    const detail = (event as CustomEvent<Ns4E5ReviewEvent>).detail;
    void applyReview(context, parentStep, step, hookSequential, detail)
      .catch(error => { showNs4ClarificationError(element, error); console.error(`[${agent.agentName}] ${errorMessage(error)}`); });
  });
  return element;
}

async function applyReview(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep,
  hookSequential: number, event: Ns4E5ReviewEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution:e5] task invalid');
  if (event.action === 'cancel') throw new Error('Cancelamento terminal ainda depende de suporte explícito do collab-messages; esta revisão foi mantida aberta sem alterar o pipeline.');
  const mutationParent = findParent(context, parentStep);
  if (event.action === 'approve') {
    const saved = await persist(event.review.moduleName, normalizeNs4E5Review(event.review), 'human');
    await applyIntents(context, [resultStep(context, mutationParent, saved, 'E5 rules approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output')]);
  } else {
    const adjustment = event.adjustment.trim(); if (!adjustment) throw new Error('Descreva a alteração desejada antes de enviar.');
    const review = normalizeNs4E5Review(event.review); const nextRound = review.reviewRound + 1;
    const pipeline = await requirePipeline(review.moduleName);
    await writeNs4E5Draft(review.moduleName, review);
    await writeNs4Pipeline(markNs4E5Running(pipeline, nextRound));
    await applyIntents(context, [
      addStep(context, mutationParent, createNs4E5Step(review.moduleName, nextRound, adjustment, [], pipeline.presentation.stepTitles['e5-rules'])),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  }
  await continuePoolingTask(context);
}

async function persist(moduleName: string, review: Ns4E5Review, approvedBy: Ns4ApprovedBy, autoReason?: string): Promise<Ns4PersistedE5> {
  const sources = await readSources(moduleName); const gate = validateNs4E5Review(review, sources);
  if (!gate.ok) throw new Error(formatGate(gate.issues));
  const approvedAt = new Date().toISOString();
  const artifact = await buildNs4RulesArtifact(review, approvedBy, approvedAt);
  const artifactPath = await writeNs4Rules(moduleName, artifact);
  const approvedPath = await writeNs4E5Approved(moduleName, review);
  const moduleArtifact = await readNs4Module(moduleName); if (!moduleArtifact) throw new Error(`Module artifact not found for ${moduleName}.`);
  const pipeline = await requirePipeline(moduleName);
  await writeNs4Module(moduleName, markNs4ModuleE5Approved(moduleArtifact, approvedBy, approvedAt, autoReason));
  await writeNs4Pipeline(markNs4E5Approved(pipeline, approvedBy, [artifactPath, approvedPath], approvedAt, autoReason));
  return { moduleName, ruleCount: artifact.rules.length, artifactPath, approvedPath };
}

async function readSources(moduleName: string): Promise<Ns4E5Sources> {
  const [module, journeys, access, ontology] = await Promise.all([
    readNs4Module(moduleName), readNs4ApprovedJourneys(moduleName), readNs4ApprovedAccess(moduleName), readNs4ApprovedOntology(moduleName),
  ]);
  if (!module) throw new Error(`Approved module source not found for ${moduleName}.`);
  return { module, journeys, access, ontology };
}

function compactSources(sources: Ns4E5Sources): unknown {
  return {
    module: { purpose: sources.module.module.purpose, businessScope: sources.module.businessScope, declaredConstraints: sources.module.declaredConstraints },
    journeys: sources.journeys.journeys.map(journey => ({
      journeyId: journey.journeyId, actorRef: journey.business.actorRef, goal: journey.business.goal,
      steps: journey.business.steps.map(step => ({ stepId: step.stepId, entity: step.entity, title: step.title, description: step.description })),
      outcome: journey.business.outcome, useRules: journey.business.useRules,
    })),
    access: {
      profiles: sources.access.profiles,
      authorities: sources.access.authorities,
      grants: sources.access.grants,
    },
    ontology: {
      entities: sources.ontology.entities.map(entity => ({
        entityId: entity.entityId, description: entity.description, fields: entity.fields,
        lifecycleStates: entity.lifecycleStates, lifecyclePredicates: entity.lifecyclePredicates,
        useRules: entity.useRules, storage: entity.storage,
      })),
      relationships: sources.ontology.relationships,
    },
  };
}

async function readDraft(moduleName: string): Promise<Ns4E5Review | null> {
  const raw = await readNs4Text(ns4E5DraftFile(moduleName), false); const parsed = parse(raw);
  return isRecord(parsed) ? normalizeNs4E5Review(parsed, moduleName) : null;
}
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const state = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(state)) throw new Error(`agentNewSolution pipeline not found for ${moduleName}.`); return state;
}
async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return; try { const state = await readNs4Pipeline(moduleName); if (isNs4Pipeline(state)) await writeNs4Pipeline(markNs4E5Failed(state, error)); } catch { /* task trace fallback */ }
}
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E5Args & { moduleName: string } {
  const root = parse(value); if (!isRecord(root) || root.planId !== 'e5-rules') throw new Error('Invalid E5 step arguments.');
  const moduleName = text(root.moduleName) || findE4Module(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E4 module result not found for E5.');
  return { planId: 'e5-rules', moduleName,
    ...(number(root.reviewRound) ? { reviewRound: number(root.reviewRound) } : {}),
    ...(text(root.adjustment) ? { adjustment: text(root.adjustment) } : {}),
    ...(text(root.gateFeedback) ? { gateFeedback: text(root.gateFeedback) } : {}),
    ...(number(root.repairAttempt) ? { repairAttempt: number(root.repairAttempt) } : {}),
    ...(number(root.transportRetryAttempt) ? { transportRetryAttempt: number(root.transportRetryAttempt) } : {}) };
}
function findE4Module(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e4-result');
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
function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, saved: Ns4PersistedE5, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, { type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [],
    result: JSON.stringify({ ...saved, completedStep: 'e5-rules', nextStep: 'e6-behaviors' }, null, 2),
    planning: { planId: 'e5-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep);
}
function clarificationStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, review: Ns4E5Review, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, { type: 'clarification', stepId: 0, interaction: null, stepTitle: plainNs4StepTitle(title), status: 'pending', nextSteps: [], json: JSON.stringify(review),
    planning: { planId: `e5-rules-review-round-${review.reviewRound}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' } } as mls.msg.AIClarificationStep);
}
function updateStatus(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, status: mls.msg.AIStepStatus, traceMsg?: string, cleaner?: 'input' | 'input_output'): mls.msg.AgentIntentUpdateStatus {
  return { type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId, status,
    ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}) };
}
async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E5 intents.');
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
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
