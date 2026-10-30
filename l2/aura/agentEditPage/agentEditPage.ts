/// <mls fileReference="_102020_/l2/aura/agentEditPage/agentEditPage.ts" enhancement="_102027_/l2/enhancementAgent"/>

// agentEditPage (TASK-102020-agent-edit-page): a change asked in words on ONE generated page, applied as a patch of
// its `.ts` and recorded in the `history` of its `.defs.ts`, so "Refazer página" redoes it.
//
// Entry (JSON, from the Studio selectPage panel): { module, page, device?, genome?, request, operations? }
//
// Two calls, one per phase (deterministic bootstrap, no root LLM, as agentGenomeUx and agentMaterializeL2):
//   PLAN  (no operations)  1 (root) → editPage-gate        agentEditPageGate (LLM): refuse with the reason, or
//                                                          complete with `PLAN:<operations json>`. Nothing written.
//   APPLY (operations)     1 (root) → editPage-patch-<n>   agentEditPagePatch (LLM): splice, compile, one repair,
//                                                          restore on failure; records the history and completes
//                                                          with `NOTES:<json>`.
// The operations the person approved come back verbatim in APPLY; the gate does not run twice.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { EDIT_PAGE_AGENT_NAME, EDIT_PAGE_FOLDER, parseEditPageEntry, type EditPageStepArgs } from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import { addStep, gateStep, patchStep, updateStatus } from '/_102020_/l2/aura/agentEditPage/editPageIntents.js';
import '/_102020_/l2/aura/agentEditPage/agentEditPageGate.js';
import '/_102020_/l2/aura/agentEditPage/agentEditPagePatch.js';

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
  const title = `${apply ? 'Change' : 'Plan a change of'} ${entry.module}/${entry.page}: ${entry.request.slice(0, 60)}`;
  const task: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai', skipRootLLM: true,
    request: {
      action: 'addMessageAI', agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'agentEditPage deterministic bootstrap. The root model is disabled.' }, { type: 'human', content: JSON.stringify(entry) }],
      taskTitle: title, threadId: context.message.threadId, userMessage: context.message.content,
      longTermMemory: { taskName: EDIT_PAGE_AGENT_NAME, flowName: EDIT_PAGE_AGENT_NAME, project: String(project), module: entry.module, page: entry.page, phase: apply ? 'apply' : 'plan' },
    },
  } as mls.msg.AgentIntentAddMessageAI;
  return [task, addStep(context, 1, apply ? patchStep(args) : gateStep(args), true)];
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (step.stepId === 1 && context.task?.iaCompressed?.longMemory?.flowName === EDIT_PAGE_AGENT_NAME) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Deterministic message bootstrap completed.')];
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', 'agentEditPage steps run through agentEditPageGate and agentEditPagePatch.')];
}
