/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readJson, readSourceText } from '/_102035_/l2/solution/fs.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_PAGES_PAGE_AGENT_NAME, d2PagesNextStep, markD2StepApproved, moduleTokenOk, type D2Scope } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { buildD2MoleculeInventory, moleculeGroupPrompt, readD2MoleculeShortlist } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { d2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';
import { parseD2MoleculeGroupJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import { loadD2PageTemplateContext } from '/_102020_/l2/agentDefsL2/steps/pages50/templateContext.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { d2Page11WriteDuplicates } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';
import { d2LlmModelOf, d2LlmResponseInfo, recordD2LlmResponse, recordD2LlmVerdict, type D2LlmResponseRecord } from '/_102020_/l2/helpers/llmResponses.js';
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { parseD2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { approveD2PagesUnit, buildD2PagesDecisionPrompt, d2ChosenMolecules, d2PageChoiceEnums, type D2ApprovedPage11, type D2PageChoiceEnums, needsInfo, pageUnitInputHash, readD2PagesReceipt, sourceInfo, D2_PAGES_VERSION, D2_PAGE11_NEEDS_VERSION, type D2PagesContext, type D2PagesReceipt, type D2PagesResponse, D2_PAGES_PROMPT_LIMIT_CHARS } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

interface Args { project: number; module: string; scope?: D2Scope; pageId: string; stage: 'groups' | 'decision'; attempt: 1 | 2; selectedGroups?: Record<string, string[]>; groupAssessments?: D2PagesContext['groupAssessments']; diagnostic?: string; previous?: unknown; repairPromptChars?: number }
const GROUPS_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->

Select relevant molecular groups by purpose for every organism. Return exact catalog group IDs.`;
function parseArgs(raw: string): Args {
  let value: unknown; try { value = JSON.parse(raw); } catch { throw new Error('D2_PAGES_ARGS_INVALID'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('D2_PAGES_ARGS_INVALID');
  const args = value as Args;
  if (!Number.isSafeInteger(args.project) || args.project <= 0 || !moduleTokenOk(args.module) || !/^[a-z][A-Za-z0-9_]*$/u.test(args.pageId) || ![1, 2].includes(args.attempt) || !['groups', 'decision'].includes(args.stage)) throw new Error('D2_PAGES_ARGS_INVALID');
  if (args.scope !== undefined && args.scope !== 'all' && args.scope !== 'pages') throw new Error('D2_PAGES_ARGS_INVALID');
  if (args.stage === 'decision' && !args.selectedGroups) throw new Error('D2_PAGES_GROUPS_MISSING');
  return args;
}
function organismSources(page: D2PagesContext['page']): Array<{ id: string; kind: string; text: string }> {
  return page.organisms.map((raw, index) => { const item = raw as { kind?: string; text?: string }; return { id: `organism${index + 1}`, kind: item.kind ?? '', text: item.text ?? '' }; });
}
function toolPayload(value: unknown, name: string): unknown {
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const candidate = root.type === 'flexible' ? (root.result as Record<string, unknown>)?.arguments : root.arguments ?? root.payload ?? root;
  if (root.type === 'flexible' && (root.result as Record<string, unknown>)?.toolName !== name) throw new Error('D2_PAGES_TOOL_MISMATCH');
  if (typeof candidate !== 'string') return candidate;
  try { return JSON.parse(candidate); } catch { throw new Error('D2_PAGES_TOOL_JSON'); }
}

export function createAgent(): IAgentAsync { return { agentName: D2_PAGES_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/pages50', agentDescription: 'Research and define one desktop/mobile page11 v2 pair', visibility: 'private', beforePromptStep, afterPromptStep }; }

export async function contextFor(args: Args): Promise<D2PagesContext> {
  const identity = { project: args.project, module: args.module };
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_PAGES_INPUT_MISSING');
  const bundle = await readD2InputBundle(identity);
  await assertD2InputSourcesStable(bundle);
  const page = snapshot.selection.pages.find(item => item.pageId === args.pageId);
  if (!page || !snapshot.selection.writePageIds.includes(args.pageId)) throw new Error(`D2_PAGES_PAGE_NOT_SELECTED: ${args.pageId}`);
  const [template, inventory, skill, prompt] = await Promise.all([
    loadD2PageTemplateContext(), buildD2MoleculeInventory(d2MoleculeCatalogPort, args.project),
    readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/skills', shortName: 'genD2Page11Definition', extension: '.ts' }),
    readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/steps/pages50', shortName: 'prompt', extension: '.md' }),
  ]);
  const selectedGroups = args.selectedGroups ?? {};
  const shortlist = await readD2MoleculeShortlist(d2MoleculeCatalogPort, inventory, selectedGroups);
  return { identity, snapshot, artifacts: bundle.artifacts, page, template, inventory, selectedGroups, groupAssessments: args.groupAssessments,
    groups: shortlist.groups, moleculeHashes: shortlist.hashes, skill, prompt };
}

export interface D2PagesReusePort {
  readReceipt(identity: { project: number; module: string }, pageId: string): Promise<D2PagesReceipt | null>;
  context(identity: { project: number; module: string }, pageId: string, selectedGroups: Record<string, string[]>): Promise<D2PagesContext>;
  readSource(info: ReturnType<typeof sourceInfo>): Promise<string>;
  readNeeds(info: ReturnType<typeof needsInfo>): Promise<unknown>;
}
const reusePort: D2PagesReusePort = {
  readReceipt: readD2PagesReceipt,
  context: (identity, pageId, selectedGroups) => contextFor({ ...identity, pageId, stage: 'groups', attempt: 1, selectedGroups }),
  readSource: readSourceText,
  readNeeds: info => readJson<unknown>(info),
};

/** Full receipt and disk check before scheduling either LLM stage. */
export async function reusableD2Page(identity: { project: number; module: string }, pageId: string, port: D2PagesReusePort = reusePort): Promise<boolean> {
  const receipt = await port.readReceipt(identity, pageId);
  if (!receipt || receipt.schemaVersion !== D2_PAGES_VERSION || receipt.needsVersion !== D2_PAGE11_NEEDS_VERSION
    || receipt.project !== identity.project || receipt.module !== identity.module || receipt.pageId !== pageId
    || !receipt.unitInputHash || !receipt.moleculeGroupAssessments) return false;
  const selectedGroups: Record<string, string[]> = {};
  for (const item of receipt.moleculeGroupAssessments) {
    if (!/^organism[1-9][0-9]*$/.test(item.organismId) || selectedGroups[item.organismId]) return false;
    selectedGroups[item.organismId] = item.groups.filter(group => group.relevant).map(group => group.groupId);
  }
  try {
    const context = await port.context(identity, pageId, selectedGroups);
    if (await pageUnitInputHash(context) !== receipt.unitInputHash) return false;
    const template = await context.template.select(receipt.template.category);
    if (template.experience !== receipt.template.experience || template.reference !== receipt.template.reference || template.hash !== receipt.template.hash) return false;
    // d2_71: the catalog counts only through what this page uses (its template above, its molecules below);
    // index text that does not touch them keeps the page.
    if (await sha256Text(context.skill) !== receipt.skillHash
      || await sha256Text(context.prompt) !== receipt.promptHash) return false;
    const definitions = {} as D2ApprovedPage11['definitions'];
    for (const device of ['desktop', 'mobile'] as const) {
      const source = await port.readSource(sourceInfo(identity, pageId, device));
      const needs = await port.readNeeds(needsInfo(identity, pageId, device));
      if (!needs || await sha256Text(source) !== receipt.sourceHashes[device]
        || await sha256Text(JSON.stringify(needs)) !== receipt.needsHashes[device]) return false;
      // A page11 approved before a gate existed is checked again; refused means redone, not reused.
      if (d2Page11WriteDuplicates(buildD2Page11Needs(needs)).length) return false;
      definitions[device] = parseD2Page11Definition(source).definition;
    }
    // Every molecule the page chose must still be in its groups; a removed or renamed one redoes the page.
    const tags = new Set(context.groups.flatMap(group => group.tags));
    for (const tag of d2ChosenMolecules(definitions).keys()) if (!tags.has(tag)) return false;
    return true;
  } catch { return false; }
}

/** The approved page11 on disk (both devices and drafts), or null when there is none or it no longer parses. */
export async function readApprovedPage11(identity: { project: number; module: string }, pageId: string, port: Pick<D2PagesReusePort, 'readSource' | 'readNeeds'> = reusePort): Promise<D2ApprovedPage11 | null> {
  try {
    const definitions = {} as D2ApprovedPage11['definitions'];
    const needs = {} as D2ApprovedPage11['needs'];
    for (const device of ['desktop', 'mobile'] as const) {
      const source = await port.readSource(sourceInfo(identity, pageId, device));
      const draft = await port.readNeeds(needsInfo(identity, pageId, device));
      if (!source || !draft) return null;
      definitions[device] = parseD2Page11Definition(source).definition;
      needs[device] = buildD2Page11Needs(draft);
    }
    return { definitions, needs };
  } catch { return null; }
}

/** Groups already judged for an approved page: a regeneration goes straight to the decision with them (d2_71). */
export async function approvedPageSeed(identity: { project: number; module: string }, pageId: string, port: D2PagesReusePort = reusePort): Promise<{ selectedGroups: Record<string, string[]>; groupAssessments: NonNullable<D2PagesContext['groupAssessments']> } | null> {
  const receipt = await port.readReceipt(identity, pageId);
  if (!receipt?.moleculeGroupAssessments?.length || !await readApprovedPage11(identity, pageId, port)) return null;
  const selectedGroups = Object.fromEntries(receipt.moleculeGroupAssessments.map(item => [item.organismId, item.groups.filter(group => group.relevant).map(group => group.groupId)]));
  return { selectedGroups, groupAssessments: receipt.moleculeGroupAssessments };
}

export interface D2PagesPromptPort {
  reusable(identity: { project: number; module: string }, pageId: string): Promise<boolean>;
  context(args: Args): Promise<D2PagesContext>;
  approved?(identity: { project: number; module: string }, pageId: string): Promise<D2ApprovedPage11 | null>;
}
const promptPort: D2PagesPromptPort = { reusable: reusableD2Page, context: contextFor, approved: (identity, pageId) => readApprovedPage11(identity, pageId) };

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2PagesPromptPort): Promise<mls.msg.AgentIntent[]> {
  try {
    const port = typeof argsOrPort === 'object' ? argsOrPort : promptPort;
    const args = parseArgs(step.prompt || '');
    if (args.stage === 'groups' && await port.reusable(args, args.pageId)) {
      return [updateD2Status(context, parentStep, step, hookSequential, 'completed', `Page11 ${args.pageId} reused without an LLM call or write.`)];
    }
    const data = await port.context(args);
    const isGroups = args.stage === 'groups';
    const approved = isGroups ? null : await (port.approved ?? (async () => null))(args, args.pageId);
    const decision = isGroups ? null : buildD2PagesDecisionPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined, approved);
    const humanPrompt = isGroups ? `${moleculeGroupPrompt(data.inventory, organismSources(data.page))}${args.diagnostic ? `\nRepair: ${JSON.stringify({ diagnostic: args.diagnostic, previous: args.previous })}` : ''}` : decision!.prompt;
    const systemPrompt = isGroups ? GROUPS_SYSTEM_PROMPT : `${data.prompt}\n${data.skill}`;
    if (systemPrompt.length + humanPrompt.length > D2_PAGES_PROMPT_LIMIT_CHARS) throw new Error(`D2_PAGE11_PROMPT_LIMIT: ${systemPrompt.length + humanPrompt.length}`);
    const name = isGroups ? 'submitD2MoleculeGroups' : 'submitD2Pages';
    const parameters = isGroups ? groupSchema : await readPageSchema(d2PageChoiceEnums(data));
    return [{ type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
      taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt, humanPrompt,
      tools: [{ type: 'function', function: { name, description: isGroups ? 'Select molecule catalog groups for each organism' : 'Define desktop and mobile page11 v2 and internal needs drafts', parameters } }],
      toolChoice: { type: 'function', function: { name } } }];
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
}

export async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const args = parseArgs(step.prompt || '');
  const name = args.stage === 'groups' ? 'submitD2MoleculeGroups' : 'submitD2Pages';
  let response: unknown;
  let recorded: { info: ReturnType<typeof d2LlmResponseInfo>; record: D2LlmResponseRecord } | undefined;
  try {
    const data = await contextFor(args);
    // The raw answer is kept before anything reads it (d2_69); each stage and repair is its own attempt.
    const attempt = `${args.stage}-${args.attempt}`;
    const info = d2LlmResponseInfo(args.project, `${args.module}/pipeline/agentDefsL2/pages50/responses`, args.pageId, attempt);
    const approved = args.stage === 'groups' ? null : await readApprovedPage11(args, args.pageId);
    const promptChars = args.stage === 'groups' ? 0 : data.prompt.length + 1 + data.skill.length + buildD2PagesDecisionPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined, approved).chars;
    recorded = { info, record: await recordD2LlmResponse(info, { attempt, model: d2LlmModelOf(step), promptChars, receivedAt: new Date().toISOString(), raw: step.interaction?.payload?.[0] ?? null }) };
    response = toolPayload(step.interaction?.payload?.[0], name);
    if (args.stage === 'groups') {
      const result = parseD2MoleculeGroupJudgment(response, organismSources(data.page).map(item => item.id), data.inventory);
      const selectedGroups = result.selected;
      await readD2MoleculeShortlist(d2MoleculeCatalogPort, data.inventory, selectedGroups);
      await recordD2LlmVerdict(recorded.info, recorded.record, 'accepted');
      const repairPromptChars = args.diagnostic ? GROUPS_SYSTEM_PROMPT.length + moleculeGroupPrompt(data.inventory, organismSources(data.page)).length + JSON.stringify({ diagnostic: args.diagnostic, previous: args.previous }).length + '\nRepair: '.length : 0;
      return [next(context, parentStep, { ...args, stage: 'decision', selectedGroups, groupAssessments: result.assessments, diagnostic: undefined, previous: undefined, repairPromptChars }),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `Molecule shortlist ready for ${args.pageId}.`)];
    }
    const receipt = await approveD2PagesUnit(data, response as D2PagesResponse, promptChars, args.diagnostic ? promptChars : args.repairPromptChars ?? 0);
    await recordD2LlmVerdict(recorded.info, recorded.record, 'accepted');
    const ids = [...data.snapshot.selection.writePageIds].sort();
    let allReady = true;
    for (const pageId of ids) if (!await reusableD2Page(data.identity, pageId)) { allReady = false; break; }
    if (allReady) {
      await markD2StepApproved(data.identity, 'pages50', ids.map(pageId => `l2/${data.identity.module}/pipeline/agentDefsL2/pages50/${pageId}.json`), data.snapshot.snapshotHash);
      return [addD2Step(context, parentStep.stepId, d2Result('Pages ready', JSON.stringify({ ...data.identity, completedStep: 'pages50', nextStep: d2PagesNextStep(args.scope === 'all' ? 'all' : 'pages'), pages: ids.length }), 'pages50-done')),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `Page11 ${args.pageId} approved; all ${ids.length} pages ready.`)];
    }
    return [updateD2Status(context, parentStep, step, hookSequential, 'completed', `Page11 ${args.pageId} approved: ${receipt.sourceHashes.desktop}, ${receipt.sourceHashes.mobile}.`)];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    if (diagnostic.startsWith('D2_LLM_RESPONSE_RECORD_FAILED')) return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
    if (recorded) {
      try { await recordD2LlmVerdict(recorded.info, recorded.record, diagnostic); }
      catch (recordError) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', recordError instanceof Error ? recordError.message : String(recordError))]; }
    }
    if (args.attempt === 1) return [next(context, parentStep, { ...args, attempt: 2, diagnostic, previous: response }),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `One repair scheduled for ${args.pageId}: ${diagnostic}`)];
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `D2_PAGES_REPAIR_LIMIT: ${diagnostic}`)];
  }
}

function next(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, args: Args): mls.msg.AgentIntentAddStep {
  return addD2Step(context, parentStep.stepId, { type: 'agent', stepId: 0, interaction: null, stepTitle: `Page11 ${args.pageId} ${args.stage}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_PAGES_PAGE_AGENT_NAME,
    prompt: JSON.stringify(args), rags: [], planning: { planId: `pages50-${args.pageId}-${args.stage}-${args.attempt}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep);
}

const groupSchema = { type: 'object', additionalProperties: false, required: ['organisms'], properties: { organisms: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['organismId', 'groups'], properties: { organismId: { type: 'string' }, groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['groupId', 'relevant', 'reason'], properties: { groupId: { type: 'string' }, relevant: { type: 'boolean' }, reason: { type: 'string' } } } } } } } } };
/** The page schema with `write` limited to the page's exact write keys (a page without writes keeps the plain field; its gate refuses any submit). */
export async function readPageSchema(enums: D2PageChoiceEnums = { writeKeys: [], categories: [], kinds: [], targets: [], tags: [] }): Promise<Record<string, unknown>> {
  const [page, needs] = await Promise.all([
    readJson<Record<string, unknown>>({ project: 102020, level: 2, folder: 'agentDefsL2/schemas', shortName: 'page11V2', extension: '.json' }),
    readJson<Record<string, unknown>>({ project: 102020, level: 2, folder: 'agentDefsL2/schemas', shortName: 'page11NeedsV1', extension: '.json' }),
  ]);
  if (!page || !needs) throw new Error('D2_PAGES_SCHEMA_MISSING');
  const { $schema: _pageDialect, $id: _pageId, ...pageShape } = withPageEnums(page, enums);
  const { $schema: _needsDialect, $id: _needsId, ...needsShape } = withWriteEnum(needs, enums.writeKeys);
  const unit = { type: 'object', additionalProperties: false, required: ['definition', 'needs'], properties: { definition: pageShape, needs: needsShape } };
  return { type: 'object', additionalProperties: false, required: ['desktop', 'mobile', 'categoryReason'], properties: { desktop: unit, mobile: unit, categoryReason: { type: 'string' } } };
}

export function withWriteEnum(schema: Record<string, unknown>, writeKeys: readonly string[]): Record<string, unknown> {
  if (!writeKeys.length) return schema;
  const copy = structuredClone(schema) as { properties?: { organisms?: { additionalProperties?: { properties?: { submits?: { items?: { properties?: { write?: Record<string, unknown> } } } } } } } };
  const write = copy.properties?.organisms?.additionalProperties?.properties?.submits?.items?.properties?.write;
  if (!write) throw new Error('D2_PAGES_SCHEMA_WRITE_MISSING');
  write.enum = [...writeKeys];
  return copy as Record<string, unknown>;
}

/** category, organism kind, navigate target and molecule tags are choices inside lists the code knows. */
export function withPageEnums(schema: Record<string, unknown>, enums: D2PageChoiceEnums): Record<string, unknown> {
  const copy = structuredClone(schema) as Record<string, unknown>;
  const at = (path: string[]): Record<string, unknown> => {
    let node: unknown = copy;
    for (const key of path) node = (node as Record<string, unknown> | undefined)?.[key];
    if (!node || typeof node !== 'object') throw new Error(`D2_PAGES_SCHEMA_FIELD_MISSING: ${path.join('.')}`);
    return node as Record<string, unknown>;
  };
  const limit = (path: string[], values: readonly string[]) => { if (values.length) at(path).enum = [...values]; };
  limit(['properties', 'template', 'properties', 'category'], enums.categories);
  limit(['properties', 'organisms', 'additionalProperties', 'properties', 'kind'], enums.kinds);
  limit(['properties', 'organisms', 'additionalProperties', 'properties', 'intents', 'items', 'properties', 'to'], enums.targets);
  limit(['properties', 'molecules', 'additionalProperties', 'items', 'properties', 'preferred'], enums.tags);
  limit(['properties', 'molecules', 'additionalProperties', 'items', 'properties', 'alternative'], enums.tags.length ? ['', ...enums.tags] : []);
  return copy;
}
