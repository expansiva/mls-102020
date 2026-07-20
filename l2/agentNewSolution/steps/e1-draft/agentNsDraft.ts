/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e1-draft/agentNsDraft.ts" enhancement="_102027_/l2/enhancementAgent"/>
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { nsLlmInfraFailureIntents } from '/_102020_/l2/agentNewSolution/helpers/nsLlmRetry.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  NS_AGENT_FOLDER,
  cleanNsModule,
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
import { isNsFastMode, isNsRebuildMode, NS_REBUILD_TRACE_NOTE } from '/_102020_/l2/agentNewSolution/helpers/nsFastMode.js';
import { NsGateCheck, errorIssue, runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  approveNsStep,
  createNsPipeline,
  markNsStepRunning,
  readNsPipeline,
  writeNsPipeline,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import { writeNsTrace, nsPromptChars } from '/_102020_/l2/agentNewSolution/helpers/nsTrace.js';
import {
  NsE1DraftArtifact,
  prepareE1DraftArtifact,
  renderE1DraftMarkdown,
  validateE1DraftInvariants,
} from '/_102020_/l2/agentNewSolution/steps/e1-draft/gate.js';
import {
  NsClarification,
  NsClarificationAnswer,
  getInitialClarificationAnswer,
  getRootPlan,
} from '/_102020_/l2/agentNewSolution/agentNewSolution.js';

const AGENT_NAME = 'agentNsDraft';
const TOOL_NAME = 'submitNsDraft';
type PlannerStatus = 'ok' | 'needs_input' | 'failed';

interface NsE1PlannerOutput {
  status: PlannerStatus;
  result: Record<string, unknown>;
  questions: string[];
  trace: string[];
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NS_AGENT_FOLDER}/steps/e1-draft`,
    agentDescription: 'E1 - understanding draft for agentNewSolution',
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
  if (parsedArgs.planId === 'e1-clarification') {
    return [{
      type: 'prompt_ready',
      args: args || JSON.stringify({ planId: 'e1-clarification' }),
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task.PK,
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: clarificationSystemPrompt,
      humanPrompt: `## Initial user prompt\n${rootPlan.userPrompt}\n\n## Root plan seed\n${JSON.stringify(rootPlan.clarification, null, 2)}\n`,
    } as mls.msg.AgentIntentPromptReady];
  }
  const clarification = getInitialClarificationAnswer(context);
  const previous = parsedArgs.previousModuleName ? await readJsonArtifact<NsE1DraftArtifact>(nsPipelineArtifactFileInfo(parsedArgs.previousModuleName, 'e1-draft', '.json'), false) : null;
  const schema = await readE1Schema();
  const platform = await readNsText('skills', 'platform', '.md', true);
  const prompt = await readNsText('steps/e1-draft', 'prompt', '.md', true);
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
  const rootPlan = getRootPlan(context);
  let moduleNameForTrace: string | null = null;
  try {
    const parsedArgs = parseArgs(step.prompt);
    if (parsedArgs.planId === 'e1-clarification') return handleInitialClarificationPayload(context, parentStep, step, hookSequential);
    // P2: the e1-draft single call — retry once on an LLM-CALL failure (no payload) before failing.
    const infraIntents = nsLlmInfraFailureIntents({
      context, mutationParent: findMutableParentStep(context, parentStep), step, hookSequential,
      agentName: AGENT_NAME, stepId: 'e1-draft',
      retryPrompt: { previousModuleName: parsedArgs.previousModuleName }, alreadyRetried: parsedArgs.llmRetry === true,
    });
    if (infraIntents) return infraIntents;
    const output = extractE1Output(step.interaction?.payload?.[0]);
    if (output.status === 'failed') {
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', output.trace.join('\n') || 'E1 draft returned failed')];
    }
    const rawArtifact = output.result;
    const rebuild = isNsRebuildMode(context.task?.iaCompressed?.longMemory);
    // Keep the NATURAL module name — no collision-avoiding numeric variant. The user asked (newSolution_19)
    // for a HARD STOP when the module already exists, instead of silently generating on top of / beside it.
    const artifact = prepareE1DraftArtifact(rawArtifact, {
      requestedModuleFallback: rootPlan.userPrompt,
    });
    moduleNameForTrace = artifact.moduleName;
    // Collision guard: outside /rebuild, if a module with this name already exists (l1/l2/l4/l5), FAIL the
    // task and tell the user to pass /rebuild (regenerate in place, cleaning l4+l5) or pick another name.
    // A re-run/adjustment of the SAME module (previousModuleName) is not a collision.
    if (!rebuild) {
      const existing = listExistingModuleFolders();
      if (parsedArgs.previousModuleName) existing.delete(normalizeModuleFolderName(parsedArgs.previousModuleName));
      if (existing.has(artifact.moduleName)) {
        const msg = `Módulo "${artifact.moduleName}" já existe. Use /rebuild para regerar por cima (limpa l4+l5) ou escolha outro nome.`;
        await writeNsTrace(artifact.moduleName, 'e1-draft', AGENT_NAME, 1, { moduleName: artifact.moduleName, existing: Array.from(existing).slice(0, 20) }, msg);
        return [updateStatus(context, parentStep, step, hookSequential, 'failed', msg)];
      }
    }
    // /rebuild: soft-delete the existing module's l4 + l5 (leftover operations/workspaces/contracts from
    // a prior run) so this generation starts clean. Idempotent (already-deleted files are skipped).
    if (rebuild) {
      const removed = await cleanNsModule(artifact.moduleName);
      if (removed.length) await writeNsTrace(artifact.moduleName, 'e1-draft', AGENT_NAME, 1, { rebuild: removed.length, sample: removed.slice(0, 20) }, NS_REBUILD_TRACE_NOTE);
    }
    const gateInputs = {
      prompt: rootPlan.userPrompt,
      clarification: getInitialClarificationAnswer(context),
      adjustment: parsedArgs.adjustment || '',
      blockingAnswers: parsedArgs.blockingAnswers || null,
      retryContext: parsedArgs.retryContext || '',
    };
    const schema = await readE1Schema();
    let pipeline = await readNsPipeline(artifact.moduleName) || createNsPipeline(artifact.moduleName);
    pipeline = markNsStepRunning(pipeline, 'e1-draft', gateInputs);
    const gate = await runNsGate({
      stepId: 'e1-draft',
      schema,
      artifact,
      inputs: gateInputs,
      pipeline,
      validate: item => applyPlannerOutputToGateCheck(validateE1DraftInvariants(item), output),
    });
    if (gate.pipeline) pipeline = gate.pipeline;
    await writeNsPipeline(pipeline);
    const attempt = parsedArgs.retryAttempt || gate.attempts;
    const markdown = renderE1DraftMarkdown(artifact);
    await writeJsonArtifact(nsPipelineArtifactFileInfo(artifact.moduleName, 'e1-draft', '.json'), artifact);
    await writeMarkdownArtifact(nsPipelineArtifactFileInfo(artifact.moduleName, 'e1-draft', '.md'), markdown);

    if (!gate.ok) {
      const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
      await writeNsTrace(moduleNameForTrace, 'e1-draft', AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
      const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, 'failed', traceMsg)];
      if (output.status === 'needs_input' && gate.needsHumanInput) {
        intents.unshift(addBlockingClarification(context, parentStep, artifact, questionsForHuman(output, gate.errors.map(issue => issue.message))));
      } else if (attempt < 2) {
        intents.unshift(addGateRetryStep(context, parentStep, artifact, gate.retryContext || traceMsg));
      }
      return intents;
    }

    await writeNsTrace(artifact.moduleName, 'e1-draft', AGENT_NAME, attempt, { artifact, gate }, undefined, nsPromptChars(step));

    // E1 is NOT a human checkpoint (only 2 human interactions: clarification and journeys). A green
    // gate auto-approves the draft and the pipeline continues straight to E2 (e2-journeys dependsOn
    // e1-draft). The e1-draft.md stays on disk as the understanding contract / E2 input.
    pipeline = approveNsStep(pipeline, 'e1-draft', 'auto');
    await writeNsPipeline(pipeline);
    // Artifact is on disk; drop the LLM input/payload from the task record (DynamoDB 400KB).
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', undefined, 'input_output')];
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (moduleNameForTrace) await writeNsTrace(moduleNameForTrace, 'e1-draft', AGENT_NAME, 1, { stepId: step.stepId }, traceMsg);
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
  if (parsed.planId === 'e1-clarification') {
    await import('/_102025_/l2/widgetQuestionsForClarification.js');
    const rootPlan = getRootPlan(context);
    const clarification = normalizeClarificationForWidget(parsed, rootPlan.clarification);
    const div = document.createElement('div');
    const el = document.createElement('widget-questions-for-clarification-102025');
    // /fast (D5): signal the widget to auto-accept the proposed defaults after a short countdown. The
    // widget change (reading autoAcceptSeconds + auto-firing clarification-finish) is a SEPARATE task
    // in widget 102025; here we only pass the property. Without /fast (0) the widget is unchanged.
    const autoAcceptSeconds = isNsFastMode(context.task?.iaCompressed?.longMemory) ? 10 : 0;
    (el as unknown as { value: unknown }).value = {
      taskId: context.task?.PK || '',
      stepId: step.stepId,
      title: clarification.title,
      legends: clarification.legends,
      userLanguage: clarification.userLanguage,
      questions: clarification.questions,
      autoAcceptSeconds,
    };
    el.setAttribute('mode', 'new');
    el.addEventListener('clarification-finish', (event: Event) => {
      const detail = (event as CustomEvent<{ value: NsClarification; action: 'continue' | 'cancel' }>).detail;
      applyInitialClarification(context, parentStep, step, hookSequential, detail.value, detail.action)
        .catch(error => console.error(`[${AGENT_NAME}] ${error?.message || error}`));
    });
    div.appendChild(el);
    return div;
  }
  if (parsed.planId === 'e1-clarification-extra') {
    await import('/_102025_/l2/widgetQuestionsForClarification.js');
    const rootPlan = getRootPlan(context);
    const el = document.createElement('widget-questions-for-clarification-102025');
    const clarification: NsClarification = {
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
      const detail = (event as CustomEvent<{ value: NsClarification; action: 'continue' | 'cancel' }>).detail;
      applyBlockingClarification(context, parentStep, step, hookSequential, detail.value, detail.action, parsed.moduleName || findLatestE1ModuleName(context) || '')
        .catch(error => console.error(`[${AGENT_NAME}] ${error?.message || error}`));
    });
    return el;
  }
  throw new Error(`[${AGENT_NAME}] unsupported clarification ${parsed.planId || '(missing)'}`);
}

function handleInitialClarificationPayload(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): mls.msg.AgentIntent[] {
  const payload = step.interaction?.payload?.[0];
  const parsed = parseMaybeJson(payload);
  const result = isRecord(parsed) && parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
  if (isRecord(result) && result.type === 'result') {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', readString(result.result) || 'Invalid prompt')];
  }
  if (!isRecord(result) || result.type !== 'clarification' || !isRecord(result.json)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', `invalid clarification payload: ${JSON.stringify(payload)}`)];
  }
  return [];
}


async function applyInitialClarification(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  value: NsClarification,
  action: 'continue' | 'cancel',
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const status: mls.msg.AIStepStatus = action === 'continue' ? 'completed' : 'failed';
  const mutationParent = findMutableParentStep(context, parentStep);
  // N5 (run 9 finding: the clarification step retained ~4.7KB of widget interaction): drop it on the
  // completed path. The answer is persisted separately in the 'e1-clarification-answer' result step
  // (getInitialClarificationAnswer reads THAT), so the interaction payload is dead weight (DynamoDB 400KB).
  const cleaner = status === 'completed' ? 'input_output' : undefined;
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, mutationParent, step, hookSequential, status, undefined, cleaner)];
  if (action === 'continue') {
    const answer = normalizeClarificationAnswer(value);
    intents.unshift(resultStep(context, mutationParent, 'e1-clarification-answer', ['e1-clarification'], answer.title, answer));
  }
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) {
    throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying initial clarification');
  }
  const ret = response as mls.msg.ResponseApplyIntents;
  context.task = ret.task;
  if (ret.message) context.message = ret.message;
  if (action === 'continue') await continuePoolingTask(context);
}

function addBlockingClarification(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  artifact: NsE1DraftArtifact,
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
  artifact: NsE1DraftArtifact,
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
  value: NsClarification,
  action: 'continue' | 'cancel',
  moduleName: string,
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const status: mls.msg.AIStepStatus = action === 'continue' ? 'completed' : 'failed';
  const mutationParent = findMutableParentStep(context, parentStep);
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, mutationParent, step, hookSequential, status)];
  if (action === 'continue') {
    const answers = Object.fromEntries(Object.entries(value.questions || {}).map(([key, question]) => [key, question.answer ?? '']));
    intents.unshift(resultStep(context, mutationParent, `e1-clarification-extra-answer-${step.stepId}`, ['e1-clarification-extra'], value.title || 'Blocking clarification answer', {
      title: value.title,
      userLanguage: value.userLanguage,
      answers,
    }));
    intents.push(addE1RerunStep(context, mutationParent, {
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
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
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
      status: 'waiting_human_input',
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

function normalizeClarificationForWidget(parsed: ParsedStepJson, fallback: NsClarification): NsClarification {
  const questions = isRecord(parsed.questions) ? parsed.questions : fallback.questions;
  return {
    userLanguage: parsed.userLanguage || fallback.userLanguage || '',
    title: parsed.title || fallback.title || 'Clarification 1',
    legends: parsed.legends?.length ? parsed.legends : fallback.legends || [],
    questions: normalizeQuestions(questions as Record<string, NsClarification['questions'][string]>, fallback.questions),
  };
}

function normalizeQuestions(
  questions: Record<string, NsClarification['questions'][string]>,
  fallback: Record<string, NsClarification['questions'][string]>,
): Record<string, NsClarification['questions'][string]> {
  const normalized: Record<string, NsClarification['questions'][string]> = {};
  for (const [key, question] of Object.entries({ ...fallback, ...questions })) {
    const fallbackQuestion = fallback[key];
    const answer = question.answer === undefined || question.answer === '' ? fallbackQuestion?.answer ?? '' : question.answer;
    normalized[key] = {
      ...question,
      type: question.type || fallbackQuestion?.type || 'open',
      question: readString(question.question) || fallbackQuestion?.question || key,
      answer,
      ...(question.options || fallbackQuestion?.options ? { options: question.options || fallbackQuestion?.options } : {}),
    };
  }
  return normalized;
}

function normalizeClarificationAnswer(value: NsClarification): NsClarificationAnswer {
  return {
    title: value.title || 'Clarification 1',
    userLanguage: value.userLanguage || '',
    answers: Object.fromEntries(Object.entries(value.questions || {}).map(([key, question]) => [key, question.answer ?? ''])),
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

function extractE1Output(payload: unknown): NsE1PlannerOutput {
  const parsed = parseMaybeJson(payload);
  if (!isRecord(parsed)) throw new Error('missing E1 payload');
  if (parsed.type === 'result') throw new Error(readString(parsed.result) || 'E1 returned result error');

  const direct = tryNormalizeE1Envelope(parsed);
  if (direct) return direct;

  if (parsed.type === 'flexible') {
    const flexible = parseMaybeJson(parsed.result);
    const fromFlexible = tryNormalizeE1Envelope(flexible);
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

function tryExtractToolOutput(value: unknown): NsE1PlannerOutput | null {
  const record = parseMaybeJson(value);
  if (!isRecord(record) || record.toolName !== TOOL_NAME) return null;
  return normalizeToolArguments(record.arguments);
}

function normalizeToolArguments(value: unknown, depth = 0): NsE1PlannerOutput {
  const args = parseMaybeJson(value);
  if (!isRecord(args)) throw new Error('tool arguments must be an object');
  const direct = tryNormalizeE1Envelope(args);
  if (direct) return direct;
  if (args.arguments !== undefined && depth < 3) return normalizeToolArguments(args.arguments, depth + 1);
  throw new Error(`tool arguments do not contain ${TOOL_NAME} output`);
}

function tryExtractOpenAiToolCall(value: unknown): NsE1PlannerOutput | null {
  if (!isRecord(value) || !Array.isArray(value.tool_calls)) return null;
  for (const call of value.tool_calls) {
    if (!isRecord(call) || !isRecord(call.function) || call.function.name !== TOOL_NAME) continue;
    return normalizeToolArguments(call.function.arguments);
  }
  return null;
}

function tryNormalizeE1Envelope(value: unknown): NsE1PlannerOutput | null {
  const output = parseMaybeJson(value);
  if (!isRecord(output) || output.result === undefined) return null;
  const result = parseMaybeJson(output.result);
  if (!isRecord(result) || isToolWrapper(result)) return null;
  return {
    status: normalizePlannerStatus(output.status),
    result,
    questions: normalizeStringArray(output.questions),
    trace: normalizeStringArray(output.trace),
  };
}

function isToolWrapper(value: unknown): boolean {
  const record = parseMaybeJson(value);
  return isRecord(record) && record.toolName === TOOL_NAME && record.arguments !== undefined;
}

function normalizePlannerStatus(value: unknown): PlannerStatus {
  if (value === undefined) return 'ok';
  if (value === 'ok' || value === 'needs_input' || value === 'failed') return value;
  throw new Error(`invalid planner status: ${String(value)}`);
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => readString(item)).filter((item): item is string => !!item) : [];
}

function applyPlannerOutputToGateCheck(
  check: NsGateCheck<NsE1DraftArtifact>,
  output: NsE1PlannerOutput,
): NsGateCheck<NsE1DraftArtifact> {
  if (output.status === 'needs_input') {
    const hasBlockingIssue = check.issues.some(issue => issue.code === 'blocking_question');
    const outputQuestionIssues = hasBlockingIssue
      ? []
      : output.questions.map(question => errorIssue('blocking_question', question, 'questions'));
    const missingQuestionsIssue = !hasBlockingIssue && outputQuestionIssues.length === 0
      ? [errorIssue('needs_input_without_questions', 'status "needs_input" requires at least one question', 'questions')]
      : [];
    return {
      ...check,
      issues: [...check.issues, ...outputQuestionIssues, ...missingQuestionsIssue],
      needsHumanInput: outputQuestionIssues.length > 0 || hasBlockingIssue,
    };
  }
  return {
    ...check,
    needsHumanInput: false,
    issues: check.issues.map(issue => issue.code === 'blocking_question'
      ? errorIssue(
        'unexpected_blocking_question',
        `status "${output.status}" cannot request human input through result.openQuestions; use status "needs_input" or classify it as assumed with defaultAnswer. Original question: ${issue.message}`,
        issue.path,
      )
      : issue),
  };
}

function questionsForHuman(output: NsE1PlannerOutput, fallback: string[]): string[] {
  return output.questions.length > 0 ? output.questions : fallback;
}

async function readE1Schema(): Promise<Record<string, unknown>> {
  const raw = await readNsText('schemas', 'e1-draft.schema', '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error('[readE1Schema] invalid schema');
  return parsed;
}

async function readNsText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(nsL2File(`${NS_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

function parseArgs(value: unknown): {
  planId?: string;
  adjustment?: string;
  previousModuleName?: string;
  blockingAnswers?: Record<string, unknown>;
  retryAttempt?: number;
  retryContext?: string;
  llmRetry?: boolean;
} {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? {
    planId: readString(parsed.planId),
    adjustment: readString(parsed.adjustment),
    previousModuleName: readString(parsed.previousModuleName),
    blockingAnswers: isRecord(parsed.blockingAnswers) ? parsed.blockingAnswers : undefined,
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: readString(parsed.retryContext),
    llmRetry: parsed.llmRetry === true,
  } : {};
}

interface ParsedStepJson {
  planId?: string;
  moduleName?: string;
  title?: string;
  userLanguage?: string;
  legends?: string[];
  questions?: Record<string, NsClarification['questions'][string]>;
}

function parseStepJson(value: unknown): ParsedStepJson {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
    title: readString(parsed.title),
    userLanguage: readString(parsed.userLanguage),
    legends: Array.isArray(parsed.legends) ? parsed.legends.filter((item): item is string => typeof item === 'string') : undefined,
    questions: isRecord(parsed.questions) ? parsed.questions as Record<string, NsClarification['questions'][string]> : undefined,
  } : {};
}

function findStepByPlanId(context: mls.msg.ExecutionContext, planId: string): mls.msg.AIPayload | null {
  if (!context.task) return null;
  return getAllSteps(context.task.iaCompressed?.nextSteps).find(item => (item as { planning?: { planId?: string } }).planning?.planId === planId) || null;
}

function findStepById(context: mls.msg.ExecutionContext, stepId: number): mls.msg.AIPayload | null {
  if (!context.task) return null;
  return getAllSteps(context.task.iaCompressed?.nextSteps).find(item => item.stepId === stepId) || null;
}

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
      const rawArtifact = extractE1Output(agentStep.interaction?.payload?.[0]).result;
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
Call the "${TOOL_NAME}" tool with only these top-level arguments:
{
  "status": "ok" | "needs_input" | "failed",
  "result": E1 artifact matching the JSON schema,
  "questions": [],
  "trace": []
}

Do not include "type", "toolName", or "arguments" in the tool arguments.
When status is "ok", questions must be empty and result.openQuestions must not contain blocking items.
Use status "needs_input" only when E1 cannot safely continue without a human answer.
`;
}

const clarificationSystemPrompt = `
<!-- modelType: general -->

You are the initial clarification agent for agentNewSolution.

Generate ONE small first clarification in the same language as the user. Do not ask about
architecture, ontology, pages, database, workflows, MDM, plugins, or implementation details yet.
Every question must include a useful visible default in its "answer" field derived from the user's
prompt. Use an empty answer only when no safe default exists.

Return only valid JSON:
{
  "type": "clarification",
  "json": {
    "planId": "e1-clarification",
    "userLanguage": "ISO code such as pt-BR or en",
    "title": "Clarification 1",
    "questions": {
      "moduleName": { "type": "open", "question": "", "answer": "" },
      "mainActors": { "type": "open", "question": "", "answer": "" },
      "mainGoal": { "type": "open", "question": "", "answer": "" },
      "boundaries": { "type": "open", "question": "", "answer": "" }
    },
    "legends": ["Localized note: this is the first clarification."]
  }
}
`;


function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
