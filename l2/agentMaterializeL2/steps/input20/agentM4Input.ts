/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/input20/agentM4Input.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_INPUT_AGENT_NAME, m4ScopeLabel, markM4Step, parseM4StepInvocation } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { formatM4InputReport, runM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_INPUT_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/input20', agentDescription: 'Validate contract, shared and page11 defs without an LLM call', visibility: 'private', beforePromptStep };
}

/** Completes when at least one page is accepted; fails, with the full report, when every page is refused. */
async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseM4StepInvocation(args || step.prompt || '');
  if (invocation.kind === 'refusal') return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  const identity = { project: invocation.project, module: invocation.module };
  try {
    const { snapshot, path } = await runM4Input(identity);
    // --page: every page named must exist and be accepted; the gate itself always covers the whole module.
    const missing = (invocation.scope.pages ?? []).filter(pageId => !snapshot.accepted.includes(pageId));
    const scopeLine = missing.length
      ? `Scope refused: --page ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not an accepted page of ${identity.module}. Accepted: ${snapshot.accepted.join(', ') || 'none'}.`
      : `Scope: ${m4ScopeLabel(invocation.scope)}.`;
    const report = `${formatM4InputReport(snapshot)}\n${scopeLine}`;
    const approved = snapshot.accepted.length > 0 && !missing.length;
    await markM4Step(identity, 'input20', approved
      ? { status: 'approved', artifactPaths: [path], snapshotHash: snapshot.snapshotHash }
      : { status: 'failed', artifactPaths: [path], snapshotHash: snapshot.snapshotHash, diagnostic: report });
    const intents: mls.msg.AgentIntent[] = [addAgentStep(context, parentStep.stepId, agentResult('Input report', report, approved ? 'input20-done' : 'input20-report'))];
    intents.push(updateAgentStatus(context, parentStep, step, hookSequential, approved ? 'completed' : 'failed', report));
    return intents;
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    try { await markM4Step(identity, 'input20', { status: 'failed', diagnostic }); } catch { /* the pipeline itself is missing */ }
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
