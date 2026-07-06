/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e1-draft/agentNs3Draft.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  NS3_AGENT_FOLDER,
  isRecord,
  listExistingModuleFolders,
  ns3L2File,
  ns3PipelineArtifactFileInfo,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeJsonArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';
import { runNs3Gate } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  createNs3Pipeline,
  markNs3StepRunning,
  readNs3Pipeline,
  writeNs3Pipeline,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.js';
import { writeNs3Trace } from '/_102020_/l2/agentNewSolution3/helpers/ns3Trace.js';
import {
  Ns3E1DraftArtifact,
  prepareE1DraftArtifact,
  renderE1DraftMarkdown,
  validateE1DraftInvariants,
} from '/_102020_/l2/agentNewSolution3/steps/e1-draft/gate.js';
import {
  Ns3Clarification,
  Ns3ClarificationAnswer,
  getInitialClarificationAnswer,
  getRootPlan,
} from '/_102020_/l2/agentNewSolution3/agentNewSolution3.js';

const AGENT_NAME = 'agentNs3Draft';
const TOOL_NAME = 'submitNs3Draft';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NS3_AGENT_FOLDER}/steps/e1-draft`,
    agentDescription: 'E1 - understanding draft for agentNewSolution3',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
    beforeClarificationStep,
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
  const parsedArgs = parseArgs(args);
  const rootPlan = getRootPlan(context);
  const clarification = getInitialClarificationAnswer(context);
  const previous = parsedArgs.previousModuleName ? await readJsonArtifact<Ns3E1DraftArtifact>(ns3PipelineArtifactFileInfo(parsedArgs.previousModuleName, 'e1-draft', '.json'), false) : null;
  const schema = await readE1Schema();
  const platform = await readNs3Text('skills', 'platform', '.md', true);
  const prompt = await readNs3Text('steps/e1-draft', 'prompt', '.md', true);
  const humanPrompt = [
    '## Initial prompt',
    rootPlan.userPrompt,
    '',
    '## Clarification 1',
    JSON.stringify(clarification || {}, null, 2),
    '',
    parsedArgs.adjustment ? `## Adjustment request\n${parsedArgs.adjustment}\n` : '',
    parsedArgs.blockingAnswers ? `## Blocking clarification answers\n${JSON.stringify(parsedArgs.blockingAnswers, null, 2)}\n` : '',
    parsedArgs.retryContext ? `## Gate retry context\n${parsedArgs.retryContext}\n` : '',
    previous ? `## Current E1 artifact\n${JSON.stringify(previous, null, 2)}\n` : '',
  ].filter(Boolean).join('\n');

  return [{
    type: 'prompt_ready',
    args: args || JSON.stringify({ planId: 'e1-draft' }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: `${prompt}\n\n${platform}\n\n${buildToolInstruction()}`,
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
  const rootPlan = getRootPlan(context);
  let moduleNameForTrace: string | null = null;
  try {
    const parsedArgs = parseArgs(step.prompt);
    const rawArtifact = extractE1Result(step.interaction?.payload?.[0]);
    const currentModule = parsedArgs.previousModuleName || readString(rawArtifact.moduleName);
    const existing = listExistingModuleFolders();
    if (currentModule) existing.delete(currentModule);
    const artifact = prepareE1DraftArtifact(rawArtifact, {
      existingModules: existing,
      requestedModuleFallback: rootPlan.userPrompt,
    });
    moduleNameForTrace = artifact.moduleName;
    const gateInputs = {
      prompt: rootPlan.userPrompt,
      clarification: getInitialClarificationAnswer(context),
      adjustment: parsedArgs.adjustment || '',
      blockingAnswers: parsedArgs.blockingAnswers || null,
      retryContext: parsedArgs.retryContext || '',
    };
    const schema = await readE1Schema();
    let pipeline = await readNs3Pipeline(artifact.moduleName) || createNs3Pipeline(artifact.moduleName);
    pipeline = markNs3StepRunning(pipeline, 'e1-draft', gateInputs);
    const gate = await runNs3Gate({
      stepId: 'e1-draft',
      schema,
      artifact,
      inputs: gateInputs,
      pipeline,
      validate: item => validateE1DraftInvariants(item),
    });
    if (gate.pipeline) pipeline = gate.pipeline;
    await writeNs3Pipeline(pipeline);
    const attempt = parsedArgs.retryAttempt || gate.attempts;
    const markdown = renderE1DraftMarkdown(artifact);
    await writeJsonArtifact(ns3PipelineArtifactFileInfo(artifact.moduleName, 'e1-draft', '.json'), artifact);
    await writeMarkdownArtifact(ns3PipelineArtifactFileInfo(artifact.moduleName, 'e1-draft', '.md'), markdown);

    if (!gate.ok) {
      const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
      await writeNs3Trace(moduleNameForTrace, 'e1-draft', AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
      const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, 'failed', traceMsg)];
      if (gate.needsHumanInput) {
        intents.unshift(addBlockingClarification(context, step, artifact, gate.errors.map(issue => issue.message)));
      } else if (attempt < 2) {
        intents.unshift(addGateRetryStep(context, parentStep, artifact, gate.retryContext || traceMsg));
      }
      return intents;
    }

    await writeNs3Trace(artifact.moduleName, 'e1-draft', AGENT_NAME, attempt, { artifact, gate });

    return [
      activateCheckpointClarification(context, parentStep, artifact.moduleName, hookSequential),
      updateStatus(context, parentStep, step, hookSequential, 'completed'),
    ];
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (moduleNameForTrace) await writeNs3Trace(moduleNameForTrace, 'e1-draft', AGENT_NAME, 1, { stepId: step.stepId }, traceMsg);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', traceMsg)];
  }
}

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const parsed = parseStepJson(json);
  if (parsed.planId === 'checkpoint-draft') {
    await import('/_102020_/l2/agentNewSolution3/widgetNs3Draft.js');
    const rootPlan = getRootPlan(context);
    const el = document.createElement('widget-ns3-draft-102020');
    (el as unknown as { value: unknown }).value = {
      taskId: context.task?.PK || '',
      moduleName: parsed.moduleName || findLatestE1ModuleName(context) || '',
      stepId: step.stepId,
      parentStepId: parentStep.stepId,
      rerunParentStepId: findParentStepId(context, parentStep.stepId) || parentStep.stepId,
      hookSequential,
      senderId: context.message.senderId,
      threadId: context.message.threadId,
      messageId: context.message.orderAt,
      uiLabels: rootPlan.uiLabels,
    };
    return el;
  }
  if (parsed.planId === 'e1-clarification-extra') {
    await import('/_102025_/l2/widgetQuestionsForClarification.js');
    const rootPlan = getRootPlan(context);
    const el = document.createElement('widget-questions-for-clarification-102025');
    const clarification: Ns3Clarification = {
      userLanguage: rootPlan.userLanguage,
      title: rootPlan.uiLabels.blockingClarificationTitle || 'Answer blocking question',
      legends: [],
      questions: parsed.questions || {},
    };
    (el as unknown as { value: unknown }).value = {
      taskId: context.task?.PK || '',
      stepId: step.stepId,
      title: clarification.title,
      legends: clarification.legends,
      userLanguage: clarification.userLanguage,
      questions: clarification.questions,
    };
    el.setAttribute('mode', 'new');
    el.addEventListener('clarification-finish', (event: Event) => {
      const detail = (event as CustomEvent<{ value: Ns3Clarification; action: 'continue' | 'cancel' }>).detail;
      void applyBlockingClarification(context, parentStep, step, hookSequential, detail.value, detail.action, parsed.moduleName || findLatestE1ModuleName(context) || '');
    });
    return el;
  }
  throw new Error(`[${AGENT_NAME}] unsupported clarification ${parsed.planId || '(missing)'}`);
}

function activateCheckpointClarification(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  hookSequential: number,
): mls.msg.AgentIntent {
  const existing = findStepByPlanId(context, 'checkpoint-draft');
  if (existing) {
    const parentStepId = findParentStepId(context, existing.stepId) || parentStep.stepId;
    return updateStatus(context, { ...parentStep, stepId: parentStepId }, existing, hookSequential, 'pending', `checkpoint-draft ready for ${moduleName}`);
  }
  const rootPlan = getRootPlan(context);
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'clarification',
      stepId: 0,
      interaction: null,
      stepTitle: rootPlan.titles['checkpoint-draft'] || 'Approve draft',
      status: 'pending',
      nextSteps: [],
      json: JSON.stringify({ planId: 'checkpoint-draft', moduleName, userLanguage: rootPlan.userLanguage }),
      planning: { planId: 'checkpoint-draft', dependsOn: ['e1-draft'], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIClarificationStep,
  };
}

function addBlockingClarification(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  artifact: Ns3E1DraftArtifact,
  questions: string[],
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'clarification',
      stepId: 0,
      interaction: null,
      stepTitle: getRootPlan(context).uiLabels.blockingClarificationTitle || 'Answer blocking question',
      status: 'pending',
      nextSteps: [],
      json: JSON.stringify({
        planId: 'e1-clarification-extra',
        moduleName: artifact.moduleName,
        questions: Object.fromEntries(questions.map((question, index) => [`blocking${index + 1}`, { type: 'open', question, answer: '' }])),
      }),
      planning: { planId: 'e1-clarification-extra', dependsOn: ['e1-draft'], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIClarificationStep,
  };
}

function addGateRetryStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  artifact: Ns3E1DraftArtifact,
  retryContext: string,
): mls.msg.AgentIntentAddStep {
  return addE1RerunStep(context, parentStep, {
    planId: `e1-draft-retry-${Date.now()}`,
    stepTitle: 'Retry E1 draft gate',
    prompt: {
      planId: 'e1-draft',
      previousModuleName: artifact.moduleName,
      retryAttempt: 2,
      retryContext,
    },
    dependsOn: ['e1-draft'],
  });
}

async function applyBlockingClarification(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  value: Ns3Clarification,
  action: 'continue' | 'cancel',
  moduleName: string,
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const status: mls.msg.AIStepStatus = action === 'continue' ? 'completed' : 'failed';
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, status)];
  if (action === 'continue') {
    const answers = Object.fromEntries(Object.entries(value.questions || {}).map(([key, question]) => [key, question.answer ?? '']));
    intents.unshift(resultStep(context, parentStep, `e1-clarification-extra-answer-${step.stepId}`, ['e1-clarification-extra'], value.title || 'Blocking clarification answer', {
      title: value.title,
      userLanguage: value.userLanguage,
      answers,
    }));
    intents.push(addE1RerunStep(context, parentStep, {
      planId: `e1-draft-blocking-${step.stepId}`,
      stepTitle: 'Apply blocking clarification',
      prompt: {
        planId: 'e1-draft',
        previousModuleName: moduleName,
        blockingAnswers: answers,
      },
      dependsOn: ['e1-clarification-extra'],
    }));
  }
  const response = await mls.api.msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) {
    throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying blocking clarification');
  }
  const ret = response as mls.msg.ResponseApplyIntents;
  context.task = ret.task;
  if (ret.message) context.message = ret.message;
  if (action === 'continue') await continuePoolingTask(context);
}

function addE1RerunStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  options: { planId: string; stepTitle: string; prompt: Record<string, unknown>; dependsOn: string[] },
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
      stepTitle: options.stepTitle,
      status: 'pending',
      nextSteps: [],
      agentName: AGENT_NAME,
      prompt: JSON.stringify(options.prompt),
      rags: [],
      planning: { planId: options.planId, dependsOn: options.dependsOn, executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
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

function updateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
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
    traceMsg,
  };
}

function createToolSchema(resultSchema: Record<string, unknown>): mls.msg.LLMTool {
  return {
    type: 'function',
    function: {
      name: TOOL_NAME,
      description: 'Submit the E1 understanding draft.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'result', 'questions', 'trace'],
        properties: {
          status: { enum: ['ok', 'needs_input', 'failed'] },
          result: resultSchema,
          questions: { type: 'array', items: { type: 'string' } },
          trace: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  } as unknown as mls.msg.LLMTool;
}

function extractE1Result(payload: unknown): Record<string, unknown> {
  const parsed = parseMaybeJson(payload);
  if (!isRecord(parsed)) throw new Error('missing E1 payload');
  const flexible = parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
  if (isRecord(flexible) && isRecord(flexible.result)) return flexible.result;
  if (isRecord(flexible) && flexible.toolName === TOOL_NAME) return extractToolArguments(flexible.arguments);
  const toolCall = extractOpenAiToolCall(flexible);
  if (toolCall) return toolCall;
  if (isRecord(flexible)) return flexible;
  throw new Error('E1 payload does not contain a result object');
}

function extractToolArguments(value: unknown): Record<string, unknown> {
  const args = parseMaybeJson(value);
  if (!isRecord(args)) throw new Error('tool arguments must be an object');
  if (isRecord(args.result)) return args.result;
  throw new Error('tool arguments missing result');
}

function extractOpenAiToolCall(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !Array.isArray(value.tool_calls)) return null;
  for (const call of value.tool_calls) {
    if (!isRecord(call) || !isRecord(call.function) || call.function.name !== TOOL_NAME) continue;
    return extractToolArguments(call.function.arguments);
  }
  return null;
}

async function readE1Schema(): Promise<Record<string, unknown>> {
  const raw = await readNs3Text('schemas', 'e1-draft.schema', '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error('[readE1Schema] invalid schema');
  return parsed;
}

async function readNs3Text(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(ns3L2File(`${NS3_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

function parseArgs(value: unknown): {
  planId?: string;
  adjustment?: string;
  previousModuleName?: string;
  blockingAnswers?: Record<string, unknown>;
  retryAttempt?: number;
  retryContext?: string;
} {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? {
    planId: readString(parsed.planId),
    adjustment: readString(parsed.adjustment),
    previousModuleName: readString(parsed.previousModuleName),
    blockingAnswers: isRecord(parsed.blockingAnswers) ? parsed.blockingAnswers : undefined,
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: readString(parsed.retryContext),
  } : {};
}

function parseStepJson(value: unknown): { planId?: string; moduleName?: string; questions?: Record<string, Ns3Clarification['questions'][string]> } {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
    questions: isRecord(parsed.questions) ? parsed.questions as Record<string, Ns3Clarification['questions'][string]> : undefined,
  } : {};
}

function findStepByPlanId(context: mls.msg.ExecutionContext, planId: string): mls.msg.AIPayload | null {
  if (!context.task) return null;
  return getAllSteps(context.task.iaCompressed?.nextSteps).find(item => (item as { planning?: { planId?: string } }).planning?.planId === planId) || null;
}

function findLatestE1ModuleName(context: mls.msg.ExecutionContext): string | null {
  if (!context.task) return null;
  const steps = getAllSteps(context.task.iaCompressed?.nextSteps).slice().reverse();
  for (const item of steps) {
    if (item.type !== 'agent') continue;
    const agentStep = item as mls.msg.AIAgentStep;
    if (agentStep.agentName !== AGENT_NAME) continue;
    const parsedArgs = parseArgs(agentStep.prompt);
    if (parsedArgs.previousModuleName) return parsedArgs.previousModuleName;
    try {
      const rawArtifact = extractE1Result(agentStep.interaction?.payload?.[0]);
      const moduleName = readString(rawArtifact.moduleName);
      if (moduleName) return normalizeModuleFolderName(moduleName);
    } catch {
      // Ignore incomplete E1 attempts while searching for the latest usable module.
    }
  }
  return null;
}

function findParentStepId(context: mls.msg.ExecutionContext, childStepId: number): number | null {
  if (!context.task) return null;
  for (const item of getAllSteps(context.task.iaCompressed?.nextSteps)) {
    if (item.nextSteps?.some(child => child.stepId === childStepId)) return item.stepId;
    if (item.interaction?.payload?.some(child => child.stepId === childStepId)) return item.stepId;
  }
  return null;
}

function buildToolInstruction(): string {
  return `
Call the "${TOOL_NAME}" tool with:
{
  "status": "ok" | "needs_input" | "failed",
  "result": E1 artifact matching the JSON schema,
  "questions": [],
  "trace": []
}
`;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
