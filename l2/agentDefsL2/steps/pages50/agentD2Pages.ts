/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/agentD2Pages.ts" enhancement="_blank"/>
import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { D2_PAGES_AGENT_NAME, D2_PAGES_PAGE_AGENT_NAME, markD2StepFailed, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { readD2SharedManifest } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';

export function createAgent(): IAgentAsync { return { agentName: D2_PAGES_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/pages50', agentDescription: 'Dispatch one isolated desktop/mobile page-description worker per page', visibility: 'private', beforePromptStep }; }
async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  const identity = { project: parsed.project, module: parsed.module };
  try {
    const snapshot = await readD2Input(identity); if (!snapshot) throw new Error('D2_PAGES_INPUT_MISSING');
    const bundle = await readD2InputBundle(identity); await assertD2InputSourcesStable(bundle);
    const shared = await readD2SharedManifest(identity);
    if (!shared || shared.status !== 'approved' || shared.snapshotHash !== snapshot.snapshotHash) throw new Error('D2_PAGES_SHARED_BARRIER_MISSING');
    const workers = [...snapshot.selection.writePageIds].sort().map(pageId => addD2Step(context, parentStep.stepId, {
      type: 'agent', stepId: 0, interaction: null, stepTitle: `Pages ${pageId}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_PAGES_PAGE_AGENT_NAME,
      prompt: JSON.stringify({ ...identity, pageId, attempt: 1 }), rags: [], planning: { planId: `pages50-page-${pageId}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
    } as mls.msg.AIAgentStep));
    return [...workers, updateD2Status(context, parentStep, step, hookSequential, 'completed', `pages50 dispatched ${workers.length} isolated page worker(s).`)];
  } catch (error) { const diagnostic = error instanceof Error ? error.message : String(error); await markD2StepFailed(identity, 'pages50', diagnostic); return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)]; }
}
