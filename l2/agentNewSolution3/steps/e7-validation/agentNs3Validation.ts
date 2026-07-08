/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e7-validation/agentNs3Validation.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E7 — deterministic global validation + closing. NO LLM call: beforePromptStep does
// all the work and returns intents directly (update-status / add-step instead of
// prompt_ready — the no-LLM pattern in mls-base/skills/collab_messages.md "Agent hooks").
// It reads ONLY saved files, writes l4/trace/behavior-health-report.json ALWAYS, and:
// - on errors: fails the step with a readable traceMsg (NO retry — E7 errors are
//   upstream bugs; the user reruns after fixing the producing step);
// - on success: writes module.defs.ts, l5 todoFrontend/todoBackend/process, the
//   e7-validation.md summary, approves the pipeline step and emits the 'e7-done' anchor.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  listExistingModuleFolders,
  NS3_AGENT_FOLDER,
  ns3PipelineArtifactFileInfo,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeDefsArtifact,
  writeJsonArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';
import {
  ns3FindMutableParentStep,
  ns3ResultStepIntent,
  ns3UpdateStatusIntent,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Steps.js';
import {
  approveNs3Step,
  createNs3Pipeline,
  markNs3StepRunning,
  readNs3Pipeline,
  recordNs3GateResult,
  writeNs3Pipeline,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.js';
import { writeNs3Trace } from '/_102020_/l2/agentNewSolution3/helpers/ns3Trace.js';
import { Ns3E2JourneysArtifact } from '/_102020_/l2/agentNewSolution3/steps/e2-journeys/gate.js';
import {
  Ns3E3EntityArtifact,
  Ns3E3ModelArtifact,
} from '/_102020_/l2/agentNewSolution3/steps/e3-ontology/gate.js';
import {
  buildNs3ModuleDefs,
  buildNs3TodoOwners,
  computeNs3HealthReport,
  Ns3E7Classification,
  Ns3E7ExternalRefs,
  Ns3E7JourneyMap,
  Ns3E7NextStep,
  Ns3E7OperationDef,
  Ns3E7WorkflowDef,
  renderE7Markdown,
} from '/_102020_/l2/agentNewSolution3/steps/e7-validation/gate.js';

const AGENT_NAME = 'agentNs3Validation';
const STEP_ID = 'e7-validation-summary';
const DONE_ANCHOR = 'e7-done';
const STEP_FOLDER = `${NS3_AGENT_FOLDER}/steps/e7-validation`;
const TODO_SCHEMA_VERSION = '2026-07-02-layer-todo';
const PROCESS_SCHEMA_VERSION = '2026-06-25';
const MAX_TRACE_ERRORS = 10;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: STEP_FOLDER,
    agentDescription: 'E7 - deterministic global validation and closing artifacts for agentNewSolution3 (no LLM)',
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
  const mutationParent = ns3FindMutableParentStep(context, parentStep);
  const parsedArgs = parseE7Args(args || step.prompt);
  let moduleName = '';
  try {
    moduleName = await resolveE7Module(parsedArgs.moduleName);
    return await runE7(context, mutationParent, step, hookSequential, moduleName);
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (moduleName) await writeNs3Trace(moduleName, STEP_ID, AGENT_NAME, 1, { stepId: step.stepId }, traceMsg);
    return [ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
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
  const e1Draft = await readJsonArtifact<Record<string, unknown>>(ns3PipelineArtifactFileInfo(moduleName, 'e1-draft', '.json'), false);
  const e2 = await readJsonArtifact<Ns3E2JourneysArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!e2) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<Ns3E3ModelArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);

  const entities: Ns3E3EntityArtifact[] = [];
  for (const modelEntity of model.entities) {
    const saved = await readJsonDefs<Ns3E3EntityArtifact>(4, `${moduleName}/ontology`, modelEntity.entityId);
    if (saved) entities.push(saved);
  }

  const e4Raw = await readJsonArtifact<Record<string, unknown>>(ns3PipelineArtifactFileInfo(moduleName, 'e4-actors-rules', '.json'), true);
  if (!e4Raw) throw new Error(`[${AGENT_NAME}] e4-actors-rules.json not found for ${moduleName}`);
  const e4 = normalizeE4(e4Raw);

  const classificationRaw = await readJsonArtifact<Record<string, unknown>>(ns3PipelineArtifactFileInfo(moduleName, 'e5-classification', '.json'), true);
  if (!classificationRaw) throw new Error(`[${AGENT_NAME}] e5-classification.json not found for ${moduleName}`);
  const classification = normalizeClassification(classificationRaw);

  const workflowDefs: Ns3E7WorkflowDef[] = [];
  for (const workflow of classification.workflows) {
    const def = await readJsonDefs<Ns3E7WorkflowDef>(4, 'workflows', workflow.workflowId);
    if (def) workflowDefs.push(def);
  }
  const operationDefs: Ns3E7OperationDef[] = [];
  for (const operation of classification.operations) {
    const def = await readJsonDefs<Ns3E7OperationDef>(4, 'operations', operation.operationId);
    if (def) operationDefs.push(def);
  }
  const journeyMap = await readJsonDefs<Ns3E7JourneyMap>(4, `${moduleName}/journeys`, `${moduleName}Journeys`);

  // 2. Mark the step running (with input hashes) and compute the health report.
  let pipeline = await readNs3Pipeline(moduleName) || createNs3Pipeline(moduleName);
  pipeline = markNs3StepRunning(pipeline, STEP_ID, {
    e2CreatedAt: e2.createdAt,
    e3CreatedAt: model.createdAt,
    workflowIds: classification.workflows.map(workflow => workflow.workflowId),
    operationIds: classification.operations.map(operation => operation.operationId),
  });

  const report = computeNs3HealthReport({ moduleName, e2, model, entities, e4: { actors: e4.actors, rules: e4.rules }, classification, workflowDefs, operationDefs, journeyMap });
  const errorLines = report.errors.map(issue => `${issue.code}: ${issue.message}`);
  const warningLines = report.warnings.map(issue => `${issue.code}: ${issue.message}`);

  // ALWAYS persist the machine report, pass or fail.
  await writeJsonArtifact(
    { project, level: 4, folder: 'trace', shortName: 'behavior-health-report', extension: '.json' },
    { moduleName, savedAt: new Date().toISOString(), report },
  );

  // 3. Errors = upstream bugs: fail visibly, NO retry step. The user reruns after fixing.
  if (report.errors.length > 0) {
    pipeline = recordNs3GateResult(pipeline, STEP_ID, { ok: false, errors: errorLines, warnings: warningLines });
    await writeNs3Pipeline(pipeline);
    const shown = errorLines.slice(0, MAX_TRACE_ERRORS);
    const remaining = errorLines.length - shown.length;
    if (remaining > 0) shown.push(`(+${remaining} more error(s) in l4/trace/behavior-health-report.json)`);
    const traceMsg = shown.join('\n');
    await writeNs3Trace(moduleName, STEP_ID, AGENT_NAME, 1, { report }, traceMsg);
    return [ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }

  // 4. Closing artifacts (same paths/formats Stage 2/3 already consume).
  const now = new Date().toISOString();
  const journeyDefPath = `l4/${moduleName}/journeys/${moduleName}Journeys.defs.ts`;
  const moduleDefs = buildNs3ModuleDefs({ moduleName, model, entities, e1Draft, e2, e4ExternalRefs: e4.externalRefs, journeyDefPath });
  await writeDefsArtifact({ project, level: 4, folder: moduleName, shortName: 'module', extension: '.defs.ts' }, `${moduleName}Module`, moduleDefs);

  // SAME owners list in both layers — the single generation-status source for Stage 2/3.
  const owners = buildNs3TodoOwners({ moduleName, workflowDefs, operationDefs });
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

  const nextSteps: (Ns3E7NextStep & { kind: string; status: 'pending' })[] = [
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
        runId: `ns3-${Date.now()}`,
        kind: 'newSolution3-behavior',
        startedAt: now,
        finishedAt: new Date().toISOString(),
        sourceRefs: {
          module: `l4/${moduleName}/module.defs.ts`,
          health: 'l4/trace/behavior-health-report.json',
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
    ns3PipelineArtifactFileInfo(moduleName, 'e7-validation', '.md'),
    renderE7Markdown(report, { moduleName, nextSteps }),
  );

  // 5. Approve, trace, and close: completed 'e7-done' result BEFORE this step's
  // update-status (parent auto-completion sweep runs per intent).
  pipeline = recordNs3GateResult(pipeline, STEP_ID, { ok: true, errors: [], warnings: warningLines });
  pipeline = approveNs3Step(pipeline, STEP_ID, 'auto');
  await writeNs3Pipeline(pipeline);
  await writeNs3Trace(moduleName, STEP_ID, AGENT_NAME, 1, { report, todoOwners: owners.length });

  return [
    ns3ResultStepIntent(context, mutationParent, {
      planId: DONE_ANCHOR,
      dependsOn: [STEP_ID],
      stepTitle: 'Module specification complete',
      result: { type: DONE_ANCHOR, moduleName, counts: report.counts, todoOwners: owners.length },
    }),
    ns3UpdateStatusIntent(
      context, mutationParent, step, hookSequential, 'completed',
      `module ${moduleName} spec complete: ${report.counts.entities} entities, ${report.counts.workflows} workflows, ${report.counts.operations} operations`,
    ),
  ];
}

async function resolveE7Module(requested?: string): Promise<string> {
  if (requested) return normalizeModuleFolderName(requested);
  for (const moduleName of listExistingModuleFolders()) {
    const pipeline = await readNs3Pipeline(moduleName);
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
  externalRefs: Ns3E7ExternalRefs;
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

function normalizeClassification(raw: Record<string, unknown>): Ns3E7Classification {
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
