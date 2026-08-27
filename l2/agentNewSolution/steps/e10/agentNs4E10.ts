import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution/helpers/ns4StepTree.js';
import {
  isNs4Pipeline, markNs4E10Approved, markNs4E10Failed, markNs4E10PipelineDefect, markNs4E10Running, markNs4E10RuntimeFailed,
  markNs4ModuleE10Approved, type Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import { readNs4ApprovedJourneys, readNs4ApprovedOntology } from '/_102020_/l2/agentNewSolution/helpers/ns4ApprovedArtifacts.js';
import {
  ns4ClassicContractFile, ns4WorkspaceModelFile, ns4OperationFile, ns4SiteMapFile, readNs4Text,
  ns4AccessMatrixFile, ns4JourneyIndexFile, ns4OntologyIndexFile, ns4RulesFile, ns4UseCaseFile, ns4UseCaseIndexFile,
  ns4WorkflowFile, ns4WorkflowIndexFile, ns4WorkspaceFile, readNs4DefsJson, readNs4L5Config,
  readNs4Module, readNs4Pipeline, writeNs4E10ValidationReport, writeNs4L5Config, writeNs4Module, writeNs4Pipeline,
  writeNs4Process, writeNs4TodoBackend, writeNs4TodoFrontend,
  readNs4L5Project, writeNs4L5Project,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Fs.js';
import {
  applyPlatformBlockDefaults, buildProjectsBlock, buildWorkspaceDependencies,
  collectProjectJsonIssues, collectPublishableConfigIssues, ensureProjectAppEnv, ensureProjectType,
  readProjectTypeFromProjectJson,
} from '/_102020_/l2/agentNewSolution/steps/e10/publishable.js';
import type { Ns4JourneyIndex } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import type { Ns4AccessMatrixArtifact } from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import type { Ns4OntologyIndexArtifact } from '/_102020_/l2/agentNewSolution/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution/steps/e5/contracts.js';
import type {
  Ns4UseCaseArtifactV3, Ns4UseCaseIndexArtifactV3, Ns4WorkflowArtifactV2, Ns4WorkflowIndexArtifactV2, Ns4WorkflowIndexArtifactV3,
} from '/_102020_/l2/agentNewSolution/steps/e7/contracts.js';
import type { Ns4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/model.js';
import type { Ns4ClassicOperation, Ns4ClassicSiteMap, Ns4ClassicWorkspace } from '/_102020_/l2/agentNewSolution/steps/e9/classic.js';
import { compileNs4E10Delivery, type Ns4E10Sources, type Ns4E10ValidationReport } from '/_102020_/l2/agentNewSolution/steps/e10/contracts.js';
import { validateNs4E10 } from '/_102020_/l2/agentNewSolution/steps/e10/gate.js';
import { agentBuildTrace } from '/_102020_/l2/agentNewSolution/helpers/ns4BuildStamp.js';

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
      const failed = await requirePipeline(moduleName);
      await writeNs4Pipeline(report.pipelineDefect
        ? markNs4E10PipelineDefect(failed, message, reportPath)
        : markNs4E10Failed(failed, message, report.repairStep || 'e8-workspaces', reportPath));
      return [status(context, parent, step, hookSequential, 'failed', message, 'input_output')];
    }
    const delivery = await compileNs4E10Delivery(sources, report, await readNs4L5Config(), mls.actualProject || 0);
    const artifactPaths = [reportPath];
    artifactPaths.push(await writeNs4TodoFrontend(moduleName, delivery.todoFrontend));
    artifactPaths.push(await writeNs4TodoBackend(moduleName, delivery.todoBackend));
    artifactPaths.push(await writeNs4Process(moduleName, delivery.process));

    // THE PUBLISHABLE l5. Everything below is derived or validated — never invented: the blocks that were
    // typed in by hand the first time a module went live (dependencies, projects, the platform blocks)
    // are exactly what is filled or NAMED here, at delivery time, instead of failing later inside the
    // publish with nothing pointing at the cause.
    const projectId = mls.actualProject || 0;
    const dependencies = mls.l5.getProjectDependencies(projectId, false);
    const publishIssues: string[] = [];
    const config = { ...delivery.config };
    config.workspaceDependencies = buildWorkspaceDependencies(dependencies);
    const projectsBlock = buildProjectsBlock(config.projects, projectId, dependencies, await collectProjectTypes(projectId, dependencies));
    config.projects = projectsBlock.projects;
    publishIssues.push(...projectsBlock.issues);
    if (!config.defaultProjectId) config.defaultProjectId = String(projectId);
    const withBlocks = applyPlatformBlockDefaults(config);
    publishIssues.push(...withBlocks.issues);
    artifactPaths.push(await writeNs4L5Config(withBlocks.config));
    publishIssues.push(...collectPublishableConfigIssues(withBlocks.config, moduleName, dependencies));

    // l5/project.json belongs to the STUDIO/organization: E10 never rewrites it, it only adds the appEnv
    // when the field does not exist (a project already moved to homologation keeps it).
    const projectJson = await readNs4L5Project();
    publishIssues.push(...collectProjectJsonIssues(projectJson, moduleName));
    const withAppEnv = ensureProjectAppEnv(projectJson);
    const withType = ensureProjectType(withAppEnv.projectJson, 'client');
    if ((withAppEnv.changed || withType.changed) && projectJson) artifactPaths.push(await writeNs4L5Project(withType.projectJson));

    const module = await readNs4Module(moduleName); if (!module) throw new Error(`Module artifact not found for ${moduleName}.`);
    const approvedAt = new Date().toISOString();
    await writeNs4Module(moduleName, markNs4ModuleE10Approved(module, 'auto', approvedAt));
    await writeNs4Pipeline(markNs4E10Approved(await requirePipeline(moduleName), 'auto', approvedAt, reportPath, artifactPaths));
    const mutationParent = mutableParent(context, parent, step);
    const already = getAllSteps(context.task?.iaCompressed?.nextSteps).some(item => item.planning?.planId === 'e10-result');
    return [...(already ? [] : [result(context, mutationParent, moduleName)]),
      status(context, mutationParent, step, hookSequential, 'completed', already
        ? 'E10 automatic completion was already recorded.'
        : `E10 validation passed; ${artifactPaths.length - 1} L5 delivery artifacts were written and the solution was completed automatically.${
          publishIssues.length ? ` PUBLISH CHECKLIST (${publishIssues.length}): ${publishIssues.slice(0, 8).join('; ')}` : ' Publish checklist clean.'
        }${await agentBuildTrace('[agentNs4E10]')}`, 'input_output')];
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

async function loadSources(moduleName: string): Promise<Ns4E10Sources> {
  const [journeys, ontology, journeyIndex, access, ontologyIndex, rules, useCaseIndex, workflowIndex, model] = await Promise.all([
    readNs4ApprovedJourneys(moduleName), readNs4ApprovedOntology(moduleName), readRequired<Ns4JourneyIndex>(ns4JourneyIndexFile(moduleName), 'journey index'),
    readRequired<Ns4AccessMatrixArtifact>(ns4AccessMatrixFile(moduleName), 'access matrix'),
    readRequired<Ns4OntologyIndexArtifact>(ns4OntologyIndexFile(moduleName), 'ontology index'), readRequired<Ns4RulesArtifact>(ns4RulesFile(moduleName), 'rules'),
    readRequired<Ns4UseCaseIndexArtifactV3>(ns4UseCaseIndexFile(moduleName), 'use-case index'),
    readRequired<Ns4WorkflowIndexArtifactV2 | Ns4WorkflowIndexArtifactV3>(ns4WorkflowIndexFile(moduleName), 'workflow index'),
    readApprovedModel(moduleName),
  ]);
  const [useCases, workflows] = await Promise.all([
    Promise.all(useCaseIndex.useCases.map(entry => readRequired<Ns4UseCaseArtifactV3>(ns4UseCaseFile(moduleName, entry.useCaseId), `use case ${entry.useCaseId}`))),
    Promise.all(workflowIndex.workflows.map(entry => readRequired<Ns4WorkflowArtifactV2>(ns4WorkflowFile(moduleName, entry.workflowId), `workflow ${entry.workflowId}`))),
  ]);
  // What E9 actually wrote, read back from L4: the staleness check compares it to a fresh compilation.
  const saved = {
    workspaces: await Promise.all(model.workspaces.map(workspace => readRequired<Ns4ClassicWorkspace>(ns4WorkspaceFile(moduleName, workspace.workspaceId), `workspace ${workspace.workspaceId}`))),
    operations: await Promise.all(model.operations.map(operation => readRequired<Ns4ClassicOperation>(ns4OperationFile(moduleName, operation.operationId), `operation ${operation.operationId}`))),
    contracts: await Promise.all(model.workspaces.flatMap(workspace => workspace.bffCalls.map(async call => ({
      workspaceId: workspace.workspaceId, bffId: call.bffId, route: `${moduleName}.${workspace.workspaceId}.${call.bffId}`,
      source: await readRequiredText(ns4ClassicContractFile(moduleName, workspace.workspaceId, call.bffId), `contract ${workspace.workspaceId}--${call.bffId}`),
    })))),
    siteMap: await readRequired<Ns4ClassicSiteMap>(ns4SiteMapFile(moduleName), 'site map'),
  };
  return {
    moduleName, userLanguage: model.userLanguage, journeys, journeyIndex, ontology, ontologyIndex, rules, access,
    useCases, useCaseIndex, workflows, workflowIndex, model, saved,
  };
}

async function readApprovedModel(moduleName: string): Promise<Ns4E8Model> {
  const parsed = await readNs4DefsJson<Ns4E8Model>(ns4WorkspaceModelFile(moduleName), true);
  if (!parsed || parsed.planId !== 'e8-workspace-model' || parsed.moduleName !== moduleName) {
    throw new Error(`Approved E8 workspace model not found for ${moduleName}.`);
  }
  return parsed;
}

async function readRequiredText(file: Parameters<typeof readNs4Text>[0], label: string): Promise<string> {
  const raw = await readNs4Text(file, true);
  if (typeof raw !== 'string' || !raw.trim()) throw new Error(`Unable to read approved ${label}.`);
  return raw;
}

async function readRequired<T>(file: Parameters<typeof readNs4DefsJson>[0], label: string): Promise<T> {
  let failure = ''; for (let attempt = 0; attempt < 2; attempt += 1) try { const value = await readNs4DefsJson<T>(file, true); if (value) return value; } catch (error) { failure = errorMessage(error); }
  throw new Error(`Unable to read approved ${label}: ${failure || 'invalid artifact'}`);
}
async function collectProjectTypes(projectId: number, dependencies: readonly number[]): Promise<Record<string, string>> {
  const typeById: Record<string, string> = {};
  for (const id of [...new Set([projectId, ...dependencies])]) {
    if (!Number.isFinite(id) || id <= 0) continue;
    try {
      const type = readProjectTypeFromProjectJson(await readNs4L5Project(id));
      if (type) typeById[String(id)] = type;
    } catch {
      // Another project's project.json may be missing or unreadable; the lib+finding fallback remains.
    }
  }
  return typeById;
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): Ns4E10Args {
  const root = parse(value); const moduleName = isRecord(root) && text(root.moduleName) ? text(root.moduleName) : findE9Module(context) || memory(context, 'resumeModule');
  if (!isRecord(root) || root.planId !== 'e10-validation' || !moduleName) throw new Error('Invalid E10 step arguments or missing E9 module handoff.');
  return { planId: 'e10-validation', moduleName };
}
function findE9Module(context: mls.msg.ExecutionContext): string { const anchor = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e9-result'); const value = anchor?.type === 'result' ? parse(anchor.result) : null; return isRecord(value) ? text(value.moduleName) : ''; }
async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> { const pipeline = await readNs4Pipeline(moduleName); if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution v33 pipeline not found for ${moduleName}.`); return pipeline; }
async function runtimeFail(moduleName: string, message: string, reportPath = ''): Promise<void> { try { const pipeline = await readNs4Pipeline(moduleName); if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E10RuntimeFailed(pipeline, message, reportPath || undefined)); } catch { /* task trace remains fallback */ } }
function result(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, moduleName: string): mls.msg.AgentIntentAddStep { return addStep(context, parent, { type: 'result', stepId: 0, interaction: null, stepTitle: 'Finished solution approved', status: 'completed', nextSteps: [], result: JSON.stringify({ moduleName, completedStep: 'e10-validation', nextStep: 'complete', approved: true }, null, 2), planning: { planId: 'e10-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' } } as mls.msg.AIResultStep); }
function addStep(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep { return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, step }; }
function status(context: mls.msg.ExecutionContext, parent: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, state: mls.msg.AIStepStatus, traceMsg: string, cleaner: 'input_output'): mls.msg.AgentIntentUpdateStatus { return { type: 'update-status', hookSequential, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parent.stepId, stepId: step.stepId, status: state, traceMsg, cleaner }; }
function mutableParent(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, step?: mls.msg.AIAgentStep): mls.msg.AIAgentStep { return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parent, step); }
function formatErrors(report: Ns4E10ValidationReport): string { return report.errors.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'); }
function parse(value: unknown): unknown { if (typeof value !== 'string') return value; try { return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { return value; } }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function memory(context: mls.msg.ExecutionContext, key: string): string { const value = context.task?.iaCompressed?.longMemory?.[key]; return typeof value === 'string' ? value.trim() : ''; }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
