/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/finalize/agentCfeCreateFinalize.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, finalizeGeneratedPages } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
// `addMessage('@@agent …')` posts a message that spawns a NEW task through the target agent's own
// beforePromptImplicit (no coupling to its internals) — the same handoff agentNewSolution uses to start
// @@changeBackend/@@changeFrontend. The runtime strips the mention before the agent sees the payload
// (aiAgentOrchestration.ts:48), so agentAddLanguage receives exactly its JSON args.
import { addMessage as sendThreadMessage } from '/_102025_/l2/collabMessagesHelper.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreateFinalize',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/finalize',
    agentDescription: 'Mark created frontend owners done after materialization and frontend registration',
    visibility: 'private',
    beforePromptStep,
  };
}

// Fire-and-report: the spawned task is independent, so a dispatch failure is traced and NEVER fails the
// frontend task (the generated artifacts are already on disk and the handoff can be re-sent by hand).
async function dispatchAddLanguage(agent: IAgentMeta, context: mls.msg.ExecutionContext, message: string | null): Promise<string> {
  if (!message) return '; addLanguage: not needed (single language)';
  const threadId = context.message?.threadId;
  if (!threadId) return '; addLanguage: SKIPPED (no threadId)';
  try {
    await sendThreadMessage(threadId, message);
    return `; addLanguage: dispatched (${message.slice('@@addLanguage '.length)})`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] addLanguage handoff failed: ${reason}`);
    return `; addLanguage: DISPATCH FAILED (${reason}) — re-send manually: ${message}`;
  }
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const result = await finalizeGeneratedPages();
    // Last step of the task: when the module declares more than one language, hand off to agentAddLanguage
    // as an INDEPENDENT task. It translates only the i18n block of each generated shared file (cheap
    // translate model), so nothing here is regenerated. Null when the module is single-language — then no
    // extra task is created at all.
    const addLanguage = await dispatchAddLanguage(agent, context, result.addLanguageMessage);
    const trace = `pagesDone=${result.pagesDone.length}; ownersDone=${result.ownersDone.length}; skippedPages=${result.skippedPages.length}; ${result.configMsg}${addLanguage}`;
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
