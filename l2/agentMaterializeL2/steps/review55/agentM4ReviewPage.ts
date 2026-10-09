/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/review55/agentM4ReviewPage.ts" enhancement="_blank"/>

// review55 worker: one page × device. Report only: an unusable answer is recorded as a failed review and the
// step still completes; nothing is repaired and no page file is touched.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_REVIEW_PAGE_AGENT_NAME, moduleTokenOk } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { m4ReviewDoneIntent, type M4ReviewWorkerArgs } from '/_102020_/l2/agentMaterializeL2/steps/review55/agentM4Review.js';
import { m4ChainDoneIntent } from '/_102020_/l2/agentMaterializeL2/steps/shared40/chain.js';
import {
  M4_REVIEW_TOOL, buildM4ReviewContext, buildM4ReviewPrompt, formatM4Review, m4ReviewState, m4ReviewToolAnswer, m4ReviewToolSchema, recordM4Review,
} from '/_102020_/l2/agentMaterializeL2/steps/review55/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_REVIEW_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/review55', agentDescription: 'Review one generated page of one device against its template and intent', visibility: 'private', beforePromptStep, afterPromptStep };
}

function parseArgs(raw: string): M4ReviewWorkerArgs {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('M4_REVIEW_ARGS_INVALID'); }
  const args = value as M4ReviewWorkerArgs;
  if (!args || !Number.isSafeInteger(args.project) || args.project <= 0 || !moduleTokenOk(args.module) || !/^[a-z][A-Za-z0-9_]*$/u.test(args.pageId)
    || (args.device !== 'desktop' && args.device !== 'mobile')) throw new Error('M4_REVIEW_ARGS_INVALID');
  return args;
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseArgs(step.prompt || '');
    const identity = { project: args.project, module: args.module };
    if ((await m4ReviewState(identity, args.pageId, args.device)).reusable) {
      const done = await (args.chain ? m4ChainDoneIntent(context, parentStep, identity, args.scope) : m4ReviewDoneIntent(context, parentStep, identity, args.scope));
      return [...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Review ${args.pageId}/${args.device} reused without an LLM call.`)];
    }
    const built = buildM4ReviewPrompt(await buildM4ReviewContext(identity, args.pageId, args.device));
    return [{
      type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId,
      systemPrompt: built.systemPrompt, humanPrompt: built.humanPrompt,
      tools: [{ type: 'function', function: { name: M4_REVIEW_TOOL, description: 'Return the summary and the findings of the review of this page', parameters: m4ReviewToolSchema } }],
      toolChoice: { type: 'function', function: { name: M4_REVIEW_TOOL } },
    } as mls.msg.AgentIntent];
  } catch (error) {
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let args: M4ReviewWorkerArgs;
  try { args = parseArgs(step.prompt || ''); } catch (error) { return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', String(error))]; }
  const identity = { project: args.project, module: args.module };
  try {
    const data = await buildM4ReviewContext(identity, args.pageId, args.device);
    let answer: { summary: string; findings: Awaited<ReturnType<typeof m4ReviewToolAnswer>>['findings']; failed?: string };
    try {
      answer = m4ReviewToolAnswer(step.interaction?.payload?.[0]);
      if (!answer.summary && !answer.findings.length) answer = { ...answer, failed: 'the reviewer returned no summary and no finding' };
    } catch (error) {
      answer = { summary: '', findings: [], failed: error instanceof Error ? error.message : String(error) };
    }
    const receipt = await recordM4Review(data, answer);
    const done = await (args.chain ? m4ChainDoneIntent(context, parentStep, identity, args.scope) : m4ReviewDoneIntent(context, parentStep, identity, args.scope));
    return [...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', formatM4Review(receipt))];
  } catch (error) {
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}
