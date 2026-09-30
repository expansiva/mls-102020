/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/agentD2Pages.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_PAGES_AGENT_NAME, D2_PAGES_PAGE_AGENT_NAME, markD2StepApproved, markD2StepFailed, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { reusableD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.js';

export function createAgent(): IAgentAsync { return { agentName: D2_PAGES_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/pages50', agentDescription: 'Dispatch one page11 v2 worker per selected page', visibility: 'private', beforePromptStep }; }

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  try {
    const snapshot = await readD2Input(parsed);
    if (!snapshot) throw new Error('D2_PAGES_INPUT_MISSING');
    const ids = [...snapshot.selection.writePageIds].sort();
    const reusable = new Set<string>();
    for (const pageId of ids) if (await reusableD2Page(parsed, pageId)) reusable.add(pageId);
    const pending = ids.filter(pageId => !reusable.has(pageId));
    if (!pending.length) {
      await markD2StepApproved(parsed, 'pages50', ids.map(pageId => `l2/${parsed.module}/pipeline/agentDefsL2/pages50/${pageId}.json`), snapshot.snapshotHash);
      return [addD2Step(context, parentStep.stepId, d2Result('Pages ready', JSON.stringify({ project: parsed.project, module: parsed.module, completedStep: 'pages50', nextStep: 'finalize60', pages: ids.length }), 'pages50-done')),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `pages50 reused ${ids.length} page11 unit(s).`)];
    }
    const workers = pending.map(pageId => addD2Step(context, parentStep.stepId, {
      type: 'agent', stepId: 0, interaction: null, stepTitle: `Page11 ${pageId}`, status: 'waiting_human_input', nextSteps: [],
      agentName: D2_PAGES_PAGE_AGENT_NAME, prompt: JSON.stringify({ project: parsed.project, module: parsed.module, pageId, stage: 'groups', attempt: 1 }),
      rags: [], planning: { planId: `pages50-${pageId}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
    } as mls.msg.AIAgentStep));
    return [...workers, updateD2Status(context, parentStep, step, hookSequential, 'completed', `Dispatched ${workers.length} page11 v2 worker(s); ${reusable.size} reused.`)];
  } catch (error) { const diagnostic = error instanceof Error ? error.message : String(error); await markD2StepFailed(parsed, 'pages50', diagnostic); return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)]; }
}
