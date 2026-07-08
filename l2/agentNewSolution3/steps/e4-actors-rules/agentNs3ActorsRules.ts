/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e4-actors-rules/agentNs3ActorsRules.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E4 — actors + consolidated rules + external refs. SINGLE LLM call (planId
// "e4-actors-rules-refs"): reads the frozen e2-journeys.json (actors + per-journey
// businessRules) and e3-model.json (entity ids for appliesTo), produces the actor
// roster (roleScope attached deterministically as "{module}:{actorId}"), the
// consolidated rule set (every E2 journey businessRule absorbed verbatim via
// sourceJourneyRules) and the external references (mdm/horizontals/plugins/agents)
// that E7 copies into module.defs.ts approvedArtifacts.
// Retry = 1, with the gate error in context (dynamic "-retry" step). No LLM critic.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  NS3_AGENT_FOLDER,
  ns3PipelineArtifactFileInfo,
  ns3L2File,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeDefsArtifact,
  writeJsonArtifact,
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
  prepareE4Artifact,
  renderE4Markdown,
  validateE4Invariants,
} from '/_102020_/l2/agentNewSolution3/steps/e4-actors-rules/gate.js';

const AGENT_NAME = 'agentNs3ActorsRules';
const STEP_ID = 'e4-actors-rules-refs';
const DONE_ANCHOR = 'e4-done';
const TOOL_NAME = 'submitNs3ActorsRules';
const STEP_FOLDER = `${NS3_AGENT_FOLDER}/steps/e4-actors-rules`;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: STEP_FOLDER,
    agentDescription: 'E4 - actors, consolidated rules and external refs for agentNewSolution3',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface E4Args {
  planId?: string;
  moduleName?: string;
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
  const parsedArgs = parseE4Args(hookArgs);

  const moduleName = await resolveE4Module(parsedArgs.moduleName);
  const journeys = await readJsonArtifact<Ns3E2JourneysArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<Ns3E3ModelArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);

  const schema = await readE4Schema();
  const platform = await readNs3Text('skills', 'platform', '.md', true);
  const prompt = await readNs3Text('steps/e4-actors-rules', 'prompt', '.md', true);
  const humanPrompt = [
    `## moduleName: ${moduleName} / userLanguage: ${journeys.userLanguage}`,
    '',
    '## E2 actors (frozen — every actorId below MUST be in the roster)',
    JSON.stringify(journeys.actors, null, 2),
    '',
    '## E2 journey business rules (PRIMARY source — copy strings VERBATIM into sourceJourneyRules)',
    JSON.stringify(journeys.journeys.map(journey => ({ journeyId: journey.journeyId, businessRules: journey.businessRules })), null, 2),
    '',
    '## E2 features (context)',
    JSON.stringify(journeys.features.map(feature => ({ featureId: feature.featureId, title: feature.title, priority: feature.priority })), null, 2),
    '',
    '## E3 entities (the ONLY valid appliesTo targets)',
    JSON.stringify(model.entities.map(entity => ({ entityId: entity.entityId, title: entity.title, kind: entity.kind, ownership: entity.ownership })), null, 2),
    '',
    '## E3 relationships (context)',
    JSON.stringify(model.relationships, null, 2),
    parsedArgs.retryContext ? `\n## Gate retry context (fix exactly these problems)\n${parsedArgs.retryContext}\n` : '',
  ].filter(Boolean).join('\n');

  return [{
    type: 'prompt_ready',
    args: hookArgs,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: `${prompt.split('{{toolName}}').join(TOOL_NAME)}\n\n${platform}\n\n${buildNs3ToolInstruction(TOOL_NAME, 'the E2 journeys or E3 model artifact is missing or unusable')}`,
    humanPrompt,
    tools: [createNs3ToolSchema(TOOL_NAME, 'Submit the E4 actors, consolidated rules and external refs.', schema)],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  } as mls.msg.AgentIntentPromptReady];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = ns3FindMutableParentStep(context, parentStep);
  const parsedArgs = parseE4Args(step.prompt);
  try {
    return await handleActorsRulesResult(context, mutationParent, step, hookSequential, parsedArgs);
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (parsedArgs.moduleName) {
      await writeNs3Trace(normalizeModuleFolderName(parsedArgs.moduleName), STEP_ID, AGENT_NAME, parsedArgs.retryAttempt || 1, { stepId: step.stepId }, traceMsg);
    }
    return [ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }
}

async function handleActorsRulesResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E4Args,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = await resolveE4Module(parsedArgs.moduleName);
  const journeys = await readJsonArtifact<Ns3E2JourneysArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<Ns3E3ModelArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);

  const output = extractNs3ToolOutput(step.interaction?.payload?.[0], TOOL_NAME);
  if (output.status === 'failed') {
    return [ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', output.trace.join('\n') || 'E4 actors/rules returned failed')];
  }

  const artifact = prepareE4Artifact(output.result, { moduleName, userLanguage: journeys.userLanguage });
  const gateContext = {
    moduleName,
    e2Actors: journeys.actors.map(actor => actor.actorId),
    e2BusinessRules: journeys.journeys.flatMap(journey => journey.businessRules || []),
    entityIds: model.entities.map(entity => entity.entityId),
  };
  const schema = await readE4Schema();
  let pipeline = await readNs3Pipeline(moduleName) || createNs3Pipeline(moduleName);
  pipeline = markNs3StepRunning(pipeline, STEP_ID, { e2CreatedAt: journeys.createdAt, e3CreatedAt: model.createdAt, retryContext: parsedArgs.retryContext || '' });
  const gate = await runNs3Gate({
    stepId: STEP_ID,
    schema,
    artifact,
    inputs: { e2CreatedAt: journeys.createdAt, e3CreatedAt: model.createdAt },
    pipeline,
    validate: item => validateE4Invariants(item, gateContext),
  });
  if (gate.pipeline) pipeline = gate.pipeline;
  if (gate.ok) pipeline = approveNs3Step(pipeline, STEP_ID, 'auto');
  await writeNs3Pipeline(pipeline);
  await writeJsonArtifact(ns3PipelineArtifactFileInfo(moduleName, 'e4-actors-rules', '.json'), artifact);

  const attempt = parsedArgs.retryAttempt || gate.attempts;
  if (!gate.ok) {
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNs3Trace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
    // Keep the pipeline alive on attempt 1: 'failed' would fail the whole task and orphan the retry
    // (downstream depends only on the 'e4-done' anchor, so completing this run unlocks nothing).
    if (attempt < 2) {
      return [
        ns3AgentStepIntent(context, mutationParent, {
          agentName: AGENT_NAME,
          stepTitle: 'Retry E4 actors/rules gate',
          planId: `e4-actors-rules-refs-retry-${Date.now()}`,
          prompt: { planId: STEP_ID, moduleName, retryAttempt: 2, retryContext: gate.retryContext || traceMsg },
        }),
        ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `gate failed (attempt ${attempt}), retrying | ${traceMsg}`),
      ];
    }
    return [ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }

  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: 'actors', shortName: `${moduleName}Actors`, extension: '.defs.ts' },
    `${moduleName}Actors`,
    {
      moduleName,
      actors: artifact.actors.map(actor => ({ actorId: actor.actorId, title: actor.title, description: actor.description, roleScope: actor.roleScope })),
    },
  );
  // Rules defs are written even when the rule set is empty (contract artifact for Stage 2/3).
  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: 'rules', shortName: `${moduleName}Rules`, extension: '.defs.ts' },
    `${moduleName}Rules`,
    {
      ruleSetId: `${moduleName}Rules`,
      rules: artifact.rules.map(rule => ({ ruleId: rule.ruleId, title: rule.title, description: rule.description, appliesTo: rule.appliesTo, layer: rule.layer })),
    },
  );
  await writeMarkdownArtifact(
    ns3PipelineArtifactFileInfo(moduleName, 'e4-actors-rules', '.md'),
    renderE4Markdown(artifact, { generatedAt: new Date().toISOString() }),
  );
  await writeNs3Trace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate });

  // Done anchor BEFORE completing this step (parent auto-completion rule).
  return [
    ns3ResultStepIntent(context, mutationParent, {
      planId: DONE_ANCHOR,
      dependsOn: [STEP_ID],
      stepTitle: 'Actors and rules ready',
      result: {
        type: DONE_ANCHOR,
        moduleName,
        actors: artifact.actors.map(actor => actor.actorId),
        rules: artifact.rules.map(rule => rule.ruleId),
      },
    }),
    ns3UpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `e4-actors-rules approved for ${moduleName} (${artifact.actors.length} actors, ${artifact.rules.length} rules)`),
  ];
}

async function resolveE4Module(requested?: string): Promise<string> {
  if (requested) return normalizeModuleFolderName(requested);
  const { listExistingModuleFolders } = await import('/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js');
  for (const moduleName of listExistingModuleFolders()) {
    const pipeline = await readNs3Pipeline(moduleName);
    if (!pipeline) continue;
    const e3 = pipeline.steps['e3-ontology'];
    const e4 = pipeline.steps[STEP_ID];
    if (e3?.status === 'approved' && (!e4 || e4.status !== 'approved' || e4.dirty)) return moduleName;
  }
  throw new Error(`[${AGENT_NAME}] no module with an approved E3 ontology waiting for E4`);
}

async function readE4Schema(): Promise<Record<string, unknown>> {
  const raw = await readNs3Text('schemas', 'e4-actors-rules.schema', '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error(`[${AGENT_NAME}] invalid schema e4-actors-rules.schema`);
  return parsed;
}

async function readNs3Text(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(ns3L2File(`${NS3_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

function parseE4Args(value: unknown): E4Args {
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
