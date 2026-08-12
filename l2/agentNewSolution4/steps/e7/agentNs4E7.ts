/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e7/agentNs4E7.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution4/helpers/ns4StepTree.js';
import { createNs4FlexibleWorkerTool, unwrapNs4FlexibleWorkerPayload } from '/_102020_/l2/agentNewSolution4/helpers/ns4WorkerTools.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution4/helpers/ns4Clarification.js';
import {
  createNs4E2Step, createNs4E4Step, createNs4E7Step, isNs4Pipeline, markNs4E7Approved, markNs4E7Failed, markNs4E7Running,
  markNs4ModuleE7Approved, NS4_E7_MAX_PARALLEL, Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  readNs4ApprovedAccess, readNs4ApprovedJourneys, readNs4ApprovedOntology,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4ApprovedArtifacts.js';
import {
  ns4AccessMatrixFile, ns4AgentFile, ns4E7PlanDraftFile, ns4E7UseCaseDraftFile, ns4E7ValidationReportFile,
  ns4JourneyFile, ns4JourneyIndexFile, ns4OntologyIndexFile, ns4RulesFile,
  readNs4AgentText, readNs4DefsJson, readNs4Module, readNs4Pipeline, readNs4Text,
  writeNs4AccessMatrix, writeNs4E7PlanDraft, writeNs4E7UseCaseDraft, writeNs4E7ValidationReport, writeNs4Journey,
  writeNs4JourneyIndex, writeNs4Module, writeNs4Pipeline, writeNs4UseCase,
  writeNs4UseCaseIndex, writeNs4Workflow, writeNs4WorkflowIndex,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import type { Ns4JourneyArtifact, Ns4JourneyIndex } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4AccessMatrixArtifact } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4OntologyIndexArtifact } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import {
  buildNs4E7Plan, buildNs4RealizedAccessArtifact, buildNs4RealizedJourneyArtifact,
  buildNs4RealizedJourneyIndex, buildNs4UseCaseArtifacts, buildNs4WorkflowArtifacts,
  normalizeNs4UseCaseDraft, NS4_USE_CASE_DRAFT_VERSION, Ns4E7PlanDraft, Ns4E7SourceHashes, Ns4UseCaseDraft,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import {
  Ns4E7GateIssue, Ns4E7Sources, validateNs4E7Plan, validateNs4UseCaseDraft, validateNs4Workflows,
} from '/_102020_/l2/agentNewSolution4/steps/e7/gate.js';
import { createNs4E7LifecycleResolutionReview } from '/_102020_/l2/agentNewSolution4/steps/e7/lifecycleResolution.js';
import type { Ns4E7LifecycleResolutionEvent, Ns4E7LifecycleResolutionReview } from '/_102020_/l2/agentNewSolution4/steps/e7/lifecycleResolution.js';

interface Ns4E7Args {
  planId: 'e7-realization';
  moduleName?: string;
  stage?: 'plan' | 'finalize';
  repairRound?: number;
}

interface Ns4E7Bundle extends Ns4E7Sources {
  module: NonNullable<Awaited<ReturnType<typeof readNs4Module>>>;
  pipeline: Ns4PipelineState;
  journeyIndex: Ns4JourneyIndex;
  journeyArtifacts: Ns4JourneyArtifact[];
  accessArtifact: Ns4AccessMatrixArtifact;
  ontologyIndex: Ns4OntologyIndexArtifact;
  sourceHashes: Ns4E7SourceHashes;
}

const MAX_REPAIR_ROUNDS = 1;

interface Ns4E7ValidationReport {
  schemaVersion: '2026-08-12-ns4-e7-validation-report-v3';
  moduleName: string;
  attempts: Array<{ round: number; checkedAt: string; valid: number; invalid: number;
    results: Array<{ useCaseId: string; status: 'valid' | 'invalid' | 'missing'; issues: Ns4E7GateIssue[] }>;
    lifecycleIssues: Ns4E7GateIssue[] }>;
  finalStatus: 'repairing' | 'passed' | 'failed' | 'needsHumanResolution';
  updatedAt: string;
}

export async function beforeNs4E7PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution4:e7] task invalid');
  const selector = parseUseCaseSelector(args) || parseUseCaseSelector(step.prompt);
  let moduleName = '';
  try {
    if (selector) {
      moduleName = resolveModuleName(context);
      if (!moduleName) throw new Error('E6 module result not found for E7 worker.');
      return [await buildUseCasePrompt(context, parentStep, hookSequential, args || selector, moduleName, selector)];
    }
    const invocation = resolveArgs(context, args || step.prompt);
    moduleName = invocation.moduleName;
    if (invocation.stage === 'finalize') return finalizeE7(context, parentStep, step, hookSequential, invocation);
    return startE7(context, parentStep, step, hookSequential, moduleName, agent.agentName);
  } catch (error) {
    const message = errorMessage(error);
    if (selector) return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Use case ${selector} prompt failed; finalizer will repair it. | ${message}`, 'input_output')];
    await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function afterNs4E7PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const useCaseId = parseUseCaseSelector(args) || parseUseCaseSelector(step.prompt);
  if (!useCaseId) {
    const message = 'E7 deterministic plan/finalizer must not invoke an LLM afterPrompt.';
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
  let moduleName = '';
  try {
    moduleName = resolveModuleName(context);
    const [plan, bundle] = await Promise.all([readPlan(moduleName), loadBundle(moduleName)]);
    const payload = unwrap(step.interaction?.payload?.[0]);
    if (!isRecord(payload)) return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Use case ${useCaseId} returned no usable payload; finalizer will repair it.`, 'input_output')];
    const draft = normalizeNs4UseCaseDraft(payload, plan, useCaseId);
    await writeNs4E7UseCaseDraft(moduleName, useCaseId, draft);
    const gate = validateNs4UseCaseDraft(plan, draft, bundle);
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', gate.ok
      ? `Use case ${useCaseId} detail saved.`
      : `Use case ${useCaseId} gate failed; finalizer will repair it. | ${formatGate(gate.issues)}`, 'input_output')];
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Use case ${useCaseId} failed; finalizer will repair it. | ${errorMessage(error)}`, 'input_output')];
  }
}

async function startE7(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  moduleName: string,
  agentName: string,
): Promise<mls.msg.AgentIntent[]> {
  const bundle = await loadBundle(moduleName);
  if (bundle.pipeline.steps.e6?.status !== 'approved') throw new Error(`E6 approved pipeline not found for ${moduleName}.`);
  const plan = buildNs4E7Plan(moduleName, bundle.module.presentation.userLanguage, bundle.journeys, bundle.sourceHashes);
  const gate = validateNs4E7Plan(plan, bundle);
  if (!gate.ok) throw new Error(formatGate(gate.issues));
  const planPath = await writeNs4E7PlanDraft(moduleName, plan);
  await writeNs4Pipeline(markNs4E7Running(bundle.pipeline, planPath));
  const existing = await Promise.all(plan.useCases.map(async target => ({
    useCaseId: target.useCaseId,
    draft: await readDraft(moduleName, target.useCaseId, plan),
  })));
  const pending = existing.filter(item => !item.draft || !validateNs4UseCaseDraft(plan, item.draft, bundle).ok)
    .map(item => item.useCaseId);
  if (!pending.length) {
    return finalizeE7(context, parentStep, step, hookSequential,
      { planId: 'e7-realization', moduleName, stage: 'finalize', repairRound: 0 });
  }
  const mutationParent = findMutableParent(context, parentStep, step);
  const parallel = parallelUseCaseStep(context, step, agentName, plan, 0, pending);
  return [
    parallel,
    addStep(context, mutationParent, createFinalizeStep(moduleName, 0, [String(parallel.step.planning?.planId || '')])),
    updateStatus(context, mutationParent, step, hookSequential, 'completed',
      `E7 planned ${plan.useCases.length} use cases; ${plan.useCases.length - pending.length} valid drafts reused and ${pending.length} detailing with maxParallel=${NS4_E7_MAX_PARALLEL}.`, 'input_output'),
  ];
}

async function buildUseCasePrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  hookArgs: string,
  moduleName: string,
  useCaseId: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const [plan, bundle, prompt, tool] = await Promise.all([
    readPlan(moduleName), loadBundle(moduleName), readNs4AgentText('steps/e7', 'promptUseCase'), readNs4UseCaseWorkerTool(),
  ]);
  const current = await readDraft(moduleName, useCaseId, plan);
  const target = plan.useCases.find(item => item.useCaseId === useCaseId);
  if (!target) throw new Error(`Use case ${useCaseId} is not present in the E7 plan.`);
  const sourceRefs = new Set(target.compiledFrom);
  const journeyIds = new Set(target.compiledFrom.map(ref => ref.split('.')[0]));
  const journeys = bundle.journeys.journeys.filter(journey => journeyIds.has(journey.journeyId)).map(journey => {
    const compiledSteps = journey.business.steps.filter(step => sourceRefs.has(`${journey.journeyId}.${step.stepId}`));
    const requiredContexts = new Set(compiledSteps.flatMap(step => step.requiresContext));
    const producerSteps = journey.business.steps.filter(step => step.providesContext.some(context => requiredContexts.has(context.contextId)));
    const relevantStepIds = new Set([...compiledSteps, ...producerSteps].map(step => step.stepId));
    return { journeyId: journey.journeyId, entry: journey.business.entry, useRules: journey.business.useRules,
      steps: journey.business.steps.filter(step => relevantStepIds.has(step.stepId)) };
  });
  const businessObjects = new Set(journeys.flatMap(journey => [
    ...journey.entry.carries.map(context => context.businessObject),
    ...journey.steps.flatMap(step => step.providesContext.map(context => context.businessObject)),
  ]));
  const relationships = bundle.ontology.relationships.filter(rel =>
    businessObjects.has(rel.fromEntity) || businessObjects.has(rel.toEntity));
  const entityIds = new Set([
    ...businessObjects,
    ...relationships.flatMap(rel => [rel.fromEntity, rel.toEntity]),
  ]);
  const entities = bundle.ontology.entities.filter(entity => entityIds.has(entity.entityId))
    .map(entity => ({ entityId: entity.entityId, title: entity.title, description: entity.description,
      lifecycleStates: entity.lifecycleStates, useRules: entity.useRules }));
  const relationshipSummary = relationships.map(relationship => ({ relationshipId: relationship.relationshipId,
    fromEntity: relationship.fromEntity, toEntity: relationship.toEntity, type: relationship.type,
    required: relationship.required, description: relationship.description }));
  const candidateRuleIds = new Set([
    ...journeys.flatMap(journey => journey.useRules),
    ...entities.flatMap(entity => entity.useRules),
  ]);
  const relevantRules = bundle.rules.rules.filter(rule => candidateRuleIds.has(rule.id));
  const currentGate = current ? validateNs4UseCaseDraft(plan, current, bundle) : null;
  const humanPrompt = [
    `## Frozen use case plan\n${JSON.stringify(target)}`,
    `## Source journey steps and typed contexts\n${JSON.stringify(journeys)}`,
    `## Relevant E4 entity and relationship catalog\n${JSON.stringify({ entities, relationships: relationshipSummary })}`,
    `## Candidate E5 rules; select only behavior-owned rules\n${JSON.stringify(relevantRules)}`,
    current ? `## Current draft; preserve valid decisions\n${JSON.stringify(current)}` : '',
    currentGate && !currentGate.ok ? `## Deterministic repair required\n${formatGate(currentGate.issues)}` : '',
    `## Required identity\nmoduleName=${moduleName}; useCaseId=${useCaseId}; userLanguage=${plan.userLanguage}`,
  ].filter(Boolean).join('\n\n');
  return { type: 'prompt_ready', args: hookArgs, messageId: context.message.orderAt,
    threadId: context.message.threadId, taskId: context.task?.PK || '', hookSequential,
    parentStepId: parentStep.stepId, systemPrompt: prompt, humanPrompt,
    tools: [tool], toolChoice: { type: 'function', function: { name: tool.function.name } } };
}

async function finalizeE7(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: Ns4E7Args & { moduleName: string },
): Promise<mls.msg.AgentIntent[]> {
  const [plan, bundle] = await Promise.all([readPlan(args.moduleName), loadBundle(args.moduleName)]);
  const valid: Ns4UseCaseDraft[] = [];
  const invalid: string[] = [];
  const validationResults: Ns4E7ValidationReport['attempts'][number]['results'] = [];
  for (const target of plan.useCases) {
    const draft = await readDraft(args.moduleName, target.useCaseId, plan);
    if (!draft) {
      invalid.push(target.useCaseId);
      validationResults.push({ useCaseId: target.useCaseId, status: 'missing', issues: [{
        code: 'NS4_E7_DRAFT_MISSING', path: 'draft', message: 'Use case draft was not persisted.',
      }] });
      continue;
    }
    const draftGate = validateNs4UseCaseDraft(plan, draft, bundle);
    validationResults.push({ useCaseId: target.useCaseId, status: draftGate.ok ? 'valid' : 'invalid', issues: draftGate.issues });
    if (!draftGate.ok) invalid.push(target.useCaseId);
    else valid.push(draft);
  }
  const repairRound = args.repairRound || 0;
  const reportStatus = invalid.length ? repairRound < MAX_REPAIR_ROUNDS ? 'repairing' : 'failed' : 'passed';
  const mutationParent = findMutableParent(context, parentStep);
  if (invalid.length && repairRound < MAX_REPAIR_ROUNDS) {
    await updateValidationReport(args.moduleName, repairRound, validationResults, reportStatus);
    const parallel = parallelUseCaseStep(context, step, 'agentNewSolution4', plan, repairRound + 1, invalid);
    return [parallel,
      addStep(context, mutationParent, createFinalizeStep(args.moduleName, repairRound + 1, [String(parallel.step.planning?.planId || '')])),
      updateStatus(context, mutationParent, step, hookSequential, 'completed',
        `${invalid.length} invalid/missing use cases; targeted parallel repair started: ${invalid.join(', ')}.`, 'input_output')];
  }
  if (invalid.length) {
    await updateValidationReport(args.moduleName, repairRound, validationResults, reportStatus);
    throw new Error(`E7 use cases remain invalid after repair: ${invalid.join(', ')}.`);
  }

  const generatedAt = new Date().toISOString();
  const { artifacts: useCases, index: useCaseIndex } = await buildNs4UseCaseArtifacts(plan, valid, generatedAt);
  const ontologyLifecycles = new Map(bundle.ontology.entities.map(entity => [entity.entityId, {
    states: entity.lifecycleStates,
    initialState: entity.initialState,
    terminalStates: entity.terminalStates,
  }]));
  const { artifacts: workflows, index: workflowIndex } = await buildNs4WorkflowArtifacts(plan, valid, ontologyLifecycles, generatedAt);
  const workflowGate = validateNs4Workflows(workflows, bundle, useCases.map(useCase => useCase.useCaseId));
  if (!workflowGate.ok) {
    await updateValidationReport(args.moduleName, repairRound, validationResults, 'needsHumanResolution', workflowGate.issues);
    return [
      lifecycleResolutionStep(context, mutationParent, args.moduleName, workflowGate.issues),
      updateStatus(context, mutationParent, step, hookSequential, 'completed',
        `${workflowGate.issues.length} lifecycle finding(s) need a human E2/E4 decision; no LLM retry was scheduled.`, 'input_output'),
    ];
  }
  await updateValidationReport(args.moduleName, repairRound, validationResults, 'passed');

  const artifactPaths: string[] = [];
  for (const useCase of useCases) artifactPaths.push(await writeNs4UseCase(args.moduleName, useCase.useCaseId, useCase));
  artifactPaths.push(await writeNs4UseCaseIndex(args.moduleName, useCaseIndex));
  for (const workflow of workflows) artifactPaths.push(await writeNs4Workflow(args.moduleName, workflow.workflowId, workflow));
  artifactPaths.push(await writeNs4WorkflowIndex(args.moduleName, workflowIndex));

  const realizedJourneys = await Promise.all(bundle.journeyArtifacts.map(journey => buildNs4RealizedJourneyArtifact(journey, useCases)));
  for (const journey of realizedJourneys) artifactPaths.push(await writeNs4Journey(args.moduleName, journey.journeyId, journey));
  artifactPaths.push(await writeNs4JourneyIndex(args.moduleName, await buildNs4RealizedJourneyIndex(bundle.journeyIndex, realizedJourneys)));
  artifactPaths.push(await writeNs4AccessMatrix(args.moduleName, await buildNs4RealizedAccessArtifact(bundle.accessArtifact, useCases)));

  await writeNs4Module(args.moduleName, markNs4ModuleE7Approved(bundle.module, generatedAt));
  await writeNs4Pipeline(markNs4E7Approved(await requirePipeline(args.moduleName), artifactPaths, generatedAt));
  return [
    resultStep(context, mutationParent, args.moduleName, useCases.length, workflows.length, artifactPaths),
    updateStatus(context, mutationParent, step, hookSequential, 'completed',
      `E7 compiled ${useCases.length} use cases and ${workflows.length} workflows.`, 'input_output'),
  ];
}

async function loadBundle(moduleName: string): Promise<Ns4E7Bundle> {
  const [module, pipeline, journeys, access, ontology, journeyIndex, accessArtifact, ontologyIndex, rules] = await Promise.all([
    readNs4Module(moduleName), requirePipeline(moduleName), readNs4ApprovedJourneys(moduleName),
    readNs4ApprovedAccess(moduleName), readNs4ApprovedOntology(moduleName),
    readNs4DefsJson<Ns4JourneyIndex>(ns4JourneyIndexFile(moduleName), true),
    readNs4DefsJson<Ns4AccessMatrixArtifact>(ns4AccessMatrixFile(moduleName), true),
    readNs4DefsJson<Ns4OntologyIndexArtifact>(ns4OntologyIndexFile(moduleName), true),
    readNs4DefsJson<Ns4RulesArtifact>(ns4RulesFile(moduleName), true),
  ]);
  if (!module || !journeyIndex || !accessArtifact || !ontologyIndex || !rules) {
    throw new Error(`E7 approved source artifacts are incomplete for ${moduleName}.`);
  }
  const journeyArtifacts = await Promise.all(journeyIndex.journeys.map(entry =>
    readNs4DefsJson<Ns4JourneyArtifact>(ns4JourneyFile(moduleName, entry.journeyId), true)));
  if (journeyArtifacts.some(item => !item)) throw new Error(`E7 cannot read every approved journey for ${moduleName}.`);
  const sourceHashes: Ns4E7SourceHashes = {
    journeys: journeyIndex.journeys.map(entry => ({ journeyId: entry.journeyId, businessHash: entry.businessHash })),
    ontologyHash: ontologyIndex.ontologyHash, rulesHash: rules.rulesHash,
  };
  return { module, pipeline, journeys, access, ontology, journeyIndex,
    journeyArtifacts: journeyArtifacts as Ns4JourneyArtifact[], accessArtifact, ontologyIndex,
    rules, sourceHashes };
}

function parallelUseCaseStep(
  context: mls.msg.ExecutionContext,
  hostStep: mls.msg.AIAgentStep,
  agentName: string,
  plan: Ns4E7PlanDraft,
  repairRound: number,
  useCaseIds = plan.useCases.map(item => item.useCaseId),
): mls.msg.AgentIntentAddStep {
  if (!context.task || !useCaseIds.length) throw new Error('E7 use case fan-out cannot be empty.');
  const planId = `e7-realization-usecases-${repairRound}`;
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task.PK, parentStepId: hostStep.stepId,
    step: { type: 'agent', stepId: 0,
      interaction: { input: [{ type: 'system', content: '<!-- modelType: reasoning -->' }], cost: 0,
        trace: [`queued ${useCaseIds.length} E7 use cases with maxParallel=${NS4_E7_MAX_PARALLEL}`], payload: null },
      stepTitle: 'Realizing {{completed}}/{{total}} use cases, failed {{failed}}', status: 'in_progress',
      nextSteps: [], agentName, onFailure: 'wait_after_prompt', prompt: JSON.stringify({ planId: 'e7-realization' }), rags: [],
      planning: { planId, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
    executionMode: { type: 'parallel', args: useCaseIds.map(useCaseId => `usecase:${useCaseId}`), maxParallel: NS4_E7_MAX_PARALLEL } };
}

function createFinalizeStep(moduleName: string, repairRound: number, dependsOn: string[]): mls.msg.AIAgentStep {
  return { type: 'agent', stepId: 0, interaction: null, stepTitle: `Finalize E7 realization${repairRound ? ` · R${repairRound}` : ''}`,
    status: 'waiting_dependency', nextSteps: [], agentName: 'agentNewSolution4',
    prompt: JSON.stringify({ planId: 'e7-realization', moduleName, stage: 'finalize', repairRound }), rags: [],
    planning: { planId: `e7-realization-finalize-${repairRound}`, dependsOn, executionMode: 'sequential', executionHost: 'client' } };
}

export async function beforeNs4E7ClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const review = parseLifecycleResolution(json);
  if (!review) throw new Error('Invalid E7 lifecycle resolution checkpoint.');
  await import('/_102020_/l2/agentNewSolution4/widgets/widgetNs4LifecycleResolution.js');
  const element = document.createElement('widget-ns4-lifecycle-resolution-102020');
  (element as unknown as { value: Ns4E7LifecycleResolutionReview }).value = review;
  element.addEventListener('ns4-lifecycle-resolution', (event: Event) => {
    void applyLifecycleResolution(context, parentStep, step, hookSequential,
      (event as CustomEvent<Ns4E7LifecycleResolutionEvent>).detail)
      .catch(error => { showNs4ClarificationError(element, error); console.error(`[${agent.agentName}] ${errorMessage(error)}`); });
  });
  return element;
}

async function applyLifecycleResolution(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  event: Ns4E7LifecycleResolutionEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution4:e7] task invalid');
  const review = parseLifecycleResolution(step.json);
  if (!review || event.moduleName !== review.moduleName) throw new Error('Lifecycle resolution does not match its checkpoint.');
  const actions = new Map(event.selections.map(selection => [selection.findingId, selection.action]));
  if (actions.size !== review.findings.length || review.findings.some(finding => !actions.has(finding.findingId))) {
    throw new Error('Choose operateState or shrinkLifecycle for every lifecycle finding.');
  }
  if ([...actions.values()].some(action => action !== 'operateState' && action !== 'shrinkLifecycle')) {
    throw new Error('Each lifecycle resolution must be operateState or shrinkLifecycle.');
  }
  const selected = review.findings.map(finding => ({ finding, action: actions.get(finding.findingId)! }));
  const operate = selected.filter(item => item.action === 'operateState');
  const shrink = selected.filter(item => item.action === 'shrinkLifecycle');
  const pipeline = await requirePipeline(review.moduleName);
  const parent = findMutableParent(context, parentStep);
  const intents: mls.msg.AgentIntent[] = [];
  if (operate.length) {
    const feedback = lifecycleFeedback(operate, 'operateState');
    intents.push(addStep(context, parent, createNs4E2Step(
      review.moduleName, Math.max(1, (pipeline.steps.e2?.reviewRound || 1) + 1), feedback,
      [], pipeline.presentation.stepTitles['e2-journeys'],
    )));
  }
  if (shrink.length) {
    const feedback = lifecycleFeedback(shrink, 'shrinkLifecycle');
    intents.push(addStep(context, parent, createNs4E4Step(
      review.moduleName, Math.max(1, (pipeline.steps.e4?.reviewRound || 1) + 1), feedback,
      operate.length ? ['e2-result'] : [], pipeline.presentation.stepTitles['e4-ontology'],
    )));
  }
  intents.push(updateStatus(context, parent, step, hookSequential, 'completed',
    'Lifecycle decisions recorded; the selected upstream round is ready without retrying E7.', 'input_output'));
  await applyIntents(context, intents);
  await continuePoolingTask(context);
}

function lifecycleResolutionStep(
  context: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  moduleName: string,
  issues: Ns4E7GateIssue[],
): mls.msg.AgentIntentAddStep {
  const review = createNs4E7LifecycleResolutionReview(moduleName, issues);
  return addStep(context, parent, {
    type: 'clarification', stepId: 0, interaction: null, status: 'pending', nextSteps: [],
    stepTitle: 'Resolve lifecycle findings',
    json: JSON.stringify(review),
    planning: { planId: 'e7-lifecycle-resolution', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIClarificationStep);
}


function parseLifecycleResolution(value: unknown): Ns4E7LifecycleResolutionReview | null {
  const root = parse(value);
  if (!isRecord(root) || root.planId !== 'e7-lifecycle-resolution' || !text(root.moduleName) || !Array.isArray(root.findings)) return null;
  const findings = root.findings.filter(isRecord).map(item => ({
    findingId: text(item.findingId), code: text(item.code), path: text(item.path), message: text(item.message),
    repairOptions: item.repairOptions,
  })).filter(item => item.findingId && item.code && item.path && item.message && Array.isArray(item.repairOptions)) as Ns4E7LifecycleResolutionReview['findings'];
  return findings.length === root.findings.length ? { planId: 'e7-lifecycle-resolution', moduleName: text(root.moduleName), findings } : null;
}

function lifecycleFeedback(
  selected: Array<{ finding: Ns4E7LifecycleResolutionReview['findings'][number]; action: 'operateState' | 'shrinkLifecycle' }>,
  action: 'operateState' | 'shrinkLifecycle',
): string {
  return [
    'Human lifecycle resolution:',
    ...selected.map(({ finding }) => `- ${finding.code} ${finding.path}: ${finding.message}`),
    action === 'operateState'
      ? 'Add or amend explicit journey steps that operate these lifecycle states; preserve all unrelated approved contracts.'
      : 'Remove or redefine only these lifecycle states when they are not required business outcomes; preserve all unrelated approved contracts.',
  ].join('\n');
}

function resultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  useCaseCount: number,
  workflowCount: number,
  artifactPaths: string[],
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, { type: 'result', stepId: 0, interaction: null,
    stepTitle: 'E7 realization completed', status: 'completed', nextSteps: [],
    result: JSON.stringify({ moduleName, useCaseCount, workflowCount, artifactPaths,
      completedStep: 'e7-realization', nextStep: 'e8-workspaces' }, null, 2),
    planning: { planId: 'e7-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep);
}

function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step };
}
async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E7 lifecycle resolution intents.');
  const applied = response as mls.msg.ResponseApplyIntents;
  context.task = applied.task;
  if (applied.message) context.message = applied.message;
}
function updateStatus(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIPayload, step: mls.msg.AIPayload,
  hookSequential: number, status: mls.msg.AIStepStatus, traceMsg?: string, cleaner?: 'input' | 'input_output'): mls.msg.AgentIntentUpdateStatus {
  return { type: 'update-status', hookSequential, messageId: context.message.orderAt,
    threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
    stepId: step.stepId, status, ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}) };
}
function findMutableParent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  phaseStep?: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parentStep, phaseStep);
}
async function readPlan(moduleName: string): Promise<Ns4E7PlanDraft> {
  const parsed = parse(await readNs4Text(ns4E7PlanDraftFile(moduleName), true));
  if (!isRecord(parsed) || parsed.planId !== 'e7-realization-plan') throw new Error(`Invalid E7 plan for ${moduleName}.`);
  return parsed as unknown as Ns4E7PlanDraft;
}

async function updateValidationReport(
  moduleName: string,
  round: number,
  results: Ns4E7ValidationReport['attempts'][number]['results'],
  finalStatus: Ns4E7ValidationReport['finalStatus'],
  lifecycleIssues: Ns4E7GateIssue[] = [],
): Promise<void> {
  const now = new Date().toISOString();
  const previous = round > 0 ? await readValidationReport(moduleName) : null;
  const attempt = { round, checkedAt: now, valid: results.filter(result => result.status === 'valid').length,
    invalid: results.filter(result => result.status !== 'valid').length, results, lifecycleIssues };
  const attempts = [...(previous?.attempts || []).filter(item => item.round !== round), attempt]
    .sort((left, right) => left.round - right.round);
  await writeNs4E7ValidationReport(moduleName, {
    schemaVersion: '2026-08-12-ns4-e7-validation-report-v3', moduleName, attempts, finalStatus, updatedAt: now,
  } satisfies Ns4E7ValidationReport);
}

async function readValidationReport(moduleName: string): Promise<Ns4E7ValidationReport | null> {
  const parsed = parse(await readNs4Text(ns4E7ValidationReportFile(moduleName), false));
  if (!isRecord(parsed) || parsed.schemaVersion !== '2026-08-12-ns4-e7-validation-report-v3'
    || parsed.moduleName !== moduleName || !Array.isArray(parsed.attempts)) return null;
  return parsed as unknown as Ns4E7ValidationReport;
}

async function readDraft(
  moduleName: string,
  useCaseId: string,
  existingPlan?: Ns4E7PlanDraft,
): Promise<Ns4UseCaseDraft | null> {
  const parsed = parse(await readNs4Text(ns4E7UseCaseDraftFile(moduleName, useCaseId), false));
  if (!isRecord(parsed) || parsed.draftVersion !== NS4_USE_CASE_DRAFT_VERSION) return null;
  const plan = existingPlan || await readPlan(moduleName);
  return normalizeNs4UseCaseDraft(parsed, plan, useCaseId);
}
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const pipeline = await readNs4Pipeline(moduleName);
  if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution4 pipeline not found for ${moduleName}.`);
  return pipeline;
}
async function recordFailure(moduleName: string, failure: string): Promise<void> {
  if (!moduleName) return;
  try { const pipeline = await readNs4Pipeline(moduleName); if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E7Failed(pipeline, failure)); }
  catch { /* task trace fallback */ }
}
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E7Args & { moduleName: string } {
  const root = parse(value);
  if (!isRecord(root) || root.planId !== 'e7-realization') throw new Error('Invalid E7 step arguments.');
  const moduleName = text(root.moduleName) || resolveModuleName(context);
  if (!moduleName) throw new Error('E6 module result not found for E7.');
  return { planId: 'e7-realization', moduleName,
    ...(root.stage === 'finalize' ? { stage: 'finalize' as const } : { stage: 'plan' as const }),
    ...(integer(root.repairRound) ? { repairRound: integer(root.repairRound) } : {}) };
}
function resolveModuleName(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e6-result');
  const parsed = result?.type === 'result' ? parse(result.result) : null;
  return isRecord(parsed) ? text(parsed.moduleName) : memoryString(context, 'resumeModule');
}
function parseUseCaseSelector(value: unknown): string {
  if (typeof value !== 'string') return '';
  return /^usecase:([a-z][A-Za-z0-9]*)$/.exec(value.trim())?.[1] || '';
}
async function readNs4UseCaseWorkerTool(): Promise<mls.msg.LLMTool> {
  const raw = await readNs4Text(ns4AgentFile('schemas', 'e7-usecase-worker.schema', '.json'), true);
  const schema = parse(raw);
  if (!isRecord(schema)) throw new Error('Invalid E7 use case worker tool schema.');
  return createNs4FlexibleWorkerTool('submitNs4E7UseCase', 'Submit one E7 use case detail.', schema);
}
function unwrap(value: unknown): unknown { return unwrapNs4FlexibleWorkerPayload(value); }
function parse(value: unknown): unknown { if (typeof value !== 'string') return value; const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); try { return JSON.parse(clean); } catch { return value; } }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function integer(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0; }
function memoryString(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function formatGate(issues: Array<{ code: string; path: string; message: string }>): string { return issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
