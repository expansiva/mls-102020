/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2NavigationIds.ts" enhancement="_blank"/>

import type { D2BffDesign, D2BffLeaf, D2BffType } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { parseD2BffType } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import type { D2Page11Definition, D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2SharedV2Definition } from '/_102020_/l2/helpers/sharedV2/format.js';

/** The shared the destination page was approved with, and the design that shared was approved over. */
export interface D2NavDestination {
  shared: D2SharedV2Definition;
  design: D2BffDesign;
}

export type D2NavIdWarning = {
  pageId: string;
  organism: string;
} & ({
  code: 'D2_NAV_ID_AMBIGUOUS' | 'D2_NAV_ID_NO_TYPE';
  param: string;
} | {
  code: 'D2_NAV_ID_DESTINATION_MISSING';
  to: string;
});

export interface D2NavIdInput {
  pageId: string;
  design: D2BffDesign;
  page11: Record<D2Page11Device, D2Page11Definition>;
  destinations: Record<string, D2NavDestination>;
}

const DEVICES: D2Page11Device[] = ['desktop', 'mobile'];

/**
 * A list item that navigates to a page gains the destination's required url id (d2_196).
 * The approved design is not written: the caller renders the contract from the copy returned here.
 * A detail already carries the id on entry, so its source is left alone.
 * Zero matching item types, or more than one, adds nothing and warns.
 * A navigate whose destination was left out (no shared, or no approved design) is skipped and warned.
 */
export function applyD2NavigationIds(input: D2NavIdInput): { design: D2BffDesign; warnings: D2NavIdWarning[] } {
  const design = structuredClone(input.design);
  const warnings: D2NavIdWarning[] = [];
  const seen = new Set<string>();
  for (const device of DEVICES) {
    for (const [organismId, organism] of Object.entries(input.page11[device].organisms)) {
      const reads = input.design.bindings.organisms.filter(row => row.organism === organismId).map(row => row.reads);
      const lists = reads.map(item => listItemTypes(input.design, item)).filter((item): item is D2BffType[] => item !== null);
      if (!lists.length) continue;
      const reachable = [...new Map(lists.flat().map(type => [type.name, type])).values()];
      for (const intent of organism.intents) {
        if (intent.kind !== 'navigate' || !intent.to || intent.id.startsWith('backTo')) continue;
        const destination = input.destinations[intent.to];
        if (!destination) {
          const missing = `missing\n${organismId}\n${intent.to}`;
          if (!seen.has(missing)) {
            seen.add(missing);
            warnings.push({ code: 'D2_NAV_ID_DESTINATION_MISSING', pageId: input.pageId, organism: organismId, to: intent.to });
          }
          continue;
        }
        for (const [param, row] of Object.entries(destination.shared.entry.params)) {
          if (!row.required || !row.sources.includes('url') || !param.endsWith('Id')) continue;
          const key = `${organismId}\n${param}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const matched = reachable.filter(type => matches(entityOf(type), param));
          if (matched.length !== 1) {
            warnings.push({ code: matched.length === 0 ? 'D2_NAV_ID_NO_TYPE' : 'D2_NAV_ID_AMBIGUOUS', pageId: input.pageId, organism: organismId, param });
            continue;
          }
          const type = design.types.find(item => item.name === matched[0].name);
          if (type) ensureIdLeaf(type, param);
        }
      }
    }
  }
  for (const warning of warnings) {
    console.warn(warning.code === 'D2_NAV_ID_DESTINATION_MISSING'
      ? `${warning.code}: ${warning.pageId} ${warning.organism} → ${warning.to}`
      : `${warning.code}: page ${warning.pageId} organism ${warning.organism} param ${warning.param}`);
  }
  return { design, warnings };
}

/** Item types reachable from a list leaf, or null when the organism does not read a list. */
function listItemTypes(design: D2BffDesign, reads: string): D2BffType[] | null {
  const dot = reads.indexOf('.');
  if (dot <= 0) return null;
  const endpoint = design.endpoints.find(item => item.id === reads.slice(0, dot));
  const leaf = endpoint?.output.find(item => item.name === reads.slice(dot + 1));
  if (!leaf) return null;
  const parsed = parseD2BffType(leaf.type);
  if (!parsed || parsed.base !== 'ref' || !(parsed.list || leaf.paginated)) return null;
  const start = design.types.find(item => item.name === parsed.ref);
  if (!start) return null;
  const found: D2BffType[] = [];
  const pending = [start];
  const names = new Set<string>();
  while (pending.length) {
    const type = pending.pop()!;
    if (names.has(type.name)) continue;
    names.add(type.name);
    found.push(type);
    for (const field of type.fields) {
      const ref = parseD2BffType(field.type);
      if (ref?.base !== 'ref') continue;
      const next = design.types.find(item => item.name === ref.ref);
      if (next) pending.push(next);
    }
  }
  return found;
}

/** The single entity of the type's field origins. An aggregate does not count and does not empty the type. */
function entityOf(type: D2BffType): string {
  const entities = new Set(type.fields.flatMap(leaf => leaf.origin?.kind === 'field' ? leaf.origin.paths.map(path => path.split('.')[0]) : []));
  return entities.size === 1 ? [...entities][0] : '';
}

/** `agentId` matches `Agent`; `draftId` matches a name that ends in `Draft`. */
function matches(entity: string, param: string): boolean {
  if (!entity) return false;
  const stem = param.slice(0, -2);
  const pascal = stem ? stem[0].toUpperCase() + stem.slice(1) : '';
  return `${entity[0].toLowerCase()}${entity.slice(1)}Id` === param || Boolean(pascal && entity.endsWith(pascal));
}

function ensureIdLeaf(type: D2BffType, name: string): void {
  const existing = type.fields.find(leaf => leaf.name === name);
  if (existing) {
    if (existing.type === 'string' && !existing.optional) return;
    existing.type = 'string';
    existing.optional = false;
    return;
  }
  const leaf: D2BffLeaf = { name, type: 'string' };
  type.fields.push(leaf);
}
