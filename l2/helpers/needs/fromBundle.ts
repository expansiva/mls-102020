/// <mls fileReference="_102020_/l2/helpers/needs/fromBundle.ts" enhancement="_blank"/>

import { parseP2Grants, parseP2Processes } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { parseP2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import type { D2InputArtifacts, D2InputProblem } from '/_102020_/l2/helpers/defsInput/contracts.js';
import type { D2CallConnection } from '/_102020_/l2/helpers/defsInput/writeCalls.js';
import { buildP2NeedsFile } from '/_102020_/l2/helpers/needs/build.js';
import type { PoolMenuFile, PoolNeedsFile } from '/_102035_/l2/solution/poolPlan.js';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function idList(value: unknown, key: string): string[] {
  return Array.isArray(value) ? value.map(item => text(record(item)[key])).filter(Boolean) : [];
}

/** Needs the current `needs30` code derives from the menu in the pool and the L4 sources. The pool file is not written. */
export function d2ArtifactsWithCurrentNeeds(artifacts: D2InputArtifacts): { artifacts: D2InputArtifacts; changedPageIds: string[] } {
  const module = record(artifacts.module);
  const journeyIds = idList(record(artifacts.journeyIndex).journeys, 'journeyId');
  const entityIds = idList(record(artifacts.ontologyIndex).entities, 'entityId');
  const sources = parseP2L4Sources({
    moduleName: text(module.moduleName),
    userLanguage: text(module.userLanguage),
    journeyIndex: artifacts.journeyIndex,
    journeys: journeyIds.map(id => artifacts.journeys[id]).filter(item => item != null),
    access: artifacts.access,
    ontologyIndex: artifacts.ontologyIndex,
    ontologyEntities: entityIds.map(id => artifacts.entities[id]).filter(item => item != null),
  });
  const integration = record(artifacts.integration);
  const connections = Array.isArray(integration.connections) ? integration.connections as D2CallConnection[] : [];
  const pool = artifacts.needs as PoolNeedsFile;
  const generatedAt = text(record(pool?.meta).generatedAt);
  const needs = buildP2NeedsFile({
    menu: artifacts.menu as PoolMenuFile,
    sources,
    grants: parseP2Grants(artifacts.access),
    processes: parseP2Processes(artifacts.workflows),
    connections,
    now: generatedAt ? new Date(generatedAt) : new Date(0),
  });
  const poolById = new Map((pool?.pages ?? []).map(page => [page.pageId, page]));
  const changed = new Set<string>();
  for (const page of needs.pages) {
    if (JSON.stringify(page) !== JSON.stringify(poolById.get(page.pageId))) changed.add(page.pageId);
  }
  for (const page of pool?.pages ?? []) {
    if (!needs.pages.some(item => item.pageId === page.pageId)) changed.add(page.pageId);
  }
  return { artifacts: { ...artifacts, needs }, changedPageIds: [...changed].sort() };
}

export function d2NeedsRecalcProblem(pageIds: readonly string[]): D2InputProblem {
  return {
    severity: 'info',
    code: 'NEEDS_RECALCULATED',
    file: 'pool/l1/web/needs.json',
    message: `needs30 code differs from the pool on: ${pageIds.join(', ')}`,
  };
}
