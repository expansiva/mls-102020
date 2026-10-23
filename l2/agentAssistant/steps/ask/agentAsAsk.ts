/// <mls fileReference="_102020_/l2/agentAssistant/steps/ask/agentAsAsk.ts" enhancement="_102027_/l2/enhancementAgent"/>

// ask-<n> — one human round. The questions are already decided (state.pending in the task
// memory, written by the previous step); the model call only emits the clarification envelope
// the engine needs to render a checkpoint (skills/collab_messages.md "Rendering a checkpoint").
// beforeClarificationStep mounts the shared Decision Clarification widget. On the answer:
//   - confirmed  -> run the command through /execBff and close the task with the outcome;
//   - otherwise  -> fold the answers into the state, plan again and open ask-<n+1>;
//   - cancel     -> close with "cancelled".

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import type { DecisionAnswer, DecisionClarificationValue } from '/_102020_/l2/aura/molecules/shared/widgetDecisionClarificationLogic.js';
import { AS_AGENT_FOLDER, loadCatalog, readAgentText } from '/_102020_/l2/agentAssistant/helpers/asStor.js';
import { execBffCall } from '/_102020_/l2/agentAssistant/helpers/asBff.js';
import { asLabelsFor } from '/_102020_/l2/agentAssistant/helpers/asLabels.js';
import { createBusyHost } from '/_102020_/l2/agentAssistant/helpers/asBusy.js';
import { advance, applyAnswers, finalFor, outcomeTitle } from '/_102020_/l2/agentAssistant/helpers/asPlan.js';
import type { AsAnswer, AsState } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import {
  AS_ANSWER_AGENT,
  AS_ANSWER_PLAN_ID,
  AS_ASK_AGENT,
  askPlanId,
  checkClarificationPayload,
  readPlanIdFromJson,
  roundOfPlanId,
} from '/_102020_/l2/agentAssistant/helpers/asIds.js';
import {
  agentStepIntent,
  applyIntentsAndResume,
  mutableParent,
  planIdOf,
  readState,
  resultStepIntent,
  rootStep,
  saveState,
  updateStatusIntent,
} from '/_102020_/l2/agentAssistant/helpers/asSteps.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: AS_ASK_AGENT,
    agentProject: 102020,
    agentFolder: `${AS_AGENT_FOLDER}/steps/ask`,
    agentDescription: 'ask — one clarification round of agentAssistant (choose the action, fill fields, confirm)',
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
  if (!context.task) throw new Error(`[${AS_ASK_AGENT}] task invalid`);
  const planId = planIdOf(step);
  const promptMd = await readAgentText('steps/ask', 'prompt', '.md');
  const intent = {
    type: 'prompt_ready',
    args: args || step.prompt || JSON.stringify({ planId }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: promptMd.split('{{planId}}').join(planId),
    humanPrompt: 'Return the clarification payload requested in the system prompt.',
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
  const error = checkClarificationPayload(step.interaction?.payload?.[0], planIdOf(step));
  if (error) return [updateStatusIntent(context, parentStep, step, hookSequential, 'failed', error)];
  // keeping the payload is what keeps the widget mounted
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
  const planId = readPlanIdFromJson(json ?? step.json);
  const state = readState(context);
  if (!state?.pending) throw new Error(`[${AS_ASK_AGENT}] no pending questions in the task memory`);
  if (roundOfPlanId(planId) !== state.round) throw new Error(`[${AS_ASK_AGENT}] ${planId} is not the current round (ask-${state.round})`);

  await import('/_102020_/l2/aura/molecules/shared/widgetDecisionClarification.js');
  const element = document.createElement('widget-decision-clarification-102020');
  const value: DecisionClarificationValue = {
    title: state.pending.title,
    intro: state.pending.intro,
    userLanguage: state.userLanguage,
    questions: state.pending.questions,
  };
  (element as unknown as { value: DecisionClarificationValue }).value = value;
  const busy = createBusyHost(element);
  const labels = asLabelsFor(state.userLanguage);
  element.addEventListener('clarification-finish', (event: Event) => {
    const detail = (event as CustomEvent<{ value: { answers: DecisionAnswer[] }; action: 'continue' | 'cancel' }>).detail;
    // inside an authorized sequence any round runs the action on continue
    const running = detail.action === 'continue' && (state.pending?.kind === 'confirm' || state.authorized);
    // a second click while the first answer is still running is ignored
    if (!busy.start(running ? labels.running : labels.processing)) return;
    const answers: AsAnswer[] = (detail.value?.answers || []).map(answer => ({ id: answer.id, optionId: answer.optionId, ...(answer.notes ? { notes: answer.notes } : {}) }));
    handleAnswer(context, parentStep, step, hookSequential, state, answers, detail.action)
      .then(() => busy.stop())
      .catch(error => {
        console.error(`[${AS_ASK_AGENT}] ${error instanceof Error ? error.message : String(error)}`);
        busy.stop(false);
      });
  });
  return busy.host;
}

async function handleAnswer(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  state: AsState,
  answers: AsAnswer[],
  action: 'continue' | 'cancel',
): Promise<void> {
  const labels = asLabelsFor(state.userLanguage);
  const owner = mutableParent(context, parentStep);
  const roundPlanId = askPlanId(state.round);
  const close = (): mls.msg.AgentIntent => updateStatusIntent(context, owner, step, hookSequential, 'completed', undefined, 'input_output');

  if (action !== 'continue') {
    await saveState(context, { ...state, pending: null });
    const doneBefore = state.results.filter(result => result.ok).length;
    await applyIntentsAndResume(context, [
      resultStepIntent(context, owner, {
        planId: `${roundPlanId}-answer`,
        stepTitle: doneBefore ? `${labels.cancelled} (${labels.doneCount(doneBefore)})` : labels.cancelled,
        result: { cancelled: true, results: state.results },
      }),
      close(),
    ]);
    return;
  }

  try {
    const catalog = await loadCatalog(state.project);
    const applied = applyAnswers(state, answers);
    // runs whatever is decided and authorized (one action, or the sequence up to the next question)
    const planned = await advance(applied.state, catalog, execBffCall);

    if (planned.next.kind !== 'ask') {
      // something the user must read (an answer, a message) gets its own screen before the task closes
      const final = finalFor(planned.state, planned.next, labels);
      if (final) {
        await saveState(context, { ...planned.state, final });
        await applyIntentsAndResume(context, [
          agentStepIntent(context, rootStep(context), { agentName: AS_ANSWER_AGENT, planId: AS_ANSWER_PLAN_ID, stepTitle: labels.stepAnswer }),
          resultStepIntent(context, owner, { planId: `${roundPlanId}-answer`, stepTitle: answeredTitle(state, planned.state, labels), result: { answers, results: planned.state.results } }),
          close(),
        ]);
        return;
      }
      const results = planned.next.kind === 'finished' ? planned.next.results : planned.state.results;
      await saveState(context, planned.state);
      await applyIntentsAndResume(context, [
        resultStepIntent(context, owner, {
          planId: results.length && results.every(result => result.ok) ? 'done' : 'error',
          stepTitle: results.length ? outcomeTitle(results, labels) : labels.notUnderstood,
          result: { results },
        }),
        close(),
      ]);
      return;
    }

    const nextState: AsState = { ...planned.state, round: state.round + 1 };
    await saveState(context, nextState);
    // order: the next open round first, then the answer that completes this round, then the close
    await applyIntentsAndResume(context, [
      agentStepIntent(context, rootStep(context), {
        agentName: AS_ASK_AGENT,
        planId: askPlanId(nextState.round),
        stepTitle: nextState.pending?.title || labels.stepAsk,
      }),
      resultStepIntent(context, owner, { planId: `${roundPlanId}-answer`, stepTitle: answeredTitle(state, nextState, labels), result: { answers, results: nextState.results } }),
      close(),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await applyIntentsAndResume(context, [
      resultStepIntent(context, owner, { planId: 'error', stepTitle: `${labels.failed}: ${message}`, result: { error: message } }),
      close(),
    ]);
  }
}

// The closed round tells what ran because of it (in a sequence an answer can run actions).
function answeredTitle(before: AsState, after: AsState, labels: ReturnType<typeof asLabelsFor>): string {
  const ran = after.results.slice(before.results.length).filter(result => result.ok);
  return ran.length ? ran.map(result => labels.doneAction(result.title)).join(' · ') : labels.answered;
}
