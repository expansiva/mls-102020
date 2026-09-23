/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/gate.ts" enhancement="_blank"/>

import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_JUDGMENT_VERSION, buildD2PagePipeline, deriveD2PageOrganisms, knownD2PageCapabilities, resolveD2PageScenarioState, resolveD2PageScenarioSurfaces, type D2PageDescription, type D2PageDevice, type D2PagesJudgment, type D2RenderedPage } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
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
    exactKeys(presentation, ['device', 'descriptions', 'moleculeReason'], 'D2_PAGES_PRESENTATION_SCHEMA');
    if (typeof presentation.device !== 'string' || !Array.isArray(presentation.descriptions) || typeof presentation.moleculeReason !== 'string') fail('D2_PAGES_SCHEMA_TRUNCATED');
    for (const rawDescription of presentation.descriptions) {
      const description = record(rawDescription);
      exactKeys(description, ['organismId', 'kind', 'description', 'contentRef', 'capabilityRefs', 'moleculeRecommendations'], 'D2_PAGES_DESCRIPTION_SCHEMA');
      if (typeof description.organismId !== 'string' || typeof description.kind !== 'string' || typeof description.description !== 'string' || typeof description.contentRef !== 'string' || !Array.isArray(description.capabilityRefs) || !Array.isArray(description.moleculeRecommendations)) fail('D2_PAGES_SCHEMA_TRUNCATED');
      for (const rawRecommendation of description.moleculeRecommendations) {
        const recommendation = record(rawRecommendation);
        exactKeys(recommendation, ['groupId', 'candidates', 'reason'], 'D2_PAGES_MOLECULE_SCHEMA');
        if (typeof recommendation.groupId !== 'string' || !Array.isArray(recommendation.candidates) || typeof recommendation.reason !== 'string') fail('D2_PAGES_SCHEMA_TRUNCATED');
      }
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
  const scenarios = new Set(shared.scenaries.map(item => item.value));
  try { resolveD2PageScenarioState(shared); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  try { resolveD2PageScenarioSurfaces(shared); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  let organisms: ReturnType<typeof deriveD2PageOrganisms> = [];
  try { organisms = deriveD2PageOrganisms(page); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  const expectedById = new Map(organisms.map(item => [item.organismId, item]));
  let category;
  try { category = resolveD2PageCategory(categoryContext, judgment.category.categoryRef); }
  catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  if (!judgment.category.reason.trim()) errors.push('D2_PAGE_CATEGORY_REASON_MISSING');
  if (!judgment.category.evidenceRefs.length) errors.push('D2_PAGE_CATEGORY_EVIDENCE_MISSING');
  for (const ref of judgment.category.evidenceRefs) if (!known.has(ref)) errors.push(`D2_PAGE_CATEGORY_EVIDENCE_UNKNOWN: ${ref}`);
  for (const presentation of byDevice.values()) {
    const prefix = `${page.pageId}/${presentation.device}`;
    const seen = new Set<string>(); const contentRefs = new Set<string>();
    if (!presentation.descriptions.length) errors.push(`D2_PAGES_DESCRIPTIONS_EMPTY: ${prefix}`);
    if (!presentation.moleculeReason.trim()) errors.push(`D2_PAGES_MOLECULE_REASON_MISSING: ${presentation.device}`);
    for (const description of presentation.descriptions) {
      const at = `${prefix}/${description.organismId}`; const expected = expectedById.get(description.organismId);
      if (seen.has(description.organismId)) errors.push(`D2_PAGES_ORGANISM_DUPLICATE: ${at}`); seen.add(description.organismId);
      if (!expected) { errors.push(`D2_PAGES_ORGANISM_UNKNOWN: ${at}`); continue; }
      if (description.kind !== expected.kind) errors.push(`D2_PAGES_ORGANISM_KIND_CHANGED: ${at} expected=${expected.kind}`);
      if (!description.description.trim()) errors.push(`D2_PAGES_DESCRIPTION_EMPTY: ${at}`);
      if (!description.contentRef) errors.push(`D2_PAGES_CONTENT_REF_MISSING: ${at}`);
      else if (!scenarios.has(description.contentRef)) errors.push(`D2_PAGES_CONTENT_REF_UNKNOWN: ${at} -> ${description.contentRef}`);
      else contentRefs.add(description.contentRef);
      if (!description.capabilityRefs.length && !expected.staticContent) errors.push(`D2_PAGES_CAPABILITIES_EMPTY: ${at}`);
      for (const ref of description.capabilityRefs) if (!known.has(ref)) errors.push(`D2_PAGES_CAPABILITY_UNKNOWN: ${at} -> ${ref}`);
      if (new Set(description.capabilityRefs).size !== description.capabilityRefs.length) errors.push(`D2_PAGES_CAPABILITY_DUPLICATE: ${at}`);
      const recommendationGroups = new Set<string>();
      for (const recommendation of description.moleculeRecommendations) {
        if (recommendationGroups.has(recommendation.groupId)) errors.push(`D2_PAGES_MOLECULE_GROUP_DUPLICATE: ${at} -> ${recommendation.groupId}`); recommendationGroups.add(recommendation.groupId);
        if (!groupSkills.has(recommendation.groupId)) errors.push(`D2_PAGES_GROUP_UNKNOWN: ${at} -> ${recommendation.groupId}`);
        if (!recommendation.reason.trim()) errors.push(`D2_PAGES_MOLECULE_REASON_MISSING: ${at} -> ${recommendation.groupId}`);
        const available = groupCandidates.get(recommendation.groupId);
        for (const candidate of recommendation.candidates) if (!available?.has(candidate)) errors.push(`D2_PAGES_MOLECULE_CANDIDATE_UNKNOWN: ${at} -> ${candidate}`);
        if (new Set(recommendation.candidates).size !== recommendation.candidates.length) errors.push(`D2_PAGES_MOLECULE_CANDIDATE_DUPLICATE: ${at} -> ${recommendation.groupId}`);
        if (!moleculeCompatible(recommendation.groupId, description.capabilityRefs, shared)) errors.push(`D2_PAGES_MOLECULE_CAPABILITY_MISMATCH: ${at} -> ${recommendation.groupId}`);
      }
      const prose = description.description;
      if (/<\/?[a-z][^>]*>|```(?:html|css)|\b(?:display|grid-template|position)\s*:|\b(?:two|three|2|3)[ -]column\b/iu.test(prose)) errors.push(`D2_PAGES_LAYOUT_PRESCRIPTION: ${at} evidence=${evidence(prose)}`);
      if (!shared.dataBindings.length && /\b(?:dashboard|statistics?|metrics?|aggregate|totals?)\b/iu.test(prose)) errors.push(`D2_PAGES_DATA_CLAIM_UNSUPPORTED: ${at} evidence=${evidence(prose)}`);
    }
    for (const organism of organisms) if (!seen.has(organism.organismId)) errors.push(`D2_PAGES_ORGANISM_MISSING: ${prefix}/${organism.organismId}`);
    for (const scenario of scenarios) if (!contentRefs.has(scenario)) errors.push(`D2_PAGES_SCENARIO_UNCOVERED: ${prefix}/${scenario}`);
  }
  const desktop = byDevice.get('desktop'); const mobile = byDevice.get('mobile');
  if (desktop && mobile) {
    for (const organism of organisms) {
      const left = desktop.descriptions.find(item => item.organismId === organism.organismId); const right = mobile.descriptions.find(item => item.organismId === organism.organismId);
      if (left && right && (left.kind !== right.kind || left.contentRef !== right.contentRef || setKey(left.capabilityRefs) !== setKey(right.capabilityRefs))) errors.push(`D2_PAGES_ORGANISM_PARITY: ${page.pageId}/${organism.organismId}`);
    }
    if (desktop.descriptions.map(item => item.description).join('\0') === mobile.descriptions.map(item => item.description).join('\0')) errors.push('D2_PAGES_DEVICE_DIFFERENCE');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return (['desktop', 'mobile'] as const).map(device => {
    const presentation = byDevice.get(device)!;
    const groups = presentation.descriptions.flatMap(item => item.moleculeRecommendations.map(recommendation => recommendation.groupId));
    const skills = [D2_PAGE_TECHNICAL_SKILL, category!.skillReference, ...groups.flatMap(group => groupSkills.get(group) || [])];
    const descriptions = organisms.map(organism => { const submitted = presentation.descriptions.find(item => item.organismId === organism.organismId)!; return { ...submitted, organismId: organism.organismId, kind: organism.kind, description: submitted.description.trim() } as D2PageDescription; });
    return { device, descriptions, pipeline: [buildD2PagePipeline(moduleName, page.pageId, device, category!.categoryRef, skills)] };
  });
}

function moleculeCompatible(groupId: string, refs: string[], shared: D2SharedDefinition): boolean {
  const actions = shared.actions.filter(item => refs.includes(item.actionId)); const states = shared.states.filter(item => refs.includes(item.stateKey));
  if (/^groupView(?:Data|Table)/u.test(groupId)) return actions.some(item => item.kind === 'query') || states.some(item => item.kind === 'queryResult');
  if (/^groupEnter/u.test(groupId)) return actions.some(item => item.kind === 'stateSetter' || item.kind === 'command') || states.some(item => item.kind === 'input');
  if (groupId === 'groupTriggerAction') return actions.some(item => item.kind === 'command');
  if (groupId === 'groupNotifyUser') return actions.some(item => !!item.statusStateKey || !!item.errorStateKey) || states.some(item => item.kind === 'actionStatus' || item.kind === 'actionError');
  return refs.length > 0;
}

function setKey(values: string[]): string { return [...new Set(values)].sort().join('\0'); }
function evidence(value: string): string { return JSON.stringify(value.replace(/\s+/gu, ' ').slice(0, 160)); }
function exactKeys(value: Record<string, unknown>, allowed: string[], prefix: string): void { const extra = Object.keys(value).find(key => !allowed.includes(key)); if (extra) fail(`${prefix}_UNKNOWN_KEY: ${extra}`); }
function fail(message: string): never { throw new Error(message); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
