/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/gate.ts" enhancement="_blank"/>

import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_JUDGMENT_VERSION, buildD2PagePipeline, knownD2PageCapabilities, type D2PageDevice, type D2PagesJudgment, type D2RenderedPage } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import type { D2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { D2_PAGE_TECHNICAL_SKILL, resolveD2PageCategory } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';

export function parseD2PagesJudgment(value: unknown): D2PagesJudgment {
  const root = record(value);
  exactKeys(root, ['schemaVersion', 'pageId', 'category', 'presentations'], 'D2_PAGES_SCHEMA');
  if (root.schemaVersion !== D2_PAGES_JUDGMENT_VERSION) fail('D2_PAGES_SCHEMA_VERSION');
  if (typeof root.pageId !== 'string' || !Array.isArray(root.presentations)) fail('D2_PAGES_SCHEMA_TRUNCATED');
  const category = record(root.category);
  exactKeys(category, ['categoryRef', 'reason', 'evidenceRefs'], 'D2_PAGES_CATEGORY_SCHEMA');
  if (typeof category.categoryRef !== 'string' || typeof category.reason !== 'string' || !Array.isArray(category.evidenceRefs)) fail('D2_PAGES_SCHEMA_TRUNCATED');
  for (const raw of root.presentations) {
    const presentation = record(raw);
    exactKeys(presentation, ['device', 'descriptions', 'capabilityRefs', 'groupIds', 'moleculeRecommendations', 'moleculeReason'], 'D2_PAGES_PRESENTATION_SCHEMA');
    if (typeof presentation.device !== 'string' || !Array.isArray(presentation.descriptions) || !Array.isArray(presentation.capabilityRefs) || !Array.isArray(presentation.groupIds) || !Array.isArray(presentation.moleculeRecommendations) || typeof presentation.moleculeReason !== 'string') fail('D2_PAGES_SCHEMA_TRUNCATED');
    for (const rawRecommendation of presentation.moleculeRecommendations) {
      const recommendation = record(rawRecommendation);
      exactKeys(recommendation, ['groupId', 'candidates', 'reason'], 'D2_PAGES_MOLECULE_SCHEMA');
      if (typeof recommendation.groupId !== 'string' || !Array.isArray(recommendation.candidates) || typeof recommendation.reason !== 'string') fail('D2_PAGES_SCHEMA_TRUNCATED');
    }
  }
  return root as unknown as D2PagesJudgment;
}

export function gateD2Pages(
  moduleName: string,
  page: D2SelectedPage,
  shared: D2SharedDefinition,
  judgment: D2PagesJudgment,
  groupSkills: ReadonlyMap<string, string[]>,
  categoryContext: D2PageSkillsContext,
  groupCandidates: ReadonlyMap<string, ReadonlySet<string>>,
): D2RenderedPage[] {
  const errors: string[] = [];
  if (judgment.pageId !== page.pageId) errors.push(`D2_PAGES_PAGE_CHANGED: ${judgment.pageId}`);
  const byDevice = new Map<D2PageDevice, D2PagesJudgment['presentations'][number]>();
  for (const presentation of judgment.presentations) {
    if (presentation.device !== 'desktop' && presentation.device !== 'mobile') { errors.push(`D2_PAGES_DEVICE_UNKNOWN: ${presentation.device}`); continue; }
    if (byDevice.has(presentation.device)) errors.push(`D2_PAGES_DEVICE_DUPLICATE: ${presentation.device}`);
    byDevice.set(presentation.device, presentation);
  }
  for (const device of ['desktop', 'mobile'] as const) if (!byDevice.has(device)) errors.push(`D2_PAGES_DEVICE_MISSING: ${device}`);
  const known = new Set(knownD2PageCapabilities(shared));
  let category;
  try { category = resolveD2PageCategory(categoryContext, judgment.category.categoryRef); }
  catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  if (!judgment.category.reason.trim()) errors.push('D2_PAGE_CATEGORY_REASON_MISSING');
  if (!judgment.category.evidenceRefs.length) errors.push('D2_PAGE_CATEGORY_EVIDENCE_MISSING');
  for (const ref of judgment.category.evidenceRefs) if (!known.has(ref)) errors.push(`D2_PAGE_CATEGORY_EVIDENCE_UNKNOWN: ${ref}`);
  for (const presentation of byDevice.values()) {
    if (!Array.isArray(presentation.descriptions) || !presentation.descriptions.length || presentation.descriptions.some(item => typeof item !== 'string' || !item.trim())) errors.push(`D2_PAGES_DESCRIPTIONS_EMPTY: ${presentation.device}`);
    if (!Array.isArray(presentation.capabilityRefs) || !presentation.capabilityRefs.length) errors.push(`D2_PAGES_CAPABILITIES_EMPTY: ${presentation.device}`);
    for (const ref of presentation.capabilityRefs || []) if (!known.has(ref)) errors.push(`D2_PAGES_CAPABILITY_UNKNOWN: ${presentation.device} -> ${ref}`);
    for (const group of presentation.groupIds || []) if (!groupSkills.has(group)) errors.push(`D2_PAGES_GROUP_UNKNOWN: ${presentation.device} -> ${group}`);
    if (!presentation.moleculeReason.trim()) errors.push(`D2_PAGES_MOLECULE_REASON_MISSING: ${presentation.device}`);
    const recommendationGroups = new Set<string>();
    for (const recommendation of presentation.moleculeRecommendations || []) {
      if (recommendationGroups.has(recommendation.groupId)) errors.push(`D2_PAGES_MOLECULE_GROUP_DUPLICATE: ${presentation.device} -> ${recommendation.groupId}`);
      recommendationGroups.add(recommendation.groupId);
      if (!presentation.groupIds.includes(recommendation.groupId)) errors.push(`D2_PAGES_MOLECULE_GROUP_UNSELECTED: ${presentation.device} -> ${recommendation.groupId}`);
      if (!recommendation.reason.trim()) errors.push(`D2_PAGES_MOLECULE_REASON_MISSING: ${presentation.device} -> ${recommendation.groupId}`);
      const available = groupCandidates.get(recommendation.groupId);
      for (const candidate of recommendation.candidates) if (!available?.has(candidate)) errors.push(`D2_PAGES_MOLECULE_CANDIDATE_UNKNOWN: ${presentation.device} -> ${candidate}`);
      if (new Set(recommendation.candidates).size !== recommendation.candidates.length) errors.push(`D2_PAGES_MOLECULE_CANDIDATE_DUPLICATE: ${presentation.device} -> ${recommendation.groupId}`);
    }
    const prose = (presentation.descriptions || []).join('\n');
    if (/<\/?[a-z][^>]*>|```(?:html|css)|\b(?:display|grid-template|position)\s*:|\b(?:two|three|2|3)[ -]column\b/iu.test(prose)) errors.push(`D2_PAGES_LAYOUT_PRESCRIPTION: ${presentation.device} evidence=${evidence(prose)}`);
    if (!shared.dataBindings.length && /\b(?:dashboard|statistics?|metrics?|aggregate|totals?)\b/iu.test(prose)) errors.push(`D2_PAGES_DATA_CLAIM_UNSUPPORTED: ${presentation.device} evidence=${evidence(prose)}`);
  }
  const desktop = byDevice.get('desktop'); const mobile = byDevice.get('mobile');
  if (desktop && mobile) {
    if (setKey(desktop.capabilityRefs) !== setKey(mobile.capabilityRefs)) errors.push('D2_PAGES_CAPABILITY_PARITY');
    if (JSON.stringify(desktop.descriptions) === JSON.stringify(mobile.descriptions)) errors.push('D2_PAGES_DEVICE_DIFFERENCE');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return (['desktop', 'mobile'] as const).map(device => {
    const presentation = byDevice.get(device)!;
    const skills = [D2_PAGE_TECHNICAL_SKILL, category!.skillReference, ...presentation.groupIds.flatMap(group => groupSkills.get(group) || [])];
    return { device, descriptions: presentation.descriptions.map(item => item.trim()), pipeline: [buildD2PagePipeline(moduleName, page.pageId, device, category!.categoryRef, skills)] };
  });
}

function setKey(values: string[]): string { return [...new Set(values)].sort().join('\0'); }
function evidence(value: string): string { return JSON.stringify(value.replace(/\s+/gu, ' ').slice(0, 160)); }
function exactKeys(value: Record<string, unknown>, allowed: string[], prefix: string): void { const extra = Object.keys(value).find(key => !allowed.includes(key)); if (extra) fail(`${prefix}_UNKNOWN_KEY: ${extra}`); }
function fail(message: string): never { throw new Error(message); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
