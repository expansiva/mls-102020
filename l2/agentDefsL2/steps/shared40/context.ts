/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/context.ts" enhancement="_blank"/>

import { expandContextRef } from '/_102020_/l2/runtime102029Context.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import type { D2SharedPipelineItem } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';

export interface D2SharedContextPort { readText(reference: string): Promise<string | null>; }
export interface D2SharedMaterializationContext { references: string[]; sources: Record<string, string>; contextHash: string; skillHash: string; }

export async function readD2SharedMaterializationContext(item: D2SharedPipelineItem, port: D2SharedContextPort): Promise<D2SharedMaterializationContext> {
  const references = [...item.skills, ...item.dependsFiles.flatMap(expandContextRef)];
  const sources: Record<string, string> = {};
  for (const reference of references) {
    const source = await port.readText(reference);
    if (!source) throw new Error(`D2_SHARED_CONTEXT_MISSING: ${reference}`);
    sources[reference] = source;
  }
  assertRuntimeSurface(sources);
  const hashes: Record<string, string> = {};
  for (const reference of references) hashes[reference] = await sha256Text(sources[reference]);
  return { references, sources, contextHash: await sha256Text(JSON.stringify(hashes)), skillHash: hashes[item.skills[0]] };
}

function assertRuntimeSurface(sources: Record<string, string>): void {
  const required: Array<[string, RegExp]> = [
    ['_102029_/l2/stateLitElement.ts', /export abstract class StateLitElement/],
    ['_102029_/l2/bffClient.ts', /export async function execBff/],
    ['_102029_/l2/collabState.ts', /export function getState/],
    ['_102029_/l2/collabState.ts', /export function setState/],
    ['_102029_/l2/interactionRuntime.ts', /export async function runBlockingUiAction/],
  ];
  for (const [reference, pattern] of required) if (!pattern.test(sources[reference] || '')) throw new Error(`D2_SHARED_RUNTIME_API_MISSING: ${reference}`);
}
