/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2SharedV2.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import type { D2Page11Definition, D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { d2BffValueLeaves, d2FedReads, d2ReadCovered, type D2BffDesign, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { buildD2SharedV2, type D2SharedV2Definition, type D2SharedV2Issue } from '/_102020_/l2/helpers/sharedV2/format.js';

export interface D2SharedGateContext {
  page11: Record<D2Page11Device, D2Page11Definition>;
  drafts: Record<D2Page11Device, D2Page11Needs>;
  need: D2NeedPage;
  menu: D2Menu;
  design: D2BffDesign;
  entities: Record<string, Ns5OntologyAnyEntity>;
}

/**
 * D (d2_73, d2_94): facts of the shared over the approved BFF, never its shape. Every organism that reads is listed in
 * the organisms of some state (d2_80) and what it reads is held by a state whose source carries it. Every state is
 * filled by a source. Journey steps exist and name organisms of the page.
 */
export function gateD2SharedV2(value: unknown, context: D2SharedGateContext): D2SharedV2Issue[] {
  const issues: D2SharedV2Issue[] = [];
  let definition: D2SharedV2Definition;
  try { definition = buildD2SharedV2(value); } catch (error) { return [{ code: 'D2_SHARED_V2_FORMAT', path: 'definition', message: String(error) }]; }
  const add = (code: string, path: string, message: string): void => { issues.push({ code, path, message }); };
  const organisms = new Map<string, { reads: Set<string> }>();
  for (const device of ['desktop', 'mobile'] as const) {
    for (const id of Object.keys(context.page11[device].organisms)) {
      const row = organisms.get(id) ?? { reads: new Set<string>() };
      const draft = context.drafts[device].organisms[id];
      for (const path of draft ? d2FedReads(draft) : []) row.reads.add(path);
      organisms.set(id, row);
    }
  }

  // D.4: every state is filled by a source.
  for (const [id, state] of Object.entries(definition.states)) {
    if (!validStateSource(id, state.source, definition)) add('D2_SHARED_V2_STATE_SOURCE', `states.${id}`, `State ${id} source ${JSON.stringify(state.source)} is not <endpoint>.<output key>, <command>.input, entry.params.<name>, or another state id.`);
  }

  // D.1: an organism that reads is listed by a state; what it reads is held by a state.
  const held = new Map(Object.keys(definition.states).map(id => [id, heldPaths(id, definition, context.design)]));
  const listed = new Set(Object.values(definition.states).flatMap(state => state.organisms));
  for (const [id, row] of organisms) {
    if (row.reads.size && !listed.has(id)) add('D2_SHARED_V2_ORGANISM_UNFED', `organisms.${id}`, `Organism ${id} reads, and no state lists it in organisms.`);
    for (const path of row.reads) {
      if ([...held.values()].some(origins => d2ReadCovered(path, origins, context.entities))) continue;
      add('D2_SHARED_V2_ORGANISM_UNFED', `organisms.${id}`, `Organism ${id} reads ${path}, and no state holds it: no state's source is an endpoint output that carries it.`);
    }
  }

  // Journeys: only the real steps of the page, each served by an organism or a continuation; references exist.
  const journeySteps = new Set(context.need.reads.flatMap(read => read.from.filter(item => item.startsWith('journey:')).map(item => item.slice('journey:'.length))));
  const pageJourneys = new Set(Object.entries(context.menu.meta?.journeys ?? {}).filter(([, pages]) => pages.includes(context.need.pageId)).map(([id]) => id));
  for (const step of journeySteps) {
    if (!pageJourneys.has(step.split('/')[0])) add('D2_SHARED_V2_JOURNEY_OUTSIDE', 'journeys', `Step ${step} is not linked to this page in the menu.`);
    if (!definition.journeys.some(item => item.step === step && (item.organisms.length || item.continuesIn))) add('D2_SHARED_V2_JOURNEY_UNSERVED', 'journeys', `Needs step ${step} is not served by an organism or continuesIn.`);
  }
  for (const row of definition.journeys) {
    if (!journeySteps.has(row.step)) add('D2_SHARED_V2_JOURNEY_INVENTED', `journeys.${row.step}`, `Journey step ${row.step} is not a real step for this page.`);
    for (const organism of row.organisms) if (!organisms.has(organism)) add('D2_SHARED_V2_JOURNEY_REF', `journeys.${row.step}`, `Journey step ${row.step} names organism ${organism}, which is not on the page.`);
  }
  return issues;
}

/** The L4 paths a state holds, through its source: an endpoint output key or a command input, by their leaf origins. */
function heldPaths(stateId: string, definition: D2SharedV2Definition, design: D2BffDesign, seen = new Set<string>()): string[] {
  if (seen.has(stateId)) return [];
  seen.add(stateId);
  const source = definition.states[stateId]?.source ?? '';
  if (definition.states[source]) return heldPaths(source, definition, design, seen);
  const dot = source.indexOf('.');
  if (dot <= 0 || source.startsWith('entry.')) return [];
  const endpoint = design.endpoints.find(item => item.id === source.slice(0, dot));
  const tail = source.slice(dot + 1);
  if (!endpoint) return [];
  const rows = tail === 'input' ? endpoint.input : endpoint.output.filter(leaf => leaf.name === tail);
  return d2BffValueLeaves(rows, design).flatMap(item => item.leaf.origin?.paths ?? []);
}

function entryParamName(source: string): string | null {
  const prefix = 'entry.params.';
  if (!source.startsWith(prefix)) return null;
  const name = source.slice(prefix.length);
  if (!name || name.includes('.')) return null;
  return name;
}

function validStateSource(stateId: string, source: string, definition: D2SharedV2Definition): boolean {
  const paramName = entryParamName(source);
  if (paramName !== null) return Object.prototype.hasOwnProperty.call(definition.entry.params, paramName);
  const dot = source.indexOf('.');
  if (dot > 0) {
    const requestId = source.slice(0, dot);
    const tail = source.slice(dot + 1);
    const request = definition.requests[requestId];
    if (!request || !tail || tail.includes('.')) return false;
    if (tail === 'input') return request.kind === 'cmd';
    return request.returns.includes(tail);
  }
  if (definition.states[source]) return source !== stateId;
  return false;
}

/** Menu pages the page actors can open: the navigate targets a shared function may name. */
export function d2SharedNavigablePages(menu: D2Menu, actors: readonly string[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: D2Menu['tree']): void => { for (const node of nodes) { if (node.kind === 'page') ids.push(node.id); walk(node.children ?? []); } };
  walk(menu.tree);
  return ids.filter(pageId => canNavigate(menu, pageId, new Set(actors)));
}

function canNavigate(menu: D2Menu, pageId: string, pageActors: Set<string>): boolean {
  const path = menuPath(menu.tree, pageId, []);
  if (!path) return false;
  for (const [actor, refs] of Object.entries(menu.authorities ?? {})) {
    if (!refs.some(ref => path.includes(ref))) continue;
    if (pageActors.has(actor.replace(/^actor:/u, ''))) return true;
  }
  return false;
}

function menuPath(nodes: D2Menu['tree'], pageId: string, ancestors: string[]): string[] | null {
  for (const node of nodes) {
    const path = [...ancestors, node.id];
    if (node.kind === 'page' && node.id === pageId) return path;
    const child = menuPath(node.children ?? [], pageId, path);
    if (child) return child;
  }
  return null;
}
