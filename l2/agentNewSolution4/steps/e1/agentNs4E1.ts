/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e1/agentNs4E1.ts" enhancement="_blank"/>

import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';

import {
  buildNs4ModuleArtifact,
  createNs4Pipeline,
  isNs4Pipeline,
  markNs4E1Approved,
  normalizeNs4Clarification,
  normalizeNs4ModuleName,
  Ns4ApprovedBy,
  Ns4Clarification,
  Ns4ModuleArtifact,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  listNs4ModuleFolders,
  ns4FileExists,
  ns4ModuleFile,
  readNs4AgentText,
  readNs4Pipeline,
  writeNs4Module,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import { validateNs4E1Module } from '/_102020_/l2/agentNewSolution4/steps/e1/gate.js';

interface Ns4PersistedE1 {
  artifact: Ns4ModuleArtifact;
  artifactPath: string;
}

export async function loadNs4E1SystemPrompt(): Promise<string> {
  const [prompt, platform] = await Promise.all([
    readNs4AgentText('steps/e1', 'prompt'),
    readNs4AgentText('skills', 'platform'),
  ]);
  return prompt.replace('{{platformSkill}}', platform);
}

export async function loadNs4StatusPrompt(message: string): Promise<string> {
  const prompt = await readNs4AgentText('steps/e1', 'promptStatus');
  return prompt.replace('{{message}}', escapePromptMessage(message));
}

export async function afterNs4E1PromptStep(
  agent: unknown,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const payload = unwrapPayload(step.interaction?.payload?.[0]);
  if (isRecord(payload) && payload.type === 'result') {
    if (memoryString(context, 'statusOutcome') === 'error') {
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', readResultMessage(payload))];
    }
    return [];
  }
  if (!isRecord(payload) || payload.type !== 'clarification' || !isRecord(payload.json)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', 'E1 returned an invalid clarification payload.')];
  }
  if (!isFast(context)) return [];
  try {
    const saved = await persistNs4E1(context, payload.json, 'auto');
    return [updateStatus(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      `E1 auto-approved: ${saved.artifactPath}; next step e2-journeys.`,
      'input_output',
    )];
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', errorMessage(error))];
  }
}

export async function beforeNs4E1ClarificationStep(
  agent: unknown,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const clarification = normalizeNs4Clarification(parseMaybeJson(json));
  await import('/_102025_/l2/widgetQuestionsForClarification.js');
  const element = document.createElement('widget-questions-for-clarification-102025');
  (element as unknown as { value: unknown }).value = {
    taskId: context.task?.PK || '',
    stepId: step.stepId,
    title: clarification.title,
    legends: clarification.legends,
    userLanguage: clarification.userLanguage,
    questions: clarification.questions,
    autoAcceptSeconds: 0,
  };
  element.setAttribute('mode', 'new');
  element.addEventListener('clarification-finish', (event: Event) => {
    const detail = (event as CustomEvent<{ value: Ns4Clarification; action: 'continue' | 'cancel' }>).detail;
    void applyNs4E1Clarification(context, parentStep, step, hookSequential, detail.value, detail.action);
  });
  return element;
}

async function applyNs4E1Clarification(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  value: Ns4Clarification,
  action: 'continue' | 'cancel',
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution4] task invalid');
  if (action !== 'continue') {
    await applyIntents(context, [updateStatus(context, parentStep, step, hookSequential, 'failed', 'E1 clarification cancelled.')]);
    return;
  }
  try {
    const saved = await persistNs4E1(context, value, 'human');
    await applyIntents(context, [
      resultStep(context, parentStep, saved),
      updateStatus(context, parentStep, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
    await continuePoolingTask(context);
  } catch (error) {
    await applyIntents(context, [updateStatus(context, parentStep, step, hookSequential, 'failed', errorMessage(error))]);
  }
}

async function persistNs4E1(
  context: mls.msg.ExecutionContext,
  clarification: unknown,
  approvedBy: Ns4ApprovedBy,
): Promise<Ns4PersistedE1> {
  const sourcePrompt = memoryString(context, 'sourcePrompt') || 'new module';
  const artifact = buildNs4ModuleArtifact(sourcePrompt, clarification, approvedBy);
  const moduleName = artifact.module.moduleName;
  const resumeModule = normalizeOptionalModuleName(memoryString(context, 'resumeModule'));
  const existingModules = listNs4ModuleFolders();
  const existingPipeline = await readNs4Pipeline(moduleName);

  if (existingModules.has(moduleName)) {
    const allowedResume = resumeModule === moduleName && isNs4Pipeline(existingPipeline);
    if (!allowedResume) {
      throw new Error(`Módulo "${moduleName}" já existe e não pertence a uma retomada válida do agentNewSolution4.`);
    }
  }

  const now = new Date().toISOString();
  const running = isNs4Pipeline(existingPipeline)
    ? {
      ...existingPipeline,
      sourcePrompt: existingPipeline.sourcePrompt || sourcePrompt,
      steps: { ...existingPipeline.steps, e1: { status: 'running' as const, updatedAt: now } },
      updatedAt: now,
    }
    : createNs4Pipeline(moduleName, sourcePrompt, now);

  // Pipeline first: if the run is interrupted before module.defs.ts, a later invocation recognizes
  // this as its own partial E1 and can resume safely.
  await writeNs4Pipeline(running);

  const gate = validateNs4E1Module(artifact);
  if (!gate.ok) {
    const message = gate.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNs4Pipeline({ ...running, steps: { e1: { status: 'failed', updatedAt: new Date().toISOString() } }, updatedAt: new Date().toISOString() });
    throw new Error(message || 'E1 module gate failed.');
  }

  const artifactPath = await writeNs4Module(moduleName, artifact);
  await writeNs4Pipeline(markNs4E1Approved(running, approvedBy, artifactPath));
  return { artifact, artifactPath };
}

function resultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  saved: Ns4PersistedE1,
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
      stepTitle: 'E1 — module contract ready',
      status: 'completed',
      nextSteps: [],
      result: JSON.stringify({
        moduleName: saved.artifact.module.moduleName,
        artifact: saved.artifactPath,
        completedStep: 'e1',
        nextStep: 'e2-journeys',
      }, null, 2),
      planning: { planId: 'e1-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
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
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    ...(traceMsg ? { traceMsg } : {}),
    ...(cleaner ? { cleaner } : {}),
  };
}

async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) {
    throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E1 intents.');
  }
  const applied = response as mls.msg.ResponseApplyIntents;
  context.task = applied.task;
  if (applied.message) context.message = applied.message;
}

function unwrapPayload(value: unknown): unknown {
  const parsed = parseMaybeJson(value);
  if (isRecord(parsed) && parsed.type === 'flexible') return parseMaybeJson(parsed.result);
  return parsed;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function isFast(context: mls.msg.ExecutionContext): boolean {
  return context.task?.iaCompressed?.longMemory?.fastMode === 'true';
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalModuleName(value: string): string {
  return value ? normalizeNs4ModuleName(value) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readResultMessage(payload: Record<string, unknown>): string {
  return typeof payload.result === 'string' && payload.result.trim()
    ? payload.result.trim()
    : 'agentNewSolution4 could not continue.';
}

function escapePromptMessage(message: string): string {
  return String(message || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
}
