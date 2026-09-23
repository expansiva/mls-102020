/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages-page/agentD2PagesPage.ts" enhancement="_blank"/>
import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readJson, readSourceText } from '/_102035_/l2/solution/fs.js';
import { D2_PAGES_PAGE_AGENT_NAME, markD2StepApproved, markD2StepFailed, moduleTokenOk } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { buildD2MoleculeCandidateContext, buildD2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { d2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';
import { buildD2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { d2PageSkillPort } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryCatalog.js';
import { parseD2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/gate.js';
import { approveD2PagesUnit, finalizeD2PagesBarrier, getD2PagesContext } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

interface Args { project: number; module: string; pageId: string; attempt: number; feedback?: string; previous?: unknown; }
export function createAgent(): IAgentAsync { return { agentName: D2_PAGES_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/pages-page', agentDescription: 'Describe desktop and mobile presentations for one page with one bounded repair', visibility: 'private', beforePromptStep, afterPromptStep }; }

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const rawArgs = args || step.prompt || '';
    const parsed = parseArgs(rawArgs); const identity = { project: parsed.project, module: parsed.module };
    const snapshot = await readD2Input(identity); if (!snapshot) throw new Error('D2_PAGES_INPUT_MISSING');
    const bundle = await readD2InputBundle(identity); await assertD2InputSourcesStable(bundle);
    const [{ page, shared }, inventory, pageSkills, prompt, schema] = await Promise.all([
      getD2PagesContext(identity, snapshot, parsed.pageId), buildD2MoleculeInventory(d2MoleculeCatalogPort),
      buildD2PageSkillsContext(d2PageSkillPort),
      readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/steps/pages50', shortName: 'prompt', extension: '.md' }),
      readJson<Record<string, unknown>>({ project: 102020, level: 2, folder: 'agentDefsL2/schemas', shortName: 'pagesJudgmentV2', extension: '.json' }),
    ]);
    if (!schema) throw new Error('D2_PAGES_SCHEMA_MISSING');
    const moleculeCandidates = await buildD2MoleculeCandidateContext(d2MoleculeCatalogPort, inventory);
    const journeys = page.journeyRefs.map(id => bundle.artifacts.journeys[id]).filter(Boolean);
    const humanPrompt = JSON.stringify({ page: { pageId: page.pageId, label: page.label, actors: page.actors, ancestors: page.ancestors, authorityRefs: page.authorityRefs, journeys, relevantRules: relevantRules(bundle.artifacts.rules, [...page.authorityRefs, ...page.journeyRefs, page.pageId]), organismIntent: page.organisms, reads: page.reads, writes: page.writes }, shared, pageCategoryCatalog: JSON.parse(pageSkills.context), moleculeInventory: JSON.parse(inventory.context), moleculeCandidates: JSON.parse(moleculeCandidates.context), repair: parsed.feedback ? { feedback: parsed.feedback, previous: parsed.previous } : null }, null, 2);
    const tool: mls.msg.LLMTool = { type: 'function', function: { name: 'submitD2Pages', description: 'Submit desktop and mobile prose plus structured capability/group references.', parameters: schema } };
    return [{ type: 'prompt_ready', args: rawArgs, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt: prompt, humanPrompt, tools: [tool], toolChoice: { type: 'function', function: { name: tool.function.name } } }];
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
}

export async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseArgs(step.prompt || ''); const identity = { project: parsed.project, module: parsed.module };
  try {
    const judgment = parseD2PagesJudgment(unwrapD2PagesToolPayload(step.interaction?.payload?.[0]));
    const snapshot = await readD2Input(identity); if (!snapshot) throw new Error('D2_PAGES_INPUT_MISSING');
    const bundle = await readD2InputBundle(identity); await assertD2InputSourcesStable(bundle); const verify = () => assertD2InputSourcesStable(bundle);
    const [inventory, pageSkills] = await Promise.all([buildD2MoleculeInventory(d2MoleculeCatalogPort), buildD2PageSkillsContext(d2PageSkillPort)]);
    await approveD2PagesUnit(identity, snapshot, parsed.pageId, judgment, inventory, d2MoleculeCatalogPort, pageSkills, parsed.attempt, verify);
    const manifest = await finalizeD2PagesBarrier(identity, snapshot, verify, pageSkills); const intents: mls.msg.AgentIntent[] = [];
    if (manifest) { await markD2StepApproved(identity, 'pages50', manifest.units.flatMap(unit => Object.values(unit.artifactPaths)), snapshot.snapshotHash); intents.push(addD2Step(context, parentStep.stepId, d2Result('Pages ready', JSON.stringify({ ...identity, completedStep: 'pages50', nextStep: 'finalize60', pages: manifest.units.length, defs: manifest.units.length * 2 }), 'pages50-done'))); }
    intents.push(updateD2Status(context, parentStep, step, hookSequential, 'completed', `pages50 ${parsed.pageId} approved (${manifest ? 'barrier complete' : 'waiting siblings'}).`)); return intents;
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    if (parsed.attempt < 2) { const repair: Args = { ...parsed, attempt: 2, feedback: diagnostic, previous: unwrapD2PagesToolPayload(step.interaction?.payload?.[0]) }; return [addD2Step(context, parentStep.stepId, { type: 'agent', stepId: 0, interaction: null, stepTitle: `Repair pages ${parsed.pageId}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_PAGES_PAGE_AGENT_NAME, prompt: JSON.stringify(repair), rags: [], planning: { planId: `pages50-repair-${parsed.pageId}-a2`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep), updateD2Status(context, parentStep, step, hookSequential, 'completed', `pages50 ${parsed.pageId} scheduled its only repair: ${diagnostic}`)]; }
    await markD2StepFailed(identity, 'pages50', `D2_PAGES_REPAIR_LIMIT ${parsed.pageId}: ${diagnostic}`); return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `D2_PAGES_REPAIR_LIMIT ${parsed.pageId}: ${diagnostic}`)];
  }
}
function parseArgs(value: unknown): Args { let raw: unknown; try { raw = JSON.parse(String(value)); } catch { throw new Error('D2_PAGES_ARGS_INVALID'); } const item = record(raw); const parsed: Args = { project: Number(item.project), module: text(item.module), pageId: text(item.pageId), attempt: Number(item.attempt), feedback: text(item.feedback), previous: item.previous }; if (!Number.isSafeInteger(parsed.project) || parsed.project !== Number(mls.actualProject || 0) || !moduleTokenOk(parsed.module) || !/^[a-z][A-Za-z0-9_-]*$/.test(parsed.pageId) || ![1, 2].includes(parsed.attempt)) throw new Error('D2_PAGES_ARGS_INVALID'); return parsed; }
export function unwrapD2PagesToolPayload(value: unknown): unknown {
  const root = record(value);
  if (root.type === 'flexible') {
    const result = record(root.result);
    if (text(result.toolName) !== 'submitD2Pages') throw new Error('D2_PAGES_TOOL_MISMATCH');
    if (!Object.prototype.hasOwnProperty.call(result, 'arguments')) throw new Error('D2_PAGES_SCHEMA_TRUNCATED');
    return parseCandidate(result.arguments);
  }
  return parseCandidate(root.arguments ?? root.payload ?? root);
}
function parseCandidate(candidate: unknown): unknown { if (typeof candidate !== 'string') return candidate; try { return JSON.parse(candidate); } catch { throw new Error('D2_PAGES_SCHEMA_TRUNCATED'); } }
function relevantRules(value: unknown, refs: string[]): unknown[] { const rules = Array.isArray(record(value).rules) ? record(value).rules as unknown[] : []; const needles = refs.filter(Boolean); return rules.filter(rule => { const source = JSON.stringify(rule); return needles.some(ref => source.includes(ref)); }); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
