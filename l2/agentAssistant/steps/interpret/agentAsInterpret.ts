/// <mls fileReference="_102020_/l2/agentAssistant/steps/interpret/agentAsInterpret.ts" enhancement="_102027_/l2/enhancementAgent"/>

// interpret — THE model call. beforePromptStep builds the catalog of the app (asStor + asCatalog)
// and asks the model which command(s) fit the sentence and what the user already said.
// afterPromptStep gates the answer against the catalog, runs the deterministic resolution
// (list queries through /execBff) and either answers right away (nothing fits) or plants the
// first 'ask-1' round. The state goes to the task memory before the round is added.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { extractVToolOutput } from '/_102020_/l2/aura/molecules/shared/llmTool.js';
import { AS_AGENT_FOLDER, loadCatalog, loadManual, readAgentText } from '/_102020_/l2/agentAssistant/helpers/asStor.js';
import { hasManualContent, manualIndex } from '/_102020_/l2/agentAssistant/helpers/asManual.js';
import { execBffCall } from '/_102020_/l2/agentAssistant/helpers/asBff.js';
import { asLabelsFor } from '/_102020_/l2/agentAssistant/helpers/asLabels.js';
import { advance, createState, finalFor, outcomeTitle } from '/_102020_/l2/agentAssistant/helpers/asPlan.js';
import {
  AS_ANSWER_AGENT,
  AS_ANSWER_PLAN_ID,
  AS_ASK_AGENT,
  AS_INTERPRET_AGENT,
  AS_INTERPRET_PLAN_ID,
  askPlanId,
} from '/_102020_/l2/agentAssistant/helpers/asIds.js';
import {
  agentStepIntent,
  resultStepIntent,
  rootStep,
  saveState,
  updateStatusIntent,
} from '/_102020_/l2/agentAssistant/helpers/asSteps.js';
import {
  AS_INTERPRET_RESULT_KEYS,
  AS_INTERPRET_TOOL,
  buildInterpretHumanPrompt,
  buildInterpretSystemPrompt,
  buildInterpretTool,
} from '/_102020_/l2/agentAssistant/steps/interpret/tool.js';
import { gateInterpretation } from '/_102020_/l2/agentAssistant/steps/interpret/gate.js';
import { todayInfo } from '/_102020_/l2/agentAssistant/helpers/asDates.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: AS_INTERPRET_AGENT,
    agentProject: 102020,
    agentFolder: `${AS_AGENT_FOLDER}/steps/interpret`,
    agentDescription: 'interpret — chooses the app command(s) for the sentence and resolves what it can',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
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
  if (!context.task) throw new Error(`[${AS_INTERPRET_AGENT}] task invalid`);
  const { userText, project } = readEntry(context);
  try {
    const catalog = await loadCatalog(project);
    if (!catalog.commands.length) {
      const labels = asLabelsFor(navigatorLanguage());
      return [
        resultStepIntent(context, rootStep(context), { planId: 'reply', stepTitle: labels.noActions, result: { project, issues: catalog.issues } }),
        updateStatusIntent(context, parentStep, step, hookSequential, 'completed', labels.noActions),
      ];
    }
    // the manual never blocks: without it the 'manual' mode is simply not offered
    const manual = await loadManual(project);
    const appMap = hasManualContent(manual) ? manualIndex(manual) : null;
    const promptMd = await readAgentText('steps/interpret', 'prompt', '.md');
    const schema = JSON.parse(await readAgentText('schemas', 'interpret.schema', '.json')) as Record<string, unknown>;
    const intent = {
      type: 'prompt_ready',
      args: args || step.prompt || JSON.stringify({ planId: AS_INTERPRET_PLAN_ID }),
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task.PK,
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: buildInterpretSystemPrompt(promptMd),
      humanPrompt: buildInterpretHumanPrompt(userText, catalog, todayInfo(), appMap),
      tools: [buildInterpretTool(schema)],
      toolChoice: { type: 'function', function: { name: AS_INTERPRET_TOOL } },
    } as unknown as mls.msg.AgentIntentPromptReady;
    return [intent];
  } catch (error) {
    return failWithResult(context, parentStep, step, hookSequential, navigatorLanguage(), error);
  }
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AS_INTERPRET_AGENT}] task invalid`);
  const { userText, project } = readEntry(context);
  let language = navigatorLanguage();
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], AS_INTERPRET_TOOL, AS_INTERPRET_RESULT_KEYS);
    const catalog = await loadCatalog(project);
    const { interpretation, issues } = output.status === 'failed'
      ? { interpretation: { userLanguage: language, reply: output.trace.join(' '), mode: 'alternatives' as const, candidates: [], manual: null }, issues: [] }
      : gateInterpretation(output.result, catalog, await loadManual(project));
    language = interpretation.userLanguage;
    const labels = asLabelsFor(language);
    const trace = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

    if (interpretation.mode === 'manual' && interpretation.manual) {
      // how-to / what-exists: nothing runs; the answer step writes it from the app's defs
      const state = {
        ...createState(project, userText, interpretation.userLanguage, '', []),
        mode: 'manual' as const,
        manual: interpretation.manual,
        final: { kind: 'answer' as const, text: '' },
      };
      await saveState(context, state);
      return [
        agentStepIntent(context, rootStep(context), { agentName: AS_ANSWER_AGENT, planId: AS_ANSWER_PLAN_ID, stepTitle: labels.stepAnswer }),
        updateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace || undefined, 'input_output'),
      ];
    }

    const initial = createState(project, userText, interpretation.userLanguage, interpretation.reply, interpretation.candidates, interpretation.mode);
    // only a question is authorized from the start (it reads); a command is never sent from here
    const planned = await advance(initial, catalog, execBffCall);
    const root = rootStep(context);

    if (planned.next.kind !== 'ask') {
      // a question ran (it needs no confirmation) or nothing fits: the user must read the outcome
      const final = finalFor(planned.state, planned.next, labels);
      if (final) {
        await saveState(context, { ...planned.state, final });
        return [
          agentStepIntent(context, root, { agentName: AS_ANSWER_AGENT, planId: AS_ANSWER_PLAN_ID, stepTitle: labels.stepAnswer }),
          updateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace || undefined, 'input_output'),
        ];
      }
      const text = planned.next.kind === 'finished' ? outcomeTitle(planned.next.results, labels) : labels.notUnderstood;
      await saveState(context, planned.state);
      return [
        resultStepIntent(context, root, { planId: 'reply', stepTitle: text, result: { text, issues } }),
        updateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace || undefined, 'input_output'),
      ];
    }

    const state = { ...planned.state, round: 1 };
    await saveState(context, state);
    // the next open step goes in BEFORE this step is closed (parent auto-completion)
    return [
      agentStepIntent(context, root, { agentName: AS_ASK_AGENT, planId: askPlanId(1), stepTitle: state.pending?.title || labels.stepAsk }),
      updateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace || undefined, 'input_output'),
    ];
  } catch (error) {
    return failWithResult(context, parentStep, step, hookSequential, language, error);
  }
}

function failWithResult(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  language: string,
  error: unknown,
): mls.msg.AgentIntent[] {
  const labels = asLabelsFor(language);
  const message = error instanceof Error ? error.message : String(error);
  return [
    resultStepIntent(context, rootStep(context), { planId: 'reply', stepTitle: `${labels.failed}: ${message}`, result: { error: message } }),
    updateStatusIntent(context, parentStep, step, hookSequential, 'completed', message),
  ];
}

function readEntry(context: mls.msg.ExecutionContext): { userText: string; project: number } {
  const memory = context.task?.iaCompressed?.longMemory || {};
  const project = Number(memory.project);
  if (!Number.isInteger(project) || project <= 0) throw new Error(`[${AS_INTERPRET_AGENT}] task memory has no project`);
  return { userText: typeof memory.userText === 'string' ? memory.userText : '', project };
}

function navigatorLanguage(): string {
  return typeof navigator !== 'undefined' && typeof navigator.language === 'string' ? navigator.language : 'en';
}
