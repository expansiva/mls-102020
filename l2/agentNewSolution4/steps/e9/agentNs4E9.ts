import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution4/helpers/ns4StepTree.js';
import {
  isNs4Pipeline, markNs4E9Approved, markNs4E9Failed, markNs4E9Running, markNs4ModuleE9Approved,
  type Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { readNs4ApprovedJourneys, readNs4ApprovedOntology } from '/_102020_/l2/agentNewSolution4/helpers/ns4ApprovedArtifacts.js';
import {
  ns4WorkspaceModelFile, readNs4DefsJson, readNs4Module, readNs4Pipeline, readNs4Text, writeNs4ClassicContract, writeNs4ClassicWorkspace,
  writeNs4Module, writeNs4Operation, writeNs4Pipeline, writeNs4SiteMap,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import { readNs4ApprovedOntology as readOntology } from '/_102020_/l2/agentNewSolution4/helpers/ns4ApprovedArtifacts.js';
import type { Ns4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/model.js';
import { compileNs4ClassicL4 } from '/_102020_/l2/agentNewSolution4/steps/e9/classic.js';
/** E9 is a transpiler: a failure is either the approved model or the emission itself. */
type Ns4E9IssueOrigin = 'skeleton' | 'compiler';

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
    // E9 takes no screen decision: it transposes the approved E8 model into the classic L4 format.
    const [model, ontology] = await Promise.all([readApprovedModel(moduleName), readOntology(moduleName)]);
    const l4 = await compileNs4ClassicL4(model, ontology);
    const artifactPaths: string[] = [];
    for (const workspace of l4.workspaces) artifactPaths.push(await writeNs4ClassicWorkspace(moduleName, workspace.workspaceId, workspace));
    for (const operation of l4.operations) artifactPaths.push(await writeNs4Operation(moduleName, operation.operationId, operation));
    for (const contract of l4.contracts) artifactPaths.push(await writeNs4ClassicContract(moduleName, contract.workspaceId, contract.bffId, contract.source));
    artifactPaths.push(await writeNs4SiteMap(moduleName, l4.siteMap));
    const module = await readNs4Module(moduleName); if (!module) throw new Error(`Module artifact not found for ${moduleName}.`);
    const approvedAt = new Date().toISOString();
    await writeNs4Module(moduleName, markNs4ModuleE9Approved(module, approvedAt));
    await writeNs4Pipeline(markNs4E9Approved(await requirePipeline(moduleName), artifactPaths, approvedAt));
    const mutationParent = resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parent, step);
    return [result(context, mutationParent, {
      moduleName, workspaceCount: l4.workspaces.length, operationCount: l4.operations.length,
      contractCount: l4.contracts.length, artifactPaths,
    }), status(context, mutationParent, step, hookSequential, 'completed',
      `E9 emitted ${l4.workspaces.length} workspaces, ${l4.operations.length} operations and ${l4.contracts.length} contracts.`, 'input_output')];
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

async function readApprovedModel(moduleName: string): Promise<Ns4E8Model> {
  const parsed = await readNs4DefsJson<Ns4E8Model>(ns4WorkspaceModelFile(moduleName), true);
  if (!parsed || parsed.planId !== 'e8-workspace-model' || parsed.moduleName !== moduleName) {
    throw new Error(`Approved E8 workspace model not found for ${moduleName}.`);
  }
  return parsed;
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
