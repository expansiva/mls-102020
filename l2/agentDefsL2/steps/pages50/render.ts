/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/render.ts" enhancement="_blank"/>

import type { D2RenderedPage } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';

export function renderD2Page(page: D2RenderedPage): string {
  return `export const descriptions = ${JSON.stringify(page.descriptions, null, 2)} as const;\n\nexport const pipeline = ${JSON.stringify(page.pipeline, null, 2)} as const;\n`;
}

export function parseD2RenderedPage(source: string): { descriptions: string[]; pipeline: unknown[] } {
  const descriptions = parseExport(source, 'descriptions');
  const pipeline = parseExport(source, 'pipeline');
  if (!Array.isArray(descriptions) || !descriptions.every(item => typeof item === 'string') || !Array.isArray(pipeline)) throw new Error('D2_PAGES_CONSUMER_SHAPE');
  return { descriptions, pipeline };
}

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
