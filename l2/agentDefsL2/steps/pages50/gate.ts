/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/gate.ts" enhancement="_blank"/>

import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_JUDGMENT_VERSION, buildD2PagePipeline, deriveD2PageOrganisms, knownD2PageCapabilities, resolveD2PageScenarioState, resolveD2PageScenarioSurfaces, type D2PageDescription, type D2PageDevice, type D2PagesJudgment, type D2RenderedPage, type D2PageTemplateSelection } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import type { D2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import type { D2MoleculePublishedRole } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import { D2_PAGE_TECHNICAL_SKILL, resolveD2PageCategory } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';

export function parseD2PagesJudgment(value: unknown): D2PagesJudgment {
  const root = record(value);
  exactKeys(root, ['schemaVersion', 'pageId', 'pageIntent', 'category', 'presentations', 'moleculeResearch'], 'D2_PAGES_SCHEMA');
  if (typeof root.pageIntent !== 'string' || !root.pageIntent.trim()) fail('D2_PAGES_INTENT_MISSING');
  if (root.schemaVersion !== D2_PAGES_JUDGMENT_VERSION) fail('D2_PAGES_SCHEMA_VERSION');
  if (typeof root.pageId !== 'string' || !Array.isArray(root.presentations) || !Array.isArray(root.moleculeResearch)) fail('D2_PAGES_SCHEMA_TRUNCATED');
  const category = record(root.category);
  exactKeys(category, ['categoryRef', 'reason', 'evidenceRefs'], 'D2_PAGES_CATEGORY_SCHEMA');
  if (typeof category.categoryRef !== 'string' || typeof category.reason !== 'string' || !Array.isArray(category.evidenceRefs)) fail('D2_PAGES_SCHEMA_TRUNCATED');
  for (const raw of root.presentations) {
    const presentation = record(raw);
    exactKeys(presentation, ['device', 'descriptions'], 'D2_PAGES_PRESENTATION_SCHEMA');
    if (typeof presentation.device !== 'string' || !Array.isArray(presentation.descriptions)) fail('D2_PAGES_SCHEMA_TRUNCATED');
    for (const rawDescription of presentation.descriptions) {
      const description = record(rawDescription);
      exactKeys(description, ['organismId', 'kind', 'description', 'contentRef', 'capabilityRefs', 'outputFieldRefs'], 'D2_PAGES_DESCRIPTION_SCHEMA');
      if (typeof description.organismId !== 'string' || typeof description.kind !== 'string' || typeof description.description !== 'string' || (description.contentRef !== undefined && typeof description.contentRef !== 'string') || (description.capabilityRefs !== undefined && !Array.isArray(description.capabilityRefs)) || !Array.isArray(description.outputFieldRefs) || description.outputFieldRefs.some(ref => typeof ref !== 'string' || !ref.trim())) fail('D2_PAGES_SCHEMA_TRUNCATED');
    }
  }
  for (const rawNeed of root.moleculeResearch) {
    const need = record(rawNeed);
    exactKeys(need, ['needId', 'roles', 'noMatchReason'], 'D2_PAGES_MOLECULE_SCHEMA');
    if (typeof need.needId !== 'string' || !Array.isArray(need.roles)) fail('D2_PAGES_SCHEMA_TRUNCATED');
    for (const rawRole of need.roles) {
      const role = record(rawRole); exactKeys(role, ['role', 'groupId', 'preferred', 'alternative', 'discardedCandidates'], 'D2_PAGES_MOLECULE_ROLE_SCHEMA');
      const preferred = record(role.preferred); const alternative = role.alternative === undefined ? undefined : record(role.alternative);
      if (typeof role.role !== 'string' || typeof role.groupId !== 'string' || typeof preferred.tag !== 'string' || typeof preferred.reason !== 'string' || (alternative && (typeof alternative.tag !== 'string' || typeof alternative.reason !== 'string')) || !Array.isArray(role.discardedCandidates)) fail('D2_PAGES_SCHEMA_TRUNCATED');
      for (const rawDiscard of role.discardedCandidates) { const discard = record(rawDiscard); exactKeys(discard, ['tag', 'reason'], 'D2_PAGES_MOLECULE_DISCARD_SCHEMA'); if (typeof discard.tag !== 'string' || typeof discard.reason !== 'string') fail('D2_PAGES_SCHEMA_TRUNCATED'); }
    }
    if (need.noMatchReason !== undefined && typeof need.noMatchReason !== 'string') fail('D2_PAGES_SCHEMA_TRUNCATED');
  }
  return root as unknown as D2PagesJudgment;
}

/** Shared coverage owns content and capability references; resolve them by stable organism identity. */
export function normalizeD2PageCoverage(judgment: D2PagesJudgment, shared: D2SharedDefinition): D2PagesJudgment {
  const coverageById = new Map<string, D2SharedDefinition['coverage'][number]>();
  for (const item of shared.coverage) {
    if (!item.organismId || coverageById.has(item.organismId)) throw new Error(`D2_PAGES_SHARED_COVERAGE_ID_INVALID: ${item.organismId}`);
    coverageById.set(item.organismId, item);
  }
  const presentations = judgment.presentations.map(presentation => {
    const seen = new Set<string>();
    const descriptions = presentation.descriptions.map(description => {
      const coverage = coverageById.get(description.organismId);
      if (!description.organismId || seen.has(description.organismId) || !coverage) return description;
      seen.add(description.organismId);
      return { ...description, contentRef: coverage.contentRef, capabilityRefs: [...coverage.capabilityRefs] };
    });
    return { ...presentation, descriptions };
  });
  return { ...judgment, presentations };
}

export function gateD2Pages(
  moduleName: string,
  page: D2SelectedPage,
  shared: D2SharedDefinition,
  judgment: D2PagesJudgment,
  categoryContext: D2PageSkillsContext,
  templateSelection: D2PageTemplateSelection,
  moleculeRoles: readonly D2MoleculePublishedRole[],
): D2RenderedPage[] {
  const errors: string[] = [];
  if (judgment.pageId !== page.pageId) errors.push(`D2_PAGES_PAGE_CHANGED: ${judgment.pageId}`);
  if (!judgment.pageIntent?.trim()) errors.push('D2_PAGES_INTENT_MISSING');
  const byDevice = new Map<D2PageDevice, D2PagesJudgment['presentations'][number]>();
  for (const presentation of judgment.presentations) {
    if (presentation.device !== 'desktop' && presentation.device !== 'mobile') { errors.push(`D2_PAGES_DEVICE_UNKNOWN: ${presentation.device}`); continue; }
    if (byDevice.has(presentation.device)) errors.push(`D2_PAGES_DEVICE_DUPLICATE: ${presentation.device}`);
    byDevice.set(presentation.device, presentation);
  }
  for (const device of ['desktop', 'mobile'] as const) if (!byDevice.has(device)) errors.push(`D2_PAGES_DEVICE_MISSING: ${device}`);
  const known = new Set(knownD2PageCapabilities(shared));
  const contentRefs = new Set(shared.coverage.map(item => item.contentRef));
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
    const seen = new Set<string>();
    if (!presentation.descriptions.length) errors.push(`D2_PAGES_DESCRIPTIONS_EMPTY: ${prefix}`);
    for (const description of presentation.descriptions) {
      const at = `${prefix}/${description.organismId}`; const expected = expectedById.get(description.organismId);
      if (seen.has(description.organismId)) errors.push(`D2_PAGES_ORGANISM_DUPLICATE: ${at}`); seen.add(description.organismId);
      if (!expected) { errors.push(`D2_PAGES_ORGANISM_UNKNOWN: ${at}`); continue; }
      if (description.kind !== expected.kind) errors.push(`D2_PAGES_ORGANISM_KIND_CHANGED: ${at} expected=${expected.kind}`);
      if (!description.description.trim()) errors.push(`D2_PAGES_DESCRIPTION_EMPTY: ${at}`);
      if (!description.contentRef) errors.push(`D2_PAGES_CONTENT_REF_MISSING: ${at}`);
      else if (!contentRefs.has(description.contentRef)) errors.push(`D2_PAGES_CONTENT_REF_UNKNOWN: ${at} -> ${description.contentRef}`);
      if (!description.capabilityRefs.length && !expected.staticContent) errors.push(`D2_PAGES_CAPABILITIES_EMPTY: ${at}`);
      for (const ref of description.capabilityRefs) if (!known.has(ref)) errors.push(`D2_PAGES_CAPABILITY_UNKNOWN: ${at} -> ${ref}`);
      if (new Set(description.capabilityRefs).size !== description.capabilityRefs.length) errors.push(`D2_PAGES_CAPABILITY_DUPLICATE: ${at}`);
      const coverage = shared.coverage.find(item => item.organismId === description.organismId);
      const allowedOutputRefs = new Set(description.capabilityRefs.flatMap(capability => (coverage?.outputFieldsByCapability[capability] ?? []).map(field => `${field.outputTypeRef}.${field.path}`)));
      if (new Set(description.outputFieldRefs).size !== description.outputFieldRefs.length) errors.push(`D2_PAGES_OUTPUT_FIELD_DUPLICATE: ${at}`);
      for (const ref of description.outputFieldRefs) if (!allowedOutputRefs.has(ref)) errors.push(`D2_PAGES_OUTPUT_FIELD_OUTSIDE_CAPABILITY: ${at} -> ${ref}`);
      if (allowedOutputRefs.size > 0 && description.outputFieldRefs.length === 0) errors.push(`D2_PAGES_OUTPUT_FIELD_EVIDENCE_MISSING: ${at}`);
      if (!coverage) errors.push(`D2_PAGES_SHARED_COVERAGE_MISSING: ${at}`);
      else {
        if (coverage.contentRef !== description.contentRef) errors.push(`D2_PAGES_CONTENT_CHANGED: ${at}`);
        for (const ref of coverage.capabilityRefs) if (!description.capabilityRefs.includes(ref)) errors.push(`D2_PAGES_CAPABILITY_MISSING: ${at} -> ${ref}`);
        for (const ref of description.capabilityRefs) if (!coverage.capabilityRefs.includes(ref)) errors.push(`D2_PAGES_CAPABILITY_OUTSIDE_ORGANISM: ${at} -> ${ref}`);
        const outputRefs = new Set(description.capabilityRefs.flatMap(capability => (coverage.outputFieldsByCapability[capability] ?? []).map(field => `${field.outputTypeRef}.${field.path}`)));
        for (const ref of description.outputFieldRefs) if (!outputRefs.has(ref)) errors.push(`D2_PAGES_OUTPUT_FIELD_OUTSIDE_CAPABILITY: ${at} -> ${ref}`);
      }
      const prose = description.description;
      if (/<\/?[a-z][^>]*>|```(?:html|css)|\b(?:display|grid-template|position)\s*:|\b(?:two|three|2|3)[ -]column\b/iu.test(prose)) errors.push(`D2_PAGES_LAYOUT_PRESCRIPTION: ${at} evidence=${evidence(prose)}`);
      if (!shared.dataBindings.length && /\b(?:dashboard|statistics?|metrics?|aggregate|totals?)\b/iu.test(prose)) errors.push(`D2_PAGES_DATA_CLAIM_UNSUPPORTED: ${at} evidence=${evidence(prose)}`);
    }
    for (const organism of organisms) if (!seen.has(organism.organismId)) errors.push(`D2_PAGES_ORGANISM_MISSING: ${prefix}/${organism.organismId}`);
  }
  const desktop = byDevice.get('desktop'); const mobile = byDevice.get('mobile');
  if (desktop && mobile) {
    for (const organism of organisms) {
      const left = desktop.descriptions.find(item => item.organismId === organism.organismId); const right = mobile.descriptions.find(item => item.organismId === organism.organismId);
    if (left && right && (left.kind !== right.kind || left.contentRef !== right.contentRef || setKey(left.capabilityRefs) !== setKey(right.capabilityRefs) || setKey(left.outputFieldRefs) !== setKey(right.outputFieldRefs))) errors.push(`D2_PAGES_ORGANISM_PARITY: ${page.pageId}/${organism.organismId}`);
    }
    if (desktop.descriptions.map(item => item.description).join('\0') === mobile.descriptions.map(item => item.description).join('\0')) errors.push('D2_PAGES_DEVICE_DIFFERENCE');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return (['desktop', 'mobile'] as const).map(device => {
    const presentation = byDevice.get(device)!;
    const roles = moleculeRoles.filter(role => role.device === device);
    for (const role of roles) if (!expectedById.has(role.organismId)) throw new Error(`D2_PAGES_MOLECULE_ROLE_ORGANISM_UNKNOWN: ${role.organismId}`);
    const skills = [D2_PAGE_TECHNICAL_SKILL, category!.skillReference, ...templateSelection.sources.map(source => source.reference), ...roles.flatMap(role => [role.preferred.indexReference, role.preferred.usageContractReference, ...(role.alternative ? [role.alternative.indexReference, role.alternative.usageContractReference] : [])])];
    const descriptions = organisms.map(organism => { const submitted = presentation.descriptions.find(item => item.organismId === organism.organismId)!; return { ...submitted, organismId: organism.organismId, kind: organism.kind, description: submitted.description.trim() } as D2PageDescription; });
    const coverage = descriptions.map(description => {
      const source = shared.coverage.find(item => item.organismId === description.organismId)!;
      return { organismId: source.organismId, sourceIndex: source.sourceIndex, kind: source.kind, contentRef: source.contentRef, scenarioRefs: [...source.scenarioRefs], capabilityRefs: [...source.capabilityRefs], outputFieldsByCapability: structuredClone(source.outputFieldsByCapability), moleculeRecommendations: roles.filter(role => role.organismId === description.organismId) };
    });
    const semanticRefs: string[] = [];
    return { device, pageId: page.pageId, pageLabel: page.label, pageIntent: judgment.pageIntent, actors: page.actors, authorityRefs: page.authorityRefs, operationBindings: page.operationBindings, descriptions, coverage, templateSelection, semanticRefs, pipeline: [buildD2PagePipeline(moduleName, page.pageId, device, category!.categoryRef, skills, templateSelection, coverage, semanticRefs)] };
  });
}

function setKey(values: string[]): string { return [...new Set(values)].sort().join('\0'); }
function evidence(value: string): string { return JSON.stringify(value.replace(/\s+/gu, ' ').slice(0, 160)); }
function exactKeys(value: Record<string, unknown>, allowed: string[], prefix: string): void { const extra = Object.keys(value).find(key => !allowed.includes(key)); if (extra) fail(`${prefix}_UNKNOWN_KEY: ${extra}`); }
function fail(message: string): never { throw new Error(message); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
