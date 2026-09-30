/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/gate.ts" enhancement="_blank"/>

import type { D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { parseD2RenderedSharedDefinitionDocument } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';
import { parseD2Page11DefinitionSource } from '/_102020_/l2/agentDefsL2/steps/pages50/page11Definition.js';
import type { D2ResolvableSymbol } from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';
import { assertD2Header } from '/_102020_/l2/agentDefsL2/helpers/d2Header.js';

export interface D2FinalSource { pageId: string; kind: 'contract' | 'shared' | 'desktopPage' | 'mobilePage'; path: string; source: string; }

export function changedOutsideD2Scope(before: Record<string, string>, after: Record<string, string>, allowedPaths: string[]): string[] {
  const allowed = new Set(allowedPaths);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(path => !allowed.has(path) && before[path] !== after[path])
    .sort();
}

export function gateD2FinalSources(snapshot: D2InputSnapshot, sources: D2FinalSource[], symbols: readonly D2ResolvableSymbol[] = []): void {
  const active = [...snapshot.selection.writePageIds, ...snapshot.selection.preservePageIds].sort();
  if (new Set(active).size !== active.length) throw new Error('D2_FINALIZE_PAGE_ID_DUPLICATE');
  const selected = snapshot.selection.pages.filter(page => active.includes(page.pageId));
  if (selected.length !== active.length || new Set(selected.map(page => page.pageId)).size !== active.length) throw new Error('D2_FINALIZE_PAGE_SET_MISMATCH');
  for (const page of selected) {
    const base = `l2/${snapshot.module}/web`;
    const exact = [
      `contract\0${base}/contracts/${page.pageId}.defs.ts`,
      `shared\0${base}/shared/${page.pageId}.defs.ts`,
      `desktopPage\0${base}/desktop/page11/${page.pageId}.defs.ts`,
      `mobilePage\0${base}/mobile/page11/${page.pageId}.defs.ts`,
    ].sort();
    const actualDestinations = page.destinations.map(item => `${item.kind}\0${item.path}`).sort();
    if (actualDestinations.join('\n') !== exact.join('\n')) throw new Error(`D2_FINALIZE_DESTINATION_SET_INVALID: ${page.pageId}`);
  }
  const expected = selected.flatMap(page => page.destinations.map(item => item.path)).sort();
  const actual = sources.map(item => item.path).sort();
  if (new Set(actual).size !== actual.length || actual.join('\0') !== expected.join('\0')) throw new Error('D2_FINALIZE_OUTPUT_SET_MISMATCH');
  const localSymbols: D2ResolvableSymbol[] = sources.map(file => ({ fileRef: file.path }));
  for (const file of sources.filter(file => file.kind === 'contract')) {
    for (const match of file.source.matchAll(/export (?:const|interface|type) ([A-Za-z0-9_]+)/gu)) localSymbols.push({ fileRef: file.path, fragment: match[1] });
  }
  const mergedSymbols = () => [...new Map([...symbols, ...localSymbols].map(symbol => [`${symbol.fileRef}\0${symbol.fragment || ''}`, symbol])).values()];
  const sharedDefinitions = new Map<string, ReturnType<typeof parseD2RenderedSharedDefinitionDocument>>();
  // The graph has only semantic edges: page -> shared -> contract and declared source refs.
  for (const file of sources.filter(file => file.kind === 'shared')) {
    const definition = parseD2RenderedSharedDefinitionDocument(file.source, mergedSymbols());
    if (definition.pageId !== file.pageId || definition.contractRef.fileRef !== `l2/${snapshot.module}/web/contracts/${file.pageId}.defs.ts`) throw new Error(`D2_FINALIZE_SHARED_REF_INVALID: ${file.pageId}`);
    sharedDefinitions.set(file.pageId, definition);
    localSymbols.push({ fileRef: file.path, contentIds: definition.contents.map(item => item.id) });
    for (const family of ['states', 'actions', 'contents', 'scenarios'] as const) for (const item of definition[family]) localSymbols.push({ fileRef: file.path, fragment: `${family}.${item.id}` });
  }
  for (const file of sources) {
    if (!file.source) throw new Error(`D2_FINALIZE_FILE_MISSING: ${file.path}`);
    const body = assertD2Header(file.source, file.path, snapshot.project);
    if (file.kind === 'contract') {
      if (/\bany\b|\bunknown\b/.test(body)) throw new Error(`D2_FINALIZE_CONTRACT_INVALID: ${file.path}`);
      continue;
    }
    if (file.kind === 'shared') continue;
    const definition = parseD2Page11DefinitionSource(file.source, mergedSymbols());
    const device = file.kind === 'desktopPage' ? 'desktop' : 'mobile';
    if (definition.pageId !== file.pageId || definition.device !== device || definition.sharedRef.fileRef !== `l2/${snapshot.module}/web/shared/${file.pageId}.defs.ts` || !sharedDefinitions.has(file.pageId)) throw new Error(`D2_FINALIZE_PAGE_REF_INVALID: ${file.pageId}/${device}`);
  }
}
