/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3Receipt.ts" enhancement="_blank"/>

import { sha256Text } from '/_102020_/l2/helpers/hash.js';

export const M3_RECEIPT_VERSION = '2026-10-01-m3-receipt-v1' as const;
export interface M3ReceiptSource { reference: string; sha256: string; }
export interface M3Receipt {
  schemaVersion: typeof M3_RECEIPT_VERSION; defPath: string; outputPath: string;
  sources: M3ReceiptSource[]; usedApis: M3ReceiptSource[];
  consumed: { skills: string; context: string }; outputHash: string;
}
export type M3Reader = (reference: string) => Promise<string | null>;

export function m3ReceiptPath(outputPath: string): string { return outputPath.replace(/\.ts$/u, 'Receipt.json'); }

/** Resolve a project-local L2 reference without changing the declarative pipeline representation. */
export function resolveProjectRelativeRef(ref: string, project: number): string {
  ref = ref.replace(/^\//u, '');
  return /^l\d+\//u.test(ref) && Number.isSafeInteger(project) && project > 0 ? `_${project}_/${ref}` : ref;
}

/** Resolves, dedupes keeping first-seen order, hashes. Missing -> throw Error('M3_DECLARED_CONTEXT_MISSING: <ref>'). */
export async function readM3Sources(refs: readonly string[], project: number, read: M3Reader): Promise<M3ReceiptSource[]> {
  const sources: M3ReceiptSource[] = [];
  for (const ref of [...new Set(refs.map(ref => resolveProjectRelativeRef(ref.replace(/^\//u, ''), project)))]) {
    const source = await read(ref);
    if (!source) throw new Error(`M3_DECLARED_CONTEXT_MISSING: ${ref}`);
    sources.push({ reference: ref, sha256: await sha256Text(source) });
  }
  return sources;
}

/** Import refs of the generated code, sorted. Missing -> throw Error('M3_USED_API_MISSING: <ref>'). */
export async function readM3UsedApis(output: string, project: number, read: M3Reader): Promise<M3ReceiptSource[]> {
  const refs = [...output.matchAll(/(?:from\s*|import\s*)['"](\/?_[0-9]+_\/l2\/[^'"]+\.js)['"]/gu)].map(match => match[1].replace(/^\//u, '').replace(/\.js$/u, '.ts'));
  const sources: M3ReceiptSource[] = [];
  for (const reference of [...new Set(refs.map(ref => resolveProjectRelativeRef(ref, project)))].sort()) {
    const source = await read(reference);
    if (!source) throw new Error(`M3_USED_API_MISSING: ${reference}`);
    sources.push({ reference, sha256: await sha256Text(source) });
  }
  return sources;
}

export async function buildM3Receipt(args: {
  defPath: string; outputPath: string; sources: M3ReceiptSource[]; skills: readonly string[]; context: readonly string[];
  output: string; project: number; read: M3Reader;
}): Promise<M3Receipt> {
  return {
    schemaVersion: M3_RECEIPT_VERSION, defPath: args.defPath, outputPath: args.outputPath, sources: args.sources,
    usedApis: await readM3UsedApis(args.output, args.project, args.read),
    consumed: { skills: await sha256Text(JSON.stringify(args.skills)), context: await sha256Text(JSON.stringify(args.context)) },
    outputHash: await sha256Text(args.output),
  };
}

export async function m3SourcesCurrent(sources: readonly M3ReceiptSource[], read: M3Reader): Promise<boolean> {
  for (const source of sources) {
    const content = await read(source.reference);
    if (!content || await sha256Text(content) !== source.sha256) return false;
  }
  return true;
}

/**
 * false if: receipt absent or unparseable; schemaVersion/defPath/outputPath differ; arrays missing;
 * output absent or its sha256 != outputHash; any of sources+usedApis changed; or
 * readM3Sources(sourceRefs) != receipt.sources (JSON compare). Any throw -> false.
 */
export async function m3ReceiptFresh(args: {
  defPath: string; outputPath: string; sourceRefs: readonly string[]; project: number; read: M3Reader;
}): Promise<boolean> {
  try {
    const raw = await args.read(m3ReceiptPath(args.outputPath));
    let receipt: M3Receipt;
    try { receipt = JSON.parse(raw ?? '') as M3Receipt; } catch { return false; }
    if (!receipt || receipt.schemaVersion !== M3_RECEIPT_VERSION || receipt.defPath !== args.defPath || receipt.outputPath !== args.outputPath
      || !Array.isArray(receipt.sources) || !Array.isArray(receipt.usedApis)) return false;
    const output = await args.read(args.outputPath);
    if (!output || await sha256Text(output) !== receipt.outputHash) return false;
    if (!await m3SourcesCurrent([...receipt.sources, ...receipt.usedApis], args.read)) return false;
    const current = await readM3Sources(args.sourceRefs, args.project, args.read);
    return JSON.stringify(current) === JSON.stringify(receipt.sources);
  } catch {
    return false;
  }
}
