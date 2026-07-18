/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e3-ontology/agentNsOntology.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E3 — ontology. Two kinds of runs handled by ONE agent (single maintenance unit):
// - planId "e3-ontology": the PLAN call. Reads e2-journeys.json (+ e1-draft.json), produces
//   e3-model.json (module block + slim entity index + relationships) and starts the item chain.
// - planId "e3-entity": one ITEM call per entity (sequential chain). Produces the canonical
//   l4/{module}/ontology/{EntityId}.defs.ts. The LAST item writes e3-ontology.md, approves the
//   pipeline step and emits the completed "e3-done" anchor result that unlocks E4.
// Retry = 1 per run, with the gate error in context (dynamic "-retry" step). No LLM critic.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  NS_AGENT_FOLDER,
  nsL2File,
  nsPipelineArtifactFileInfo,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeDefsArtifact,
  writeJsonArtifact,
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
  nsParallelStepIntent,
  nsParseSelector,
  nsResultStepIntent,
  nsUpdateStatusIntent,
} from '/_102020_/l2/agentNewSolution/helpers/nsSteps.js';
import {
  approveNsStep,
  createNsPipeline,
  markNsStepRunning,
  readNsPipeline,
  writeNsPipeline,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import { writeNsTrace } from '/_102020_/l2/agentNewSolution/helpers/nsTrace.js';
import { NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import {
  NsE3EntityArtifact,
  NsE3ModelArtifact,
  prepareE3EntityArtifact,
  prepareE3ModelArtifact,
  renderE3OntologyMarkdown,
  validateE3EntityInvariants,
  validateE3ModelInvariants,
} from '/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js';

const AGENT_NAME = 'agentNsOntology';
const STEP_ID = 'e3-ontology';
const DONE_ANCHOR = 'e3-done';
const MODEL_TOOL = 'submitNsModel';
const ENTITY_TOOL = 'submitNsEntity';
const STEP_FOLDER = `${NS_AGENT_FOLDER}/steps/e3-ontology`;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: STEP_FOLDER,
    agentDescription: 'E3 - ontology plan and per-entity generation for agentNewSolution',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface E3Args {
  planId?: string;
  moduleName?: string;
  entityId?: string;
  repairAttempt?: number;
  retryAttempt?: number;
  retryContext?: string;
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
  // Parallel fan-out children receive the compact selector ('entity:Order') as args.
  const selector = nsParseSelector(hookArgs);
  const parsedArgs = selector?.kind === 'entity' ? { planId: 'e3-entity', entityId: selector.id } : parseE3Args(hookArgs);

  if (parsedArgs.planId === 'e3-entity') return [await buildEntityPrompt(context, parentStep, hookSequential, parsedArgs, hookArgs)];
  if (parsedArgs.planId === 'e3-finalize') return runE3Finalize(context, parentStep, step, hookSequential, parsedArgs);
  return [await buildModelPrompt(context, parentStep, hookSequential, parsedArgs, hookArgs)];
}

async function buildModelPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E3Args,
  hookArgs: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const moduleName = await resolveE3Module(parsedArgs.moduleName);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const draft = await readJsonArtifact<Record<string, unknown>>(nsPipelineArtifactFileInfo(moduleName, 'e1-draft', '.json'), false);

  const schema = await readE3Schema('e3-model.schema');
  const platform = await readNsText('skills', 'platform', '.md', true);
  const prompt = await readNsText('steps/e3-ontology', 'prompt', '.md', true);
  const humanPrompt = [
    '## E2 journeys (frozen, primary source)',
    JSON.stringify(journeys, null, 2),
    '',
    draft ? `## E1 draft (context)\n${JSON.stringify(draft, null, 2)}\n` : '',
    parsedArgs.retryContext ? `## Gate retry context (fix exactly these problems)\n${parsedArgs.retryContext}\n` : '',
  ].filter(Boolean).join('\n');

  return {
    type: 'prompt_ready',
    args: hookArgs,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: `${prompt.split('{{toolName}}').join(MODEL_TOOL)}\n\n${platform}\n\n${buildNsToolInstruction(MODEL_TOOL, 'the E2 journeys artifact is missing or unusable')}`,
    humanPrompt,
    tools: [createNsToolSchema(MODEL_TOOL, 'Submit the E3 ontology model plan.', schema)],
    toolChoice: { type: 'function', function: { name: MODEL_TOOL } },
  } as mls.msg.AgentIntentPromptReady;
}

async function buildEntityPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E3Args,
  hookArgs: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE3Module();
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const target = model.entities.find(entity => entity.entityId === parsedArgs.entityId);
  if (!target) throw new Error(`[${AGENT_NAME}] entity ${parsedArgs.entityId} not found in e3-model.json`);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);

  const schema = await readE3Schema('e3-entity.schema');
  const prompt = await readNsText('steps/e3-ontology', 'promptEntity', '.md', true);
  const relationships = model.relationships.filter(rel => rel.fromEntity === target.entityId || rel.toEntity === target.entityId);
  const relatedJourneys = (journeys?.journeys || []).filter(journey =>
    !target.sourceRefs?.journeyIds?.length || target.sourceRefs.journeyIds.includes(journey.journeyId));
  const businessRules = relatedJourneys.flatMap(journey => journey.businessRules || []);

  const humanPrompt = [
    `## Target entity (from e3-model.json)`,
    JSON.stringify(target, null, 2),
    '',
    '## All entity ids (valid reference field types)',
    model.entities.map(entity => entity.entityId).join(', '),
    '',
    '## Relationships touching this entity',
    JSON.stringify(relationships, null, 2),
    '',
    '## Business rules from related journeys (source for status/enums/invariant fields)',
    businessRules.length ? businessRules.map(rule => `- ${rule}`).join('\n') : '(none)',
    '',
    `## userLanguage: ${model.userLanguage}`,
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
    systemPrompt: `${prompt.split('{{toolName}}').join(ENTITY_TOOL)}\n\n${buildNsToolInstruction(ENTITY_TOOL, 'the target entity is missing from the model')}`,
    humanPrompt,
    tools: [createNsToolSchema(ENTITY_TOOL, 'Submit one canonical ontology entity definition.', schema)],
    toolChoice: { type: 'function', function: { name: ENTITY_TOOL } },
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
  const selector = nsParseSelector(step.prompt);
  const parsedArgs = selector?.kind === 'entity' ? { planId: 'e3-entity', entityId: selector.id } : parseE3Args(step.prompt);
  try {
    if (parsedArgs.planId === 'e3-entity') return await handleEntityResult(context, mutationParent, step, hookSequential, parsedArgs);
    return await handleModelResult(context, mutationParent, step, hookSequential, parsedArgs);
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (parsedArgs.moduleName) {
      await writeNsTrace(normalizeModuleFolderName(parsedArgs.moduleName), STEP_ID, AGENT_NAME, parsedArgs.retryAttempt || 1, { stepId: step.stepId }, traceMsg);
    }
    // Entity runs live inside the parallel fan-out: a 'failed' child fails the parent (and the
    // task). Complete-with-trace instead; the e3-finalize repair round regenerates missing files.
    if (parsedArgs.planId === 'e3-entity') {
      return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `entity run failed | ${traceMsg}`, 'input_output')];
    }
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }
}

async function handleModelResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E3Args,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = await resolveE3Module(parsedArgs.moduleName);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);

  const output = extractNsToolOutput(step.interaction?.payload?.[0], MODEL_TOOL);
  if (output.status === 'failed') {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', output.trace.join('\n') || 'E3 model returned failed')];
  }

  const artifact = prepareE3ModelArtifact(output.result, { moduleName, userLanguage: journeys.userLanguage });
  const gateContext = {
    moduleName,
    userLanguage: journeys.userLanguage,
    e2FeatureIds: journeys.features.map(feature => feature.featureId),
    e2JourneyIds: journeys.journeys.map(journey => journey.journeyId),
    e2NonNeverFeatureIds: journeys.features.filter(feature => feature.priority !== 'never').map(feature => feature.featureId),
  };
  const schema = await readE3Schema('e3-model.schema');
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  pipeline = markNsStepRunning(pipeline, STEP_ID, { e2CreatedAt: journeys.createdAt, retryContext: parsedArgs.retryContext || '' });
  const gate = await runNsGate({
    stepId: STEP_ID,
    schema,
    artifact,
    inputs: { e2CreatedAt: journeys.createdAt },
    pipeline,
    validate: item => validateE3ModelInvariants(item, gateContext),
  });
  if (gate.pipeline) pipeline = gate.pipeline;
  await writeNsPipeline(pipeline);
  await writeJsonArtifact(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), artifact);

  const attempt = parsedArgs.retryAttempt || gate.attempts;
  if (!gate.ok) {
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
    // 'failed' marks the WHOLE task failed and orphans the retry (collab-messages updateStepStatus).
    // With a retry in flight, complete this run carrying the gate trace; downstream only depends on
    // the eN-done anchors, so nothing unlocks. Visible failure happens on the second attempt only.
    if (attempt < 2) {
      return [
        nsAgentStepIntent(context, mutationParent, {
          agentName: AGENT_NAME,
          stepTitle: 'Retry E3 model gate',
          planId: `e3-ontology-retry-${Date.now()}`,
          prompt: { planId: STEP_ID, moduleName, retryAttempt: 2, retryContext: gate.retryContext || traceMsg },
        }),
        nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `gate failed (attempt ${attempt}), retrying | ${traceMsg}`, 'input_output'),
      ];
    }
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }

  await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate });
  // Parallel fan-out (collab-messages parallel system, 5 slots, slots reused and deleted at the
  // end): one child per entity, hosted under THIS step so its completion waits for the fan-out.
  // The e3-finalize step unlocks when this step's planId completes, verifies every entity file,
  // runs one sequential repair round for the missing ones, then approves and emits 'e3-done'.
  const stepTitle: string = `Detailing {{completed}}/{{total}} entities, failed {{failed}}`;

  return [
    nsParallelStepIntent(context, step, {
      agentName: AGENT_NAME,
      planId: 'e3-entities-parallel',
      stepTitle,
      args: artifact.entities.map(entity => `entity:${entity.entityId}`),
      maxParallel: 20,
    }),
    nsAgentStepIntent(context, mutationParent, {
      agentName: AGENT_NAME,
      stepTitle: 'Finalize ontology',
      planId: 'e3-finalize',
      dependsOn: [STEP_ID],
      status: 'waiting_dependency',
      prompt: { planId: 'e3-finalize', moduleName },
    }),
    nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `e3-model ready for ${moduleName} (${artifact.entities.length} entities)`, 'input_output'),
  ];
}

async function handleEntityResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E3Args,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE3Module();
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);

  // Fan-out child policy: NEVER return 'failed' (a failed parallel child fails the parent/task) and
  // never add steps from inside the fan-out (slot/progress counters). On any problem, complete with
  // the trace; e3-finalize detects the missing file and runs the repair round.
  const output = extractNsToolOutput(step.interaction?.payload?.[0], ENTITY_TOOL);
  if (output.status === 'failed') {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `entity returned failed | ${output.trace.join('\n')}`, 'input_output')];
  }

  const artifact = prepareE3EntityArtifact({ ...output.result, entityId: parsedArgs.entityId || output.result.entityId });
  const schema = await readE3Schema('e3-entity.schema');
  const gate = await runNsGate({
    stepId: STEP_ID,
    schema,
    artifact,
    validate: item => validateE3EntityInvariants(item, { model }),
  });

  const attempt = parsedArgs.retryAttempt || gate.attempts;
  if (!gate.ok) {
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, `e3-entity-${artifact.entityId}`, AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `gate failed | ${traceMsg}`, 'input_output')];
  }

  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: `${moduleName}/ontology`, shortName: artifact.entityId, extension: '.defs.ts' },
    `${moduleName}Entity${artifact.entityId}`,
    artifact,
  );
  await writeNsTrace(moduleName, `e3-entity-${artifact.entityId}`, AGENT_NAME, attempt, { artifact, gate });
  return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `${artifact.entityId} defs saved`, 'input_output')];
}

// e3-finalize (no LLM): unlocked when the e3-ontology step (plan + fan-out) completes. Verifies
// every entity file on disk; missing ones get ONE sequential repair round (normal steps, outside
// the fan-out), then a second finalize checks again. On green: index markdown, pipeline approval
// and the completed 'e3-done' anchor.
async function runE3Finalize(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E3Args,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = nsFindMutableParentStep(context, parentStep);
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE3Module();
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);

  const entities: NsE3EntityArtifact[] = [];
  const missing: string[] = [];
  for (const modelEntity of model.entities) {
    const saved = await readJsonDefs<NsE3EntityArtifact>(moduleName, modelEntity.entityId);
    if (saved) entities.push(saved);
    else missing.push(modelEntity.entityId);
  }

  if (missing.length > 0 && !parsedArgs.repairAttempt) {
    const repairs = missing.map((entityId, index) => nsAgentStepIntent(context, mutationParent, {
      agentName: AGENT_NAME,
      stepTitle: `Repair entity ${entityId}`,
      planId: `e3-entity-repair-${index + 1}-${entityId}`,
      prompt: { planId: 'e3-entity', moduleName, entityId, retryAttempt: 2 },
    }));
    const repairPlanIds = repairs.map(intent => (intent.step.planning as { planId: string }).planId);
    return [
      ...repairs,
      nsAgentStepIntent(context, mutationParent, {
        agentName: AGENT_NAME,
        stepTitle: 'Finalize ontology (after repair)',
        planId: 'e3-finalize-2',
        dependsOn: repairPlanIds,
        status: 'waiting_dependency',
        prompt: { planId: 'e3-finalize', moduleName, repairAttempt: 2 },
      }),
      nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `${missing.length} entities missing (${missing.join(', ')}); repair round started`),
    ];
  }
  if (missing.length > 0) {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `entities missing after repair round: ${missing.join(', ')}`)];
  }

  await writeMarkdownArtifact(
    nsPipelineArtifactFileInfo(moduleName, 'e3-ontology', '.md'),
    renderE3OntologyMarkdown(model, entities, { generatedAt: new Date().toISOString() }),
  );
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  pipeline = approveNsStep(pipeline, STEP_ID, 'auto');
  await writeNsPipeline(pipeline);

  return [
    nsResultStepIntent(context, mutationParent, {
      planId: DONE_ANCHOR,
      dependsOn: [STEP_ID],
      stepTitle: 'Ontology ready',
      result: { type: DONE_ANCHOR, moduleName, entities: model.entities.map(entity => entity.entityId) },
    }),
    nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `e3-ontology approved for ${moduleName}`),
  ];
}

async function resolveE3Module(requested?: string): Promise<string> {
  if (requested) return normalizeModuleFolderName(requested);
  const { listExistingModuleFolders } = await import('/_102020_/l2/agentNewSolution/helpers/nsFs.js');
  for (const moduleName of listExistingModuleFolders()) {
    const pipeline = await readNsPipeline(moduleName);
    if (!pipeline) continue;
    const checkpoint = pipeline.steps['checkpoint-journeys'];
    const e3 = pipeline.steps[STEP_ID];
    if (checkpoint?.status === 'approved' && (!e3 || e3.status !== 'approved' || e3.dirty)) return moduleName;
  }
  throw new Error(`[${AGENT_NAME}] no module with an approved journeys checkpoint waiting for E3`);
}

// Ontology defs files are `export const x = {...} as const;` — extract the JSON block.
async function readJsonDefs<T>(moduleName: string, shortName: string): Promise<T | null> {
  const raw = await readStorText({ project: mls.actualProject || 0, level: 4, folder: `${moduleName}/ontology`, shortName, extension: '.defs.ts' }, false);
  if (!raw.trim()) return null;
  const start = raw.indexOf('= {');
  const end = raw.lastIndexOf('} as const;');
  if (start < 0 || end < 0) return null;
  const parsed = parseMaybeJson(raw.slice(start + 2, end + 1));
  return isRecord(parsed) ? parsed as T : null;
}

async function readE3Schema(shortName: string): Promise<Record<string, unknown>> {
  const raw = await readNsText('schemas', shortName, '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error(`[${AGENT_NAME}] invalid schema ${shortName}`);
  return parsed;
}

async function readNsText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(nsL2File(`${NS_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

function parseE3Args(value: unknown): E3Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return {};
  return {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
    entityId: readString(parsed.entityId),
    repairAttempt: typeof parsed.repairAttempt === 'number' ? parsed.repairAttempt : undefined,
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: readString(parsed.retryContext),
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
