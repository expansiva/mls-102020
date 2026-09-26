/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/render.ts" enhancement="_blank"/>

import type { D2PageCoverageItem, D2PagePipelineItem, D2RenderedPage } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { assertD2HeaderReference, d2Header } from '/_102020_/l2/agentDefsL2/helpers/d2Header.js';

export function renderD2Page(page: D2RenderedPage, project?: number): string {
  return `${d2Header(page.pipeline[0].defPath, project)}\n\nexport const definition = ${JSON.stringify(pageDefinition(page))} as const;\n\nexport const pipeline = ${JSON.stringify(page.pipeline, null, 2)} as const;\n`;
}

export function pageDefinition(page: D2RenderedPage): string {
  const pipeline = page.pipeline[0];
  const lines = [
    `Page: ${page.pageLabel} (${page.pageId}).`,
    `Purpose: ${page.pageIntent.trim()}`,
    `Actors: ${page.actors.length ? page.actors.join(', ') : 'as authorized by the shared contract'}.`,
    `Experience: ${pipeline.templateSelection.experienceId ?? 'category guidance'}; ${pipeline.templateSelection.reason}`,
    `Selected source: ${pipeline.templateSelection.sources.map(source => `${source.reference} ${source.sha256}`).join('; ') || 'published category catalog entry only'}.`,
    `Authority references: ${page.authorityRefs.length ? page.authorityRefs.join(', ') : 'none declared'}.`,
    'The approved shared definition, DTOs, grants, rules and design-system dependencies are authoritative. Do not add operations, data, state, permissions, totals or saves absent from those sources.',
    ...operationLines(page.operationBindings),
    `Presentation: ${page.device}.`,
    ...(page.device === 'mobile' ? [
      'Compose for a fluid narrow viewport: preview at 390px and check 360px and 430px. Reflow lists, details and panels into a readable sequence where needed; do not squeeze a desktop table or allow horizontal overflow. Keep actions touch-accessible and keyboard operable. Choose the sequence for this page rather than applying one mobile template everywhere.',
    ] : []),
    'Each organism below belongs to its existing shared content scenario. When that scenario is inactive, keep its content mounted but hidden, inert and outside keyboard focus. Do not invent content scenarios or controls.',
    ...page.descriptions.map(description => {
      const coverage = pipeline.coverage.find(item => item.organismId === description.organismId);
      if (!coverage) throw new Error(`D2_PAGES_COVERAGE_MISSING: ${page.pageId}/${description.organismId}`);
      const caps = coverage.capabilityRefs.length ? coverage.capabilityRefs.join(', ') : 'static content';
      return `Organism ${coverage.organismId} (${coverage.kind}) in content ${coverage.contentRef}; declared capabilities/actions: ${caps}. ${description.description.trim()}`;
    }),
  ];
  return lines.join('\n\n');
}

export function parseD2RenderedPage(source: string): { definition: string; pipeline: D2PagePipelineItem[] } {
  const definition = parseExport(source, 'definition');
  const pipeline = parseExport(source, 'pipeline');
  if (typeof definition !== 'string' || !Array.isArray(pipeline)) throw new Error('D2_PAGES_CONSUMER_SHAPE');
  for (const raw of pipeline) validatePipeline(record(raw));
  return { definition, pipeline: pipeline as D2PagePipelineItem[] };
}

function validatePipeline(item: Record<string, unknown>): void {
  exactKeys(item, ['id', 'type', 'defPath', 'outputPath', 'dependsFiles', 'dependsOn', 'categoryRef', 'skills', 'templateSelection', 'coverage']);
  const id = text(item.id); const match = /^(.+)__(desktop|mobile)__page11$/u.exec(id);
  if (!match || item.type !== 'l2_page' || !text(item.categoryRef) || !stringArray(item.skills) || !(item.skills as unknown[]).length || !stringArray(item.dependsFiles) || !stringArray(item.dependsOn) || !Array.isArray(item.coverage)) throw new Error('D2_PAGES_PIPELINE_SHAPE');
  const template = record(item.templateSelection);
  exactKeys(template, ['categoryRef', 'targetPage', 'experiencePage', 'experienceId', 'styleId', 'layoutId', 'reason', 'requirementsMet', 'digest', 'sources']);
  if (template.categoryRef !== item.categoryRef || template.targetPage !== 'page11' || !text(template.reason) || !text(template.digest) || !stringArray(template.requirementsMet) || !Array.isArray(template.sources)) throw new Error('D2_PAGES_TEMPLATE_CONTEXT');
  for (const raw of template.sources) {
    const source = record(raw); exactKeys(source, ['role', 'reference', 'sha256']);
    if (!text(source.role) || !text(source.reference) || !/^sha256:[a-f0-9]{64}$/u.test(text(source.sha256))) throw new Error('D2_PAGES_TEMPLATE_SOURCE');
  }
  for (const raw of item.coverage) validateCoverage(record(raw));
  const pageId = match[1]; const device = match[2];
  const defMatch = new RegExp(`^l2/([^/]+)/web/${device}/page11/${escapeRegExp(pageId)}\\.defs\\.ts$`, 'u').exec(text(item.defPath));
  if (!defMatch || item.outputPath !== text(item.defPath).replace('.defs.ts', '.ts') || (item.dependsOn as string[]).join('\0') !== `${pageId}__l2_shared`
    || (item.dependsFiles as string[]).slice(0, 5).join('\0') !== `l2/${defMatch[1]}/web/shared/${pageId}.ts\0l2/designSystem.ts\0l2/${defMatch[1]}/web/contracts/${pageId}.defs.ts\0_102029_.d.ts\0_102020_/l2/molecules/ml-scenary.ts`
    || (item.dependsFiles as string[]).slice(5).some(ref => !/^(?:_[0-9]+_\/)?l4\/[A-Za-z0-9_/-]+\.(?:defs\.ts|json|ts|md)$/u.test(ref))) throw new Error('D2_PAGES_PIPELINE_CONTEXT');
  const refs = (template.sources as unknown[]).map(raw => text(record(raw).reference));
  if (refs.some(reference => !(item.skills as string[]).includes(reference))) throw new Error('D2_PAGES_TEMPLATE_SKILL_MISSING');
}

function validateCoverage(item: Record<string, unknown>): void {
  exactKeys(item, ['organismId', 'sourceIndex', 'kind', 'contentRef', 'scenarioRefs', 'capabilityRefs', 'moleculeRecommendations']);
  if (!text(item.organismId) || !Number.isSafeInteger(item.sourceIndex) || !text(item.kind) || !text(item.contentRef) || !stringArray(item.scenarioRefs) || !stringArray(item.capabilityRefs) || !Array.isArray(item.moleculeRecommendations)) throw new Error('D2_PAGES_COVERAGE_SHAPE');
  for (const raw of item.moleculeRecommendations) {
    const recommendation = record(raw);
    exactKeys(recommendation, ['groupId', 'candidates', 'reason', 'indexReference', 'indexVia', 'indexSha256', 'usageContractReference', 'usageContractVia', 'usageContractSha256']);
    if (!text(recommendation.groupId) || !stringArray(recommendation.candidates) || !(recommendation.candidates as unknown[]).length || !text(recommendation.reason)
      || !text(recommendation.indexReference) || !text(recommendation.indexVia) || !/^sha256:[a-f0-9]{64}$/u.test(text(recommendation.indexSha256))
      || !text(recommendation.usageContractReference) || !text(recommendation.usageContractVia) || !/^sha256:[a-f0-9]{64}$/u.test(text(recommendation.usageContractSha256))) throw new Error('D2_PAGES_MOLECULE_PROVENANCE');
  }
}

function operationLines(bindings: D2RenderedPage['operationBindings']): string[] {
  return (bindings ?? []).map(binding => {
    const rules = binding.ruleRefs.map(ref => `${ref.ruleId} (${ref.file}#${ref.symbol})`).join(', ') || 'none';
    return `Operation ${binding.operation} on ${binding.entityId}: actor ${binding.actorRef}; grants ${binding.grantRefs.join(', ') || 'none'}; authorities ${binding.authorities.join(', ') || 'none'}; rules ${rules}.`;
  });
}

function exactKeys(value: Record<string, unknown>, allowed: string[]): void { if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('D2_PAGES_CONSUMER_SHAPE'); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function stringArray(value: unknown): boolean { return Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim()); }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'); }

export function assertD2RenderedPage(source: string): void {
  const parsed = parseD2RenderedPage(source);
  if (parsed.pipeline.length !== 1) throw new Error('D2_PAGES_PIPELINE_COUNT');
  assertD2HeaderReference(source, parsed.pipeline[0].defPath);
  const exports = [...source.matchAll(/export const\s+([A-Za-z0-9_]+)/gu)].map(match => match[1]);
  if (exports.join(',') !== 'definition,pipeline') throw new Error(`D2_PAGES_EXPORTS: ${exports.join(',')}`);
  if (!parsed.definition.trim() || /```(?:html|css)|<\/?[A-Za-z][^>]*>/iu.test(parsed.definition)) throw new Error('D2_PAGES_DEFINITION_INVALID');
}

function parseExport(source: string, name: string): unknown {
  const match = new RegExp(`export const ${name} = `).exec(source);
  if (!match) throw new Error(`D2_PAGES_EXPORT_MISSING: ${name}`);
  const start = match.index + match[0].length;
  let quoted = false;
  for (let end = start; end < source.length; end++) {
    const char = source[end];
    if (quoted && char === '\\') { end++; continue; }
    if (char === '"') quoted = !quoted;
    if (!quoted && source.startsWith(' as const;', end)) {
      try { return JSON.parse(source.slice(start, end)); } catch { break; }
    }
  }
  throw new Error(`D2_PAGES_EXPORT_INVALID: ${name}`);
}
