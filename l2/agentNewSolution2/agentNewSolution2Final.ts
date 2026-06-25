/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNewSolution2Final.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Handoff for Stage 1. Two roles, distinguished by planId:
//  - org-handoff (container): completing it opens behavior-validate + final-resume.
//  - final-resume (agent): AUTO-FINISH — no blocking clarification. It writes the run record
//    (l5/{module}/process.defs.ts), derives l4/{module}/journeys.defs.ts from the workflow/operation
//    stories, clears traces, CLEANS the task inputs/outputs, and completes the task. The Stage-1
//    summary stays viewable afterwards via openStepView (rebuilt from the persisted report).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAgentStepByAgentName, getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { createUpdateStatusIntent, getInitialPlanSummary, isRecord, optionalString } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import {
  clearRunArtifacts,
  getApprovedModuleName,
  journeysFileInfo,
  readBehaviorHealthReport,
  readOperationDefs,
  readWorkflowDefs,
  saveDefsArtifact,
  writeProcessRun,
  type ProcessNextStep,
  type ProcessRun,
} from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution2/ns2Plan.js';
import { computeBehaviorHealthReport, type BehaviorHealthReport } from '/_102020_/l2/agentNewSolution2/agentValidateBehaviorModel.js';
import { getImplementationDecisionResult } from '/_102020_/l2/agentNewSolution2/agentNewSolution2Requirements.js';

const AGENT_NAME = 'agentNewSolution2Final';
const ROOT_AGENT_NAME = 'agentNewSolution2';

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Stage-1 handoff: freeze, record the run and finish automatically', visibility: 'private', beforePromptStep, openStepView };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution2Final] task invalid');
  // This agent is wired ONLY to the final-resume step (the org-handoff container is a separate
  // no-LLM agent so it does not expose openStepView). The planId guard stays defensive.
  const planId = (step as { planning?: { planId?: string } }).planning?.planId;
  if (planId === 'final-resume') return autoFinish(context, parentStep, step, hookSequential);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}

/** The whole finish runs inside this hook and returns intents — no UI round-trip, so it cannot
 * silently stall the way a clarification handler could. */
async function autoFinish(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const moduleName = getApprovedModuleName(context) || normalizeModuleFolderName(String((getInitialPlanSummary(context).moduleName) || 'module'), 'module');

  let report: BehaviorHealthReport | undefined;
  try { report = await computeBehaviorHealthReport(context); } catch (error) { console.warn(`[${AGENT_NAME}] health report failed`, error); }

  try { await writeJourneys(moduleName); } catch (error) { console.warn(`[${AGENT_NAME}] writeJourneys failed`, error); }
  try { await writeProcessRun(moduleName, buildRun(context, report, moduleName)); } catch (error) { console.warn(`[${AGENT_NAME}] writeProcessRun failed`, error); }
  try { await clearRunArtifacts(moduleName); } catch (error) { console.warn(`[${AGENT_NAME}] clearRunArtifacts failed`, error); }

  // Complete final-resume (cleaning its payload), clean every other completed step, complete the root.
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, 'completed', 'input_output')];
  intents.push(...buildCleanupIntents(context, hookSequential, step.stepId));
  const rootStep = getAgentStepByAgentName(context.task!, ROOT_AGENT_NAME) as mls.msg.AIAgentStep | null;
  if (rootStep) intents.push(updateStatus(context, rootStep, rootStep, hookSequential, 'completed'));
  return intents;
}

function buildRun(context: mls.msg.ExecutionContext, report: BehaviorHealthReport | undefined, moduleName: string): ProcessRun {
  const initialPlan = getInitialPlanSummary(context);
  const nextSteps: ProcessNextStep[] = [
    { id: 'stage2-experience', kind: 'workflowExperience', title: 'Etapa 2 — Experiencia', description: 'Telas + BFF a partir dos l4/workflows e l4/operations.', status: 'pending' },
    { id: 'stage3-backend', kind: 'backendImplementation', title: 'Etapa 3 — Backend', description: 'Persistencia + implementacao a partir das ontology/operations l4.', status: 'pending' },
  ];
  return {
    runId: `newSolution2-${moduleName}`,
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
}

/** Derived, read-only view: consolidates the stories embedded in workflows + operations. */
async function writeJourneys(moduleName: string): Promise<void> {
  const journeys: Record<string, unknown>[] = [];
  for (const w of await readWorkflowDefs()) {
    const id = optionalString(w.workflowId);
    if (id) journeys.push({ journeyId: id, owner: `workflow:${id}`, title: optionalString(w.title) || id, ...storyOf(w) });
  }
  for (const o of await readOperationDefs()) {
    const id = optionalString(o.operationId);
    if (id) journeys.push({ journeyId: id, owner: `operation:${id}`, title: optionalString(o.title) || id, ...storyOf(o) });
  }
  await saveDefsArtifact(journeysFileInfo(moduleName), `${moduleName}Journeys`, {
    moduleName,
    note: 'Derivado das stories embutidas em workflows/operations (visao consolidada, nao fonte).',
    journeys,
  });
}

function storyOf(def: Record<string, unknown>): Record<string, unknown> {
  const s = isRecord(def.story) ? def.story : {};
  return { actor: optionalString(s.actor) || '', goal: optionalString(s.goal) || '', soThat: optionalString(s.soThat) || '', steps: Array.isArray(s.steps) ? s.steps : [], outcome: optionalString(s.outcome) || '' };
}

/** One cleaner update-status per completed agent/result step that still carries a payload. */
function buildCleanupIntents(context: mls.msg.ExecutionContext, hookSequential: number, skipStepId: number): mls.msg.AgentIntent[] {
  if (!context.task) return [];
  const steps = getAllSteps(context.task.iaCompressed?.nextSteps);
  const parentOf = buildParentMap(steps);
  const intents: mls.msg.AgentIntent[] = [];
  for (const s of steps) {
    if (s.stepId === skipStepId) continue;
    if (s.type !== 'agent' && s.type !== 'result') continue;
    if (s.status !== 'completed') continue;
    if (!(s.interaction?.payload?.length)) continue;
    intents.push({
      type: 'update-status',
      hookSequential,
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task.PK,
      parentStepId: parentOf.get(s.stepId) ?? s.stepId,
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
  const title = document.createElement('h3');
  title.textContent = 'Etapa 1 — modelo de comportamento congelado';
  const pre = document.createElement('pre');
  pre.textContent = report ? JSON.stringify(report, null, 2) : 'Modelo congelado em l4. Relatorio de saude indisponivel.';
  div.append(title, pre);
  return div;
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

function safe<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}
