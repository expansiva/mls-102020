/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxIo.ts" enhancement="_blank"/>

/**
 * Studio IO of agentGenomeUx: the page list, the project config, the page11 defs, the template, the molecule
 * catalog, the variant defs and the receipts. Everything runs in the browser over `mls.stor`; the decisions live
 * in the pure files (genomeUxCore / genomeUxVariant / genomeUxReceipt).
 *
 * `readGenomeUxPageStatus` is the entry for the select-module status panel (part C): it gives the receipt, the
 * current inputs and the stale verdict of one page of a UX.
 */

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { readStorText, storTextExists, writeStorText } from '/_102020_/l2/agentMaterializeL2/helpers/storText.js';
import { L2_PRIMARY_GENOME, parseL2Page11, type L2Page11Definition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { defsWithoutHistory, splitDefsHistory, withDefsHistory, type DefsHistoryEntry } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import { buildD2MoleculeInventory, type D2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { d2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';
import { UX_BESPOKE, getPageTemplate, uxPageKey, type IUxExperienceIndex, type IUxLayout } from '/_102020_/l2/aura/helpers/uxTemplates.js';
import {
  GENOME_UX_DEVICES, genomeUxBaseChoice, genomeUxContractInfo, genomeUxEffectiveTemplate, genomeUxExperience, genomeUxGenome, genomeUxIsBase, genomeUxPage11Info, genomeUxReceiptInfo,
  genomeUxRules, genomeUxSharedInfo, genomeUxTemplateInfo, genomeUxUseMolecules, genomeUxVariantInfo,
  type GenomeUxDevice, type GenomeUxFileInfo, type GenomeUxRulesResult,
} from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import { genomeUxPageData, type GenomeUxPageData } from '/_102020_/l2/aura/agentGenomeUx/genomeUxPageData.js';
import { genomeUxCurrentFromTexts, genomeUxStale, type GenomeUxCurrent, type GenomeUxReceipt, type GenomeUxStaleVerdict } from '/_102020_/l2/aura/agentGenomeUx/genomeUxReceipt.js';

/** The text of a stor file, or null when it does not exist or cannot be read. */
export async function readGenomeUxText(info: GenomeUxFileInfo): Promise<string | null> {
  if (!storTextExists(info)) return null;
  try { return await readStorText(info); } catch { return null; }
}

export async function writeGenomeUxText(info: GenomeUxFileInfo, text: string): Promise<void> {
  await writeStorText(info, text);
}

/** The page ids of the module: the page11 desktop defs, sorted. */
export function listGenomeUxPages(project: number, module: string): string[] {
  const folder = `${module}/web/desktop/page11`;
  return Object.values(mls.stor.files)
    .filter(file => file.project === project && file.level === 2 && file.folder === folder && file.extension === '.defs.ts' && file.status !== 'deleted')
    .map(file => file.shortName)
    .sort();
}

/** `config.layouts[N]` of the project, or null when the UX does not exist. */
export async function readGenomeUxLayout(project: number, layout: number): Promise<IUxLayout | null> {
  const config = await getConfigProject(project) as { layouts?: Record<string, IUxLayout> } | undefined;
  const entry = config?.layouts?.[String(layout)];
  return entry && typeof entry === 'object' ? entry : null;
}

let experienceIndexCache: Promise<IUxExperienceIndex | null> | null = null;
/** `l4/collabux/templates/experienceIndex.json` of 102020, read once per session (as selectUx does). */
export function readGenomeUxExperienceIndex(): Promise<IUxExperienceIndex | null> {
  if (!experienceIndexCache) {
    experienceIndexCache = (async () => {
      const text = await readGenomeUxText({ project: 102020, level: 4, folder: 'collabux/templates', shortName: 'experienceIndex', extension: '.json' });
      if (!text) { experienceIndexCache = null; return null; }
      try { return JSON.parse(text) as IUxExperienceIndex; } catch { experienceIndexCache = null; return null; }
    })();
  }
  return experienceIndexCache;
}

export interface GenomeUxPageContext {
  project: number;
  module: string;
  layout: number;
  genome: string;
  pageId: string;
  page11: Record<GenomeUxDevice, { source: string; definition: L2Page11Definition }>;
  layoutEntry: IUxLayout | null;
  useMolecules: boolean;
  template: { path: string; isDefault: boolean; experience: string; text: string | null; rules: GenomeUxRulesResult };
  /** The contract and shared texts (null when missing) and what the prompts get from them. */
  pageData: { contractSource: string | null; sharedSource: string | null; data: GenomeUxPageData };
}

/** The template text of a path: null for a bespoke page; throws when the file is missing. */
export async function readGenomeUxTemplateText(path: string): Promise<string | null> {
  if (path === UX_BESPOKE) return null;
  const info = genomeUxTemplateInfo(path);
  if (!info) throw new Error(`GENOME_UX_TEMPLATE_PATH: ${path}`);
  const text = await readGenomeUxText(info);
  if (text === null || !text.trim()) throw new Error(`GENOME_UX_TEMPLATE_MISSING: ${path}`);
  return text;
}

/**
 * Everything a page needs before any LLM call: both page11 defs, the UX entry, the effective template with its
 * text, experience and rules. Base mode (layout 1): `genome` is page11, and the "variant" written is page11 itself. Throws a `GENOME_UX_*` code the model cannot fix (missing defs, missing template,
 * unreadable rules).
 */
export async function loadGenomeUxPageContext(project: number, module: string, layout: number, pageId: string, layoutEntry?: IUxLayout | null): Promise<GenomeUxPageContext> {
  const genome = genomeUxGenome(layout);
  const page11 = {} as GenomeUxPageContext['page11'];
  for (const device of GENOME_UX_DEVICES) {
    // The Studio edit history (helpers/defsHistory) is not part of what a variant is designed from.
    const raw = await readGenomeUxText(genomeUxPage11Info(project, module, pageId, device));
    const source = raw === null ? null : defsWithoutHistory(raw);
    if (source === null) throw new Error(`GENOME_UX_PAGE11_MISSING: ${module}/web/${device}/page11/${pageId}.defs.ts`);
    try { page11[device] = { source, definition: parseL2Page11(source).definition }; }
    catch (error) { throw new Error(`GENOME_UX_PAGE11_INVALID: ${device}/${pageId}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const entry = layoutEntry === undefined ? await readGenomeUxLayout(project, layout) : layoutEntry;
  const page11Template = page11.desktop.definition.template;
  const effective = genomeUxEffectiveTemplate(entry, module, pageId, page11Template.category);
  const text = await readGenomeUxTemplateText(effective.path);
  const experience = effective.path === UX_BESPOKE ? page11Template.experience : genomeUxExperience(effective.path, await readGenomeUxExperienceIndex(), page11Template);
  if (!experience) throw new Error(`GENOME_UX_EXPERIENCE_UNKNOWN: ${effective.path}`);
  const rules = genomeUxRules(text);
  if (rules.kind === 'error') throw new Error(`GENOME_UX_TEMPLATE_RULES: ${effective.path}: ${rules.message}`);
  const contractSource = await readGenomeUxText(genomeUxContractInfo(project, module, pageId));
  const sharedSource = await readGenomeUxText(genomeUxSharedInfo(project, module, pageId));
  return { project, module, layout, genome, pageId, page11, layoutEntry: entry, useMolecules: genomeUxUseMolecules(entry),
    template: { path: effective.path, isDefault: effective.isDefault, experience, text, rules },
    pageData: { contractSource, sharedSource, data: genomeUxPageData(contractSource, sharedSource) } };
}

/** The molecule catalog inventory of the project (agentDefsL2's discovery: the project or one direct dependency). */
export async function readGenomeUxInventory(project: number): Promise<D2MoleculeInventory> {
  return buildD2MoleculeInventory(d2MoleculeCatalogPort, project);
}

export async function readGenomeUxReceipt(project: number, module: string, genome: string, pageId: string): Promise<GenomeUxReceipt | null> {
  const text = await readGenomeUxText(genomeUxReceiptInfo(project, module, genome, pageId));
  if (!text?.trim()) return null;
  try { return JSON.parse(text) as GenomeUxReceipt; } catch { return null; }
}

export async function readGenomeUxVariants(project: number, module: string, genome: string, pageId: string): Promise<Record<GenomeUxDevice, string | null>> {
  return {
    desktop: await readGenomeUxText(genomeUxVariantInfo(project, module, pageId, 'desktop', genome)),
    mobile: await readGenomeUxText(genomeUxVariantInfo(project, module, pageId, 'mobile', genome)),
  };
}

/** Both variant defs, then the receipt (last: a receipt exists only for a pair that was fully written). */
export async function writeGenomeUxPage(context: Pick<GenomeUxPageContext, 'project' | 'module' | 'genome' | 'pageId'>, variants: Record<GenomeUxDevice, string>, receipt: GenomeUxReceipt): Promise<void> {
  for (const device of GENOME_UX_DEVICES) {
    const info = genomeUxVariantInfo(context.project, context.module, context.pageId, device, context.genome);
    // Base mode rewrites page11 itself: the Studio edit history it carries is kept (helpers/defsHistory).
    const current = context.genome === L2_PRIMARY_GENOME ? await readGenomeUxText(info) : null;
    let history: DefsHistoryEntry[] = [];
    try { history = current === null ? [] : splitDefsHistory(current).history; } catch { history = []; }
    await writeGenomeUxText(info, withDefsHistory(variants[device], history));
  }
  await writeGenomeUxText(genomeUxReceiptInfo(context.project, context.module, context.genome, context.pageId), `${JSON.stringify(receipt, null, 2)}\n`);
}

export type GenomeUxPageStatus =
  | { kind: 'ok'; receipt: GenomeUxReceipt | null; current: GenomeUxCurrent; verdict: GenomeUxStaleVerdict; context: GenomeUxPageContext }
  | { kind: 'error'; diagnostic: string };

/**
 * The stale verdict of one page of UX N from what is on disk now. `catalogHash` (from `readGenomeUxInventory`)
 * is compared only when given. Missing page11 or template → `error` with the code.
 */
export async function readGenomeUxPageStatus(project: number, module: string, layout: number, pageId: string, options: { layoutEntry?: IUxLayout | null; catalogHash?: string | null } = {}): Promise<GenomeUxPageStatus> {
  try {
    const context = await loadGenomeUxPageContext(project, module, layout, pageId, options.layoutEntry);
    const [receipt, variants] = await Promise.all([
      readGenomeUxReceipt(project, module, context.genome, pageId),
      readGenomeUxVariants(project, module, context.genome, pageId),
    ]);
    const current = await genomeUxCurrentFromTexts({
      templatePath: context.template.path, templateText: context.template.text, rules: context.template.rules,
      page11: { desktop: context.page11.desktop.source, mobile: context.page11.mobile.source },
      pageData: { contract: context.pageData.contractSource, shared: context.pageData.sharedSource },
      variants, useMolecules: context.useMolecules,
      ...(options.catalogHash === undefined ? {} : { catalogHash: options.catalogHash }),
    });
    return { kind: 'ok', receipt, current, verdict: genomeUxStale(receipt, current), context };
  } catch (error) {
    return { kind: 'error', diagnostic: error instanceof Error ? error.message : String(error) };
  }
}

/** Whether the receipt file of a page exists (no read). */
export function genomeUxReceiptExists(project: number, module: string, genome: string, pageId: string): boolean {
  return storTextExists(genomeUxReceiptInfo(project, module, genome, pageId));
}

/**
 * Base mode: the template chosen for the page in `layouts["1"]` when it differs from the page11 `template.category`
 * (desktop, the one every device follows), else null. null too when page11 cannot be read.
 */
export async function readGenomeUxBaseChoice(project: number, module: string, pageId: string, layoutEntry?: IUxLayout | null): Promise<string | null> {
  const entry = layoutEntry === undefined ? await readGenomeUxLayout(project, 1) : layoutEntry;
  if (!entry) return null;
  const source = await readGenomeUxText(genomeUxPage11Info(project, module, pageId, 'desktop'));
  if (source === null) return null;
  try { return genomeUxBaseChoice(entry, module, pageId, parseL2Page11(defsWithoutHistory(source)).definition.template.category); } catch { return null; }
}

/**
 * Whether a page of the run still has work to do (the dispatch reuse check and the end-of-run check).
 * UX N: an unreadable page or a stale receipt. Base mode (UX 1): a page with no UX 1 choice and no receipt is a
 * no-op (never read further); otherwise a choice that differs from page11 with no receipt, or a stale receipt.
 */
export async function readGenomeUxPagePending(project: number, module: string, layout: number, pageId: string,
  options: { layoutEntry: IUxLayout | null; catalogHash?: string }): Promise<{ pending: boolean; reason: string }> {
  if (genomeUxIsBase(layout)) {
    const chosen = getPageTemplate(options.layoutEntry, uxPageKey(module, pageId));
    if (!chosen && !genomeUxReceiptExists(project, module, genomeUxGenome(layout), pageId)) return { pending: false, reason: 'no UX 1 template choice' };
  }
  const status = await readGenomeUxPageStatus(project, module, layout, pageId, options);
  if (status.kind === 'error') return { pending: true, reason: status.diagnostic };
  if (genomeUxIsBase(layout) && status.receipt === null && status.context.template.isDefault) return { pending: false, reason: 'the UX 1 choice is the page11 template' };
  return { pending: status.verdict.stale, reason: status.verdict.reasons.join(', ') };
}
