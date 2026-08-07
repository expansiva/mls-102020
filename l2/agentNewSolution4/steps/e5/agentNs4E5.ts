/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/agentNs4E5.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import {
  createNs4E5JudgeStep, createNs4E5Step, formatNs4VisibleStepTitle, isNs4Pipeline,
  markNs4E5Approved, markNs4E5Failed, markNs4E5Running, markNs4E5WaitingHuman,
  markNs4ModuleE5Approved, Ns4ApprovedBy, Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution4/helpers/ns4Clarification.js';
import {
  ns4AccessMatrixFile, ns4E2DraftFile, ns4E4DraftFile, ns4E5DraftFile,
  readNs4AgentText, readNs4DefsJson, readNs4Module, readNs4Pipeline, readNs4Text,
  writeNs4E5Approved, writeNs4E5Draft, writeNs4Module, writeNs4Pipeline, writeNs4Rule, writeNs4RuleIndex,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import { normalizeNs4E2Review, Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { normalizeNs4E3Review, Ns4AccessMatrixArtifact, Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { normalizeNs4E4Review, Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import { buildNs4RuleArtifacts, normalizeNs4E5Review, Ns4E5Review, Ns4E5ReviewEvent } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import {
  ns4AccessConstraintSourceRef, ns4JourneyRuleSourceRef, ns4OntologyInvariantSourceRef,
  Ns4E5Sources, validateNs4E5Review,
} from '/_102020_/l2/agentNewSolution4/steps/e5/gate.js';
import {
  formatNs4E5JudgeFeedback, normalizeNs4E5JudgeVerdict, validateNs4E5JudgeVerdict,
} from '/_102020_/l2/agentNewSolution4/steps/e5/judge.js';
import { resolveNs4E5HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e5/hookArgs.js';

interface Ns4E5Args {
  planId: 'e5-rules'; stage?: 'proposal' | 'judge'; moduleName?: string; reviewRound?: number;
  adjustment?: string; gateFeedback?: string; repairAttempt?: number; judgeAttempt?: number;
}
interface Ns4PersistedE5 { moduleName: string; ruleCount: number; artifactPaths: string[]; indexPath: string; approvedPath: string; }
const MAX_REPAIRS = 1;
const MAX_JUDGE_ATTEMPTS = 2;

export async function beforeNs4E5PromptStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution4:e5] task invalid');
  let moduleName = '';
  try {
    const hookArgs = resolveNs4E5HookArgs(args, step.prompt);
    const parsed = resolveArgs(context, hookArgs); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    if (pipeline.steps.e4?.status !== 'approved') throw new Error(`E4 approved pipeline not found for ${moduleName}.`);
    const sources = await readSources(moduleName);
    const reviewRound = parsed.reviewRound || pipeline.steps.e5?.reviewRound || 1;
    if (parsed.stage === 'judge') {
      const draft = await readDraft(moduleName);
      if (!draft) throw new Error(`E5 draft not found for semantic judge in ${moduleName}.`);
      return [promptReady(context, parentStep, hookSequential, hookArgs,
        await readNs4AgentText('steps/e5', 'judge'), buildHumanPrompt(sources, reviewRound, draft))];
    }
    const [prompt, platform] = await Promise.all([
      readNs4AgentText('steps/e5', 'prompt'), readNs4AgentText('skills', 'platform'),
    ]);
    const previousDraft = parsed.adjustment || parsed.gateFeedback ? await readDraft(moduleName) : null;
    const extra = [
      parsed.adjustment ? `## Human change request\n${parsed.adjustment}` : '',
      parsed.gateFeedback ? `## Required repair\n${parsed.gateFeedback}` : '',
      previousDraft ? `## Full current E5 draft\n${JSON.stringify(previousDraft, null, 2)}` : '',
    ].filter(Boolean).join('\n\n');
    return [promptReady(context, parentStep, hookSequential, hookArgs,
      prompt.replace('{{platformSkill}}', platform), `${buildHumanPrompt(sources, reviewRound)}${extra ? `\n\n${extra}` : ''}`)];
  } catch (error) {
    const message = errorMessage(error); await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

export async function afterNs4E5PromptStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const args = resolveArgs(context, step.prompt); moduleName = args.moduleName;
    const pipeline = await requirePipeline(moduleName);
    const round = args.reviewRound || pipeline.steps.e5?.reviewRound || 1;
    await writeNs4Pipeline(markNs4E5Running(pipeline, round));
    if (args.stage === 'judge') return await afterJudge(context, parentStep, step, hookSequential, args, pipeline);
    const payload = unwrap(step.interaction?.payload?.[0]);
    if (!isRecord(payload) || payload.type !== 'clarification' || !isRecord(payload.json)) throw new Error('E5 returned an invalid rules clarification payload.');
    const review = normalizeNs4E5Review(payload.json, moduleName); review.moduleName = moduleName; review.reviewRound = round;
    const sources = await readSources(moduleName); const gate = validateNs4E5Review(review, sources);
    if (!gate.ok) {
      const feedback = gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
      await writeNs4E5Draft(moduleName, review);
      if ((args.repairAttempt || 0) < MAX_REPAIRS) return [
        addStep(context, findParent(context, parentStep), createNs4E5Step(moduleName, round, '', [], pipeline.presentation.stepTitles['e5-rules'], feedback, 1)),
        traceStep(context, findParent(context, parentStep), `E5 deterministic repair`, { reviewRound: round, feedback }),
        updateStatus(context, findParent(context, parentStep), step, hookSequential, 'completed', 'E5 gate scheduled one bounded repair.', 'input_output'),
      ];
      throw new Error(feedback);
    }
    await writeNs4E5Draft(moduleName, review);
    const mutationParent = findParent(context, parentStep);
    return [
      addStep(context, mutationParent, createNs4E5JudgeStep(moduleName, round, args.repairAttempt || 0, 1, pipeline.presentation.stepTitles['e5-rules'])),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E5 structural gate passed; semantic judge scheduled.', 'input_output'),
    ];
  } catch (error) {
    const message = errorMessage(error); await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function afterJudge(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep,
  hookSequential: number, args: Ns4E5Args & { moduleName: string }, pipeline: Ns4PipelineState,
): Promise<mls.msg.AgentIntent[]> {
  const round = args.reviewRound || 1; const attempt = args.judgeAttempt || 1; const mutationParent = findParent(context, parentStep);
  const verdict = normalizeNs4E5JudgeVerdict(step.interaction?.payload?.[0], args.moduleName, round);
  const errors = validateNs4E5JudgeVerdict(verdict, args.moduleName, round);
  if (errors.length) {
    if (attempt < MAX_JUDGE_ATTEMPTS) return [
      addStep(context, mutationParent, createNs4E5JudgeStep(args.moduleName, round, args.repairAttempt || 0, attempt + 1, pipeline.presentation.stepTitles['e5-rules'])),
      traceStep(context, mutationParent, 'E5 invalid judge verdict', { errors }),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'Invalid E5 judge verdict; one retry scheduled.', 'input_output'),
    ];
    throw new Error(`Invalid E5 judge verdict: ${errors.join(' ')}`);
  }
  const review = normalizeNs4E5Review(await readDraft(args.moduleName), args.moduleName);
  const gate = validateNs4E5Review(review, await readSources(args.moduleName));
  if (!gate.ok) throw new Error(`E5 draft is no longer valid: ${gate.issues.map(issue => issue.code).join(', ')}.`);
  if (!verdict.complete) {
    const feedback = formatNs4E5JudgeFeedback(verdict);
    if ((args.repairAttempt || 0) < MAX_REPAIRS) return [
      addStep(context, mutationParent, createNs4E5Step(args.moduleName, round, '', [], pipeline.presentation.stepTitles['e5-rules'], feedback, 1)),
      traceStep(context, mutationParent, 'E5 semantic repair', verdict),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E5 judge scheduled one bounded repair.', 'input_output'),
    ];
    throw new Error(`E5 remains incomplete after repair.\n${feedback}`);
  }
  const draftPath = await writeNs4E5Draft(args.moduleName, review);
  await writeNs4Pipeline(markNs4E5WaitingHuman(await requirePipeline(args.moduleName), round, draftPath));
  const trace = traceStep(context, mutationParent, 'E5 semantic judge', verdict);
  if (isFast(context)) {
    const saved = await persist(args.moduleName, review, 'auto');
    return [trace, resultStep(context, mutationParent, saved, 'E5 rules auto-approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `E5 approved ${saved.ruleCount} rules.`, 'input_output')];
  }
  return [trace, clarificationStep(context, mutationParent, review, pipeline.presentation.stepTitles['e5-rules']),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E5 judged complete; human review opened.', 'input_output')];
}

export async function beforeNs4E5ClarificationStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep, hookSequential: number, json: unknown,
): Promise<HTMLElement> {
  const review = normalizeNs4E5Review(parse(json));
  const gate = validateNs4E5Review(review, await readSources(review.moduleName));
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const widgetModule = '/_102020_/l2/agentNewSolution4/widgets/widgetNs4Rules.js';
  await import(widgetModule);
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
  if (!context.task) throw new Error('[agentNewSolution4:e5] task invalid');
  if (event.action === 'cancel') throw new Error('Cancelamento terminal ainda depende de suporte explícito do collab-messages; esta revisão foi mantida aberta sem alterar o pipeline.');
  const mutationParent = findParent(context, parentStep);
  if (event.action === 'approve') {
    const saved = await persist(event.review.moduleName, event.review, 'human');
    await applyIntents(context, [resultStep(context, mutationParent, saved, 'E5 rules approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output')]);
  } else {
    const adjustment = event.adjustment.trim(); if (!adjustment) throw new Error('Descreva a alteração desejada antes de enviar.');
    const nextRound = event.review.reviewRound + 1; const pipeline = await requirePipeline(event.review.moduleName);
    await writeNs4E5Draft(event.review.moduleName, event.review);
    await writeNs4Pipeline(markNs4E5Running(pipeline, nextRound));
    await applyIntents(context, [
      addStep(context, mutationParent, createNs4E5Step(event.review.moduleName, nextRound, adjustment, [], pipeline.presentation.stepTitles['e5-rules'])),
      traceStep(context, mutationParent, `E5 changes requested after round ${event.review.reviewRound}`, { adjustment, reviewRound: event.review.reviewRound }),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  }
  await continuePoolingTask(context);
}

async function persist(moduleName: string, review: Ns4E5Review, approvedBy: Ns4ApprovedBy): Promise<Ns4PersistedE5> {
  const sources = await readSources(moduleName); const gate = validateNs4E5Review(review, sources);
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const approvedAt = new Date().toISOString(); const built = await buildNs4RuleArtifacts(review, approvedBy, approvedAt);
  const artifactPaths: string[] = [];
  for (const rule of built.rules) artifactPaths.push(await writeNs4Rule(moduleName, rule.ruleId, rule));
  const indexPath = await writeNs4RuleIndex(moduleName, built.index);
  const approvedPath = await writeNs4E5Approved(moduleName, review);
  const moduleArtifact = await readNs4Module(moduleName); if (!moduleArtifact) throw new Error(`Module artifact not found for ${moduleName}.`);
  const pipeline = await requirePipeline(moduleName);
  await writeNs4Module(moduleName, markNs4ModuleE5Approved(moduleArtifact, approvedBy, approvedAt));
  await writeNs4Pipeline(markNs4E5Approved(pipeline, approvedBy, [...artifactPaths, indexPath, approvedPath], approvedAt));
  return { moduleName, ruleCount: built.rules.length, artifactPaths, indexPath, approvedPath };
}

async function readSources(moduleName: string): Promise<Ns4E5Sources> {
  const [module, journeyRaw, accessArtifact, ontologyRaw] = await Promise.all([
    readNs4Module(moduleName), readNs4Text(ns4E2DraftFile(moduleName), true),
    readNs4DefsJson<Ns4AccessMatrixArtifact>(ns4AccessMatrixFile(moduleName), true),
    readNs4Text(ns4E4DraftFile(moduleName), true),
  ]);
  if (!module || !accessArtifact) throw new Error(`Approved E1/E3 sources not found for ${moduleName}.`);
  return {
    module, journeys: normalizeNs4E2Review(JSON.parse(journeyRaw), moduleName),
    access: normalizeNs4E3Review(accessArtifact, moduleName), ontology: normalizeNs4E4Review(JSON.parse(ontologyRaw), moduleName),
  };
}

function buildHumanPrompt(sources: Ns4E5Sources, reviewRound: number, draft?: unknown): string {
  const sourceCatalog = [
    ...sources.journeys.journeys.flatMap(journey => journey.business.businessRules.map(rule => ({
      sourceRef: ns4JourneyRuleSourceRef(journey.journeyId, rule.journeyRuleId), sourceType: 'journeyRule', statement: rule.statement,
    }))),
    ...sources.ontology.entities.flatMap(entity => entity.invariants.map(invariant => ({
      sourceRef: ns4OntologyInvariantSourceRef(entity.entityId, invariant.invariantId), sourceType: 'ontologyInvariant', statement: invariant.description,
    }))),
    ...sources.access.grants.flatMap(grant => grant.constraints.map((statement, index) => ({
      sourceRef: ns4AccessConstraintSourceRef(grant.profileRef, grant.authorityRef, index), sourceType: 'accessConstraint', statement,
    }))),
    ...sources.module.declaredConstraints.mandatoryIntegrations.map(dependency => ({
      sourceRef: `module:integration:${dependency.dependencyId}`, sourceType: 'declaredConstraint', statement: `${dependency.title}: ${dependency.reason}`,
    })),
    ...(sources.module.declaredConstraints.regulatoryNotes ? [{ sourceRef: 'module:regulatoryNotes', sourceType: 'declaredConstraint', statement: sources.module.declaredConstraints.regulatoryNotes }] : []),
    ...(sources.module.declaredConstraints.criticalNotes ? [{ sourceRef: 'module:criticalNotes', sourceType: 'declaredConstraint', statement: sources.module.declaredConstraints.criticalNotes }] : []),
  ];
  return [
    '## Approved E1 module contract', JSON.stringify(sources.module, null, 2),
    '## Approved E2 journeys', JSON.stringify(sources.journeys, null, 2),
    '## Approved E3 access matrix', JSON.stringify(sources.access, null, 2),
    '## Approved E4 ontology', JSON.stringify(sources.ontology, null, 2),
    '## Exact source-reference catalog', JSON.stringify(sourceCatalog, null, 2),
    `## Required review round\n${reviewRound}`,
    ...(draft ? ['## Complete E5 draft to judge', JSON.stringify(draft, null, 2)] : []),
  ].join('\n\n');
}

function promptReady(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, hookSequential: number, args: string | undefined, systemPrompt: string, humanPrompt: string): mls.msg.AgentIntentPromptReady {
  return { type: 'prompt_ready', args: args || '', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt, humanPrompt };
}
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E5Args & { moduleName: string } {
  const root = parse(value); if (!isRecord(root) || root.planId !== 'e5-rules') throw new Error('Invalid E5 step arguments.');
  const moduleName = text(root.moduleName) || findE4Module(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E4 module result not found for E5.');
  return { planId: 'e5-rules', moduleName, ...(root.stage === 'judge' ? { stage: 'judge' as const } : {}),
    ...(number(root.reviewRound) ? { reviewRound: number(root.reviewRound) } : {}),
    ...(text(root.adjustment) ? { adjustment: text(root.adjustment) } : {}),
    ...(text(root.gateFeedback) ? { gateFeedback: text(root.gateFeedback) } : {}),
    ...(number(root.repairAttempt) ? { repairAttempt: number(root.repairAttempt) } : {}),
    ...(number(root.judgeAttempt) ? { judgeAttempt: number(root.judgeAttempt) } : {}) };
}
function findE4Module(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e4-result');
  const parsed = result?.type === 'result' ? parse(result.result) : null; return isRecord(parsed) ? text(parsed.moduleName) : '';
}
async function readDraft(moduleName: string): Promise<unknown> { const raw = await readNs4Text(ns4E5DraftFile(moduleName), false); try { return raw.trim() ? JSON.parse(raw) : null; } catch { return null; } }
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> { const state = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(state)) throw new Error(`agentNewSolution4 pipeline not found for ${moduleName}.`); return state; }
async function recordFailure(moduleName: string, error: string): Promise<void> { if (!moduleName) return; try { const state = await readNs4Pipeline(moduleName); if (isNs4Pipeline(state)) await writeNs4Pipeline(markNs4E5Failed(state, error)); } catch { /* task trace is fallback */ } }
function findParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const all = getAllSteps(context.task?.iaCompressed?.nextSteps); const current = all.find(item => item.stepId === parentStep.stepId);
  if (current?.type === 'agent' && current.status !== 'completed' && current.status !== 'failed') return current;
  const owner = all.find(candidate => candidate.type === 'agent' && candidate.status !== 'completed' && candidate.status !== 'failed'
    && (candidate.nextSteps?.some(child => child.stepId === parentStep.stepId) || candidate.interaction?.payload?.some(child => child.stepId === parentStep.stepId)));
  const root = context.task?.iaCompressed?.nextSteps?.[0]; return owner?.type === 'agent' ? owner : root?.type === 'agent' ? root : parentStep;
}
function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step };
}
function traceStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, title: string, value: unknown): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, { type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [], result: JSON.stringify(value, null, 2),
    planning: { planId: `e5-trace-${Date.now()}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep);
}
function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, saved: Ns4PersistedE5, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, { type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [],
    result: JSON.stringify({ ...saved, completedStep: 'e5-rules', nextStep: 'e6-behaviors' }, null, 2),
    planning: { planId: 'e5-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep);
}
function clarificationStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, review: Ns4E5Review, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, { type: 'clarification', stepId: 0, interaction: null,
    stepTitle: formatNs4VisibleStepTitle('e5-rules', title), status: 'pending', nextSteps: [], json: JSON.stringify(review),
    planning: { planId: `e5-rules-review-round-${review.reviewRound}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' } } as mls.msg.AIClarificationStep);
}
function updateStatus(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, status: mls.msg.AIStepStatus, traceMsg?: string, cleaner?: 'input' | 'input_output'): mls.msg.AgentIntentUpdateStatus {
  return { type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, stepId: step.stepId, status,
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
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function number(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0; }
function memoryString(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function isFast(context: mls.msg.ExecutionContext): boolean { return memoryString(context, 'fastMode') === 'true'; }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
