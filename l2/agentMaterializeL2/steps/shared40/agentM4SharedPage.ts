/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/agentM4SharedPage.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_SHARED_PAGE_AGENT_NAME, markM4Step, moduleTokenOk } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { sharedWorkerStep, type M4SharedWorkerArgs } from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4Shared.js';
import { m4ChainAfterShared, m4ChainDoneIntent } from '/_102020_/l2/agentMaterializeL2/steps/shared40/chain.js';
import {
  M4_SHARED_MAX_ATTEMPTS, M4_SHARED_TOOL, approveM4Shared, m4SharedEnvironmentFailure, mergeM4Findings, recordM4SharedAttempt, buildM4SharedContext, buildM4SharedPrompt, buildM4SharedRepairPrompt, m4SharedToolFindings, m4SharedToolSchema, m4SharedToolSource, reusableM4Shared, studioSharedPort,
} from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_SHARED_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/shared40', agentDescription: 'Generate, gate and compile the shared class of one page', visibility: 'private', beforePromptStep, afterPromptStep };
}

function parseArgs(raw: string): M4SharedWorkerArgs {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('M4_SHARED_ARGS_INVALID'); }
  const args = value as M4SharedWorkerArgs;
  if (!args || !Number.isSafeInteger(args.project) || args.project <= 0 || !moduleTokenOk(args.module) || !/^[a-z][A-Za-z0-9_]*$/u.test(args.pageId) || !Number.isSafeInteger(args.attempt) || args.attempt < 1 || args.attempt > M4_SHARED_MAX_ATTEMPTS) throw new Error('M4_SHARED_ARGS_INVALID');
  return args;
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseArgs(step.prompt || '');
    const identity = { project: args.project, module: args.module };
    if (await reusableM4Shared(identity, args.pageId)) {
      const next = (await m4ChainAfterShared(identity, args.pageId, args.scope ?? {})).map(worker => addAgentStep(context, parentStep.stepId, worker));
      const done = next.length ? null : await m4ChainDoneIntent(context, parentStep, identity, args.scope);
      return [...next, ...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Shared ${args.pageId} reused without an LLM call or write.`)];
    }
    const data = await buildM4SharedContext(identity, args.pageId, studioSharedPort);
    // A repair is a focused fix of the refused file (agentFix style), not the generation prompt again.
    const built = args.diagnostic !== undefined
      ? await buildM4SharedRepairPrompt(data, { diagnostic: args.diagnostic, previous: args.previous ?? '' })
      : await buildM4SharedPrompt(data);
    return [{
      type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId,
      systemPrompt: built.systemPrompt, humanPrompt: built.humanPrompt,
      tools: [{ type: 'function', function: { name: M4_SHARED_TOOL, description: 'Return the whole TypeScript file of the shared class of this page, and the gaps of the defs you completed', parameters: m4SharedToolSchema } }],
      toolChoice: { type: 'function', function: { name: M4_SHARED_TOOL } },
    } as mls.msg.AgentIntent];
  } catch (error) {
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

/** Up to three focused repair rounds (M4_SHARED_MAX_ATTEMPTS); an environment failure or the last refusal fails the step. */
async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let args: M4SharedWorkerArgs;
  try { args = parseArgs(step.prompt || ''); } catch (error) { return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', String(error))]; }
  const identity = { project: args.project, module: args.module };
  let source: unknown;
  let findings = args.findings ?? [];
  try {
    source = m4SharedToolSource(step.interaction?.payload?.[0]);
    findings = mergeM4Findings(findings, m4SharedToolFindings(step.interaction?.payload?.[0]));
    const data = await buildM4SharedContext(identity, args.pageId, studioSharedPort);
    const receipt = await approveM4Shared(data, source, args.attempt, studioSharedPort, findings);
    // The chain goes on at once for this page: its pages (or reviews) are added before this worker completes.
    const next = (await m4ChainAfterShared(identity, args.pageId, args.scope ?? {})).map(worker => addAgentStep(context, parentStep.stepId, worker));
    const done = next.length ? null : await m4ChainDoneIntent(context, parentStep, identity, args.scope);
    return [...next, ...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Shared ${args.pageId} compiled in the Studio (attempt ${args.attempt}); declaration ${receipt.declarationPath}.${receipt.findings.length ? ` Findings for the L2 planner: ${receipt.findings.map(item => `${item.code} — ${item.message}`).join('; ')}` : ''}`)];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    try { await recordM4SharedAttempt(identity, args.pageId, args.attempt, source, diagnostic); } catch { /* diagnosis only */ }
    if (m4SharedEnvironmentFailure(diagnostic)) {
      const message = `M4_SHARED_ENVIRONMENT ${args.pageId}: the Studio could not compile, and the generated code is not at fault, so no repair was spent. Fix the environment (for an unavailable _<project>_ import: connect the Studio to GitHub so that project loads) and run the agent again. ${diagnostic}`;
      try { await markM4Step(identity, 'shared40', { status: 'failed', diagnostic: message }); } catch { /* pipeline missing */ }
      return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }
    if (args.attempt < M4_SHARED_MAX_ATTEMPTS) {
      // Keep the last real file when the answer had no source, so the next repair still has something to fix.
      const previous = typeof source === 'string' && source.trim() ? source : args.previous ?? '';
      const repair = sharedWorkerStep({ ...identity, pageId: args.pageId, attempt: args.attempt + 1, diagnostic, previous, findings, scope: args.scope });
      return [addAgentStep(context, parentStep.stepId, repair), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Repair ${args.attempt} of ${M4_SHARED_MAX_ATTEMPTS - 1} scheduled for ${args.pageId}: ${diagnostic}`)];
    }
    try { await markM4Step(identity, 'shared40', { status: 'failed', diagnostic: `${args.pageId}: ${diagnostic}` }); } catch { /* pipeline missing */ }
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', `M4_SHARED_REPAIR_LIMIT ${args.pageId}: ${diagnostic}`)];
  }
}
