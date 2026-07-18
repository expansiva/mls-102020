/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/agentNsJourneys.ts" enhancement="_102027_/l2/enhancementAgent"/>
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import {
  NS_AGENT_FOLDER,
  isRecord,
  listExistingModuleFolders,
  nsL2File,
  nsPipelineArtifactFileInfo,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeJsonArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  approveNsStep,
  createNsPipeline,
  markNsDownstreamDirty,
  markNsStepRunning,
  readNsPipeline,
  writeNsPipeline,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import { writeNsTrace } from '/_102020_/l2/agentNewSolution/helpers/nsTrace.js';
import { NsE1DraftArtifact } from '/_102020_/l2/agentNewSolution/steps/e1-draft/gate.js';
import {
  NsE2JourneysArtifact,
  prepareE2JourneysArtifact,
  renderE2JourneysMarkdown,
  validateE2JourneysInvariants,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import type { NsJourneysReviewPayload } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneysLogic.js';
import { emptyNsJourneysWidgetEdits } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneysLogic.js';
import { isNsFastMode } from '/_102020_/l2/agentNewSolution/helpers/nsFastMode.js';

const AGENT_NAME = 'agentNsJourneys';
const TOOL_NAME = 'submitNsJourneys';
type PlannerStatus = 'ok' | 'failed';

interface NsE2PlannerOutput {
  status: PlannerStatus;
  result: Record<string, unknown>;
  trace: string[];
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NS_AGENT_FOLDER}/steps/e2-journeys`,
    agentDescription: 'E2 - journeys and feature catalog for agentNewSolution',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
    beforeClarificationStep,
    openStepView,
  };
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
  const hookArgs = args || step.prompt || JSON.stringify({ planId: 'e2-journeys' });
  const parsedArgs = parseArgs(hookArgs);
  if (parsedArgs.planId === 'checkpoint-journeys') {
    const moduleName = await resolveE2ReviewModule(parsedArgs.moduleName);
    const artifact = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
    if (!artifact) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
    return [checkpointPromptReady(context, parentStep, hookSequential, moduleName, artifact, hookArgs)];
  }

  const moduleName = await resolveE2Module(parsedArgs.moduleName);
  const draft = await readJsonArtifact<NsE1DraftArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e1-draft', '.json'), true);
  if (!draft) throw new Error(`[${AGENT_NAME}] e1-draft.json not found for ${moduleName}`);
  const previous = parsedArgs.adjustment || parsedArgs.retryContext || parsedArgs.reviewPayload
    ? await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), false)
    : null;

  const schema = await readE2Schema();
  const platform = await readNsText('skills', 'platform', '.md', true);
  const prompt = await readNsText('steps/e2-journeys', 'prompt', '.md', true);
  const humanPrompt = [
    '## E1 draft (only source)',
    JSON.stringify(draft, null, 2),
    '',
    parsedArgs.adjustment ? `## Adjustment request\n${parsedArgs.adjustment}\n` : '',
    parsedArgs.retryContext ? `## Gate retry context\n${parsedArgs.retryContext}\n` : '',
    previous ? `## Current E2 artifact\n${JSON.stringify(previous, null, 2)}\n` : '',
  ].filter(Boolean).join('\n');

  return [{
    type: 'prompt_ready',
    args: hookArgs,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: `${prompt.split('{{toolName}}').join(TOOL_NAME)}\n\n${platform}\n\n${buildToolInstruction()}`,
    humanPrompt,
    tools: [createToolSchema(schema)],
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
  let moduleNameForTrace: string | null = null;
  try {
    const parsedArgs = parseArgs(step.prompt);
    if (parsedArgs.planId === 'checkpoint-journeys') {
      return handleCheckpointPromptResult(context, parentStep, step, hookSequential);
    }

    const output = extractE2Output(step.interaction?.payload?.[0]);
    if (output.status === 'failed') {
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', output.trace.join('\n') || 'E2 journeys returned failed')];
    }
    const moduleName = parsedArgs.moduleName || readString(output.result.moduleName) || '';
    const draft = await readJsonArtifact<NsE1DraftArtifact>(nsPipelineArtifactFileInfo(normalizeModuleFolderName(moduleName), 'e1-draft', '.json'), true);
    const e1ActorIds = (draft?.actors || []).map(actor => actor.actorId);

    const artifact = prepareE2JourneysArtifact(output.result);
    moduleNameForTrace = artifact.moduleName;
    const previous = parsedArgs.adjustment || parsedArgs.retryContext || parsedArgs.reviewPayload
      ? await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(artifact.moduleName, 'e2-journeys', '.json'), false)
      : null;
    if ((parsedArgs.adjustment || parsedArgs.reviewPayload) && previous?.version) {
      artifact.version = Math.max(artifact.version || 1, previous.version + 1);
    }
    const gateInputs = {
      e1DraftCreatedAt: draft?.createdAt || '',
      adjustment: parsedArgs.adjustment || '',
      retryContext: parsedArgs.retryContext || '',
      reviewPayload: parsedArgs.reviewPayload || null,
    };
    const schema = await readE2Schema();
    let pipeline = await readNsPipeline(artifact.moduleName) || createNsPipeline(artifact.moduleName);
    pipeline = markNsStepRunning(pipeline, 'e2-journeys', gateInputs);
    const gate = await runNsGate({
      stepId: 'e2-journeys',
      schema,
      artifact,
      inputs: gateInputs,
      pipeline,
      validate: item => validateE2JourneysInvariants(item, { e1ActorIds }),
    });
    if (gate.pipeline) pipeline = gate.pipeline;
    await writeNsPipeline(pipeline);
    const attempt = parsedArgs.retryAttempt || gate.attempts;
    const markdown = renderE2JourneysMarkdown(artifact, {
      previous,
      adjustment: parsedArgs.adjustment,
      retryContext: parsedArgs.retryContext,
      generatedAt: new Date().toISOString(),
    });
    if (parsedArgs.adjustment || parsedArgs.reviewPayload) {
      await writeJsonArtifact(nsPipelineArtifactFileInfo(artifact.moduleName, `e2-journeys.v${artifact.version}`, '.json'), artifact);
      await writeMarkdownArtifact(nsPipelineArtifactFileInfo(artifact.moduleName, `e2-journeys.v${artifact.version}`, '.md'), markdown);
    }
    await writeJsonArtifact(nsPipelineArtifactFileInfo(artifact.moduleName, 'e2-journeys', '.json'), artifact);
    await writeMarkdownArtifact(nsPipelineArtifactFileInfo(artifact.moduleName, 'e2-journeys', '.md'), markdown);

    if (!gate.ok) {
      const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
      await writeNsTrace(moduleNameForTrace, 'e2-journeys', AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
      const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, 'failed', traceMsg)];
      if (attempt < 2) intents.unshift(addGateRetryStep(context, parentStep, artifact.moduleName, gate.retryContext || traceMsg));
      return intents;
    }

    await writeNsTrace(artifact.moduleName, 'e2-journeys', AGENT_NAME, attempt, { artifact, gate });
    if (parsedArgs.afterAdjustment) {
      await appendE2AuditEvent(artifact.moduleName, {
        eventId: createAuditEventId('adjustment-generated'),
        at: new Date().toISOString(),
        kind: 'adjustment-generated',
        moduleName: artifact.moduleName,
        fromVersion: previous?.version,
        toVersion: artifact.version,
        summary: parsedArgs.adjustment || '',
      });
    }
    const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, 'completed', `e2-journeys ready for ${artifact.moduleName}`, 'input_output')];
    if (parsedArgs.afterAdjustment || !hasStepWithPlanId(context, 'checkpoint-journeys')) {
      intents.unshift(addCheckpointReviewStep(context, parentStep, artifact.moduleName));
    }
    return intents;
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (moduleNameForTrace) await writeNsTrace(moduleNameForTrace, 'e2-journeys', AGENT_NAME, 1, { stepId: step.stepId }, traceMsg);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', traceMsg)];
  }
}

function checkpointPromptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  moduleName: string,
  artifact: NsE2JourneysArtifact,
  hookArgs: string,
): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready',
    args: hookArgs,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildCheckpointSystemPrompt(moduleName),
    humanPrompt: [
      `Render the E2 journeys checkpoint for module "${moduleName}".`,
      `Current artifact version: ${artifact.version}.`,
      'Return only the clarification payload requested in the system prompt.',
    ].join('\n'),
  } as mls.msg.AgentIntentPromptReady;
}

function buildCheckpointSystemPrompt(moduleName: string): string {
  return `<!-- modelType: codefast -->

Return JSON only. Do not call tools. Do not explain.

Required payload:
{
  "type": "clarification",
  "json": {
    "planId": "checkpoint-journeys",
    "moduleName": "${moduleName}",
    "title": "Review E2 journeys"
  }
}`;
}

function handleCheckpointPromptResult(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): mls.msg.AgentIntent[] {
  const result = normalizeCheckpointPayload(step.interaction?.payload?.[0]);
  if (!result.ok) return [updateStatus(context, parentStep, step, hookSequential, 'failed', result.error)];
  return [];
}

function normalizeCheckpointPayload(payload: unknown): { ok: true } | { ok: false; error: string } {
  const parsed = parseMaybeJson(payload);
  const result = isRecord(parsed) && parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
  if (!isRecord(result)) return { ok: false, error: 'checkpoint-journeys did not return a payload object' };
  if (result.type === 'result') return { ok: false, error: readString(result.result) || 'checkpoint-journeys returned result error' };
  if (result.type !== 'clarification') return { ok: false, error: `checkpoint-journeys returned invalid type: ${String(result.type)}` };
  const json = parseMaybeJson(result.json);
  if (!isRecord(json) || json.planId !== 'checkpoint-journeys') return { ok: false, error: 'checkpoint-journeys clarification json is invalid' };
  return { ok: true };
}

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsed = parseCheckpointJson(json);
  if (parsed.planId !== 'checkpoint-journeys') {
    throw new Error(`[${AGENT_NAME}] unsupported clarification ${parsed.planId || '(missing)'}`);
  }
  const moduleName = await resolveE2ReviewModule(parsed.moduleName);
  // /fast (D5): auto-approve the journeys checkpoint with its OWN proposed version — reuse the exact
  // human "approve" path (applyJourneysReview). Step stays visible in the tree, auto-answered.
  if (isNsFastMode(context.task?.iaCompressed?.longMemory)) {
    const artifact = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
    if (!artifact) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
    const fastApprove: NsJourneysReviewPayload = {
      type: 'checkpoint-journeys-answer',
      action: 'approve',
      moduleName,
      version: artifact.version,
      approved: true,
      adjustment: '',
      edits: emptyNsJourneysWidgetEdits(),
      changes: [],
      proposedArtifact: artifact,
    };
    await writeNsTrace(moduleName, 'checkpoint-journeys', AGENT_NAME, 1, { fast: true, version: artifact.version }, '[fast] clarification auto-aceita');
    void applyJourneysReview(context, parentStep, step, hookSequential, fastApprove)
      .catch(error => console.error(`[${agent.agentName}] ${error instanceof Error ? error.message : String(error)}`));
    const placeholder = document.createElement('div');
    placeholder.setAttribute('data-ns-fast', 'checkpoint-auto-approved');
    placeholder.textContent = '[fast] clarification auto-aceita';
    return placeholder;
  }
  await import('/_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneys.js');
  const el = document.createElement('widget-ns-journeys-102020');
  (el as unknown as { value: unknown }).value = { moduleName, mode: 'new-module' };
  el.addEventListener('ns-journeys-review', (event: Event) => {
    const detail = (event as CustomEvent<NsJourneysReviewPayload>).detail;
    void applyJourneysReview(context, parentStep, step, hookSequential, detail)
      .catch(error => console.error(`[${agent.agentName}] ${error instanceof Error ? error.message : String(error)}`));
  });
  return el;
}

async function applyJourneysReview(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  payload: NsJourneysReviewPayload,
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  if (!payload || payload.type !== 'checkpoint-journeys-answer') throw new Error(`[${AGENT_NAME}] invalid journeys review payload`);
  const moduleName = normalizeModuleFolderName(payload.moduleName);
  // Anchor mutations on a non-terminal agent step: the backend rejects add-step /
  // update-status on a completed/failed parent (addTaskAISteps "Parent step cannot be modified").
  const mutationParent = findMutableParentStep(context, parentStep);
  const intents: mls.msg.AgentIntent[] = [
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `checkpoint-journeys ${payload.action}`),
  ];

  if (payload.action === 'approve') {
    intents.unshift(resultStep(context, mutationParent, 'checkpoint-journeys-answer', ['checkpoint-journeys'], 'Journeys approved', {
      type: 'checkpoint-journeys-answer',
      moduleName,
      approved: true,
      version: payload.version,
      changes: payload.changes,
      edits: payload.edits,
    }));
    // Resume mode builds only the e2/checkpoint steps, so the phase-2 chain may not exist yet.
    // Add the missing steps BEFORE the completed answer result lands (open waiting_dependency
    // children also keep the parent chain from auto-completing at approval).
    intents.unshift(...(await buildMissingPhase2AddSteps(context, mutationParent)));
  } else if (payload.action === 'adjust') {
    const requestPlanId = `checkpoint-journeys-adjustment-request-${Date.now()}`;
    const adjustment = buildReviewAdjustmentText(payload);
    // Intent order matters: the OPEN adjustment step must land BEFORE the completed
    // result step. Otherwise setStepCompletedIfChildrenCompleted sees only completed
    // children (the pending clarification in interaction.payload is not counted),
    // auto-completes the parent chain, and the add-step below is rejected.
    intents.unshift(resultStep(context, mutationParent, requestPlanId, ['checkpoint-journeys'], 'Journeys adjustment request', {
      type: 'checkpoint-journeys-adjustment-request',
      moduleName,
      version: payload.version,
      adjustment: payload.adjustment,
      edits: payload.edits,
      changes: payload.changes,
    }));
    intents.unshift(addAdjustmentRunStep(context, mutationParent, moduleName, adjustment, requestPlanId, payload));
  } else {
    throw new Error(`[${AGENT_NAME}] unsupported journeys review action: ${String(payload.action)}`);
  }

  await applyIntentsAndRefresh(context, intents);
  if (payload.action === 'approve') {
    await approveJourneysCheckpoint(moduleName, payload);
  } else {
    await appendE2AuditEvent(moduleName, {
      eventId: createAuditEventId('adjustment-requested'),
      at: new Date().toISOString(),
      kind: 'adjustment-requested',
      moduleName,
      fromVersion: payload.version,
      summary: payload.adjustment || summarizeReviewChanges(payload),
      payload,
    });
  }
  await continuePoolingTask(context);
}

async function approveJourneysCheckpoint(moduleName: string, payload: NsJourneysReviewPayload): Promise<void> {
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  if (pipeline.steps['checkpoint-journeys']?.status === 'approved') {
    pipeline = markNsDownstreamDirty(pipeline, 'e2-journeys');
  }
  pipeline = approveNsStep(pipeline, 'e2-journeys', 'human', payload.version);
  pipeline = approveNsStep(pipeline, 'checkpoint-journeys', 'human', payload.version);
  await writeNsPipeline(pipeline);
  await appendE2AuditEvent(moduleName, {
    eventId: createAuditEventId('approved'),
    at: new Date().toISOString(),
    kind: 'approved',
    moduleName,
    fromVersion: payload.version,
    toVersion: payload.version,
    summary: 'E2 journeys approved by human checkpoint.',
    payload,
  });
}

async function applyIntentsAndRefresh(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) {
    throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying journeys checkpoint');
  }
  const ret = response as mls.msg.ResponseApplyIntents;
  context.task = ret.task;
  if (ret.message) context.message = ret.message;
}

function resultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  planId: string,
  dependsOn: string[],
  stepTitle: string,
  result: unknown,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'result',
      stepId: 0,
      interaction: null,
      stepTitle,
      status: 'completed',
      nextSteps: [],
      result: JSON.stringify(result, null, 2),
      planning: { planId, dependsOn, executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  };
}

function addAdjustmentRunStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  adjustment: string,
  dependsOnPlanId: string,
  payload: NsJourneysReviewPayload,
): mls.msg.AgentIntentAddStep {
  const runId = Date.now();
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: `Adjust E2 journeys v${payload.version}`,
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: AGENT_NAME,
      prompt: JSON.stringify({ planId: 'e2-journeys', moduleName, adjustment, afterAdjustment: true, reviewPayload: payload }),
      rags: [],
      planning: { planId: `e2-journeys-adjustment-${runId}`, dependsOn: [dependsOnPlanId], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
}

function addCheckpointReviewStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
): mls.msg.AgentIntentAddStep {
  const runId = Date.now();
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: 'Review E2 journeys',
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: AGENT_NAME,
      prompt: JSON.stringify({ planId: 'checkpoint-journeys', moduleName }),
      rags: [],
      planning: { planId: `checkpoint-journeys-review-${runId}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
}

async function resolveE2Module(requested?: string): Promise<string> {
  if (requested) {
    const normalized = normalizeModuleFolderName(requested);
    const draft = await readJsonArtifact<NsE1DraftArtifact>(nsPipelineArtifactFileInfo(normalized, 'e1-draft', '.json'), false);
    if (draft) return normalized;
  }
  for (const module of listExistingModuleFolders()) {
    const draft = await readJsonArtifact<NsE1DraftArtifact>(nsPipelineArtifactFileInfo(module, 'e1-draft', '.json'), false);
    if (!draft) continue;
    const pipeline = await readNsPipeline(module);
    if (!pipeline?.steps['e2-journeys'] || pipeline.steps['e2-journeys'].status !== 'approved') return module;
  }
  throw new Error(`[${AGENT_NAME}] no module with an e1-draft ready for E2`);
}

async function resolveE2ReviewModule(requested?: string): Promise<string> {
  if (requested) {
    const normalized = normalizeModuleFolderName(requested);
    const artifact = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(normalized, 'e2-journeys', '.json'), false);
    if (artifact) return normalized;
  }
  for (const module of listExistingModuleFolders()) {
    const artifact = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(module, 'e2-journeys', '.json'), false);
    if (!artifact) continue;
    const pipeline = await readNsPipeline(module);
    if (!pipeline?.steps['checkpoint-journeys'] || pipeline.steps['checkpoint-journeys'].status !== 'approved') return module;
  }
  return resolveE2Module(requested);
}

async function openStepView(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  step: mls.msg.AIAgentStep,
): Promise<HTMLElement> {
  await import('/_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneys.js');
  const moduleName = await resolveOpenViewModule(step);
  const el = document.createElement('widget-ns-journeys-102020');
  (el as unknown as { value: unknown }).value = moduleName
    ? { moduleName, mode: 'new-module' }
    : { readOnly: true };
  return el;
}

async function resolveOpenViewModule(step: mls.msg.AIAgentStep): Promise<string> {
  const parsedArgs = parseArgs(step.prompt);
  if (parsedArgs.moduleName) return normalizeModuleFolderName(parsedArgs.moduleName);

  const payloadModule = readModuleNameFromE2Payload(step.interaction?.payload?.[0]);
  if (payloadModule) return payloadModule;

  for (const module of listExistingModuleFolders()) {
    const artifact = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(module, 'e2-journeys', '.json'), false);
    if (artifact?.moduleName) return artifact.moduleName;
  }
  return '';
}

function readModuleNameFromE2Payload(payload: unknown): string {
  try {
    const output = extractE2Output(payload);
    const moduleName = readString(output.result.moduleName);
    return moduleName ? normalizeModuleFolderName(moduleName) : '';
  } catch {
    return '';
  }
}

interface NsE2AuditEvent {
  eventId: string;
  at: string;
  kind: 'adjustment-requested' | 'adjustment-generated' | 'approved';
  moduleName: string;
  fromVersion?: number;
  toVersion?: number;
  summary: string;
  payload?: unknown;
}

async function appendE2AuditEvent(moduleName: string, event: NsE2AuditEvent): Promise<void> {
  const fileInfo = nsPipelineArtifactFileInfo(moduleName, 'e2-journeys-audit', '.json');
  const existing = await readJsonArtifact<unknown>(fileInfo, false);
  const events = Array.isArray(existing) ? existing as NsE2AuditEvent[] : [];
  events.push(event);
  await writeJsonArtifact(fileInfo, events);
}

function createAuditEventId(kind: NsE2AuditEvent['kind']): string {
  return `${kind}-${Date.now()}`;
}

function buildReviewAdjustmentText(payload: NsJourneysReviewPayload): string {
  return [
    'Apply this human review to the current E2 journeys artifact.',
    'Keep unchanged IDs and text stable. Only change what is required by the review.',
    payload.adjustment ? `\nHuman adjustment prompt:\n${payload.adjustment}` : '',
    `\nWidget edits and change log:\n${JSON.stringify({ edits: payload.edits, changes: payload.changes }, null, 2)}`,
    `\nProposed artifact after direct widget edits:\n${JSON.stringify(payload.proposedArtifact, null, 2)}`,
  ].filter(Boolean).join('\n');
}

function summarizeReviewChanges(payload: NsJourneysReviewPayload): string {
  if (payload.adjustment) return payload.adjustment;
  if (!payload.changes.length) return 'Adjustment requested without explicit change log.';
  return payload.changes.map(change => change.summary).filter(Boolean).join('; ') || 'Adjustment requested from widget edits.';
}

function parseCheckpointJson(value: unknown): { planId?: string; moduleName?: string } {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
  } : {};
}

// Resume mode (agentNewSolution.buildResumeTree) creates only the e2/checkpoint steps.
// On approval the phase-2 chain must exist so 'checkpoint-journeys-answer' can unlock e3.
async function buildMissingPhase2AddSteps(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
): Promise<mls.msg.AgentIntentAddStep[]> {
  const { buildPhase2Steps, getRootPlan } = await import('/_102020_/l2/agentNewSolution/agentNewSolution.js');
  const steps = buildPhase2Steps(getRootPlan(context));
  return steps
    .filter(step => !hasStepWithPlanId(context, step.planning?.planId || ''))
    .map(step => ({
      type: 'add-step',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: parentStep.stepId,
      step,
    } as mls.msg.AgentIntentAddStep));
}

// Same pattern as e1 (agentNsDraft.ts): when the original parent was auto-completed
// by setStepCompletedIfChildrenCompleted, fall back to the nearest mutable agent step.
function findMutableParentStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const current = findStepById(context, parentStep.stepId);
  if (isMutableAgentStep(current)) return current;

  const ownerParentId = findParentStepId(context, parentStep.stepId);
  const ownerParent = ownerParentId ? findStepById(context, ownerParentId) : null;
  if (isMutableAgentStep(ownerParent)) return ownerParent;

  const root = context.task?.iaCompressed?.nextSteps?.[0] || null;
  if (isMutableAgentStep(root)) return root;

  return parentStep;
}

function isMutableAgentStep(step: mls.msg.AIPayload | null): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function findStepById(context: mls.msg.ExecutionContext, stepId: number): mls.msg.AIPayload | null {
  if (!context.task) return null;
  return getAllSteps(context.task.iaCompressed?.nextSteps).find(item => item.stepId === stepId) || null;
}

function findParentStepId(context: mls.msg.ExecutionContext, childStepId: number): number | null {
  if (!context.task) return null;
  for (const item of getAllSteps(context.task.iaCompressed?.nextSteps)) {
    if (item.nextSteps?.some(child => child.stepId === childStepId)) return item.stepId;
    if (item.interaction?.payload?.some(child => child.stepId === childStepId)) return item.stepId;
  }
  return null;
}

function hasStepWithPlanId(context: mls.msg.ExecutionContext, planId: string): boolean {
  if (!context.task) return false;
  return getAllSteps(context.task.iaCompressed?.nextSteps).some(item =>
    (item as { planning?: { planId?: string } }).planning?.planId === planId
  );
}

function addGateRetryStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  retryContext: string,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: 'Retry E2 journeys gate',
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: AGENT_NAME,
      prompt: JSON.stringify({ planId: 'e2-journeys', moduleName, retryAttempt: 2, retryContext }),
      rags: [],
      planning: { planId: `e2-journeys-retry-${Date.now()}`, dependsOn: ['e2-journeys'], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
}

function updateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  const intent: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
  };
  // 'input_output' drops the step's LLM input/payload/trace from the task record once the
  // artifact is safely on disk (DynamoDB item limit is 400KB).
  if (cleaner) intent.cleaner = cleaner;
  return intent;
}

function createToolSchema(resultSchema: Record<string, unknown>): mls.msg.LLMTool {
  return {
    type: 'function',
    function: {
      name: TOOL_NAME,
      description: 'Submit the E2 journeys and feature catalog.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'result', 'trace'],
        properties: {
          status: { enum: ['ok', 'failed'] },
          result: resultSchema,
          trace: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  } as unknown as mls.msg.LLMTool;
}

function extractE2Output(payload: unknown): NsE2PlannerOutput {
  const parsed = parseMaybeJson(payload);
  if (!isRecord(parsed)) throw new Error('missing E2 payload');
  if (parsed.type === 'result') throw new Error(readString(parsed.result) || 'E2 returned result error');

  const direct = tryNormalizeE2Envelope(parsed);
  if (direct) return direct;

  if (parsed.type === 'flexible') {
    const flexible = parseMaybeJson(parsed.result);
    const fromFlexible = tryNormalizeE2Envelope(flexible);
    if (fromFlexible) return fromFlexible;
    const fromFlexibleTool = tryExtractToolOutput(flexible);
    if (fromFlexibleTool) return fromFlexibleTool;
    const fromFlexibleOpenAi = tryExtractOpenAiToolCall(flexible);
    if (fromFlexibleOpenAi) return fromFlexibleOpenAi;
  }

  const fromTool = tryExtractToolOutput(parsed);
  if (fromTool) return fromTool;
  const fromOpenAi = tryExtractOpenAiToolCall(parsed);
  if (fromOpenAi) return fromOpenAi;
  throw new Error(`payload does not contain a recognized ${TOOL_NAME} output`);
}

function tryExtractToolOutput(value: unknown): NsE2PlannerOutput | null {
  const record = parseMaybeJson(value);
  if (!isRecord(record) || record.toolName !== TOOL_NAME) return null;
  return normalizeToolArguments(record.arguments);
}

function normalizeToolArguments(value: unknown, depth = 0): NsE2PlannerOutput {
  const args = parseMaybeJson(value);
  if (!isRecord(args)) throw new Error('tool arguments must be an object');
  const direct = tryNormalizeE2Envelope(args);
  if (direct) return direct;
  if (args.arguments !== undefined && depth < 3) return normalizeToolArguments(args.arguments, depth + 1);
  throw new Error(`tool arguments do not contain ${TOOL_NAME} output`);
}

function tryExtractOpenAiToolCall(value: unknown): NsE2PlannerOutput | null {
  if (!isRecord(value) || !Array.isArray(value.tool_calls)) return null;
  for (const call of value.tool_calls) {
    if (!isRecord(call) || !isRecord(call.function) || call.function.name !== TOOL_NAME) continue;
    return normalizeToolArguments(call.function.arguments);
  }
  return null;
}

function tryNormalizeE2Envelope(value: unknown): NsE2PlannerOutput | null {
  const output = parseMaybeJson(value);
  if (!isRecord(output) || output.result === undefined) return null;
  const result = parseMaybeJson(output.result);
  if (!isRecord(result) || isToolWrapper(result)) return null;
  return {
    status: normalizePlannerStatus(output.status),
    result,
    trace: normalizeStringArray(output.trace),
  };
}

function isToolWrapper(value: unknown): boolean {
  const record = parseMaybeJson(value);
  return isRecord(record) && record.toolName === TOOL_NAME && record.arguments !== undefined;
}

function normalizePlannerStatus(value: unknown): PlannerStatus {
  if (value === undefined) return 'ok';
  if (value === 'ok' || value === 'failed') return value;
  if (value === 'needs_input') return 'ok';
  throw new Error(`invalid planner status: ${String(value)}`);
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => readString(item)).filter((item): item is string => !!item) : [];
}

async function readE2Schema(): Promise<Record<string, unknown>> {
  const raw = await readNsText('schemas', 'e2-journeys.schema', '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error('[readE2Schema] invalid schema');
  return parsed;
}

async function readNsText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(nsL2File(`${NS_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

function parseArgs(value: unknown): {
  planId?: string;
  moduleName?: string;
  adjustment?: string;
  afterAdjustment?: boolean;
  retryAttempt?: number;
  retryContext?: string;
  reviewPayload?: unknown;
} {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
    adjustment: readString(parsed.adjustment),
    afterAdjustment: parsed.afterAdjustment === true,
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: readString(parsed.retryContext),
    reviewPayload: parsed.reviewPayload,
  } : {};
}

function buildToolInstruction(): string {
  return `
Call the "${TOOL_NAME}" tool with only these top-level arguments:
{
  "status": "ok" | "failed",
  "result": E2 artifact matching the JSON schema,
  "trace": []
}

Do not include "type", "toolName", or "arguments" in the tool arguments.
Use status "failed" only when the E1 draft is missing or unusable.
`;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
