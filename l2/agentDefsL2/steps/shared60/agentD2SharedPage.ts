/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/agentD2SharedPage.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readSourceText, writeJson } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { d2LlmModelOf, d2LlmResponseInfo, recordD2LlmResponse, recordD2LlmVerdict, type D2LlmResponseRecord } from '/_102020_/l2/helpers/llmResponses.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_SHARED_PAGE_AGENT_NAME, markD2StepApproved, moduleTokenOk, readD2Pipeline } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { d2PagesRefusedMessage, d2ToolPayload, settleD2Pages, type D2PageSettlePort } from '/_102020_/l2/agentDefsL2/helpers/d2PageSettle.js';
import { d2SharedNavigablePages } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import {
  approveD2SharedUnit, buildD2SharedPrompt, d2SharedJourneySteps, loadD2SharedContext, readD2SharedReceipt, readD2SharedRefusal, receiptInfo, sharedInfo,
  sharedUnitInputHash, D2_SHARED_REFUSAL_VERSION, D2_SHARED_VERSION, type D2SharedContext, type D2SharedLlmResponse, type D2SharedReceipt,
} from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';

interface Args { project: number; module: string; pageId: string; attempt: 1 | 2; diagnostic?: string; previous?: unknown }
type Identity = { project: number; module: string };

function parseArgs(raw: string): Args {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('D2_SHARED_ARGS_INVALID'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('D2_SHARED_ARGS_INVALID');
  const args = value as Args;
  if (!Number.isSafeInteger(args.project) || args.project <= 0 || !moduleTokenOk(args.module) || !/^[a-z][A-Za-z0-9_]*$/u.test(args.pageId) || ![1, 2].includes(args.attempt)) throw new Error('D2_SHARED_ARGS_INVALID');
  return args;
}

export function createAgent(): IAgentAsync {
  return { agentName: D2_SHARED_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/shared60', agentDescription: 'Write the shared v2 of one page from its approved BFF', visibility: 'private', beforePromptStep, afterPromptStep };
}

export interface D2SharedReusePort {
  readReceipt(identity: Identity, pageId: string): Promise<D2SharedReceipt | null>;
  context(identity: Identity, pageId: string): Promise<D2SharedContext>;
  readShared(identity: Identity, pageId: string): Promise<string>;
}
const reusePort: D2SharedReusePort = { readReceipt: readD2SharedReceipt, context: loadD2SharedContext, readShared: (identity, pageId) => readSourceText(sharedInfo(identity, pageId)) };

/** Reused when the receipt approves the same page pair, the same approved BFF, the same prompt and the shared bytes on disk. */
export async function reusableD2Shared(identity: Identity, pageId: string, port: D2SharedReusePort = reusePort): Promise<boolean> {
  const receipt = await port.readReceipt(identity, pageId);
  if (!receipt || receipt.schemaVersion !== D2_SHARED_VERSION || receipt.project !== identity.project || receipt.module !== identity.module || receipt.pageId !== pageId) return false;
  try {
    const context = await port.context(identity, pageId);
    if (await sha256Text(context.skill) !== receipt.skillHash || await sha256Text(context.prompt) !== receipt.promptHash) return false;
    if (await sha256Text(JSON.stringify(context.design)) !== receipt.designHash) return false;
    if (await sha256Text(await port.readShared(identity, pageId)) !== receipt.sourceHash) return false;
    for (const device of ['desktop', 'mobile'] as const) {
      if (await sha256Text(context.page11Text[device]) !== receipt.page11Hashes[device]) return false;
      if (await sha256Text(context.draftText[device]) !== receipt.draftHashes[device]) return false;
    }
    return await sharedUnitInputHash(context) === receipt.unitInputHash;
  } catch { return false; }
}

export interface D2SharedPromptPort {
  reusable(identity: Identity, pageId: string): Promise<boolean>;
  context(identity: Identity, pageId: string): Promise<D2SharedContext>;
  settle(identity: Identity): D2PageSettlePort;
}
function settlePort(identity: Identity): D2PageSettlePort {
  return {
    pageIds: async () => { const snapshot = await readD2Input(identity); return snapshot ? [...snapshot.selection.writePageIds].sort() : null; },
    reusable: pageId => reusableD2Shared(identity, pageId),
    refusal: pageId => readD2SharedRefusal(identity, pageId),
  };
}
const promptPort: D2SharedPromptPort = { reusable: reusableD2Shared, context: loadD2SharedContext, settle: settlePort };

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2SharedPromptPort): Promise<mls.msg.AgentIntent[]> {
  let args: Args;
  try { args = parseArgs(step.prompt || ''); } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
  const port = typeof argsOrPort === 'object' ? argsOrPort : promptPort;
  try {
    if (await port.reusable(args, args.pageId)) return finish(context, parentStep, step, hookSequential, args, `Shared ${args.pageId} reused without an LLM call or write.`, port.settle(args));
    const data = await port.context(args, args.pageId);
    const built = buildD2SharedPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined);
    return [{ type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt: built.systemPrompt, humanPrompt: built.humanPrompt,
      tools: [{ type: 'function', function: { name: 'submitD2Shared', description: 'Write the page motor: entry params, forms, states, functions and journeys over the approved endpoints', parameters: sharedSchemaFor(data) } }],
      toolChoice: { type: 'function', function: { name: 'submitD2Shared' } } }];
  } catch (error) {
    return refuse(context, parentStep, step, hookSequential, args, error instanceof Error ? error.message : String(error), port.settle(args));
  }
}

export async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const args = parseArgs(step.prompt || '');
  let response: unknown;
  let recorded: { info: ReturnType<typeof d2LlmResponseInfo>; record: D2LlmResponseRecord } | undefined;
  try {
    const data = await loadD2SharedContext(args, args.pageId);
    const built = buildD2SharedPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined);
    // The raw answer is kept before anything reads it (d2_69).
    const info = d2LlmResponseInfo(args.project, `${args.module}/pipeline/agentDefsL2/shared60/responses`, args.pageId, String(args.attempt));
    recorded = { info, record: await recordD2LlmResponse(info, { attempt: String(args.attempt), model: d2LlmModelOf(step), promptChars: built.chars, receivedAt: new Date().toISOString(), raw: step.interaction?.payload?.[0] ?? null }) };
    response = d2ToolPayload(step.interaction?.payload?.[0], 'submitD2Shared', 'D2_SHARED');
    await approveD2SharedUnit(data, response as D2SharedLlmResponse, built.chars, args.diagnostic ? built.chars : 0);
    await recordD2LlmVerdict(recorded.info, recorded.record, 'accepted');
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    if (diagnostic.startsWith('D2_LLM_RESPONSE_RECORD_FAILED')) return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
    if (recorded) {
      try { await recordD2LlmVerdict(recorded.info, recorded.record, diagnostic); }
      catch (recordError) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', recordError instanceof Error ? recordError.message : String(recordError))]; }
    }
    if (args.attempt === 1) return [next(context, parentStep, { ...args, attempt: 2, diagnostic, previous: response }),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `One repair scheduled for ${args.pageId}: ${diagnostic}`)];
    return refuse(context, parentStep, step, hookSequential, args, `D2_SHARED_REPAIR_LIMIT: ${diagnostic}`);
  }
  return finish(context, parentStep, step, hookSequential, args, `Shared ${args.pageId} approved.`);
}

/** A refused page records its diagnostic and does not stop its siblings; the last page to settle closes the stage. */
async function refuse(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: Args, diagnostic: string, port?: D2PageSettlePort): Promise<mls.msg.AgentIntent[]> {
  const identity = { project: args.project, module: args.module };
  try {
    await writeJson(receiptInfo(identity, args.pageId), { schemaVersion: D2_SHARED_REFUSAL_VERSION, ...identity, pageId: args.pageId, taskId: context.task?.PK || '', diagnostic });
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `${args.pageId}: ${diagnostic} (refusal not recorded: ${error instanceof Error ? error.message : String(error)})`)]; }
  return finish(context, parentStep, step, hookSequential, args, `Shared ${args.pageId} refused: ${diagnostic}`, port);
}

async function finish(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: Args, trace: string, port?: D2PageSettlePort): Promise<mls.msg.AgentIntent[]> {
  const identity = { project: args.project, module: args.module };
  try {
    const settlement = await settleD2Pages(context.task?.PK || '', port ?? settlePort(identity), 'D2_SHARED_INPUT_MISSING');
    if (settlement.state === 'pending') return [updateD2Status(context, parentStep, step, hookSequential, 'completed', trace)];
    if (settlement.state === 'refused') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', d2PagesRefusedMessage('D2_SHARED_PAGES_REFUSED', settlement.refusals))];
    const snapshot = await readD2Input(identity);
    if (snapshot && await readD2Pipeline(identity)) await markD2StepApproved(identity, 'shared60', settlement.pageIds.map(pageId => `l2/${identity.module}/pipeline/agentDefsL2/shared60/${pageId}.json`), snapshot.snapshotHash);
    return [addD2Step(context, parentStep.stepId, d2Result('Shared ready', JSON.stringify({ ...identity, completedStep: 'shared60', nextStep: 'contracts70', pages: settlement.pageIds.length }), 'shared60-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `${trace} All ${settlement.pageIds.length} pages ready.`)];
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
}

function next(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, args: Args): mls.msg.AgentIntentAddStep {
  return addD2Step(context, parentStep.stepId, { type: 'agent', stepId: 0, interaction: null, stepTitle: `Shared ${args.pageId}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_SHARED_PAGE_AGENT_NAME,
    prompt: JSON.stringify(args), rags: [], planning: { planId: `shared60-${args.pageId}-${args.attempt}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep);
}

/**
 * Closed lists where the code knows the values (d2_67): endpoints, navigation targets, steps, organisms, submits. The
 * host fills every property, so an optional field carries the neutral '' the code reads as absent (d2_74).
 */
export function sharedSchemaFor(data: D2SharedContext): Record<string, unknown> {
  const enumOf = (values: readonly string[]) => (values.length ? { type: 'string', enum: [...new Set(values)] } : { type: 'string' });
  const optionalEnum = (values: readonly string[]) => ({ type: 'string', enum: ['', ...new Set(values)] });
  const organisms = [...new Set([...Object.keys(data.page11.desktop.organisms), ...Object.keys(data.page11.mobile.organisms)])];
  const pages: string[] = [];
  const walk = (nodes: typeof data.menu.tree): void => { for (const node of nodes) { if (node.kind === 'page') pages.push(node.id); walk(node.children ?? []); } };
  walk(data.menu.tree);
  const submits = data.design.endpoints.filter(endpoint => endpoint.kind === 'cmd').map(endpoint => endpoint.when);
  return row(['entry', 'forms', 'states', 'functions', 'journeys'], {
    entry: { type: 'array', items: row(['name', 'type', 'sources', 'effect', 'persist'], {
      name: { type: 'string' }, type: { type: 'string', enum: ['string', 'number', 'boolean'] },
      sources: { type: 'array', items: { type: 'string', enum: ['url', 'localStorage'] } }, effect: { type: 'string' }, persist: { type: 'boolean' },
    }) },
    forms: { type: 'array', items: row(['submit', 'organism'], { submit: enumOf(submits), organism: enumOf(organisms) }) },
    states: { type: 'array', items: row(['id', 'source', 'description'], { id: { type: 'string' }, source: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9]*(\\.[A-Za-z][A-Za-z0-9]*)*$' }, description: { type: 'string' } }) },
    functions: { type: 'array', items: row(['id', 'description'], {
      id: { type: 'string' }, description: { type: 'string' }, calls: optionalEnum(data.design.endpoints.map(endpoint => endpoint.id)),
      sets: { type: 'string', pattern: '^([A-Za-z][A-Za-z0-9]*)?$' }, updates: { type: 'array', items: { type: 'string' } },
      navigate: optionalEnum(d2SharedNavigablePages(data.menu, data.need.actors)), carries: { type: 'array', items: row(['key', 'from'], { key: { type: 'string' }, from: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9]*\\.[A-Za-z][A-Za-z0-9]*$' } }) },
    }) },
    journeys: { type: 'array', items: row(['step', 'organisms', 'functions'], {
      step: enumOf(d2SharedJourneySteps(data.need, data.menu)), organisms: { type: 'array', items: enumOf(organisms) },
      functions: { type: 'array', items: { type: 'string' } }, continuesIn: optionalEnum(pages),
    }) },
  });
}

const row = (required: string[], properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required, properties });
