/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/agentGenomeUxPage.ts" enhancement="_blank"/>

// Page worker of agentGenomeUx: one page of UX N, both devices.
//   groups   (LLM) relevant molecule groups per organism, forbidden groups not offered      → decision
//   decision (LLM) molecules per organism for desktop and mobile in one answer, gated by the
//                  chosen groups and the template's forbid; one repair, then the refused tags are dropped
//   write          page{N}1 desktop + mobile defs (read back with parseL2Page11) and the receipt; base mode (UX 1):
//                  page11 itself, same template swap and molecules, intent/sections/organisms unchanged
// No LLM at all when the UX does not use molecules, or when no allowed group/tag is left: the variant is written
// without molecules (or with none for the organisms that have no allowed molecule).

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { addD2Step, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { readD2MoleculeShortlist, type D2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { d2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';
import { parseD2MoleculeGroupJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import { d2LlmModelOf, d2LlmResponseInfo, recordD2LlmResponse, recordD2LlmVerdict, type D2LlmResponseRecord } from '/_102020_/l2/helpers/llmResponses.js';
import { GENOME_UX_DEVICES, GENOME_UX_FOLDER, GENOME_UX_PAGE_AGENT_NAME, genomeUxResponsesFolder, type GenomeUxDevice } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import { gateGenomeUxMolecules, sanitizeGenomeUxMolecules, type GenomeUxMolecules } from '/_102020_/l2/aura/agentGenomeUx/genomeUxVariant.js';
import {
  GENOME_UX_DECISION_SYSTEM_PROMPT, GENOME_UX_DECISION_TOOL, GENOME_UX_GROUPS_SYSTEM_PROMPT, GENOME_UX_GROUPS_TOOL,
  genomeUxAllowedInventory, genomeUxAllowedSelection, genomeUxDecisionMolecules, genomeUxDecisionPrompt, genomeUxDecisionSchema,
  genomeUxDecisionTags, genomeUxGroupsPrompt, genomeUxGroupsSchema, genomeUxOrganismSources, genomeUxToolPayload, type GenomeUxTemplatePrompt,
} from '/_102020_/l2/aura/agentGenomeUx/genomeUxPrompts.js';
import { loadGenomeUxPageContext, readGenomeUxInventory, type GenomeUxPageContext } from '/_102020_/l2/aura/agentGenomeUx/genomeUxIo.js';
import { finalizeGenomeUxPage, genomeUxCompletionSteps, genomeUxPageStep, genomeUxRunFresh, parseGenomeUxPageArgs, type GenomeUxFinalizeMeta, type GenomeUxPageArgs } from '/_102020_/l2/aura/agentGenomeUx/genomeUxRun.js';

export function createAgent(): IAgentAsync {
  return { agentName: GENOME_UX_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: GENOME_UX_FOLDER, agentDescription: 'Choose the molecules of one page for a genome UX template and write its page{N}1 pair', visibility: 'private', beforePromptStep, afterPromptStep };
}

/** Only answers the model can correct get the one repair; input, catalog and render failures end the page. */
const REPAIRABLE = ['GENOME_UX_RESPONSE', 'GENOME_UX_TOOL', 'GENOME_UX_MOLECULE', 'D2_MOLECULE_GROUP_RESPONSE', 'D2_MOLECULE_ROLE_UNSELECTED'];
function repairable(diagnostic: string): boolean { return REPAIRABLE.some(code => diagnostic.startsWith(code)); }

function forbidOf(context: GenomeUxPageContext): string[] { return context.template.rules.kind === 'rules' ? context.template.rules.rules.forbid : []; }
function templatePrompt(context: GenomeUxPageContext): GenomeUxTemplatePrompt {
  return { path: context.template.path, experience: context.template.experience, text: context.template.text ?? '', rules: context.template.rules.kind === 'rules' ? context.template.rules.rules : null };
}
function page11Of(context: GenomeUxPageContext) { return { desktop: context.page11.desktop.definition, mobile: context.page11.mobile.definition }; }
function emptyMolecules(): Record<GenomeUxDevice, GenomeUxMolecules> { return { desktop: {}, mobile: {} }; }

/** Writes the page, then closes the run when every page of it is fresh. */
async function finish(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number,
  args: GenomeUxPageArgs, page: GenomeUxPageContext, molecules: Record<GenomeUxDevice, GenomeUxMolecules> | null, meta: GenomeUxFinalizeMeta, note: string): Promise<mls.msg.AgentIntent[]> {
  const receipt = await finalizeGenomeUxPage(page, molecules, meta);
  const message = `${page.genome}/${args.pageId} written (${page.template.experience}; ${note}${receipt.dropped.length ? `; dropped ${receipt.dropped.join(', ')}` : ''}).`;
  if (await genomeUxRunFresh(args, page.layoutEntry)) {
    return [...genomeUxCompletionSteps(args).map(item => addD2Step(context, parentStep.stepId, item)),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `${message} All ${args.runPages.length} page(s) of ${page.genome} are ready.`)];
  }
  return [updateD2Status(context, parentStep, step, hookSequential, 'completed', message)];
}

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, rawArgs?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseGenomeUxPageArgs(rawArgs || step.prompt || '');
    const page = await loadGenomeUxPageContext(args.project, args.module, args.layout, args.pageId);
    if (!page.useMolecules) {
      return finish(context, parentStep, step, hookSequential, args, page, null, { catalogHash: null, moleculeHashes: {}, selectedGroups: {}, dropped: [] }, 'useMolecules is off: no molecules');
    }
    const forbid = forbidOf(page);
    const inventory = await readGenomeUxInventory(args.project);
    const allowed = genomeUxAllowedInventory(inventory, forbid);
    const repair = args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous } : undefined;
    if (args.stage === 'groups') {
      if (!allowed.groups.length) return finish(context, parentStep, step, hookSequential, args, page, emptyMolecules(), { catalogHash: inventory.sourceHash, moleculeHashes: {}, selectedGroups: {}, dropped: [] }, 'no allowed molecule group');
      const humanPrompt = genomeUxGroupsPrompt(allowed, genomeUxOrganismSources(page11Of(page)), templatePrompt(page), page.pageData.data, repair);
      return [promptReady(context, parentStep, step, hookSequential, GENOME_UX_GROUPS_SYSTEM_PROMPT, humanPrompt, GENOME_UX_GROUPS_TOOL, 'Select molecule catalog groups for each organism', genomeUxGroupsSchema)];
    }
    const selected = genomeUxAllowedSelection(args.selectedGroups ?? {}, forbid);
    const shortlist = await readD2MoleculeShortlist(d2MoleculeCatalogPort, inventory, selected);
    const tags = genomeUxDecisionTags(selected, shortlist.groups, forbid);
    if (!tags.length) return finish(context, parentStep, step, hookSequential, args, page, emptyMolecules(), { catalogHash: inventory.sourceHash, moleculeHashes: shortlist.hashes, selectedGroups: selected, dropped: [] }, 'no allowed molecule for any organism');
    const humanPrompt = genomeUxDecisionPrompt({ pageId: args.pageId, page11: page11Of(page), template: templatePrompt(page), pageData: page.pageData.data, selected, groups: shortlist.groups, repair });
    const organismIds = genomeUxOrganismSources(page11Of(page)).map(item => item.id);
    return [promptReady(context, parentStep, step, hookSequential, GENOME_UX_DECISION_SYSTEM_PROMPT, humanPrompt, GENOME_UX_DECISION_TOOL, 'Choose desktop and mobile molecules per organism for the UX template', genomeUxDecisionSchema(organismIds, tags))];
  } catch (error) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

export async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let args: GenomeUxPageArgs;
  try { args = parseGenomeUxPageArgs(step.prompt || ''); }
  catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
  let response: unknown;
  let recorded: { info: ReturnType<typeof d2LlmResponseInfo>; record: D2LlmResponseRecord } | undefined;
  try {
    const page = await loadGenomeUxPageContext(args.project, args.module, args.layout, args.pageId);
    const attempt = `${args.stage}-${args.attempt}`;
    const info = d2LlmResponseInfo(args.project, genomeUxResponsesFolder(args.module, page.genome), args.pageId, attempt);
    recorded = { info, record: await recordD2LlmResponse(info, { attempt, model: d2LlmModelOf(step), promptChars: 0, receivedAt: new Date().toISOString(), raw: step.interaction?.payload?.[0] ?? null }) };
    const forbid = forbidOf(page);
    const inventory: D2MoleculeInventory = await readGenomeUxInventory(args.project);
    if (args.stage === 'groups') {
      response = genomeUxToolPayload(step.interaction?.payload?.[0], GENOME_UX_GROUPS_TOOL);
      const organismIds = genomeUxOrganismSources(page11Of(page)).map(item => item.id);
      const result = parseD2MoleculeGroupJudgment(response, organismIds, genomeUxAllowedInventory(inventory, forbid));
      await recordD2LlmVerdict(recorded.info, recorded.record, 'accepted');
      return [addD2Step(context, parentStep.stepId, genomeUxPageStep({ ...args, stage: 'decision', attempt: 1, selectedGroups: result.selected, diagnostic: undefined, previous: undefined })),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `Molecule groups chosen for ${args.pageId}.`)];
    }
    response = genomeUxToolPayload(step.interaction?.payload?.[0], GENOME_UX_DECISION_TOOL);
    const molecules = genomeUxDecisionMolecules(response);
    const selected = genomeUxAllowedSelection(args.selectedGroups ?? {}, forbid);
    const shortlist = await readD2MoleculeShortlist(d2MoleculeCatalogPort, inventory, selected);
    const gateInput = (device: GenomeUxDevice) => ({ organismIds: Object.keys(page.page11[device].definition.organisms), selected, groups: shortlist.groups, forbid });
    const errors = GENOME_UX_DEVICES.flatMap(device => gateGenomeUxMolecules(molecules[device], gateInput(device)).map(message => `${device}: ${message}`));
    let final = molecules;
    const dropped: string[] = [];
    if (errors.length) {
      // GENOME_UX_MOLECULE…: the first refusal gets one repair; the second never writes a refused tag.
      if (args.attempt === 1) throw new Error(`GENOME_UX_MOLECULE_GATE: ${errors.join(' | ')}`);
      final = emptyMolecules();
      for (const device of GENOME_UX_DEVICES) {
        const clean = sanitizeGenomeUxMolecules(molecules[device], gateInput(device));
        final[device] = clean.molecules;
        dropped.push(...clean.dropped.map(item => `${device}:${item}`));
      }
    }
    await recordD2LlmVerdict(recorded.info, recorded.record, errors.length ? `accepted after dropping: ${errors.join(' | ')}` : 'accepted');
    return finish(context, parentStep, step, hookSequential, args, page, final, { catalogHash: inventory.sourceHash, moleculeHashes: shortlist.hashes, selectedGroups: selected, dropped }, `${args.stage} ${args.attempt}`);
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    if (recorded) { try { await recordD2LlmVerdict(recorded.info, recorded.record, diagnostic); } catch { /* the step status carries it */ } }
    if (args.attempt === 1 && repairable(diagnostic)) {
      return [addD2Step(context, parentStep.stepId, genomeUxPageStep({ ...args, attempt: 2, diagnostic, previous: response })),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `One repair scheduled for ${args.pageId}: ${diagnostic}`)];
    }
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `GENOME_UX_PAGE_FAILED ${args.pageId}: ${diagnostic}`)];
  }
}

function promptReady(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number,
  systemPrompt: string, humanPrompt: string, name: string, description: string, parameters: Record<string, unknown>): mls.msg.AgentIntent {
  return { type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt, humanPrompt,
    tools: [{ type: 'function', function: { name, description, parameters } }],
    toolChoice: { type: 'function', function: { name } } };
}
