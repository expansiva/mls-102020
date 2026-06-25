/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNewSolution2Requirements.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Requirements container for agentNewSolution2. Owns two clarifications rendered with the shared
// widget-questions-for-clarification-102025: (1) the first small clarification (no architecture),
// (2) the implementation decisions built from agentNs2Recommend. The module name answer is kept RAW
// (free text in the user's language); agentNs2Blueprint interprets and confirms it later.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAgentStepByAgentName, getAllSteps, notifyTaskChange } from '/_102027_/l2/aiAgentHelper.js';
import { getExistingModuleFolders } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import {
  ImplementationRecommendation,
  RecommendOutput,
  getRecommendOutput,
} from '/_102020_/l2/agentNewSolution2/agentNs2Recommend.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution2Requirements',
    agentProject: 102020,
    agentFolder: 'agentNewSolution2',
    agentDescription: 'Collect initial requirements + implementation decisions for Stage 1',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
    beforeClarificationStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args invalid`);
  if (!context.task) throw new Error(`(${agent.agentName})[beforePromptStep] task invalid`);

  const initialPlan = getInitialPlan(context);
  return [{
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: systemPrompt.replace('{{folders}}', Array.from(getExistingModuleFolders()).join(', ')),
    humanPrompt: `## Initial user prompt\n${initialPlan.userPrompt}\n\n## Initial plan\n${JSON.stringify(initialPlan, null, 2)}\n`,
  } as mls.msg.AgentIntentPromptReady];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!agent || !context || !step) throw new Error('[afterPromptStep] invalid params');
  const payload = step.interaction?.payload?.[0] as Output | undefined;
  if (!payload) throw new Error('[afterPromptStep] missing payload');
  if (payload.type === 'result') return [updateStatus(context, parentStep, step, hookSequential, 'failed')];
  if (payload.type !== 'clarification' || !payload.json) throw new Error(`[afterPromptStep] invalid payload: ${JSON.stringify(payload)}`);
  return []; // keep the clarification payload; beforeClarificationStep renders it
}

async function beforeClarificationStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep, hookSequential: number, json: unknown): Promise<HTMLElement> {
  if (!context.task) throw new Error('[beforeClarificationStep] invalid task');
  await import('/_102025_/l2/widgetQuestionsForClarification.js');

  const parsed = parseJson(json);
  const planId = (step as { planning?: { planId?: string } }).planning?.planId || parsed.planId;
  if (planId === 'req-implementation-decisions') return renderDecisions(agent, context, parentStep, step, hookSequential);

  const div = document.createElement('div');
  const el = document.createElement('widget-questions-for-clarification-102025');
  (el as unknown as { value: unknown }).value = {
    taskId: context.task.PK,
    stepId: step.stepId,
    title: parsed.title,
    legends: parsed.legends || [],
    userLanguage: parsed.userLanguage || '',
    questions: parsed.questions,
  };
  el.setAttribute('mode', 'new');
  el.addEventListener('clarification-finish', (event: Event) => {
    const { detail } = event as CustomEvent<{ value: RequirementsClarification; action: 'continue' | 'cancel' }>;
    applyClarificationResult(agent, context, parentStep, step, hookSequential, detail.value, detail.action).catch(error => console.error(`[${agent.agentName}] ${error?.message || error}`));
  });
  div.appendChild(el);
  return div;
}

function renderDecisions(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep, hookSequential: number): HTMLElement {
  if (!context.task) throw new Error('[renderDecisions] invalid task');
  const clarification = buildDecisionClarification(getRecommendOutput(context));
  const div = document.createElement('div');
  const el = document.createElement('widget-questions-for-clarification-102025');
  (el as unknown as { value: unknown }).value = {
    taskId: context.task.PK,
    stepId: step.stepId,
    title: clarification.title,
    legends: clarification.legends,
    userLanguage: clarification.userLanguage,
    questions: clarification.questions,
  };
  el.setAttribute('mode', 'new');
  el.addEventListener('clarification-finish', (event: Event) => {
    const { detail } = event as CustomEvent<{ value: RequirementsClarification; action: 'continue' | 'cancel' }>;
    applyDecisionResult(agent, context, parentStep, step, hookSequential, detail.value, detail.action).catch(error => console.error(`[${agent.agentName}] ${error?.message || error}`));
  });
  div.appendChild(el);
  return div;
}

async function applyClarificationResult(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep, hookSequential: number, value: RequirementsClarification, action: 'continue' | 'cancel'): Promise<void> {
  if (!context.task) throw new Error('[applyClarificationResult] task invalid');
  const status: mls.msg.AIStepStatus = action === 'continue' ? 'completed' : 'failed';
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, status)];

  if (action === 'continue') {
    const answer = normalizeAnswer(value);
    intents.unshift(resultStep(context, parentStep, 'req-clarification-answer', ['org-requirements'], answer.title, answer));
    const planned = findStepByPlanId(context.task, 'req-clarification-answer');
    if (planned) intents.push(updateStatus(context, parentStep, planned, hookSequential, 'completed'));
  }
  await applyAndContinue(agent, context, intents, action);
}

async function applyDecisionResult(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep, hookSequential: number, value: RequirementsClarification, action: 'continue' | 'cancel'): Promise<void> {
  if (!context.task) throw new Error('[applyDecisionResult] task invalid');
  const status: mls.msg.AIStepStatus = action === 'continue' ? 'completed' : 'failed';
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, status)];
  if (action === 'continue') {
    const decision = normalizeDecision(value, getRecommendOutput(context));
    intents.unshift(resultStep(context, parentStep, 'req-implementation-decisions', ['req-recommend-implementations'], decision.title, decision));
  }
  await applyAndContinue(agent, context, intents, action);
}

async function applyAndContinue(agent: IAgentMeta, context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[], action: 'continue' | 'cancel'): Promise<void> {
  const response = await mls.api.msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying clarification result');
  const ret = response as mls.msg.ResponseApplyIntents;
  context.task = ret.task;
  if (ret.message) context.message = ret.message;
  notifyTaskChange(context);

  const queue = context.task.iaCompressed?.queueFrontEnd || [];
  if (action === 'continue' && queue.some(hook => hook.type !== 'pooling')) {
    const { continuePoolingTask } = await import('/_102027_/l2/aiAgentOrchestration.js');
    await continuePoolingTask(context);
  }
}

// ── intents ────────────────────────────────────────────────────────────────────

function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, planId: string, dependsOn: string[], stepTitle: string, result: unknown): mls.msg.AgentIntentAddStep {
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

function updateStatus(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload, hookSequential: number, status: mls.msg.AIStepStatus): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
  };
}

// ── decision building ────────────────────────────────────────────────────────────

function buildDecisionClarification(output: RecommendOutput): RequirementsClarification {
  const questions: Record<string, RequirementsQuestion> = {};
  output.result.recommendations.forEach((recommendation, index) => {
    questions[questionId(recommendation, index)] = {
      type: 'select',
      question: `${recommendation.title} [${recommendation.artifactType}]\n${recommendation.description}\nMotivo: ${recommendation.reason}\nPadrao: ${recommendation.defaultPriority}.`,
      answer: recommendation.defaultPriority || recommendation.priority,
      options: [
        { id: 'now', label: 'now' },
        { id: 'soon', label: 'soon' },
        { id: 'later', label: 'later' },
        { id: 'never', label: 'never' },
      ],
    };
  });
  return {
    title: 'Decisoes de implementacao',
    userLanguage: '',
    questions,
    legends: ['Revise as recomendacoes e ajuste a prioridade.', 'Use "never" para recusar uma recomendacao nesta solucao.'],
  };
}

function normalizeDecision(value: RequirementsClarification, output: RecommendOutput): ImplementationDecisionResult {
  const decisions = output.result.recommendations.map((recommendation, index): ImplementationDecisionItem => {
    const decidedPriority = normalizePriority(value.questions?.[questionId(recommendation, index)]?.answer, recommendation.defaultPriority || recommendation.priority);
    return {
      recommendationId: recommendation.recommendationId,
      artifactType: recommendation.artifactType,
      title: recommendation.title,
      decidedPriority,
      accepted: decidedPriority !== 'never',
      reason: recommendation.reason,
    };
  });
  return {
    title: value.title || 'Decisoes de implementacao',
    userLanguage: value.userLanguage || '',
    decisions,
  };
}

function questionId(recommendation: ImplementationRecommendation, index: number): string {
  return `recommendation_${index}_${recommendation.recommendationId.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase() || 'item'}`;
}

function normalizePriority(value: unknown, fallback: DecisionPriority): DecisionPriority {
  return value === 'now' || value === 'soon' || value === 'later' || value === 'never' ? value : fallback;
}

function normalizeAnswer(value: RequirementsClarification): RequirementsClarificationAnswer {
  return {
    title: value.title || 'Initial requirements answer',
    userLanguage: value.userLanguage || '',
    answers: Object.fromEntries(Object.entries(value.questions || {}).map(([key, question]) => [key, question.answer ?? ''])),
  };
}

// ── helpers / types ────────────────────────────────────────────────────────────

function parseJson(value: unknown): { planId?: string; title?: string; legends?: string[]; userLanguage?: string; questions?: Record<string, RequirementsQuestion> } {
  if (typeof value !== 'string') return (value as Record<string, unknown>) || {};
  const trimmed = value.trim();
  return trimmed ? JSON.parse(trimmed) : {};
}

function findStepByPlanId(task: mls.msg.TaskData, planId: string): mls.msg.AIPayload | null {
  return getAllSteps(task.iaCompressed?.nextSteps).find(step => (step as { planning?: { planId?: string } }).planning?.planId === planId) || null;
}

function getInitialPlan(context: mls.msg.ExecutionContext): { userLanguage: string; requestKind: string; userPrompt: string } {
  if (!context.task) throw new Error('[getInitialPlan] task invalid');
  const rootStep = getAgentStepByAgentName(context.task, 'agentNewSolution2') as mls.msg.AIAgentStep | null;
  const payload = rootStep?.interaction?.payload?.[0] as mls.msg.AIFlexibleResultStep | undefined;
  const result = payload?.type === 'flexible' ? (payload.result as { userLanguage: string; requestKind: string; userPrompt: string }) : undefined;
  if (!result || typeof result.userPrompt !== 'string') throw new Error('[getInitialPlan] initial plan not found');
  return result;
}

export function getRequirementsClarificationAnswer(context: mls.msg.ExecutionContext): RequirementsClarificationAnswer {
  if (!context.task) throw new Error('[getRequirementsClarificationAnswer] task invalid');
  const reqStep = getAgentStepByAgentName(context.task, 'agentNewSolution2Requirements') as mls.msg.AIAgentStep | null;
  const answerStep = (reqStep?.nextSteps || []).find(s => s.type === 'result' && (s as { planning?: { planId?: string } }).planning?.planId === 'req-clarification-answer') as mls.msg.AIResultStep | undefined;
  if (!answerStep?.result) throw new Error('[getRequirementsClarificationAnswer] clarification answer not found');
  return JSON.parse(answerStep.result) as RequirementsClarificationAnswer;
}

export function getImplementationDecisionResult(context: mls.msg.ExecutionContext): ImplementationDecisionResult {
  if (!context.task) throw new Error('[getImplementationDecisionResult] task invalid');
  const step = getAllSteps(context.task.iaCompressed?.nextSteps).find(item => item.type === 'result' && (item as { planning?: { planId?: string } }).planning?.planId === 'req-implementation-decisions' && (item as mls.msg.AIResultStep).result) as mls.msg.AIResultStep | undefined;
  if (!step?.result) throw new Error('[getImplementationDecisionResult] implementation decisions not found');
  const parsed = JSON.parse(step.result) as ImplementationDecisionResult;
  if (!parsed || !Array.isArray(parsed.decisions)) throw new Error('[getImplementationDecisionResult] invalid implementation decisions');
  return parsed;
}

export function hasAcceptedNow(decisions: ImplementationDecisionResult, artifactType: string): boolean {
  return decisions.decisions.some(item => item.artifactType === artifactType && item.accepted && item.decidedPriority === 'now');
}

const systemPrompt = `
<!-- modelType: codepro -->

You are the first requirements clarification agent for the collab.codes "newSolution2" flow (Stage 1).

Generate ONE small first clarification. Do not ask about architecture, plugins, workflows, MDM, or
implementation details yet. Use the same language as the user. Every question needs a useful default
in its "answer" field.

If the request is invalid for a module or solution, return:
{ "type": "result", "result": "Short error message in the user's language" }

For a valid request, return:
{
  "type": "clarification",
  "json": {
    "userLanguage": "ISO code such as pt-BR or en",
    "title": "Clarification 1/2",
    "questions": {
      "languages": { "type": "open", "question": "", "answer": "" },
      "moduleName": { "type": "open", "question": "", "answer": "" },
      "roles": { "type": "open", "question": "", "answer": "" },
      "publicTarget": { "type": "open", "question": "", "answer": "" },
      "mainGoal": { "type": "open", "question": "", "answer": "" },
      "openQuestion1": { "type": "open", "question": "", "answer": "" }
    },
    "legends": [ "Localized note: this is the first clarification.", "Localized note: detailed planning comes later." ]
  }
}

Existing modules: {{folders}}

## Output format
Return only valid JSON in the structure:
[[OutputSection]]
`;

//#region OutputSection
export type Output =
  | { type: 'clarification'; json: RequirementsClarification }
  | { type: 'result'; result: string };

export interface RequirementsClarification {
  userLanguage: string;
  title: string;
  questions: Record<string, RequirementsQuestion>;
  legends: string[];
}

export interface RequirementsQuestion {
  type: 'open' | 'select' | 'boolean';
  question: string;
  answer: string | boolean;
  options?: { id: string; label: string }[];
}
//#endregion

export interface RequirementsClarificationAnswer {
  title: string;
  userLanguage: string;
  answers: Record<string, string | boolean>;
}

type DecisionPriority = 'now' | 'soon' | 'later' | 'never';

export interface ImplementationDecisionItem {
  recommendationId: string;
  artifactType: ImplementationRecommendation['artifactType'];
  title: string;
  decidedPriority: DecisionPriority;
  accepted: boolean;
  reason: string;
}

export interface ImplementationDecisionResult {
  title: string;
  userLanguage: string;
  decisions: ImplementationDecisionItem[];
}
