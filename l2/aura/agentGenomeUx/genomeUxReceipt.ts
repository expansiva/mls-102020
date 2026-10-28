/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxReceipt.ts" enhancement="_blank"/>

/**
 * The receipt of one page of UX N (`l2/<module>/pipeline/agentGenomeUx/page{N}1/<pageId>.json`, page11 for the base) and the "stale"
 * verdict of a page from its current inputs. A fresh page is reused without an LLM call; the status panel of
 * select-module (part C) reads the same verdict. See README.md for the contract.
 *
 * page11 counts only through what a variant inherits from it — intent, sections and organisms
 * (`page11ContractHashes`): a page11 whose template or molecules change (base mode, agentDefsL2) does not make a
 * UX N variant stale. In base mode (UX 1) the written defs ARE page11, so `variantHashes` vs the current page11
 * says whether someone rewrote it afterwards.
 *
 * PURE — no `mls.*`, no file system (hashing uses Web Crypto, as helpers/hash.ts does).
 */

import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { defsWithoutHistory } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import { GENOME_UX_RECEIPT_VERSION, type GenomeUxDevice, type GenomeUxRules, type GenomeUxRulesResult } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';

export interface GenomeUxReceipt {
  schemaVersion: typeof GENOME_UX_RECEIPT_VERSION;
  project: number;
  module: string;
  /** The UX N of `layouts[N]` (1 = base mode). */
  layout: number;
  /** `page{N}1` (`page11` for the base). */
  genome: string;
  pageId: string;
  template: {
    /** Full path written in `template.category`. */
    path: string;
    experience: string;
    /** true when the UX has no entry for the page and the page11 template is used. */
    isDefault: boolean;
    /** sha256 of the template text ('' for a bespoke page). */
    hash: string;
    /** sha256 of the normalized `## Molecule rules` ({axes, prefer, forbid}), null when the template has none. */
    rulesHash: string | null;
    rules: GenomeUxRules | null;
  };
  /** sha256 of the part of the page11 defs a variant inherits (intent, sections, organisms), per device. */
  page11ContractHashes: Record<GenomeUxDevice, string>;
  /** sha256 of the page data the prompts saw (contract + shared defs texts). */
  pageDataHash: string;
  useMolecules: boolean;
  /** sha256 of the molecule catalog (`molecules/skill.ts` of the catalog project); null when useMolecules is false. */
  catalogHash: string | null;
  /** sha256 of the index and usage sources of the groups read for the decision (agentDefsL2 shortlist). */
  moleculeHashes: Record<string, string>;
  /** Groups chosen per organism in the groups stage. */
  selectedGroups: Record<string, string[]>;
  /** Tags the last gate removed instead of writing them (`<organism>/<tag>`, prefixed by the device). */
  dropped: string[];
  /** sha256 of the written variant defs text, per device (base mode: the written page11). */
  variantHashes: Record<GenomeUxDevice, string>;
  createdAt: string;
}

/** The current inputs of a page, as hashes. `catalogHash` undefined = not compared (the panel may skip reading the catalog). */
export interface GenomeUxCurrent {
  templatePath: string;
  templateHash: string;
  rulesHash: string | null;
  /** sha256 of the inherited part of page11 (`genomeUxPage11ContractHash`); null when the page11 defs of that device is missing. */
  page11ContractHashes: Record<GenomeUxDevice, string | null>;
  /** The `template.category` page11 carries now, per device (null when missing or unreadable). */
  page11Templates: Record<GenomeUxDevice, string | null>;
  pageDataHash: string;
  useMolecules: boolean;
  catalogHash?: string | null;
  /** null when the variant defs of that device is missing. */
  variantHashes: Record<GenomeUxDevice, string | null>;
}

/**
 * Why a page is not fresh. `receipt`: none or an older version; `page11`: the inherited part of page11 (intent,
 * sections, organisms) changed; `variant`: a written defs is missing or was edited (base mode: page11 was rewritten
 * after the agent wrote it, e.g. by agentDefsL2).
 */
export type GenomeUxStaleReason = 'receipt' | 'page11' | 'pageData' | 'template' | 'rules' | 'catalog' | 'useMolecules' | 'variant';
export interface GenomeUxStaleVerdict { stale: boolean; reasons: GenomeUxStaleReason[] }

/** The stale verdict: fresh only when the receipt matches every current input and both written defs are untouched. */
export function genomeUxStale(receipt: GenomeUxReceipt | null | undefined, current: GenomeUxCurrent): GenomeUxStaleVerdict {
  if (!receipt || receipt.schemaVersion !== GENOME_UX_RECEIPT_VERSION) return { stale: true, reasons: ['receipt'] };
  const reasons: GenomeUxStaleReason[] = [];
  const devices: GenomeUxDevice[] = ['desktop', 'mobile'];
  if (devices.some(device => current.page11ContractHashes[device] !== receipt.page11ContractHashes?.[device])) reasons.push('page11');
  if (current.pageDataHash !== receipt.pageDataHash) reasons.push('pageData');
  if (current.templatePath !== receipt.template.path || current.templateHash !== receipt.template.hash) reasons.push('template');
  if (current.rulesHash !== receipt.template.rulesHash) reasons.push('rules');
  if (current.useMolecules !== receipt.useMolecules) reasons.push('useMolecules');
  else if (current.useMolecules && current.catalogHash !== undefined && current.catalogHash !== receipt.catalogHash) reasons.push('catalog');
  if (devices.some(device => current.variantHashes[device] !== receipt.variantHashes[device])) reasons.push('variant');
  // Base mode: page11 rewritten afterwards (`variant`/`page11`) while it still carries the applied template on both
  // devices is agentDefsL2 regenerating the page and keeping the choice (TASK-102020-genome-ux-4, part B) —
  // accepted, not stale; otherwise "Generate" would re-choose the molecules over agentDefsL2's answer. A page11
  // back on another template stays stale.
  const keptTemplate = devices.every(device => current.page11Templates[device] === receipt.template.path);
  const accepted = receipt.layout === 1 && keptTemplate && !reasons.includes('template')
    ? reasons.filter(reason => reason !== 'variant' && reason !== 'page11') : reasons;
  return { stale: accepted.length > 0, reasons: accepted };
}

/** JSON with the object keys sorted (arrays keep their order): the same content always hashes the same. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().filter(key => row[key] !== undefined).map(key => `${JSON.stringify(key)}:${stableJson(row[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * sha256 of what a variant inherits from a page11 defs text: `intent`, `sections` and `organisms` (with their
 * intents), key order ignored. `template` and `molecules` are left out, so a page11 that only gets another template
 * or other molecules hashes the same. A text outside the page11 grammar hashes its raw text (always "changed").
 */
export async function genomeUxPage11ContractHash(page11Text: string): Promise<string> {
  let definition: ReturnType<typeof parseL2Page11>['definition'];
  // The Studio edit history (helpers/defsHistory) is not part of the contract, parsed or not.
  const text = defsWithoutHistory(page11Text);
  try { definition = parseL2Page11(text).definition; } catch { return sha256Text(`unparsed:${text}`); }
  return sha256Text(stableJson({ intent: definition.intent, sections: definition.sections, organisms: definition.organisms }));
}

/** The `template.category` of a page11 text, null when it does not parse. */
export function genomeUxPage11Template(page11Text: string): string | null {
  try { return parseL2Page11(defsWithoutHistory(page11Text)).definition.template.category; } catch { return null; }
}

/** sha256 of the normalized rules (stable key order), null for none or an unreadable block. */
export async function genomeUxRulesHash(rules: GenomeUxRulesResult): Promise<string | null> {
  if (rules.kind !== 'rules') return null;
  const axes = Object.fromEntries(Object.keys(rules.rules.axes).sort().map(key => [key, rules.rules.axes[key]]));
  return sha256Text(JSON.stringify({ axes, prefer: [...rules.rules.prefer].sort(), forbid: [...rules.rules.forbid].sort() }));
}

/** The texts of the page data the prompts read (null = missing file). */
export interface GenomeUxPageDataTexts { contract: string | null; shared: string | null }

/** sha256 of the page data texts; a missing file hashes differently from an empty one. */
export function genomeUxPageDataHash(texts: GenomeUxPageDataTexts): Promise<string> {
  return sha256Text(JSON.stringify([texts.contract, texts.shared]));
}

/** The texts the verdict is computed from; the IO layer reads them, this turns them into `GenomeUxCurrent`. */
export interface GenomeUxCurrentTexts {
  templatePath: string;
  /** null for a bespoke page (no template file). */
  templateText: string | null;
  rules: GenomeUxRulesResult;
  page11: Record<GenomeUxDevice, string | null>;
  pageData: GenomeUxPageDataTexts;
  variants: Record<GenomeUxDevice, string | null>;
  useMolecules: boolean;
  /** The catalog hash (`D2MoleculeInventory.sourceHash`); undefined = not compared. */
  catalogHash?: string | null;
}

export async function genomeUxCurrentFromTexts(texts: GenomeUxCurrentTexts): Promise<GenomeUxCurrent> {
  // In base mode the variant IS page11: its Studio edit history is not a change of the variant.
  const hashOrNull = async (value: string | null) => value === null ? null : sha256Text(defsWithoutHistory(value));
  const contractOrNull = async (value: string | null) => value === null ? null : genomeUxPage11ContractHash(value);
  return {
    templatePath: texts.templatePath,
    templateHash: await sha256Text(texts.templateText ?? ''),
    rulesHash: await genomeUxRulesHash(texts.rules),
    page11ContractHashes: { desktop: await contractOrNull(texts.page11.desktop), mobile: await contractOrNull(texts.page11.mobile) },
    page11Templates: {
      desktop: texts.page11.desktop === null ? null : genomeUxPage11Template(texts.page11.desktop),
      mobile: texts.page11.mobile === null ? null : genomeUxPage11Template(texts.page11.mobile),
    },
    pageDataHash: await genomeUxPageDataHash(texts.pageData),
    useMolecules: texts.useMolecules,
    ...(texts.catalogHash === undefined ? {} : { catalogHash: texts.useMolecules ? texts.catalogHash : null }),
    variantHashes: { desktop: await hashOrNull(texts.variants.desktop), mobile: await hashOrNull(texts.variants.mobile) },
  };
}

export interface GenomeUxReceiptInput {
  project: number; module: string; layout: number; genome: string; pageId: string;
  template: { path: string; experience: string; isDefault: boolean; text: string | null; rules: GenomeUxRulesResult };
  page11: Record<GenomeUxDevice, string>;
  pageData: GenomeUxPageDataTexts;
  useMolecules: boolean;
  /** `D2MoleculeInventory.sourceHash` (sha256 of the catalog `molecules/skill.ts`); null when useMolecules is false. */
  catalogHash: string | null;
  moleculeHashes: Record<string, string>;
  selectedGroups: Record<string, string[]>;
  dropped: string[];
  /** The written variant defs text, per device. */
  variants: Record<GenomeUxDevice, string>;
  now?: Date;
}

export async function buildGenomeUxReceipt(input: GenomeUxReceiptInput): Promise<GenomeUxReceipt> {
  return {
    schemaVersion: GENOME_UX_RECEIPT_VERSION,
    project: input.project, module: input.module, layout: input.layout, genome: input.genome, pageId: input.pageId,
    template: {
      path: input.template.path, experience: input.template.experience, isDefault: input.template.isDefault,
      hash: await sha256Text(input.template.text ?? ''),
      rulesHash: await genomeUxRulesHash(input.template.rules),
      rules: input.template.rules.kind === 'rules' ? input.template.rules.rules : null,
    },
    page11ContractHashes: { desktop: await genomeUxPage11ContractHash(input.page11.desktop), mobile: await genomeUxPage11ContractHash(input.page11.mobile) },
    pageDataHash: await genomeUxPageDataHash(input.pageData),
    useMolecules: input.useMolecules,
    catalogHash: input.useMolecules ? input.catalogHash : null,
    moleculeHashes: input.moleculeHashes,
    selectedGroups: input.selectedGroups,
    dropped: input.dropped,
    variantHashes: { desktop: await sha256Text(input.variants.desktop), mobile: await sha256Text(input.variants.mobile) },
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}
