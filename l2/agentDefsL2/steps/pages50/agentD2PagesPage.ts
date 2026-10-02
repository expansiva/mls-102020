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
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { approveD2PagesUnit, buildD2PagesDecisionPrompt, needsInfo, pageUnitInputHash, readD2PagesReceipt, sourceInfo, D2_PAGES_VERSION, D2_PAGE11_NEEDS_VERSION, type D2PagesContext, type D2PagesReceipt, type D2PagesResponse, D2_PAGES_PROMPT_LIMIT_CHARS } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

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
    if (await sha256Text(context.template.catalog) !== receipt.template.catalogHash
      || context.inventory.sourceHash !== receipt.moleculeInventoryHash
      || JSON.stringify(context.moleculeHashes) !== JSON.stringify(receipt.moleculeHashes)
      || await sha256Text(context.skill) !== receipt.skillHash
      || await sha256Text(context.prompt) !== receipt.promptHash) return false;
    for (const device of ['desktop', 'mobile'] as const) {
      const source = await port.readSource(sourceInfo(identity, pageId, device));
      const needs = await port.readNeeds(needsInfo(identity, pageId, device));
      if (!needs || await sha256Text(source) !== receipt.sourceHashes[device]
        || await sha256Text(JSON.stringify(needs)) !== receipt.needsHashes[device]) return false;
      // A page11 approved before a gate existed is checked again; refused means redone, not reused.
      if (d2Page11WriteDuplicates(buildD2Page11Needs(needs)).length) return false;
    }
    return true;
  } catch { return false; }
}

export interface D2PagesPromptPort {
  reusable(identity: { project: number; module: string }, pageId: string): Promise<boolean>;
  context(args: Args): Promise<D2PagesContext>;
}
const promptPort: D2PagesPromptPort = { reusable: reusableD2Page, context: contextFor };

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2PagesPromptPort): Promise<mls.msg.AgentIntent[]> {
  try {
    const port = typeof argsOrPort === 'object' ? argsOrPort : promptPort;
    const args = parseArgs(step.prompt || '');
    if (args.stage === 'groups' && await port.reusable(args, args.pageId)) {
      return [updateD2Status(context, parentStep, step, hookSequential, 'completed', `Page11 ${args.pageId} reused without an LLM call or write.`)];
    }
    const data = await port.context(args);
    const isGroups = args.stage === 'groups';
    const decision = isGroups ? null : buildD2PagesDecisionPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined);
    const humanPrompt = isGroups ? `${moleculeGroupPrompt(data.inventory, organismSources(data.page))}${args.diagnostic ? `\nRepair: ${JSON.stringify({ diagnostic: args.diagnostic, previous: args.previous })}` : ''}` : decision!.prompt;
    const systemPrompt = isGroups ? GROUPS_SYSTEM_PROMPT : `${data.prompt}\n${data.skill}`;
    if (systemPrompt.length + humanPrompt.length > D2_PAGES_PROMPT_LIMIT_CHARS) throw new Error(`D2_PAGE11_PROMPT_LIMIT: ${systemPrompt.length + humanPrompt.length}`);
    const name = isGroups ? 'submitD2MoleculeGroups' : 'submitD2Pages';
    const parameters = isGroups ? groupSchema : await readPageSchema();
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
  try {
    response = toolPayload(step.interaction?.payload?.[0], name);
    const data = await contextFor(args);
    if (args.stage === 'groups') {
      const result = parseD2MoleculeGroupJudgment(response, organismSources(data.page).map(item => item.id), data.inventory);
      const selectedGroups = result.selected;
      await readD2MoleculeShortlist(d2MoleculeCatalogPort, data.inventory, selectedGroups);
      const repairPromptChars = args.diagnostic ? GROUPS_SYSTEM_PROMPT.length + moleculeGroupPrompt(data.inventory, organismSources(data.page)).length + JSON.stringify({ diagnostic: args.diagnostic, previous: args.previous }).length + '\nRepair: '.length : 0;
      return [next(context, parentStep, { ...args, stage: 'decision', selectedGroups, groupAssessments: result.assessments, diagnostic: undefined, previous: undefined, repairPromptChars }),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `Molecule shortlist ready for ${args.pageId}.`)];
    }
    const decision = buildD2PagesDecisionPrompt(data, args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined);
    const promptChars = data.prompt.length + 1 + data.skill.length + decision.chars;
    const receipt = await approveD2PagesUnit(data, response as D2PagesResponse, promptChars, args.diagnostic ? promptChars : args.repairPromptChars ?? 0);
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
async function readPageSchema(): Promise<Record<string, unknown>> {
  const [page, needs] = await Promise.all([
    readJson<Record<string, unknown>>({ project: 102020, level: 2, folder: 'agentDefsL2/schemas', shortName: 'page11V2', extension: '.json' }),
    readJson<Record<string, unknown>>({ project: 102020, level: 2, folder: 'agentDefsL2/schemas', shortName: 'page11NeedsV1', extension: '.json' }),
  ]);
  if (!page || !needs) throw new Error('D2_PAGES_SCHEMA_MISSING');
  const { $schema: _pageDialect, $id: _pageId, ...pageShape } = page;
  const { $schema: _needsDialect, $id: _needsId, ...needsShape } = needs;
  const unit = { type: 'object', additionalProperties: false, required: ['definition', 'needs'], properties: { definition: pageShape, needs: needsShape } };
  return { type: 'object', additionalProperties: false, required: ['desktop', 'mobile', 'categoryReason'], properties: { desktop: unit, mobile: unit, categoryReason: { type: 'string' } } };
}
