/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/agentNs4E2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution4/helpers/ns4Clarification.js';
import {
  createNs4E2CoverageJudgeStep,
  createNs4E2CoverageRepairStep,
  createNs4E2GateRepairStep,
  createNs4E2Step,
  plainNs4StepTitle,
  isNs4Pipeline,
  markNs4E2Approved,
  markNs4E2Failed,
  markNs4E2Running,
  markNs4E2WaitingHuman,
  markNs4E2ImpactStale,
  markNs4ModuleE2Approved,
  NS4_AUTOMATED_JUDGE_ICON,
  Ns4ApprovedBy,
  Ns4ModuleArtifact,
  Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  readNs4AgentText,
  readNs4DefsJson,
  readNs4Text,
  readNs4Module,
  readNs4Pipeline,
  ns4E2DraftFile,
  ns4JourneyIndexFile,
  writeNs4E2Draft,
  writeNs4E2VersionedDraft,
  writeNs4E2ImpactReport,
  writeNs4Journey,
  writeNs4JourneyIndex,
  writeNs4Module,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import {
  buildNs4JourneyArtifacts,
  buildNs4E2ImpactReport,
  buildNs4JourneyIndex,
  buildNs4PolicyDecisionSelections,
  normalizeNs4E2Review,
  Ns4E2Review,
  Ns4E2ReviewEvent,
  Ns4PolicyDecisionSelection,
  Ns4JourneyIndex,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { validateNs4E2PolicySelections, validateNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/gate.js';
import { resolveNs4E2HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e2/hookArgs.js';
import {
  formatNs4E2CoverageRepairFeedback,
  applyNs4E2PolicyDecisionImpacts,
  normalizeNs4E2CoverageVerdict,
  Ns4E2CoverageVerdict,
  validateNs4E2CoverageVerdict,
} from '/_102020_/l2/agentNewSolution4/steps/e2/coverageJudge.js';
import {
  applyNs4E2CoveragePatch,
  normalizeNs4E2CoveragePatch,
  validateNs4E2CoveragePatch,
} from '/_102020_/l2/agentNewSolution4/steps/e2/coverageRepair.js';

interface Ns4E2Args {
  planId: 'e2-journeys';
  stage?: 'proposal' | 'coverageJudge' | 'coverageRepair';
  moduleName?: string;
  adjustment?: string;
  reviewRound?: number;
  gateRepairAttempt?: number;
  coverageRepairAttempt?: number;
  judgeAttempt?: number;
  gateFeedback?: string;
  coverageFeedback?: string;
  coverageIssueIds?: string[];
  policyDecisionSelections?: Array<Pick<Ns4PolicyDecisionSelection, 'decisionId' | 'selectedChoice'>>;
}

const MAX_E2_GATE_REPAIRS = 1;
const MAX_E2_COVERAGE_REPAIRS = 3;
const MAX_E2_JUDGE_ATTEMPTS = 2;

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
  const hookArgs = resolveNs4E2HookArgs(args, step.prompt);
  let moduleName = '';
  try {
    const parsed = resolveE2Args(context, hookArgs);
    moduleName = parsed.moduleName;
    const moduleArtifact = await readNs4Module(moduleName);
    const pipeline = await readNs4Pipeline(moduleName);
    if (!moduleArtifact || !isNs4Pipeline(pipeline) || pipeline.steps.e1.status !== 'approved') {
      throw new Error(`E1 approved artifacts not found for ${moduleName}.`);
    }

    const reviewRound = parsed.reviewRound || pipeline.steps.e2?.reviewRound || 1;
    if (parsed.stage === 'coverageJudge') {
      const draft = await readDraftFromStorage(moduleName);
      if (!draft) throw new Error(`E2 draft not found for coverage judge in ${moduleName}.`);
      const judgePrompt = await readNs4AgentText('steps/e2', 'coverageJudge');
      return [{
        type: 'prompt_ready',
        args: hookArgs,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task.PK,
        hookSequential,
        parentStepId: parentStep.stepId,
        systemPrompt: judgePrompt,
        humanPrompt: [
          '## Approved E1 coverage contract',
          JSON.stringify(compactE1CoverageContract(moduleArtifact), null, 2),
          '',
          '## Complete E2 journey draft to judge',
          JSON.stringify(draft, null, 2),
          '',
          `## Required review round\n${reviewRound}`,
        ].join('\n'),
      } as mls.msg.AgentIntentPromptReady];
    }

    if (parsed.stage === 'coverageRepair') {
      const draft = await readDraftFromStorage(moduleName);
      if (!draft) throw new Error(`E2 draft not found for coverage repair in ${moduleName}.`);
      if (!parsed.coverageFeedback) throw new Error(`E2 coverage feedback not found for ${moduleName}.`);
      const [repairPrompt, platform] = await Promise.all([
        readNs4AgentText('steps/e2', 'coverageRepair'),
        readNs4AgentText('skills', 'platform'),
      ]);
      return [{
        type: 'prompt_ready',
        args: hookArgs,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task.PK,
        hookSequential,
        parentStepId: parentStep.stepId,
        systemPrompt: repairPrompt.replace('{{platformSkill}}', platform),
        humanPrompt: [
          '## Approved E1 coverage contract',
          JSON.stringify(compactE1CoverageContract(moduleArtifact), null, 2),
          '',
          '## Complete current E2 draft (read-only base)',
          JSON.stringify(draft, null, 2),
          '',
          `## Required review round\n${parsed.reviewRound || 1}`,
          '',
          `## Mandatory semantic coverage repair\n${parsed.coverageFeedback}`,
        ].join('\n'),
      } as mls.msg.AgentIntentPromptReady];
    }

    const previousDraft = parsed.adjustment || parsed.gateFeedback || parsed.coverageFeedback || parsed.policyDecisionSelections?.length
      ? await readDraftFromStorage(moduleName)
      : null;
    const [prompt, platform] = await Promise.all([
      readNs4AgentText('steps/e2', 'prompt'),
      readNs4AgentText('skills', 'platform'),
    ]);
    const humanPrompt = [
      '## Approved E1 module contract',
      JSON.stringify(moduleArtifact, null, 2),
      '',
      `## Required review round\n${reviewRound}`,
      previousDraft ? `## Previous E2 draft\n${JSON.stringify(previousDraft, null, 2)}` : '',
      parsed.adjustment ? `## Human adjustment request\n${parsed.adjustment}` : '',
      parsed.policyDecisionSelections?.length ? `## Human policy selections that the complete replacement MUST honor\n${JSON.stringify(parsed.policyDecisionSelections, null, 2)}` : '',
      parsed.gateFeedback ? `## Deterministic gate repair required\n${parsed.gateFeedback}` : '',
      parsed.coverageFeedback ? `## Semantic coverage repair required\n${parsed.coverageFeedback}` : '',
    ].filter(Boolean).join('\n');

    return [{
      type: 'prompt_ready',
      args: hookArgs,
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task.PK,
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: prompt.replace('{{platformSkill}}', platform),
      humanPrompt,
    } as mls.msg.AgentIntentPromptReady];
  } catch (error) {
    const message = errorMessage(error);
    await recordNs4E2Failure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

export async function afterNs4E2PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const args = resolveE2Args(context, step.prompt);
    moduleName = args.moduleName;
    const pipeline = await requirePipeline(moduleName);
    await writeNs4Pipeline(markNs4E2Running(pipeline, args.reviewRound || pipeline.steps.e2?.reviewRound || 1));
    if (args.stage === 'coverageJudge') {
      return await afterNs4E2CoverageJudge(context, parentStep, step, hookSequential, args, pipeline);
    }
    const payload = unwrapPayload(step.interaction?.payload?.[0]);
    let review: Ns4E2Review;
    if (args.stage === 'coverageRepair') {
      const round = args.reviewRound || pipeline.steps.e2?.reviewRound || 1;
      const patch = normalizeNs4E2CoveragePatch(payload, args.moduleName, round);
      const patchValidation = validateNs4E2CoveragePatch(patch, args.moduleName, round);
      if (!patchValidation.ok) {
        return await retryInvalidCoveragePatch(
          context, parentStep, step, hookSequential, args, pipeline, patchValidation.errors,
        );
      }
      const storedDraft = normalizeNs4E2Review(await readDraftFromStorage(args.moduleName), args.moduleName);
      review = applyNs4E2CoveragePatch(storedDraft, patch);
    } else {
      if (!isRecord(payload) || payload.planId !== 'e2-review') {
        const message = readE2FailureMessage(payload);
        await recordNs4E2Failure(moduleName, message);
        return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
      }
      review = normalizeNs4E2Review(payload, args.moduleName);
      review.moduleName = args.moduleName;
      review.reviewRound = args.reviewRound || review.reviewRound;
    }
    const gate = validateNs4E2Review(review);
    if (!gate.ok) {
      const message = gate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
      const gateRepairAttempt = args.gateRepairAttempt || 0;
      const coverageRepairAttempt = args.coverageRepairAttempt || 0;
      if (gateRepairAttempt < MAX_E2_GATE_REPAIRS) {
        await writeNs4E2Draft(moduleName, review);
        const repairParent = findMutableParentStep(context, parentStep);
        const repairStep = createNs4E2GateRepairStep(
          moduleName,
          review.reviewRound,
          gateRepairAttempt + 1,
          coverageRepairAttempt,
          message,
          pipeline.presentation.stepTitles['e2-journeys'],
          args.coverageIssueIds,
        );
        return [
          addStep(context, repairParent, repairStep),
          gateRepairResultStep(
            context, repairParent, moduleName, review.reviewRound,
            gateRepairAttempt + 1, coverageRepairAttempt, message,
          ),
          updateStatus(context, repairParent, step, hookSequential, 'completed', `E2 gate requested structural repair ${gateRepairAttempt + 1}.`, 'input_output'),
        ];
      }
      await recordNs4E2Failure(moduleName, message);
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }

    const selectionGate = validateNs4E2PolicySelections(review, args.policyDecisionSelections || [], true);
    if (!selectionGate.ok) {
      const message = selectionGate.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
      await recordNs4E2Failure(moduleName, message);
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }

    const draftPath = await writeNs4E2Draft(args.moduleName, review);
    await writeNs4E2VersionedDraft(args.moduleName, review.reviewRound, review);
    const judgeParent = findMutableParentStep(context, parentStep);
    const judgeStep = createNs4E2CoverageJudgeStep(
      moduleName,
      review.reviewRound,
      args.coverageRepairAttempt || 0,
      1,
      pipeline.presentation.stepTitles['e2-journeys'],
      args.coverageIssueIds,
    );
    return [
      addStep(context, judgeParent, judgeStep),
      updateStatus(
        context, judgeParent, step, hookSequential, 'completed',
        `E2 structural gate passed; coverage judge scheduled for ${draftPath}.`, 'input_output',
      ),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordNs4E2Failure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function afterNs4E2CoverageJudge(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: Ns4E2Args & { moduleName: string },
  pipeline: Ns4PipelineState,
): Promise<mls.msg.AgentIntent[]> {
  const round = args.reviewRound || pipeline.steps.e2?.reviewRound || 1;
  const judgeAttempt = args.judgeAttempt || 1;
  const coverageRepairAttempt = args.coverageRepairAttempt || 0;
  const judgeParent = findMutableParentStep(context, parentStep);
  const payload = unwrapPayload(step.interaction?.payload?.[0]);
  const verdict = normalizeNs4E2CoverageVerdict(payload, args.moduleName, round);
  const validation = validateNs4E2CoverageVerdict(verdict, args.moduleName, round);

  if (!validation.ok) {
    const message = `Invalid E2 coverage verdict: ${validation.errors.join(' ')}`;
    if (judgeAttempt < MAX_E2_JUDGE_ATTEMPTS) {
      return [
        addStep(context, judgeParent, createNs4E2CoverageJudgeStep(
          args.moduleName,
          round,
          coverageRepairAttempt,
          judgeAttempt + 1,
          pipeline.presentation.stepTitles['e2-journeys'],
          args.coverageIssueIds,
        )),
        coverageJudgeTraceStep(
          context, judgeParent, round, coverageRepairAttempt, judgeAttempt,
          pipeline.presentation.stepTitles['e2-journeys'], { valid: false, errors: validation.errors },
        ),
        updateStatus(
          context, judgeParent, step, hookSequential, 'completed',
          `E2 coverage judge returned an invalid verdict; retry ${judgeAttempt + 1} scheduled.`, 'input_output',
        ),
      ];
    }
    await recordNs4E2Failure(args.moduleName, message);
    return [updateStatus(context, judgeParent, step, hookSequential, 'failed', message)];
  }

  const storedDraft = await readDraftFromStorage(args.moduleName);
  const originalReview = normalizeNs4E2Review(storedDraft, args.moduleName);
  const knownDecisionIds = new Set(originalReview.journeys.flatMap(journey => journey.policyDecisions.map(decision => decision.decisionId)));
  const unknownImpact = verdict.policyDecisionImpacts.find(impact => !knownDecisionIds.has(impact.decisionId));
  if (unknownImpact) {
    const message = `E2 coverage judge returned impact for unknown policy decision ${unknownImpact.decisionId}.`;
    await recordNs4E2Failure(args.moduleName, message);
    return [updateStatus(context, judgeParent, step, hookSequential, 'failed', message)];
  }
  const review = applyNs4E2PolicyDecisionImpacts(originalReview, verdict);
  const gate = validateNs4E2Review(review);
  if (!gate.ok) {
    const message = `E2 draft changed or became invalid before coverage approval: ${gate.issues.map(issue => `${issue.code} ${issue.path}`).join(', ')}`;
    await recordNs4E2Failure(args.moduleName, message);
    return [updateStatus(context, judgeParent, step, hookSequential, 'failed', message)];
  }

  if (!verdict.complete) {
    const feedback = formatNs4E2CoverageRepairFeedback(verdict);
    const currentIssueIds = verdict.issues
      .filter(issue => issue.severity === 'blocking')
      .map(issue => issue.issueId)
      .sort();
    if (sameStringSet(currentIssueIds, args.coverageIssueIds || [])) {
      const message = `E2 coverage repair did not converge; the same blocking findings remained.\n${feedback}`;
      await recordNs4E2Failure(args.moduleName, message);
      return [
        coverageJudgeTraceStep(
          context, judgeParent, round, coverageRepairAttempt, judgeAttempt,
          pipeline.presentation.stepTitles['e2-journeys'], verdict,
        ),
        updateStatus(context, judgeParent, step, hookSequential, 'failed', message),
      ];
    }
    if (coverageRepairAttempt < MAX_E2_COVERAGE_REPAIRS) {
      return [
        addStep(context, judgeParent, createNs4E2CoverageRepairStep(
          args.moduleName,
          round,
          coverageRepairAttempt + 1,
          feedback,
          pipeline.presentation.stepTitles['e2-journeys'],
          currentIssueIds,
        )),
        coverageJudgeTraceStep(
          context, judgeParent, round, coverageRepairAttempt, judgeAttempt,
          pipeline.presentation.stepTitles['e2-journeys'], verdict,
        ),
        updateStatus(
          context, judgeParent, step, hookSequential, 'completed',
          `E2 coverage judge requested semantic repair ${coverageRepairAttempt + 1}.`, 'input_output',
        ),
      ];
    }
    const message = `E2 remains incomplete after automatic repair.\n${feedback}`;
    await recordNs4E2Failure(args.moduleName, message);
    return [
      coverageJudgeTraceStep(
        context, judgeParent, round, coverageRepairAttempt, judgeAttempt,
        pipeline.presentation.stepTitles['e2-journeys'], verdict,
      ),
      updateStatus(context, judgeParent, step, hookSequential, 'failed', message),
    ];
  }

  const draftPath = await writeNs4E2Draft(args.moduleName, review);
  await writeNs4E2VersionedDraft(args.moduleName, review.reviewRound, review);
  const reviewedPipeline = await requirePipeline(args.moduleName);
  await writeNs4Pipeline(markNs4E2WaitingHuman(reviewedPipeline, round, draftPath));
  const trace = coverageJudgeTraceStep(
    context, judgeParent, round, coverageRepairAttempt, judgeAttempt,
    pipeline.presentation.stepTitles['e2-journeys'], verdict,
  );

  if (isFast(context)) {
    const saved = await persistNs4E2(args.moduleName, review, 'auto');
    return [
      trace,
      resultStep(context, judgeParent, saved, 'E2 journeys auto-approved'),
      updateStatus(
        context, judgeParent, step, hookSequential, 'completed',
        `E2 coverage approved and ${saved.journeyCount} journeys auto-approved.`, 'input_output',
      ),
    ];
  }

  return [
    trace,
    clarificationReviewStep(context, judgeParent, review, pipeline.presentation.stepTitles['e2-journeys']),
    updateStatus(
      context, judgeParent, step, hookSequential, 'completed',
      'E2 coverage approved; human review opened.', 'input_output',
    ),
  ];
}

async function retryInvalidCoveragePatch(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: Ns4E2Args & { moduleName: string },
  pipeline: Ns4PipelineState,
  errors: string[],
): Promise<mls.msg.AgentIntent[]> {
  const attempt = args.coverageRepairAttempt || 1;
  const message = `Invalid E2 focused coverage patch: ${errors.join(' ')}`;
  const repairParent = findMutableParentStep(context, parentStep);
  if (attempt < MAX_E2_COVERAGE_REPAIRS && args.coverageFeedback) {
    return [
      addStep(context, repairParent, createNs4E2CoverageRepairStep(
        args.moduleName,
        args.reviewRound || pipeline.steps.e2?.reviewRound || 1,
        attempt + 1,
        `${args.coverageFeedback}\nPatch-envelope retry: ${message}`,
        pipeline.presentation.stepTitles['e2-journeys'],
        args.coverageIssueIds,
      )),
      updateStatus(
        context, repairParent, step, hookSequential, 'completed',
        `${message} Focused repair retry ${attempt + 1} scheduled.`, 'input_output',
      ),
    ];
  }
  await recordNs4E2Failure(args.moduleName, message);
  return [updateStatus(context, repairParent, step, hookSequential, 'failed', message)];
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
  if (!gate.ok) {
    const message = gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await recordNs4E2Failure(review.moduleName, message);
    throw new Error(message);
  }

  await import('/_102020_/l2/agentNewSolution4/widgets/widgetNs4Journeys.js');
  const element = document.createElement('widget-ns4-journeys-102020');
  (element as unknown as { value: Ns4E2Review }).value = review;
  element.addEventListener('ns4-journeys-review', (event: Event) => {
    const detail = (event as CustomEvent<Ns4E2ReviewEvent>).detail;
    void applyNs4E2Review(context, parentStep, step, hookSequential, detail)
      .catch(error => { showNs4ClarificationError(element, error); console.error(`[${agent.agentName}] ${errorMessage(error)}`); });
  });
  return element;
}

async function applyNs4E2Review(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  event: Ns4E2ReviewEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution4:e2] task invalid');
  const mutationParent = findMutableParentStep(context, parentStep);
  if (event.action === 'cancel') throw new Error('Cancelamento terminal ainda depende de suporte explícito do collab-messages; esta revisão foi mantida aberta sem alterar o pipeline.');
  if (event.action === 'approve') {
    const selectionGate = validateNs4E2PolicySelections(event.review, event.policyDecisionSelections, true);
    if (!selectionGate.ok) throw new Error(selectionGate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    const saved = await persistNs4E2(event.review.moduleName, event.review, 'human', event.policyDecisionSelections);
    await applyIntents(context, [
      resultStep(context, mutationParent, saved, 'E2 journeys approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  } else {
    if (!event.adjustment.trim() && !event.policyDecisionSelections.some(selection => {
      const decision = event.review.journeys.flatMap(journey => journey.policyDecisions).find(item => item.decisionId === selection.decisionId);
      return decision && decision.chosen !== selection.selectedChoice;
    })) throw new Error('Adjustment request or a different policy selection is required.');
    const nextRound = event.review.reviewRound + 1;
    const pipeline = await requirePipeline(event.review.moduleName);
    await writeNs4E2Draft(event.review.moduleName, event.review);
    await writeNs4E2VersionedDraft(event.review.moduleName, event.review.reviewRound, event.review);
    await writeNs4Pipeline(markNs4E2Running(pipeline, nextRound));
    await applyIntents(context, [
      addStep(context, mutationParent, createNs4E2Step(event.review.moduleName, nextRound, event.adjustment, [], undefined, event.policyDecisionSelections)),
      adjustmentResultStep(context, mutationParent, event.review.moduleName, event.review.reviewRound, event.adjustment),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  }
  await continuePoolingTask(context);
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

async function persistNs4E2(
  moduleName: string,
  review: Ns4E2Review,
  approvedBy: Ns4ApprovedBy,
  requestedSelections: Array<Pick<Ns4PolicyDecisionSelection, 'decisionId' | 'selectedChoice'>> = [],
): Promise<Ns4PersistedE2> {
  const gate = validateNs4E2Review(review);
  if (!gate.ok) throw new Error(gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const moduleArtifact = await readNs4Module(moduleName);
  const pipeline = await requirePipeline(moduleName);
  if (!moduleArtifact || moduleArtifact.module.moduleName !== moduleName) throw new Error(`Invalid module artifact for ${moduleName}.`);

  const artifacts = await buildNs4JourneyArtifacts(review);
  const previousIndex = await readNs4DefsJson<Ns4JourneyIndex>(ns4JourneyIndexFile(moduleName));
  const artifactPaths: string[] = [];
  for (const artifact of artifacts) artifactPaths.push(await writeNs4Journey(moduleName, artifact.journeyId, artifact));
  const approvedAt = new Date().toISOString();
  const selections = buildNs4PolicyDecisionSelections(review, requestedSelections, approvedBy, approvedAt);
  const index = buildNs4JourneyIndex(moduleName, review, artifacts, artifactPaths, approvedBy, approvedAt, selections);
  const indexPath = await writeNs4JourneyIndex(moduleName, index);
  const impactReport = buildNs4E2ImpactReport(moduleName, previousIndex, artifacts, approvedAt);
  const impactReportPath = await writeNs4E2ImpactReport(moduleName, impactReport);
  const invalidated = impactReport.changes.length > 0;
  await writeNs4Module(moduleName, markNs4ModuleE2Approved(moduleArtifact, approvedBy, approvedAt, invalidated));
  const approvedPipeline = markNs4E2Approved(pipeline, approvedBy, [...artifactPaths, indexPath, impactReportPath], approvedAt);
  await writeNs4Pipeline(markNs4E2ImpactStale(approvedPipeline, invalidated, approvedAt));
  return { moduleName, journeyCount: artifacts.length, artifactPaths, indexPath };
}

async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const pipeline = await readNs4Pipeline(moduleName);
  if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution4 pipeline not found for ${moduleName}.`);
  return pipeline;
}

async function recordNs4E2Failure(moduleName: string, failure: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readNs4Pipeline(moduleName);
    if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E2Failed(pipeline, failure));
  } catch {
    // The step trace remains the fallback when the pipeline itself cannot be read or written.
  }
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
    result: JSON.stringify({ ...saved, completedStep: 'e2-journeys', nextStep: 'e3-access-matrix' }, null, 2),
    planning: { planId: 'e2-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function clarificationReviewStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  review: Ns4E2Review,
  title: string,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'clarification', stepId: 0, interaction: null,
    stepTitle: plainNs4StepTitle(title), status: 'pending', nextSteps: [],
    json: JSON.stringify(review),
    planning: {
      planId: `e2-review-round-${review.reviewRound}`,
      dependsOn: [], executionMode: 'sequential', executionHost: 'client',
    },
  } as mls.msg.AIClarificationStep);
}

function coverageJudgeTraceStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  round: number,
  coverageRepairAttempt: number,
  judgeAttempt: number,
  title: string,
  result: Ns4E2CoverageVerdict | { valid: false; errors: string[] },
): mls.msg.AgentIntentAddStep {
  const cleanTitle = title.trim().replace(/^[👤🔎]\s*/u, '');
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `${NS4_AUTOMATED_JUDGE_ICON} ${cleanTitle}`,
    status: 'completed', nextSteps: [], result: JSON.stringify(result, null, 2),
    planning: {
      planId: `e2-coverage-judge-result-${round}-${coverageRepairAttempt}-${judgeAttempt}`,
      dependsOn: [], executionMode: 'manual_later', executionHost: 'client',
    },
  } as mls.msg.AIResultStep);
}

function adjustmentResultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, moduleName: string, round: number, adjustment: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `E2 changes requested after round ${round}`, status: 'completed', nextSteps: [],
    result: JSON.stringify({ moduleName, reviewRound: round, adjustment }, null, 2),
    planning: { planId: `e2-adjustment-request-${Date.now()}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function gateRepairResultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  round: number,
  gateRepairAttempt: number,
  coverageRepairAttempt: number,
  gateFeedback: string,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `E2 structural repair ${gateRepairAttempt}`,
    status: 'completed', nextSteps: [], result: JSON.stringify({
      moduleName, reviewRound: round, gateRepairAttempt, coverageRepairAttempt, gateFeedback,
    }, null, 2),
    planning: {
      planId: `e2-gate-repair-${round}-${coverageRepairAttempt}-${gateRepairAttempt}`,
      dependsOn: [], executionMode: 'manual_later', executionHost: 'client',
    },
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
  if (!isRecord(parsed) || parsed.planId !== 'e2-journeys') {
    throw new Error('Invalid E2 step arguments.');
  }
  return {
    planId: 'e2-journeys',
    ...(parsed.stage === 'coverageJudge' || parsed.stage === 'coverageRepair'
      ? { stage: parsed.stage as 'coverageJudge' | 'coverageRepair' }
      : {}),
    ...(typeof parsed.moduleName === 'string' && parsed.moduleName.trim() ? { moduleName: parsed.moduleName.trim() } : {}),
    ...(typeof parsed.adjustment === 'string' && parsed.adjustment.trim() ? { adjustment: parsed.adjustment.trim() } : {}),
    ...(typeof parsed.reviewRound === 'number' ? { reviewRound: parsed.reviewRound } : {}),
    ...(typeof parsed.gateRepairAttempt === 'number' ? { gateRepairAttempt: parsed.gateRepairAttempt } : {}),
    ...(typeof parsed.coverageRepairAttempt === 'number' ? { coverageRepairAttempt: parsed.coverageRepairAttempt } : {}),
    ...(typeof parsed.judgeAttempt === 'number' ? { judgeAttempt: parsed.judgeAttempt } : {}),
    ...(typeof parsed.gateFeedback === 'string' && parsed.gateFeedback.trim() ? { gateFeedback: parsed.gateFeedback.trim() } : {}),
    ...(typeof parsed.coverageFeedback === 'string' && parsed.coverageFeedback.trim() ? { coverageFeedback: parsed.coverageFeedback.trim() } : {}),
    ...(Array.isArray(parsed.coverageIssueIds)
      ? { coverageIssueIds: parsed.coverageIssueIds.filter((value): value is string => typeof value === 'string' && !!value.trim()).map(value => value.trim()) }
      : {}),
    ...(Array.isArray(parsed.policyDecisionSelections)
      ? { policyDecisionSelections: parsed.policyDecisionSelections.map(item => isRecord(item) ? ({
        decisionId: typeof item.decisionId === 'string' ? item.decisionId.trim() : '',
        selectedChoice: typeof item.selectedChoice === 'string' ? item.selectedChoice.trim() : '',
      }) : null).filter((item): item is { decisionId: string; selectedChoice: string } => !!item?.decisionId && !!item.selectedChoice) }
      : {}),
  };
}

function resolveE2Args(context: mls.msg.ExecutionContext, value: unknown): Ns4E2Args & { moduleName: string } {
  const parsed = parseE2Args(value);
  const moduleName = parsed.moduleName || findE1ModuleName(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E1 module result not found for E2.');
  return { ...parsed, moduleName };
}

function findE1ModuleName(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e1-result');
  if (!result || result.type !== 'result' || !result.result) return '';
  const parsed = parseMaybeJson(result.result);
  return isRecord(parsed) && typeof parsed.moduleName === 'string' ? parsed.moduleName.trim() : '';
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function compactE1CoverageContract(moduleArtifact: Ns4ModuleArtifact): unknown {
  return {
    module: moduleArtifact.module,
    businessScope: moduleArtifact.businessScope,
    declaredConstraints: moduleArtifact.declaredConstraints,
    solutionStrategy: { mode: moduleArtifact.solutionStrategy.mode },
    localization: {
      productLanguages: moduleArtifact.localization.productLanguages,
      defaultLanguage: moduleArtifact.localization.defaultLanguage,
    },
  };
}

function sameStringSet(left: string[], right: string[]): boolean {
  if (!left.length || left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every(value => expected.has(value));
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

function readE2FailureMessage(payload: unknown): string {
  if (isRecord(payload) && payload.type === 'result' && typeof payload.result === 'string' && payload.result.trim()) {
    return payload.result.trim();
  }
  return 'E2 returned an invalid internal review payload.';
}
