import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution4/helpers/ns4StepTree.js';
import {
  isNs4Pipeline, markNs4E9Approved, markNs4E9Failed, markNs4E9Running, markNs4ModuleE9Approved,
  type Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { readNs4ApprovedJourneys, readNs4ApprovedOntology } from '/_102020_/l2/agentNewSolution4/helpers/ns4ApprovedArtifacts.js';
import {
  ns4AccessMatrixFile, ns4UseCaseFile, ns4UseCaseIndexFile, ns4WorkflowFile, ns4WorkflowIndexFile, ns4WorkspaceFile, ns4WorkspaceIndexFile,
  readNs4DefsJson, readNs4Module, readNs4Pipeline, writeNs4AccessMatrix, writeNs4BffContract, writeNs4Module,
  writeNs4NavigationIndex, writeNs4NavigationStore, writeNs4Notifications, writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import type { Ns4AccessMatrixArtifact } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import type {
  Ns4UseCaseArtifactV3, Ns4UseCaseIndexArtifactV3, Ns4WorkflowArtifactV2, Ns4WorkflowIndexArtifactV2, Ns4WorkflowIndexArtifactV3,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import type { Ns4WorkspaceArtifact, Ns4WorkspaceIndex } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import { compileNs4E9, type Ns4E9IssueOrigin, type Ns4E9Sources } from '/_102020_/l2/agentNewSolution4/steps/e9/contracts.js';
import { ns4E9FailureOrigin, validateNs4E9 } from '/_102020_/l2/agentNewSolution4/steps/e9/gate.js';

interface Ns4E9Args { planId: 'e9-navigation-compiler'; moduleName: string; }

export async function beforeNs4E9PromptStep(
  _agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number, args?: string,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = ''; let failureOrigin: Ns4E9IssueOrigin = 'skeleton';
  try {
    const parsed = resolveArgs(context, args || step.prompt); moduleName = parsed.moduleName;
    const pipeline = await requirePipeline(moduleName);
    if (pipeline.steps.e8?.status !== 'approved') throw new Error(`E9 requires an approved E8 workspace index for ${moduleName}.`);
    await writeNs4Pipeline(markNs4E9Running(pipeline));
    const sources = await loadSources(moduleName); const compilation = await compileNs4E9(sources);
    const gate = validateNs4E9(sources, compilation);
    if (!gate.ok) { failureOrigin = ns4E9FailureOrigin(gate.issues); throw new Error(formatGate(gate.issues)); }
    const artifactPaths: string[] = [];
    for (const contract of compilation.contracts) artifactPaths.push(await writeNs4BffContract(moduleName, contract));
    artifactPaths.push(await writeNs4NavigationIndex(moduleName, compilation.navigation));
    artifactPaths.push(await writeNs4NavigationStore(moduleName, compilation.store));
    artifactPaths.push(await writeNs4Notifications(moduleName, compilation.notifications));
    artifactPaths.push(await writeNs4AccessMatrix(moduleName, compilation.access));
    const module = await readNs4Module(moduleName); if (!module) throw new Error(`Module artifact not found for ${moduleName}.`);
    const approvedAt = new Date().toISOString();
    await writeNs4Module(moduleName, markNs4ModuleE9Approved(module, approvedAt));
    await writeNs4Pipeline(markNs4E9Approved(await requirePipeline(moduleName), artifactPaths, approvedAt));
    const mutationParent = resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parent, step);
    return [result(context, mutationParent, {
      moduleName, contractCount: compilation.contracts.length, routeCount: compilation.navigation.routes.length,
      notificationCount: compilation.notifications.entries.length, navigationHash: compilation.navigation.navigationHash,
      artifactPaths,
    }), status(context, mutationParent, step, hookSequential, 'completed',
      `E9 compiled ${compilation.navigation.routes.length} routes, ${compilation.contracts.length} BFF contracts and ${compilation.notifications.entries.length} notifications.`, 'input_output')];
  } catch (error) {
    const message = errorMessage(error); if (moduleName) await fail(moduleName, message, failureOrigin);
    return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')];
  }
}

export async function afterNs4E9PromptStep(
  _agent: IAgentMeta, context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep, hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const message = 'E9 is deterministic and must never receive an LLM response.';
  const parsed = resolveArgs(context, step.prompt); await fail(parsed.moduleName, message, 'compiler');
  return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')];
}

async function loadSources(moduleName: string): Promise<Ns4E9Sources> {
  const [journeys, ontology, access, workspaceIndex, useCaseIndex, workflowIndex] = await Promise.all([
    readNs4ApprovedJourneys(moduleName), readNs4ApprovedOntology(moduleName),
    readRequired<Ns4AccessMatrixArtifact>(ns4AccessMatrixFile(moduleName), 'access matrix'),
    readRequired<Ns4WorkspaceIndex>(ns4WorkspaceIndexFile(moduleName), 'workspace index'),
    readRequired<Ns4UseCaseIndexArtifactV3>(ns4UseCaseIndexFile(moduleName), 'use-case index'),
    readRequired<Ns4WorkflowIndexArtifactV2 | Ns4WorkflowIndexArtifactV3>(ns4WorkflowIndexFile(moduleName), 'workflow index'),
  ]);
  const [workspaces, useCases, workflows] = await Promise.all([
    Promise.all(workspaceIndex.workspaces.map(entry => readRequired<Ns4WorkspaceArtifact>(ns4WorkspaceFile(moduleName, entry.workspaceId), `workspace ${entry.workspaceId}`))),
    Promise.all(useCaseIndex.useCases.map(entry => readRequired<Ns4UseCaseArtifactV3>(ns4UseCaseFile(moduleName, entry.useCaseId), `use case ${entry.useCaseId}`))),
    Promise.all(workflowIndex.workflows.map(entry => readRequired<Ns4WorkflowArtifactV2>(ns4WorkflowFile(moduleName, entry.workflowId), `workflow ${entry.workflowId}`))),
  ]);
  return { journeys, access, ontology, useCases, workflows, workspaceIndex, workspaces };
}

async function readRequired<T>(file: Parameters<typeof readNs4DefsJson>[0], label: string): Promise<T> {
  let failure = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { const value = await readNs4DefsJson<T>(file, true); if (value) return value; }
    catch (error) { failure = errorMessage(error); }
  }
  throw new Error(`Unable to read approved ${label}: ${failure || 'invalid artifact'}`);
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E9Args {
  const root = parse(value); const moduleName = isRecord(root) && text(root.moduleName) ? text(root.moduleName) : findE8Module(context) || memory(context, 'resumeModule');
  if (!isRecord(root) || root.planId !== 'e9-navigation-compiler' || !moduleName) throw new Error('Invalid E9 step arguments or missing E8 module handoff.');
  return { planId: 'e9-navigation-compiler', moduleName };
}
function findE8Module(context: mls.msg.ExecutionContext): string {
  const anchor = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e8-result');
  const value = anchor?.type === 'result' ? parse(anchor.result) : null; return isRecord(value) ? text(value.moduleName) : '';
}
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> { const pipeline = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(pipeline)) throw new Error(`Current agentNewSolution4 pipeline not found for ${moduleName}.`); return pipeline; }
async function fail(moduleName: string, message: string, origin: Ns4E9IssueOrigin): Promise<void> { try { const pipeline = await readNs4Pipeline(moduleName); if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E9Failed(pipeline, message, origin)); } catch { /* task trace remains the fallback */ } }
function result(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, value: Record<string, unknown>): mls.msg.AgentIntentAddStep { return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, step: { type: 'result', stepId: 0, interaction: null, stepTitle: 'E9 navigation compiled', status: 'completed', nextSteps: [], result: JSON.stringify({ ...value, completedStep: 'e9-navigation-compiler', nextStep: 'e10-validation' }, null, 2), planning: { planId: 'e9-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep }; }
function status(context: mls.msg.ExecutionContext, parent: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, state: mls.msg.AIStepStatus, traceMsg: string, cleaner: 'input_output'): mls.msg.AgentIntentUpdateStatus { return { type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, stepId: step.stepId, status: state, traceMsg, cleaner }; }
function formatGate(issues: Array<{ code: string; path: string; message: string; origin: Ns4E9IssueOrigin }>): string { return issues.map(issue => `${issue.code} [${issue.origin}] ${issue.path}: ${issue.message}`).join('\n'); }
function parse(value: unknown): unknown { if (typeof value !== 'string') return value; try { return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { return value; } }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function memory(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
