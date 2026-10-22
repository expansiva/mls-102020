/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxVariant.ts" enhancement="_blank"/>

/**
 * The variant defs of one page and device: the page11 definition with the UX template and the molecules chosen
 * again for it, rendered in the exact page11 grammar and read back with the materializer's own parser before
 * anything is written. Also the molecule gate of the variant: a tag outside the groups chosen for the organism,
 * or of a group the template forbids, is refused (and, on the last attempt, dropped — never written).
 *
 * PURE — no `mls.*`, no file system.
 */

import { parseL2Page11, type L2Page11Definition, type L2Page11Molecule } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { gateD2MoleculeRoles } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import type { D2MoleculeGroup } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { genomeUxForbidden, genomeUxVariantReference, type GenomeUxDevice } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';

export type GenomeUxMolecules = Record<string, L2Page11Molecule[]>;

/** The public variant definition. `molecules` is absent when the UX does not use molecules. */
export interface GenomeUxDefinition {
  template: { category: string; experience: string };
  intent: string;
  sections: L2Page11Definition['sections'];
  organisms: L2Page11Definition['organisms'];
  molecules?: GenomeUxMolecules;
}

export interface GenomeUxLocation { project: number; module: string; pageId: string; device: GenomeUxDevice; genome: string }

/**
 * page11 + template + molecules. Intent, sections, organisms and intents are copied as they are (the contract
 * input20 checks); only `template` and `molecules` change. `molecules` null → the key is absent.
 */
export function buildGenomeUxVariant(page11: L2Page11Definition, template: { category: string; experience: string }, molecules: GenomeUxMolecules | null): GenomeUxDefinition {
  if (!template.category.trim() || !template.experience.trim()) throw new Error('GENOME_UX_TEMPLATE_EMPTY');
  const copy = structuredClone({ intent: page11.intent, sections: page11.sections, organisms: page11.organisms });
  const definition: GenomeUxDefinition = { template: { category: template.category, experience: template.experience }, ...copy };
  if (molecules) {
    const unknown = Object.keys(molecules).filter(id => !Object.hasOwn(page11.organisms, id));
    if (unknown.length) throw new Error(`GENOME_UX_MOLECULE_ORGANISM: ${unknown.join(', ')}`);
    const kept: GenomeUxMolecules = {};
    for (const id of Object.keys(page11.organisms)) {
      const list = molecules[id];
      if (list?.length) kept[id] = list.map(item => ({ role: item.role, preferred: item.preferred, ...(item.alternative ? { alternative: item.alternative } : {}) }));
    }
    definition.molecules = kept;
  }
  return definition;
}

/**
 * The defs text, exactly as agentDefsL2 renders page11 (header, blank line, `export const definition = … as const;`),
 * then read back with `parseL2Page11`: the location must name this page and the sections, organisms and intents
 * must be those of page11. Throws `GENOME_UX_RENDER_*` otherwise.
 */
export function renderGenomeUxDefs(location: GenomeUxLocation, definition: GenomeUxDefinition, page11: L2Page11Definition): string {
  const reference = genomeUxVariantReference(location.project, location.module, location.pageId, location.device, location.genome);
  const ordered = { template: definition.template, intent: definition.intent, sections: definition.sections, organisms: definition.organisms, ...(definition.molecules ? { molecules: definition.molecules } : {}) };
  const source = `/// <mls fileReference="${reference}" enhancement="_blank"/>\n\nexport const definition = ${JSON.stringify(ordered, null, 2)} as const;\n`;
  let parsed: ReturnType<typeof parseL2Page11>;
  try { parsed = parseL2Page11(source); } catch (error) { throw new Error(`GENOME_UX_RENDER_GRAMMAR: ${error instanceof Error ? error.message : String(error)}`); }
  const { location: read, definition: back } = parsed;
  if (read.project !== location.project || read.module !== location.module || read.pageId !== location.pageId || read.device !== location.device || read.genome !== location.genome) {
    throw new Error(`GENOME_UX_RENDER_LOCATION: ${reference}`);
  }
  if (JSON.stringify(back.sections) !== JSON.stringify(page11.sections) || JSON.stringify(back.organisms) !== JSON.stringify(page11.organisms) || back.intent !== page11.intent) {
    throw new Error(`GENOME_UX_RENDER_CONTRACT: ${reference} does not keep the page11 sections, organisms and intents`);
  }
  return source;
}

// ─── molecule gate ─────────────────────────────────────────────────────────────

export interface GenomeUxGateInput {
  /** The organisms of this device's page11. */
  organismIds: readonly string[];
  /** Groups chosen per organism in the groups stage (forbidden ones already removed). */
  selected: Record<string, string[]>;
  /** The shortlist read for those groups (tags per group). */
  groups: readonly D2MoleculeGroup[];
  /** `groups.forbid` of the template (empty when it has no rules). */
  forbid: readonly string[];
}

/**
 * Every refusal of one device's molecules: an organism that is not in page11, a tag outside the groups chosen for
 * its organism (agentDefsL2's `gateD2MoleculeRoles`), and a tag of a group the template forbids. Empty = accepted.
 */
export function gateGenomeUxMolecules(molecules: GenomeUxMolecules, input: GenomeUxGateInput): string[] {
  const errors: string[] = [];
  const known = new Set(input.organismIds);
  for (const id of Object.keys(molecules)) if (!known.has(id)) errors.push(`GENOME_UX_MOLECULE_ORGANISM: ${id} is not an organism of page11`);
  errors.push(...gateD2MoleculeRoles(molecules, input.selected, [...input.groups]));
  for (const [id, roles] of Object.entries(molecules)) {
    for (const role of roles) for (const tag of [role.preferred, role.alternative]) {
      if (tag && genomeUxForbidden(tag, input.forbid)) errors.push(`GENOME_UX_MOLECULE_FORBIDDEN: ${id}/${tag} is of a group the template forbids`);
    }
  }
  return errors;
}

/**
 * The last resort after the repair: keep only what the gate accepts. A role keeps its first allowed tag as
 * preferred (and the second as alternative); a role with none is dropped, and an organism with no role is left
 * without molecules. `dropped` lists what was removed, for the receipt.
 */
export function sanitizeGenomeUxMolecules(molecules: GenomeUxMolecules, input: GenomeUxGateInput): { molecules: GenomeUxMolecules; dropped: string[] } {
  const known = new Set(input.organismIds);
  const byId = new Map(input.groups.map(group => [group.groupId, group]));
  const kept: GenomeUxMolecules = {};
  const dropped: string[] = [];
  for (const [id, roles] of Object.entries(molecules)) {
    if (!known.has(id)) { dropped.push(...roles.map(role => `${id}/${role.preferred}`)); continue; }
    const allowed = new Set((input.selected[id] ?? []).flatMap(groupId => byId.get(groupId)?.tags ?? []));
    const list: L2Page11Molecule[] = [];
    for (const role of roles) {
      const tags = [role.preferred, role.alternative].filter((tag): tag is string => !!tag);
      const ok = tags.filter(tag => allowed.has(tag) && !genomeUxForbidden(tag, input.forbid));
      for (const tag of tags) if (!ok.includes(tag)) dropped.push(`${id}/${tag}`);
      if (ok.length) list.push({ role: role.role, preferred: ok[0], ...(ok[1] ? { alternative: ok[1] } : {}) });
    }
    if (list.length) kept[id] = list;
  }
  return { molecules: kept, dropped };
}

/** The page11 molecules without the tags the template forbids: the reference the decision prompt shows. */
export function genomeUxAllowedPage11Molecules(molecules: GenomeUxMolecules, forbid: readonly string[]): GenomeUxMolecules {
  const out: GenomeUxMolecules = {};
  for (const [id, roles] of Object.entries(molecules)) {
    const list = roles.filter(role => !genomeUxForbidden(role.preferred, forbid))
      .map(role => ({ role: role.role, preferred: role.preferred, ...(role.alternative && !genomeUxForbidden(role.alternative, forbid) ? { alternative: role.alternative } : {}) }));
    if (list.length) out[id] = list;
  }
  return out;
}
