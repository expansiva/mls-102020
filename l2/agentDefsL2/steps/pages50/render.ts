/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/render.ts" enhancement="_blank"/>

import type { D2PageDescription, D2RenderedPage } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';

export function renderD2Page(page: D2RenderedPage): string {
  return `export const descriptions = ${JSON.stringify(page.descriptions, null, 2)} as const;\n\nexport const pipeline = ${JSON.stringify(page.pipeline, null, 2)} as const;\n`;
}

export function parseD2RenderedPage(source: string): { descriptions: D2PageDescription[]; pipeline: unknown[] } {
  const descriptions = parseExport(source, 'descriptions');
  const pipeline = parseExport(source, 'pipeline');
  if (!Array.isArray(descriptions) || !Array.isArray(pipeline)) throw new Error('D2_PAGES_CONSUMER_SHAPE');
  for (const raw of descriptions) {
    const item = record(raw); exactKeys(item, ['organismId', 'kind', 'description', 'contentRef', 'capabilityRefs', 'moleculeRecommendations']);
    if (!text(item.organismId) || !text(item.kind) || !text(item.description) || !text(item.contentRef) || !stringArray(item.capabilityRefs) || !Array.isArray(item.moleculeRecommendations)) throw new Error('D2_PAGES_CONSUMER_SHAPE');
    for (const rawRecommendation of item.moleculeRecommendations) {
      const recommendation = record(rawRecommendation); exactKeys(recommendation, ['groupId', 'candidates', 'reason']);
      if (!text(recommendation.groupId) || !text(recommendation.reason) || !stringArray(recommendation.candidates) || !(recommendation.candidates as unknown[]).length) throw new Error('D2_PAGES_CONSUMER_SHAPE');
    }
  }
  return { descriptions: descriptions as D2PageDescription[], pipeline };
}

function exactKeys(value: Record<string, unknown>, allowed: string[]): void { if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('D2_PAGES_CONSUMER_SHAPE'); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function stringArray(value: unknown): boolean { return Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim()); }

export function assertD2RenderedPage(source: string): void {
  const parsed = parseD2RenderedPage(source);
  if (parsed.pipeline.length !== 1) throw new Error('D2_PAGES_PIPELINE_COUNT');
  const exports = [...source.matchAll(/export const\s+([A-Za-z0-9_]+)/gu)].map(match => match[1]);
  if (exports.join(',') !== 'descriptions,pipeline') throw new Error(`D2_PAGES_EXPORTS: ${exports.join(',')}`);
  if (/<\/?[a-z][^>]*>|```(?:html|css)/iu.test(source)) throw new Error('D2_PAGES_MARKUP_FORBIDDEN');
}

function parseExport(source: string, name: string): unknown {
  const match = new RegExp(`export const ${name} = ([\\s\\S]*?) as const;`).exec(source);
  if (!match) throw new Error(`D2_PAGES_EXPORT_MISSING: ${name}`);
  try { return JSON.parse(match[1]); } catch { throw new Error(`D2_PAGES_EXPORT_INVALID: ${name}`); }
}
