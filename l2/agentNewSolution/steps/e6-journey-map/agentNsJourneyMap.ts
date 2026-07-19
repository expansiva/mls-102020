/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/agentNsJourneyMap.ts" enhancement="_102027_/l2/enhancementAgent"/>

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
  NS_AGENT_FOLDER,
  nsL2File,
  nsOperationsFolder,
  nsPipelineArtifactFileInfo,
  nsWorkflowsFolder,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeDefsArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  buildNsToolInstruction,
  createNsToolSchema,
  extractNsToolOutput,
} from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';
import {
  nsAgentStepIntent,
  nsFindMutableParentStep,
  nsResultStepIntent,
  nsUpdateStatusIntent,
} from '/_102020_/l2/agentNewSolution/helpers/nsSteps.js';
import {
  approveNsStep,
  createNsPipeline,
  markNsDownstreamDirty,
  markNsStepRunning,
  readNsPipeline,
  writeNsPipeline,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import { writeNsTrace } from '/_102020_/l2/agentNewSolution/helpers/nsTrace.js';
import { readActors } from '/_102020_/l2/agentNewSolution/helpers/nsActors.js';
import { NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import { NsE3ModelArtifact } from '/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js';
import {
  E6GateContext,
  NsE6OperationFact,
  collectNsOutputPaths,
  deriveE6BffRoutes,
  deriveE6WorkspaceKinds,
  prepareE6JourneyMap,
  renderE6Markdown,
  repairE6WorkflowIds,
  validateE6Invariants,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';

const AGENT_NAME = 'agentNsJourneyMap';
const STEP_ID = 'e6-journey-map';
const DONE_ANCHOR = 'e6-done';
const MAP_TOOL = 'submitNsJourneyMap';
const STEP_FOLDER = `${NS_AGENT_FOLDER}/steps/e6-journey-map`;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: STEP_FOLDER,
    agentDescription: 'E6 - consolidated journey map (workspaces, landings, edges) for agentNewSolution',
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
interface NsE5ClassificationWorkflow {
  workflowId: string;
  title: string;
  actorId: string;
  primaryEntity: string;
  featureRefs: string[];
  operationIds: string[];
}

interface NsE5ClassificationOperation {
  operationId: string;
  title: string;
  actorId: string;
  entity: string;
  kind: string;
  featureRefs: string[];
  workflowId?: string;
}

interface NsE5ClassificationArtifact {
  workflows: NsE5ClassificationWorkflow[];
  operations: NsE5ClassificationOperation[];
}

// Short summary of a saved workflow/operation defs file (prompt input only).
interface NsE6BehaviorSummary {
  id: string;
  title: string;
  actor: string;
  entity: string;
  kind: string;
  pageId: string;
  storySteps: string[];
  // Operations only: the EXACT vocabulary a bffCall projection may reference (so the LLM writes real
  // `from` paths, not guessed field names). inputNames -> `from: <op>.<inputId>`; outputPaths ->
  // `from: <op>.<path>` (e.g. $items.<col>, total). Same set the A4.2 gate validates against.
  inputNames?: string[];
  outputPaths?: string[];
}

interface E6Inputs {
  moduleName: string;
  journeys: NsE2JourneysArtifact;
  classification: NsE5ClassificationArtifact;
  model: NsE3ModelArtifact;
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
  const workflowSummaries = await summarizeWorkflowDefs(inputs.moduleName, inputs.classification);
  const operationSummaries = await summarizeOperationDefs(inputs.moduleName, inputs.classification);

  const schema = await readE6Schema();
  const prompt = await readNsText('steps/e6-journey-map', 'prompt', '.md', true);
  const journeysView = buildJourneysView(inputs.journeys);
  const humanPrompt = [
    '## E5 classification (frozen, primary source)',
    JSON.stringify(inputs.classification, null, 2),
    '',
    '## Saved workflow definitions (summaries)',
    JSON.stringify(workflowSummaries, null, 2),
    '',
    '## Saved operation definitions (summaries)',
    '## For each operation: `inputNames` and `outputPaths` are the ONLY valid names for bffCall `from`',
    '## paths — copy them verbatim ("<op>.<inputName>" / "<op>.<outputPath>"); inventing a name fails the gate.',
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
    systemPrompt: `${prompt.split('{{toolName}}').join(MAP_TOOL)}\n\n${buildNsToolInstruction(MAP_TOOL, 'the E5 classification artifact is missing or unusable')}`,
    humanPrompt,
    tools: [createNsToolSchema(MAP_TOOL, 'Submit the E6 consolidated journey map.', schema)],
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
  const mutationParent = nsFindMutableParentStep(context, parentStep);
  const parsedArgs = parseE6Args(step.prompt);
  try {
    return await handleMapResult(context, mutationParent, step, hookSequential, parsedArgs);
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (parsedArgs.moduleName) {
      await writeNsTrace(normalizeModuleFolderName(parsedArgs.moduleName), STEP_ID, AGENT_NAME, parsedArgs.retryAttempt || 1, { stepId: step.stepId }, traceMsg);
    }
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
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

  const output = extractNsToolOutput(step.interaction?.payload?.[0], MAP_TOOL);
  if (output.status === 'failed') {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', output.trace.join('\n') || 'E6 journey map returned failed')];
  }

  // Deterministic attaches: moduleName + note come from code, never from the LLM.
  // Workspace kind is derived from the classification facts FIRST (the LLM label is not
  // trusted — see deriveE6WorkspaceKinds), then workflowIds are inferred for workflow pages.
  const artifact = deriveE6BffRoutes(repairE6WorkflowIds(
    deriveE6WorkspaceKinds(prepareE6JourneyMap(output.result, { moduleName }), inputs.classification),
    inputs.classification,
  ));
  const gateContext: E6GateContext = {
    moduleName,
    classificationWorkflowIds: inputs.classification.workflows.map(workflow => workflow.workflowId),
    classificationOperationIds: inputs.classification.operations.map(operation => operation.operationId),
    rosterActorIds: inputs.rosterActorIds,
    entityIds: inputs.model.entities.map(entity => entity.entityId),
    nowCapabilityActorIds: computeNowCapabilityActorIds(inputs.classification, inputs.journeys),
    operationFacts: await buildE6OperationFacts(moduleName, inputs.classification),
  };
  const gateInputs = {
    e2CreatedAt: inputs.journeys.createdAt,
    classificationWorkflowIds: gateContext.classificationWorkflowIds,
    classificationOperationIds: gateContext.classificationOperationIds,
    retryContext: parsedArgs.retryContext || '',
  };
  const schema = await readE6Schema();
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  pipeline = markNsStepRunning(pipeline, STEP_ID, gateInputs);
  const gate = await runNsGate({
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
    await writeNsPipeline(pipeline);
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
    // Keep the pipeline alive on attempt 1: 'failed' would fail the whole task and orphan the retry
    // (downstream depends only on the 'e6-done' anchor, so completing this run unlocks nothing).
    if (attempt < 2) {
      return [
        nsAgentStepIntent(context, mutationParent, {
          agentName: AGENT_NAME,
          stepTitle: 'Retry E6 journey map gate',
          planId: `e6-journey-map-retry-${Date.now()}`,
          prompt: { planId: STEP_ID, moduleName, retryAttempt: 2, retryContext: gate.retryContext || traceMsg },
        }),
        nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `gate failed (attempt ${attempt}), retrying | ${traceMsg}`, 'input_output'),
      ];
    }
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }

  pipeline = approveNsStep(pipeline, STEP_ID, 'auto');
  // newSolution_11 fix: re-running e6 (workspaces changed) must invalidate the already-approved e7 so
  // its contracts regenerate — otherwise a partial re-run leaves stale contracts and e7 reports "no
  // module waiting". No-op on the first run (e7 not yet approved). Mirrors e2's markNsDownstreamDirty.
  pipeline = markNsDownstreamDirty(pipeline, STEP_ID);
  await writeNsPipeline(pipeline);
  // D1 layout: one file per workspace under l4/{module}/workspaces/ (surgical edit + per-workspace
  // staleness) + a single l4/{module}/navigation.defs.ts for the cross-workspace landings/edges
  // (with a workspaceIds index so readers can reassemble without scanning the folder).
  for (const workspace of artifact.workspaces) {
    await writeDefsArtifact(
      { project: mls.actualProject || 0, level: 4, folder: `${moduleName}/workspaces`, shortName: workspace.workspaceId, extension: '.defs.ts' },
      `${workspace.workspaceId}Workspace`,
      workspace,
    );
  }
  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: moduleName, shortName: 'navigation', extension: '.defs.ts' },
    `${moduleName}Navigation`,
    {
      moduleName: artifact.moduleName,
      note: artifact.note,
      landings: artifact.landings,
      navigationEdges: artifact.navigationEdges,
      workspaceIds: artifact.workspaces.map(workspace => workspace.workspaceId),
    },
  );
  await writeMarkdownArtifact(
    nsPipelineArtifactFileInfo(moduleName, 'e6-journey-map', '.md'),
    renderE6Markdown(artifact, { generatedAt: new Date().toISOString() }),
  );
  await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate });

  return [
    nsResultStepIntent(context, mutationParent, {
      planId: DONE_ANCHOR,
      dependsOn: [STEP_ID],
      stepTitle: 'Journey map ready',
      result: { type: DONE_ANCHOR, moduleName, workspaces: artifact.workspaces.map(workspace => workspace.workspaceId) },
    }),
    nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `e6-journey-map approved for ${moduleName} (${artifact.workspaces.length} workspaces)`, 'input_output'),
  ];
}

// ---------------------------------------------------------------------------
// inputs
// ---------------------------------------------------------------------------

async function loadE6Inputs(requestedModule?: string): Promise<E6Inputs> {
  const moduleName = await resolveE6Module(requestedModule);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const classification = await readJsonArtifact<NsE5ClassificationArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e5-classification', '.json'), true);
  if (!classification) throw new Error(`[${AGENT_NAME}] e5-classification.json not found for ${moduleName}`);
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const actorsRules = await readJsonArtifact<Record<string, unknown>>(nsPipelineArtifactFileInfo(moduleName, 'e4-actors-rules', '.json'), true);
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
    const pipeline = await readNsPipeline(moduleName);
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
  classification: NsE5ClassificationArtifact,
  journeys: NsE2JourneysArtifact,
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
function buildJourneysView(journeys: NsE2JourneysArtifact): Record<string, unknown> {
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

async function summarizeWorkflowDefs(moduleName: string, classification: NsE5ClassificationArtifact): Promise<NsE6BehaviorSummary[]> {
  const summaries: NsE6BehaviorSummary[] = [];
  for (const workflow of classification.workflows) {
    const defs = await readJsonDefs<Record<string, unknown>>(nsWorkflowsFolder(moduleName), workflow.workflowId);
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

async function summarizeOperationDefs(moduleName: string, classification: NsE5ClassificationArtifact): Promise<NsE6BehaviorSummary[]> {
  const summaries: NsE6BehaviorSummary[] = [];
  for (const operation of classification.operations) {
    const defs = await readJsonDefs<Record<string, unknown>>(nsOperationsFolder(moduleName), operation.operationId);
    const inputNames = (Array.isArray(defs?.inputs) ? defs!.inputs : [])
      .map(input => (isRecord(input) ? readString(input.inputId) : undefined))
      .filter((name): name is string => !!name);
    summaries.push({
      id: operation.operationId,
      title: readString(defs?.title) || operation.title,
      actor: operation.actorId,
      entity: operation.entity,
      kind: readString(defs?.kind) || operation.kind,
      pageId: readString(defs?.pageId) || operation.workflowId || operation.operationId,
      storySteps: summarizeStory(defs?.story),
      // The projectable vocabulary — the LLM must copy these names verbatim into bffCall `from` paths.
      inputNames,
      outputPaths: collectNsOutputPaths(isRecord(defs?.outputShape) ? defs!.outputShape : undefined),
    });
  }
  return summaries;
}

// Per-operation facts for the deterministic organism gates (detailPanel/batchAction). Read from the
// frozen operation defs so the gate stays pure — an operation whose def is absent simply has no fact
// entry, and the gate errors (organism.fact.missing) rather than silently skipping the check.
const PUBLIC_INPUT_SOURCES = new Set(['userInput', 'selectedEntity', 'routeParam']);

async function buildE6OperationFacts(
  moduleName: string,
  classification: NsE5ClassificationArtifact,
): Promise<Record<string, NsE6OperationFact>> {
  const facts: Record<string, NsE6OperationFact> = {};
  for (const operation of classification.operations) {
    const defs = await readJsonDefs<Record<string, unknown>>(nsOperationsFolder(moduleName), operation.operationId);
    if (!defs) continue;
    const accessPattern = isRecord(defs.accessPattern) ? defs.accessPattern : {};
    const inputs = Array.isArray(defs.inputs) ? defs.inputs : [];
    const outputShape = isRecord(defs.outputShape) ? defs.outputShape : undefined;
    facts[operation.operationId] = {
      accessPatternKind: readEnumValue(accessPattern.kind, ['list', 'getById', 'lookup', 'commandInput'], 'commandInput'),
      selection: readEnumValue(accessPattern.selection, ['none', 'single', 'multiple'], 'none'),
      opKind: readEnumValue(defs.kind, ['create', 'update', 'delete', 'query', 'view'], 'view'),
      hasPublicInput: inputs.some(input => isRecord(input) && typeof input.source === 'string' && PUBLIC_INPUT_SOURCES.has(input.source)),
      // D6 back-compat: new defs carry `actors`, legacy defs carry singular `actor`. Fall back to the
      // classification actorId when a def is missing the field entirely.
      actors: readActors(defs).length ? readActors(defs) : [operation.actorId].filter(Boolean),
      // A4.2 traceability: the valid `from` suffixes a bffCall projection may point at.
      inputNames: inputs.map(input => (isRecord(input) ? readString(input.inputId) : undefined)).filter((name): name is string => !!name),
      outputPaths: collectNsOutputPaths(outputShape as { kind?: string; fields?: [] } | undefined),
    };
  }
  return facts;
}

function readEnumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

// Defs files are `export const x = {...} as const;` — extract the JSON block
// (same convention as agentNsOntology.readJsonDefs).
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
  const raw = await readNsText('schemas', 'e6-journey-map.schema', '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error(`[${AGENT_NAME}] invalid schema e6-journey-map.schema`);
  return parsed;
}

async function readNsText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(nsL2File(`${NS_AGENT_FOLDER}/${folder}`, shortName, extension), required);
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
