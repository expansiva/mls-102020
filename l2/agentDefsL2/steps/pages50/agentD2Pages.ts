/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/agentD2Pages.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_PAGES_AGENT_NAME, D2_PAGES_PAGE_AGENT_NAME, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';

export function createAgent(): IAgentAsync { return { agentName: D2_PAGES_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/pages50', agentDescription: 'Dispatch one page11 v2 worker per selected page', visibility: 'private', beforePromptStep }; }

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  try {
    const snapshot = await readD2Input(parsed);
    if (!snapshot) throw new Error('D2_PAGES_INPUT_MISSING');
    const workers = [...snapshot.selection.writePageIds].sort().map(pageId => addD2Step(context, parentStep.stepId, {
      type: 'agent', stepId: 0, interaction: null, stepTitle: `Page11 ${pageId}`, status: 'waiting_human_input', nextSteps: [],
      agentName: D2_PAGES_PAGE_AGENT_NAME, prompt: JSON.stringify({ project: parsed.project, module: parsed.module, pageId, stage: 'groups', attempt: 1 }),
      rags: [], planning: { planId: `pages50-${pageId}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
    } as mls.msg.AIAgentStep));
    return [...workers, updateD2Status(context, parentStep, step, hookSequential, 'completed', `Dispatched ${workers.length} page11 v2 worker(s).`)];
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
}
