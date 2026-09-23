/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/contracts.ts" enhancement="_blank"/>

import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';

export const D2_PAGES_VERSION = '2026-09-23-agent-defs-l2-pages-v3' as const;
export const D2_PAGES_JUDGMENT_VERSION = '2026-09-23-agent-defs-l2-pages-judgment-v3' as const;
export type D2PageDevice = 'desktop' | 'mobile';

export interface D2PageCategoryJudgment { categoryRef: string; reason: string; evidenceRefs: string[]; }
export interface D2MoleculeRecommendationJudgment { groupId: string; candidates: string[]; reason: string; }
export interface D2PageDescription { organismId: string; kind: string; description: string; contentRef: string; capabilityRefs: string[]; moleculeRecommendations: D2MoleculeRecommendationJudgment[]; }
export interface D2PageOrganismSource { organismId: string; kind: string; intent: string; staticContent: boolean; }
export interface D2PageScenarioSurface { contentRef: string; actionId: string; kind: D2SharedDefinition['scenaries'][number]['kind']; inputStateKeys: string[]; statusStateKey: string; errorStateKey: string; }

export interface D2PagePresentationJudgment {
  device: D2PageDevice;
  descriptions: D2PageDescription[];
  moleculeReason: string;
}
export interface D2PagesJudgment { schemaVersion: typeof D2_PAGES_JUDGMENT_VERSION; pageId: string; category: D2PageCategoryJudgment; presentations: D2PagePresentationJudgment[]; }
export interface D2PagePipelineItem { id: string; type: 'l2_page'; defPath: string; outputPath: string; dependsFiles: string[]; dependsOn: string[]; categoryRef: string; skills: string[]; }
export interface D2RenderedPage { device: D2PageDevice; descriptions: D2PageDescription[]; pipeline: readonly [D2PagePipelineItem]; }

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

export function resolveD2PageScenarioState(shared: D2SharedDefinition): { stateKey: string; defaultValue: string } {
  const values = new Set(shared.scenaries.map(item => item.value));
  const matches = shared.states.filter(state => typeof state.defaultValue === 'string'
    && values.has(state.defaultValue)
    && Array.isArray(state.valueSet)
    && values.size === state.valueSet.length
    && state.valueSet.every(value => values.has(value)));
  if (matches.length !== 1) throw new Error(`D2_PAGES_SCENARIO_STATE_INCOMPATIBLE: ${shared.pageId} matches=${matches.length}`);
  return { stateKey: matches[0].stateKey, defaultValue: matches[0].defaultValue as string };
}

export function resolveD2PageScenarioSurfaces(shared: D2SharedDefinition): D2PageScenarioSurface[] {
  const states = new Set(shared.states.map(item => item.stateKey));
  return shared.scenaries.map(scenario => {
    const action = shared.actions.find(item => item.actionId === scenario.actionId);
    if (!action && scenario.kind === 'base' && !scenario.actionId && !scenario.preconditions.length) return { contentRef: scenario.value, actionId: '', kind: scenario.kind, inputStateKeys: [], statusStateKey: '', errorStateKey: '' };
    if (!action) throw new Error(`D2_PAGES_SCENARIO_ACTION_MISSING: ${shared.pageId}/${scenario.value} -> ${scenario.actionId}`);
    for (const key of [...scenario.preconditions, ...action.inputStateKeys, ...action.outputStateKeys]) if (!states.has(key)) throw new Error(`D2_PAGES_SCENARIO_STATE_MISSING: ${shared.pageId}/${scenario.value} -> ${key}`);
    if (scenario.kind === 'command') {
      if (action.kind !== 'command') throw new Error(`D2_PAGES_SCENARIO_COMMAND_INCOMPATIBLE: ${shared.pageId}/${scenario.value}`);
      if (!action.statusStateKey || !states.has(action.statusStateKey) || !action.errorStateKey || !states.has(action.errorStateKey)) throw new Error(`D2_PAGES_SCENARIO_FEEDBACK_MISSING: ${shared.pageId}/${scenario.value}`);
    }
    return { contentRef: scenario.value, actionId: action.actionId, kind: scenario.kind, inputStateKeys: [...action.inputStateKeys], statusStateKey: action.statusStateKey, errorStateKey: action.errorStateKey };
  });
}

export function deriveD2PageOrganisms(page: D2SelectedPage): D2PageOrganismSource[] {
  const occurrences = new Map<string, number>(); const ids = new Set<string>();
  return page.organisms.map((raw, index) => {
    const item = record(raw); const kind = text(item.kind);
    if (!kind) throw new Error(`D2_PAGES_ORGANISM_KIND_MISSING: ${page.pageId}/source[${index}]`);
    const folded = kind.replace(/[^A-Za-z0-9]+/gu, '-').replace(/^-|-$/gu, '').toLowerCase();
    if (!folded) throw new Error(`D2_PAGES_ORGANISM_KIND_INVALID: ${page.pageId}/source[${index}]`);
    const occurrence = (occurrences.get(folded) ?? 0) + 1; occurrences.set(folded, occurrence);
    const sourceId = text(item.organismId) || text(item.id);
    const organismId = sourceId || `organism.${folded}.${occurrence}`;
    if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(organismId)) throw new Error(`D2_PAGES_ORGANISM_ID_INVALID: ${page.pageId}/${organismId}`);
    if (ids.has(organismId)) throw new Error(`D2_PAGES_ORGANISM_SOURCE_DUPLICATE: ${page.pageId}/${organismId}`); ids.add(organismId);
    return { organismId, kind, intent: text(item.text) || text(item.intent) || text(item.description), staticContent: /^(?:static|content|copy|text)$/iu.test(kind) };
  });
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
