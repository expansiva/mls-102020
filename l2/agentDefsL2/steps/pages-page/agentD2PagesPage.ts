/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages-page/agentD2PagesPage.ts" enhancement="_blank"/>
import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readJson, readSourceText } from '/_102035_/l2/solution/fs.js';
import { D2_PAGES_PAGE_AGENT_NAME, markD2StepApproved, markD2StepFailed, moduleTokenOk } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { buildD2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { d2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';
import { buildD2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { d2PageSkillPort, d2TemplatePort } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryCatalog.js';
import { parseD2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/gate.js';
import { approveD2PagesUnit, buildD2PageMoleculeNeeds, finalizeD2PagesBarrier, getD2PagesContext } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { deriveD2PageOrganisms, resolveD2PageScenarioState, resolveD2PageScenarioSurfaces } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { buildD2MoleculeResearchQuery, buildD2MoleculeShortlist, buildD2MoleculeShortlistContext, resolveD2MoleculeResearch, d2MoleculeInventoryHash, type D2MoleculeGroupJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';

interface Args { project: number; module: string; pageId: string; attempt: number; moleculeContextHash: string; stage: 'groups' | 'pages'; researchJudgments?: Array<{ needId: string; groups: D2MoleculeGroupJudgment[] }>; feedback?: string; previous?: unknown; }
export const D2_PAGES_DECISION_PROMPT_MAX_CHARS = 160_000;
export function createAgent(): IAgentAsync { return { agentName: D2_PAGES_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/pages-page', agentDescription: 'Describe desktop and mobile presentations for one page with one bounded repair', visibility: 'private', beforePromptStep, afterPromptStep }; }

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  let identity: { project: number; module: string } | null = null;
  try {
    const rawArgs = args || step.prompt || '';
    const parsed = parseArgs(rawArgs); identity = { project: parsed.project, module: parsed.module };
    const snapshot = await readD2Input(identity); if (!snapshot) throw new Error('D2_PAGES_INPUT_MISSING');
    const bundle = await readD2InputBundle(identity); await assertD2InputSourcesStable(bundle);
    const [{ page, shared, definition }, inventory, pageSkills, prompt, schema, groupPrompt, groupSchema] = await Promise.all([
      getD2PagesContext(identity, snapshot, parsed.pageId), buildD2MoleculeInventory(d2MoleculeCatalogPort),
      buildD2PageSkillsContext(d2PageSkillPort),
      readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/steps/pages50', shortName: 'prompt', extension: '.md' }),
      readJson<Record<string, unknown>>({ project: 102020, level: 2, folder: 'agentDefsL2/schemas', shortName: 'pagesJudgmentV4', extension: '.json' }),
      readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/steps/pages50', shortName: 'moleculeGroupsPrompt', extension: '.md' }),
      readJson<Record<string, unknown>>({ project: 102020, level: 2, folder: 'agentDefsL2/schemas', shortName: 'moleculeGroupsV1', extension: '.json' }),
    ]);
    if (!schema || !groupSchema || !groupPrompt) throw new Error('D2_PAGES_SCHEMA_MISSING');
    if (await d2MoleculeInventoryHash(inventory) !== parsed.moleculeContextHash) throw new Error(`D2_MOLECULE_CONTEXT_CHANGED: ${parsed.pageId}`);
    const needs = buildD2PageMoleculeNeeds(parsed.pageId, page, definition);
    const shortlist = parsed.stage === 'pages'
      ? await buildD2MoleculeShortlist(d2MoleculeCatalogPort, inventory, needs, parsed.researchJudgments || [])
      : null;
    const journeys = page.journeyRefs.map(id => bundle.artifacts.journeys[id]).filter(Boolean);
    const templateCatalog = await d2TemplatePort.discover();
    const templateGuidance = { targetPage: 'page11', orientationPage: 'page21', sources: templateCatalog, precedence: 'Shared, DTOs, L4 rules and grants prevail. The selected Markdown reference and hash will be derived from the chosen category; no implicit style preference.' };
    const pageInput = { page: { pageId: page.pageId, label: page.label, userLanguage: text(record(bundle.artifacts.menu).userLanguage) || 'en', actors: page.actors, ancestors: page.ancestors, authorityRefs: page.authorityRefs, journeys, relevantRules: relevantRules(bundle.artifacts.rules, [...page.authorityRefs, ...page.journeyRefs, page.pageId]), operations: page.operationBindings || [], organisms: deriveD2PageOrganisms(page), reads: page.reads, writes: page.writes }, shared, sceneSurface: { state: resolveD2PageScenarioState(shared), scenaries: resolveD2PageScenarioSurfaces(shared) }, pageCategoryCatalog: JSON.parse(pageSkills.context), repair: parsed.feedback ? { feedback: parsed.feedback, previous: parsed.previous } : null };
    const isGroups = parsed.stage === 'groups';
    const moleculeContext = isGroups
      ? buildD2MoleculeResearchQuery(inventory, needs)
      : buildD2MoleculeShortlistContext(shortlist!);
    const humanPrompt = isGroups
      ? JSON.stringify({ page: pageInput.page, moleculeResearchQuery: JSON.parse(moleculeContext) }, null, 2)
      : JSON.stringify({ ...pageInput, moleculeShortlist: JSON.parse(moleculeContext), groupAssessments: parsed.researchJudgments }, null, 2);
    const toolName = isGroups ? 'submitD2MoleculeGroups' : 'submitD2Pages';
    const tool: mls.msg.LLMTool = { type: 'function', function: { name: toolName, description: isGroups ? 'Assess every catalog group for every semantic page need.' : 'Submit page intent, presentations and researched molecule roles.', parameters: isGroups ? groupSchema : schema } };
    const boundedPrompt = isGroups ? humanPrompt : `${humanPrompt}\n\n${JSON.stringify({ templateGuidance })}`;
    if (!isGroups) assertD2PagesDecisionPromptLimit(boundedPrompt);
    return [{ type: 'prompt_ready', args: rawArgs, messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt: isGroups ? groupPrompt : prompt, humanPrompt: boundedPrompt, tools: [tool], toolChoice: { type: 'function', function: { name: tool.function.name } } }];
  } catch (error) { const diagnostic = error instanceof Error ? error.message : String(error); if (identity) await markD2StepFailed(identity, 'pages50', diagnostic); return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)]; }
}

export function assertD2PagesDecisionPromptLimit(prompt: string): void {
  if (prompt.length > D2_PAGES_DECISION_PROMPT_MAX_CHARS) throw new Error(`D2_PAGES_DECISION_PROMPT_LIMIT: ${prompt.length} > ${D2_PAGES_DECISION_PROMPT_MAX_CHARS}`);
}

export async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseArgs(step.prompt || ''); const identity = { project: parsed.project, module: parsed.module };
  try {
    const rawJudgment = unwrapD2PagesToolPayload(step.interaction?.payload?.[0], parsed.stage === 'groups' ? 'submitD2MoleculeGroups' : 'submitD2Pages');
    const snapshot = await readD2Input(identity); if (!snapshot) throw new Error('D2_PAGES_INPUT_MISSING');
    const bundle = await readD2InputBundle(identity); await assertD2InputSourcesStable(bundle); const verify = () => assertD2InputSourcesStable(bundle);
    if (parsed.stage === 'groups') {
      const groupJudgments = parseD2MoleculeGroupJudgments(rawJudgment, parsed.pageId);
      const [{ page, definition }, inventory] = await Promise.all([getD2PagesContext(identity, snapshot, parsed.pageId), buildD2MoleculeInventory(d2MoleculeCatalogPort)]);
      const needs = buildD2PageMoleculeNeeds(parsed.pageId, page, definition);
      await buildD2MoleculeShortlist(d2MoleculeCatalogPort, inventory, needs, groupJudgments);
      const next: Args = { ...parsed, stage: 'pages', researchJudgments: groupJudgments };
      return [addD2Step(context, parentStep.stepId, { type: 'agent', stepId: 0, interaction: null, stepTitle: `Describe pages ${parsed.pageId}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_PAGES_PAGE_AGENT_NAME, prompt: JSON.stringify(next), rags: [], planning: { planId: `pages50-final-${parsed.pageId}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep), updateD2Status(context, parentStep, step, hookSequential, 'completed', `pages50 ${parsed.pageId} molecule shortlist is ready.`)];
    }
    const judgment = parseD2PagesJudgment(rawJudgment);
    const [pageSkills, inventory, pageContext] = await Promise.all([buildD2PageSkillsContext(d2PageSkillPort), buildD2MoleculeInventory(d2MoleculeCatalogPort), getD2PagesContext(identity, snapshot, parsed.pageId)]);
    if (await d2MoleculeInventoryHash(inventory) !== parsed.moleculeContextHash) throw new Error(`D2_MOLECULE_CONTEXT_CHANGED: ${parsed.pageId}`);
    const needs = buildD2PageMoleculeNeeds(parsed.pageId, pageContext.page, pageContext.definition);
    const shortlist = await buildD2MoleculeShortlist(d2MoleculeCatalogPort, inventory, needs, parsed.researchJudgments || []);
    const research = await resolveD2MoleculeResearch(shortlist, judgment.moleculeResearch);
    const molecular = { port: d2MoleculeCatalogPort };
    await approveD2PagesUnit(identity, snapshot, parsed.pageId, judgment, research, molecular, pageSkills, parsed.attempt, verify, parsed.moleculeContextHash);
    const manifest = await finalizeD2PagesBarrier(identity, snapshot, verify, pageSkills, molecular); const intents: mls.msg.AgentIntent[] = [];
    if (manifest) { await markD2StepApproved(identity, 'pages50', manifest.units.flatMap(unit => Object.values(unit.artifactPaths)), snapshot.snapshotHash); intents.push(addD2Step(context, parentStep.stepId, d2Result('Pages ready', JSON.stringify({ ...identity, completedStep: 'pages50', nextStep: 'finalize60', pages: manifest.units.length, defs: manifest.units.length * 2 }), 'pages50-done'))); }
    intents.push(updateD2Status(context, parentStep, step, hookSequential, 'completed', `pages50 ${parsed.pageId} approved (${manifest ? 'barrier complete' : 'waiting siblings'}).`)); return intents;
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    const repair = parsed.attempt < 2 ? pagesRepairArgs(parsed, diagnostic, unwrapD2PagesToolPayload(step.interaction?.payload?.[0], parsed.stage === 'groups' ? 'submitD2MoleculeGroups' : 'submitD2Pages')) : null;
    if (repair) { return [addD2Step(context, parentStep.stepId, { type: 'agent', stepId: 0, interaction: null, stepTitle: `Repair pages ${parsed.pageId}`, status: 'waiting_human_input', nextSteps: [], agentName: D2_PAGES_PAGE_AGENT_NAME, prompt: JSON.stringify(repair), rags: [], planning: { planId: `pages50-repair-${parsed.pageId}-a2`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' } } as mls.msg.AIAgentStep), updateD2Status(context, parentStep, step, hookSequential, 'completed', `pages50 ${parsed.pageId} scheduled its only repair: ${diagnostic}`)]; }
    await markD2StepFailed(identity, 'pages50', `D2_PAGES_REPAIR_LIMIT ${parsed.pageId}: ${diagnostic}`); return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `D2_PAGES_REPAIR_LIMIT ${parsed.pageId}: ${diagnostic}`)];
  }
}
export function pagesRepairArgs(args: Args, diagnostic: string, previous: unknown): Args | null {
  return args.attempt < 2 ? { ...args, attempt: 2, feedback: diagnostic, previous } : null;
}
function parseArgs(value: unknown): Args { let raw: unknown; try { raw = JSON.parse(String(value)); } catch { throw new Error('D2_PAGES_ARGS_INVALID'); } const item = record(raw); const parsed: Args = { project: Number(item.project), module: text(item.module), pageId: text(item.pageId), attempt: Number(item.attempt), moleculeContextHash: text(item.moleculeContextHash), stage: item.stage === 'groups' || item.stage === 'pages' ? item.stage : '' as Args['stage'], researchJudgments: Array.isArray(item.researchJudgments) ? item.researchJudgments as Args['researchJudgments'] : undefined, feedback: text(item.feedback), previous: item.previous }; if (!Number.isSafeInteger(parsed.project) || parsed.project !== Number(mls.actualProject || 0) || !moduleTokenOk(parsed.module) || !/^[a-z][A-Za-z0-9_-]*$/.test(parsed.pageId) || ![1, 2].includes(parsed.attempt) || !/^sha256:[a-f0-9]{64}$/u.test(parsed.moleculeContextHash) || !parsed.stage || (parsed.stage === 'pages' && !parsed.researchJudgments?.length)) throw new Error('D2_PAGES_ARGS_INVALID'); return parsed; }
export function parseD2MoleculeGroupJudgments(value: unknown, pageId: string): NonNullable<Args['researchJudgments']> {
  const root = record(value);
  if (Object.keys(root).some(key => !['schemaVersion', 'pageId', 'moleculeResearch'].includes(key)) || root.schemaVersion !== '2026-09-29-d2-molecule-groups-v1' || root.pageId !== pageId || !Array.isArray(root.moleculeResearch) || !root.moleculeResearch.length) throw new Error('D2_MOLECULE_GROUP_JUDGMENT_SCHEMA');
  return root.moleculeResearch.map(rawNeed => {
    const need = record(rawNeed);
    if (Object.keys(need).some(key => !['needId', 'groups'].includes(key)) || typeof need.needId !== 'string' || !Array.isArray(need.groups)) throw new Error('D2_MOLECULE_GROUP_JUDGMENT_SCHEMA');
    const groups = need.groups.map(rawGroup => {
      const group = record(rawGroup);
      if (Object.keys(group).some(key => !['groupId', 'relevant', 'reason'].includes(key)) || typeof group.groupId !== 'string' || typeof group.relevant !== 'boolean' || typeof group.reason !== 'string') throw new Error('D2_MOLECULE_GROUP_JUDGMENT_SCHEMA');
      return { groupId: group.groupId, relevant: group.relevant, reason: group.reason };
    });
    return { needId: need.needId, groups };
  });
}
export function unwrapD2PagesToolPayload(value: unknown, expectedToolName = 'submitD2Pages'): unknown {
  const root = record(value);
  if (root.type === 'flexible') {
    const result = record(root.result);
    if (text(result.toolName) !== expectedToolName) throw new Error('D2_PAGES_TOOL_MISMATCH');
    if (!Object.prototype.hasOwnProperty.call(result, 'arguments')) throw new Error('D2_PAGES_SCHEMA_TRUNCATED');
    return parseCandidate(result.arguments);
  }
  return parseCandidate(root.arguments ?? root.payload ?? root);
}
function parseCandidate(candidate: unknown): unknown { if (typeof candidate !== 'string') return candidate; try { return JSON.parse(candidate); } catch { throw new Error('D2_PAGES_SCHEMA_TRUNCATED'); } }
function relevantRules(value: unknown, refs: string[]): unknown[] { const source = record(record(value).rules); const needles = new Set(refs.filter(Boolean)); if (Array.isArray(source)) return source.filter(item => needles.has(text(record(item).ruleId))); return Object.entries(source).filter(([id]) => needles.has(id)).map(([ruleId, description]) => ({ ruleId, description })); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
