/// <mls fileReference="_102020_/l2/agentNewSolution3/agentNewSolution3.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { isRecord, parseMaybeJson } from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';

export const NS3_PLAN_IDS = [
  'e1-clarification', 'e1-draft', 'checkpoint-draft', 'e2-journeys', 'checkpoint-journeys',
  'e3-ontology', 'e4-actors-rules-refs', 'e5-workflows-operations', 'e6-journey-map', 'e7-validation-summary',
] as const;

export type Ns3PlanId = typeof NS3_PLAN_IDS[number];

export interface Ns3RootPlan {
  userLanguage: string;
  validPrompt: boolean;
  userPrompt: string;
  invalidReason?: string;
  titles: Partial<Record<Ns3PlanId, string>>;
  uiLabels: Partial<Ns3UiLabels>;
  clarification: Ns3Clarification;
}

export interface Ns3UiLabels {
  draftTitle: string;
  approve: string;
  adjust: string;
  adjustmentPlaceholder: string;
  approving: string;
  adjusting: string;
  approved: string;
  loading: string;
  noDraft: string;
  gateOk: string;
  gateFailed: string;
  adjustDraftStepTitle: string;
  blockingClarificationTitle: string;
}

export interface Ns3Clarification {
  userLanguage: string;
  title: string;
  legends: string[];
  questions: Record<string, Ns3ClarificationQuestion>;
}

export interface Ns3ClarificationQuestion {
  type: 'open' | 'select' | 'boolean';
  question: string;
  answer: string | boolean;
  options?: { id: string; label: string }[];
}

export interface Ns3ClarificationAnswer {
  title: string;
  userLanguage: string;
  answers: Record<string, string | boolean>;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution3',
    agentProject: 102020,
    agentFolder: 'agentNewSolution3',
    agentDescription: 'Spec-first step pipeline to create a module',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
    beforeClarificationStep,
  };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const normalized = (userPrompt || '').trim();
  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt.replace('{{planIds}}', NS3_PLAN_IDS.join(', ')) },
        { type: 'human', content: normalized || '(empty prompt)' },
      ],
      taskTitle: 'newSolution3',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'newSolution3', flowName: 'agentNewSolution3' },
    },
  };
  return [addMessageAI];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const rootPlan = normalizeRootPlan(step.interaction?.payload?.[0]);
    const addSteps = buildPlannedTree(rootPlan, rootPlan.validPrompt).map(plannedStep => ({
      type: 'add-step',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: step.stepId,
      step: plannedStep,
    } as mls.msg.AgentIntentAddStep));
    if (!rootPlan.validPrompt) {
      return [
        ...addSteps,
        updateStatus(context, parentStep, step, hookSequential, 'failed', rootPlan.invalidReason || 'Invalid or insufficient prompt.'),
      ];
    }
    return addSteps;
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
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
  if (parsed.planId !== 'e1-clarification') {
    throw new Error(`[agentNewSolution3] unsupported clarification ${parsed.planId || '(missing)'}`);
  }
  await import('/_102025_/l2/widgetQuestionsForClarification.js');
  const rootPlan = getRootPlan(context);
  const clarification = rootPlan.clarification;
  const el = document.createElement('widget-questions-for-clarification-102025');
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
    void applyInitialClarification(context, parentStep, step, hookSequential, detail.value, detail.action);
  });
  return el;
}

function buildPlannedTree(plan: Ns3RootPlan, includePhase2: boolean): mls.msg.AIPayload[] {
  const title = (planId: Ns3PlanId) => getTitle(plan, planId);
  const firstStatus: mls.msg.AIStepStatus = 'pending';
  const phase1: mls.msg.AIPayload[] = [
    clarificationStep('e1-clarification', title('e1-clarification'), [], plan.clarification, firstStatus),
    agentStep('e1-draft', 'agentNs3Draft', title('e1-draft'), ['e1-clarification'], 'waiting_dependency'),
    clarificationStep('checkpoint-draft', title('checkpoint-draft'), ['e1-draft'], { planId: 'checkpoint-draft' }, 'waiting_dependency'),
  ];
  if (!includePhase2) return phase1;
  return [
    ...phase1,
    plannedStep('e2-journeys', title('e2-journeys'), ['checkpoint-draft']),
    plannedStep('checkpoint-journeys', title('checkpoint-journeys'), ['e2-journeys']),
    plannedStep('e3-ontology', title('e3-ontology'), ['checkpoint-journeys']),
    plannedStep('e4-actors-rules-refs', title('e4-actors-rules-refs'), ['e3-ontology']),
    plannedStep('e5-workflows-operations', title('e5-workflows-operations'), ['e4-actors-rules-refs']),
    plannedStep('e6-journey-map', title('e6-journey-map'), ['e5-workflows-operations']),
    plannedStep('e7-validation-summary', title('e7-validation-summary'), ['e6-journey-map']),
  ];
}

function agentStep(
  planId: Ns3PlanId,
  agentName: string,
  stepTitle: string,
  dependsOn: Ns3PlanId[],
  status: mls.msg.AIStepStatus,
): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle,
    status,
    nextSteps: [],
    agentName,
    prompt: JSON.stringify({ planId }),
    rags: [],
    planning: { planId, dependsOn, executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

function clarificationStep(
  planId: Ns3PlanId,
  stepTitle: string,
  dependsOn: Ns3PlanId[],
  json: unknown,
  status: mls.msg.AIStepStatus,
): mls.msg.AIClarificationStep {
  const jsonRecord = isRecord(json) ? json : {};
  return {
    type: 'clarification',
    stepId: 0,
    interaction: null,
    stepTitle,
    status,
    nextSteps: [],
    json: JSON.stringify({ planId, ...jsonRecord }),
    planning: { planId, dependsOn, executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIClarificationStep;
}

function plannedStep(planId: Ns3PlanId, stepTitle: string, dependsOn: Ns3PlanId[]): mls.msg.AIResultStep {
  return {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: `${stepTitle} (planned)`,
    status: 'waiting_dependency',
    nextSteps: [],
    result: JSON.stringify({ planId, status: 'planned' }),
    planning: { planId, dependsOn, executionMode: 'manual_later', executionHost: 'client', plannedOnly: true },
  } as mls.msg.AIResultStep;
}

async function applyInitialClarification(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  value: Ns3Clarification,
  action: 'continue' | 'cancel',
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution3] task invalid');
  const status: mls.msg.AIStepStatus = action === 'continue' ? 'completed' : 'failed';
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, status)];
  if (action === 'continue') {
    const answer = normalizeClarificationAnswer(value);
    intents.unshift(resultStep(context, parentStep, 'e1-clarification-answer', ['e1-clarification'], answer.title, answer));
    const e1Step = findStepByPlanId(context, 'e1-draft');
    if (e1Step && e1Step.status === 'waiting_dependency') {
      intents.push(updateStatus(context, parentStep, e1Step, hookSequential, 'pending'));
    }
  }
  const response = await mls.api.msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) {
    throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying clarification');
  }
  const ret = response as mls.msg.ResponseApplyIntents;
  context.task = ret.task;
  if (ret.message) context.message = ret.message;
  if (action === 'continue') await continuePoolingTask(context);
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

export function getRootPlan(context: mls.msg.ExecutionContext): Ns3RootPlan {
  if (!context.task) throw new Error('[getRootPlan] task invalid');
  const root = getAllSteps(context.task.iaCompressed?.nextSteps).find(item =>
    item.type === 'agent' && (item as mls.msg.AIAgentStep).agentName === 'agentNewSolution3'
  ) as mls.msg.AIAgentStep | undefined;
  const payload = root?.interaction?.payload?.[0];
  return normalizeRootPlan(payload);
}

export function getInitialClarificationAnswer(context: mls.msg.ExecutionContext): Ns3ClarificationAnswer | null {
  const step = findStepByPlanId(context, 'e1-clarification-answer') as mls.msg.AIResultStep | null;
  if (!step?.result) return null;
  const parsed = parseMaybeJson(step.result);
  return isRecord(parsed) ? parsed as unknown as Ns3ClarificationAnswer : null;
}

function findStepByPlanId(context: mls.msg.ExecutionContext, planId: string): mls.msg.AIPayload | null {
  if (!context.task) return null;
  return getAllSteps(context.task.iaCompressed?.nextSteps).find(item => (item as { planning?: { planId?: string } }).planning?.planId === planId) || null;
}

function normalizeRootPlan(payload: unknown): Ns3RootPlan {
  const parsed = parseMaybeJson(payload);
  const result = isRecord(parsed) && parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
  const record = isRecord(result) ? result : {};
  const prompt = readString(record.userPrompt) || '';
  const userLanguage = readString(record.userLanguage) || 'en';
  const titles = isRecord(record.titles) ? record.titles as Partial<Record<Ns3PlanId, string>> : {};
  const uiLabels = isRecord(record.uiLabels) ? record.uiLabels as Partial<Ns3UiLabels> : {};
  return {
    userLanguage,
    validPrompt: record.validPrompt !== false && prompt.trim().length >= 5,
    userPrompt: prompt,
    invalidReason: readString(record.invalidReason),
    titles,
    uiLabels,
    clarification: normalizeClarification(record.clarification, userLanguage, titles['e1-clarification']),
  };
}

function normalizeClarification(value: unknown, userLanguage: string, title?: string): Ns3Clarification {
  const record = isRecord(value) ? value : {};
  const questions = isRecord(record.questions) ? record.questions as Record<string, Ns3ClarificationQuestion> : defaultQuestions(userLanguage);
  return {
    userLanguage: readString(record.userLanguage) || userLanguage,
    title: readString(record.title) || title || 'Clarification 1',
    legends: Array.isArray(record.legends) ? record.legends.filter((item): item is string => typeof item === 'string') : [],
    questions,
  };
}

function normalizeClarificationAnswer(value: Ns3Clarification): Ns3ClarificationAnswer {
  return {
    title: value.title || 'Clarification 1',
    userLanguage: value.userLanguage || '',
    answers: Object.fromEntries(Object.entries(value.questions || {}).map(([key, question]) => [key, question.answer ?? ''])),
  };
}

function defaultQuestions(userLanguage: string): Record<string, Ns3ClarificationQuestion> {
  return {
    moduleName: { type: 'open', question: 'What short module name do you want?', answer: '' },
    mainActors: { type: 'open', question: 'Who uses this module day to day?', answer: '' },
    mainGoal: { type: 'open', question: 'What main outcome should this module deliver?', answer: '' },
    boundaries: { type: 'open', question: 'What should stay out of this module for now?', answer: '' },
  };
}

function getTitle(plan: Ns3RootPlan, planId: Ns3PlanId): string {
  const custom = plan.titles?.[planId];
  if (typeof custom === 'string' && custom.trim().length > 0 && custom.trim().length < 140) return custom.trim();
  return defaultTitles[planId];
}

function parseStepJson(value: unknown): { planId?: string } {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? parsed : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

const defaultTitles: Record<Ns3PlanId, string> = {
  'e1-clarification': 'Clarify the initial request', 'e1-draft': 'Draft understanding',
  'checkpoint-draft': 'Approve draft', 'e2-journeys': 'Map journeys and features',
  'checkpoint-journeys': 'Approve journeys', 'e3-ontology': 'Plan ontology',
  'e4-actors-rules-refs': 'Plan actors, rules and references',
  'e5-workflows-operations': 'Plan workflows and operations',
  'e6-journey-map': 'Consolidate journey map', 'e7-validation-summary': 'Validate and summarize',
};

const systemPrompt = `
<!-- modelType: codefast -->

Initialize collab.codes agentNewSolution3. Validate whether the prompt asks for a business module or
solution. Use the user's language for visible titles and clarification questions.

Return JSON only: { "type": "flexible", "result": { "userLanguage": "pt-BR|en|...", "validPrompt":
true, "invalidReason": "", "userPrompt": "...", "titles": { "plan id": "localized title" },
"uiLabels": { "draftTitle": "", "approve": "", "adjust": "", "adjustmentPlaceholder": "",
"approving": "", "adjusting": "", "approved": "", "loading": "", "noDraft": "", "gateOk": "",
"gateFailed": "", "adjustDraftStepTitle": "", "blockingClarificationTitle": "" },
"clarification": { "userLanguage": "...", "title": "Clarification 1", "legends": ["..."],
"questions": { "moduleName": { "type": "open", "question": "", "answer": "" }, "mainActors":
{ "type": "open", "question": "", "answer": "" }, "mainGoal": { "type": "open", "question": "",
"answer": "" }, "boundaries": { "type": "open", "question": "", "answer": "" } } } } }

Rules: invalid/vague prompts set validPrompt=false and invalidReason, but still produce clarification.
Include titles for these plan ids and UI labels in the user's language. Do not invent dependencies or
phase-2 executable agents. Do not ask architecture, ontology, page, database or workflow questions in
clarification 1.

{{planIds}}
`;
