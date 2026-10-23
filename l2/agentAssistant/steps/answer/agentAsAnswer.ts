/// <mls fileReference="_102020_/l2/agentAssistant/steps/answer/agentAsAnswer.ts" enhancement="_102027_/l2/enhancementAgent"/>

// answer — the last screen when the user must READ something: the answer to a question (composed
// by the model from the query's data, in the same call that emits the clarification envelope) or a
// fixed message (nothing fits, a failed query; the envelope call only). The screen shows the text
// and an OK button; OK closes the task with the text as the final result.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { AS_AGENT_FOLDER, loadCatalog, loadManual, readAgentText } from '/_102020_/l2/agentAssistant/helpers/asStor.js';
import { manualContext } from '/_102020_/l2/agentAssistant/helpers/asManual.js';
import { asLabelsFor } from '/_102020_/l2/agentAssistant/helpers/asLabels.js';
import { createBusyHost } from '/_102020_/l2/agentAssistant/helpers/asBusy.js';
import { createAnswerView } from '/_102020_/l2/agentAssistant/helpers/asAnswerView.js';
import { findCommand } from '/_102020_/l2/agentAssistant/helpers/asPlan.js';
import {
  AS_ANSWER_AGENT,
  AS_ANSWER_PLAN_ID,
  checkClarificationPayload,
  readAnswerFromJson,
} from '/_102020_/l2/agentAssistant/helpers/asIds.js';
import {
  applyIntentsAndResume,
  mutableParent,
  readState,
  resultStepIntent,
  updateStatusIntent,
} from '/_102020_/l2/agentAssistant/helpers/asSteps.js';
import { answerStepTitle, buildAnswerHumanPrompt, buildManualHumanPrompt } from '/_102020_/l2/agentAssistant/steps/answer/answerPrompt.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: AS_ANSWER_AGENT,
    agentProject: 102020,
    agentFolder: `${AS_AGENT_FOLDER}/steps/answer`,
    agentDescription: 'answer — shows the answer to a question (or a message) and closes the task on OK',
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
  if (!context.task) throw new Error(`[${AS_ANSWER_AGENT}] task invalid`);
  const state = readState(context);
  if (!state?.final) throw new Error(`[${AS_ANSWER_AGENT}] nothing to show in the task memory`);

  let systemPrompt: string;
  let humanPrompt: string;
  if (state.final.kind === 'answer' && state.mode === 'manual' && state.manual) {
    // a manual question: the answer is written from the app's defs, nothing ran
    const manual = await loadManual(state.project);
    if (!manual) throw new Error(`[${AS_ANSWER_AGENT}] the app manual could not be read`);
    const catalog = await loadCatalog(state.project).catch(() => null);
    systemPrompt = await readAgentText('steps/answer', 'manual', '.md');
    humanPrompt = buildManualHumanPrompt(state, manualContext(manual, state.manual, catalog));
  } else if (state.final.kind === 'answer') {
    const catalog = await loadCatalog(state.project);
    const route = state.results[state.results.length - 1]?.route || '';
    systemPrompt = await readAgentText('steps/answer', 'prompt', '.md');
    humanPrompt = buildAnswerHumanPrompt(state, findCommand(catalog, route)?.purpose || '');
  } else {
    systemPrompt = await readAgentText('steps/answer', 'envelope', '.md');
    humanPrompt = 'Return the clarification payload requested in the system prompt.';
  }
  const intent = {
    type: 'prompt_ready',
    args: args || step.prompt || JSON.stringify({ planId: AS_ANSWER_PLAN_ID }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: systemPrompt.split('{{planId}}').join(AS_ANSWER_PLAN_ID),
    humanPrompt,
  } as mls.msg.AgentIntentPromptReady;
  return [intent];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const error = checkClarificationPayload(step.interaction?.payload?.[0], AS_ANSWER_PLAN_ID);
  if (error) return [updateStatusIntent(context, parentStep, step, hookSequential, 'failed', error)];
  // keeping the payload keeps the screen mounted
  return [];
}

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const state = readState(context);
  if (!state?.final) throw new Error(`[${AS_ANSWER_AGENT}] nothing to show in the task memory`);
  const labels = asLabelsFor(state.userLanguage);
  const text = state.final.kind === 'message' ? state.final.text : readAnswerFromJson(json ?? step.json) || labels.noAnswer;

  let busy: ReturnType<typeof createBusyHost> | null = null;
  const view = createAnswerView({
    title: state.final.kind === 'answer' ? labels.answerTitle : labels.messageTitle,
    text,
    okLabel: labels.ok,
    onOk: () => {
      if (!busy?.start(labels.processing)) return;
      const owner = mutableParent(context, parentStep);
      applyIntentsAndResume(context, [
        resultStepIntent(context, owner, {
          planId: 'done',
          stepTitle: answerStepTitle(text),
          result: { answer: text, question: state.userText, results: state.results },
        }),
        updateStatusIntent(context, owner, step, hookSequential, 'completed', undefined, 'input_output'),
      ])
        .then(() => busy?.stop())
        .catch(error => {
          console.error(`[${AS_ANSWER_AGENT}] ${error instanceof Error ? error.message : String(error)}`);
          busy?.stop(false);
        });
    },
  });
  busy = createBusyHost(view);
  return busy.host;
}
