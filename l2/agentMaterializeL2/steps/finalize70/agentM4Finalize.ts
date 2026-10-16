/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/finalize70/agentM4Finalize.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_FINALIZE_AGENT_NAME, markM4Step, parseM4StepInvocation } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { formatM4FinalizeReport, runM4Finalize } from '/_102020_/l2/agentMaterializeL2/steps/finalize70/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_FINALIZE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/finalize70', agentDescription: 'Register the approved pages of the module in l5/config.json, without an LLM call', visibility: 'private', beforePromptStep };
}

/** Completes when at least one page is registered; fails when no page of the module has an approved desktop page. */
async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseM4StepInvocation(args || step.prompt || '');
  if (invocation.kind === 'refusal') return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  const identity = { project: invocation.project, module: invocation.module };
  try {
    const { receipt, path } = await runM4Finalize(identity);
    const report = formatM4FinalizeReport(receipt);
    const approved = receipt.pages.length > 0;
    await markM4Step(identity, 'finalize70', approved
      ? { status: 'approved', artifactPaths: [path, receipt.configPath] }
      : { status: 'failed', artifactPaths: [path], diagnostic: report });
    return [
      addAgentStep(context, parentStep.stepId, agentResult('Pages registered', report, approved ? 'finalize70-done' : 'finalize70-report')),
      updateAgentStatus(context, parentStep, step, hookSequential, approved ? 'completed' : 'failed', report),
    ];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    try { await markM4Step(identity, 'finalize70', { status: 'failed', diagnostic }); } catch { /* the pipeline itself is missing */ }
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
