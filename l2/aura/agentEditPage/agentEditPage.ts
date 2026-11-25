/// <mls fileReference="_102020_/l2/aura/agentEditPage/agentEditPage.ts" enhancement="_102027_/l2/enhancementAgent"/>

// agentEditPage (TASK-102020-agent-edit-page): a change asked in words on ONE generated page, applied as a patch of
// its `.ts` and recorded in the `history` of its `.defs.ts`, so "Refazer página" redoes it.
//
// Entry (JSON, from the Studio selectPage panel): { module, page, device?, genome?, request, operations?, batch? }
// A request asked of several pages arrives once per page, each with `batch` = the other pages (the panel runs them
// one by one); the agent itself stays a one-page agent and only tells the model to keep the pages consistent.
//
// Two calls, one per phase (deterministic bootstrap, no root LLM, as agentGenomeUx and agentMaterializeL2):
//   PLAN  (no operations)  1 (root) → editPage-gate        agentEditPageGate (LLM): refuse with the reason, or
//                                                          complete with `PLAN:<operations json>`. Nothing written.
//   APPLY (operations)     1 (root) → editPage-patch-<n>   agentEditPagePatch (LLM): splice, compile, one repair,
//                                                          restore on failure; records the history and completes
//                                                          with `NOTES:<json>`.
// The operations the person approved come back verbatim in APPLY; the gate does not run twice.
// An adjustment of a preview goes the same way: PLAN with `adjust` (the gate plans the newest ask on the page as it
// is now), then APPLY with that plan and `adjust`.
//   STANDARD (standardize) 1 (root) → editPage-standard agentEditPageStandard (LLM): once per batch, the exact values
//                                                          every page must use; completes with `STANDARD:<json>`.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { EDIT_PAGE_AGENT_NAME, EDIT_PAGE_FOLDER, parseEditPageEntry, type EditPageStepArgs } from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import { addStep, gateStep, patchStep, standardStep, updateStatus } from '/_102020_/l2/aura/agentEditPage/editPageIntents.js';
import '/_102020_/l2/aura/agentEditPage/agentEditPageGate.js';
import '/_102020_/l2/aura/agentEditPage/agentEditPagePatch.js';
import '/_102020_/l2/aura/agentEditPage/agentEditPageStandard.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: EDIT_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: EDIT_PAGE_FOLDER,
    agentDescription: 'Change one generated page as the person asks (presentation only): plan, then patch its .ts and record the request in its defs history',
    visibility: 'public', beforePromptImplicit, beforePromptStep,
  };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const project = Number(mls.actualProject || 0);
  const parsed = parseEditPageEntry(userPrompt || context.message.content || '');
  // A refusal here has nothing to show in a task: the Studio receives it as the stream error.
  if (parsed.kind === 'refusal') throw new Error(parsed.diagnostic);
  if (!Number.isSafeInteger(project) || project <= 0) throw new Error('EDIT_PAGE_PROJECT: the current project is unavailable');
  const { entry } = parsed;
  const args: EditPageStepArgs = { project, ...entry, attempt: 1 };
  const apply = Boolean(entry.operations?.length);
  const adjusting = entry.adjust.length > 0;
  const verb = adjusting ? (apply ? 'Adjust' : 'Plan an adjustment of') : (apply ? 'Change' : 'Plan a change of');
  const ask = (adjusting ? entry.adjust[entry.adjust.length - 1] : entry.request).slice(0, 60);
  // One task per page: the title says this page is one of several, never that it holds the others. The standard is
  // the one task of the batch as a whole.
  const title = entry.standardize
    ? `${entry.standard ? 'Adjust' : 'Decide'} the common standard of ${entry.batch.length + 1} pages of ${entry.module}: ${ask}`
    : `${verb} ${entry.module}/${entry.page}${entry.batch.length ? ` (one of ${entry.batch.length + 1} pages)` : ''}: ${ask}`;
  const step = entry.standardize ? standardStep(args) : apply ? patchStep(args) : gateStep(args);
  const phase = entry.standardize ? 'standard' : apply ? 'apply' : 'plan';
  const task: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai', skipRootLLM: true,
    request: {
      action: 'addMessageAI', agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'agentEditPage deterministic bootstrap. The root model is disabled.' }, { type: 'human', content: JSON.stringify(entry) }],
      taskTitle: title, threadId: context.message.threadId, userMessage: context.message.content,
      longTermMemory: { taskName: EDIT_PAGE_AGENT_NAME, flowName: EDIT_PAGE_AGENT_NAME, project: String(project), module: entry.module, page: entry.page, phase },
    },
  } as mls.msg.AgentIntentAddMessageAI;
  return [task, addStep(context, 1, step, true)];
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (step.stepId === 1 && context.task?.iaCompressed?.longMemory?.flowName === EDIT_PAGE_AGENT_NAME) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Deterministic message bootstrap completed.')];
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', 'agentEditPage steps run through agentEditPageGate and agentEditPagePatch.')];
}
