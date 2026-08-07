/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/agentNs4E5.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E5 is a plan → parallel rule details → deterministic aggregate → compact judge pipeline.
// Source catalog and coverage are mechanical. Parallel children complete-with-trace on failure;
// the finalizer retries only invalid/missing rules and never lets one child fail the whole task.

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import {
  createNs4E5FinalizeStep, createNs4E5JudgeStep, createNs4E5Step,
  isNs4Pipeline, markNs4E5Approved, markNs4E5Failed, markNs4E5Running, markNs4E5WaitingHuman,
  markNs4ModuleE5Approved, NS4_E5_MAX_PARALLEL, plainNs4StepTitle, Ns4ApprovedBy, Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution4/helpers/ns4Clarification.js';
import {
  ns4AccessMatrixFile, ns4E2DraftFile, ns4E4DraftFile, ns4E5CatalogFile, ns4E5DraftFile,
  ns4E5PlanDraftFile, ns4E5RuleDraftFile, readNs4AgentText, readNs4DefsJson, readNs4Module,
  readNs4Pipeline, readNs4Text, writeNs4E5Approved, writeNs4E5Catalog, writeNs4E5Draft,
  writeNs4E5PlanDraft, writeNs4E5RuleDraft, writeNs4Module, writeNs4Pipeline, writeNs4Rule,
  writeNs4RuleIndex,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { normalizeNs4E3Review, Ns4AccessMatrixArtifact } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { normalizeNs4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import {
  assembleNs4E5Review, buildNs4RuleArtifacts, normalizeNs4E5PlanDraft, normalizeNs4E5Review,
  normalizeNs4E5RuleDraft, Ns4E5PlanDraft, Ns4E5Review, Ns4E5ReviewEvent, Ns4E5RuleDraft,
} from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import {
  buildNs4E5ReferenceIndex, buildNs4E5SourceCatalog, completeNs4E5PlanCoverage,
  findNs4E5MechanicalUpstreamGaps, Ns4E5SourceCatalogEntry,
} from '/_102020_/l2/agentNewSolution4/steps/e5/catalog.js';
import { Ns4E5Sources, validateNs4E5Plan, validateNs4E5Review, validateNs4E5RuleDraft } from '/_102020_/l2/agentNewSolution4/steps/e5/gate.js';
import {
  formatNs4E5JudgeFeedback, normalizeNs4E5JudgeVerdict, validateNs4E5JudgeVerdict,
} from '/_102020_/l2/agentNewSolution4/steps/e5/judge.js';
import { resolveNs4E5HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e5/hookArgs.js';

interface Ns4E5Args {
  planId: 'e5-rules';
  stage?: 'plan' | 'finalize' | 'judge';
  moduleName?: string;
  reviewRound?: number;
  adjustment?: string;
  gateFeedback?: string;
  repairAttempt?: number;
  judgeAttempt?: number;
  ruleRepairRound?: number;
  planRepairAttempt?: number;
}

interface Ns4PersistedE5 { moduleName: string; ruleCount: number; artifactPaths: string[]; indexPath: string; approvedPath: string; }
const MAX_PLAN_REPAIRS = 1;
const MAX_RULE_REPAIR_ROUNDS = 1;
const MAX_JUDGE_ATTEMPTS = 2;

export async function beforeNs4E5PromptStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution4:e5] task invalid');
  const hookArgs = resolveNs4E5HookArgs(args, step.prompt);
  const ruleId = parseRuleSelector(hookArgs) || parseRuleSelector(step.prompt);
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, ruleId ? step.prompt : hookArgs); moduleName = parsed.moduleName;
    if (ruleId) return [await buildRulePrompt(context, parentStep, hookSequential, hookArgs, parsed, ruleId)];
    if (parsed.stage === 'finalize') return finalizeRules(context, parentStep, step, hookSequential, parsed);
    if (parsed.stage === 'judge') return [await buildJudgePrompt(context, parentStep, hookSequential, hookArgs, parsed)];
    return [await buildPlanPrompt(context, parentStep, hookSequential, hookArgs, parsed)];
  } catch (error) {
    const message = errorMessage(error);
    if (ruleId) return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Rule ${ruleId} prompt failed; finalizer will repair it. | ${message}`, 'input_output')];
    await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

async function buildPlanPrompt(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, hookSequential: number,
  hookArgs: string, args: Ns4E5Args & { moduleName: string },
): Promise<mls.msg.AgentIntentPromptReady> {
  const pipeline = await requirePipeline(args.moduleName);
  if (pipeline.steps.e4?.status !== 'approved') throw new Error(`E4 approved pipeline not found for ${args.moduleName}.`);
  const sources = await readSources(args.moduleName);
  const catalog = buildNs4E5SourceCatalog(sources);
  const gaps = findNs4E5MechanicalUpstreamGaps(sources);
  await writeNs4E5Catalog(args.moduleName, catalog);
  if (gaps.length) throw new Error(`E5 mechanical preflight found incomplete upstream contracts before any rule LLM call.\n${gaps
    .map(gap => `${gap.gapId}: missing ${gap.missingContract} | ${gap.reason} | ${gap.sourceRefs.join(', ')}`).join('\n')}`);
  const [prompt, platform, previousPlan, previousReview] = await Promise.all([
    readNs4AgentText('steps/e5', 'prompt'), readNs4AgentText('skills', 'platform'),
    readOptionalPlan(args.moduleName), readDraft(args.moduleName),
  ]);
  const round = args.reviewRound || pipeline.steps.e5?.reviewRound || 1;
  const previousSummary = previousReview ? compactReview(previousReview) : null;
  const humanPrompt = [
    `## Required identity\nmoduleName=${args.moduleName}; reviewRound=${round}; userLanguage=${sources.module.presentation.userLanguage}`,
    '## Exact source catalog', JSON.stringify(catalog),
    '## Approved reference index', JSON.stringify(buildNs4E5ReferenceIndex(sources)),
    '## Compact semantic context', JSON.stringify(buildSemanticContext(sources)),
    gaps.length ? `## Mechanically detected upstream gaps; include them unchanged\n${JSON.stringify(gaps)}` : '',
    args.adjustment ? `## Human structural change request\n${args.adjustment}` : '',
    args.gateFeedback ? `## Judge or gate repair required\n${args.gateFeedback}` : '',
    previousPlan ? `## Current rule plan\n${JSON.stringify(previousPlan)}` : '',
    previousSummary ? `## Current complete review summary; preserve unaffected human edits\n${JSON.stringify(previousSummary)}` : '',
  ].filter(Boolean).join('\n\n');
  return promptReady(context, parentStep, hookSequential, hookArgs, prompt.replace('{{platformSkill}}', platform), humanPrompt);
}

async function buildRulePrompt(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, hookSequential: number,
  hookArgs: string, args: Ns4E5Args & { moduleName: string }, ruleId: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const [plan, sources, catalog, prompt, previousReview, currentDetail] = await Promise.all([
    readPlan(args.moduleName), readSources(args.moduleName), readCatalog(args.moduleName),
    readNs4AgentText('steps/e5', 'promptRule'), readDraft(args.moduleName), readRuleDraft(args.moduleName, ruleId),
  ]);
  const target = plan.rulePlans.find(rule => rule.ruleId === ruleId);
  if (!target) throw new Error(`Rule ${ruleId} is not present in the E5 plan.`);
  const sourceEntries = catalog.filter(source => target.sourceRefs.includes(source.sourceRef));
  const journeyIds = new Set([
    ...target.scope.journeyRefs,
    ...sourceEntries.map(source => source.origin.journeyId || '').filter(Boolean),
  ]);
  const authorityRefs = new Set([
    ...target.scope.authorityRefs,
    ...sourceEntries.map(source => source.origin.authorityRef || '').filter(Boolean),
  ]);
  const profileRefs = new Set(sourceEntries.map(source => source.origin.profileRef || '').filter(Boolean));
  const entityIds = new Set([
    ...target.scope.entityRefs,
    ...sourceEntries.map(source => source.origin.entityId || '').filter(Boolean),
  ]);
  const related = {
    journeys: sources.journeys.journeys.filter(journey => journeyIds.has(journey.journeyId)),
    grants: sources.access.grants.filter(grant => authorityRefs.has(grant.authorityRef) || profileRefs.has(grant.profileRef)),
    authorities: sources.access.authorities.filter(authority => authorityRefs.has(authority.authorityRef)),
    entities: sources.ontology.entities.filter(entity => entityIds.has(entity.entityId)),
    relationships: sources.ontology.relationships.filter(relationship =>
      target.scope.relationshipRefs.includes(relationship.relationshipId)
      || entityIds.has(relationship.fromEntity) || entityIds.has(relationship.toEntity)),
  };
  const previousRule = previousReview?.rules.find(rule => rule.ruleId === ruleId);
  const currentGate = currentDetail ? validateNs4E5RuleDraft(plan, currentDetail, sources) : null;
  const humanPrompt = [
    '## Frozen rule plan', JSON.stringify(target),
    '## Exact approved source evidence', JSON.stringify(sourceEntries),
    '## Filtered approved context', JSON.stringify(related),
    previousRule ? `## Previous reviewed rule; preserve unaffected human edits\n${JSON.stringify(previousRule)}` : '',
    currentDetail ? `## Current invalid detail\n${JSON.stringify(currentDetail)}` : '',
    currentGate && !currentGate.ok ? `## Deterministic repair required\n${formatGate(currentGate.issues)}` : '',
    `## Required identity\nmoduleName=${plan.moduleName}; reviewRound=${plan.reviewRound}; ruleId=${ruleId}; userLanguage=${plan.userLanguage}`,
  ].filter(Boolean).join('\n\n');
  return promptReady(context, parentStep, hookSequential, hookArgs, prompt, humanPrompt);
}

async function buildJudgePrompt(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, hookSequential: number,
  hookArgs: string, args: Ns4E5Args & { moduleName: string },
): Promise<mls.msg.AgentIntentPromptReady> {
  const [sources, catalog, draft, prompt] = await Promise.all([
    readSources(args.moduleName), readCatalog(args.moduleName), readDraft(args.moduleName),
    readNs4AgentText('steps/e5', 'judge'),
  ]);
  if (!draft) throw new Error(`E5 draft not found for semantic judge in ${args.moduleName}.`);
  const humanPrompt = [
    '## Exact source catalog', JSON.stringify(catalog),
    '## Approved reference and semantic context', JSON.stringify({
      references: buildNs4E5ReferenceIndex(sources), semantic: buildSemanticContext(sources),
    }),
    '## Complete E5 draft to judge', JSON.stringify(draft),
  ].join('\n\n');
  return promptReady(context, parentStep, hookSequential, hookArgs, prompt, humanPrompt);
}

export async function afterNs4E5PromptStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const ruleId = parseRuleSelector(args) || parseRuleSelector(step.prompt);
  let moduleName = '';
  try {
    const args = resolveArgs(context, ruleId ? JSON.stringify({ planId: 'e5-rules' }) : step.prompt);
    moduleName = args.moduleName;
    const pipeline = await requirePipeline(moduleName);
    const round = args.reviewRound || pipeline.steps.e5?.reviewRound || 1;
    await writeNs4Pipeline(markNs4E5Running(pipeline, round));
    const mutationParent = findParent(context, parentStep);
    if (ruleId) return handleRuleResult(context, mutationParent, step, hookSequential, args, ruleId);
    if (args.stage === 'judge') return afterJudge(context, mutationParent, step, hookSequential, args, pipeline);
    return handlePlanResult(agent, context, mutationParent, step, hookSequential, args, pipeline);
  } catch (error) {
    const message = errorMessage(error);
    if (ruleId) return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Rule ${ruleId} failed; finalizer will repair it. | ${message}`, 'input_output')];
    await recordFailure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message, 'input_output')];
  }
}

async function handlePlanResult(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args: Ns4E5Args & { moduleName: string },
  pipeline: Ns4PipelineState,
): Promise<mls.msg.AgentIntent[]> {
  const payload = unwrap(step.interaction?.payload?.[0]);
  if (!isRecord(payload)) throw new Error('E5 returned an invalid compact rule plan.');
  const sources = await readSources(args.moduleName);
  const catalog = buildNs4E5SourceCatalog(sources);
  const round = args.reviewRound || pipeline.steps.e5?.reviewRound || 1;
  let plan = normalizeNs4E5PlanDraft(payload, args.moduleName);
  plan.moduleName = args.moduleName; plan.reviewRound = round;
  const mechanicalGaps = findNs4E5MechanicalUpstreamGaps(sources);
  const gaps = new Map([...plan.upstreamGaps, ...mechanicalGaps].map(gap => [gap.gapId, gap]));
  plan = completeNs4E5PlanCoverage({ ...plan, upstreamGaps: [...gaps.values()] }, catalog);
  const gate = validateNs4E5Plan(plan, sources);
  await Promise.all([writeNs4E5Catalog(args.moduleName, catalog), writeNs4E5PlanDraft(args.moduleName, plan)]);
  if (!gate.ok) {
    const feedback = formatGate(gate.issues);
    const attempt = args.repairAttempt || args.planRepairAttempt || 0;
    if (attempt < MAX_PLAN_REPAIRS) return [
      addStep(context, mutationParent, createNs4E5Step(args.moduleName, round, '', [], pipeline.presentation.stepTitles['e5-rules'], feedback, attempt + 1)),
      traceStep(context, mutationParent, 'E5 compact-plan repair', { feedback, attempt: attempt + 1 }),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E5 plan gate scheduled one bounded repair.', 'input_output'),
    ];
    throw new Error(feedback);
  }
  if (plan.upstreamGaps.length) {
    const message = formatUpstreamGaps(plan);
    await recordFailure(args.moduleName, message);
    return [
      traceStep(context, mutationParent, 'E5 stopped on upstream contract gaps', plan.upstreamGaps),
      updateStatus(context, mutationParent, step, hookSequential, 'failed', message, 'input_output'),
    ];
  }
  const currentPlanId = step.planning?.planId || `e5-rules-round-${round}`;
  const planRepairAttempt = args.repairAttempt || args.planRepairAttempt || 0;
  return [
    parallelRuleStep(context, step, agent.agentName, plan, 0, undefined, planRepairAttempt),
    addStep(context, mutationParent, createNs4E5FinalizeStep(args.moduleName, round, [currentPlanId], 0, planRepairAttempt)),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `E5 plan ready; detailing ${plan.rulePlans.length} rules with maxParallel=${NS4_E5_MAX_PARALLEL}.`, 'input_output'),
  ];
}

async function handleRuleResult(
  context: mls.msg.ExecutionContext, mutationParent: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep,
  hookSequential: number, args: Ns4E5Args & { moduleName: string }, ruleId: string,
): Promise<mls.msg.AgentIntent[]> {
  const [plan, sources] = await Promise.all([readPlan(args.moduleName), readSources(args.moduleName)]);
  const target = plan.rulePlans.find(rule => rule.ruleId === ruleId);
  if (!target) throw new Error(`Unknown planned rule ${ruleId}.`);
  const payload = unwrap(step.interaction?.payload?.[0]);
  if (!isRecord(payload)) return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Rule ${ruleId} returned no usable payload; finalizer will repair it.`, 'input_output')];
  const detail = normalizeNs4E5RuleDraft(payload, plan.moduleName, plan.reviewRound, ruleId);
  detail.rule = { ...detail.rule, ...target, scope: target.scope, sourceRefs: target.sourceRefs };
  await writeNs4E5RuleDraft(plan.moduleName, ruleId, detail);
  const gate = validateNs4E5RuleDraft(plan, detail, sources);
  return [updateStatus(context, mutationParent, step, hookSequential, 'completed',
    gate.ok ? `Rule ${ruleId} detail saved.` : `Rule ${ruleId} gate failed; finalizer will repair it. | ${formatGate(gate.issues)}`,
    'input_output')];
}

async function finalizeRules(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep,
  hookSequential: number, args: Ns4E5Args & { moduleName: string },
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = findParent(context, parentStep);
  const [plan, sources, pipeline] = await Promise.all([readPlan(args.moduleName), readSources(args.moduleName), requirePipeline(args.moduleName)]);
  const details: Ns4E5RuleDraft[] = []; const invalid: string[] = [];
  for (const rule of plan.rulePlans) {
    const detail = await readRuleDraft(args.moduleName, rule.ruleId);
    if (!detail || !validateNs4E5RuleDraft(plan, detail, sources).ok) invalid.push(rule.ruleId);
    else details.push(detail);
  }
  const repairRound = args.ruleRepairRound || 0;
  if (invalid.length && repairRound < MAX_RULE_REPAIR_ROUNDS) {
    const currentPlanId = step.planning?.planId || `e5-rules-round-${plan.reviewRound}-finalize-${repairRound}-${args.planRepairAttempt || 0}`;
    return [
      parallelRuleStep(context, step, 'agentNewSolution4', plan, repairRound + 1, invalid, args.planRepairAttempt || 0),
      addStep(context, mutationParent, createNs4E5FinalizeStep(args.moduleName, plan.reviewRound, [currentPlanId], repairRound + 1, args.planRepairAttempt || 0)),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `${invalid.length} invalid/missing rules; targeted repair started: ${invalid.join(', ')}.`),
    ];
  }
  if (invalid.length) throw new Error(`E5 rules remain invalid after targeted repair: ${invalid.join(', ')}.`);
  const review = assembleNs4E5Review(plan, details);
  const gate = validateNs4E5Review(review, sources);
  if (!gate.ok) throw new Error(formatGate(gate.issues));
  await writeNs4E5Draft(args.moduleName, review);
  return [
    addStep(context, mutationParent, createNs4E5JudgeStep(args.moduleName, review.reviewRound, args.planRepairAttempt || 0, 1, pipeline.presentation.stepTitles['e5-rules'])),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `E5 assembled ${review.rules.length} gated rules; compact semantic judge scheduled.`, 'input_output'),
  ];
}

async function afterJudge(
  context: mls.msg.ExecutionContext, mutationParent: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep,
  hookSequential: number, args: Ns4E5Args & { moduleName: string }, pipeline: Ns4PipelineState,
): Promise<mls.msg.AgentIntent[]> {
  const round = args.reviewRound || 1; const attempt = args.judgeAttempt || 1;
  const verdict = normalizeNs4E5JudgeVerdict(step.interaction?.payload?.[0], args.moduleName, round);
  const errors = validateNs4E5JudgeVerdict(verdict, args.moduleName, round);
  if (errors.length) {
    if (attempt < MAX_JUDGE_ATTEMPTS) return [
      addStep(context, mutationParent, createNs4E5JudgeStep(args.moduleName, round, args.repairAttempt || 0, attempt + 1, pipeline.presentation.stepTitles['e5-rules'])),
      traceStep(context, mutationParent, 'E5 invalid compact judge verdict', { errors }),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'Invalid E5 judge verdict; one retry scheduled.', 'input_output'),
    ];
    throw new Error(`Invalid E5 judge verdict: ${errors.join(' ')}`);
  }
  const review = normalizeNs4E5Review(await readDraft(args.moduleName), args.moduleName);
  const gate = validateNs4E5Review(review, await readSources(args.moduleName));
  if (!gate.ok) throw new Error(`E5 draft is no longer valid: ${gate.issues.map(issue => issue.code).join(', ')}.`);
  if (!verdict.complete) {
    const feedback = formatNs4E5JudgeFeedback(verdict);
    const upstream = verdict.issues.filter(issue => issue.severity === 'blocking' && issue.category === 'upstreamGap');
    if (upstream.length) throw new Error(`E5 requires an upstream E4/E2 contract revision; rules were not fabricated.\n${feedback}`);
    if ((args.repairAttempt || 0) < MAX_PLAN_REPAIRS) return [
      addStep(context, mutationParent, createNs4E5Step(args.moduleName, round, '', [], pipeline.presentation.stepTitles['e5-rules'], feedback, 1)),
      traceStep(context, mutationParent, 'E5 semantic plan repair', verdict),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', 'E5 judge scheduled one bounded plan + parallel repair.', 'input_output'),
    ];
    throw new Error(`E5 remains incomplete after repair.\n${feedback}`);
  }
  const draftPath = await writeNs4E5Draft(args.moduleName, review);
  await writeNs4Pipeline(markNs4E5WaitingHuman(await requirePipeline(args.moduleName), round, draftPath));
  const trace = traceStep(context, mutationParent, 'E5 compact semantic judge', verdict);
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
  if (!gate.ok) throw new Error(formatGate(gate.issues));
  await import('/_102020_/l2/agentNewSolution4/widgets/widgetNs4Rules.js');
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
  if (!gate.ok) throw new Error(formatGate(gate.issues));
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

function parallelRuleStep(
  context: mls.msg.ExecutionContext, hostStep: mls.msg.AIAgentStep, agentName: string,
  plan: Ns4E5PlanDraft, repairRound: number, ruleIds = plan.rulePlans.map(rule => rule.ruleId),
  planRepairAttempt = 0,
): mls.msg.AgentIntentAddStep {
  if (!context.task) throw new Error('[agentNewSolution4:e5] task invalid');
  if (!ruleIds.length) throw new Error('E5 rule fan-out cannot be empty.');
  const planId = `e5-rules-round-${plan.reviewRound}-plan-${planRepairAttempt}-details-${repairRound}`;
  return {
    type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task.PK, parentStepId: hostStep.stepId,
    step: {
      type: 'agent', stepId: 0,
      interaction: { input: [{ type: 'system', content: '<!-- modelType: reasoning -->' }], cost: 0,
        trace: [`queued ${ruleIds.length} E5 rules with maxParallel=${NS4_E5_MAX_PARALLEL}`], payload: null },
      stepTitle: 'Detailing {{completed}}/{{total}} business rules, failed {{failed}}',
      status: 'in_progress', nextSteps: [], agentName, onFailure: 'wait_after_prompt',
      prompt: JSON.stringify({ planId: 'e5-rules' }), rags: [],
      planning: { planId, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
    executionMode: { type: 'parallel', args: ruleIds.map(ruleId => `rule:${ruleId}`), maxParallel: NS4_E5_MAX_PARALLEL },
  };
}

async function readSources(moduleName: string): Promise<Ns4E5Sources> {
  const [module, journeyRaw, accessArtifact, ontologyRaw] = await Promise.all([
    readNs4Module(moduleName), readNs4Text(ns4E2DraftFile(moduleName), true),
    readNs4DefsJson<Ns4AccessMatrixArtifact>(ns4AccessMatrixFile(moduleName), true), readNs4Text(ns4E4DraftFile(moduleName), true),
  ]);
  if (!module || !accessArtifact) throw new Error(`Approved E1/E3 sources not found for ${moduleName}.`);
  return { module, journeys: normalizeNs4E2Review(JSON.parse(journeyRaw), moduleName),
    access: normalizeNs4E3Review(accessArtifact, moduleName), ontology: normalizeNs4E4Review(JSON.parse(ontologyRaw), moduleName) };
}

function buildSemanticContext(sources: Ns4E5Sources): unknown {
  return {
    journeys: sources.journeys.journeys.map(journey => ({
      journeyId: journey.journeyId, actorRef: journey.business.actorRef,
      prerequisites: journey.business.prerequisites, entry: journey.business.entry,
      steps: journey.business.steps.map(step => ({
        stepId: step.stepId, kind: step.kind, intent: step.intent,
        requiresContext: step.requiresContext, providesContext: step.providesContext, result: step.result,
      })),
    })),
    grants: sources.access.grants,
    entities: sources.ontology.entities.map(entity => ({
      entityId: entity.entityId, description: entity.description, lifecycleStates: entity.lifecycleStates,
      fields: entity.fields.map(field => ({ fieldId: field.fieldId, type: field.type, required: field.required, description: field.description })),
      storage: entity.storage,
    })),
    relationships: sources.ontology.relationships,
  };
}

function compactReview(review: Ns4E5Review): unknown {
  return { title: review.title, rules: review.rules.map(rule => ({
    ruleId: rule.ruleId, title: rule.title, statement: rule.statement, kind: rule.kind,
    layer: rule.layer, criticality: rule.criticality, scope: rule.scope, sourceRefs: rule.sourceRefs,
  })), routedStatements: review.routedStatements, changeSummary: review.changeSummary };
}

async function readPlan(moduleName: string): Promise<Ns4E5PlanDraft> {
  const raw = await readNs4Text(ns4E5PlanDraftFile(moduleName), true); const parsed = parse(raw);
  if (!isRecord(parsed)) throw new Error(`Invalid E5 rule plan for ${moduleName}.`);
  return normalizeNs4E5PlanDraft(parsed, moduleName);
}
async function readOptionalPlan(moduleName: string): Promise<Ns4E5PlanDraft | null> {
  const raw = await readNs4Text(ns4E5PlanDraftFile(moduleName), false); const parsed = parse(raw);
  return isRecord(parsed) ? normalizeNs4E5PlanDraft(parsed, moduleName) : null;
}
async function readCatalog(moduleName: string): Promise<Ns4E5SourceCatalogEntry[]> {
  const raw = await readNs4Text(ns4E5CatalogFile(moduleName), true); const parsed = parse(raw);
  return Array.isArray(parsed) ? parsed as Ns4E5SourceCatalogEntry[] : [];
}
async function readRuleDraft(moduleName: string, ruleId: string): Promise<Ns4E5RuleDraft | null> {
  const raw = await readNs4Text(ns4E5RuleDraftFile(moduleName, ruleId), false); const parsed = parse(raw);
  if (!isRecord(parsed)) return null;
  const round = typeof parsed.reviewRound === 'number' ? parsed.reviewRound : 1;
  return normalizeNs4E5RuleDraft(parsed, moduleName, round, ruleId);
}
async function readDraft(moduleName: string): Promise<Ns4E5Review | null> {
  const raw = await readNs4Text(ns4E5DraftFile(moduleName), false); const parsed = parse(raw);
  return isRecord(parsed) ? normalizeNs4E5Review(parsed, moduleName) : null;
}
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const state = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(state)) throw new Error(`agentNewSolution4 pipeline not found for ${moduleName}.`); return state;
}
async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return; try { const state = await readNs4Pipeline(moduleName); if (isNs4Pipeline(state)) await writeNs4Pipeline(markNs4E5Failed(state, error)); } catch { /* task trace fallback */ }
}

function promptReady(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, hookSequential: number, args: string, systemPrompt: string, humanPrompt: string): mls.msg.AgentIntentPromptReady {
  return { type: 'prompt_ready', args, messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt, humanPrompt };
}
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E5Args & { moduleName: string } {
  const root = parse(value); if (!isRecord(root) || root.planId !== 'e5-rules') throw new Error('Invalid E5 step arguments.');
  const moduleName = text(root.moduleName) || findE4Module(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E4 module result not found for E5.');
  const stage = root.stage === 'judge' || root.stage === 'finalize' || root.stage === 'plan' ? root.stage : undefined;
  return { planId: 'e5-rules', moduleName, ...(stage ? { stage } : {}),
    ...(number(root.reviewRound) ? { reviewRound: number(root.reviewRound) } : {}),
    ...(text(root.adjustment) ? { adjustment: text(root.adjustment) } : {}),
    ...(text(root.gateFeedback) ? { gateFeedback: text(root.gateFeedback) } : {}),
    ...(number(root.repairAttempt) ? { repairAttempt: number(root.repairAttempt) } : {}),
    ...(number(root.judgeAttempt) ? { judgeAttempt: number(root.judgeAttempt) } : {}),
    ...(number(root.ruleRepairRound) ? { ruleRepairRound: number(root.ruleRepairRound) } : {}),
    ...(number(root.planRepairAttempt) ? { planRepairAttempt: number(root.planRepairAttempt) } : {}) };
}
function parseRuleSelector(value: unknown): string {
  if (typeof value !== 'string') return ''; const match = /^rule:([a-z][A-Za-z0-9]*)$/.exec(value.trim()); return match?.[1] || '';
}
function findE4Module(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e4-result');
  const parsed = result?.type === 'result' ? parse(result.result) : null; return isRecord(parsed) ? text(parsed.moduleName) : '';
}
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
    stepTitle: plainNs4StepTitle(title), status: 'pending', nextSteps: [], json: JSON.stringify(review),
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
function formatGate(issues: Array<{ code: string; path: string; message: string }>): string { return issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'); }
function formatUpstreamGaps(plan: Ns4E5PlanDraft): string { return `E5 stopped before rule generation because approved upstream contracts are incomplete.\n${plan.upstreamGaps.map(gap => `${gap.gapId}: missing ${gap.missingContract} | ${gap.reason} | ${gap.sourceRefs.join(', ')}`).join('\n')}`; }
function unwrap(value: unknown): unknown { const root = parse(value); return isRecord(root) && root.type === 'flexible' ? parse(root.result) : root; }
function parse(value: unknown): unknown { if (typeof value !== 'string') return value; const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); try { return JSON.parse(clean); } catch { return value; } }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function number(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0; }
function memoryString(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function isFast(context: mls.msg.ExecutionContext): boolean { return memoryString(context, 'fastMode') === 'true'; }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
