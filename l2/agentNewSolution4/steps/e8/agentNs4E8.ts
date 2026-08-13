import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution4/helpers/ns4StepTree.js';
import { createNs4FlexibleWorkerTool, unwrapNs4FlexibleWorkerPayload } from '/_102020_/l2/agentNewSolution4/helpers/ns4WorkerTools.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution4/helpers/ns4Clarification.js';
import {
  createNs4E8PresentationRepairStep, createNs4E8Step, isNs4Pipeline, markNs4E8Approved, markNs4E8Failed, markNs4E8Running,
  markNs4E8WaitingHuman, markNs4ModuleE8Approved, NS4_E8_MAX_PARALLEL, Ns4ApprovedBy, Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { readNs4ApprovedAccess, readNs4ApprovedJourneys, readNs4ApprovedOntology } from '/_102020_/l2/agentNewSolution4/helpers/ns4ApprovedArtifacts.js';
import {
  ns4AgentFile, ns4E8SkeletonDraftFile, ns4E8ValidationReportFile, ns4E8WorkspaceDraftFile, ns4JourneyIndexFile, ns4UseCaseFile, ns4UseCaseIndexFile, ns4WorkflowFile, ns4WorkflowIndexFile,
  readNs4AgentText, readNs4DefsJson, readNs4Module, readNs4Pipeline, readNs4Text,
  writeNs4E8SkeletonDraft, writeNs4E8ValidationReport, writeNs4E8WorkspaceDraft, writeNs4Module, writeNs4Pipeline, writeNs4Workspace, writeNs4WorkspaceIndex,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4JourneyIndex } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4UseCaseArtifactV3, Ns4UseCaseIndexArtifactV3, Ns4WorkflowArtifactV2, Ns4WorkflowIndexArtifactV2, Ns4WorkflowIndexArtifactV3 } from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import {
  buildNs4WorkspaceArtifacts, deriveNs4E8Skeleton, hashNs4E8Skeleton, normalizeNs4E8PresentationProposal, normalizeNs4E8Skeleton,
  normalizeNs4WorkspaceDetail, overlayNs4E8Presentation, resolveNs4E8PresentationDefaults, Ns4E8SkeletonReview, Ns4E8Sources, Ns4E8ReviewEvent, Ns4WorkspaceDetailDraft,
} from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import { hasNs4E8DetailsDispatch, ns4E8DetailsPlanId } from '/_102020_/l2/agentNewSolution4/steps/e8/dispatch.js';
import { resolveNs4WorkspaceDetailFindings, validateNs4E8PresentationProposal, validateNs4E8Skeleton, validateNs4WorkspaceDetail } from '/_102020_/l2/agentNewSolution4/steps/e8/gate.js';
import type { Ns4E8GateIssue } from '/_102020_/l2/agentNewSolution4/steps/e8/gate.js';

interface Ns4E8Args { planId: 'e8-workspaces'; moduleName?: string; reviewRound?: number; adjustment?: string; stage?: 'skeleton' | 'finalize'; repairRound?: number; approvedBy?: Ns4ApprovedBy; presentationAttempt?: number; gateFeedback?: string; }
interface PersistedE8 { moduleName: string; workspaceCount: number; artifactPaths: string[]; }
interface Ns4E8ValidationReport {
  schemaVersion: '2026-08-12-ns4-e8-validation-report-v1';
  moduleName: string;
  attempts: Array<{ round: number; checkedAt: string; valid: number; invalid: number;
    results: Array<{ workspaceId: string; status: 'valid' | 'invalid' | 'missing' | 'resolved'; issues: Ns4E8GateIssue[]; postResolutionIssues?: Ns4E8GateIssue[] }>;
    systemDecisions: Ns4SystemDecision[] }>;
  finalStatus: 'repairing' | 'passed' | 'failed';
  updatedAt: string;
}
const MAX_WORKER_REPAIRS = 1;

export async function beforeNs4E8PromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const selector = workspaceSelector(args) || workspaceSelector(step.prompt); let moduleName = '';
  try {
    const parsed = resolveArgs(context, selector ? { planId: 'e8-workspaces', stage: 'finalize' } : args || step.prompt); moduleName = parsed.moduleName;
    if (selector) return [await workerPrompt(context, parent, hookSequential, selector, moduleName)];
    if (parsed.stage === 'finalize') return await finalize(context, parent, step, hookSequential, parsed);
    return [await skeletonPrompt(context, parent, hookSequential, args || String(step.prompt || ''), parsed)];
  } catch (error) {
    const message = errorMessage(error); if (selector) return [status(context, parent, step, hookSequential, 'completed', `Workspace ${selector} prompt failed; finalizer will repair it. | ${message}`, 'input_output')];
    await fail(moduleName, message); return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function afterNs4E8PromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const selector = workspaceSelector(args) || workspaceSelector(step.prompt); let moduleName = '';
  try {
    if (selector) {
      moduleName = resolveArgs(context, { planId: 'e8-workspaces' }).moduleName;
      const skeleton = await readSkeleton(moduleName); const payload = unwrap(step.interaction?.payload?.[0]);
      if (!isRecord(payload)) return [status(context, parent, step, hookSequential, 'completed', `Workspace ${selector} returned no usable detail; finalizer will repair it.`, 'input_output')];
      const detail = normalizeNs4WorkspaceDetail(payload, moduleName, selector); await writeNs4E8WorkspaceDraft(moduleName, selector, detail);
      const gate = validateNs4WorkspaceDetail(detail, skeleton, await loadSources(moduleName));
      return [status(context, parent, step, hookSequential, 'completed', gate.ok ? `Workspace ${selector} detail saved.` : `Workspace ${selector} gate failed; finalizer will repair it. | ${formatGate(gate.issues)}`, 'input_output')];
    }
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    if (parsed.stage === 'finalize') return [status(context, parent, step, hookSequential, 'failed', 'E8 finalizer does not accept an LLM response.', 'input_output')];
    const sources = await loadSources(moduleName); const pipeline = await requirePipeline(moduleName); const round = parsed.reviewRound || pipeline.steps.e8?.reviewRound || 1;
    const payload = unwrap(step.interaction?.payload?.[0]);
    const derived = deriveNs4E8Skeleton(sources, round); const proposal = normalizeNs4E8PresentationProposal(payload, moduleName);
    const presentationGate = validateNs4E8PresentationProposal(derived, proposal);
    let skeleton: Ns4E8SkeletonReview;
    if (!presentationGate.ok && (parsed.presentationAttempt || 0) < 1) {
      const mutationParent = findParent(context, parent, step); const feedback = formatGate(presentationGate.issues);
      const repairPlanId = `e8-workspaces-presentation-repair-${round}-1`;
      const alreadyScheduled = getAllSteps(context.task?.iaCompressed?.nextSteps).some(item => item.planning?.planId === repairPlanId);
      return [...(alreadyScheduled ? [] : [addStep(context, mutationParent, createNs4E8PresentationRepairStep(moduleName, round, 1, feedback, pipeline.presentation.stepTitles['e8-workspaces']))]),
        status(context, mutationParent, step, hookSequential, 'completed', alreadyScheduled ? 'E8 presentation repair was already scheduled; duplicate response ignored.' : 'E8 presentation response was invalid; one constrained repair was scheduled.', 'input_output')];
    }
    skeleton = presentationGate.ok ? overlayNs4E8Presentation(derived, proposal) : resolveNs4E8PresentationDefaults(derived, formatGate(presentationGate.issues));
    skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
    const gate = validateNs4E8Skeleton(skeleton, sources); const skeletonPath = await writeNs4E8SkeletonDraft(moduleName, skeleton);
    if (!gate.ok) throw new Error(formatGate(gate.issues));
    await writeNs4Pipeline(markNs4E8WaitingHuman(await requirePipeline(moduleName), round, skeletonPath));
    const mutationParent = findParent(context, parent, step);
    if (fast(context)) return beginWorkers(context, mutationParent, step, hookSequential, skeleton, 'auto');
    return [clarification(context, mutationParent, skeleton, pipeline.presentation.stepTitles['e8-workspaces']), status(context, mutationParent, step, hookSequential, 'completed', 'E8 workspace map ready for human approval.', 'input_output')];
  } catch (error) { const message = errorMessage(error); await fail(moduleName, message); return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')]; }
}

export async function beforeNs4E8ClarificationStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep, hookSequential: number, json: unknown): Promise<HTMLElement> {
  const skeleton = normalizeNs4E8Skeleton(parse(json)); const gate = validateNs4E8Skeleton(skeleton, await loadSources(skeleton.moduleName)); if (!gate.ok) throw new Error(formatGate(gate.issues));
  await import('/_102020_/l2/agentNewSolution4/widgets/widgetNs4Workspaces.js'); const element = document.createElement('widget-ns4-workspaces-102020');
  const widget = element as unknown as { value: Ns4E8SkeletonReview; setSubmitting(value: boolean): void }; widget.value = skeleton;
  element.addEventListener('ns4-workspaces-review', (event: Event) => { void applyReview(context, parent, step, hookSequential, (event as CustomEvent<Ns4E8ReviewEvent>).detail).catch(error => { widget.setSubmitting(false); showNs4ClarificationError(element, error); console.error(`[${agent.agentName}] ${errorMessage(error)}`); }); });
  return element;
}

async function skeletonPrompt(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, hookSequential: number, hookArgs: string, args: Ns4E8Args & { moduleName: string }): Promise<mls.msg.AgentIntentPromptReady> {
  const [sources, prompt, pipeline, tool] = await Promise.all([loadSources(args.moduleName), readNs4AgentText('steps/e8', 'prompt'), requirePipeline(args.moduleName), readNs4E8PresentationTool()]);
  if (pipeline.steps.e7?.status !== 'approved') throw new Error(`E7 approved pipeline not found for ${args.moduleName}.`);
  const derived = deriveNs4E8Skeleton(sources, args.reviewRound || pipeline.steps.e8?.reviewRound || 1);
  return promptReady(context, parent, hookSequential, hookArgs, prompt, [
    `## Frozen mechanically-derived workspace skeleton\n${JSON.stringify(derived)}`,
    `## Required identity\nmoduleName=${args.moduleName}; reviewRound=${derived.reviewRound}; userLanguage=${derived.userLanguage}`,
    args.adjustment ? `## Human change request\n${args.adjustment}` : '',
    args.gateFeedback ? `## Previous response failed validation; repair every item\n${args.gateFeedback}` : '',
  ].filter(Boolean).join('\n\n'), tool);
}

async function workerPrompt(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, hookSequential: number, workspaceId: string, moduleName: string): Promise<mls.msg.AgentIntentPromptReady> {
  const [skeleton, sources, prompt, current, tool] = await Promise.all([readSkeleton(moduleName), loadSources(moduleName), readNs4AgentText('steps/e8', 'promptWorkspace'), readDetail(moduleName, workspaceId), readNs4WorkspaceWorkerTool()]);
  const workspace = skeleton.workspaces.find(item => item.workspaceId === workspaceId); if (!workspace) throw new Error(`Workspace ${workspaceId} is not present in the frozen skeleton.`);
  const relevantEntities = new Set(workspace.slices.flatMap(slice => slice.entityRefs));
  const entities = sources.ontology.entities.filter(entity => relevantEntities.has(entity.entityId)).map(entity => ({ entityId: entity.entityId, fields: entity.fields.map(field => ({ fieldId: field.fieldId, title: field.title, type: field.type, constraints: field.constraints })) }));
  const grants = sources.access.grants.filter(grant => workspace.profileRefs.includes(grant.profileRef));
  return promptReady(context, parent, hookSequential, `workspace:${workspaceId}`, prompt, [
    `## Frozen workspace\n${JSON.stringify(workspace)}`,
    `## Frozen skeleton hash\n${skeleton.skeletonHash}`,
    `## Hosted use cases\n${JSON.stringify(sources.useCases.filter(useCase => workspace.useCaseIds.includes(useCase.useCaseId)))}`,
    `## Exact ontology fields\n${JSON.stringify(entities)}`,
    `## E3 disclosure grants\n${JSON.stringify(grants)}`,
    `## Frozen policy decision selections\n${JSON.stringify(sources.policyDecisionSelections || [])}`,
    current ? `## Current worker detail; repair only deterministic failures\n${JSON.stringify(current)}` : '',
    `## Required identity\nmoduleName=${moduleName}; workspaceId=${workspaceId}; skeletonHash=${skeleton.skeletonHash}`,
  ].filter(Boolean).join('\n\n'), tool);
}

async function applyReview(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep, hookSequential: number, event: Ns4E8ReviewEvent): Promise<void> {
  if (event.action === 'cancel') throw new Error('Cancelamento terminal ainda depende de suporte explícito do collab-messages; a revisão foi mantida aberta.');
  const skeleton = normalizeNs4E8Skeleton(event.review, event.review.moduleName); const mutationParent = findParent(context, parent);
  if (event.action === 'approve' && hasNs4E8DetailsDispatch(getAllSteps(context.task?.iaCompressed?.nextSteps), skeleton.reviewRound)) {
    await applyIntents(context, [status(context, mutationParent, step, hookSequential, 'completed', `E8 workspace detailing for review round ${skeleton.reviewRound} was already dispatched; duplicate approval ignored.`, 'input_output')]);
    await continuePoolingTask(context); return;
  }
  const sources = await loadSources(event.review.moduleName); skeleton.skeletonHash = await hashNs4E8Skeleton(skeleton);
  const gate = validateNs4E8Skeleton(skeleton, sources); if (!gate.ok) throw new Error(formatGate(gate.issues)); await writeNs4E8SkeletonDraft(skeleton.moduleName, skeleton);
  if (event.action === 'requestChanges') {
    if (!event.adjustment.trim()) throw new Error('Descreva a alteração desejada antes de enviar.'); const pipeline = await requirePipeline(skeleton.moduleName);
    await writeNs4Pipeline(markNs4E8Running(pipeline, skeleton.reviewRound + 1));
    await applyIntents(context, [addStep(context, mutationParent, createNs4E8Step(skeleton.moduleName, skeleton.reviewRound + 1, event.adjustment, [], pipeline.presentation.stepTitles['e8-workspaces'])), status(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output')]);
  } else await applyIntents(context, await beginWorkers(context, mutationParent, step, hookSequential, skeleton, 'human'));
  await continuePoolingTask(context);
}

async function beginWorkers(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, host: mls.msg.AIPayload, hookSequential: number, skeleton: Ns4E8SkeletonReview, approvedBy: Ns4ApprovedBy): Promise<mls.msg.AgentIntent[]> {
  const pipeline = await requirePipeline(skeleton.moduleName); await writeNs4Pipeline(markNs4E8Running(pipeline, skeleton.reviewRound, `l4/${skeleton.moduleName}/pipeline/e8-skeleton.draft.json`));
  const parallel = workerStep(context, host, skeleton, 0); const finalizeStep = createFinalize(skeleton.moduleName, approvedBy, 0, [String(parallel.step.planning?.planId || '')]);
  return [parallel, addStep(context, parent, finalizeStep), status(context, parent, host, hookSequential, 'completed', `E8 skeleton approved; detailing ${skeleton.workspaces.length} workspaces with maxParallel=${NS4_E8_MAX_PARALLEL}.`, 'input_output')];
}

async function finalize(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: Ns4E8Args & { moduleName: string }): Promise<mls.msg.AgentIntent[]> {
  const [skeleton, sources] = await Promise.all([readSkeleton(args.moduleName), loadSources(args.moduleName)]);
  const evaluations: Array<{ workspaceId: string; detail: Ns4WorkspaceDetailDraft | null; issues: Ns4E8GateIssue[]; ok: boolean }> = [];
  for (const workspace of skeleton.workspaces) {
    const detail = await readDetail(args.moduleName, workspace.workspaceId);
    if (!detail) evaluations.push({ workspaceId: workspace.workspaceId, detail: null, ok: false, issues: [{ code: 'NS4_E8_DRAFT_MISSING', path: 'draft', message: 'Workspace detail draft was not persisted.' }] });
    else { const gate = validateNs4WorkspaceDetail(detail, skeleton, sources); evaluations.push({ workspaceId: workspace.workspaceId, detail, ok: gate.ok, issues: gate.issues }); }
  }
  const invalid = evaluations.filter(item => !item.ok).map(item => item.workspaceId);
  const repairRound = args.repairRound || 0; const mutationParent = findParent(context, parent, step);
  if (invalid.length && repairRound < MAX_WORKER_REPAIRS) {
    await updateValidationReport(args.moduleName, repairRound, evaluations.map(item => ({ workspaceId: item.workspaceId, status: item.detail ? item.ok ? 'valid' : 'invalid' : 'missing', issues: item.issues })), [], 'repairing');
    const parallel = workerStep(context, step, skeleton, repairRound + 1, invalid); return [parallel, addStep(context, mutationParent, createFinalize(args.moduleName, args.approvedBy || 'human', repairRound + 1, [String(parallel.step.planning?.planId || '')])), status(context, mutationParent, step, hookSequential, 'completed', `E8 repairing ${invalid.length} invalid workspace detail(s): ${invalid.join(', ')}.`, 'input_output')];
  }
  const details: Ns4WorkspaceDetailDraft[] = []; const decisions: Ns4SystemDecision[] = [...skeleton.systemDecisions];
  const results: Ns4E8ValidationReport['attempts'][number]['results'] = [];
  for (const evaluation of evaluations) {
    if (!evaluation.detail) { results.push({ workspaceId: evaluation.workspaceId, status: 'missing', issues: evaluation.issues }); continue; }
    const resolved = resolveNs4WorkspaceDetailFindings(evaluation.detail, evaluation.issues); decisions.push(...resolved.systemDecisions);
    if (resolved.artifact !== evaluation.detail) await writeNs4E8WorkspaceDraft(args.moduleName, evaluation.workspaceId, resolved.artifact);
    const postGate = validateNs4WorkspaceDetail(resolved.artifact, skeleton, sources);
    if (postGate.ok) details.push(resolved.artifact);
    results.push({ workspaceId: evaluation.workspaceId, status: postGate.ok ? evaluation.ok ? 'valid' : 'resolved' : 'invalid', issues: evaluation.issues,
      ...(!evaluation.ok || !postGate.ok ? { postResolutionIssues: postGate.issues } : {}) });
  }
  const unresolved = results.filter(item => item.status === 'invalid' || item.status === 'missing').map(item => item.workspaceId);
  const uniqueDecisions = [...new Map(decisions.map(decision => [decision.findingRef, decision])).values()];
  const reportPath = await updateValidationReport(args.moduleName, repairRound, results, uniqueDecisions, unresolved.length ? 'failed' : 'passed');
  if (unresolved.length) throw new Error(`E8 workspace details remain irrecoverable after repair: ${unresolved.join(', ')}. See ${reportPath}.`);
  const approvedAt = new Date().toISOString(); const built = await buildNs4WorkspaceArtifacts(skeleton, details, args.approvedBy || 'human', approvedAt, uniqueDecisions); const artifactPaths: string[] = [reportPath];
  for (const artifact of built.artifacts) artifactPaths.push(await writeNs4Workspace(args.moduleName, artifact.workspaceId, artifact)); artifactPaths.push(await writeNs4WorkspaceIndex(args.moduleName, built.index));
  const module = await readNs4Module(args.moduleName); if (!module) throw new Error(`Module artifact not found for ${args.moduleName}.`);
  await writeNs4Module(args.moduleName, markNs4ModuleE8Approved(module, args.approvedBy || 'human', approvedAt)); await writeNs4Pipeline(markNs4E8Approved(await requirePipeline(args.moduleName), args.approvedBy || 'human', artifactPaths, approvedAt));
  return [result(context, mutationParent, { moduleName: args.moduleName, workspaceCount: built.artifacts.length, artifactPaths }, 'E8 workspaces approved'), status(context, mutationParent, step, hookSequential, 'completed', `E8 compiled ${built.artifacts.length} workspaces.`, 'input_output')];
}

async function updateValidationReport(moduleName: string, round: number, results: Ns4E8ValidationReport['attempts'][number]['results'], systemDecisions: Ns4SystemDecision[], finalStatus: Ns4E8ValidationReport['finalStatus']): Promise<string> {
  const now = new Date().toISOString(); const previous = round > 0 ? await readValidationReport(moduleName) : null;
  const attempt = { round, checkedAt: now, valid: results.filter(result => result.status === 'valid' || result.status === 'resolved').length,
    invalid: results.filter(result => result.status === 'invalid' || result.status === 'missing').length, results, systemDecisions };
  const attempts = [...(previous?.attempts || []).filter(item => item.round !== round), attempt].sort((left, right) => left.round - right.round);
  return writeNs4E8ValidationReport(moduleName, { schemaVersion: '2026-08-12-ns4-e8-validation-report-v1', moduleName, attempts, finalStatus, updatedAt: now } satisfies Ns4E8ValidationReport);
}

async function readValidationReport(moduleName: string): Promise<Ns4E8ValidationReport | null> {
  const parsed = parse(await readNs4Text(ns4E8ValidationReportFile(moduleName), false));
  if (!isRecord(parsed) || parsed.schemaVersion !== '2026-08-12-ns4-e8-validation-report-v1' || parsed.moduleName !== moduleName || !Array.isArray(parsed.attempts)) return null;
  return parsed as unknown as Ns4E8ValidationReport;
}

function workerStep(context: mls.msg.ExecutionContext, host: mls.msg.AIPayload, skeleton: Ns4E8SkeletonReview, repairRound: number, workspaceIds = skeleton.workspaces.map(workspace => workspace.workspaceId)): mls.msg.AgentIntentAddStep {
  const planId = ns4E8DetailsPlanId(skeleton.reviewRound, repairRound);
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: host.stepId, step: { type: 'agent', stepId: 0, interaction: { input: [{ type: 'system', content: '<!-- modelType: reasoning -->' }], cost: 0, trace: [`queued ${workspaceIds.length} E8 workspaces with maxParallel=${NS4_E8_MAX_PARALLEL}`], payload: null }, stepTitle: 'Detailing {{completed}}/{{total}} workspaces, failed {{failed}}', status: 'in_progress', nextSteps: [], agentName: 'agentNewSolution4', onFailure: 'wait_after_prompt', prompt: JSON.stringify({ planId: 'e8-workspaces' }), rags: [], planning: { planId, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep, executionMode: { type: 'parallel', args: workspaceIds.map(id => `workspace:${id}`), maxParallel: NS4_E8_MAX_PARALLEL } };
}
function createFinalize(moduleName: string, approvedBy: Ns4ApprovedBy, repairRound: number, dependsOn: string[]): mls.msg.AIAgentStep { return { type: 'agent', stepId: 0, interaction: null, stepTitle: `Finalize E8 workspace details${repairRound ? ` · R${repairRound}` : ''}`, status: 'waiting_dependency', nextSteps: [], agentName: 'agentNewSolution4', prompt: JSON.stringify({ planId: 'e8-workspaces', moduleName, stage: 'finalize', approvedBy, repairRound }), rags: [], planning: { planId: `e8-workspaces-finalize-${repairRound}`, dependsOn, executionMode: 'sequential', executionHost: 'client' } }; }
async function loadSources(moduleName: string): Promise<Ns4E8Sources> { const [journeys, access, ontology, journeyIndex, useCaseIndex, workflowIndex] = await Promise.all([readNs4ApprovedJourneys(moduleName), readNs4ApprovedAccess(moduleName), readNs4ApprovedOntology(moduleName), readNs4DefsJson<Ns4JourneyIndex>(ns4JourneyIndexFile(moduleName), true), readNs4DefsJson<Ns4UseCaseIndexArtifactV3>(ns4UseCaseIndexFile(moduleName), true), readNs4DefsJson<Ns4WorkflowIndexArtifactV2 | Ns4WorkflowIndexArtifactV3>(ns4WorkflowIndexFile(moduleName), true)]); if (!journeyIndex || !useCaseIndex || !workflowIndex) throw new Error(`Approved E7 artifacts not found for ${moduleName}.`); const [useCases, workflows] = await Promise.all([Promise.all(useCaseIndex.useCases.map(entry => readNs4DefsJson<Ns4UseCaseArtifactV3>(ns4UseCaseFile(moduleName, entry.useCaseId), true))), Promise.all(workflowIndex.workflows.map(entry => readNs4DefsJson<Ns4WorkflowArtifactV2>(ns4WorkflowFile(moduleName, entry.workflowId), true)))]); if (useCases.some(item => !item) || workflows.some(item => !item)) throw new Error(`Incomplete E7 artifacts for ${moduleName}.`); return { journeys, access, ontology, useCases: useCases as Ns4UseCaseArtifactV3[], workflows: workflows as Ns4WorkflowArtifactV2[], policyDecisionSelections: journeyIndex.policyDecisionSelections || [] }; }
async function readSkeleton(moduleName: string): Promise<Ns4E8SkeletonReview> { const raw = await readNs4Text(ns4E8SkeletonDraftFile(moduleName), true); const skeleton = normalizeNs4E8Skeleton(parse(raw), moduleName); if (!skeleton.skeletonHash) throw new Error(`Frozen E8 skeleton not found for ${moduleName}.`); return skeleton; }
async function readDetail(moduleName: string, workspaceId: string): Promise<Ns4WorkspaceDetailDraft | null> { const raw = await readNs4Text(ns4E8WorkspaceDraftFile(moduleName, workspaceId), false); const value = parse(raw); return isRecord(value) ? normalizeNs4WorkspaceDetail(value, moduleName, workspaceId) : null; }
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E8Args & { moduleName: string; approvedBy?: Ns4ApprovedBy } { const root = parse(value); if (!isRecord(root) || root.planId !== 'e8-workspaces') throw new Error('Invalid E8 step arguments.'); const moduleName = text(root.moduleName) || findE7Module(context) || memory(context, 'resumeModule'); if (!moduleName) throw new Error('E7 module result not found for E8.'); return { planId: 'e8-workspaces', moduleName, ...(integer(root.reviewRound) ? { reviewRound: integer(root.reviewRound) } : {}), ...(text(root.adjustment) ? { adjustment: text(root.adjustment) } : {}), ...(root.stage === 'finalize' || root.stage === 'skeleton' ? { stage: root.stage } : {}), ...(integer(root.repairRound) ? { repairRound: integer(root.repairRound) } : {}), ...(integer(root.presentationAttempt) ? { presentationAttempt: integer(root.presentationAttempt) } : {}), ...(text(root.gateFeedback) ? { gateFeedback: text(root.gateFeedback) } : {}), ...(root.approvedBy === 'auto' || root.approvedBy === 'human' ? { approvedBy: root.approvedBy } : {}) }; }
function findE7Module(context: mls.msg.ExecutionContext): string { const item = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e7-result'); const parsed = item?.type === 'result' ? parse(item.result) : null; return isRecord(parsed) ? text(parsed.moduleName) : ''; }
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> { const pipeline = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution4 pipeline not found for ${moduleName}.`); return pipeline; }
async function fail(moduleName: string, message: string): Promise<void> { if (!moduleName) return; try { const pipeline = await readNs4Pipeline(moduleName); if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E8Failed(pipeline, message)); } catch { /* trace is the fallback */ } }
function clarification(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, skeleton: Ns4E8SkeletonReview, title: string): mls.msg.AgentIntentAddStep { return addStep(context, parent, { type: 'clarification', stepId: 0, interaction: null, stepTitle: title.trim().replace(/^[👤🔎]\s*/u, ''), status: 'pending', nextSteps: [], json: JSON.stringify(skeleton), planning: { planId: `e8-skeleton-review-round-${skeleton.reviewRound}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' } } as mls.msg.AIClarificationStep); }
function result(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, saved: PersistedE8, title: string): mls.msg.AgentIntentAddStep { return addStep(context, parent, { type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [], result: JSON.stringify({ ...saved, completedStep: 'e8-workspaces', nextStep: 'e9-navigation-compiler' }, null, 2), planning: { planId: 'e8-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep); }
function findParent(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step?: mls.msg.AIAgentStep): mls.msg.AIAgentStep { return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parent, step); }
function promptReady(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, hookSequential: number, args: string, systemPrompt: string, humanPrompt: string, tool?: mls.msg.LLMTool): mls.msg.AgentIntentPromptReady { return { type: 'prompt_ready', args, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', hookSequential, parentStepId: parent.stepId, systemPrompt, humanPrompt, ...(tool ? { tools: [tool], toolChoice: { type: 'function', function: { name: tool.function.name } } } : {}) }; }
function addStep(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep { return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, step }; }
function status(context: mls.msg.ExecutionContext, parent: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, state: mls.msg.AIStepStatus, traceMsg?: string, cleaner?: 'input' | 'input_output'): mls.msg.AgentIntentUpdateStatus { return { type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, stepId: step.stepId, status: state, ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}) }; }
async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> { const response = await msgApplyIntents({ userId: context.message.senderId, intents }); if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E8 intents.'); const applied = response as mls.msg.ResponseApplyIntents; context.task = applied.task; if (applied.message) context.message = applied.message; }
function workspaceSelector(value: unknown): string { return typeof value === 'string' ? /^workspace:([a-z][A-Za-z0-9]*)$/.exec(value.trim())?.[1] || '' : ''; }
async function readNs4WorkspaceWorkerTool(): Promise<mls.msg.LLMTool> { const raw = await readNs4Text(ns4AgentFile('schemas', 'e8-workspace-detail-worker.schema', '.json'), true); const schema = parse(raw); if (!isRecord(schema)) throw new Error('Invalid E8 workspace worker tool schema.'); return createNs4FlexibleWorkerTool('submitNs4E8WorkspaceDetail', 'Submit one E8 workspace detail.', schema); }
async function readNs4E8PresentationTool(): Promise<mls.msg.LLMTool> { const raw = await readNs4Text(ns4AgentFile('schemas', 'e8-workspace.schema', '.json'), true); const schema = parse(raw); if (!isRecord(schema)) throw new Error('Invalid E8 presentation tool schema.'); const parameters = { ...schema }; delete parameters.$id; delete parameters.$schema; return { type: 'function', function: { name: 'submitNs4E8Presentation', description: 'Submit the E8 presentation and ambiguous URL-role decisions.', parameters } }; }
function unwrap(value: unknown): unknown { return unwrapNs4FlexibleWorkerPayload(value); }
function parse(value: unknown): unknown { if (typeof value !== 'string') return value; try { return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { return value; } }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function integer(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0; }
function memory(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function fast(context: mls.msg.ExecutionContext): boolean { return memory(context, 'fastMode') === 'true'; }
function formatGate(issues: Array<{ code: string; path: string; message: string }>): string { return issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
