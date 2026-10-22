/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxPrompts.ts" enhancement="_blank"/>

/**
 * The two LLM stages of a variant page, the same funnel as agentDefsL2 pages50:
 *   1. groups   — the relevant molecule groups per organism (agentDefsL2 `moleculeGroupPrompt`), with the template
 *                 and its rules; forbidden groups are not even offered.
 *   2. decision — the molecules per organism for desktop AND mobile in one answer (as agentDefsL2 decides the
 *                 page11 pair), from the tags of the chosen groups only (schema enum).
 * The category is fixed (the UX template); organisms, intents and sections are the page11 ones and never change.
 *
 * PURE — prompt text, tool schemas and answer parsing. No `mls.*`.
 */

import { moleculeGroupPrompt, type D2MoleculeGroup, type D2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { moleculeDecisionContext } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import type { L2Page11Definition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { genomeUxForbidden, type GenomeUxDevice, type GenomeUxRules } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import { genomeUxAllowedPage11Molecules, type GenomeUxMolecules } from '/_102020_/l2/aura/agentGenomeUx/genomeUxVariant.js';
import type { GenomeUxPageData } from '/_102020_/l2/aura/agentGenomeUx/genomeUxPageData.js';

/** The page data block of both prompts; null when neither the contract nor the shared could be read. */
function pageDataPrompt(data: GenomeUxPageData): GenomeUxPageData | null {
  return data.states === null && data.rowTypes === null ? null : data;
}

export const GENOME_UX_GROUPS_TOOL = 'submitGenomeUxGroups' as const;
export const GENOME_UX_DECISION_TOOL = 'submitGenomeUxMolecules' as const;
export const GENOME_UX_PROMPT_LIMIT_CHARS = 400_000;

export const GENOME_UX_GROUPS_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
<!-- reasoningEffort: low -->
<!-- x-tool-strict: true -->

Select relevant molecular groups by purpose for every organism of an existing page that is being redesigned for
the given UX template. Return exact catalog group IDs. Follow the template text: a group in template.rules.prefer
is favored when it fits the organism; groups the template forbids are not offered and must never be returned.
PageData is what the page really returns (states per organism and the contract row types): select a group only when
the organism's data can feed it — never a group whose purpose needs data the page does not have.`;

export const GENOME_UX_DECISION_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
<!-- reasoningEffort: medium -->
<!-- x-tool-strict: true -->

You choose the molecules (catalog web components) of one page for a UX template. Call ${GENOME_UX_DECISION_TOOL} once.

The page already exists: its intent, sections, organisms and intents are fixed and are not part of the answer.
Only the molecules change, so that the page follows template.text.

Rules:
- Answer desktop and mobile. Each lists, per organism id of that device, the molecule roles: role (a short phrase in
  the page language), preferred and alternative ('' when none).
- preferred and alternative are exact tags from moleculeResearch.groups of a group selected for that organism
  (moleculeResearch.organisms). Never invent a tag or use a tag of another organism's groups.
- template.rules.forbid is a hard constraint: never use a tag whose group (the part before "--") is listed there.
- template.rules.prefer is guidance: favor those groups when they fit; it does not oblige.
- pageData is what the page really returns: pageData.states says which state feeds each organism, and
  pageData.rowTypes holds the only fields a row has. A molecule must fit the data of its organism: never choose one
  that needs data the page does not return (a time series for a sparkline or trend, an image, a date range, a
  hierarchy, a geographic position...). When pageData is null, rely on the organism texts and be conservative.
- template.rules.axes describes the intended presentation (records view, density, ...) when the data supports it;
  choose molecules that match it only then. When the data lacks what the template's ideal shape needs, follow the
  degraded form template.text describes for that case instead of the axis.
- Every piece of data the organism's state returns should still be shown: do not drop a role that presents data of
  the state (e.g. a list the state returns) only because the template favors another shape; adapt it instead.
- An organism may have no molecule: leave it out instead of breaking the template.
- page11Molecules is the choice made for the primary page's own template; keep a role only when it also fits this template.
- Mobile is a fluid narrow column around 390px; it may use different molecules from desktop.
- If repair is given, the previous answer was refused for the diagnostic: answer again, fixing it.`;

export interface GenomeUxTemplatePrompt { path: string; experience: string; text: string; rules: GenomeUxRules | null }

/** Organisms of the page for the groups stage: the desktop ones, then any mobile-only id. */
export function genomeUxOrganismSources(page11: Record<GenomeUxDevice, L2Page11Definition>): Array<{ id: string; kind: string; text: string }> {
  const out: Array<{ id: string; kind: string; text: string }> = [];
  for (const device of ['desktop', 'mobile'] as const) {
    for (const [id, organism] of Object.entries(page11[device].organisms)) if (!out.some(item => item.id === id)) out.push({ id, kind: organism.kind, text: organism.text });
  }
  return out;
}

/** The catalog inventory without the groups the template forbids. */
export function genomeUxAllowedInventory(inventory: D2MoleculeInventory, forbid: readonly string[]): D2MoleculeInventory {
  return { ...inventory, groups: inventory.groups.filter(group => !genomeUxForbidden(group.groupId, forbid)) };
}

/** The groups chosen per organism, without forbidden groups (the gate refuses them anyway). */
export function genomeUxAllowedSelection(selected: Record<string, string[]>, forbid: readonly string[]): Record<string, string[]> {
  return Object.fromEntries(Object.entries(selected).map(([id, groups]) => [id, groups.filter(group => !genomeUxForbidden(group, forbid))]));
}

export function genomeUxGroupsPrompt(inventory: D2MoleculeInventory, organisms: Array<{ id: string; kind: string; text: string }>, template: GenomeUxTemplatePrompt, pageData: GenomeUxPageData, repair?: { diagnostic: string; previous: unknown }): string {
  const base = moleculeGroupPrompt(inventory, organisms);
  const tail = `\nPageData: ${JSON.stringify(pageDataPrompt(pageData))}`
    + `\nTemplate: ${JSON.stringify({ path: template.path, experience: template.experience, rules: template.rules, text: template.text })}`;
  return `${base}${tail}${repair ? `\nRepair: ${JSON.stringify(repair)}` : ''}`;
}

export interface GenomeUxDecisionPromptInput {
  pageId: string;
  page11: Record<GenomeUxDevice, L2Page11Definition>;
  template: GenomeUxTemplatePrompt;
  pageData: GenomeUxPageData;
  selected: Record<string, string[]>;
  groups: D2MoleculeGroup[];
  repair?: { diagnostic: string; previous: unknown };
}

export function genomeUxDecisionPrompt(input: GenomeUxDecisionPromptInput): string {
  const forbid = input.template.rules?.forbid ?? [];
  const device = (definition: L2Page11Definition) => ({ intent: definition.intent, sections: definition.sections, organisms: definition.organisms });
  const prompt = JSON.stringify({
    page: { pageId: input.pageId, desktop: device(input.page11.desktop), mobile: device(input.page11.mobile) },
    pageData: pageDataPrompt(input.pageData),
    template: { path: input.template.path, experience: input.template.experience, rules: input.template.rules, text: input.template.text },
    page11Molecules: { desktop: genomeUxAllowedPage11Molecules(input.page11.desktop.molecules, forbid), mobile: genomeUxAllowedPage11Molecules(input.page11.mobile.molecules, forbid) },
    moleculeResearch: JSON.parse(moleculeDecisionContext(input.selected, input.groups)),
    repair: input.repair ?? null,
  });
  if (prompt.length > GENOME_UX_PROMPT_LIMIT_CHARS) throw new Error(`GENOME_UX_PROMPT_LIMIT: ${prompt.length} > ${GENOME_UX_PROMPT_LIMIT_CHARS}`);
  return prompt;
}

/** The tags the decision may use: those of the chosen groups, minus forbidden groups. */
export function genomeUxDecisionTags(selected: Record<string, string[]>, groups: readonly D2MoleculeGroup[], forbid: readonly string[]): string[] {
  const used = new Set(Object.values(selected).flat());
  return [...new Set(groups.filter(group => used.has(group.groupId)).flatMap(group => group.tags))].filter(tag => !genomeUxForbidden(tag, forbid));
}

export const genomeUxGroupsSchema = { type: 'object', additionalProperties: false, required: ['organisms'], properties: { organisms: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['organismId', 'groups'], properties: { organismId: { type: 'string' }, groups: { type: 'array', items: { type: 'string' } } } } } } };

/** Organism ids and tags are enums the code already knows (as agentDefsL2 d2PageChoiceEnums does). */
export function genomeUxDecisionSchema(organismIds: readonly string[], tags: readonly string[]): Record<string, unknown> {
  const role = { type: 'object', additionalProperties: false, required: ['role', 'preferred', 'alternative'], properties: {
    role: { type: 'string' },
    preferred: { type: 'string', ...(tags.length ? { enum: [...tags] } : {}) },
    alternative: { type: 'string', ...(tags.length ? { enum: ['', ...tags] } : {}) },
  } };
  const unit = { type: 'object', additionalProperties: false, required: ['molecules'], properties: { molecules: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'recommendations'], properties: {
    id: { type: 'string', ...(organismIds.length ? { enum: [...organismIds] } : {}) },
    recommendations: { type: 'array', items: role },
  } } } } };
  return { type: 'object', additionalProperties: false, required: ['desktop', 'mobile', 'reason'], properties: { desktop: unit, mobile: unit, reason: { type: 'string' } } };
}

/** The tool arguments of the step answer (same reading as agentDefsL2 pages50). */
export function genomeUxToolPayload(value: unknown, name: string): unknown {
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const candidate = root.type === 'flexible' ? (root.result as Record<string, unknown> | undefined)?.arguments : root.arguments ?? root.payload ?? root;
  if (root.type === 'flexible' && (root.result as Record<string, unknown> | undefined)?.toolName !== name) throw new Error('GENOME_UX_TOOL_MISMATCH');
  if (typeof candidate !== 'string') return candidate;
  try { return JSON.parse(candidate); } catch { throw new Error('GENOME_UX_TOOL_JSON'); }
}

/** The decision answer → molecules per device. Shape errors throw `GENOME_UX_RESPONSE_*`; the gate judges the tags. */
export function genomeUxDecisionMolecules(value: unknown): Record<GenomeUxDevice, GenomeUxMolecules> {
  const root = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!root) throw new Error('GENOME_UX_RESPONSE_SHAPE');
  const out = {} as Record<GenomeUxDevice, GenomeUxMolecules>;
  for (const device of ['desktop', 'mobile'] as const) {
    const unit = root[device] as { molecules?: unknown } | undefined;
    if (!unit || typeof unit !== 'object' || !Array.isArray(unit.molecules)) throw new Error(`GENOME_UX_RESPONSE_SHAPE: ${device}.molecules`);
    const molecules: GenomeUxMolecules = {};
    const seen = new Set<string>();
    for (const raw of unit.molecules as unknown[]) {
      const row = raw as { id?: unknown; recommendations?: unknown };
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || !Array.isArray(row.recommendations)) throw new Error(`GENOME_UX_RESPONSE_SHAPE: ${device}.molecules`);
      if (seen.has(row.id)) throw new Error(`GENOME_UX_RESPONSE_DUPLICATE: ${device}.${row.id}`);
      seen.add(row.id);
      const list = (row.recommendations as unknown[]).map((item, index) => {
        const rec = item as { role?: unknown; preferred?: unknown; alternative?: unknown };
        if (!rec || typeof rec !== 'object' || typeof rec.role !== 'string' || !rec.role.trim() || typeof rec.preferred !== 'string' || !rec.preferred
          || (rec.alternative !== undefined && typeof rec.alternative !== 'string')) throw new Error(`GENOME_UX_RESPONSE_SHAPE: ${device}.${row.id}/${index}`);
        const alternative = typeof rec.alternative === 'string' && rec.alternative && rec.alternative !== rec.preferred ? rec.alternative : '';
        return { role: rec.role.trim(), preferred: rec.preferred, ...(alternative ? { alternative } : {}) };
      });
      if (list.length) molecules[row.id] = list;
    }
    out[device] = molecules;
  }
  return out;
}
