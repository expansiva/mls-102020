/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/pages50/agentM4PagesPage.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_PAGES_PAGE_AGENT_NAME, markM4Step, moduleTokenOk } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { m4PagesDoneIntent, pageWorkerStep, type M4PageWorkerArgs } from '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4Pages.js';
import { m4ChainAfterPage, m4ChainDoneIntent } from '/_102020_/l2/agentMaterializeL2/steps/shared40/chain.js';
import {
  M4_PAGE_MAX_ATTEMPTS, M4_PAGE_TOOL, approveM4Page, buildM4PageContext, buildM4PagePrompt, buildM4PageRepairPrompt, m4PageEnvironmentFailure, m4PageToolAnswer, m4PageToolSchema, recordM4PageAttempt, reusableM4Page,
} from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_PAGES_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/pages50', agentDescription: 'Generate, gate and compile one page of one device', visibility: 'private', beforePromptStep, afterPromptStep };
}

function parseArgs(raw: string): M4PageWorkerArgs {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('M4_PAGE_ARGS_INVALID'); }
  const args = value as M4PageWorkerArgs;
  if (!args || !Number.isSafeInteger(args.project) || args.project <= 0 || !moduleTokenOk(args.module) || !/^[a-z][A-Za-z0-9_]*$/u.test(args.pageId)
    || (args.device !== 'desktop' && args.device !== 'mobile') || !Number.isSafeInteger(args.attempt) || args.attempt < 1 || args.attempt > M4_PAGE_MAX_ATTEMPTS) throw new Error('M4_PAGE_ARGS_INVALID');
  return args;
}

/** In a chain: this unit's review, then the chain anchor; as a sweeper worker: the pages50 anchor. */
async function afterUnit(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, identity: { project: number; module: string }, args: M4PageWorkerArgs): Promise<{ next: mls.msg.AgentIntent[]; done: mls.msg.AgentIntent | null }> {
  if (!args.chain) return { next: [], done: await m4PagesDoneIntent(context, parentStep, identity, args.scope) };
  const next = (await m4ChainAfterPage(identity, args.pageId, args.device, args.scope ?? {})).map(worker => addAgentStep(context, parentStep.stepId, worker));
  return { next, done: next.length ? null : await m4ChainDoneIntent(context, parentStep, identity, args.scope) };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseArgs(step.prompt || '');
    const identity = { project: args.project, module: args.module };
    if (await reusableM4Page(identity, args.pageId, args.device)) {
      const { next, done } = await afterUnit(context, parentStep, identity, args);
      return [...next, ...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Page ${args.pageId}/${args.device} reused without an LLM call or write.`)];
    }
    const data = await buildM4PageContext(identity, args.pageId, args.device);
    // A repair is a focused fix of the refused file (agentFix style), not the generation prompt again.
    const built = args.diagnostic !== undefined
      ? await buildM4PageRepairPrompt(data, { diagnostic: args.diagnostic, previous: args.previous ?? '', design: args.design })
      : buildM4PagePrompt(data);
    return [{
      type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId,
      systemPrompt: built.systemPrompt, humanPrompt: built.humanPrompt,
      tools: [{ type: 'function', function: { name: M4_PAGE_TOOL, description: 'Return your design decisions and the whole TypeScript file of this page', parameters: m4PageToolSchema } }],
      toolChoice: { type: 'function', function: { name: M4_PAGE_TOOL } },
    } as mls.msg.AgentIntent];
  } catch (error) {
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

/** Up to three focused repair rounds (M4_PAGE_MAX_ATTEMPTS); an environment failure or the last refusal fails the step. */
async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let args: M4PageWorkerArgs;
  try { args = parseArgs(step.prompt || ''); } catch (error) { return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', String(error))]; }
  const identity = { project: args.project, module: args.module };
  const unit = `${args.pageId}/${args.device}`;
  let source: unknown;
  let design: unknown = args.design;
  try {
    const answer = m4PageToolAnswer(step.interaction?.payload?.[0]);
    source = answer.source;
    design = answer.design ?? design;
    const data = await buildM4PageContext(identity, args.pageId, args.device);
    const receipt = await approveM4Page(data, source, args.attempt, undefined, answer.design);
    const { next, done } = await afterUnit(context, parentStep, identity, args);
    return [...next, ...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Page ${unit} compiled in the Studio (attempt ${args.attempt}): ${receipt.sourcePath}.`
      + (receipt.design?.concept ? ` Design: ${receipt.design.concept}` : '')
      + (receipt.design?.views.length ? ` Views: ${receipt.design.views.map(view => view.id).join(', ')}.` : ' Views: one.')
      + (receipt.advisories.length ? ` Advisories (not refusals): ${receipt.advisories.map(item => item.code).join(', ')}.` : ''))];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    try { await recordM4PageAttempt(identity, args.pageId, args.device, args.attempt, source, diagnostic); } catch { /* diagnosis only */ }
    if (m4PageEnvironmentFailure(diagnostic)) {
      const message = `M4_PAGE_ENVIRONMENT ${unit}: the Studio could not compile, and the generated code is not at fault, so no repair was spent. Fix the environment (for an unavailable _<project>_ import: connect the Studio to GitHub so that project loads) and run the agent again. ${diagnostic}`;
      try { await markM4Step(identity, 'pages50', { status: 'failed', diagnostic: message }); } catch { /* pipeline missing */ }
      return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', message)];
    }
    if (args.attempt < M4_PAGE_MAX_ATTEMPTS) {
      // Keep the last real file when the answer had no source, so the next repair still has something to fix.
      const previous = typeof source === 'string' && source.trim() ? source : args.previous ?? '';
      const repair = pageWorkerStep({ ...identity, pageId: args.pageId, device: args.device, attempt: args.attempt + 1, diagnostic, previous, design, scope: args.scope, chain: args.chain });
      return [addAgentStep(context, parentStep.stepId, repair), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Repair ${args.attempt} of ${M4_PAGE_MAX_ATTEMPTS - 1} scheduled for ${unit}: ${diagnostic}`)];
    }
    try { await markM4Step(identity, 'pages50', { status: 'failed', diagnostic: `${unit}: ${diagnostic}` }); } catch { /* pipeline missing */ }
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', `M4_PAGE_REPAIR_LIMIT ${unit}: ${diagnostic}`)];
  }
}
