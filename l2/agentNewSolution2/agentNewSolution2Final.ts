/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNewSolution2Final.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Handoff for Stage 1. Two roles, distinguished by planId:
//  - org-handoff (container): completing it opens behavior-validate + final-resume.
//  - final-resume (agent): AUTO-FINISH — no blocking clarification. It writes the run record
//    (l5/{module}/process.defs.ts), clears traces, CLEANS the task inputs/outputs, and completes the
//    task. The Stage-1 summary stays viewable afterwards via openStepView (rebuilt from the persisted
//    report).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAgentStepByAgentName, getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { createUpdateStatusIntent, getInitialPlanSummary } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import {
  clearRunArtifacts,
  getApprovedModuleName,
  readBehaviorHealthReport,
  writeProcessRun,
  type ProcessNextStep,
  type ProcessRun,
} from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution2/ns2Plan.js';

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

  try { await writeProcessRun(moduleName, buildRun(moduleName)); } catch (error) { console.warn(`[${AGENT_NAME}] writeProcessRun failed`, error); }
  try { await clearRunArtifacts(moduleName); } catch (error) { console.warn(`[${AGENT_NAME}] clearRunArtifacts failed`, error); }

  // Complete final-resume (cleaning its payload), then the org-handoff container, then the root, and
  // clean every other completed step. We complete the container explicitly (its sibling behavior-
  // validate is already terminal and final-resume is completed in this same batch) so the task never
  // hangs on a passive parent waiting to auto-complete.
  const rootStep = getAgentStepByAgentName(context.task!, ROOT_AGENT_NAME) as mls.msg.AIAgentStep | null;
  const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, 'completed', 'input_output')];
  if (rootStep && parentStep && parentStep.stepId !== rootStep.stepId) intents.push(updateStatus(context, rootStep, parentStep, hookSequential, 'completed'));
  if (rootStep) intents.push(updateStatus(context, rootStep, rootStep, hookSequential, 'completed'));
  intents.push(...buildCleanupIntents(context, hookSequential, step.stepId));
  return intents;
}

function buildRun(moduleName: string): ProcessRun {
  const nextSteps: ProcessNextStep[] = [
    { id: 'stage2-experience', kind: 'workflowExperience', title: 'Etapa 2 — Experiencia', description: 'Telas + BFF a partir dos l4/workflows e l4/operations.', status: 'pending' },
    { id: 'stage3-backend', kind: 'backendImplementation', title: 'Etapa 3 — Backend', description: 'Persistencia + implementacao a partir das ontology/operations l4.', status: 'pending' },
  ];
  return {
    runId: `newSolution2-${moduleName}`,
    kind: 'newSolution2-behavior',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    sourceRefs: {
      designContext: `l4/${moduleName}/module.defs.ts#designContext`,
      healthReport: 'l4/trace/behavior-health-report.json#report',
      workflows: 'l4/workflows/*.defs.ts',
      operations: 'l4/operations/*.defs.ts',
      ontology: `l4/${moduleName}/ontology/*.defs.ts`,
    },
    handoffNotes: [
      'l4/workflows carries pageId. l4/operations carries pageId, commandName and bffName. Stage 2 contracts and Stage 3 controllers must use bffName as the shared route key instead of deriving {module}.{page}.{command} independently.',
    ],
    nextSteps,
  };
}

/** One cleaner update-status per completed AGENT step that still carries interaction weight (input,
 * payload OR trace). The runtime 'input_output' cleaner nulls input+payload and clears the step trace
 * — the trace (LLM logs, biggest on parallel fan-out parents) is what scales the finished task, so
 * cleaning every completed step keeps it well under the size budget while the durable model stays in
 * l4 and the run summary in l5. Result/tool steps are skipped: the runtime rejects update-status for
 * non-agent steps, and their small result strings are already persisted into designContext or l4 trace.
 * Failed steps are left intact for debugging (only 'completed' steps are cleaned). */
function buildCleanupIntents(context: mls.msg.ExecutionContext, hookSequential: number, skipStepId: number): mls.msg.AgentIntent[] {
  if (!context.task) return [];
  const steps = getAllSteps(context.task.iaCompressed?.nextSteps);
  const parentOf = buildParentMap(steps);
  const intents: mls.msg.AgentIntent[] = [];
  for (const s of steps) {
    if (s.stepId === skipStepId) continue;
    if (s.type !== 'agent') continue;
    if (s.status !== 'completed') continue;
    const i = s.interaction;
    if (!i || !(i.input?.length || i.payload?.length || i.trace?.length)) continue;
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
