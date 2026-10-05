/// <mls fileReference="_102020_/l2/agentDefsL2/steps/bff55/agentD2BffPage.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { d2LlmModelOf, d2LlmResponseInfo, recordD2LlmResponse, recordD2LlmVerdict, type D2LlmResponseRecord } from '/_102020_/l2/helpers/llmResponses.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_BFF_PAGE_AGENT_NAME, markD2StepApproved, moduleTokenOk, readD2Pipeline } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { d2PagesRefusedMessage, d2ToolPayload, settleD2Pages, type D2PageSettlePort } from '/_102020_/l2/agentDefsL2/helpers/d2PageSettle.js';
import {
  approveD2BffUnit, bffDesignInfo, bffReceiptInfo, bffSchemaFor, bffUnitInputHash, buildD2BffPrompt, loadD2BffContext, readD2BffReceipt, readD2BffRefusal,
  D2_BFF_REFUSAL_VERSION, D2_BFF_VERSION, type D2BffContext, type D2BffReceipt,
} from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';

interface Args { project: number; module: string; pageId: string; attempt: 1 | 2; diagnostic?: string; previous?: unknown }
type Identity = { project: number; module: string };

function parseArgs(raw: string): Args {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('D2_BFF_ARGS_INVALID'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('D2_BFF_ARGS_INVALID');
  const args = value as Args;
  if (!Number.isSafeInteger(args.project) || args.project <= 0 || !moduleTokenOk(args.module) || !/^[a-z][A-Za-z0-9_]*$/u.test(args.pageId) || ![1, 2].includes(args.attempt)) throw new Error('D2_BFF_ARGS_INVALID');
  return args;
}

export function createAgent(): IAgentAsync {
  return { agentName: D2_BFF_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/bff55', agentDescription: 'Design the BFF endpoints of one page and check them against L4', visibility: 'private', beforePromptStep, afterPromptStep };
}

export interface D2BffReusePort {
  readReceipt(identity: Identity, pageId: string): Promise<D2BffReceipt | null>;
  context(identity: Identity, pageId: string): Promise<D2BffContext>;
  readDesign(info: Ns5FileInfo): Promise<unknown>;
}
const reusePort: D2BffReusePort = { readReceipt: readD2BffReceipt, context: loadD2BffContext, readDesign: readJson };

/** Reused when the receipt approves the same unit input, the same prompt and the design bytes on disk. */
export async function reusableD2Bff(identity: Identity, pageId: string, port: D2BffReusePort = reusePort): Promise<boolean> {
  const receipt = await port.readReceipt(identity, pageId);
  if (!receipt || receipt.schemaVersion !== D2_BFF_VERSION || receipt.project !== identity.project || receipt.module !== identity.module || receipt.pageId !== pageId) return false;
  try {
    const context = await port.context(identity, pageId);
    if (await sha256Text(context.prompt) !== receipt.promptHash || await bffUnitInputHash(context) !== receipt.unitInputHash) return false;
    return await sha256Text(JSON.stringify(await port.readDesign(bffDesignInfo(identity, pageId)))) === receipt.designHash;
  } catch (error) {
    // Not reusable means the page is designed again; the cause is still said (no silent error).
    console.warn(`agentDefsL2 bff55: ${pageId} is not reusable: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export interface D2BffPromptPort {
  reusable(identity: Identity, pageId: string): Promise<boolean>;
  context(identity: Identity, pageId: string): Promise<D2BffContext>;
  settle(identity: Identity): D2PageSettlePort;
}
function settlePort(identity: Identity): D2PageSettlePort {
  return {
    pageIds: async () => { const snapshot = await readD2Input(identity); return snapshot ? [...snapshot.selection.writePageIds].sort() : null; },
    reusable: pageId => reusableD2Bff(identity, pageId),
    refusal: pageId => readD2BffRefusal(identity, pageId),
  };
}
const promptPort: D2BffPromptPort = { reusable: reusableD2Bff, context: loadD2BffContext, settle: settlePort };

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2BffPromptPort): Promise<mls.msg.AgentIntent[]> {
  let args: Args;
  try { args = parseArgs(step.prompt || ''); } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
  const port = typeof argsOrPort === 'object' ? argsOrPort : promptPort;
  try {
    if (await port.reusable(args, args.pageId)) return finish(context, parentStep, step, hookSequential, args, `BFF ${args.pageId} reused without an LLM call or write.`, port.settle(args));
    const data = await port.context(args, args.pageId);
    const built = buildD2BffPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined);
    return [{ type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt: built.systemPrompt, humanPrompt: built.humanPrompt,
      tools: [{ type: 'function', function: { name: 'submitD2Bff', description: 'Design the endpoints of one page: types, endpoints with input, output, origins, rules and JSDoc', parameters: bffSchemaFor(data) } }],
      toolChoice: { type: 'function', function: { name: 'submitD2Bff' } } }];
  } catch (error) {
    return refuse(context, parentStep, step, hookSequential, args, error instanceof Error ? error.message : String(error), port.settle(args));
  }
}

export async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const args = parseArgs(step.prompt || '');
  let response: unknown;
  let recorded: { info: ReturnType<typeof d2LlmResponseInfo>; record: D2LlmResponseRecord } | undefined;
  try {
    const data = await loadD2BffContext(args, args.pageId);
    const built = buildD2BffPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined);
    // The raw answer is kept before anything reads it (d2_69).
    const info = d2LlmResponseInfo(args.project, `${args.module}/pipeline/agentDefsL2/bff55/responses`, args.pageId, String(args.attempt));
    recorded = { info, record: await recordD2LlmResponse(info, { attempt: String(args.attempt), model: d2LlmModelOf(step), promptChars: built.chars, receivedAt: new Date().toISOString(), raw: step.interaction?.payload?.[0] ?? null }) };
    response = d2ToolPayload(step.interaction?.payload?.[0], 'submitD2Bff', 'D2_BFF');
    await approveD2BffUnit(data, response, built.chars, args.diagnostic ? built.chars : 0);
    await recordD2LlmVerdict(recorded.info, recorded.record, 'accepted');
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    if (diagnostic.startsWith('D2_LLM_RESPONSE_RECORD_FAILED')) return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
    if (recorded) {
      try { await recordD2LlmVerdict(recorded.info, recorded.record, diagnostic); }
      catch (recordError) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', recordError instanceof Error ? recordError.message : String(recordError))]; }
    }
    // An internal assertion (what the strict schema guarantees) has no repair cycle (d2_76).
    if (args.attempt === 1 && !diagnostic.startsWith('D2_BFF_ASSERT')) return [next(context, parentStep, { ...args, attempt: 2, diagnostic, previous: response }),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `One repair scheduled for ${args.pageId}: ${diagnostic}`)];
    return refuse(context, parentStep, step, hookSequential, args, `D2_BFF_REPAIR_LIMIT: ${diagnostic}`);
  }
  return finish(context, parentStep, step, hookSequential, args, `BFF ${args.pageId} approved.`);
}

async function refuse(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: Args, diagnostic: string, port?: D2PageSettlePort): Promise<mls.msg.AgentIntent[]> {
  const identity = { project: args.project, module: args.module };
  try {
    await writeJson(bffReceiptInfo(identity, args.pageId), { schemaVersion: D2_BFF_REFUSAL_VERSION, ...identity, pageId: args.pageId, taskId: context.task?.PK || '', diagnostic });
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `${args.pageId}: ${diagnostic} (refusal not recorded: ${error instanceof Error ? error.message : String(error)})`)]; }
  return finish(context, parentStep, step, hookSequential, args, `BFF ${args.pageId} refused: ${diagnostic}`, port);
}

async function finish(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: Args, trace: string, port?: D2PageSettlePort): Promise<mls.msg.AgentIntent[]> {
  const identity = { project: args.project, module: args.module };
  try {
    const settlement = await settleD2Pages(context.task?.PK || '', port ?? settlePort(identity), 'D2_BFF_INPUT_MISSING');
    if (settlement.state === 'pending') return [updateD2Status(context, parentStep, step, hookSequential, 'completed', trace)];
    // d2_76: the pages that passed go on; the refused ones are listed here and fail the pipeline once, in finalize80.
    const refused = settlement.state === 'refused' ? settlement.refusals : [];
    const snapshot = await readD2Input(identity);
    if (snapshot && await readD2Pipeline(identity)) await markD2StepApproved(identity, 'bff55', settlement.pageIds.map(pageId => `l2/${identity.module}/pipeline/agentDefsL2/bff/${pageId}.json`), snapshot.snapshotHash);
    return [addD2Step(context, parentStep.stepId, d2Result('BFF ready', JSON.stringify({ ...identity, completedStep: 'bff55', nextStep: 'shared60', pages: settlement.pageIds.length, refused: refused.map(row => row.pageId) }), 'bff55-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `${trace} ${settlement.pageIds.length} page(s) ready.${refused.length ? ` ${d2PagesRefusedMessage('D2_BFF_PAGES_REFUSED', refused)}` : ''}`)];
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
}

function next(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, args: Args): mls.msg.AgentIntentAddStep {
  return addD2Step(context, parentStep.stepId, { type: 'agent', stepId: 0, interaction: null, stepTitle: `BFF ${args.pageId}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_BFF_PAGE_AGENT_NAME,
    prompt: JSON.stringify(args), rags: [], planning: { planId: `bff55-${args.pageId}-${args.attempt}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep);
}
