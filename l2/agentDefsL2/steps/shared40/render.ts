/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/render.ts" enhancement="_blank"/>
import type { D2SharedDefinition, D2SharedPipelineItem } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
export function renderD2Shared(definition: D2SharedDefinition, pipeline: D2SharedPipelineItem): string {
  return `export const definition = ${JSON.stringify(definition, null, 2)} as const;\n\nexport const pipeline = ${JSON.stringify(pipeline, null, 2)} as const;\n`;
}
