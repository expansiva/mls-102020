/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e5-behavior/agentNsBehavior.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E5 — workflows + operations. Runs handled by ONE agent (single maintenance unit):
// - planId "e5-workflows-operations": the CLASSIFICATION call. Reads e2-journeys.json,
//   e3-model.json and e4-actors-rules.json, produces e5-classification.json (which workflows
//   and operations exist, mapped to features/actors/entities) and starts the workflows parallel
//   fan-out (hosted under this step) plus the 'e5-operations-phase' barrier step.
// - planId "e5-workflow" / "e5-operation": one fan-out CHILD per item (collab-messages parallel
//   system, 5 slots, compact selector args 'workflow:orderLifecycle' / 'operation:createOrder').
//   Each workflow call produces l4/{module}/workflows/{workflowId}.defs.ts (states/transitions/story +
//   deterministic attach); each operation call produces l4/{module}/operations/{operationId}.defs.ts
//   (reads/writes/accessPattern/inputs + deterministic attach). Children NEVER return 'failed'.
// - planId "e5-operations-phase" (no LLM): unlocked when the e5-workflows-operations step
//   (classification + workflows fan-out) completes — the workflows→operations barrier. Starts the
//   operations fan-out and the 'e5-finalize' step.
// - planId "e5-finalize" (no LLM): verifies every defs file on disk, runs ONE sequential repair
//   round for missing items, then writes e5-behavior.md, approves the pipeline step and emits the
//   completed "e5-done" anchor. Retry = 1 for the classification gate. No LLM critic.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  NS_AGENT_FOLDER,
  nsL2File,
  nsOperationsFolder,
  nsPipelineArtifactFileInfo,
  nsWorkflowsFolder,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeDefsArtifact,
  writeJsonArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { normalizeModuleFolderName, normalizeNsId } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';
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
import { nsLlmInfraFailureIntents } from '/_102020_/l2/agentNewSolution/helpers/nsLlmRetry.js';
import {
  approveNsStep,
  createNsPipeline,
  markNsDownstreamDirty,
  markNsStepRunning,
  readNsPipeline,
  writeNsPipeline,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import { writeNsTrace, nsPromptChars, readLastNsTraceError } from '/_102020_/l2/agentNewSolution/helpers/nsTrace.js';
import { NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import { NsE3EntityArtifact, NsE3ModelArtifact, toPascalCase } from '/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js';
import {
  attachOperationDeterministic,
  attachWorkflowDeterministic,
  computeE5WorkflowDemotions,
  demoteE5OperationDefs,
  NsE5ClassificationArtifact,
  NsE5EntityDefsInfo,
  NsE5FeatureRef,
  NS_E5_SOURCES,
  NsE5OperationDefs,
  NsE5WorkflowDefs,
  prepareE5Classification,
  prepareE5Operation,
  prepareE5Workflow,
  renderE5Markdown,
  validateE5Classification,
  validateE5Operation,
  validateE5Workflow,
} from '/_102020_/l2/agentNewSolution/steps/e5-behavior/gate.js';

const AGENT_NAME = 'agentNsBehavior';
const STEP_ID = 'e5-workflows-operations';
const DONE_ANCHOR = 'e5-done';
const CLASSIFICATION_TOOL = 'submitNsClassification';
const WORKFLOW_TOOL = 'submitNsWorkflow';
const OPERATION_TOOL = 'submitNsOperation';
const STEP_FOLDER = `${NS_AGENT_FOLDER}/steps/e5-behavior`;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: STEP_FOLDER,
    agentDescription: 'E5 - behavior classification and per workflow/operation generation for agentNewSolution',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface E5Args {
  planId?: string;
  moduleName?: string;
  itemId?: string;
  repairAttempt?: number;
  retryAttempt?: number;
  retryContext?: string;
  llmRetry?: boolean;
}

// Local view of pipeline/e4-actors-rules.json — only the fields E5 consumes.
// The canonical types live with the E4 step gate.
interface NsE4Actor {
  actorId: string;
  name?: string;
  description?: string;
  roleScope?: string;
}

interface NsE4Rule {
  ruleId: string;
  appliesTo: string[];
  title?: string;
  description?: string;
}

interface NsE4ActorsRulesArtifact {
  actors: NsE4Actor[];
  rules: NsE4Rule[];
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
  // Parallel fan-out children receive the compact selector ('workflow:orderLifecycle') as args.
  const parsedArgs = selectorToE5Args(nsParseSelector(hookArgs)) || parseE5Args(hookArgs);

  if (parsedArgs.planId === 'e5-workflow') return [await buildWorkflowPrompt(context, parentStep, hookSequential, parsedArgs, hookArgs)];
  if (parsedArgs.planId === 'e5-operation') return [await buildOperationPrompt(context, parentStep, hookSequential, parsedArgs, hookArgs)];
  if (parsedArgs.planId === 'e5-operations-phase') return runE5OperationsPhase(context, parentStep, step, hookSequential, parsedArgs);
  if (parsedArgs.planId === 'e5-finalize') return runE5Finalize(context, parentStep, step, hookSequential, parsedArgs);
  return [await buildClassificationPrompt(context, parentStep, hookSequential, parsedArgs, hookArgs)];
}

async function buildClassificationPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E5Args,
  hookArgs: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const moduleName = await resolveE5Module(parsedArgs.moduleName);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const actorsRules = await readE4Artifact(moduleName);

  const schema = await readE5Schema('e5-classification.schema');
  const platform = await readNsText('skills', 'platform', '.md', true);
  const prompt = await readNsText('steps/e5-behavior', 'prompt', '.md', true);
  const humanPrompt = [
    '## E2 journeys and features (frozen, primary source)',
    JSON.stringify({ journeys: journeys.journeys, features: journeys.features }, null, 2),
    '',
    '## E3 entity index (valid entity ids; statusEnum marks stateful entities)',
    JSON.stringify(model.entities.map(entity => ({
      entityId: entity.entityId,
      title: entity.title,
      kind: entity.kind,
      ...(entity.statusEnum?.length ? { statusEnum: entity.statusEnum } : {}),
    })), null, 2),
    '',
    '## E4 actor roster (valid actorIds)',
    JSON.stringify(actorsRules.actors, null, 2),
    '',
    '## E4 rules (context for classification)',
    JSON.stringify(actorsRules.rules, null, 2),
    '',
    `## moduleName: ${moduleName} / userLanguage: ${journeys.userLanguage}`,
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
    systemPrompt: `${prompt.split('{{toolName}}').join(CLASSIFICATION_TOOL)}\n\n${platform}\n\n${buildNsToolInstruction(CLASSIFICATION_TOOL, 'the E2/E3/E4 artifacts are missing or unusable')}`,
    humanPrompt,
    tools: [createNsToolSchema(CLASSIFICATION_TOOL, 'Submit the E5 workflows/operations classification.', schema)],
    toolChoice: { type: 'function', function: { name: CLASSIFICATION_TOOL } },
  } as mls.msg.AgentIntentPromptReady;
}

async function buildWorkflowPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E5Args,
  hookArgs: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE5Module();
  const classification = await readClassification(moduleName);
  const target = classification.workflows.find(item => item.workflowId === parsedArgs.itemId);
  if (!target) throw new Error(`[${AGENT_NAME}] workflow ${parsedArgs.itemId} not found in e5-classification.json`);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const actorsRules = await readE4Artifact(moduleName);

  const primaryDefs = await readJsonDefs<NsE3EntityArtifact>(`${moduleName}/ontology`, target.primaryEntity);
  // The workflow touches its primary entity plus the entities of its classified operations.
  const workflowEntities = new Set<string>([target.primaryEntity]);
  for (const operation of classification.operations) {
    if (target.operationIds.includes(operation.operationId)) workflowEntities.add(operation.entity);
  }
  const relatedJourneys = journeys.journeys.filter(journey =>
    journey.steps.some(item => item.featureRefs.some(ref => target.featureRefs.includes(ref))));
  const relatedRules = actorsRules.rules.filter(rule => rule.appliesTo.some(entity => workflowEntities.has(entity)));

  const schema = await readE5Schema('e5-workflow.schema');
  const prompt = await readNsText('steps/e5-behavior', 'promptWorkflow', '.md', true);
  const humanPrompt = [
    '## Target workflow (from e5-classification.json — ids are FIXED)',
    JSON.stringify(target, null, 2),
    '',
    '## Primary entity defs (full fields and statusEnum)',
    primaryDefs ? JSON.stringify(primaryDefs, null, 2) : '(no defs on disk)',
    '',
    '## Related E2 journeys (business rules included)',
    JSON.stringify(relatedJourneys.map(journey => ({
      journeyId: journey.journeyId,
      actorId: journey.actorId,
      title: journey.title,
      goal: journey.goal,
      steps: journey.steps,
      outcome: journey.outcome,
      businessRules: journey.businessRules,
    })), null, 2),
    '',
    '## Related E4 rules (valid rulesApplied ids)',
    JSON.stringify(relatedRules, null, 2),
    '',
    '## Valid operationIds (copy exactly this set)',
    target.operationIds.join(', '),
    '',
    '## Valid entity ids',
    model.entities.map(entity => entity.entityId).join(', '),
    '',
    '## Valid actor ids',
    actorsRules.actors.map(actor => actor.actorId).join(', '),
    '',
    `## userLanguage: ${journeys.userLanguage}`,
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
    systemPrompt: `${prompt.split('{{toolName}}').join(WORKFLOW_TOOL)}\n\n${buildNsToolInstruction(WORKFLOW_TOOL, 'the target workflow is missing from the classification')}`,
    humanPrompt,
    tools: [createNsToolSchema(WORKFLOW_TOOL, 'Submit one canonical workflow definition.', schema)],
    toolChoice: { type: 'function', function: { name: WORKFLOW_TOOL } },
  } as mls.msg.AgentIntentPromptReady;
}

async function buildOperationPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E5Args,
  hookArgs: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE5Module();
  const classification = await readClassification(moduleName);
  const target = classification.operations.find(item => item.operationId === parsedArgs.itemId);
  if (!target) throw new Error(`[${AGENT_NAME}] operation ${parsedArgs.itemId} not found in e5-classification.json`);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const actorsRules = await readE4Artifact(moduleName);

  const targetDefs = await readJsonDefs<NsE3EntityArtifact>(`${moduleName}/ontology`, target.entity);
  const relatedSteps = journeys.journeys.flatMap(journey =>
    journey.steps
      .filter(item => item.featureRefs.some(ref => target.featureRefs.includes(ref)))
      .map(item => ({ journeyId: journey.journeyId, title: item.title, intent: item.intent, result: item.result })));
  const relatedRules = actorsRules.rules.filter(rule => rule.appliesTo.includes(target.entity));

  const schema = await readE5Schema('e5-operation.schema');
  const prompt = await readNsText('steps/e5-behavior', 'promptOperation', '.md', true);
  const humanPrompt = [
    '## Target operation (from e5-classification.json — operationId/actor/entity/kind are FIXED)',
    JSON.stringify(target, null, 2),
    '',
    '## Target entity defs (full fields and statusEnum)',
    targetDefs ? JSON.stringify(targetDefs, null, 2) : '(no defs on disk)',
    '',
    '## All valid entity ids (usable in reads/writes and Entity.field refs)',
    model.entities.map(entity => entity.entityId).join(', '),
    '',
    '## Related E2 journey steps (source for acceptanceAssertions)',
    JSON.stringify(relatedSteps, null, 2),
    '',
    '## Related E4 rules (valid rulesApplied ids)',
    JSON.stringify(relatedRules, null, 2),
    '',
    '## Valid input/context sources',
    NS_E5_SOURCES.join(', '),
    '',
    '## Valid actor ids',
    actorsRules.actors.map(actor => actor.actorId).join(', '),
    '',
    `## userLanguage: ${journeys.userLanguage}`,
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
    systemPrompt: `${prompt.split('{{toolName}}').join(OPERATION_TOOL)}\n\n${buildNsToolInstruction(OPERATION_TOOL, 'the target operation is missing from the classification')}`,
    humanPrompt,
    tools: [createNsToolSchema(OPERATION_TOOL, 'Submit one canonical operation definition.', schema)],
    toolChoice: { type: 'function', function: { name: OPERATION_TOOL } },
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
  const parsedArgs = selectorToE5Args(nsParseSelector(step.prompt)) || parseE5Args(step.prompt);
  // P2: only the classification is a single LLM call with no net (fan-out children have the finalize
  // repair round; e5-operations-phase/e5-finalize make no LLM call). Retry the classification once.
  if (parsedArgs.planId === STEP_ID) {
    const infraIntents = nsLlmInfraFailureIntents({
      context, mutationParent, step, hookSequential, agentName: AGENT_NAME, stepId: STEP_ID,
      retryPrompt: { moduleName: parsedArgs.moduleName }, alreadyRetried: parsedArgs.llmRetry === true,
    });
    if (infraIntents) return infraIntents;
  }
  try {
    if (parsedArgs.planId === 'e5-workflow') return await handleWorkflowResult(context, mutationParent, step, hookSequential, parsedArgs);
    if (parsedArgs.planId === 'e5-operation') return await handleOperationResult(context, mutationParent, step, hookSequential, parsedArgs);
    return await handleClassificationResult(context, mutationParent, step, hookSequential, parsedArgs);
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (parsedArgs.moduleName) {
      await writeNsTrace(normalizeModuleFolderName(parsedArgs.moduleName), STEP_ID, AGENT_NAME, parsedArgs.retryAttempt || 1, { stepId: step.stepId }, traceMsg);
    }
    // Workflow/operation runs live inside the parallel fan-out: a 'failed' child fails the parent
    // (and the task). Complete-with-trace instead; the e5-finalize repair round regenerates the
    // missing files.
    if (parsedArgs.planId === 'e5-workflow' || parsedArgs.planId === 'e5-operation') {
      return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `item run failed | ${traceMsg}`, 'input_output')];
    }
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }
}

async function handleClassificationResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E5Args,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = await resolveE5Module(parsedArgs.moduleName);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const actorsRules = await readE4Artifact(moduleName);

  const output = extractNsToolOutput(step.interaction?.payload?.[0], CLASSIFICATION_TOOL);
  if (output.status === 'failed') {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', output.trace.join('\n') || 'E5 classification returned failed')];
  }

  const artifact = prepareE5Classification(output.result, { moduleName });
  const gateContext = {
    moduleName,
    actorIds: actorsRules.actors.map(actor => actor.actorId),
    entityIds: model.entities.map(entity => entity.entityId),
    features: toFeatureRefs(journeys),
    entityDefs: await readEntityDefsInfo(moduleName, model),
    entityKinds: Object.fromEntries(model.entities.map(entity => [entity.entityId, entity.kind])),
  };
  const schema = await readE5Schema('e5-classification.schema');
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  pipeline = markNsStepRunning(pipeline, STEP_ID, { e2CreatedAt: journeys.createdAt, e3CreatedAt: model.createdAt, retryContext: parsedArgs.retryContext || '' });
  const gate = await runNsGate({
    stepId: STEP_ID,
    schema,
    artifact,
    inputs: { e2CreatedAt: journeys.createdAt, e3CreatedAt: model.createdAt },
    pipeline,
    validate: item => validateE5Classification(item, gateContext),
  });
  if (gate.pipeline) pipeline = gate.pipeline;
  await writeNsPipeline(pipeline);
  await writeJsonArtifact(nsPipelineArtifactFileInfo(moduleName, 'e5-classification', '.json'), artifact);

  const attempt = parsedArgs.retryAttempt || gate.attempts;
  if (!gate.ok) {
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
    // Keep the pipeline alive on attempt 1: 'failed' would fail the whole task and orphan the retry
    // (downstream depends only on the 'e5-done' anchor, so completing this run unlocks nothing).
    if (attempt < 2) {
      return [
        nsAgentStepIntent(context, mutationParent, {
          agentName: AGENT_NAME,
          stepTitle: 'Retry E5 classification gate',
          planId: `e5-workflows-operations-retry-${Date.now()}`,
          prompt: { planId: STEP_ID, moduleName, retryAttempt: 2, retryContext: gate.retryContext || traceMsg },
        }),
        nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `gate failed (attempt ${attempt}), retrying | ${traceMsg}`, 'input_output'),
      ];
    }
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }

  await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, attempt, { artifact, gate }, undefined, nsPromptChars(step));
  // Parallel fan-out (collab-messages parallel system, 5 slots, slots reused and deleted at the
  // end): one child per workflow, hosted under THIS step so its completion waits for the fan-out.
  // The 'e5-operations-phase' step unlocks when this step's planId completes — that is the
  // workflows→operations barrier (workflows are defined before their owned operations). The
  // e5-finalize step (added by the phase) verifies files, repairs, approves and emits 'e5-done'.
  const workflowIds = artifact.workflows.map(item => item.workflowId);
  const intents: mls.msg.AgentIntent[] = [];
  const stepTitle: string = `Defining {{completed}}/{{total}} workflows, failed {{failed}}`;

  if (workflowIds.length > 0) {
    intents.push(nsParallelStepIntent(context, step, {
      agentName: AGENT_NAME,
      planId: 'e5-workflows-parallel',
      stepTitle,
      args: workflowIds.map(id => `workflow:${id}`),
      maxParallel: 20,
    }));
  }
  intents.push(nsAgentStepIntent(context, mutationParent, {
    agentName: AGENT_NAME,
    stepTitle: 'Define operations',
    planId: 'e5-operations-phase',
    dependsOn: [STEP_ID],
    status: 'waiting_dependency',
    prompt: { planId: 'e5-operations-phase', moduleName },
  }));
  intents.push(nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `e5-classification ready for ${moduleName} (${artifact.workflows.length} workflows, ${artifact.operations.length} operations)`, 'input_output'));
  return intents;
}

async function handleWorkflowResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E5Args,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE5Module();
  const classification = await readClassification(moduleName);
  const target = classification.workflows.find(item => item.workflowId === parsedArgs.itemId);
  if (!target) throw new Error(`[${AGENT_NAME}] workflow ${parsedArgs.itemId} not found in e5-classification.json`);
  const shared = await readSharedGateInputs(moduleName);

  // Fan-out child policy: NEVER return 'failed' (a failed parallel child fails the parent/task) and
  // never add steps from inside the fan-out (slot/progress counters). On any problem, complete with
  // the trace; e5-finalize detects the missing file and runs the repair round.
  const output = extractNsToolOutput(step.interaction?.payload?.[0], WORKFLOW_TOOL);
  if (output.status === 'failed') {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `workflow returned failed | ${output.trace.join('\n')}`, 'input_output')];
  }

  const artifact = prepareE5Workflow(output.result);
  const schema = await readE5Schema('e5-workflow.schema');
  const gate = await runNsGate({
    stepId: STEP_ID,
    schema,
    artifact,
    validate: item => validateE5Workflow(item, {
      itemId: target.workflowId,
      classification: target,
      actorIds: shared.actorIds,
      entityIds: shared.entityIds,
      ruleIds: shared.ruleIds,
      entityDefs: shared.entityDefs,
    }),
  });

  const attempt = parsedArgs.retryAttempt || gate.attempts;
  if (!gate.ok) {
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, `e5-workflow-${target.workflowId}`, AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `gate failed | ${traceMsg}`, 'input_output')];
  }

  const defs = attachWorkflowDeterministic(artifact, { classification: target, features: shared.features });
  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: nsWorkflowsFolder(moduleName), shortName: target.workflowId, extension: '.defs.ts' },
    `workflow${toPascalCase(target.workflowId)}`,
    defs,
  );
  await writeNsTrace(moduleName, `e5-workflow-${target.workflowId}`, AGENT_NAME, attempt, { artifact: defs, gate });
  return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `${target.workflowId} defs saved`, 'input_output')];
}

async function handleOperationResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E5Args,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE5Module();
  const classification = await readClassification(moduleName);
  const target = classification.operations.find(item => item.operationId === parsedArgs.itemId);
  if (!target) throw new Error(`[${AGENT_NAME}] operation ${parsedArgs.itemId} not found in e5-classification.json`);
  const owningWorkflow = target.workflowId
    ? classification.workflows.find(item => item.workflowId === target.workflowId)
    : undefined;
  const shared = await readSharedGateInputs(moduleName);

  // Fan-out child policy: see handleWorkflowResult — never 'failed', never add steps.
  const output = extractNsToolOutput(step.interaction?.payload?.[0], OPERATION_TOOL);
  if (output.status === 'failed') {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `operation returned failed | ${output.trace.join('\n')}`, 'input_output')];
  }

  const artifact = prepareE5Operation(output.result);
  // Deterministic attach BEFORE the gate: the gate rechecks pageId/commandName/bffName.
  const defs = attachOperationDeterministic(artifact, { moduleName, classification: target, owningWorkflow, features: shared.features });
  const schema = await readE5Schema('e5-operation.schema');
  const gate = await runNsGate({
    stepId: STEP_ID,
    schema,
    artifact,
    validate: () => validateE5Operation(defs, {
      itemId: target.operationId,
      moduleName,
      classification: target,
      actorIds: shared.actorIds,
      entityIds: shared.entityIds,
      ruleIds: shared.ruleIds,
      entityDefs: shared.entityDefs,
    }),
  });

  const attempt = parsedArgs.retryAttempt || gate.attempts;
  if (!gate.ok) {
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, `e5-operation-${target.operationId}`, AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `gate failed | ${traceMsg}`, 'input_output')];
  }

  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: nsOperationsFolder(moduleName), shortName: target.operationId, extension: '.defs.ts' },
    `operation${toPascalCase(target.operationId)}`,
    defs,
  );
  await writeNsTrace(moduleName, `e5-operation-${target.operationId}`, AGENT_NAME, attempt, { artifact: defs, gate });
  return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `${target.operationId} defs saved`, 'input_output')];
}

// e5-operations-phase (no LLM): unlocked when the e5-workflows-operations step (classification +
// workflows fan-out) completes — the workflows→operations barrier. Starts the operations fan-out
// (hosted under THIS step) and the e5-finalize step that unlocks when this step's planId completes.
async function runE5OperationsPhase(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E5Args,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = nsFindMutableParentStep(context, parentStep);
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE5Module();
  const classification = await readClassification(moduleName);
  const operationIds = classification.operations.map(item => item.operationId);

  const intents: mls.msg.AgentIntent[] = [];
  const stepTitle: string = `Defining {{completed}}/{{total}} operations, failed {{failed}}`;

  // Zero operations: skip the fan-out — e5-finalize still validates the disk state.
  if (operationIds.length > 0) {
    intents.push(nsParallelStepIntent(context, step, {
      agentName: AGENT_NAME,
      planId: 'e5-operations-parallel',
      stepTitle,
      args: operationIds.map(id => `operation:${id}`),
      maxParallel: 20,
    }));
  }
  intents.push(nsAgentStepIntent(context, mutationParent, {
    agentName: AGENT_NAME,
    stepTitle: 'Finalize behaviors',
    planId: 'e5-finalize',
    dependsOn: ['e5-operations-phase'],
    status: 'waiting_dependency',
    prompt: { planId: 'e5-finalize', moduleName },
  }));
  intents.push(nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `operations phase started for ${moduleName} (${operationIds.length} operations)`));
  return intents;
}

// e5-finalize (no LLM): unlocked when the e5-operations-phase step (barrier + operations fan-out)
// completes. Verifies every workflow/operation defs file on disk; missing ones get ONE sequential
// repair round (normal steps, outside the fan-out), then a second finalize checks again. On green:
// summary markdown, pipeline approval and the completed 'e5-done' anchor.
async function runE5Finalize(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E5Args,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = nsFindMutableParentStep(context, parentStep);
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : await resolveE5Module();
  const classification = await readClassification(moduleName);

  const workflows: NsE5WorkflowDefs[] = [];
  const operations: NsE5OperationDefs[] = [];
  const missing: { planId: 'e5-workflow' | 'e5-operation'; itemId: string }[] = [];
  for (const workflow of classification.workflows) {
    const saved = await readJsonDefs<NsE5WorkflowDefs>(nsWorkflowsFolder(moduleName), workflow.workflowId);
    if (saved) workflows.push(saved);
    else missing.push({ planId: 'e5-workflow', itemId: workflow.workflowId });
  }
  for (const operation of classification.operations) {
    const saved = await readJsonDefs<NsE5OperationDefs>(nsOperationsFolder(moduleName), operation.operationId);
    if (saved) operations.push(saved);
    else missing.push({ planId: 'e5-operation', itemId: operation.operationId });
  }

  if (missing.length > 0 && !parsedArgs.repairAttempt) {
    const repairs = missing.map((item, index) => nsAgentStepIntent(context, mutationParent, {
      agentName: AGENT_NAME,
      stepTitle: `Repair ${item.planId === 'e5-workflow' ? 'workflow' : 'operation'} ${item.itemId}`,
      planId: `e5-repair-${index + 1}-${item.itemId}`,
      prompt: { planId: item.planId, moduleName, itemId: item.itemId, retryAttempt: 2 },
    }));
    const repairPlanIds = repairs.map(intent => (intent.step.planning as { planId: string }).planId);
    return [
      ...repairs,
      nsAgentStepIntent(context, mutationParent, {
        agentName: AGENT_NAME,
        stepTitle: 'Finalize behaviors (after repair)',
        planId: 'e5-finalize-2',
        dependsOn: repairPlanIds,
        status: 'waiting_dependency',
        prompt: { planId: 'e5-finalize', moduleName, repairAttempt: 2 },
      }),
      nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `${missing.length} items missing (${missing.map(item => item.itemId).join(', ')}); repair round started`),
    ];
  }
  if (missing.length > 0) {
    // P5 (newSolution_14): the reason each item is missing (its gate errors) lives in the per-item
    // trace, NOT in this finalize step. Inline the last recorded error of each missing item AND point
    // at its trace path, so the failure is debuggable from the right place (user report: "o trace não
    // está no step correto").
    const lines = await Promise.all(missing.map(async item => {
      const traceStepId = `${item.planId}-${item.itemId}`;
      const error = await readLastNsTraceError(moduleName, traceStepId, AGENT_NAME);
      const path = `l4/${moduleName}/trace/${normalizeNsId(item.planId)}${toPascalCase(item.itemId)}-agentNsBehavior-*.json`;
      return `${item.itemId}: ${error || '(no trace error found)'} [${path}]`;
    }));
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `items missing after repair round:\n${lines.join('\n')}`)];
  }

  // ── Deterministic reconciliation (102048 finding: workflow engulfment) ─────
  // Operations listed in a workflow without causing any REAL transition (and not the create
  // trigger) are demoted to standalone: classification + workflow defs + operation defs are
  // rewritten. Only possible here — transitions exist only after the per-workflow calls.
  const demotions = computeE5WorkflowDemotions(workflows, classification);
  if (demotions.length > 0) {
    const demotedIds = new Set(demotions.map(item => item.operationId));
    for (const workflow of workflows) {
      const toRemove = demotions.filter(item => item.workflowId === workflow.workflowId).map(item => item.operationId);
      if (toRemove.length === 0) continue;
      workflow.operationIds = workflow.operationIds.filter(id => !toRemove.includes(id));
      workflow.transitions = workflow.transitions.filter(transition => transition.from !== transition.to || !demotedIds.has(transition.on));
      await writeDefsArtifact(
        { project: mls.actualProject || 0, level: 4, folder: nsWorkflowsFolder(moduleName), shortName: workflow.workflowId, extension: '.defs.ts' },
        `workflow${toPascalCase(workflow.workflowId)}`,
        workflow,
      );
    }
    for (const operation of operations) {
      if (!demotedIds.has(operation.operationId)) continue;
      const demoted = demoteE5OperationDefs(operation, moduleName);
      Object.assign(operation, demoted);
      await writeDefsArtifact(
        { project: mls.actualProject || 0, level: 4, folder: nsOperationsFolder(moduleName), shortName: operation.operationId, extension: '.defs.ts' },
        `operation${toPascalCase(operation.operationId)}`,
        demoted,
      );
    }
    for (const workflow of classification.workflows) {
      workflow.operationIds = workflow.operationIds.filter(id => !demotedIds.has(id));
    }
    for (const operation of classification.operations) {
      if (demotedIds.has(operation.operationId)) delete operation.workflowId;
    }
    await writeJsonArtifact(nsPipelineArtifactFileInfo(moduleName, 'e5-classification', '.json'), classification);
    await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, 1, { demotions }, `demoted to standalone (no real transition): ${demotions.map(item => `${item.operationId} (from ${item.workflowId})`).join(', ')}`);

    // Re-run the classification invariants post-demotion: demoted entities may now require a
    // managedEntities entry — the business decision cannot be silently skipped (the 102048 bypass).
    const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
    const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
    const actorsRules = await readE4Artifact(moduleName);
    if (journeys && model) {
      const recheck = validateE5Classification(classification, {
        moduleName,
        actorIds: actorsRules.actors.map(actor => actor.actorId),
        entityIds: model.entities.map(entity => entity.entityId),
        features: toFeatureRefs(journeys),
        entityDefs: await readEntityDefsInfo(moduleName, model),
        entityKinds: Object.fromEntries(model.entities.map(entity => [entity.entityId, entity.kind])),
      });
      const errors = recheck.issues.filter(issue => issue.severity === 'error');
      if (errors.length > 0) {
        const traceMsg = errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
        await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, 2, { demotions, errors }, traceMsg);
        return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `post-demotion classification invalid (business decision needed):\n${traceMsg}`)];
      }
    }
  }

  await writeMarkdownArtifact(
    nsPipelineArtifactFileInfo(moduleName, 'e5-behavior', '.md'),
    renderE5Markdown(classification, workflows, operations, { generatedAt: new Date().toISOString() }),
  );
  // newSolution_10 N4: contracts are no longer emitted here. They are page-shaped bffCall contracts
  // now (the wire view is declared in e6 workspaces), so emission moved to the LAST step (e7), after
  // the workspaces and their projections settle — killing the run-9 staleness.
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  pipeline = approveNsStep(pipeline, STEP_ID, 'auto');
  // newSolution_11 fix: re-running e5 invalidates the already-approved e6/e7 (operations changed →
  // workspaces + contracts stale). No-op on the first run (downstream not yet approved).
  pipeline = markNsDownstreamDirty(pipeline, STEP_ID);
  await writeNsPipeline(pipeline);

  return [
    nsResultStepIntent(context, mutationParent, {
      planId: DONE_ANCHOR,
      dependsOn: [STEP_ID],
      stepTitle: 'Workflows and operations ready',
      result: {
        type: DONE_ANCHOR,
        moduleName,
        workflows: classification.workflows.map(item => item.workflowId),
        operations: classification.operations.map(item => item.operationId),
      },
    }),
    nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `e5-workflows-operations approved for ${moduleName}`),
  ];
}

interface E5SharedGateInputs {
  actorIds: string[];
  entityIds: string[];
  ruleIds: string[];
  features: NsE5FeatureRef[];
  entityDefs: Record<string, NsE5EntityDefsInfo>;
}

// Entity defs on disk (E3 output) indexed for the gates — fields + statusEnum only.
async function readEntityDefsInfo(moduleName: string, model: NsE3ModelArtifact): Promise<Record<string, NsE5EntityDefsInfo>> {
  const entityDefs: Record<string, NsE5EntityDefsInfo> = {};
  for (const entity of model.entities) {
    const saved = await readJsonDefs<NsE3EntityArtifact>(`${moduleName}/ontology`, entity.entityId);
    if (!saved) continue;
    entityDefs[entity.entityId] = {
      fields: (saved.fields || []).map(field => ({ fieldId: field.fieldId })),
      ...(saved.statusEnum?.length ? { statusEnum: [...saved.statusEnum] } : {}),
    };
  }
  return entityDefs;
}

// Roster/entity/rule ids + entity defs read once per item run and shared by both gates.
async function readSharedGateInputs(moduleName: string): Promise<E5SharedGateInputs> {
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const actorsRules = await readE4Artifact(moduleName);

  const entityDefs = await readEntityDefsInfo(moduleName, model);

  return {
    actorIds: actorsRules.actors.map(actor => actor.actorId),
    entityIds: model.entities.map(entity => entity.entityId),
    ruleIds: actorsRules.rules.map(rule => rule.ruleId),
    features: toFeatureRefs(journeys),
    entityDefs,
  };
}

async function readE4Artifact(moduleName: string): Promise<NsE4ActorsRulesArtifact> {
  const raw = await readJsonArtifact<Record<string, unknown>>(nsPipelineArtifactFileInfo(moduleName, 'e4-actors-rules', '.json'), true);
  if (!raw) throw new Error(`[${AGENT_NAME}] e4-actors-rules.json not found for ${moduleName}`);
  const actors = (Array.isArray(raw.actors) ? raw.actors.filter(isRecord) : [])
    .filter(item => typeof item.actorId === 'string' && item.actorId.trim()) as unknown as NsE4Actor[];
  const rules = (Array.isArray(raw.rules) ? raw.rules.filter(isRecord) : [])
    .filter(item => typeof item.ruleId === 'string' && item.ruleId.trim())
    .map(item => ({ ...item, appliesTo: Array.isArray(item.appliesTo) ? item.appliesTo.filter(entry => typeof entry === 'string') : [] })) as unknown as NsE4Rule[];
  return { actors, rules };
}

async function readClassification(moduleName: string): Promise<NsE5ClassificationArtifact> {
  const classification = await readJsonArtifact<NsE5ClassificationArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e5-classification', '.json'), true);
  if (!classification) throw new Error(`[${AGENT_NAME}] e5-classification.json not found for ${moduleName}`);
  return classification;
}

function toFeatureRefs(journeys: NsE2JourneysArtifact): NsE5FeatureRef[] {
  return journeys.features.map(feature => ({ featureId: feature.featureId, priority: feature.priority }));
}

async function resolveE5Module(requested?: string): Promise<string> {
  if (requested) return normalizeModuleFolderName(requested);
  const { listExistingModuleFolders } = await import('/_102020_/l2/agentNewSolution/helpers/nsFs.js');
  for (const moduleName of listExistingModuleFolders()) {
    const pipeline = await readNsPipeline(moduleName);
    if (!pipeline) continue;
    const e4 = pipeline.steps['e4-actors-rules-refs'];
    const e5 = pipeline.steps[STEP_ID];
    if (e4?.status === 'approved' && (!e5 || e5.status !== 'approved' || e5.dirty)) return moduleName;
  }
  throw new Error(`[${AGENT_NAME}] no module with approved E4 waiting for E5`);
}

// Defs files are `export const x = {...} as const;` — extract the JSON block.
async function readJsonDefs<T>(folder: string, shortName: string): Promise<T | null> {
  const raw = await readStorText({ project: mls.actualProject || 0, level: 4, folder, shortName, extension: '.defs.ts' }, false);
  if (!raw.trim()) return null;
  const start = raw.indexOf('= {');
  const end = raw.lastIndexOf('} as const;');
  if (start < 0 || end < 0) return null;
  const parsed = parseMaybeJson(raw.slice(start + 2, end + 1));
  return isRecord(parsed) ? parsed as T : null;
}

async function readE5Schema(shortName: string): Promise<Record<string, unknown>> {
  const raw = await readNsText('schemas', shortName, '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error(`[${AGENT_NAME}] invalid schema ${shortName}`);
  return parsed;
}

async function readNsText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(nsL2File(`${NS_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

// Compact fan-out selectors ('workflow:orderLifecycle', 'operation:createOrder') map to item args;
// JSON prompts (repair steps, retries) keep flowing through parseE5Args.
function selectorToE5Args(selector: { kind: string; id: string } | null): E5Args | null {
  if (selector?.kind === 'workflow') return { planId: 'e5-workflow', itemId: selector.id };
  if (selector?.kind === 'operation') return { planId: 'e5-operation', itemId: selector.id };
  return null;
}

function parseE5Args(value: unknown): E5Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return {};
  return {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
    itemId: readString(parsed.itemId),
    repairAttempt: typeof parsed.repairAttempt === 'number' ? parsed.repairAttempt : undefined,
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: readString(parsed.retryContext),
    llmRetry: parsed.llmRetry === true,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
