/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e7-validation/agentNsValidation.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E7 — deterministic global validation + closing. NO LLM call: beforePromptStep does
// all the work and returns intents directly (update-status / add-step instead of
// prompt_ready — the no-LLM pattern in mls-base/skills/collab_messages.md "Agent hooks").
// It reads ONLY saved files, writes l4/{module}/trace/behavior-health-report.json ALWAYS, and:
// - on errors: fails the step with a readable traceMsg (NO retry — E7 errors are
//   upstream bugs; the user reruns after fixing the producing step);
// - on success: writes module.defs.ts, l5 todoFrontend/todoBackend/process, the
//   e7-validation.md summary, approves the pipeline step and emits the 'e7-done' anchor.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  listExistingModuleFolders,
  NS_AGENT_FOLDER,
  nsOperationsFolder,
  nsPipelineArtifactFileInfo,
  nsTraceFileInfo,
  nsWorkflowsFolder,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeDefsArtifact,
  writeJsonArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';
import { emitNsBffContracts } from '/_102020_/l2/agentNewSolution/helpers/nsContractsEmit.js';
import {
  nsFindMutableParentStep,
  nsHasStepWithPlanId,
  nsResultStepIntent,
  nsUpdateStatusIntent,
} from '/_102020_/l2/agentNewSolution/helpers/nsSteps.js';
// task06: `addMessage('@@agent …')` posts a message that spawns a NEW task via the target agent's own
// beforePromptImplicit (its system prompt, no coupling); the current task is untouched.
import { addMessage as sendThreadMessage } from '/_102025_/l2/collabMessagesHelper.js';
import {
  approveNsStep,
  createNsPipeline,
  markNsStepRunning,
  readNsPipeline,
  recordNsGateResult,
  writeNsPipeline,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import { writeNsTrace } from '/_102020_/l2/agentNewSolution/helpers/nsTrace.js';
import { NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import {
  NsE3EntityArtifact,
  NsE3ModelArtifact,
} from '/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js';
import {
  buildNsModuleDefs,
  buildNsTodoOwners,
  computeNsHealthReport,
  NsE7Classification,
  NsE7ExternalRefs,
  NsE7JourneyMap,
  NsE7Workspace,
  NsE7NextStep,
  NsE7OperationDef,
  NsE7WorkflowDef,
  renderE7Markdown,
} from '/_102020_/l2/agentNewSolution/steps/e7-validation/gate.js';

const AGENT_NAME = 'agentNsValidation';
const STEP_ID = 'e7-validation-summary';
const DONE_ANCHOR = 'e7-done';
const STEP_FOLDER = `${NS_AGENT_FOLDER}/steps/e7-validation`;
const TODO_SCHEMA_VERSION = '2026-07-02-layer-todo';
const PROCESS_SCHEMA_VERSION = '2026-06-25';
const MAX_TRACE_ERRORS = 10;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: STEP_FOLDER,
    agentDescription: 'E7 - deterministic global validation and closing artifacts for agentNewSolution (no LLM)',
    visibility: 'private',
    beforePromptStep,
  };
}

interface E7Args {
  moduleName?: string;
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const mutationParent = nsFindMutableParentStep(context, parentStep);
  const parsedArgs = parseE7Args(args || step.prompt);
  let moduleName = '';
  try {
    moduleName = await resolveE7Module(parsedArgs.moduleName);
    return await runE7(context, mutationParent, step, hookSequential, moduleName);
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (moduleName) await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, 1, { stepId: step.stepId }, traceMsg);
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }
}

async function runE7(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  moduleName: string,
): Promise<mls.msg.AgentIntent[]> {
  const project = mls.actualProject || 0;

  // 1. Read every input from disk (files only, never task payloads).
  const e1Draft = await readJsonArtifact<Record<string, unknown>>(nsPipelineArtifactFileInfo(moduleName, 'e1-draft', '.json'), false);
  const e2 = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!e2) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);

  const entities: NsE3EntityArtifact[] = [];
  for (const modelEntity of model.entities) {
    const saved = await readJsonDefs<NsE3EntityArtifact>(4, `${moduleName}/ontology`, modelEntity.entityId);
    if (saved) entities.push(saved);
  }

  const e4Raw = await readJsonArtifact<Record<string, unknown>>(nsPipelineArtifactFileInfo(moduleName, 'e4-actors-rules', '.json'), true);
  if (!e4Raw) throw new Error(`[${AGENT_NAME}] e4-actors-rules.json not found for ${moduleName}`);
  const e4 = normalizeE4(e4Raw);

  const classificationRaw = await readJsonArtifact<Record<string, unknown>>(nsPipelineArtifactFileInfo(moduleName, 'e5-classification', '.json'), true);
  if (!classificationRaw) throw new Error(`[${AGENT_NAME}] e5-classification.json not found for ${moduleName}`);
  const classification = normalizeClassification(classificationRaw);

  const workflowDefs: NsE7WorkflowDef[] = [];
  for (const workflow of classification.workflows) {
    const def = await readJsonDefs<NsE7WorkflowDef>(4, nsWorkflowsFolder(moduleName), workflow.workflowId);
    if (def) workflowDefs.push(def);
  }
  const operationDefs: NsE7OperationDef[] = [];
  for (const operation of classification.operations) {
    const def = await readJsonDefs<NsE7OperationDef>(4, nsOperationsFolder(moduleName), operation.operationId);
    if (def) operationDefs.push(def);
  }
  // P7 layout: the journey map is the siteMap.defs.ts index (workspaces id/landings/edges +
  // workspaceIds) + one detail file per workspace under workspaces/. Fall back to navigation.defs.ts
  // for pre-P7 modules (the writer stopped emitting it — this keeps old l4 layouts readable).
  const siteMap = await readJsonDefs<{ landings?: unknown[]; workspaceIds?: string[] }>(4, moduleName, 'siteMap')
    || await readJsonDefs<{ landings?: unknown[]; workspaceIds?: string[] }>(4, moduleName, 'navigation');
  let journeyMap: NsE7JourneyMap | null = null;
  if (siteMap) {
    const workspaces: NsE7Workspace[] = [];
    for (const workspaceId of siteMap.workspaceIds || []) {
      const workspace = await readJsonDefs<NsE7Workspace>(4, `${moduleName}/workspaces`, workspaceId);
      if (workspace) workspaces.push(workspace);
    }
    journeyMap = { workspaces, landings: siteMap.landings || [] };
  }

  // 2. Mark the step running (with input hashes) and compute the health report.
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  pipeline = markNsStepRunning(pipeline, STEP_ID, {
    e2CreatedAt: e2.createdAt,
    e3CreatedAt: model.createdAt,
    workflowIds: classification.workflows.map(workflow => workflow.workflowId),
    operationIds: classification.operations.map(operation => operation.operationId),
  });

  const report = computeNsHealthReport({ moduleName, e2, model, entities, e4: { actors: e4.actors, rules: e4.rules }, classification, workflowDefs, operationDefs, journeyMap });
  const errorLines = report.errors.map(issue => `${issue.code}: ${issue.message}`);
  const warningLines = report.warnings.map(issue => `${issue.code}: ${issue.message}`);

  // ALWAYS persist the machine report, pass or fail.
  await writeJsonArtifact(
    nsTraceFileInfo(moduleName, 'behavior-health-report'),
    { moduleName, savedAt: new Date().toISOString(), report },
  );

  // 3. Errors = upstream bugs: fail visibly, NO retry step. The user reruns after fixing.
  if (report.errors.length > 0) {
    pipeline = recordNsGateResult(pipeline, STEP_ID, { ok: false, errors: errorLines, warnings: warningLines });
    await writeNsPipeline(pipeline);
    const shown = errorLines.slice(0, MAX_TRACE_ERRORS);
    const remaining = errorLines.length - shown.length;
    if (remaining > 0) shown.push(`(+${remaining} more error(s) in l4/${moduleName}/trace/behavior-health-report.json)`);
    const traceMsg = shown.join('\n');
    await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, 1, { report }, traceMsg);
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }

  // 4. Closing artifacts (same paths/formats Stage 2/3 already consume).
  const now = new Date().toISOString();
  const journeyDefPath = `l4/${moduleName}/siteMap.defs.ts`;
  const moduleDefs = buildNsModuleDefs({ moduleName, model, entities, e1Draft, e2, e4ExternalRefs: e4.externalRefs, journeyDefPath });
  await writeDefsArtifact({ project, level: 4, folder: moduleName, shortName: 'module', extension: '.defs.ts' }, `${moduleName}Module`, moduleDefs);

  // SAME owners list in both layers — the single generation-status source for Stage 2/3.
  const owners = buildNsTodoOwners({ moduleName, workflowDefs, operationDefs });
  await writeDefsArtifact(
    { project, level: 5, folder: moduleName, shortName: 'todoFrontend', extension: '.defs.ts' },
    `${moduleName}TodoFrontend`,
    { schemaVersion: TODO_SCHEMA_VERSION, moduleName, layer: 'frontend', updatedAt: now, owners },
  );
  await writeDefsArtifact(
    { project, level: 5, folder: moduleName, shortName: 'todoBackend', extension: '.defs.ts' },
    `${moduleName}TodoBackend`,
    { schemaVersion: TODO_SCHEMA_VERSION, moduleName, layer: 'backend', updatedAt: now, owners },
  );

  const nextSteps: (NsE7NextStep & { kind: string; status: 'pending' })[] = [
    {
      id: 'stage2-experience',
      kind: 'workflowExperience',
      title: 'Generate frontend experience (@@changeFrontend)',
      description: 'Materialize l2 pages from the l4 behavior model.',
      status: 'pending',
    },
    {
      id: 'stage3-backend',
      kind: 'backendImplementation',
      title: 'Generate backend (@@changeBackend)',
      description: 'Materialize l1 hexagonal backend from the l4 behavior model.',
      status: 'pending',
    },
  ];
  await writeDefsArtifact(
    { project, level: 5, folder: moduleName, shortName: 'process', extension: '.defs.ts' },
    `${moduleName}Process`,
    {
      schemaVersion: PROCESS_SCHEMA_VERSION,
      moduleName,
      runs: [{
        runId: `ns-${Date.now()}`,
        kind: 'newSolution-behavior',
        startedAt: now,
        finishedAt: new Date().toISOString(),
        sourceRefs: {
          module: `l4/${moduleName}/module.defs.ts`,
          health: `l4/${moduleName}/trace/behavior-health-report.json`,
          journeys: journeyDefPath,
          todoFrontend: `l5/${moduleName}/todoFrontend.defs.ts`,
          todoBackend: `l5/${moduleName}/todoBackend.defs.ts`,
        },
        handoffNotes: warningLines,
        nextSteps,
      }],
    },
  );
  await writeMarkdownArtifact(
    nsPipelineArtifactFileInfo(moduleName, 'e7-validation', '.md'),
    renderE7Markdown(report, { moduleName, nextSteps }),
  );

  // newSolution_10 N4: the mechanical bffCall contracts are the LAST artifact of the flow (emitted
  // here, after e6 settled the workspaces + projections — killing the run-9 staleness). l4 only; the
  // l1/l2 mirrors are gone in this phase. A4.7: an empty projected Output throws → the step fails.
  try {
    const contractPaths = await emitNsBffContracts(moduleName, (journeyMap?.workspaces || []) as unknown[], operationDefs as unknown[]);
    await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, 1, { contracts: contractPaths }, `emitted ${contractPaths.length} bffCall contract file(s)`);
  } catch (error) {
    const traceMsg = `contract emit failed: ${error instanceof Error ? error.message : String(error)}`;
    await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, 1, { stepId: step.stepId }, traceMsg);
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }

  // 5. Approve, trace, and close: completed 'e7-done' result BEFORE this step's
  // update-status (parent auto-completion sweep runs per intent).
  pipeline = recordNsGateResult(pipeline, STEP_ID, { ok: true, errors: [], warnings: warningLines });
  pipeline = approveNsStep(pipeline, STEP_ID, 'auto');
  await writeNsPipeline(pipeline);
  await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, 1, { report, todoOwners: owners.length });

  // task06: the spec is complete with no error — chain straight into the backend + frontend rebuilds
  // as TWO new tasks (this task is untouched). Idempotent: the 'e7-done' anchor from a prior successful
  // run means the handoff already fired, so a dirty re-run does not double-post.
  if (!nsHasStepWithPlanId(context, DONE_ANCHOR)) await dispatchNsHandoff(context, moduleName);

  return [
    nsResultStepIntent(context, mutationParent, {
      planId: DONE_ANCHOR,
      dependsOn: [STEP_ID],
      stepTitle: 'Module specification complete',
      result: { type: DONE_ANCHOR, moduleName, counts: report.counts, todoOwners: owners.length },
    }),
    nsUpdateStatusIntent(
      context, mutationParent, step, hookSequential, 'completed',
      `module ${moduleName} spec complete: ${report.counts.entities} entities, ${report.counts.workflows} workflows, ${report.counts.operations} operations`,
    ),
  ];
}

// task06: the two follow-up commands. Each fires as an independent new task and they run in PARALLEL —
// they do NOT sequence (the backend does not consume the frontend's l2 contracts here). The module name
// is passed explicitly as the command target (future: horizontal modules + plugins reuse the same shape).
function nsHandoffMessages(moduleName: string): string[] {
  return [`@@changeBackend /rebuild all ${moduleName}`, `@@changeFrontend /rebuild all ${moduleName}`];
}
// sendThreadMessage runs the spawned task inline, so awaiting each in series made newSolution block on
// the WHOLE backend task before the frontend one even started. We start both at once and prefer NOT to
// wait for them; this hard cap only gives both a brief window to register before newSolution returns.
const NS_HANDOFF_MAX_WAIT_MS = 1000;

// Fire BOTH handoffs concurrently and return promptly. Each dispatch catches its own error (traced,
// never fatal — the spec is already on disk); the pair is raced against a short grace window so
// newSolution does not block on the child tasks running to completion.
async function dispatchNsHandoff(context: mls.msg.ExecutionContext, moduleName: string): Promise<void> {
  const threadId = context.message?.threadId;
  if (!threadId) return;
  const dispatches = nsHandoffMessages(moduleName).map(content =>
    sendThreadMessage(threadId, content).catch(error =>
      writeNsTrace(moduleName, STEP_ID, AGENT_NAME, 1, { handoff: content }, `handoff dispatch failed: ${error instanceof Error ? error.message : String(error)}`)
        .catch(() => undefined)),
  );
  await Promise.race([
    Promise.allSettled(dispatches),
    new Promise<void>(resolve => setTimeout(resolve, NS_HANDOFF_MAX_WAIT_MS)),
  ]);
}

async function resolveE7Module(requested?: string): Promise<string> {
  if (requested) return normalizeModuleFolderName(requested);
  for (const moduleName of listExistingModuleFolders()) {
    const pipeline = await readNsPipeline(moduleName);
    if (!pipeline) continue;
    const e6 = pipeline.steps['e6-journey-map'];
    const e7 = pipeline.steps[STEP_ID];
    if (e6?.status === 'approved' && (!e7 || e7.status !== 'approved' || e7.dirty)) return moduleName;
  }
  throw new Error(`[${AGENT_NAME}] no module with an approved journey map waiting for E7`);
}

// Defs files are `export const x = {...} as const;` — extract the JSON block.
async function readJsonDefs<T>(level: number, folder: string, shortName: string): Promise<T | null> {
  const raw = await readStorText({ project: mls.actualProject || 0, level, folder, shortName, extension: '.defs.ts' }, false);
  if (!raw.trim()) return null;
  const start = raw.indexOf('= {');
  const end = raw.lastIndexOf('} as const;');
  if (start < 0 || end < 0) return null;
  const parsed = parseMaybeJson(raw.slice(start + 2, end + 1));
  return isRecord(parsed) ? parsed as T : null;
}

function normalizeE4(raw: Record<string, unknown>): {
  actors: { actorId: string }[];
  rules: { ruleId: string }[];
  externalRefs: NsE7ExternalRefs;
} {
  const externalRefs = isRecord(raw.externalRefs) ? raw.externalRefs : {};
  return {
    actors: readRecordArray(raw.actors)
      .map(actor => ({ actorId: readString(actor.actorId) || '' }))
      .filter(actor => actor.actorId),
    rules: readRecordArray(raw.rules)
      .map(rule => ({ ruleId: readString(rule.ruleId) || '' }))
      .filter(rule => rule.ruleId),
    externalRefs: {
      mdm: readArray(externalRefs.mdm),
      horizontals: readArray(externalRefs.horizontals),
      plugins: readArray(externalRefs.plugins),
      agents: readArray(externalRefs.agents),
    },
  };
}

function normalizeClassification(raw: Record<string, unknown>): NsE7Classification {
  return {
    workflows: readRecordArray(raw.workflows).map(workflow => ({
      workflowId: readString(workflow.workflowId) || '',
      actorId: readString(workflow.actorId) || '',
      primaryEntity: readString(workflow.primaryEntity) || '',
      featureRefs: readStringArray(workflow.featureRefs),
      operationIds: readStringArray(workflow.operationIds),
    })).filter(workflow => workflow.workflowId),
    operations: readRecordArray(raw.operations).map(operation => ({
      operationId: readString(operation.operationId) || '',
      actorId: readString(operation.actorId) || '',
      entity: readString(operation.entity) || '',
      kind: readString(operation.kind) || '',
      featureRefs: readStringArray(operation.featureRefs),
      ...(readString(operation.workflowId) ? { workflowId: readString(operation.workflowId) } : {}),
    })).filter(operation => operation.operationId),
  };
}

function parseE7Args(value: unknown): E7Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return {};
  return { moduleName: readString(parsed.moduleName) };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return readArray(value).filter(isRecord);
}

function readStringArray(value: unknown): string[] {
  return readArray(value)
    .map(item => readString(item))
    .filter((item): item is string => !!item);
}
