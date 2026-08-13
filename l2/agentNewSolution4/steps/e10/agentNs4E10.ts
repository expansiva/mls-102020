import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution4/helpers/ns4StepTree.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution4/helpers/ns4Clarification.js';
import {
  isNs4Pipeline, markNs4E10Approved, markNs4E10Failed, markNs4E10Running, markNs4E10RuntimeFailed,
  markNs4E10WaitingHuman, markNs4ModuleE10Approved, type Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { readNs4ApprovedJourneys, readNs4ApprovedOntology } from '/_102020_/l2/agentNewSolution4/helpers/ns4ApprovedArtifacts.js';
import {
  ns4AccessMatrixFile, ns4BffContractFile, ns4E10ValidationReportFile, ns4JourneyIndexFile, ns4NavigationIndexFile,
  ns4NavigationStoreFile, ns4NotificationsFile, ns4OntologyIndexFile, ns4RulesFile, ns4UseCaseFile, ns4UseCaseIndexFile,
  ns4WorkflowFile, ns4WorkflowIndexFile, ns4WorkspaceFile, ns4WorkspaceIndexFile, readNs4DefsJson, readNs4L5Config,
  readNs4Module, readNs4Pipeline, writeNs4E10ValidationReport, writeNs4L5Config, writeNs4Module, writeNs4Pipeline,
  readNs4Text, writeNs4Process, writeNs4TodoBackend, writeNs4TodoFrontend,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import type { Ns4JourneyIndex } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4AccessMatrixArtifactV4 } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type { Ns4OntologyIndexArtifact } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import type {
  Ns4UseCaseArtifactV3, Ns4UseCaseIndexArtifactV3, Ns4WorkflowArtifactV2, Ns4WorkflowIndexArtifactV2, Ns4WorkflowIndexArtifactV3,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type { Ns4WorkspaceArtifact, Ns4WorkspaceIndex } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import {
  compileNs4E9, type Ns4BffContractArtifact, type Ns4NavigationIndexArtifact, type Ns4NavigationStoreArtifact,
  type Ns4NotificationCatalogArtifact,
} from '/_102020_/l2/agentNewSolution4/steps/e9/contracts.js';
import { compileNs4E10Delivery, type Ns4E10ReviewEvent, type Ns4E10Sources, type Ns4E10ValidationReport } from '/_102020_/l2/agentNewSolution4/steps/e10/contracts.js';
import { validateNs4E10 } from '/_102020_/l2/agentNewSolution4/steps/e10/gate.js';

interface Ns4E10Args { planId: 'e10-validation'; moduleName: string; }

export async function beforeNs4E10PromptStep(
  _agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args?: string,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = ''; let reportPath = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    if (pipeline.steps.e9?.status !== 'approved') throw new Error(`E10 requires approved E9 artifacts for ${moduleName}.`);
    await writeNs4Pipeline(markNs4E10Running(pipeline));
    const sources = await loadSources(moduleName); const report = await validateNs4E10(sources);
    reportPath = await writeNs4E10ValidationReport(moduleName, report);
    if (report.finalStatus !== 'passed') {
      const message = formatErrors(report);
      await writeNs4Pipeline(markNs4E10Failed(await requirePipeline(moduleName), message, report.repairStep || 'e8-workspaces', reportPath));
      return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')];
    }
    const delivery = await compileNs4E10Delivery(sources, report, await readNs4L5Config(), mls.actualProject || 0);
    const artifactPaths = [reportPath];
    artifactPaths.push(await writeNs4TodoFrontend(moduleName, delivery.todoFrontend));
    artifactPaths.push(await writeNs4TodoBackend(moduleName, delivery.todoBackend));
    artifactPaths.push(await writeNs4Process(moduleName, delivery.process));
    artifactPaths.push(await writeNs4L5Config(delivery.config));
    await writeNs4Pipeline(markNs4E10WaitingHuman(await requirePipeline(moduleName), reportPath, artifactPaths));
    const mutationParent = mutableParent(context, parent, step);
    return [clarification(context, mutationParent, moduleName, pipeline.presentation.stepTitles['e10-validation']),
      status(context, mutationParent, step, hookSequential, 'completed', `E10 validation passed; ${artifactPaths.length - 1} L5 delivery artifacts are ready for final approval.`, 'input_output')];
  } catch (error) {
    const message = errorMessage(error); if (moduleName) await runtimeFail(moduleName, message, reportPath);
    return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function afterNs4E10PromptStep(
  _agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const message = 'E10 is deterministic and must never receive an LLM response.';
  try { const parsed = resolveArgs(context, step.prompt); await runtimeFail(parsed.moduleName, message); } catch { /* trace is authoritative */ }
  return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')];
}

export async function beforeNs4E10ClarificationStep(
  agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep, hookSequential: number, json: unknown,
): Promise<HTMLElement> {
  const root = parse(json); const moduleName = isRecord(root) ? text(root.moduleName) : '';
  if (!moduleName) throw new Error('E10 final review is missing moduleName.');
  const report = await readJsonRequired<Ns4E10ValidationReport>(ns4E10ValidationReportFile(moduleName), 'E10 validation report');
  if (report.finalStatus !== 'passed') throw new Error(`E10 final review cannot open with report status ${report.finalStatus}.`);
  await import('/_102020_/l2/agentNewSolution4/widgets/widgetNs4Final.js');
  const element = document.createElement('widget-ns4-final-102020');
  const widget = element as unknown as { value: Ns4E10ValidationReport; setSubmitting(value: boolean): void }; widget.value = report;
  element.addEventListener('ns4-final-review', (event: Event) => { void applyReview(context, parent, step, hookSequential,
    (event as CustomEvent<Ns4E10ReviewEvent>).detail).catch(error => { widget.setSubmitting(false); showNs4ClarificationError(element, error); console.error(`[${agent.agentName}] ${errorMessage(error)}`); }); });
  return element;
}

async function applyReview(
  context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep,
  hookSequential: number, event: Ns4E10ReviewEvent,
): Promise<void> {
  const moduleName = event.moduleName; const pipeline = await requirePipeline(moduleName); const mutationParent = mutableParent(context, parent);
  if (event.action === 'approve') {
    if (pipeline.steps.e10?.status !== 'approved') {
      const module = await readNs4Module(moduleName); if (!module) throw new Error(`Module artifact not found for ${moduleName}.`);
      const approvedAt = new Date().toISOString();
      await writeNs4Module(moduleName, markNs4ModuleE10Approved(module, 'human', approvedAt));
      await writeNs4Pipeline(markNs4E10Approved(await requirePipeline(moduleName), 'human', approvedAt));
    }
    const already = getAllSteps(context.task?.iaCompressed?.nextSteps).some(item => item.planning?.planId === 'e10-result');
    await applyIntents(context, [...(already ? [] : [result(context, mutationParent, moduleName)]),
      status(context, mutationParent, step, hookSequential, 'completed', already ? 'Final approval was already recorded.' : 'Finished solution approved.', 'input_output')]);
  } else {
    if (!event.repairStep) throw new Error('Select the owning stage to reopen.');
    if (!event.adjustment.trim()) throw new Error('Describe the reason for reopening the selected stage.');
    const reportPath = pipeline.steps.e10?.reportPath || `l4/${moduleName}/pipeline/e10-validation-report.json`;
    await writeNs4Pipeline(markNs4E10Failed(pipeline, event.adjustment, event.repairStep, reportPath));
    await applyIntents(context, [reopenResult(context, mutationParent, moduleName, event.repairStep, event.adjustment),
      status(context, mutationParent, step, hookSequential, 'completed', `Final review reopened ${event.repairStep}.`, 'input_output')]);
  }
  await continuePoolingTask(context);
}

async function loadSources(moduleName: string): Promise<Ns4E10Sources> {
  const [journeys, ontology, journeyIndex, access, ontologyIndex, rules, useCaseIndex, workflowIndex, workspaceIndex, navigation, store, notifications] = await Promise.all([
    readNs4ApprovedJourneys(moduleName), readNs4ApprovedOntology(moduleName), readRequired<Ns4JourneyIndex>(ns4JourneyIndexFile(moduleName), 'journey index'),
    readRequired<Ns4AccessMatrixArtifactV4>(ns4AccessMatrixFile(moduleName), 'E9 realized access matrix'),
    readRequired<Ns4OntologyIndexArtifact>(ns4OntologyIndexFile(moduleName), 'ontology index'), readRequired<Ns4RulesArtifact>(ns4RulesFile(moduleName), 'rules'),
    readRequired<Ns4UseCaseIndexArtifactV3>(ns4UseCaseIndexFile(moduleName), 'use-case index'),
    readRequired<Ns4WorkflowIndexArtifactV2 | Ns4WorkflowIndexArtifactV3>(ns4WorkflowIndexFile(moduleName), 'workflow index'),
    readRequired<Ns4WorkspaceIndex>(ns4WorkspaceIndexFile(moduleName), 'workspace index'),
    readRequired<Ns4NavigationIndexArtifact>(ns4NavigationIndexFile(moduleName), 'navigation index'),
    readRequired<Ns4NavigationStoreArtifact>(ns4NavigationStoreFile(moduleName), 'navigation store'),
    readRequired<Ns4NotificationCatalogArtifact>(ns4NotificationsFile(moduleName), 'notification catalog'),
  ]);
  const [workspaces, useCases, workflows] = await Promise.all([
    Promise.all(workspaceIndex.workspaces.map(entry => readRequired<Ns4WorkspaceArtifact>(ns4WorkspaceFile(moduleName, entry.workspaceId), `workspace ${entry.workspaceId}`))),
    Promise.all(useCaseIndex.useCases.map(entry => readRequired<Ns4UseCaseArtifactV3>(ns4UseCaseFile(moduleName, entry.useCaseId), `use case ${entry.useCaseId}`))),
    Promise.all(workflowIndex.workflows.map(entry => readRequired<Ns4WorkflowArtifactV2>(ns4WorkflowFile(moduleName, entry.workflowId), `workflow ${entry.workflowId}`))),
  ]);
  const base = { journeys, access, ontology, useCases, workflows, workspaceIndex, workspaces };
  const expected = await compileNs4E9(base);
  const contracts = await Promise.all(expected.contracts.map(contract => readRequired<Ns4BffContractArtifact>(
    ns4BffContractFile(moduleName, contract.workspaceId, contract.functionId), `BFF contract ${contract.operationRef}`)));
  return { ...base, journeyIndex, ontologyIndex, rules, useCaseIndex, workflowIndex, navigation, store, notifications, contracts };
}

async function readRequired<T>(file: Parameters<typeof readNs4DefsJson>[0], label: string): Promise<T> {
  let failure = ''; for (let attempt = 0; attempt < 2; attempt += 1) try { const value = await readNs4DefsJson<T>(file, true); if (value) return value; } catch (error) { failure = errorMessage(error); }
  throw new Error(`Unable to read approved ${label}: ${failure || 'invalid artifact'}`);
}
async function readJsonRequired<T>(file: Parameters<typeof readNs4Text>[0], label: string): Promise<T> {
  let failure = ''; for (let attempt = 0; attempt < 2; attempt += 1) try { const raw = await readNs4Text(file, true); const value = JSON.parse(raw); if (value) return value as T; } catch (error) { failure = errorMessage(error); }
  throw new Error(`Unable to read approved ${label}: ${failure || 'invalid artifact'}`);
}
function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E10Args {
  const root = parse(value); const moduleName = isRecord(root) && text(root.moduleName) ? text(root.moduleName) : findE9Module(context) || memory(context, 'resumeModule');
  if (!isRecord(root) || root.planId !== 'e10-validation' || !moduleName) throw new Error('Invalid E10 step arguments or missing E9 module handoff.');
  return { planId: 'e10-validation', moduleName };
}
function findE9Module(context: mls.msg.ExecutionContext): string { const anchor = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e9-result'); const value = anchor?.type === 'result' ? parse(anchor.result) : null; return isRecord(value) ? text(value.moduleName) : ''; }
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> { const pipeline = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution4 v32 pipeline not found for ${moduleName}.`); return pipeline; }
async function runtimeFail(moduleName: string, message: string, reportPath = ''): Promise<void> { try { const pipeline = await readNs4Pipeline(moduleName); if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E10RuntimeFailed(pipeline, message, reportPath || undefined)); } catch { /* task trace remains fallback */ } }
function clarification(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, moduleName: string, title: string): mls.msg.AgentIntentAddStep { return addStep(context, parent, { type: 'clarification', stepId: 0, interaction: null, stepTitle: title.trim().replace(/^[👤🔎]\s*/u, ''), status: 'pending', nextSteps: [], json: JSON.stringify({ planId: 'e10-final-review', moduleName }), planning: { planId: 'e10-final-review', dependsOn: [], executionMode: 'sequential', executionHost: 'client' } } as mls.msg.AIClarificationStep); }
function result(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, moduleName: string): mls.msg.AgentIntentAddStep { return addStep(context, parent, { type: 'result', stepId: 0, interaction: null, stepTitle: 'Finished solution approved', status: 'completed', nextSteps: [], result: JSON.stringify({ moduleName, completedStep: 'e10-validation', nextStep: 'complete', approved: true }, null, 2), planning: { planId: 'e10-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep); }
function reopenResult(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, moduleName: string, repairStep: string, adjustment: string): mls.msg.AgentIntentAddStep { return addStep(context, parent, { type: 'result', stepId: 0, interaction: null, stepTitle: `Reopen ${repairStep}`, status: 'completed', nextSteps: [], result: JSON.stringify({ moduleName, repairStep, adjustment, approved: false }, null, 2), planning: { planId: `e10-reopen-${repairStep}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep); }
function addStep(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep { return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, step }; }
function status(context: mls.msg.ExecutionContext, parent: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, state: mls.msg.AIStepStatus, traceMsg: string, cleaner: 'input_output'): mls.msg.AgentIntentUpdateStatus { return { type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, stepId: step.stepId, status: state, traceMsg, cleaner }; }
async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> { const response = await msgApplyIntents({ userId: context.message.senderId, intents }); if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E10 intents.'); const applied = response as mls.msg.ResponseApplyIntents; context.task = applied.task; if (applied.message) context.message = applied.message; }
function mutableParent(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step?: mls.msg.AIAgentStep): mls.msg.AIAgentStep { return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parent, step); }
function formatErrors(report: Ns4E10ValidationReport): string { return report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'); }
function parse(value: unknown): unknown { if (typeof value !== 'string') return value; try { return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { return value; } }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function memory(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
