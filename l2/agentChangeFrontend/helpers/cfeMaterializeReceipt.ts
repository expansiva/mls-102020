/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeReceipt.ts" enhancement="_blank"/>

import { expandContextRef, parseDefs, resolveProjectRelativeRef, type PipelineItem } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

export const CFE_CONTEXT_RECEIPT_VERSION = '2026-09-26-cfe-context-v1' as const;
export interface CfeContextSource { reference: string; sha256: string; }
export interface CfeContextReceipt { schemaVersion: typeof CFE_CONTEXT_RECEIPT_VERSION; defPath: string; itemId: string; outputPath: string; sources: CfeContextSource[]; usedApis: CfeContextSource[]; consumed: { skills: string; context: string }; outputHash: string; }
export type CfeContextReader = (reference: string) => Promise<string | null>;

export function cfeContextReceiptPath(outputPath: string): string { return outputPath.replace(/\.ts$/u, 'Receipt.json'); }

export async function readCfeContextSources(defPath: string, item: PipelineItem, project: number, read: CfeContextReader): Promise<CfeContextSource[]> {
  const refs = [defPath, ...(item.skills ?? []), ...(item.dependsFiles ?? []).flatMap(expandContextRef)];
  // The public DTS intentionally omits hidden defaults. Its source and complete definition still
  // participate in freshness, even when the prompt receives only the public compiled surface.
  for (const ref of item.dependsFiles ?? []) {
    if (/\/web\/shared\/[^/]+\.ts$/u.test(ref)) refs.push(ref.replace(/\.ts$/u, '.defs.ts'));
  }
  const sources: CfeContextSource[] = [];
  for (const ref of [...new Set(refs.map(ref => resolveProjectRelativeRef(ref.replace(/^\//u, ''), project)))]) {
    const source = await read(ref);
    if (!source) throw new Error(`CFE_DECLARED_CONTEXT_MISSING: ${ref}`);
    sources.push({ reference: ref, sha256: await sha256Text(source) });
  }
  return sources;
}

export async function buildCfeContextReceipt(defPath: string, item: PipelineItem, sources: CfeContextSource[], skills: string[], context: string[], output: string): Promise<CfeContextReceipt> {
  return { schemaVersion: CFE_CONTEXT_RECEIPT_VERSION, defPath, itemId: item.id, outputPath: item.outputPath, sources, usedApis: [],
    consumed: { skills: await sha256Text(JSON.stringify(skills)), context: await sha256Text(JSON.stringify(context)) }, outputHash: await sha256Text(output) };
}

export async function readCfeUsedApis(output: string, project: number, read: CfeContextReader): Promise<CfeContextSource[]> {
  const refs = [...output.matchAll(/(?:from\s*|import\s*)['"](\/?_[0-9]+_\/l2\/[^'"]+\.js)['"]/gu)].map(match => match[1].replace(/^\//u, '').replace(/\.js$/u, '.ts'));
  const sources: CfeContextSource[] = [];
  for (const reference of [...new Set(refs.map(ref => resolveProjectRelativeRef(ref, project)))].sort()) {
    const source = await read(reference);
    if (!source) throw new Error(`CFE_USED_API_MISSING: ${reference}`);
    sources.push({ reference, sha256: await sha256Text(source) });
  }
  return sources;
}

export async function cfeContextSourcesCurrent(sources: CfeContextSource[], read: CfeContextReader): Promise<boolean> {
  for (const source of sources) {
    const content = await read(source.reference);
    if (!content || await sha256Text(content) !== source.sha256) return false;
  }
  return true;
}

export async function cfeMaterializationFresh(defPath: string, project: number, read: CfeContextReader): Promise<boolean | null> {
  const source = await read(defPath);
  if (!source) return false;
  const parsed = parseDefs(source);
  // Older consumers keep their existing selection rule. D2 units always require provenance.
  const d2 = parsed.items.some(item => /__(?:l2_shared|(?:desktop|mobile)__page11)$/u.test(item.id));
  if (!d2) return null;
  for (const item of parsed.items) {
    const raw = await read(cfeContextReceiptPath(item.outputPath));
    let receipt: CfeContextReceipt;
    try { receipt = JSON.parse(raw ?? '') as CfeContextReceipt; } catch { return false; }
    if (receipt.schemaVersion !== CFE_CONTEXT_RECEIPT_VERSION || receipt.defPath !== defPath || receipt.itemId !== item.id || receipt.outputPath !== item.outputPath || !Array.isArray(receipt.sources) || !Array.isArray(receipt.usedApis)) return false;
    const output = await read(item.outputPath);
    if (!output || await sha256Text(output) !== receipt.outputHash || !await cfeContextSourcesCurrent([...receipt.sources, ...receipt.usedApis], read)) return false;
    let current: CfeContextSource[];
    try { current = await readCfeContextSources(defPath, item, project, read); } catch { return false; }
    if (JSON.stringify(current) !== JSON.stringify(receipt.sources)) return false;
  }
  return true;
}
