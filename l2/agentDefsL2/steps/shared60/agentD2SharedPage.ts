/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/agentD2SharedPage.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readJson, readSourceText, writeJson } from '/_102035_/l2/solution/fs.js';
import { d2SharedNavigablePages } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { d2LlmModelOf, d2LlmResponseInfo, recordD2LlmResponse, recordD2LlmVerdict, type D2LlmResponseRecord } from '/_102020_/l2/helpers/llmResponses.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_SHARED_PAGE_AGENT_NAME, markD2StepApproved, moduleTokenOk, readD2Pipeline } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { parseD2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import type { D2PageRequestsCategory, D2PageRequestsInput, D2PageRequestsSibling } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import {
  approveD2SharedUnit, buildD2SharedContext, buildD2SharedPrompt, d2SharedJourneySteps, d2SharedRefusal, d2SharedRefusedMessage, draftFile, page11File, readD2SharedReceipt,
  readD2SharedRefusal, receiptInfo, settleD2Shared, sharedInfo, sharedUnitInputHash, D2_SHARED_VERSION,
  type D2SharedContext, type D2SharedSettlePort, type D2SharedLlmResponse, type D2SharedReceipt,
} from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';

interface Args { project: number; module: string; pageId: string; attempt: 1 | 2; diagnostic?: string; previous?: unknown; repairPromptChars?: number }

function parseArgs(raw: string): Args {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('D2_SHARED_ARGS_INVALID'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('D2_SHARED_ARGS_INVALID');
  const args = value as Args;
  if (!Number.isSafeInteger(args.project) || args.project <= 0 || !moduleTokenOk(args.module) || !/^[a-z][A-Za-z0-9_]*$/u.test(args.pageId) || ![1, 2].includes(args.attempt)) throw new Error('D2_SHARED_ARGS_INVALID');
  return args;
}

function toolPayload(value: unknown, name: string): unknown {
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const candidate = root.type === 'flexible' ? (root.result as Record<string, unknown>)?.arguments : root.arguments ?? root.payload ?? root;
  if (root.type === 'flexible' && (root.result as Record<string, unknown>)?.toolName !== name) throw new Error('D2_SHARED_TOOL_MISMATCH');
  if (typeof candidate !== 'string') return candidate;
  try { return JSON.parse(candidate); } catch { throw new Error('D2_SHARED_TOOL_JSON'); }
}

export function createAgent(): IAgentAsync {
  return { agentName: D2_SHARED_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/shared60', agentDescription: 'Define one shared v2 page from the deterministic core', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function readPair(identity: { project: number; module: string }, pageId: string) {
  const devices = ['desktop', 'mobile'] as const;
  const texts = await Promise.all(devices.map(device => readSourceText(page11File(identity, pageId, device))));
  const drafts = await Promise.all(devices.map(device => readJson<unknown>(draftFile(identity, pageId, device))));
  if (texts.some(text => !text) || drafts.some(draft => !draft)) throw new Error(`D2_SHARED_PAGE11_MISSING: ${pageId}`);
  return {
    page11Text: { desktop: texts[0], mobile: texts[1] } as Record<D2Page11Device, string>,
    draftText: { desktop: JSON.stringify(drafts[0]), mobile: JSON.stringify(drafts[1]) } as Record<D2Page11Device, string>,
    page11: { desktop: parseD2Page11Definition(texts[0]).definition, mobile: parseD2Page11Definition(texts[1]).definition },
    drafts: { desktop: buildD2Page11Needs(drafts[0]), mobile: buildD2Page11Needs(drafts[1]) },
  };
}

export async function contextFor(args: Args): Promise<D2SharedContext> {
  const identity = { project: args.project, module: args.module };
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_SHARED_INPUT_MISSING');
  const bundle = await readD2InputBundle(identity);
  await assertD2InputSourcesStable(bundle);
  if (!snapshot.selection.writePageIds.includes(args.pageId)) throw new Error(`D2_SHARED_PAGE_NOT_SELECTED: ${args.pageId}`);
  const [skill, prompt, catalog] = await Promise.all([
    readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/skills', shortName: 'genD2SharedDefinition', extension: '.ts' }),
    readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/steps/shared60', shortName: 'prompt', extension: '.md' }),
    readJson<{ categories: D2PageRequestsCategory[] }>({ project: 102020, level: 4, folder: 'collabux/templates', shortName: 'categoryList', extension: '.json' }),
  ]);
  if (!catalog?.categories) throw new Error('D2_SHARED_CATEGORIES_MISSING');
  const ids = [...snapshot.selection.writePageIds].sort();
  const pairs = new Map<string, Awaited<ReturnType<typeof readPair>>>();
  for (const pageId of ids) pairs.set(pageId, await readPair(identity, pageId));
  const own = pairs.get(args.pageId);
  if (!own) throw new Error(`D2_SHARED_PAGE11_MISSING: ${args.pageId}`);
  const siblings: D2PageRequestsSibling[] = ids.map(pageId => {
    const pair = pairs.get(pageId)!;
    return { pageId, desktop: pair.page11.desktop, mobile: pair.page11.mobile, draftDesktop: pair.drafts.desktop, draftMobile: pair.drafts.mobile };
  });
  const needs = bundle.artifacts.needs as { pages: D2PageRequestsInput['needsPages'] };
  const access = bundle.artifacts.access as D2PageRequestsInput['access'];
  const rules = bundle.artifacts.rules as D2PageRequestsInput['rules'];
  const menu = bundle.artifacts.menu as D2PageRequestsInput['menu'];
  const input: D2PageRequestsInput = {
    module: args.module, pageId: args.pageId,
    desktop: own.page11.desktop, mobile: own.page11.mobile, draftDesktop: own.drafts.desktop, draftMobile: own.drafts.mobile,
    siblings, needsPages: needs.pages, menu, entities: bundle.artifacts.entities as D2PageRequestsInput['entities'],
    access, rules, categories: catalog.categories,
  };
  return buildD2SharedContext(input, { identity, inputHash: snapshot.snapshotHash, ...own, skill, prompt });
}

export interface D2SharedReusePort {
  readReceipt(identity: { project: number; module: string }, pageId: string): Promise<D2SharedReceipt | null>;
  context(args: Args): Promise<D2SharedContext>;
  readShared(identity: { project: number; module: string }, pageId: string): Promise<string>;
}
const reusePort: D2SharedReusePort = {
  readReceipt: readD2SharedReceipt,
  context: contextFor,
  readShared: (identity, pageId) => readSourceText(sharedInfo(identity, pageId)),
};

export async function reusableD2Shared(identity: { project: number; module: string }, pageId: string, port: D2SharedReusePort = reusePort): Promise<boolean> {
  const receipt = await port.readReceipt(identity, pageId);
  if (!receipt || receipt.schemaVersion !== D2_SHARED_VERSION || receipt.project !== identity.project || receipt.module !== identity.module || receipt.pageId !== pageId) return false;
  try {
    const context = await port.context({ ...identity, pageId, attempt: 1 });
    if (await sha256Text(context.skill) !== receipt.skillHash || await sha256Text(context.prompt) !== receipt.promptHash) return false;
    const source = await port.readShared(identity, pageId);
    if (await sha256Text(source) !== receipt.sourceHash) return false;
    for (const device of ['desktop', 'mobile'] as const) {
      if (await sha256Text(context.page11Text[device]) !== receipt.page11Hashes[device]) return false;
      if (await sha256Text(context.draftText[device]) !== receipt.draftHashes[device]) return false;
    }
    return await sharedUnitInputHash(context) === receipt.unitInputHash;
  } catch { return false; }
}

export interface D2SharedPromptPort {
  reusable(identity: { project: number; module: string }, pageId: string): Promise<boolean>;
  context(args: Args): Promise<D2SharedContext>;
  settle(identity: { project: number; module: string }): D2SharedSettlePort;
}
function settlePort(identity: { project: number; module: string }): D2SharedSettlePort {
  return {
    pageIds: async () => { const snapshot = await readD2Input(identity); return snapshot ? [...snapshot.selection.writePageIds].sort() : null; },
    reusable: pageId => reusableD2Shared(identity, pageId),
    refusal: pageId => readD2SharedRefusal(identity, pageId),
  };
}
const promptPort: D2SharedPromptPort = { reusable: reusableD2Shared, context: contextFor, settle: settlePort };

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2SharedPromptPort): Promise<mls.msg.AgentIntent[]> {
  try {
    const port = typeof argsOrPort === 'object' ? argsOrPort : promptPort;
    const args = parseArgs(step.prompt || '');
    if (await port.reusable(args, args.pageId)) {
      return finish(context, parentStep, step, hookSequential, args, `Shared ${args.pageId} reused without an LLM call or write.`, port.settle(args));
    }
    const data = await port.context(args);
    const built = buildD2SharedPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined);
    return [{ type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt: built.systemPrompt, humanPrompt: built.humanPrompt,
      tools: [{ type: 'function', function: { name: 'submitD2Shared', description: 'Define states, functions, journeys, command returns and request rules for one shared page', parameters: sharedSchemaFor(data) } }],
      toolChoice: { type: 'function', function: { name: 'submitD2Shared' } } }];
  } catch (error) {
    let args: Args;
    try { args = parseArgs(step.prompt || ''); } catch { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
    return refuse(context, parentStep, step, hookSequential, args, error instanceof Error ? error.message : String(error));
  }
}

export async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const args = parseArgs(step.prompt || '');
  let response: unknown;
  let recorded: { info: ReturnType<typeof d2LlmResponseInfo>; record: D2LlmResponseRecord } | undefined;
  try {
    const data = await contextFor(args);
    const built = buildD2SharedPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined);
    // The raw answer is kept before anything reads it (d2_69).
    const info = d2LlmResponseInfo(args.project, `${args.module}/pipeline/agentDefsL2/shared60/responses`, args.pageId, String(args.attempt));
    recorded = { info, record: await recordD2LlmResponse(info, { attempt: String(args.attempt), model: d2LlmModelOf(step), promptChars: built.chars, receivedAt: new Date().toISOString(), raw: step.interaction?.payload?.[0] ?? null }) };
    response = toolPayload(step.interaction?.payload?.[0], 'submitD2Shared');
    await approveD2SharedUnit(data, response as D2SharedLlmResponse, built.chars, args.diagnostic ? built.chars : args.repairPromptChars ?? 0);
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
async function refuse(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: Args, diagnostic: string): Promise<mls.msg.AgentIntent[]> {
  const identity = { project: args.project, module: args.module };
  try { await writeJson(receiptInfo(identity, args.pageId), d2SharedRefusal(identity, args.pageId, context.task?.PK || '', diagnostic)); }
  catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `${args.pageId}: ${diagnostic} (refusal not recorded: ${error instanceof Error ? error.message : String(error)})`)]; }
  return finish(context, parentStep, step, hookSequential, args, `Shared ${args.pageId} refused: ${diagnostic}`);
}

async function finish(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: Args, trace: string, port?: D2SharedSettlePort): Promise<mls.msg.AgentIntent[]> {
  const identity = { project: args.project, module: args.module };
  try {
    const settlement = await settleD2Shared(context.task?.PK || '', port ?? settlePort(identity));
    if (settlement.state === 'pending') return [updateD2Status(context, parentStep, step, hookSequential, 'completed', trace)];
    if (settlement.state === 'refused') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', d2SharedRefusedMessage(settlement.refusals))];
    const snapshot = await readD2Input(identity);
    const ids = settlement.pageIds;
    if (snapshot && await readD2Pipeline(identity)) await markD2StepApproved(identity, 'shared60', ids.map(pageId => `l2/${identity.module}/pipeline/agentDefsL2/shared60/${pageId}.json`), snapshot.snapshotHash);
    return [addD2Step(context, parentStep.stepId, d2Result('Shared ready', JSON.stringify({ ...identity, completedStep: 'shared60', nextStep: 'contracts70', pages: ids.length }), 'shared60-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `${trace} All ${ids.length} pages ready.`)];
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
}

function next(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, args: Args): mls.msg.AgentIntentAddStep {
  return addD2Step(context, parentStep.stepId, { type: 'agent', stepId: 0, interaction: null, stepTitle: `Shared ${args.pageId}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_SHARED_PAGE_AGENT_NAME,
    prompt: JSON.stringify(args), rags: [], planning: { planId: `shared60-${args.pageId}-${args.attempt}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep);
}

/** Choices inside lists the code knows become enums of the tool schema (d2_67); an empty list keeps the field free and the gate decides. */
export function sharedSchemaFor(data: D2SharedContext): Record<string, unknown> {
  const schema = structuredClone(sharedSchema) as { properties: Record<string, { items: { properties: Record<string, Record<string, unknown>> } }> };
  const limit = (field: Record<string, unknown>, values: readonly string[]) => { if (values.length) field.enum = [...new Set(values)]; };
  const fields = (name: string) => schema.properties[name].items.properties;
  const requests = data.derived.requests;
  const commands = requests.filter(item => item.kind === 'cmd').map(item => item.id);
  const need = data.input.needsPages.find(item => item.pageId === data.input.pageId);
  const menuPages: string[] = [];
  const walk = (nodes: typeof data.input.menu.tree): void => { for (const node of nodes) { if (node.kind === 'page') menuPages.push(node.id); walk(node.children ?? []); } };
  walk(data.input.menu.tree);
  limit(fields('functions').calls, requests.map(item => item.id));
  limit(fields('functions').navigate, d2SharedNavigablePages(data.input.menu, need?.actors ?? []));
  limit(fields('journeys').step, need ? d2SharedJourneySteps(need, data.input.menu) : []);
  limit(fields('journeys').organisms.items as Record<string, unknown>, Object.keys(data.page11.desktop.organisms));
  limit(fields('journeys').continuesIn, menuPages);
  limit(fields('commandReturns').requestId, commands);
  limit(fields('commandReturns').returns.items as Record<string, unknown>, [...new Set((need?.reads ?? []).map(read => read.entity[0].toLowerCase() + read.entity.slice(1)))]);
  limit(fields('requestRules').requestId, requests.map(item => item.id));
  limit(fields('requestRules').rules.items as Record<string, unknown>, Object.values(data.derived.rules).flat());
  const ambiguous = Object.values(data.derived.forms).filter(item => item.ambiguous);
  limit(fields('formChoices').submit, ambiguous.map(item => item.submit));
  limit(fields('formChoices').organism, ambiguous.length ? Object.entries(data.page11.desktop.organisms).filter(([, organism]) => organism.kind === 'form').map(([id]) => id) : []);
  return schema;
}

const row = (required: string[], properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required, properties });
const sharedSchema = row(['states', 'functions', 'journeys', 'commandReturns', 'requestRules'], {
  states: { type: 'array', items: row(['id', 'source', 'description'], { id: { type: 'string' }, source: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9]*(\\.[A-Za-z][A-Za-z0-9]*)*$' }, description: { type: 'string' } }) },
  functions: { type: 'array', items: row(['id', 'description'], { id: { type: 'string' }, description: { type: 'string' }, calls: { type: 'string' }, sets: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9]*$' }, updates: { type: 'array', items: { type: 'string' } }, navigate: { type: 'string' }, carries: { type: 'object', additionalProperties: { type: 'string' } } }) },
  journeys: { type: 'array', items: row(['step', 'organisms', 'functions'], { step: { type: 'string' }, organisms: { type: 'array', items: { type: 'string' } }, functions: { type: 'array', items: { type: 'string' } }, continuesIn: { type: 'string' } }) },
  commandReturns: { type: 'array', items: row(['requestId', 'returns'], { requestId: { type: 'string' }, returns: { type: 'array', items: { type: 'string' } } }) },
  requestRules: { type: 'array', items: row(['requestId', 'rules'], { requestId: { type: 'string' }, rules: { type: 'array', items: { type: 'string' } } }) },
  formChoices: { type: 'array', items: row(['submit', 'organism'], { submit: { type: 'string' }, organism: { type: 'string' } }) },
});
