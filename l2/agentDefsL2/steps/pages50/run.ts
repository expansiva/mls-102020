/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.ts" enhancement="_blank"/>

import { readJson, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2InputSnapshot, D2InputArtifacts, D2SelectedPage, D2RunIdentity } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { buildD2Page11WithExperience, gateD2Page11, gateD2Page11Pair, type D2Page11GateSources, type D2Page11Menu, type D2Page11NeedPage } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';
import { renderD2Page11Definition, type D2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import type { D2MoleculeInventory, D2MoleculeGroup } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { gateD2MoleculeRoles, moleculeDecisionContext } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import type { D2PageTemplateContext } from '/_102020_/l2/agentDefsL2/steps/pages50/templateContext.js';

export const D2_PAGES_VERSION = '2026-09-30-agent-defs-l2-pages-v2' as const;
export const D2_PAGE11_NEEDS_VERSION = '2026-09-30-agent-defs-l2-page11-needs-v1' as const;
export const D2_PAGES_PROMPT_LIMIT_CHARS = 160_000;

export interface D2PagesResponse {
  desktop: { definition: unknown; needs: unknown };
  mobile: { definition: unknown; needs: unknown };
  categoryReason: string;
}
export interface D2PagesReceipt {
  schemaVersion: typeof D2_PAGES_VERSION;
  needsVersion: typeof D2_PAGE11_NEEDS_VERSION;
  project: number;
  module: string;
  pageId: string;
  inputHash: string;
  template: { category: string; experience: string; reason: string; reference: string | null; hash: string; catalogHash: string };
  designSystemHash: string;
  moleculeInventoryHash: string;
  moleculeHashes: Record<string, string>;
  moleculeGroupAssessments?: D2PagesContext['groupAssessments'];
  skillHash: string;
  promptHash: string;
  promptChars: number;
  repairPromptChars: number;
  needsHashes: Record<D2Page11Device, string>;
  sourceHashes: Record<D2Page11Device, string>;
  menuOrigins: Array<{ organismId: string; sourceIndex: number; kind: string; text: string }>;
}

export interface D2PagesContext {
  identity: D2RunIdentity;
  snapshot: D2InputSnapshot;
  artifacts: D2InputArtifacts;
  page: D2SelectedPage;
  template: D2PageTemplateContext;
  inventory: D2MoleculeInventory;
  selectedGroups: Record<string, string[]>;
  groupAssessments?: Array<{ organismId: string; groups: Array<{ groupId: string; relevant: boolean; reason: string }> }>;
  groups: D2MoleculeGroup[];
  moleculeHashes: Record<string, string>;
  skill: string;
  prompt: string;
  designSystem: string;
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function menuOrigins(page: D2SelectedPage, definition?: D2Page11Definition): D2PagesReceipt['menuOrigins'] {
  const assigned = new Set<string>();
  return page.organisms.map((raw, sourceIndex) => {
    const item = record(raw);
    const kind = text(item.kind);
    const organismId = definition ? Object.entries(definition.organisms).find(([id, value]) => value.kind === kind && !assigned.has(id))?.[0] ?? '' : `organism${sourceIndex + 1}`;
    assigned.add(organismId);
    return { organismId, sourceIndex, kind, text: text(item.text) };
  });
}
function owned(identity: D2RunIdentity, pageId: string): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/pages50`, shortName: pageId, extension: '.json' }; }
function sourceInfo(identity: D2RunIdentity, pageId: string, device: D2Page11Device): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/web/${device}/page11`, shortName: pageId, extension: '.defs.ts' }; }
function needsInfo(identity: D2RunIdentity, pageId: string, device: D2Page11Device): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/page11Needs`, shortName: `${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}`, extension: '.json' }; }

export function buildD2PagesDecisionPrompt(context: D2PagesContext, repair?: { diagnostic: string; previous: unknown }): { prompt: string; chars: number } {
  const { page, artifacts } = context;
  const payload = {
    page: { pageId: page.pageId, label: page.label, actors: page.actors, authorityRefs: page.authorityRefs,
      ancestors: page.ancestors, organisms: menuOrigins(page), reads: page.reads, writes: page.writes,
      journeys: Object.fromEntries(page.journeyRefs.map(id => [id, artifacts.journeys[id]])),
      userLanguage: text(record(artifacts.menu).userLanguage) || 'en' },
    menu: artifacts.menu, needs: artifacts.needs,
    ontology: Object.fromEntries(Object.entries(artifacts.entities).filter(([id]) => JSON.stringify([page.reads, page.writes, page.organisms]).includes(id))),
    access: artifacts.access, categories: context.template.categories,
    designSystem: context.designSystem,
    moleculeResearch: JSON.parse(moleculeDecisionContext(context.selectedGroups, context.groups)),
    repair: repair ?? null,
  };
  const prompt = JSON.stringify(payload);
  if (prompt.length > D2_PAGES_PROMPT_LIMIT_CHARS) throw new Error(`D2_PAGE11_PROMPT_LIMIT: ${prompt.length} > ${D2_PAGES_PROMPT_LIMIT_CHARS}`);
  return { prompt, chars: prompt.length };
}

export interface D2PagesWriter { writeSource(info: Ns5FileInfo, source: string): Promise<void>; writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown> }
const productionWriter: D2PagesWriter = { writeSource: writeSourceText, writeJson };
export async function approveD2PagesUnit(context: D2PagesContext, raw: D2PagesResponse, promptChars: number, repairPromptChars = 0, writer: D2PagesWriter = productionWriter): Promise<D2PagesReceipt> {
  const category = text(record(record(raw.desktop).definition).template && record(record(record(raw.desktop).definition).template).category);
  if (!category || category !== text(record(record(record(raw.mobile).definition).template).category)) throw new Error('D2_PAGE11_DEVICE_CATEGORY');
  if (!text(raw.categoryReason)) throw new Error('D2_PAGE11_CATEGORY_REASON');
  const selectedTemplate = await context.template.select(category);
  const definitions: Record<D2Page11Device, D2Page11Definition> = {
    desktop: buildD2Page11WithExperience(raw.desktop.definition, context.template.categories),
    mobile: buildD2Page11WithExperience(raw.mobile.definition, context.template.categories),
  };
  const needs: Record<D2Page11Device, D2Page11Needs> = { desktop: buildD2Page11Needs(raw.desktop.needs), mobile: buildD2Page11Needs(raw.mobile.needs) };
  const menu = context.artifacts.menu as D2Page11Menu;
  const needPages = record(context.artifacts.needs).pages as D2Page11NeedPage[];
  if (!Array.isArray(needPages)) throw new Error('D2_PAGE11_SOURCE_NEEDS');
  const sources: D2Page11GateSources = { pageId: context.page.pageId, actor: context.page.actors[0], menu,
    needsPages: needPages, entities: context.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    access: context.artifacts.access as D2Page11GateSources['access'], categories: context.template.categories,
    templatePaths: context.template.templatePaths, moleculeTags: new Set(context.groups.flatMap(group => group.tags)),
    promptTokens: Math.ceil(Math.max(promptChars, repairPromptChars) / 4) };
  const origins = menuOrigins(context.page, definitions.desktop);
  const groupsByOrganism = Object.fromEntries(origins.map(origin => [origin.organismId, context.selectedGroups[`organism${origin.sourceIndex + 1}`] ?? []]));
  if (!context.page.actors.length) throw new Error('D2_PAGE11_ACTOR_MISSING');
  const kindMismatch = Object.keys(definitions.desktop.organisms).filter(id => definitions.mobile.organisms[id]?.kind !== definitions.desktop.organisms[id].kind);
  const issues = [...gateD2Page11Pair(definitions.desktop, definitions.mobile),
    ...kindMismatch.map(id => ({ code: 'D2_PAGE11_DEVICE_KIND', path: `organisms.${id}`, message: `Organism ${id} has different kinds across devices.` })),
    ...(['desktop', 'mobile'] as const).flatMap(device => [
      ...context.page.actors.flatMap(actor => gateD2Page11(definitions[device], needs[device], { ...sources, actor })),
      ...gateD2MoleculeRoles(definitions[device].molecules, groupsByOrganism, context.groups).map(message => ({ code: 'D2_MOLECULE_ROLE_UNSELECTED', path: device, message })),
    ])];
  if (issues.length) throw new Error(issues.map(issue => `${issue.code}: ${issue.message}`).join(' | '));
  if (origins.some(origin => !origin.organismId)) throw new Error('D2_PAGE11_MENU_ORIGIN_MISSING');
  const sourcesText = Object.fromEntries((['desktop', 'mobile'] as const).map(device => [device, renderD2Page11Definition({ ...context.identity, pageId: context.page.pageId, device }, definitions[device])])) as Record<D2Page11Device, string>;
  const needsText = Object.fromEntries((['desktop', 'mobile'] as const).map(device => [device, JSON.stringify(needs[device])])) as Record<D2Page11Device, string>;
  const receipt: D2PagesReceipt = {
    schemaVersion: D2_PAGES_VERSION, needsVersion: D2_PAGE11_NEEDS_VERSION, ...context.identity, pageId: context.page.pageId,
    inputHash: context.snapshot.snapshotHash,
    template: { category, experience: selectedTemplate.experience, reason: `${raw.categoryReason} ${selectedTemplate.reason}`, reference: selectedTemplate.reference, hash: selectedTemplate.hash, catalogHash: await sha256Text(context.template.catalog) },
    designSystemHash: await sha256Text(context.designSystem),
    moleculeInventoryHash: context.inventory.sourceHash, moleculeHashes: context.moleculeHashes, moleculeGroupAssessments: context.groupAssessments,
    skillHash: await sha256Text(context.skill), promptHash: await sha256Text(context.prompt), promptChars, repairPromptChars,
    sourceHashes: { desktop: await sha256Text(sourcesText.desktop), mobile: await sha256Text(sourcesText.mobile) },
    needsHashes: { desktop: await sha256Text(needsText.desktop), mobile: await sha256Text(needsText.mobile) },
    menuOrigins: origins,
  };
  for (const device of ['desktop', 'mobile'] as const) {
    await writer.writeSource(sourceInfo(context.identity, context.page.pageId, device), sourcesText[device]);
    await writer.writeJson(needsInfo(context.identity, context.page.pageId, device), needs[device]);
  }
  await writer.writeJson(owned(context.identity, context.page.pageId), receipt);
  return receipt;
}

export async function readD2PagesReceipt(identity: D2RunIdentity, pageId: string): Promise<D2PagesReceipt | null> { return readJson<D2PagesReceipt>(owned(identity, pageId)); }
