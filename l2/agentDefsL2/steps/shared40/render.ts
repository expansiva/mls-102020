/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/render.ts" enhancement="_blank"/>
import type { D2SharedDefinition, D2SharedPipelineItem } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
export function renderD2Shared(definition: D2SharedDefinition, pipeline: D2SharedPipelineItem): string {
  return `export const definition = ${JSON.stringify(definition, null, 2)} as const;\n\nexport const pipeline = ${JSON.stringify([pipeline], null, 2)} as const;\n`;
}

export function parseD2RenderedShared(source: string): { definition: D2SharedDefinition; pipeline: D2SharedPipelineItem[] } {
  const definition = parseExport(source, 'definition');
  const pipeline = parseExport(source, 'pipeline');
  if (!definition || typeof definition !== 'object' || Array.isArray(definition) || !Array.isArray(pipeline)) throw new Error('D2_SHARED_CONSUMER_SHAPE');
  return { definition: definition as D2SharedDefinition, pipeline: pipeline as D2SharedPipelineItem[] };
}

function parseExport(source: string, name: string): unknown {
  const match = new RegExp(`export const ${name} = ([\\s\\S]*?) as const;`).exec(source);
  if (!match) throw new Error(`D2_SHARED_EXPORT_MISSING: ${name}`);
  try { return JSON.parse(match[1]); } catch { throw new Error(`D2_SHARED_EXPORT_INVALID: ${name}`); }
}
