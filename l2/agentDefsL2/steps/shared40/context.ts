/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/context.ts" enhancement="_blank"/>

import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import type { D2SharedPipelineItem } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';

export interface D2SharedContextPort { readText(reference: string): Promise<string | null>; }
export interface D2SharedMaterializationContext { references: string[]; sources: Record<string, string>; sourceHashes: Record<string, string>; contextHash: string; skillHash: string; }

export async function readD2SharedMaterializationContext(item: D2SharedPipelineItem, port: D2SharedContextPort): Promise<D2SharedMaterializationContext> {
  const references = [...new Set([...item.skills, ...item.dependsFiles])];
  const sources: Record<string, string> = {};
  for (const reference of references) {
    const source = await port.readText(reference);
    if (!source) throw new Error(`D2_SHARED_CONTEXT_MISSING: ${reference}`);
    sources[reference] = source;
  }
  const hashes: Record<string, string> = {};
  for (const reference of references) hashes[reference] = await sha256Text(sources[reference]);
  return { references, sources, sourceHashes: hashes, contextHash: await sha256Text(JSON.stringify(hashes)), skillHash: hashes[item.skills[0]] || '' };
}
