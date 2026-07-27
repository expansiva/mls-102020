/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/steps/t2-clarify/agentNtClarify.ts" enhancement="_102027_/l2/enhancementAgent"/>

// t2-clarify — CHECKPOINT 1: collect the theme fields the initial prompt did not pin
// down. Supported checkpoint pattern (skills/collab_messages.md "Rendering a checkpoint"):
// beforePromptStep emits a clarification into THIS step's own payload (cheap call),
// afterPromptStep returns [] so the payload (and therefore the widget) stays mounted,
// beforeClarificationStep mounts the shared Decision Clarification widget, and the human
// answer becomes the completed 't2-done' result that unlocks t3-generate.
// The questions come from l4/agentNewTheme/plan.json — the LLM only emits the envelope.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  NT_AGENT_FOLDER,
  ntAnswersFile,
  ntPlanFile,
  readJsonArtifact,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntFs.js';
import { NtAnswer, NtPlan } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';
import {
  ntAnswerResultIntent,
  ntApplyIntentsAndRefresh,
  ntCheckClarificationPayload,
  ntClarificationPromptReady,
  ntDoneAnchor,
  ntFindMutableParent,
  ntUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntSteps.js';
import type {
  DecisionAnswer,
  DecisionClarificationValue,
  DecisionQuestion,
} from '/_102020_/l2/aura/molecules/shared/widgetDecisionClarificationLogic.js';

const AGENT_NAME = 'agentNtClarify';
const PLAN_ID = 't2-clarify';

const LABELS: Record<string, { intro: string; answered: string; cancelled: string }> = {
  pt: {
    intro: 'Responda para completar o estilo do tema. As opções recomendadas já vêm marcadas.',
    answered: 'Estilo completado',
    cancelled: 'Cancelado pelo usuário',
  },
  en: {
    intro: 'Answer to complete the theme style. The recommended options come pre-selected.',
    answered: 'Style completed',
    cancelled: 'Cancelled by the user',
  },
};

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NT_AGENT_FOLDER}/steps/t2-clarify`,
    agentDescription: 't2-clarify — Checkpoint 1: collects the missing theme fields',
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
  const plan = await readPlan();
  return [ntClarificationPromptReady(context, parentStep, hookSequential, {
    planId: PLAN_ID,
    stepArgs: args || step.prompt || JSON.stringify({ planId: PLAN_ID }),
    systemPrompt: buildEnvelopePrompt(plan.title),
    humanPrompt: `Render Checkpoint 1 with ${plan.questions.length} question(s). Return only the clarification payload requested in the system prompt.`,
  })];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const error = ntCheckClarificationPayload(step.interaction?.payload?.[0], PLAN_ID);
  if (error) return [ntUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error)];
  // Keep the payload: it is what the framework renders the checkpoint from.
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
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const planId = readPlanId(json);
  if (planId !== PLAN_ID) throw new Error(`[${AGENT_NAME}] unsupported clarification ${planId || '(missing)'}`);

  const plan = await readPlan();
  await import('/_102020_/l2/aura/molecules/shared/widgetDecisionClarification.js');
  const el = document.createElement('widget-decision-clarification-102020');
  const labels = labelsFor(plan.userLanguage);
  const value: DecisionClarificationValue = {
    title: plan.title,
    intro: labels.intro,
    userLanguage: plan.userLanguage,
    questions: plan.questions.map(toDecisionQuestion),
  };
  (el as unknown as { value: DecisionClarificationValue }).value = value;
  el.addEventListener('clarification-finish', (event: Event) => {
    const detail = (event as CustomEvent<{ value: { answers: DecisionAnswer[] }; action: 'continue' | 'cancel' }>).detail;
    void applyAnswers(context, parentStep, step, hookSequential, plan, detail.value?.answers || [], detail.action)
      .catch(error => console.error(`[${AGENT_NAME}] ${error instanceof Error ? error.message : String(error)}`));
  });
  return el;
}

async function applyAnswers(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  plan: NtPlan,
  widgetAnswers: DecisionAnswer[],
  action: 'continue' | 'cancel',
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const labels = labelsFor(plan.userLanguage);
  const mutationParent = ntFindMutableParent(context, parentStep);

  if (action !== 'continue') {
    await ntApplyIntentsAndRefresh(context, [
      ntUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', labels.cancelled),
    ], false);
    return;
  }

  const answers: NtAnswer[] = widgetAnswers.map(answer => ({
    field: answer.id,
    ...(answer.optionId ? { value: answer.optionId } : {}),
    ...(answer.notes ? { notes: answer.notes } : {}),
  }));
  await writeJsonArtifact(ntAnswersFile(), { savedAt: new Date().toISOString(), answers });

  // Intent order matters: the completed answer result (the 't2-done' anchor t3 depends
  // on) lands BEFORE the update-status that closes this step.
  await ntApplyIntentsAndRefresh(context, [
    ntAnswerResultIntent(context, mutationParent, {
      planId: ntDoneAnchor(PLAN_ID),
      stepTitle: labels.answered,
      result: { answers },
    }),
    // 'input_output' drops the widget interaction once the answers are on disk
    // (the task record has a 400KB limit).
    ntUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
  ], true);
}

function toDecisionQuestion(question: NtPlan['questions'][number]): DecisionQuestion {
  return {
    id: question.field,
    question: question.question,
    options: question.options,
    allowNotes: question.allowNotes,
  };
}

async function readPlan(): Promise<NtPlan> {
  const plan = await readJsonArtifact<NtPlan>(ntPlanFile(), true);
  if (!plan || !Array.isArray(plan.questions)) throw new Error(`[${AGENT_NAME}] plan.json missing or invalid`);
  return plan;
}

function labelsFor(userLanguage: string): { intro: string; answered: string; cancelled: string } {
  return LABELS[(userLanguage || '').slice(0, 2).toLowerCase()] || LABELS.en;
}

function readPlanId(value: unknown): string {
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  if (typeof parsed !== 'object' || parsed === null) return '';
  const planId = (parsed as Record<string, unknown>).planId;
  return typeof planId === 'string' ? planId : '';
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// The cheap call only produces the envelope the framework needs to render a checkpoint;
// the questions themselves come from plan.json (deterministic, already gated).
function buildEnvelopePrompt(title: string): string {
  return `<!-- modelType: general -->

Return JSON only. Do not call tools. Do not explain.

Required payload:
{
  "type": "clarification",
  "json": {
    "planId": "${PLAN_ID}",
    "title": ${JSON.stringify(title)}
  }
}`;
}
