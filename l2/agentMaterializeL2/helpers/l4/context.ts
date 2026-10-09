/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/l4/context.ts" enhancement="_blank"/>

// The L4 context of a module (task V6, 05/10/2026): module (languages, title), ontology (entities and field
// titles), rules (their text), journeys (business steps) and access (actors). It is INTENT for the LLMs:
// nothing here prescribes code. Each page gets only its slice (the entities, rules, journeys and actors it
// references), never the whole module.
// Grammar only: an `export const <name> = { … } as const …` JSON literal per file, as the L4 planners write it.

import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { L2ContractDefinition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/contract.js';
import type { L2SharedDefinition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';

export interface L4Field { path: string; type: string; title: string; description: string; derived: boolean; required: boolean }
export interface L4Entity { entityId: string; title: string; description: string; displayField: string; fields: L4Field[]; rules: string[] }
export interface L4JourneyStep { stepId: string; kind: string; entity: string; title: string; description: string }
export interface L4Journey { journeyId: string; actorRef: string; title: string; goal: string; steps: L4JourneyStep[] }
export interface L4Actor { actorId: string; title: string; description: string }
export interface L4ModuleContext {
  module: { title: string; productLanguages: string[]; defaultLanguage: string };
  entities: L4Entity[];
  rules: Record<string, string>;
  journeys: L4Journey[];
  actors: L4Actor[];
}
export interface L4PageSlice {
  module: L4ModuleContext['module'];
  entities: L4Entity[];
  rules: Record<string, string>;
  journeys: L4Journey[];
  actors: L4Actor[];
  /** No entity is referenced by the page: every entity is given, by meaning only (no fields). */
  wide: boolean;
}
/** What input.json stores per page: ids only; the text is rebuilt from the L4 when a prompt is written. */
export interface L4PageRefs { entities: string[]; rules: string[]; journeys: string[]; actors: string[]; wide: boolean }

/** Swappable IO, so the reader is testable without the Studio. */
export interface L4Port {
  /** Short names of the `.defs.ts` files in a level-4 folder of the project. */
  listDefs(project: number, folder: string): string[];
  exists(info: Ns5FileInfo): boolean;
  read(info: Ns5FileInfo): Promise<string>;
}

/** The JSON literal of `export const x = { … } as const`; null when the file has none. */
export function parseL4Literal(source: string): Record<string, unknown> | null {
  const text = source.replace(/\r\n/gu, '\n');
  const start = text.indexOf('{', text.search(/export const [A-Za-z0-9_$]+\s*=/u));
  const end = text.lastIndexOf('} as const');
  if (start < 0 || end < start) return null;
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export async function readL4Module(project: number, module: string, port: L4Port): Promise<L4ModuleContext> {
  const read = async (folder: string, shortName: string): Promise<Record<string, unknown> | null> => {
    const info: Ns5FileInfo = { project, level: 4, folder, shortName, extension: '.defs.ts' };
    return port.exists(info) ? parseL4Literal(await port.read(info)) : null;
  };
  const many = async (folder: string) => {
    const rows: Array<Record<string, unknown>> = [];
    for (const name of port.listDefs(project, folder).filter(item => item !== 'index').sort()) {
      const row = await read(folder, name);
      if (row) rows.push(row);
    }
    return rows;
  };
  return buildL4Module(await read(module, 'module'), await many(`${module}/ontology`), await read(module, 'rules'), await many(`${module}/journeys`), await read(module, 'access'));
}

/** Pure: the parsed literals → the context. Missing parts become empty, never a failure. */
export function buildL4Module(
  moduleRow: Record<string, unknown> | null,
  entityRows: Array<Record<string, unknown>>,
  rulesRow: Record<string, unknown> | null,
  journeyRows: Array<Record<string, unknown>>,
  accessRow: Record<string, unknown> | null,
): L4ModuleContext {
  const languages = strings(moduleRow?.productLanguages);
  const defaultLanguage = str(moduleRow?.defaultLanguage) || languages[0] || '';
  return {
    module: { title: str(moduleRow?.title), productLanguages: languages.length ? languages : defaultLanguage ? [defaultLanguage] : [], defaultLanguage },
    entities: entityRows.map(row => ({
      entityId: str(row.entityId), title: str(row.title), description: str(row.description), displayField: str(row.displayField),
      fields: flattenFields(record(record(row.record).fields)), rules: strings(row.rules),
    })).filter(item => item.entityId),
    rules: Object.fromEntries(Object.entries(record(rulesRow?.rules)).filter(([, text]) => typeof text === 'string')) as Record<string, string>,
    journeys: journeyRows.map(row => {
      const business = record(row.business);
      return {
        journeyId: str(row.journeyId), actorRef: str(business.actorRef), title: str(business.title), goal: str(business.goal),
        steps: (Array.isArray(business.steps) ? business.steps : []).map(item => {
          const step = record(item);
          return { stepId: str(step.stepId), kind: str(step.kind), entity: str(step.entity), title: str(step.title), description: str(step.description) };
        }),
      };
    }).filter(item => item.journeyId),
    actors: (Array.isArray(accessRow?.actors) ? accessRow.actors as unknown[] : []).map(item => {
      const actor = record(item);
      return { actorId: str(actor.actorId), title: str(actor.title), description: str(actor.description) };
    }).filter(item => item.actorId),
  };
}

/**
 * The slice of a page. Generic, by reference, never by module:
 * - rules: the rule ids of its routes and of its shared;
 * - actors: the actors of its routes and of its shared access;
 * - journeys: the journey ids its shared journeys name (`<journeyId>/<stepId>`);
 * - entities: those its routes write (`Entity.op`), its journeys' steps touch, or whose id names a
 *   projection or a field segment of the contract. With no match at all, every entity (a module is small).
 */
export function sliceL4ForPage(l4: L4ModuleContext, contract: L2ContractDefinition, shared: L2SharedDefinition): L4PageSlice {
  const ruleIds = new Set([...contract.routes.flatMap(route => route.rules), ...Object.values(shared.rules ?? {}).flatMap(value => Array.isArray(value) ? value : [])]);
  const actorIds = new Set([...contract.routes.flatMap(route => route.access.actors), ...(shared.access?.actors ?? [])]);
  const journeyIds = new Set(shared.journeys.map(item => item.step.split('/')[0]).filter(Boolean));
  const journeys = l4.journeys.filter(item => journeyIds.has(item.journeyId));
  const named = new Set<string>();
  for (const route of contract.routes) if (route.writes) named.add(route.writes.split('.')[0]);
  for (const journey of journeys) for (const step of journey.steps) if (step.entity) named.add(step.entity);
  const segments = new Set(contract.projections.flatMap(item => item.fields.flatMap(field => field.name.split('.'))));
  const lower = (value: string) => value ? value[0].toLowerCase() + value.slice(1) : value;
  for (const entity of l4.entities) {
    if (contract.projections.some(item => item.name.startsWith(entity.entityId)) || segments.has(lower(entity.entityId))) named.add(entity.entityId);
  }
  const entities = l4.entities.filter(item => named.has(item.entityId));
  for (const entity of entities) for (const rule of entity.rules) ruleIds.add(rule);
  return {
    module: l4.module,
    entities: entities.length ? entities : l4.entities,
    rules: Object.fromEntries(Object.entries(l4.rules).filter(([id]) => ruleIds.has(id))),
    journeys,
    actors: l4.actors.filter(item => actorIds.has(item.actorId)),
    wide: !entities.length,
  };
}

export function l4RefsOf(slice: L4PageSlice): L4PageRefs {
  return {
    entities: slice.entities.map(item => item.entityId), rules: Object.keys(slice.rules),
    journeys: slice.journeys.map(item => item.journeyId), actors: slice.actors.map(item => item.actorId), wide: slice.wide,
  };
}

/** The slice again from the module context and the stored ids (shared40, pages50, tests60). */
export function resolveL4Refs(l4: L4ModuleContext, refs: L4PageRefs): L4PageSlice {
  const has = (list: string[]) => (id: string) => list.includes(id);
  return {
    module: l4.module,
    entities: l4.entities.filter(item => has(refs.entities)(item.entityId)),
    rules: Object.fromEntries(Object.entries(l4.rules).filter(([id]) => has(refs.rules)(id))),
    journeys: l4.journeys.filter(item => has(refs.journeys)(item.journeyId)),
    actors: l4.actors.filter(item => has(refs.actors)(item.actorId)),
    wide: refs.wide,
  };
}

/** The slice as compact Markdown for a prompt: meanings and titles, nothing to copy as code. */
export function renderL4Slice(slice: L4PageSlice): string {
  const lines: string[] = [];
  lines.push(`- module: ${slice.module.title || '(no title)'}; product languages: ${slice.module.productLanguages.join(', ') || '(none declared)'}; default: ${slice.module.defaultLanguage || '(none)'}`);
  if (slice.actors.length) lines.push('', '## Actors', ...slice.actors.map(item => `- ${item.actorId} — ${item.title}: ${item.description}`));
  if (slice.entities.length) {
    lines.push('', slice.wide ? '## Entities of the module (meaning only; the page names none)' : '## Entities (meaning and field titles)');
    for (const entity of slice.entities) {
      lines.push(`- **${entity.entityId}** — ${entity.title}: ${entity.description}${entity.displayField ? ` (shown by \`${entity.displayField}\`)` : ''}`);
      if (slice.wide) continue;
      for (const field of entity.fields.filter(item => item.title)) {
        lines.push(`  - \`${field.path}\` (${field.type}${field.derived ? ', computed by the backend' : ''}${field.required ? ', required' : ''}) — ${field.title}${field.description ? `: ${field.description}` : ''}`);
      }
    }
  }
  const rules = Object.entries(slice.rules);
  if (rules.length) lines.push('', '## Business rules', ...rules.map(([id, text]) => `- ${id}: ${text}`));
  if (slice.journeys.length) {
    lines.push('', '## Journeys');
    for (const journey of slice.journeys) {
      lines.push(`- **${journey.journeyId}** (${journey.actorRef}) — ${journey.title}: ${journey.goal}`);
      for (const step of journey.steps) lines.push(`  - ${step.stepId} [${step.kind}${step.entity ? ` ${step.entity}` : ''}] ${step.title}${step.description ? `: ${step.description}` : ''}`);
    }
  }
  return lines.join('\n');
}

/** Ontology fields, nested ones by dotted path (`details.disponivel`). */
function flattenFields(fields: Record<string, unknown>, prefix = ''): L4Field[] {
  const out: L4Field[] = [];
  for (const [name, value] of Object.entries(fields)) {
    const row = record(value);
    const path = prefix ? `${prefix}.${name}` : name;
    out.push({ path, type: str(row.type), title: str(row.title), description: str(row.description), derived: row.derived === true, required: row.required === true });
    if (row.fields && typeof row.fields === 'object') out.push(...flattenFields(record(row.fields), path));
  }
  return out;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function str(value: unknown): string { return typeof value === 'string' ? value : ''; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
