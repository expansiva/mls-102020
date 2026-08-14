import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution4/helpers/ns4StepTree.js';
import {
  createNs4E8PresentationRepairStep, isNs4Pipeline, markNs4E8Approved, markNs4E8Failed, markNs4E8Running,
  markNs4ModuleE8Approved, Ns4ApprovedBy, Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { readNs4ApprovedAccess, readNs4ApprovedJourneys, readNs4ApprovedOntology } from '/_102020_/l2/agentNewSolution4/helpers/ns4ApprovedArtifacts.js';
import {
  ns4AgentFile, ns4WorkspaceModelFile, ns4E8ValidationReportFile, ns4JourneyIndexFile, ns4UseCaseFile, ns4UseCaseIndexFile, ns4WorkflowFile, ns4WorkflowIndexFile,
  readNs4AgentText, readNs4DefsJson, readNs4Module, readNs4Pipeline, readNs4Text,
  writeNs4WorkspaceModel, writeNs4E8ValidationReport, writeNs4Module, writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4JourneyIndex } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4UseCaseArtifactV3, Ns4UseCaseIndexArtifactV3, Ns4WorkflowArtifactV2, Ns4WorkflowIndexArtifactV2, Ns4WorkflowIndexArtifactV3 } from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type { Ns4E8Sources } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import type { Ns4E8Model, Ns4E8ModelWorkspace } from '/_102020_/l2/agentNewSolution4/steps/e8/model.js';
import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/tiers.js';
import {
  applyNs4HubComposition, defaultNs4HubComposition, normalizeNs4HubComposition,
  resolveNs4HubCompositionFindings, validateNs4HubComposition,
} from '/_102020_/l2/agentNewSolution4/steps/e8/hubComposition.js';
import { resolveNs4E8ModelFindings, validateNs4E8Model, type Ns4E8ModelIssue } from '/_102020_/l2/agentNewSolution4/steps/e8/modelGate.js';

interface Ns4E8Args { planId: 'e8-workspaces'; moduleName?: string; reviewRound?: number; adjustment?: string; approvedBy?: Ns4ApprovedBy; presentationAttempt?: number; gateFeedback?: string; }
interface PersistedE8 { moduleName: string; workspaceCount: number; artifactPaths: string[]; }
interface Ns4E8ValidationReport {
  schemaVersion: '2026-08-14-ns4-e8-validation-report-v2';
  moduleName: string;
  attempts: Array<{ round: number; checkedAt: string; workspaces: number; blocking: number; issues: Ns4E8ModelIssue[]; systemDecisions: Ns4SystemDecision[] }>;
  finalStatus: 'passed' | 'failed';
  updatedAt: string;
}

/**
 * E8 compiles every workspace of the module deterministically. The only LLM call left composes the
 * hub record page over a closed catalogue; a module without a dominant anchor makes no call at all.
 * Labels are not asked for: every title already arrives localized from an approved E2/E4 artifact.
 */
export async function beforeNs4E8PromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    if (pipeline.steps.e7?.status !== 'approved') throw new Error(`E7 approved pipeline not found for ${moduleName}.`);
    const round = parsed.reviewRound || pipeline.steps.e8?.reviewRound || 1;
    const sources = await loadSources(moduleName);
    const model = deriveNs4E8Model(sources, round);
    await writeNs4Pipeline(markNs4E8Running(pipeline, round, `l4/${moduleName}/workspace-model.defs.ts`));
    const hub = model.workspaces.find(workspace => workspace.tier === 'hub');
    if (!hub) return await approve(context, parent, step, hookSequential, model, sources, parsed.approvedBy || 'auto');
    return [await hubPrompt(context, parent, hookSequential, args || String(step.prompt || ''), model, hub, parsed)];
  } catch (error) {
    const message = errorMessage(error); await fail(moduleName, message);
    return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function afterNs4E8PromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    const round = parsed.reviewRound || pipeline.steps.e8?.reviewRound || 1;
    const sources = await loadSources(moduleName);
    const model = deriveNs4E8Model(sources, round);
    const hub = model.workspaces.find(workspace => workspace.tier === 'hub');
    if (!hub) return await approve(context, parent, step, hookSequential, model, sources, parsed.approvedBy || 'auto');

    const proposal = normalizeNs4HubComposition(unwrap(step.interaction?.payload?.[0]), hub.workspaceId, hub.title);
    const compositionGate = validateNs4HubComposition(hub.hubCatalogue!, proposal);
    if (!compositionGate.ok && (parsed.presentationAttempt || 0) < 1) {
      const mutationParent = findParent(context, parent, step);
      const repairPlanId = `e8-workspaces-presentation-repair-${round}-1`;
      const alreadyScheduled = getAllSteps(context.task?.iaCompressed?.nextSteps).some(item => item.planning?.planId === repairPlanId);
      return [...(alreadyScheduled ? [] : [addStep(context, mutationParent, createNs4E8PresentationRepairStep(moduleName, round, 1, formatGate(compositionGate.issues), pipeline.presentation.stepTitles['e8-workspaces']))]),
        status(context, mutationParent, step, hookSequential, 'completed', alreadyScheduled ? 'E8 hub composition repair was already scheduled; duplicate response ignored.' : 'E8 hub composition was invalid; one constrained repair was scheduled.', 'input_output')];
    }
    const decisions: Ns4SystemDecision[] = [];
    let composed: Ns4E8ModelWorkspace;
    if (compositionGate.ok) composed = applyNs4HubComposition(hub, proposal);
    else {
      // The bounded resolution: after its single repair the derived order wins, with the choice recorded.
      const resolution = resolveNs4HubCompositionFindings(hub, compositionGate.issues, model.userLanguage.toLowerCase().startsWith('pt'));
      composed = resolution.artifact; decisions.push(...resolution.systemDecisions);
    }
    const composedModel: Ns4E8Model = {
      ...model,
      workspaces: model.workspaces.map(workspace => workspace.workspaceId === composed.workspaceId ? composed : workspace),
      systemDecisions: [...model.systemDecisions, ...decisions],
    };
    return await approve(context, parent, step, hookSequential, composedModel, sources, parsed.approvedBy || 'auto');
  } catch (error) { const message = errorMessage(error); await fail(moduleName, message); return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')]; }
}

/** The model is gated, resolved, persisted and approved in one pass — there is no worker fan-out. */
async function approve(
  context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number,
  model: Ns4E8Model, sources: Ns4E8Sources, approvedBy: Ns4ApprovedBy,
): Promise<mls.msg.AgentIntent[]> {
  const gate = validateNs4E8Model(model, sources);
  const resolved = resolveNs4E8ModelFindings(model, gate.issues);
  const approvedModel: Ns4E8Model = { ...resolved.artifact, systemDecisions: uniqueDecisions([...resolved.artifact.systemDecisions, ...resolved.systemDecisions]) };
  // The report is persisted BEFORE any throw, so an irrecoverable model is auditable.
  const reportPath = await writeReport(model.moduleName, model.reviewRound, approvedModel, gate.issues, approvedModel.systemDecisions,
    resolved.unresolved.length ? 'failed' : 'passed');
  const modelPath = await writeNs4WorkspaceModel(model.moduleName, approvedModel);
  if (resolved.unresolved.length) throw new Error(`${formatGate(gate.issues.filter(issue => issue.severity !== 'warning'))}\nSee ${reportPath}.`);

  const approvedAt = new Date().toISOString();
  const artifactPaths = [modelPath, reportPath];
  const module = await readNs4Module(model.moduleName); if (!module) throw new Error(`Module artifact not found for ${model.moduleName}.`);
  await writeNs4Module(model.moduleName, markNs4ModuleE8Approved(module, approvedBy, approvedAt));
  await writeNs4Pipeline(markNs4E8Approved(await requirePipeline(model.moduleName), approvedBy, artifactPaths, approvedAt));
  const mutationParent = findParent(context, parent, step);
  return [
    result(context, mutationParent, { moduleName: model.moduleName, workspaceCount: approvedModel.workspaces.length, artifactPaths }, 'E8 workspaces approved'),
    status(context, mutationParent, step, hookSequential, 'completed', `E8 compiled ${approvedModel.workspaces.length} workspaces across ${countTiers(approvedModel)}.`, 'input_output'),
  ];
}

async function hubPrompt(
  context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, hookSequential: number, hookArgs: string,
  model: Ns4E8Model, hub: Ns4E8ModelWorkspace, args: Ns4E8Args & { moduleName: string },
): Promise<mls.msg.AgentIntentPromptReady> {
  const [prompt, tool] = await Promise.all([readNs4AgentText('steps/e8', 'promptHub'), readNs4HubCompositionTool()]);
  return promptReady(context, parent, hookSequential, hookArgs, prompt, [
    `## Closed hub catalogue; you may only order, promote, name and group it\n${JSON.stringify(hub.hubCatalogue)}`,
    `## The hub page\n${JSON.stringify({ workspaceId: hub.workspaceId, title: hub.title, purpose: hub.purpose, actors: hub.actors })}`,
    `## Default composition if you add nothing\n${JSON.stringify(defaultNs4HubComposition(hub))}`,
    `## Required identity\nmoduleName=${model.moduleName}; workspaceId=${hub.workspaceId}; userLanguage=${model.userLanguage}`,
    args.adjustment ? `## Human change request\n${args.adjustment}` : '',
    args.gateFeedback ? `## Previous response failed validation; repair every item\n${args.gateFeedback}` : '',
  ].filter(Boolean).join('\n\n'), tool);
}

async function writeReport(
  moduleName: string, round: number, model: Ns4E8Model, issues: Ns4E8ModelIssue[], systemDecisions: Ns4SystemDecision[],
  finalStatus: Ns4E8ValidationReport['finalStatus'],
): Promise<string> {
  const now = new Date().toISOString();
  return writeNs4E8ValidationReport(moduleName, {
    schemaVersion: '2026-08-14-ns4-e8-validation-report-v2', moduleName,
    attempts: [{ round, checkedAt: now, workspaces: model.workspaces.length, blocking: issues.filter(issue => issue.severity !== 'warning').length, issues, systemDecisions }],
    finalStatus, updatedAt: now,
  } as unknown as Parameters<typeof writeNs4E8ValidationReport>[1]);
}

function countTiers(model: Ns4E8Model): string {
  const byTier = new Map<string, number>();
  model.workspaces.forEach(workspace => byTier.set(workspace.tier, (byTier.get(workspace.tier) || 0) + 1));
  return [...byTier.entries()].sort().map(([tier, count]) => `${count} ${tier}`).join(', ');
}
function uniqueDecisions(decisions: Ns4SystemDecision[]): Ns4SystemDecision[] {
  return [...new Map(decisions.map(decision => [decision.decisionId, decision])).values()];
}
async function loadSources(moduleName: string): Promise<Ns4E8Sources> { const [journeys, access, ontology, journeyIndex, useCaseIndex, workflowIndex] = await Promise.all([readNs4ApprovedJourneys(moduleName), readNs4ApprovedAccess(moduleName), readNs4ApprovedOntology(moduleName), readNs4DefsJson<Ns4JourneyIndex>(ns4JourneyIndexFile(moduleName), true), readNs4DefsJson<Ns4UseCaseIndexArtifactV3>(ns4UseCaseIndexFile(moduleName), true), readNs4DefsJson<Ns4WorkflowIndexArtifactV2 | Ns4WorkflowIndexArtifactV3>(ns4WorkflowIndexFile(moduleName), true)]); if (!journeyIndex || !useCaseIndex || !workflowIndex) throw new Error(`Approved E7 artifacts not found for ${moduleName}.`); const [useCases, workflows] = await Promise.all([Promise.all(useCaseIndex.useCases.map(entry => readNs4DefsJson<Ns4UseCaseArtifactV3>(ns4UseCaseFile(moduleName, entry.useCaseId), true))), Promise.all(workflowIndex.workflows.map(entry => readNs4DefsJson<Ns4WorkflowArtifactV2>(ns4WorkflowFile(moduleName, entry.workflowId), true)))]); if (useCases.some(item => !item) || workflows.some(item => !item)) throw new Error(`Incomplete E7 artifacts for ${moduleName}.`); return { journeys, access, ontology, useCases: useCases as Ns4UseCaseArtifactV3[], workflows: workflows as Ns4WorkflowArtifactV2[], policyDecisionSelections: journeyIndex.policyDecisionSelections || [] }; }
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E8Args & { moduleName: string; approvedBy?: Ns4ApprovedBy } { const root = parse(value); if (!isRecord(root) || root.planId !== 'e8-workspaces') throw new Error('Invalid E8 step arguments.'); const moduleName = text(root.moduleName) || findE7Module(context) || memory(context, 'resumeModule'); if (!moduleName) throw new Error('E7 module result not found for E8.'); return { planId: 'e8-workspaces', moduleName, ...(integer(root.reviewRound) ? { reviewRound: integer(root.reviewRound) } : {}), ...(text(root.adjustment) ? { adjustment: text(root.adjustment) } : {}), ...(integer(root.presentationAttempt) ? { presentationAttempt: integer(root.presentationAttempt) } : {}), ...(text(root.gateFeedback) ? { gateFeedback: text(root.gateFeedback) } : {}), ...(root.approvedBy === 'auto' || root.approvedBy === 'human' ? { approvedBy: root.approvedBy } : {}) }; }
function findE7Module(context: mls.msg.ExecutionContext): string { const item = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e7-result'); const parsed = item?.type === 'result' ? parse(item.result) : null; return isRecord(parsed) ? text(parsed.moduleName) : ''; }
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> { const pipeline = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution4 pipeline not found for ${moduleName}.`); return pipeline; }
async function fail(moduleName: string, message: string): Promise<void> { if (!moduleName) return; try { const pipeline = await readNs4Pipeline(moduleName); if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E8Failed(pipeline, message)); } catch { /* trace is the fallback */ } }
function result(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, saved: PersistedE8, title: string): mls.msg.AgentIntentAddStep { return addStep(context, parent, { type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [], result: JSON.stringify({ ...saved, completedStep: 'e8-workspaces', nextStep: 'e9-navigation-compiler' }, null, 2), planning: { planId: 'e8-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep); }
function findParent(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step?: mls.msg.AIAgentStep): mls.msg.AIAgentStep { return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parent, step); }
function promptReady(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, hookSequential: number, args: string, systemPrompt: string, humanPrompt: string, tool?: mls.msg.LLMTool): mls.msg.AgentIntentPromptReady { return { type: 'prompt_ready', args, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', hookSequential, parentStepId: parent.stepId, systemPrompt, humanPrompt, ...(tool ? { tools: [tool], toolChoice: { type: 'function', function: { name: tool.function.name } } } : {}) }; }
function addStep(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep { return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, step }; }
function status(context: mls.msg.ExecutionContext, parent: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, state: mls.msg.AIStepStatus, traceMsg?: string, cleaner?: 'input' | 'input_output'): mls.msg.AgentIntentUpdateStatus { return { type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, stepId: step.stepId, status: state, ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}) }; }
async function readNs4HubCompositionTool(): Promise<mls.msg.LLMTool> { const raw = await readNs4Text(ns4AgentFile('schemas', 'e8-hub-composition.schema', '.json'), true); const schema = parse(raw); if (!isRecord(schema)) throw new Error('Invalid E8 hub composition tool schema.'); const parameters = { ...schema }; delete parameters.$id; delete parameters.$schema; return { type: 'function', function: { name: 'submitNs4E8HubComposition', description: 'Submit the composition of the hub record page over its closed catalogue.', parameters } }; }
function unwrap(value: unknown): unknown { return value && typeof value === 'object' && 'result' in (value as Record<string, unknown>) ? (value as Record<string, unknown>).result : value; }
function parse(value: unknown): unknown { if (typeof value !== 'string') return value; try { return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { return value; } }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function integer(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0; }
function memory(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function formatGate(issues: Array<{ code: string; path: string; message: string }>): string { return issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
