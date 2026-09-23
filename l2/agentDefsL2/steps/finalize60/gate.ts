/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/gate.ts" enhancement="_blank"/>

import type { D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { assertD2RenderedShared } from '/_102020_/l2/agentDefsL2/steps/shared40/gate.js';
import { parseD2RenderedShared } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';
import { assertD2RenderedPage, parseD2RenderedPage } from '/_102020_/l2/agentDefsL2/steps/pages50/render.js';
import type { D2PagePipelineItem } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import type { D2SharedPipelineItem } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';

export interface D2FinalSource { pageId: string; kind: 'contract' | 'shared' | 'desktopPage' | 'mobilePage'; path: string; source: string; }

export function changedOutsideD2Scope(before: Record<string, string>, after: Record<string, string>, allowedPaths: string[]): string[] {
  const allowed = new Set(allowedPaths);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(path => !allowed.has(path) && before[path] !== after[path])
    .sort();
}

export function gateD2FinalSources(snapshot: D2InputSnapshot, sources: D2FinalSource[]): void {
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
  const items: Array<D2SharedPipelineItem | D2PagePipelineItem> = [];
  for (const file of sources) {
    if (!file.source) throw new Error(`D2_FINALIZE_FILE_MISSING: ${file.path}`);
    if (file.kind === 'contract') {
      if (/\bany\b|\bunknown\b/.test(file.source)) throw new Error(`D2_FINALIZE_CONTRACT_INVALID: ${file.path}`);
      continue;
    }
    if (file.kind === 'shared') {
      assertD2RenderedShared(file.source);
      items.push(...parseD2RenderedShared(file.source).pipeline);
    } else {
      assertD2RenderedPage(file.source);
      items.push(...parseD2RenderedPage(file.source).pipeline as D2PagePipelineItem[]);
    }
  }
  assertGraph(snapshot.module, active, items);
}

function assertGraph(moduleName: string, pageIds: string[], items: Array<D2SharedPipelineItem | D2PagePipelineItem>): void {
  const ids = items.map(item => item.id);
  if (new Set(ids).size !== ids.length || ids.length !== pageIds.length * 3) throw new Error('D2_FINALIZE_PIPELINE_ID_SET_INVALID');
  const known = new Set(ids);
  for (const pageId of pageIds) {
    const shared = items.find(item => item.id === `${pageId}__l2_shared`);
    if (!shared || shared.type !== 'l2_shared' || shared.defPath !== `l2/${moduleName}/web/shared/${pageId}.defs.ts`
      || shared.dependsFiles.join('\0') !== `l2/${moduleName}/web/contracts/${pageId}.defs.ts\0_102029_.d.ts` || shared.dependsOn.length
      || shared.skills.join('\0') !== '_102020_/l2/agentDefsL2/skills/genD2SharedTs.ts') throw new Error(`D2_FINALIZE_SHARED_REF_INVALID: ${pageId}`);
    for (const device of ['desktop', 'mobile'] as const) {
      const item = items.find(candidate => candidate.id === `${pageId}__${device}__page11`) as D2PagePipelineItem | undefined;
      if (!item || item.type !== 'l2_page' || item.defPath !== `l2/${moduleName}/web/${device}/page11/${pageId}.defs.ts`
        || item.dependsOn.join('\0') !== shared.id || item.dependsFiles.join('\0') !== `l2/${moduleName}/web/shared/${pageId}.ts`
        || !canonicalPageSkills(item.categoryRef, item.skills)) throw new Error(`D2_FINALIZE_PAGE_REF_INVALID: ${pageId}/${device}`);
    }
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): void => { if (visiting.has(id)) throw new Error(`D2_FINALIZE_PIPELINE_CYCLE: ${id}`); if (visited.has(id)) return; visiting.add(id); const item = items.find(value => value.id === id)!; for (const dep of item.dependsOn) { if (!known.has(dep)) throw new Error(`D2_FINALIZE_PIPELINE_REF_UNKNOWN: ${id} -> ${dep}`); visit(dep); } visiting.delete(id); visited.add(id); };
  for (const id of ids) visit(id);
}

function canonicalPageSkills(categoryRef: string, skills: string[]): boolean {
  if (!/^[a-z][A-Za-z0-9]*$/.test(categoryRef) || skills.length < 2 || (skills.length - 2) % 2 !== 0 || new Set(skills).size !== skills.length) return false;
  if (skills[0] !== '_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts') return false;
  if (skills[1] !== `_102020_/l2/agentDefsL2/skills/pageCategories/${categoryRef}.md`) return false;
  for (let index = 2; index < skills.length; index += 2) {
    if (!/^_[0-9]+_\/l2\/molecules\/[a-z0-9_-]+\/index\.defs\.ts$/.test(skills[index])) return false;
    if (!/^_102020_\/l2\/aura\/molecules\/skills\/[A-Za-z0-9_-]+\/usage\.ts$/.test(skills[index + 1])) return false;
  }
  return true;
}

function parseExport(source: string, name: string): unknown { const match = new RegExp(`export const ${name} = ([\\s\\S]*?) as const;`).exec(source); if (!match) throw new Error(`D2_FINALIZE_EXPORT_MISSING: ${name}`); try { return JSON.parse(match[1]); } catch { throw new Error(`D2_FINALIZE_EXPORT_INVALID: ${name}`); } }
