/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/hubComposition.ts" enhancement="_blank"/>

/**
 * The one place E8 asks an LLM for judgement: how the hub record page is composed. The catalogue it
 * receives is closed — code already decided WHAT may appear. The call may only order, promote and
 * name; it can never add, drop or rename a structural id, and an invalid answer falls back to the
 * score order with a recorded decision instead of failing the run.
 */

import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';
import type { Ns4ResolutionResult } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';
import type { Ns4E8HubCatalogue, Ns4E8HubComposition, Ns4E8ModelWorkspace, Ns4E8NavigationTarget } from '/_102020_/l2/agentNewSolution/steps/e8/model.js';

export interface Ns4E8CompositionIssue { code: string; path: string; message: string; }
export interface Ns4E8CompositionResult { ok: boolean; issues: Ns4E8CompositionIssue[]; }

/** Score order, primary actions first: what the page looks like when nobody composes it. */
export function defaultNs4HubComposition(workspace: Ns4E8ModelWorkspace): Ns4E8HubComposition {
  const items = workspace.hubCatalogue?.items || [];
  return {
    workspaceId: workspace.workspaceId,
    title: workspace.title,
    tileOrder: items.map(item => item.itemId),
    primaryActionIds: items.filter(item => item.kind === 'action').slice(0, 2).map(item => item.itemId),
    labels: items.map(item => ({ itemId: item.itemId, label: item.label })),
    menuGroups: [],
  };
}

export function normalizeNs4HubComposition(value: unknown, workspaceId: string, fallbackTitle: string): Ns4E8HubComposition {
  const root = record(value);
  return {
    workspaceId: text(root.workspaceId) || workspaceId,
    title: text(root.title) || fallbackTitle,
    tileOrder: strings(root.tileOrder),
    primaryActionIds: strings(root.primaryActionIds),
    labels: array(root.labels).flatMap(item => {
      const entry = record(item);
      const itemId = text(entry.itemId);
      const label = text(entry.label);
      return itemId && label ? [{ itemId, label }] : [];
    }),
    menuGroups: array(root.menuGroups).flatMap(item => {
      const group = record(item);
      const groupId = text(group.groupId);
      return groupId ? [{ groupId, label: text(group.label) || groupId, itemIds: strings(group.itemIds) }] : [];
    }),
  };
}

export function validateNs4HubComposition(catalogue: Ns4E8HubCatalogue, composition: Ns4E8HubComposition): Ns4E8CompositionResult {
  const issues: Ns4E8CompositionIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const known = new Set(catalogue.items.map(item => item.itemId));
  const actions = new Set(catalogue.items.filter(item => item.kind === 'action').map(item => item.itemId));

  if (!composition.title) add('NS4_E8_HUB_LABEL', 'title', 'The hub page needs a localized title.');
  const ordered = new Set(composition.tileOrder);
  if (ordered.size !== composition.tileOrder.length) add('NS4_E8_HUB_ORDER_DUPLICATE', 'tileOrder', 'A catalogue item cannot appear twice in the order.');
  composition.tileOrder.forEach(itemId => {
    if (!known.has(itemId)) add('NS4_E8_HUB_UNKNOWN_ITEM', 'tileOrder', `Unknown catalogue item ${itemId}; the composition may only order what code derived.`);
  });
  known.forEach(itemId => {
    if (!ordered.has(itemId)) add('NS4_E8_HUB_MISSING_ITEM', 'tileOrder', `Catalogue item ${itemId} was dropped; the composition may not remove an item.`);
  });
  composition.primaryActionIds.forEach(itemId => {
    if (!actions.has(itemId)) add('NS4_E8_HUB_PRIMARY_ACTION', 'primaryActionIds', `${itemId} is not an action of the catalogue.`);
  });
  composition.labels.forEach(entry => {
    if (!known.has(entry.itemId)) add('NS4_E8_HUB_UNKNOWN_ITEM', 'labels', `Unknown catalogue item ${entry.itemId}.`);
  });
  composition.menuGroups.forEach((group, index) => {
    group.itemIds.forEach(itemId => {
      if (!known.has(itemId)) add('NS4_E8_HUB_UNKNOWN_ITEM', `menuGroups[${index}]`, `Unknown catalogue item ${itemId}.`);
    });
  });
  return { ok: !issues.length, issues };
}

/**
 * Applies a composition over the derived catalogue: order, promotion and labels — nothing else.
 *
 * Two rules of the classic format decide the shape of the result, and getting them wrong is what
 * broke run 46: an organism consumes a call of its OWN workspace, so an item the hub reads becomes a
 * LOCAL call over the same shared operation; and a journey is navigation, so it leaves the sections
 * for the site map instead of pretending to be an embedded command.
 */
export function applyNs4HubComposition(workspace: Ns4E8ModelWorkspace, composition: Ns4E8HubComposition): Ns4E8ModelWorkspace {
  const catalogue = workspace.hubCatalogue;
  if (!catalogue) return workspace;
  const labels = new Map(composition.labels.map(entry => [entry.itemId, entry.label]));
  const rank = new Map(composition.tileOrder.map((itemId, index) => [itemId, index]));
  const primary = new Set(composition.primaryActionIds);
  const items = [...catalogue.items]
    .map(item => ({ ...item, ...(labels.get(item.itemId) ? { label: labels.get(item.itemId)! } : {}) }))
    .sort((left, right) => (rank.get(left.itemId) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.itemId) ?? Number.MAX_SAFE_INTEGER));

  const bffCalls = [...workspace.bffCalls];
  const organisms: Ns4E8ModelWorkspace['sections'][number]['organisms'] = [];
  const navigation: Ns4E8NavigationTarget[] = [];
  items.forEach((item, index) => {
    if (item.kind === 'action' || item.kind === 'pending') {
      navigation.push({ targetWorkspaceId: item.targetRef, label: item.label,
        prominence: primary.has(item.itemId) ? 'primary' : 'contextual', order: index });
      return;
    }
    if (!item.sourceOperationId) return;
    const bffId = item.sourceBffId || `qry${upperCamel(item.entityRef)}`;
    if (!bffCalls.some(call => call.bffId === bffId)) {
      bffCalls.push({ bffId, kind: 'query', operationId: item.sourceOperationId,
        outputKind: item.sourceOutputKind || 'object', entityRef: item.entityRef });
    }
    organisms.push({ role: 'detailPanel', dataSource: bffId });
  });

  const sections = workspace.sections.map(section => section.sectionId === 'record' ? { ...section, organisms } : section);
  return {
    ...workspace, title: composition.title || workspace.title,
    bffCalls, sections, hubCatalogue: { ...catalogue, items },
    ...(navigation.length ? { navigation } : {}),
  };
}

/**
 * The bounded resolution: an invalid composition after its single repair is never a run failure —
 * the deterministic score order wins and the choice is recorded.
 */
export function resolveNs4HubCompositionFindings(
  workspace: Ns4E8ModelWorkspace, issues: Ns4E8CompositionIssue[], portuguese: boolean,
): Ns4ResolutionResult<Ns4E8ModelWorkspace> {
  if (!issues.length) return { artifact: workspace, systemDecisions: [], unresolved: [] };
  return resolveNs4Findings(workspace, [{
    classification: 'C',
    decisionId: `hubComposition${upperCamel(workspace.workspaceId)}`,
    findingRef: `NS4_E8_HUB_COMPOSITION:${workspace.workspaceId}`,
    stage: 'e8-workspaces',
    question: portuguese
      ? `A composição proposta para o painel de ${workspace.title} não respeitou o catálogo; usar a ordem padrão?`
      : `The proposed composition for the ${workspace.title} dashboard did not respect the catalogue; use the default order?`,
    deterministicChoice: 'keepDerivedComposition',
    alternatives: ['reviewDashboardComposition'],
    changeHint: portuguese
      ? `Revisar a ordem e os destaques do painel de ${workspace.title} no próximo round.`
      : `Review the order and highlights of the ${workspace.title} dashboard in the next round.`,
    apply: artifact => applyNs4HubComposition(artifact, defaultNs4HubComposition(artifact)),
  }]);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function strings(value: unknown): string[] { return array(value).map(text).filter(Boolean); }
function upperCamel(value: string): string { return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : ''; }
