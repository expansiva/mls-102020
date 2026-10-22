/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxRun.ts" enhancement="_blank"/>

/**
 * The run plumbing shared by the dispatch and page steps of agentGenomeUx: the step args, writing a finished page
 * (both variant defs + receipt) and the end of the run (done anchor + optional agentMaterializeL2 step).
 */

import type { L2Page11Definition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { d2Result } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import type { IUxLayout } from '/_102020_/l2/aura/helpers/uxTemplates.js';
import { GENOME_UX_DEVICES, GENOME_UX_DONE_PLAN_ID, GENOME_UX_MATERIALIZE_PLAN_ID, GENOME_UX_PAGE_AGENT_NAME, genomeUxGenome, type GenomeUxDevice } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import { buildGenomeUxVariant, renderGenomeUxDefs, type GenomeUxMolecules } from '/_102020_/l2/aura/agentGenomeUx/genomeUxVariant.js';
import { buildGenomeUxReceipt, type GenomeUxReceipt } from '/_102020_/l2/aura/agentGenomeUx/genomeUxReceipt.js';
import { readGenomeUxPageStatus, writeGenomeUxPage, type GenomeUxPageContext } from '/_102020_/l2/aura/agentGenomeUx/genomeUxIo.js';

/** What every step of a run carries: the run identity and the pages it covers (for the done check). */
export interface GenomeUxRunArgs {
  project: number;
  module: string;
  layout: number;
  /** The pages of this run (all page11 pages, or the requested subset). */
  runPages: string[];
  /** true when the entry named the pages: the materialize step is limited to them. */
  subset: boolean;
  materialize: boolean;
}

export interface GenomeUxPageArgs extends GenomeUxRunArgs {
  pageId: string;
  stage: 'groups' | 'decision';
  attempt: 1 | 2;
  selectedGroups?: Record<string, string[]>;
  diagnostic?: string;
  previous?: unknown;
}

const PAGE_ID = /^[a-z][A-Za-z0-9_]{0,59}$/u;
const MODULE = /^[a-z][A-Za-z0-9]{0,59}$/u;

export function parseGenomeUxPageArgs(raw: string): GenomeUxPageArgs {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('GENOME_UX_ARGS_INVALID'); }
  const args = value as GenomeUxPageArgs;
  if (!args || typeof args !== 'object' || !Number.isSafeInteger(args.project) || args.project <= 0 || !MODULE.test(String(args.module))
    || !Number.isInteger(args.layout) || args.layout < 2 || args.layout > 9 || !PAGE_ID.test(String(args.pageId))
    || !Array.isArray(args.runPages) || !['groups', 'decision'].includes(args.stage) || ![1, 2].includes(args.attempt)) throw new Error('GENOME_UX_ARGS_INVALID');
  if (args.stage === 'decision' && !args.selectedGroups) throw new Error('GENOME_UX_GROUPS_MISSING');
  return args;
}

/** The worker step of one page (or its next stage / repair). */
export function genomeUxPageStep(args: GenomeUxPageArgs): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, stepTitle: `UX ${args.layout} ${args.pageId} ${args.stage}${args.attempt === 2 ? ' (repair)' : ''}`,
    status: 'waiting_human_input', nextSteps: [], agentName: GENOME_UX_PAGE_AGENT_NAME, prompt: JSON.stringify(args), rags: [],
    planning: { planId: `genomeUx-${args.pageId}-${args.stage}-${args.attempt}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

export interface GenomeUxFinalizeMeta {
  catalogHash: string | null;
  moleculeHashes: Record<string, string>;
  selectedGroups: Record<string, string[]>;
  dropped: string[];
}

/**
 * Builds, validates and writes both variant defs and then the receipt. `molecules` null → no `molecules` key
 * (useMolecules false). Nothing is written unless both devices render and read back in the page11 grammar.
 */
export async function finalizeGenomeUxPage(context: GenomeUxPageContext, molecules: Record<GenomeUxDevice, GenomeUxMolecules> | null, meta: GenomeUxFinalizeMeta): Promise<GenomeUxReceipt> {
  const template = { category: context.template.path, experience: context.template.experience };
  const variants = {} as Record<GenomeUxDevice, string>;
  for (const device of GENOME_UX_DEVICES) {
    const page11: L2Page11Definition = context.page11[device].definition;
    const definition = buildGenomeUxVariant(page11, template, molecules ? molecules[device] : null);
    variants[device] = renderGenomeUxDefs({ project: context.project, module: context.module, pageId: context.pageId, device, genome: context.genome }, definition, page11);
  }
  const receipt = await buildGenomeUxReceipt({
    project: context.project, module: context.module, layout: context.layout, genome: context.genome, pageId: context.pageId,
    template: { path: context.template.path, experience: context.template.experience, isDefault: context.template.isDefault, text: context.template.text, rules: context.template.rules },
    page11: { desktop: context.page11.desktop.source, mobile: context.page11.mobile.source },
    pageData: { contract: context.pageData.contractSource, shared: context.pageData.sharedSource },
    useMolecules: context.useMolecules, catalogHash: meta.catalogHash, moleculeHashes: meta.moleculeHashes,
    selectedGroups: meta.selectedGroups, dropped: meta.dropped, variants,
  });
  await writeGenomeUxPage(context, variants, receipt);
  return receipt;
}

/** Whether every page of the run has a fresh receipt (catalog not compared: the run itself just read it). */
export async function genomeUxRunFresh(args: GenomeUxRunArgs, layoutEntry: IUxLayout | null): Promise<boolean> {
  for (const pageId of args.runPages) {
    const status = await readGenomeUxPageStatus(args.project, args.module, args.layout, pageId, { layoutEntry });
    if (status.kind !== 'ok' || status.verdict.stale) return false;
  }
  return true;
}

/** The steps that close a run: the done anchor and, with materialize, agentMaterializeL2 for `page{N}1`. */
export function genomeUxCompletionSteps(args: GenomeUxRunArgs): mls.msg.AIPayload[] {
  const genome = genomeUxGenome(args.layout);
  const steps: mls.msg.AIPayload[] = [d2Result(`UX ${args.layout} ready`, JSON.stringify({ project: args.project, module: args.module, layout: args.layout, genome, pages: args.runPages }), GENOME_UX_DONE_PLAN_ID)];
  if (args.materialize) {
    const scope = { genome, ...(args.subset ? { pages: args.runPages } : {}) };
    steps.push({
      type: 'agent', stepId: 0, interaction: null, stepTitle: `Materialize ${args.module} ${genome}`, status: 'waiting_dependency', nextSteps: [],
      agentName: 'agentMaterializeL2', prompt: JSON.stringify({ project: args.project, module: args.module, scope }), rags: [],
      planning: { planId: GENOME_UX_MATERIALIZE_PLAN_ID, dependsOn: [GENOME_UX_DONE_PLAN_ID], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep);
  }
  return steps;
}
