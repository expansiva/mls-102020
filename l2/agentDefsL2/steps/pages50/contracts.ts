/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/contracts.ts" enhancement="_blank"/>

import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';

export const D2_PAGES_VERSION = '2026-09-23-agent-defs-l2-pages-v2' as const;
export const D2_PAGES_JUDGMENT_VERSION = '2026-09-23-agent-defs-l2-pages-judgment-v2' as const;
export type D2PageDevice = 'desktop' | 'mobile';

export interface D2PageCategoryJudgment { categoryRef: string; reason: string; evidenceRefs: string[]; }
export interface D2MoleculeRecommendationJudgment { groupId: string; candidates: string[]; reason: string; }

export interface D2PagePresentationJudgment {
  device: D2PageDevice;
  descriptions: string[];
  capabilityRefs: string[];
  groupIds: string[];
  moleculeRecommendations: D2MoleculeRecommendationJudgment[];
  moleculeReason: string;
}
export interface D2PagesJudgment { schemaVersion: typeof D2_PAGES_JUDGMENT_VERSION; pageId: string; category: D2PageCategoryJudgment; presentations: D2PagePresentationJudgment[]; }
export interface D2PagePipelineItem { id: string; type: 'l2_page'; defPath: string; outputPath: string; dependsFiles: string[]; dependsOn: string[]; categoryRef: string; skills: string[]; }
export interface D2RenderedPage { device: D2PageDevice; descriptions: string[]; pipeline: readonly [D2PagePipelineItem]; }

export function buildD2PagePipeline(moduleName: string, pageId: string, device: D2PageDevice, categoryRef: string, skills: string[]): D2PagePipelineItem {
  const base = `l2/${moduleName}/web/${device}/page11/${pageId}`;
  return {
    id: `${pageId}__${device}__page11`, type: 'l2_page', defPath: `${base}.defs.ts`, outputPath: `${base}.ts`,
    dependsFiles: [`l2/${moduleName}/web/shared/${pageId}.ts`], dependsOn: [`${pageId}__l2_shared`], categoryRef, skills: [...new Set(skills)],
  };
}

export function knownD2PageCapabilities(shared: D2SharedDefinition): string[] {
  return [...new Set([
    ...shared.actions.map(item => item.actionId),
    ...shared.states.map(item => item.stateKey),
    ...shared.scenaries.map(item => item.value),
  ])].sort();
}
