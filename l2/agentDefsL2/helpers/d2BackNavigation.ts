/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2BackNavigation.ts" enhancement="_blank"/>

import type { D2Page11Definition, D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';

/** A menu node as `menu.json` stores it. Only the fields the back target needs. */
export interface D2BackMenuNode {
  id: string;
  kind: string;
  context?: string;
  organisms?: Array<{ kind: string }>;
  children?: D2BackMenuNode[];
}

/** One selected page, for the entity its reads name (`reads[].entity`). */
export interface D2BackPage {
  pageId: string;
  reads: Array<{ entity?: string }>;
}

const DEVICES: D2Page11Device[] = ['desktop', 'mobile'];

function pascalPage(pageId: string): string {
  return pageId.split(/[^A-Za-z0-9]+/u).filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join('');
}

/** List pages that sit outside every hub. */
function listsOutsideHub(nodes: D2BackMenuNode[], insideHub: boolean, found: D2BackMenuNode[]): void {
  for (const node of nodes) {
    const hub = node.kind === 'hub';
    if (!insideHub && !hub && node.kind === 'page' && (node.organisms ?? []).some(item => item.kind === 'list')) found.push(node);
    if (node.children?.length) listsOutsideHub(node.children, insideHub || hub, found);
  }
}

/** Zero or several list targets. The page stays without a back navigate. */
export interface D2BackAmbiguity {
  code: 'D2_BACK_TARGET_AMBIGUOUS';
  pageId: string;
  candidates: string[];
}

/** Journeys the page already cites. Only an explicit `continuesIn` can name the list. */
export interface D2BackJourneys {
  refs: string[];
  byId: Record<string, unknown>;
}

/** `continuesIn` strings inside one journey artifact. Nothing else counts as a continuation. */
function citedContinuations(value: unknown, found: Set<string>): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) citedContinuations(item, found);
    return;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.continuesIn === 'string' && row.continuesIn.trim()) found.add(row.continuesIn.trim());
  for (const child of Object.values(row)) citedContinuations(child, found);
}

/** The one candidate a cited journey names with `continuesIn`. Several names, or none, leave the choice open. */
function continuationTarget(journeys: D2BackJourneys | undefined, candidates: Set<string>): string {
  if (!journeys) return '';
  const cited = new Set<string>();
  for (const ref of journeys.refs) citedContinuations(journeys.byId[ref], cited);
  const hits = [...cited].filter(id => candidates.has(id));
  return hits.length === 1 ? hits[0] : '';
}

/**
 * A hub child with a record gets one navigate back to the single list of that record, on both devices.
 * The intent is not a submit and adds no read or write. A navigate to that list that already exists is kept once.
 * Zero or several lists is a warning: the page stays as written. A `continuesIn` that names one candidate picks it.
 */
export function applyD2BackNavigation(
  page: { pageId?: string; ancestors: Array<{ kind: string; context?: string }> },
  menuTree: D2BackMenuNode[],
  pages: D2BackPage[],
  definitions: Record<D2Page11Device, D2Page11Definition>,
  journeys?: D2BackJourneys,
): D2BackAmbiguity[] {
  const contexts = [...new Set(page.ancestors.filter(item => item.kind === 'hub' && item.context?.trim()).map(item => item.context!.trim()))];
  if (!contexts.length) return [];
  const ambiguous = (candidates: string[]): D2BackAmbiguity[] => [{ code: 'D2_BACK_TARGET_AMBIGUOUS', pageId: page.pageId ?? '', candidates }];
  if (contexts.length !== 1) return ambiguous([]);
  const entity = contexts[0];
  const readsEntity = new Set(pages.filter(item => item.reads.some(read => read.entity === entity)).map(item => item.pageId));
  const lists: D2BackMenuNode[] = [];
  listsOutsideHub(menuTree, false, lists);
  const targets = lists.filter(node => readsEntity.has(node.id));
  const chosen = targets.length === 1 ? targets[0].id : continuationTarget(journeys, new Set(targets.map(node => node.id)));
  if (!chosen) return ambiguous(targets.map(node => node.id));
  const target = chosen;
  const intentId = `backTo${pascalPage(target)}`;
  for (const device of DEVICES) {
    const definition = definitions[device];
    const already = Object.values(definition.organisms).some(organism => organism.intents.some(intent => intent.kind === 'navigate' && intent.to === target));
    if (already) continue;
    const organismId = definition.sections[0]?.organisms[0] ?? '';
    const organism = definition.organisms[organismId];
    if (!organism) throw new Error(`D2_BACK_ORGANISM: ${device} has no organism for the back navigate`);
    organism.intents.push({ id: intentId, kind: 'navigate', to: target });
  }
  return [];
}
