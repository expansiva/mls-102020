/// <mls fileReference="_102020_/l2/agentNewSolution3/agentNewSolution3.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  isRecord,
  listExistingModuleFolders,
  ns3PipelineArtifactFileInfo,
  parseMaybeJson,
  readJsonArtifact,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';
import { Ns3PipelineState, readNs3Pipeline } from '/_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.js';

export const NS3_PLAN_IDS = [
  'e1-clarification', 'e1-clarification-answer', 'e1-draft', 'checkpoint-draft', 'e2-journeys', 'checkpoint-journeys',
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
  // Empty "@@newSolution3" (the runtime strips the mention) means resume the first module whose
  // Phase 1 is incomplete, so the user does not repeat the clarification they already answered.
  if (!normalized) {
    const resume = await findResumableNs3Module();
    if (resume) return [buildRootMessageAI(agent, context, resume.sourcePrompt, { resumeModule: resume.moduleName, resumeTarget: resume.target })];
  }
  return [buildRootMessageAI(agent, context, normalized || '(empty prompt)', {})];
}

function buildRootMessageAI(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  content: string,
  extraMemory: Record<string, string>,
): mls.msg.AgentIntentAddMessageAI {
  return {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt.replace('{{planIds}}', NS3_PLAN_IDS.join(', ')) },
        { type: 'human', content },
      ],
      taskTitle: 'newSolution3',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'newSolution3', flowName: 'agentNewSolution3', ...extraMemory },
    },
  };
}

type Ns3ResumeTarget = 'e1-draft' | 'e2-journeys';

interface Ns3ResumeInfo {
  moduleName: string;
  sourcePrompt: string;
  target: Ns3ResumeTarget;
}

// Scan modules in the active project and return the first one whose Phase 1 artifacts are not done.
// A step counts as done when it was approved or its last gate passed (the human checkpoint that
// freezes it is layered on top and does not change which step must run next).
async function findResumableNs3Module(): Promise<Ns3ResumeInfo | null> {
  for (const moduleName of listExistingModuleFolders()) {
    const pipeline = await readNs3Pipeline(moduleName);
    if (!pipeline) continue;
    const target = resolveResumeTarget(pipeline);
    // Phase 1 resume currently re-enters at E2 only (E1 needs the clarification the fresh flow owns).
    if (target !== 'e2-journeys') continue;
    const draft = await readJsonArtifact<{ sourcePrompt?: string }>(ns3PipelineArtifactFileInfo(moduleName, 'e1-draft', '.json'), false);
    if (!draft) continue;
    return { moduleName, sourcePrompt: readString(draft.sourcePrompt) || moduleName, target };
  }
  return null;
}

function resolveResumeTarget(pipeline: Ns3PipelineState): Ns3ResumeTarget | null {
  const e1 = pipeline.steps['e1-draft'];
  const e2 = pipeline.steps['e2-journeys'];
  if (!e1 || !(e1.status === 'approved' || e1.lastGate?.ok)) return 'e1-draft';
  if (!e2 || !(e2.status === 'approved' || e2.lastGate?.ok)) return 'e2-journeys';
  return null;
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
    const resumeModule = readString(context.task?.iaCompressed?.longMemory?.resumeModule);
    if (resumeModule) {
      return buildResumeTree(resumeModule).map(resumeStep => ({
        type: 'add-step',
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: step.stepId,
        step: resumeStep,
      } as mls.msg.AgentIntentAddStep));
    }
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
  // Human checkpoint 1 mirrors the proven agentNewSolutionFinal shape: a no-LLM wrapper agent step
  // whose CHILD clarification renders the custom widget. The clarification must live nested under an
  // agent (not as a flat sibling) so the frontend can resolve its owning agent and mount the widget.
  const checkpointDraft = agentStep('checkpoint-draft', 'agentNs3Draft', title('checkpoint-draft'), ['e1-draft'], 'waiting_dependency');
  checkpointDraft.nextSteps = [
    clarificationStep('checkpoint-draft-view', title('checkpoint-draft'), ['checkpoint-draft'], { planId: 'checkpoint-draft-view' }, 'waiting_dependency'),
  ];
  const phase1: mls.msg.AIPayload[] = [
    agentStep('e1-clarification', 'agentNs3Draft', title('e1-clarification'), [], 'waiting_human_input'),
    agentStep('e1-draft', 'agentNs3Draft', title('e1-draft'), ['e1-clarification-answer'], 'waiting_dependency'),
    checkpointDraft,
  ];
  if (!includePhase2) return phase1;
  return [
    ...phase1,
    agentStep('e2-journeys', 'agentNs3Journeys', title('e2-journeys'), ['checkpoint-draft-view'], 'waiting_dependency'),
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
  dependsOn: string[],
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
  planId: string,
  stepTitle: string,
  dependsOn: string[],
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

// Resume tree: a single E2 agent step that is ready to run. It must NOT be `waiting_dependency`:
// collab-messages only re-evaluates dependencies when some step COMPLETES (addTaskAISteps ->
// unlockWaitingDependencySteps), so a waiting_dependency step added on its own would stay parked with
// no hook. A single, non-waiting_dependency agent step gets its beforePromptStep enqueued immediately
// (addTaskAISteps, isIntentionsSteps branch). The agent resolves the module and reads e1-draft.json
// from disk, so no clarification/draft steps need to be rebuilt.
function buildResumeTree(moduleName: string): mls.msg.AIPayload[] {
  return [
    {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: defaultTitles['e2-journeys'],
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: 'agentNs3Journeys',
      prompt: JSON.stringify({ planId: 'e2-journeys', moduleName }),
      rags: [],
      planning: { planId: 'e2-journeys', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  ];
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
    clarification: normalizeClarification(record.clarification, userLanguage, titles['e1-clarification'], prompt),
  };
}

function normalizeClarification(value: unknown, userLanguage: string, title?: string, userPrompt = ''): Ns3Clarification {
  const record = isRecord(value) ? value : {};
  const fallbackQuestions = defaultQuestions(userLanguage, userPrompt);
  const rawQuestions = isRecord(record.questions) ? record.questions as Record<string, Ns3ClarificationQuestion> : fallbackQuestions;
  const questions = normalizeClarificationQuestions(rawQuestions, fallbackQuestions);
  return {
    userLanguage: readString(record.userLanguage) || userLanguage,
    title: readString(record.title) || title || 'Clarification 1',
    legends: Array.isArray(record.legends) ? record.legends.filter((item): item is string => typeof item === 'string') : [],
    questions,
  };
}

function normalizeClarificationQuestions(
  rawQuestions: Record<string, Ns3ClarificationQuestion>,
  fallbackQuestions: Record<string, Ns3ClarificationQuestion>,
): Record<string, Ns3ClarificationQuestion> {
  const normalized: Record<string, Ns3ClarificationQuestion> = {};
  for (const [key, fallback] of Object.entries(fallbackQuestions)) {
    const question = rawQuestions[key] || fallback;
    const text = readString(question.question) || fallback.question;
    const answer = question.answer === undefined || question.answer === '' ? fallback.answer : question.answer;
    normalized[key] = {
      ...question,
      type: question.type || fallback.type,
      question: text,
      answer,
      ...(question.options || fallback.options ? { options: question.options || fallback.options } : {}),
    };
  }
  for (const [key, question] of Object.entries(rawQuestions)) {
    if (normalized[key]) continue;
    const text = readString(question.question) || key;
    normalized[key] = {
      ...question,
      type: question.type || 'open',
      question: text,
      answer: question.answer === undefined ? '' : question.answer,
    };
  }
  return normalized;
}

function normalizeClarificationAnswer(value: Ns3Clarification): Ns3ClarificationAnswer {
  return {
    title: value.title || 'Clarification 1',
    userLanguage: value.userLanguage || '',
    answers: Object.fromEntries(Object.entries(value.questions || {}).map(([key, question]) => [key, question.answer ?? ''])),
  };
}

function defaultQuestions(userLanguage: string, userPrompt = ''): Record<string, Ns3ClarificationQuestion> {
  const defaults = deriveClarificationDefaults(userPrompt, userLanguage);
  return {
    moduleName: { type: 'open', question: 'What short module name do you want?', answer: defaults.moduleName },
    mainActors: { type: 'open', question: 'Who uses this module day to day?', answer: defaults.mainActors },
    mainGoal: { type: 'open', question: 'What main outcome should this module deliver?', answer: defaults.mainGoal },
    boundaries: { type: 'open', question: 'What should stay out of this module for now?', answer: defaults.boundaries },
  };
}

function deriveClarificationDefaults(userPrompt: string, userLanguage: string): Record<'moduleName' | 'mainActors' | 'mainGoal' | 'boundaries', string> {
  const prompt = userPrompt.replace(/\s+/g, ' ').trim();
  const portuguese = prefersPortuguese(prompt, userLanguage);
  const moduleName = extractFirstMatch(prompt, [
    /(?:chamado|chamada|called|named)\s+["']?([A-Za-z][\w-]{1,48})/i,
    /(?:app|module|modulo|módulo|solucao|solução)\s+([A-Za-z][\w-]{1,48})/i,
  ]) || 'module';
  const mainGoal = extractSection(prompt, ['Foco:', 'Focus:', 'Objetivo:', 'Goal:']) || truncateText(prompt, 220);
  const mainActors = extractSection(prompt, ['Atores:', 'Actors:', 'Usuários:', 'Usuarios:', 'Users:'])
    || inferActorsFromPrompt(prompt, portuguese);
  const boundaries = extractSection(prompt, ['Fora de escopo:', 'Out of scope:', 'Limites:', 'Boundaries:'])
    || (portuguese
      ? 'Usar apenas o escopo de negócio descrito no prompt; adiar detalhes de implementação, banco de dados e layout para etapas posteriores.'
      : 'Use only the business scope described in the prompt; defer implementation details, database design, and page layout until later steps.');
  return { moduleName, mainActors, mainGoal, boundaries };
}

function inferActorsFromPrompt(prompt: string, portuguese: boolean): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('cafe') || lower.includes('café') || lower.includes('cafeteria') || lower.includes('lanchonete')) {
    return portuguese ? 'Atendente/operador de POS, equipe de cozinha e gestor da loja.' : 'Attendant/POS operator, kitchen staff, and store manager.';
  }
  return portuguese ? 'Principais usuários de negócio descritos no prompt.' : 'Primary business users described by the prompt.';
}

function prefersPortuguese(prompt: string, userLanguage: string): boolean {
  const text = `${userLanguage} ${prompt}`.toLowerCase();
  return text.includes('pt-br') || text.includes('portugu') || text.includes('módulo') || text.includes('solução');
}

function extractFirstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function extractSection(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const index = text.toLowerCase().indexOf(label.toLowerCase());
    if (index < 0) continue;
    const after = text.slice(index + label.length).trim();
    const stop = after.search(/\s(?:Entidades principais|Telas chave|Funcionalidade LLM|Foco|Entities|Screens|Key screens|LLM feature|Focus|linguagem|language):/i);
    return truncateText((stop >= 0 ? after.slice(0, stop) : after).trim(), 240);
  }
  return undefined;
}

function truncateText(text: string, maxLength: number): string {
  const clean = text.trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
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
  'e1-clarification': 'Clarify the initial request',
  'e1-clarification-answer': 'Initial clarification answer',
  'e1-draft': 'Draft understanding',
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
clarification 1. Every clarification question must include a visible, useful default answer derived
from the user's prompt; use an empty answer only when the prompt provides no safe default.

{{planIds}}
`;
