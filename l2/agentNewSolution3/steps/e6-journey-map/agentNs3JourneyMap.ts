/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e6-journey-map/agentNs3JourneyMap.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E6 — consolidated journey map. ONE call (no item chain): reads the frozen E5
// classification, short summaries of the saved workflow/operation defs, the E4
// roster and the E2 journeys, and produces the navigation map consumed by
// agentChangeFrontend (workspaces = one page each, landings per actor, advisory
// navigation edges). moduleName and note are attached deterministically after
// the call. On a green gate it writes l4/{module}/journeys/{module}Journeys.defs.ts
// + pipeline/e6-journey-map.md, approves the pipeline step and emits the completed
// 'e6-done' anchor. Retry = 1 with the gate error in context (dynamic "-retry" step).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  listExistingModuleFolders,
  NS3_AGENT_FOLDER,
  ns3L2File,
  ns3PipelineArtifactFileInfo,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeDefsArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';
import { runNs3Gate } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  buildNs3ToolInstruction,
  createNs3ToolSchema,
  extractNs3ToolOutput,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Llm.js';
import {
  ns3AgentStepIntent,
  ns3FindMutableParentStep,
  ns3ResultStepIntent,
  ns3UpdateStatusIntent,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Steps.js';
import {
  approveNs3Step,
  createNs3Pipeline,
  markNs3StepRunning,
  readNs3Pipeline,
  writeNs3Pipeline,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.js';
import { writeNs3Trace } from '/_102020_/l2/agentNewSolution3/helpers/ns3Trace.js';
import { Ns3E2JourneysArtifact } from '/_102020_/l2/agentNewSolution3/steps/e2-journeys/gate.js';
import { Ns3E3ModelArtifact } from '/_102020_/l2/agentNewSolution3/steps/e3-ontology/gate.js';
import {
  E6GateContext,
  deriveE6WorkspaceKinds,
  prepareE6JourneyMap,
  renderE6Markdown,
  repairE6WorkflowIds,
  validateE6Invariants,
} from '/_102020_/l2/agentNewSolution3/steps/e6-journey-map/gate.js';

const AGENT_NAME = 'agentNs3JourneyMap';
const STEP_ID = 'e6-journey-map';
const DONE_ANCHOR = 'e6-done';
const MAP_TOOL = 'submitNs3JourneyMap';
const STEP_FOLDER = `${NS3_AGENT_FOLDER}/steps/e6-journey-map`;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: STEP_FOLDER,
    agentDescription: 'E6 - consolidated journey map (workspaces, landings, edges) for agentNewSolution3',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface E6Args {
  planId?: string;
  moduleName?: string;
  retryAttempt?: number;
  retryContext?: string;
}

// Local view of pipeline/e5-classification.json (E5 owns the canonical types).
interface Ns3E5ClassificationWorkflow {
  workflowId: string;
  title: string;
  actorId: string;
  primaryEntity: string;
  featureRefs: string[];
  operationIds: string[];
}

interface Ns3E5ClassificationOperation {
  operationId: string;
  title: string;
  actorId: string;
  entity: string;
  kind: string;
  featureRefs: string[];
  workflowId?: string;
}

interface Ns3E5ClassificationArtifact {
  workflows: Ns3E5ClassificationWorkflow[];
  operations: Ns3E5ClassificationOperation[];
}

// Short summary of a saved workflow/operation defs file (prompt input only).
interface Ns3E6BehaviorSummary {
  id: string;
  title: string;
  actor: string;
  entity: string;
  kind: string;
  pageId: string;
  storySteps: string[];
}

interface E6Inputs {
  moduleName: string;
  journeys: Ns3E2JourneysArtifact;
  classification: Ns3E5ClassificationArtifact;
  model: Ns3E3ModelArtifact;
  rosterActorIds: string[];
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
  const hookArgs = args || step.prompt || JSON.stringify({ planId: STEP_ID });
  const parsedArgs = parseE6Args(hookArgs);
  return [await buildMapPrompt(context, parentStep, hookSequential, parsedArgs, hookArgs)];
}

async function buildMapPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E6Args,
  hookArgs: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const inputs = await loadE6Inputs(parsedArgs.moduleName);
  const workflowSummaries = await summarizeWorkflowDefs(inputs.classification);
  const operationSummaries = await summarizeOperationDefs(inputs.classification);

  const schema = await readE6Schema();
  const prompt = await readNs3Text('steps/e6-journey-map', 'prompt', '.md', true);
  const journeysView = buildJourneysView(inputs.journeys);
  const humanPrompt = [
    '## E5 classification (frozen, primary source)',
    JSON.stringify(inputs.classification, null, 2),
    '',
    '## Saved workflow definitions (summaries)',
    JSON.stringify(workflowSummaries, null, 2),
    '',
    '## Saved operation definitions (summaries)',
    JSON.stringify(operationSummaries, null, 2),
    '',
    '## Actor roster (the only valid actor ids)',
    inputs.rosterActorIds.join(', '),
    '',
    '## Declared entity ids (the only valid entity values)',
    inputs.model.entities.map(entity => entity.entityId).join(', '),
    '',
    '## E2 journeys (navigation source: who starts where and who hands off to whom)',
    JSON.stringify(journeysView, null, 2),
    '',
    `## userLanguage: ${inputs.journeys.userLanguage}`,
    parsedArgs.retryContext ? `\n## Gate retry context (fix exactly these problems)\n${parsedArgs.retryContext}\n` : '',
  ].filter(Boolean).join('\n');

  return {
    type: 'prompt_ready',
    args: hookArgs,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: `${prompt.split('{{toolName}}').join(MAP_TOOL)}\n\n${buildNs3ToolInstruction(MAP_TOOL, 'the E5 classification artifact is missing or unusable')}`,
    humanPrompt,
    tools: [createNs3ToolSchema(MAP_TOOL, 'Submit the E6 consolidated journey map.', schema)],
    toolChoice: { type: 'function', function: { name: MAP_TOOL } },
  } as mls.msg.AgentIntentPromptReady;
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = ns3FindMutableParentStep(context, parentStep);
  const parsedArgs = parseE6Args(step.prompt);
  try {
    return await handleMapResult(context, mutationParent, step, hookSequential, parsedArgs);
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (parsedArgs.moduleName) {
      await writeNs3Trace(normalizeModuleFolderName(parsedArgs.moduleName), STEP_ID, AGENT_NAME, parsedArgs.retryAttempt || 1, { stepId: step.stepId }, traceMsg);
    }
    return [ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }
}

async function handleMapResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E6Args,
): Promise<mls.msg.AgentIntent[]> {
  const inputs = await loadE6Inputs(parsedArgs.moduleName);
  const moduleName = inputs.moduleName;

  const output = extractNs3ToolOutput(step.interaction?.payload?.[0], MAP_TOOL);
  if (output.status === 'failed') {
    return [ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', output.trace.join('\n') || 'E6 journey map returned failed')];
  }

  // Deterministic attaches: moduleName + note come from code, never from the LLM.
  // Workspace kind is derived from the classification facts FIRST (the LLM label is not
  // trusted — see deriveE6WorkspaceKinds), then workflowIds are inferred for workflow pages.
  const artifact = repairE6WorkflowIds(
    deriveE6WorkspaceKinds(prepareE6JourneyMap(output.result, { moduleName }), inputs.classification),
    inputs.classification,
  );
  const gateContext: E6GateContext = {
    moduleName,
    classificationWorkflowIds: inputs.classification.workflows.map(workflow => workflow.workflowId),
    classificationOperationIds: inputs.classification.operations.map(operation => operation.operationId),
    rosterActorIds: inputs.rosterActorIds,
    entityIds: inputs.model.entities.map(entity => entity.entityId),
    nowCapabilityActorIds: computeNowCapabilityActorIds(inputs.classification, inputs.journeys),
  };
  const gateInputs = {
    e2CreatedAt: inputs.journeys.createdAt,
    classificationWorkflowIds: gateContext.classificationWorkflowIds,
    classificationOperationIds: gateContext.classificationOperationIds,
    retryContext: parsedArgs.retryContext || '',
  };
  const schema = await readE6Schema();
  let pipeline = await readNs3Pipeline(moduleName) || createNs3Pipeline(moduleName);
  pipeline = markNs3StepRunning(pipeline, STEP_ID, gateInputs);
  const gate = await runNs3Gate({
    stepId: STEP_ID,
    schema,
    artifact,
    inputs: gateInputs,
    pipeline,
    validate: item => validateE6Invariants(item, gateContext),
  });
  if (gate.pipeline) pipeline = gate.pipeline;

  const attempt = parsedArgs.retryAttempt || gate.attempts;
  if (!gate.ok) {
    await writeNs3Pipeline(pipeline);
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNs3Trace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
    // Keep the pipeline alive on attempt 1: 'failed' would fail the whole task and orphan the retry
    // (downstream depends only on the 'e6-done' anchor, so completing this run unlocks nothing).
    if (attempt < 2) {
      return [
        ns3AgentStepIntent(context, mutationParent, {
          agentName: AGENT_NAME,
          stepTitle: 'Retry E6 journey map gate',
          planId: `e6-journey-map-retry-${Date.now()}`,
          prompt: { planId: STEP_ID, moduleName, retryAttempt: 2, retryContext: gate.retryContext || traceMsg },
        }),
        ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `gate failed (attempt ${attempt}), retrying | ${traceMsg}`, 'input_output'),
      ];
    }
    return [ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }

  pipeline = approveNs3Step(pipeline, STEP_ID, 'auto');
  await writeNs3Pipeline(pipeline);
  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: `${moduleName}/journeys`, shortName: `${moduleName}Journeys`, extension: '.defs.ts' },
    `${moduleName}Journeys`,
    {
      moduleName: artifact.moduleName,
      note: artifact.note,
      workspaces: artifact.workspaces,
      landings: artifact.landings,
      navigationEdges: artifact.navigationEdges,
    },
  );
  await writeMarkdownArtifact(
    ns3PipelineArtifactFileInfo(moduleName, 'e6-journey-map', '.md'),
    renderE6Markdown(artifact, { generatedAt: new Date().toISOString() }),
  );
  await writeNs3Trace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate });

  return [
    ns3ResultStepIntent(context, mutationParent, {
      planId: DONE_ANCHOR,
      dependsOn: [STEP_ID],
      stepTitle: 'Journey map ready',
      result: { type: DONE_ANCHOR, moduleName, workspaces: artifact.workspaces.map(workspace => workspace.workspaceId) },
    }),
    ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `e6-journey-map approved for ${moduleName} (${artifact.workspaces.length} workspaces)`, 'input_output'),
  ];
}

// ---------------------------------------------------------------------------
// inputs
// ---------------------------------------------------------------------------

async function loadE6Inputs(requestedModule?: string): Promise<E6Inputs> {
  const moduleName = await resolveE6Module(requestedModule);
  const journeys = await readJsonArtifact<Ns3E2JourneysArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const classification = await readJsonArtifact<Ns3E5ClassificationArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e5-classification', '.json'), true);
  if (!classification) throw new Error(`[${AGENT_NAME}] e5-classification.json not found for ${moduleName}`);
  const model = await readJsonArtifact<Ns3E3ModelArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const actorsRules = await readJsonArtifact<Record<string, unknown>>(ns3PipelineArtifactFileInfo(moduleName, 'e4-actors-rules', '.json'), true);
  if (!actorsRules) throw new Error(`[${AGENT_NAME}] e4-actors-rules.json not found for ${moduleName}`);
  return {
    moduleName,
    journeys,
    classification: {
      workflows: Array.isArray(classification.workflows) ? classification.workflows : [],
      operations: Array.isArray(classification.operations) ? classification.operations : [],
    },
    model,
    rosterActorIds: readRosterActorIds(actorsRules),
  };
}

async function resolveE6Module(requested?: string): Promise<string> {
  if (requested) return normalizeModuleFolderName(requested);
  for (const moduleName of listExistingModuleFolders()) {
    const pipeline = await readNs3Pipeline(moduleName);
    if (!pipeline) continue;
    const e5 = pipeline.steps['e5-workflows-operations'];
    const e6 = pipeline.steps[STEP_ID];
    if (e5?.status === 'approved' && (!e6 || e6.status !== 'approved' || e6.dirty)) return moduleName;
  }
  throw new Error(`[${AGENT_NAME}] no module with approved E5 waiting for E6`);
}

function readRosterActorIds(input: unknown): string[] {
  const record = isRecord(input) ? input : {};
  const actors = Array.isArray(record.actors) ? record.actors.filter(isRecord) : [];
  return actors.map(actor => readString(actor.actorId)).filter((actorId): actorId is string => !!actorId);
}

// Actors owning at least one behavior whose featureRefs include a 'now'-priority E2 feature.
function computeNowCapabilityActorIds(
  classification: Ns3E5ClassificationArtifact,
  journeys: Ns3E2JourneysArtifact,
): string[] {
  const nowFeatureIds = new Set(journeys.features.filter(feature => feature.priority === 'now').map(feature => feature.featureId));
  const actorIds = new Set<string>();
  for (const workflow of classification.workflows) {
    if ((workflow.featureRefs || []).some(featureId => nowFeatureIds.has(featureId))) actorIds.add(workflow.actorId);
  }
  for (const operation of classification.operations) {
    if ((operation.featureRefs || []).some(featureId => nowFeatureIds.has(featureId))) actorIds.add(operation.actorId);
  }
  return [...actorIds];
}

// Slim journeys view for the prompt: actors, per-journey steps and feature priorities only.
function buildJourneysView(journeys: Ns3E2JourneysArtifact): Record<string, unknown> {
  return {
    actors: journeys.actors,
    journeys: journeys.journeys.map(journey => ({
      journeyId: journey.journeyId,
      actorId: journey.actorId,
      title: journey.title,
      goal: journey.goal,
      steps: journey.steps.map(item => ({ stepId: item.stepId, title: item.title, featureRefs: item.featureRefs })),
      outcome: journey.outcome,
    })),
    features: journeys.features.map(feature => ({
      featureId: feature.featureId,
      title: feature.title,
      priority: feature.priority,
      actorIds: feature.actorIds,
    })),
  };
}

// ---------------------------------------------------------------------------
// saved defs summaries
// ---------------------------------------------------------------------------

async function summarizeWorkflowDefs(classification: Ns3E5ClassificationArtifact): Promise<Ns3E6BehaviorSummary[]> {
  const summaries: Ns3E6BehaviorSummary[] = [];
  for (const workflow of classification.workflows) {
    const defs = await readJsonDefs<Record<string, unknown>>('workflows', workflow.workflowId);
    summaries.push({
      id: workflow.workflowId,
      title: readString(defs?.title) || workflow.title,
      actor: workflow.actorId,
      entity: workflow.primaryEntity,
      kind: 'workflow',
      pageId: readString(defs?.pageId) || workflow.workflowId,
      storySteps: summarizeStory(defs?.story),
    });
  }
  return summaries;
}

async function summarizeOperationDefs(classification: Ns3E5ClassificationArtifact): Promise<Ns3E6BehaviorSummary[]> {
  const summaries: Ns3E6BehaviorSummary[] = [];
  for (const operation of classification.operations) {
    const defs = await readJsonDefs<Record<string, unknown>>('operations', operation.operationId);
    summaries.push({
      id: operation.operationId,
      title: readString(defs?.title) || operation.title,
      actor: operation.actorId,
      entity: operation.entity,
      kind: readString(defs?.kind) || operation.kind,
      pageId: readString(defs?.pageId) || operation.workflowId || operation.operationId,
      storySteps: summarizeStory(defs?.story),
    });
  }
  return summaries;
}

// Defs files are `export const x = {...} as const;` — extract the JSON block
// (same convention as agentNs3Ontology.readJsonDefs).
async function readJsonDefs<T>(folder: string, shortName: string): Promise<T | null> {
  const raw = await readStorText({ project: mls.actualProject || 0, level: 4, folder, shortName, extension: '.defs.ts' }, false);
  if (!raw.trim()) return null;
  const start = raw.indexOf('= {');
  const end = raw.lastIndexOf('} as const;');
  if (start < 0 || end < 0) return null;
  const parsed = parseMaybeJson(raw.slice(start + 2, end + 1));
  return isRecord(parsed) ? parsed as T : null;
}

// Stories may be a string, an array of strings or an array of step records.
function summarizeStory(value: unknown): string[] {
  const story = parseMaybeJson(value);
  if (typeof story === 'string') return story.trim() ? [truncateLine(story)] : [];
  if (isRecord(story)) return summarizeStory(story.steps);
  if (!Array.isArray(story)) return [];
  return story.slice(0, 8)
    .map(item => {
      if (typeof item === 'string') return truncateLine(item);
      if (isRecord(item)) {
        return truncateLine(readString(item.title) || readString(item.intent) || readString(item.description) || readString(item.text) || '');
      }
      return '';
    })
    .filter(Boolean);
}

function truncateLine(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 160 ? `${clean.slice(0, 159).trim()}...` : clean;
}

// ---------------------------------------------------------------------------
// misc
// ---------------------------------------------------------------------------

async function readE6Schema(): Promise<Record<string, unknown>> {
  const raw = await readNs3Text('schemas', 'e6-journey-map.schema', '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error(`[${AGENT_NAME}] invalid schema e6-journey-map.schema`);
  return parsed;
}

async function readNs3Text(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(ns3L2File(`${NS3_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

function parseE6Args(value: unknown): E6Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return {};
  return {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: readString(parsed.retryContext),
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
