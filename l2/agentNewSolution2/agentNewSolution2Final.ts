/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNewSolution2Final.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Handoff container + final summary for Stage 1. The container (org-handoff) completes to open its
// children (behavior-validate -> final-resume). final-resume shows the Stage-1 summary and, on finish,
// freezes the run: writes l5/{module}/process.defs.ts, records the next-stage steps the client chose,
// clears traces, and CLEANS the task inputs/outputs. The permanent l4 artifacts stay.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAgentStepByAgentName, getAllSteps, notifyTaskChange } from '/_102027_/l2/aiAgentHelper.js';
import { createUpdateStatusIntent, getInitialPlanSummary } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { clearRunArtifacts, getApprovedModuleName, readBehaviorHealthReport, writeProcessRun, type ProcessNextStep, type ProcessRun } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution2/ns2Plan.js';
import { computeBehaviorHealthReport, type BehaviorHealthReport } from '/_102020_/l2/agentNewSolution2/agentValidateBehaviorModel.js';
import { getImplementationDecisionResult } from '/_102020_/l2/agentNewSolution2/agentNewSolution2Requirements.js';

const AGENT_NAME = 'agentNewSolution2Final';
const ROOT_AGENT_NAME = 'agentNewSolution2';

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Stage-1 handoff: validate, freeze and summarize the behavior model', visibility: 'private', beforePromptStep, beforeClarificationStep, openStepView };
}

// No-LLM container: completing it opens behavior-validate + final-resume.
async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution2Final] task invalid');
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}

async function beforeClarificationStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep, hookSequential: number): Promise<HTMLElement> {
  if (!context.task) throw new Error('[beforeClarificationStep] invalid task');
  await import('/_102025_/l2/widgetQuestionsForClarification.js');

  let report: BehaviorHealthReport | undefined;
  try { report = computeBehaviorHealthReport(context); } catch { /* payloads may be gone on re-open */ }

  const div = document.createElement('div');
  const el = document.createElement('widget-questions-for-clarification-102025');
  (el as unknown as { value: unknown }).value = {
    taskId: context.task.PK,
    stepId: step.stepId,
    title: 'Resumo da Etapa 1 — modelo de comportamento',
    legends: buildLegends(report),
    userLanguage: '',
    questions: {
      openExperience: { type: 'select', question: 'Abrir a Etapa 2 (Experiencia: telas + BFF)?', answer: 'yes', options: [{ id: 'yes', label: 'sim' }, { id: 'no', label: 'nao' }] },
      openBackend: { type: 'select', question: 'Abrir a Etapa 3 (Backend: persistencia + implementacao)?', answer: 'yes', options: [{ id: 'yes', label: 'sim' }, { id: 'no', label: 'nao' }] },
    },
  };
  el.setAttribute('mode', 'new');
  el.addEventListener('clarification-finish', (event: Event) => {
    const { detail } = event as CustomEvent<{ value: { questions?: Record<string, { answer?: string }> }; action: 'continue' | 'cancel' }>;
    applyFinish(agent, context, parentStep, step, hookSequential, detail.value, detail.action).catch(error => console.error(`[${AGENT_NAME}] ${error?.message || error}`));
  });
  div.appendChild(el);
  return div;
}

async function applyFinish(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIClarificationStep, hookSequential: number, value: { questions?: Record<string, { answer?: string }> }, action: 'continue' | 'cancel'): Promise<void> {
  if (!context.task) throw new Error('[applyFinish] task invalid');

  if (action !== 'continue') {
    await applyIntents(context, [updateStatus(context, parentStep, step, hookSequential, 'failed')]);
    return;
  }

  const moduleName = getApprovedModuleName(context) || normalizeModuleFolderName(String(getInitialPlanSummary(context).moduleName || 'module'), 'module');
  const wantExperience = value.questions?.openExperience?.answer !== 'no';
  const wantBackend = value.questions?.openBackend?.answer !== 'no';

  // Freeze the run record (kept in l5 — survives clear traces). Next-stage steps are recorded as
  // pending pointers the client can open later; the permanent l4 artifacts are the real handoff.
  try {
    let report: BehaviorHealthReport | undefined;
    try { report = computeBehaviorHealthReport(context); } catch { /* tolerate */ }
    const initialPlan = getInitialPlanSummary(context);
    const nextSteps: ProcessNextStep[] = [];
    if (wantExperience) nextSteps.push({ id: 'stage2-experience', kind: 'workflowExperience', title: 'Etapa 2 — Experiencia', description: 'Telas + BFF a partir dos l4/workflows e l4/operations.', status: 'pending' });
    if (wantBackend) nextSteps.push({ id: 'stage3-backend', kind: 'backendImplementation', title: 'Etapa 3 — Backend', description: 'Persistencia + implementacao a partir das ontology/operations l4.', status: 'pending' });
    const run: ProcessRun = {
      runId: `newSolution2-${Date.now()}`,
      kind: 'newSolution2-behavior',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      initialPrompt: String(initialPlan.userPrompt || ''),
      userLanguage: String(initialPlan.userLanguage || ''),
      decisions: safe(() => getImplementationDecisionResult(context).decisions) || [],
      openDetails: Array.isArray(initialPlan.openDetails) ? (initialPlan.openDetails as { title: string; description: string }[]) : [],
      healthReport: report ?? null,
      nextSteps,
    };
    await writeProcessRun(moduleName, run);
  } catch (error) {
    console.warn(`[${AGENT_NAME}] writeProcessRun failed`, error);
  }

  // Clear l4 traces/checkpoints (keeps the health report + permanent defs).
  try { await clearRunArtifacts(moduleName); } catch (error) { console.warn(`[${AGENT_NAME}] clearRunArtifacts failed`, error); }

  // Complete the resume + root, and CLEAN every completed step's inputs/outputs.
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, 'completed', 'input_output')];
  intents.push(...buildCleanupIntents(context, hookSequential));
  const rootStep = getAgentStepByAgentName(context.task, ROOT_AGENT_NAME) as mls.msg.AIAgentStep | null;
  if (rootStep) intents.push(updateStatus(context, rootStep, rootStep, hookSequential, 'completed'));

  await applyIntents(context, intents);
}

/** One cleaner update-status per completed agent/result step that still carries a payload. */
function buildCleanupIntents(context: mls.msg.ExecutionContext, hookSequential: number): mls.msg.AgentIntent[] {
  if (!context.task) return [];
  const steps = getAllSteps(context.task.iaCompressed?.nextSteps);
  const parentOf = buildParentMap(steps);
  const intents: mls.msg.AgentIntent[] = [];
  for (const s of steps) {
    if (s.type !== 'agent' && s.type !== 'result') continue;
    if (s.status !== 'completed') continue;
    const hasPayload = !!(s.interaction?.payload?.length);
    if (!hasPayload) continue;
    const parentId = parentOf.get(s.stepId) ?? s.stepId;
    intents.push({
      type: 'update-status',
      hookSequential,
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task.PK,
      parentStepId: parentId,
      stepId: s.stepId,
      status: 'completed',
      cleaner: 'input_output',
    });
  }
  return intents;
}

function buildParentMap(steps: mls.msg.AIPayload[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const s of steps) {
    for (const child of s.nextSteps || []) map.set(child.stepId, s.stepId);
    for (const child of s.interaction?.payload || []) if (child && typeof (child as { stepId?: number }).stepId === 'number') map.set((child as { stepId: number }).stepId, s.stepId);
  }
  return map;
}

async function openStepView(agent: IAgentMeta, context: mls.msg.ExecutionContext, step: mls.msg.AIAgentStep): Promise<HTMLElement> {
  const moduleName = getApprovedModuleName(context) || 'module';
  const report = await readBehaviorHealthReport(moduleName);
  const div = document.createElement('div');
  const pre = document.createElement('pre');
  pre.textContent = report ? JSON.stringify(report, null, 2) : 'Behavior model frozen. Health report not available.';
  div.appendChild(pre);
  return div;
}

async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await mls.api.msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying finish intents');
  const ret = response as mls.msg.ResponseApplyIntents;
  context.task = ret.task;
  if (ret.message) context.message = ret.message;
  notifyTaskChange(context);
  const queue = context.task.iaCompressed?.queueFrontEnd || [];
  if (queue.some(hook => hook.type !== 'pooling')) {
    const { continuePoolingTask } = await import('/_102027_/l2/aiAgentOrchestration.js');
    await continuePoolingTask(context);
  }
}

function updateStatus(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIPayload, step: mls.msg.AIPayload, hookSequential: number, status: mls.msg.AIStepStatus, cleaner?: 'input' | 'input_output'): mls.msg.AgentIntentUpdateStatus {
  const intent: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
  };
  if (cleaner) intent.cleaner = cleaner;
  return intent;
}

function buildLegends(report?: BehaviorHealthReport): string[] {
  if (!report) return ['O modelo de comportamento foi congelado em l4 (ontology, rules, workflows, operations).'];
  return [
    `Saude: ${report.passed ? 'OK' : 'com erros'} — ${report.errors.length} erro(s), ${report.warnings.length} aviso(s).`,
    `Modelo: ${report.counts.entities} entidades, ${report.counts.workflows} workflows, ${report.counts.operations} operacoes.`,
    'Artefatos permanentes em l4 (ontology, rules, workflows, operations) — consumidos pelas Etapas 2 e 3.',
  ];
}

function safe<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}
