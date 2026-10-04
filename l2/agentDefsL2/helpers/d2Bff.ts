/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2Bff.ts" enhancement="_blank"/>

import { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import type { D2Page11Definition, D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { d2WriteByKey, d2WriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';
import { d2TransitionPayload } from '/_102020_/l2/agentDefsL2/helpers/d2WriteInput.js';

/**
 * d2_73: the BFF of one page, designed by the LLM (bff55 A) and checked by code (bff55 B). The code checks facts only:
 * coverage of what the organisms read, the input each submit's write asks for, origins, rules and enums that exist in
 * L4 and are visible to the page actors, and nothing outside the plan. How many endpoints, their shape, paging, filters
 * and names are the design's (P8). Origins stay in the pipeline; the contract never carries them.
 */

export interface D2NeedRead { entity: string; derived: string[]; from: string[]; family?: string; scope?: string }
export interface D2NeedWrite { entity: string; operation: string; transitionRef?: string }
export interface D2NeedPage { pageId: string; actors: string[]; reads: D2NeedRead[]; writes: D2NeedWrite[] }
export interface D2MenuNode { id: string; kind: string; children?: D2MenuNode[] }
export interface D2Menu {
  tree: D2MenuNode[];
  authorities: Record<string, string[]>;
  meta?: { journeys?: Record<string, string[]> };
  userLanguage?: string;
}
export interface D2Grant {
  grantId: string;
  actorRef: string;
  entityRefs: string[];
  dataScope?: { mode: string };
  disclosure: { mode: string; allowedFields?: string[]; deniedFields?: string[] };
}

export type D2BffOriginKind = 'field' | 'aggregate' | 'context';
export interface D2BffOrigin { kind: D2BffOriginKind; paths: string[] }
export interface D2BffLeaf { name: string; type: string; optional?: boolean; origin?: D2BffOrigin }
export interface D2BffType { name: string; description: string; fields: D2BffLeaf[] }
export interface D2BffJsdoc { purpose: string; input: string; processing: string; output: string }
export interface D2BffEndpoint {
  id: string;
  kind: 'qry' | 'cmd';
  /** `onLoad`, `interaction`, or the id of the submit intent a command serves. */
  when: string;
  /** The write key (`Entity.<transitionRef>` for a transition), only on a command. */
  writes?: string;
  input: D2BffLeaf[];
  output: D2BffLeaf[];
  rules: string[];
  jsdoc: D2BffJsdoc;
}
/**
 * The links of the page, designed by A (d2_75): where each organism that reads is fed (`<endpointId>.<key>`), which
 * queries a command reloads, how a selection resolves, and which organisms and endpoints serve each journey step.
 */
export interface D2BffBindings {
  organisms: Array<{ organism: string; reads: string }>;
  commands: Array<{ endpoint: string; refreshes: string[] }>;
  selections: Array<{ organism: string; via: { query: string } | { list: string } }>;
  journeys: Array<{ step: string; organisms: string[]; endpoints: string[]; continuesIn?: string }>;
}
export interface D2BffDesign { types: D2BffType[]; endpoints: D2BffEndpoint[]; bindings: D2BffBindings }
export interface D2BffIssue { code: string; path: string; message: string }

export interface D2BffTypeRef { base: 'string' | 'number' | 'boolean' | 'enum' | 'ref'; values: string[]; ref: string; list: boolean }

const PATH = /^[A-Z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/u;
const TYPE = /^(?:(string|number|boolean)|([A-Z][A-Za-z0-9]*)|('[^'\\]+'(?:\s*\|\s*'[^'\\]+')*))(\[\])?$/u;
/** The type grammar of a leaf, for the tool schema: a scalar, a named type or a union of literals, `[]` for a list. */
export const D2_BFF_TYPE_PATTERN = TYPE.source;

export function parseD2BffType(type: string): D2BffTypeRef | null {
  const match = TYPE.exec(type.trim());
  if (!match) return null;
  const list = Boolean(match[4]);
  if (match[1]) return { base: match[1] as 'string' | 'number' | 'boolean', values: [], ref: '', list };
  if (match[2]) return { base: 'ref', values: [], ref: match[2], list };
  const values = [...match[3].matchAll(/'([^'\\]+)'/gu)].map(item => item[1]);
  return { base: 'enum', values, ref: '', list };
}

export function renderD2BffType(ref: D2BffTypeRef): string {
  const one = ref.base === 'enum' ? ref.values.map(value => `'${value}'`).join(' | ') : ref.base === 'ref' ? ref.ref : ref.base;
  if (!ref.list) return one;
  return ref.base === 'enum' && ref.values.length > 1 ? `Array<${one}>` : `${one}[]`;
}

/** Words of a name the answer wrote, whatever its case or separators. */
const words = (raw: string): string[] => raw.split(/[^A-Za-z0-9]+/u).filter(Boolean);
/** lowerCamel of a leaf name or endpoint id the answer wrote (d2_76): the case is form, never a refusal. */
export function d2LowerCamel(raw: string, fallback: string): string {
  const joined = words(raw).map((part, index) => (index ? part[0].toUpperCase() : part[0].toLowerCase()) + part.slice(1)).join('');
  if (!joined) return fallback;
  return /^[0-9]/u.test(joined) ? `x${joined}` : joined;
}
/** PascalCase of a type name the answer wrote (d2_76). */
export function d2PascalCase(raw: string, fallback: string): string {
  const joined = words(raw).map(part => part[0].toUpperCase() + part.slice(1)).join('');
  if (!joined) return fallback;
  return /^[0-9]/u.test(joined) ? `T${joined}` : joined;
}

/**
 * Tool format of the answer (not a design gate). d2_76: everything the code can fix is normalized before any check
 * (case of names and ids, identical duplicates, references that follow a renamed id or key); what the strict schema
 * already guarantees is an internal assertion (`D2_BFF_ASSERT`, no repair cycle); only content the code cannot derive
 * is refused (`D2_BFF_FORMAT`).
 */
export function buildD2BffDesign(value: unknown): D2BffDesign {
  const assert = (path: string, what: string): never => { throw new Error(`D2_BFF_ASSERT: ${path}: ${what}`); };
  const fail = (path: string, what: string): never => { throw new Error(`D2_BFF_FORMAT: ${path}: ${what}`); };
  const root = record(value) ?? assert('design', 'not an object');
  if (!Array.isArray(root.types) || !Array.isArray(root.endpoints)) assert('design', 'types and endpoints are lists');

  const typeNames = new Map<string, string>();
  const rawTypes: Array<{ name: string; description: string; fields: unknown[] }> = [];
  (root.types as unknown[]).forEach((raw, index) => {
    const row = record(raw) ?? assert(`types.${index}`, 'not an object');
    const written = typeof row.name === 'string' ? row.name : '';
    const name = d2PascalCase(written, `Type${index + 1}`);
    if (!Array.isArray(row.fields)) assert(`types.${name}.fields`, 'not a list');
    if (!(row.fields as unknown[]).length) fail(`types.${name}.fields`, 'a named type has at least one field');
    const type = { name, description: typeof row.description === 'string' ? row.description.trim() : '', fields: row.fields as unknown[] };
    const same = rawTypes.find(item => item.name === name);
    if (same && JSON.stringify(same) !== JSON.stringify(type)) fail(`types.${name}`, 'declared twice with different fields');
    if (written) typeNames.set(written, name);
    typeNames.set(name, name);
    if (!same) rawTypes.push(type);
  });
  const typeOf = (ref: string): string | undefined => typeNames.get(ref) ?? typeNames.get(d2PascalCase(ref, ''));

  const leaves = (rows: unknown, path: string, renamed?: Map<string, string>): D2BffLeaf[] => {
    if (!Array.isArray(rows)) assert(path, 'not a list');
    const out: D2BffLeaf[] = [];
    (rows as unknown[]).forEach((raw, index) => {
      const row = record(raw) ?? assert(`${path}.${index}`, 'not an object');
      const written = typeof row.name === 'string' ? row.name : '';
      const name = d2LowerCamel(written, `field${index + 1}`);
      const parsed = parseD2BffType(typeof row.type === 'string' ? row.type : '') ?? assert(`${path}.${name}.type`, `${JSON.stringify(row.type)} is not string, number, boolean, a named type or a union of literals, with [] for a list`);
      let ref = parsed;
      if (parsed.base === 'ref') {
        const target = typeOf(parsed.ref) ?? fail(`${path}.${name}.type`, `named type ${parsed.ref} is not declared in types`);
        ref = { ...parsed, ref: target };
      }
      // A leaf that names a type has its origins in that type: whatever origin it carries is ignored (d2_74).
      const origin = ref.base === 'ref' || row.origin === undefined || row.origin === null ? undefined : parseOrigin(row.origin, `${path}.${name}.origin`, assert, fail);
      if (ref.base !== 'ref' && !origin) assert(`${path}.${name}.origin`, 'a value leaf names its origin');
      const leaf: D2BffLeaf = { name, type: renderD2BffType(ref), ...(row.optional === true ? { optional: true } : {}), ...(ref.base !== 'ref' && origin ? { origin } : {}) };
      if (written && written !== name) renamed?.set(written, name);
      const same = out.find(item => item.name === name);
      if (same && JSON.stringify(same) !== JSON.stringify(leaf)) fail(`${path}.${name}`, 'declared twice with different types or origins');
      if (!same) out.push(leaf);
    });
    return out;
  };
  const types: D2BffType[] = rawTypes.map(type => ({ name: type.name, description: type.description, fields: leaves(type.fields, `types.${type.name}.fields`) }));

  const endpointIds = new Map<string, string>();
  const outputKeys = new Map<string, Map<string, string>>();
  const endpoints: D2BffEndpoint[] = [];
  (root.endpoints as unknown[]).forEach((raw, index) => {
    const row = record(raw) ?? assert(`endpoints.${index}`, 'not an object');
    const written = typeof row.id === 'string' ? row.id : '';
    const id = d2LowerCamel(written, `endpoint${index + 1}`);
    if (row.kind !== 'qry' && row.kind !== 'cmd') assert(`endpoints.${id}.kind`, 'qry or cmd');
    const when = typeof row.when === 'string' ? row.when.trim() : '';
    if (!when) assert(`endpoints.${id}.when`, 'onLoad, interaction or a submit intent id');
    // A query writes nothing: a write the host filled in is dropped, never refused (d2_74). A command keeps it for B.2/B.4.
    const writes = row.kind === 'cmd' && typeof row.writes === 'string' ? row.writes.trim() : '';
    if (row.kind === 'cmd' && !writes) fail(`endpoints.${id}.writes`, 'a command names its write');
    const doc = record(row.jsdoc) ?? assert(`endpoints.${id}.jsdoc`, 'not an object');
    const jsdoc = {} as D2BffJsdoc;
    for (const key of ['purpose', 'input', 'processing', 'output'] as const) {
      const text = typeof doc[key] === 'string' ? (doc[key] as string).trim() : '';
      if (!text) fail(`endpoints.${id}.jsdoc.${key}`, 'empty');
      jsdoc[key] = text;
    }
    if (!Array.isArray(row.rules) || !row.rules.every(item => typeof item === 'string')) assert(`endpoints.${id}.rules`, 'a list of rule ids');
    const renamed = new Map<string, string>();
    const endpoint: D2BffEndpoint = {
      id, kind: row.kind as 'qry' | 'cmd', when, ...(writes ? { writes } : {}),
      input: leaves(row.input, `endpoints.${id}.input`), output: leaves(row.output, `endpoints.${id}.output`, renamed),
      rules: [...new Set(row.rules as string[])], jsdoc,
    };
    const same = endpoints.find(item => item.id === id);
    if (same && JSON.stringify(same) !== JSON.stringify(endpoint)) fail(`endpoints.${id}`, 'declared twice with different content');
    if (written) endpointIds.set(written, id);
    endpointIds.set(id, id);
    outputKeys.set(id, new Map([...(outputKeys.get(id) ?? []), ...renamed]));
    if (!same) endpoints.push(endpoint);
  });

  // References follow a renamed endpoint id or output key; an unknown one stays as written for B to name.
  const endpointRef = (value: string): string => endpointIds.get(value) ?? endpointIds.get(d2LowerCamel(value, value)) ?? value;
  const keyRef = (value: string): string => {
    const dot = value.indexOf('.');
    if (dot <= 0) return value;
    const id = endpointRef(value.slice(0, dot));
    const key = value.slice(dot + 1);
    return `${id}.${outputKeys.get(id)?.get(key) ?? (endpoints.find(item => item.id === id)?.output.some(leaf => leaf.name === key) ? key : d2LowerCamel(key, key))}`;
  };
  const bindings = parseBindings(root.bindings, assert);
  return {
    types, endpoints,
    bindings: {
      organisms: bindings.organisms.map(row => ({ ...row, reads: keyRef(row.reads) })),
      commands: bindings.commands.map(row => ({ endpoint: endpointRef(row.endpoint), refreshes: row.refreshes.map(endpointRef) })),
      selections: bindings.selections.map(row => ({ ...row, via: 'query' in row.via ? { query: endpointRef(row.via.query) } : { list: keyRef(row.via.list) } })),
      journeys: bindings.journeys.map(row => ({ ...row, endpoints: row.endpoints.map(endpointRef) })),
    },
  };
}

function parseBindings(value: unknown, fail: (path: string, what: string) => never): D2BffBindings {
  const root = record(value) ?? fail('bindings', 'not an object');
  const list = (key: string): Record<string, unknown>[] => {
    if (!Array.isArray(root[key])) fail(`bindings.${key}`, 'not a list');
    return (root[key] as unknown[]).map((raw, index) => record(raw) ?? fail(`bindings.${key}.${index}`, 'not an object'));
  };
  const text = (row: Record<string, unknown>, key: string, at: string): string => {
    if (typeof row[key] !== 'string') fail(`${at}.${key}`, 'not a string');
    return (row[key] as string).trim();
  };
  const texts = (row: Record<string, unknown>, key: string, at: string): string[] => {
    if (!Array.isArray(row[key]) || !(row[key] as unknown[]).every(item => typeof item === 'string')) fail(`${at}.${key}`, 'a list of strings');
    return [...new Set((row[key] as string[]).map(item => item.trim()).filter(Boolean))];
  };
  return {
    organisms: list('organisms').map((row, index) => ({ organism: text(row, 'organism', `bindings.organisms.${index}`), reads: text(row, 'reads', `bindings.organisms.${index}`) })),
    commands: list('commands').map((row, index) => ({ endpoint: text(row, 'endpoint', `bindings.commands.${index}`), refreshes: texts(row, 'refreshes', `bindings.commands.${index}`) })),
    selections: list('selections').map((row, index) => {
      const at = `bindings.selections.${index}`;
      const via = record(row.via) ?? fail(`${at}.via`, 'not an object');
      const ref = text(via, 'ref', `${at}.via`);
      if (via.kind !== 'query' && via.kind !== 'list') fail(`${at}.via.kind`, 'query or list');
      return { organism: text(row, 'organism', at), via: via.kind === 'query' ? { query: ref } : { list: ref } };
    }),
    journeys: list('journeys').map((row, index) => {
      const at = `bindings.journeys.${index}`;
      const continuesIn = typeof row.continuesIn === 'string' ? row.continuesIn.trim() : '';
      return { step: text(row, 'step', at), organisms: texts(row, 'organisms', at), endpoints: texts(row, 'endpoints', at), ...(continuesIn ? { continuesIn } : {}) };
    }),
  };
}

/**
 * A leaf that carries one field takes the field's key as its name and the type the contract gives that field (d2_75):
 * the answer's choice is overwritten, never refused. Two leaves of one list that derive the same name keep the root
 * entity's leaf as is and prefix the others with their entity. Bindings follow the renamed output keys.
 */
export function normalizeD2BffDesign(raw: D2BffDesign, entities: Record<string, Ns5OntologyAnyEntity>, reservedTypeName = ''): D2BffDesign {
  // The contract interface of the page owns its name: a type that took it is renamed, with its references (d2_76).
  let design = raw;
  if (reservedTypeName && raw.types.some(type => type.name === reservedTypeName)) {
    let to = `${reservedTypeName}Shape`;
    while (raw.types.some(type => type.name === to)) to = `${to}X`;
    const retype = (leaf: D2BffLeaf): D2BffLeaf => { const ref = parseD2BffType(leaf.type); return ref?.base === 'ref' && ref.ref === reservedTypeName ? { ...leaf, type: renderD2BffType({ ...ref, ref: to }) } : leaf; };
    design = {
      ...raw,
      types: raw.types.map(type => ({ ...type, name: type.name === reservedTypeName ? to : type.name, fields: type.fields.map(retype) })),
      endpoints: raw.endpoints.map(endpoint => ({ ...endpoint, input: endpoint.input.map(retype), output: endpoint.output.map(retype) })),
    };
  }
  const fix = (rows: D2BffLeaf[], at: string, fallbackRoot = ''): { rows: D2BffLeaf[]; renamed: Map<string, string> } => {
    const field = (leaf: D2BffLeaf): string => (leaf.origin?.kind === 'field' ? leaf.origin.paths[0] : '');
    const root = rows.map(field).find(path => path.split('.').length === 2 && path.endsWith('.id'))?.split('.')[0] ?? fallbackRoot;
    const derivedName = (leaf: D2BffLeaf): string => { const path = field(leaf); return path ? path.split('.').slice(-1)[0] : leaf.name; };
    const counts = new Map<string, number>();
    for (const leaf of rows) counts.set(derivedName(leaf), (counts.get(derivedName(leaf)) ?? 0) + 1);
    const renamed = new Map<string, string>();
    const out = rows.map(leaf => {
      const path = field(leaf);
      if (!path) return leaf;
      const entity = entityOf(path);
      let name = derivedName(leaf);
      if ((counts.get(name) ?? 0) > 1 && entity !== root) name = `${entity[0].toLowerCase()}${entity.slice(1)}${name[0].toUpperCase()}${name.slice(1)}`;
      const type = d2OntologyLeafType(entities[entity], path);
      const ref = parseD2BffType(leaf.type);
      const next = { ...leaf, name, type: type && ref ? renderD2BffType({ ...type, list: ref.list }) : leaf.type };
      if (next.name !== leaf.name) renamed.set(leaf.name, next.name);
      return next;
    });
    // The same field twice is one leaf (d2_76); two different leaves under one name cannot be told apart.
    const unique: D2BffLeaf[] = [];
    for (const leaf of out) {
      const same = unique.find(item => item.name === leaf.name);
      if (!same) { unique.push(leaf); continue; }
      if (JSON.stringify(same.origin) !== JSON.stringify(leaf.origin)) throw new Error(`D2_BFF_FORMAT: ${at}.${leaf.name}: two leaves with different origins carry the same name after the ontology names were applied.`);
    }
    return { rows: unique, renamed };
  };
  const types = design.types.map(type => ({ ...type, fields: fix(type.fields, `types.${type.name}.fields`).rows }));
  const outputs = new Map<string, Map<string, string>>();
  const endpoints = design.endpoints.map(endpoint => {
    const output = fix(endpoint.output, `endpoints.${endpoint.id}.output`);
    outputs.set(endpoint.id, output.renamed);
    return { ...endpoint, input: fix(endpoint.input, `endpoints.${endpoint.id}.input`, endpoint.writes ? entityOf(endpoint.writes) : '').rows, output: output.rows };
  });
  const ref = (value: string): string => {
    const dot = value.indexOf('.');
    if (dot <= 0) return value;
    const key = value.slice(dot + 1);
    return `${value.slice(0, dot)}.${outputs.get(value.slice(0, dot))?.get(key) ?? key}`;
  };
  const bindings = design.bindings;
  return {
    types, endpoints,
    bindings: {
      ...bindings,
      organisms: bindings.organisms.map(row => ({ ...row, reads: ref(row.reads) })),
      selections: bindings.selections.map(row => ('list' in row.via ? { ...row, via: { list: ref(row.via.list) } } : row)),
    },
  };
}

/** The contract type of one ontology field, as the v2 contract of main renders it; null for a branch. */
export function d2OntologyLeafType(entity: Ns5OntologyAnyEntity | undefined, path: string): D2BffTypeRef | null {
  const field = fieldAt(entity, path);
  if (!field || field.fields) return null;
  if (field.type === 'enum' && field.values?.length) return { base: 'enum', values: field.values.map(item => item.value), ref: '', list: false };
  if (field.type === 'boolean') return { base: 'boolean', values: [], ref: '', list: false };
  if (field.type === 'integer' || field.type === 'number' || field.type === 'decimal') return { base: 'number', values: [], ref: '', list: false };
  return { base: 'string', values: [], ref: '', list: false };
}

/** The root entity of a named type: the one of its `Entity.id` leaf, else the single entity of its field leaves. */
export function d2BffTypeRoot(name: string, design: Pick<D2BffDesign, 'types'>): string {
  const type = design.types.find(item => item.name === name);
  if (!type) return '';
  const paths = type.fields.flatMap(leaf => (leaf.origin?.kind === 'field' ? leaf.origin.paths : []));
  const id = paths.find(path => path.split('.').length === 2 && path.endsWith('.id'));
  if (id) return entityOf(id);
  if (type.fields.some(leaf => leaf.origin?.kind === 'aggregate')) return '';
  const entities = new Set(paths.map(entityOf));
  return entities.size === 1 ? [...entities][0] : '';
}

/** The journey steps of the page: steps of the journeys the menu links to it, as the needs list them. */
/**
 * The coverage A owes (d2_77): every Entity.path an organism reads, from the page drafts, with the derived fields marked
 * and the organisms that read each one. B.1 refuses by the same list; the prompt states it so the design starts complete.
 */
export function d2CoverageObligation(drafts: readonly D2Page11Needs[], entities: Record<string, Ns5OntologyAnyEntity>): Array<{ path: string; derived: boolean; organisms: string[] }> {
  const rows = new Map<string, Set<string>>();
  for (const draft of drafts) for (const [id, row] of Object.entries(draft.organisms)) for (const path of row.reads) rows.set(path, (rows.get(path) ?? new Set()).add(id));
  return [...rows].sort(([a], [b]) => a.localeCompare(b)).map(([path, organisms]) => ({ path, derived: Boolean(fieldAt(entities[entityOf(path)], path)?.derived), organisms: [...organisms].sort() }));
}

/** The name of the contract interface of a page (`renderD2ContractV2`). */
export function d2ContractsTypeName(pageId: string): string { return `${pageId[0].toUpperCase()}${pageId.slice(1)}Contracts`; }

export function d2PageJourneySteps(need: D2NeedPage, menu: D2Menu): string[] {
  const linked = new Set(Object.entries(menu.meta?.journeys ?? {}).filter(([, pages]) => pages.includes(need.pageId)).map(([id]) => id));
  const steps = need.reads.flatMap(read => read.from.filter(item => item.startsWith('journey:')).map(item => item.slice('journey:'.length)));
  return [...new Set(steps.filter(step => linked.has(step.split('/')[0])))];
}

export function d2MenuPages(menu: D2Menu): string[] {
  const ids: string[] = [];
  const walk = (nodes: D2Menu['tree']): void => { for (const node of nodes) { if (node.kind === 'page') ids.push(node.id); walk(node.children ?? []); } };
  walk(menu.tree);
  return ids;
}

function parseOrigin(value: unknown, path: string, assert: (path: string, what: string) => never, fail: (path: string, what: string) => never): D2BffOrigin {
  const row = record(value) ?? assert(path, 'not an object');
  if (row.kind !== 'field' && row.kind !== 'aggregate' && row.kind !== 'context') assert(`${path}.kind`, 'field, aggregate or context');
  const paths = Array.isArray(row.paths) ? row.paths : [];
  if (!paths.every(item => typeof item === 'string' && PATH.test(item))) assert(`${path}.paths`, 'each path is Entity.path');
  if (row.kind === 'field' && paths.length !== 1) fail(`${path}.paths`, 'a field origin names exactly one Entity.path');
  if (row.kind === 'aggregate' && !paths.length) fail(`${path}.paths`, 'an aggregate names the Entity.path values it uses');
  return { kind: row.kind as D2BffOriginKind, paths: row.kind === 'context' ? [] : [...new Set(paths as string[])] };
}

/** Every value leaf under a list of leaves, through named types; `at` is the dotted leaf path for messages. */
export function d2BffValueLeaves(rows: readonly D2BffLeaf[], design: Pick<D2BffDesign, 'types'>, at = '', seen: ReadonlySet<string> = new Set()): Array<{ at: string; leaf: D2BffLeaf }> {
  const out: Array<{ at: string; leaf: D2BffLeaf }> = [];
  for (const leaf of rows) {
    const here = at ? `${at}.${leaf.name}` : leaf.name;
    const ref = parseD2BffType(leaf.type);
    if (ref?.base === 'ref') {
      if (seen.has(ref.ref)) continue;
      const type = design.types.find(item => item.name === ref.ref);
      if (type) out.push(...d2BffValueLeaves(type.fields, design, here, new Set([...seen, ref.ref])));
    } else out.push({ at: here, leaf });
  }
  return out;
}

const covers = (origin: string, target: string): boolean => target === origin || target.startsWith(`${origin}.`);
const entityOf = (path: string): string => path.split('.')[0];
const isIdentity = (path: string): boolean => { const [, field, extra] = path.split('.'); return !extra && (field === 'id' || field === 'version'); };

export interface D2BffCheckContext {
  page11: Record<D2Page11Device, D2Page11Definition>;
  drafts: Record<D2Page11Device, D2Page11Needs>;
  need: D2NeedPage;
  menu: D2Menu;
  entities: Record<string, Ns5OntologyAnyEntity>;
  grants: readonly D2Grant[];
  rules: Record<string, string>;
}

/** The submit intents of the page (desktop and mobile) with the write each one's draft binds. */
export function d2PageSubmits(context: Pick<D2BffCheckContext, 'page11' | 'drafts'>): Map<string, string> {
  const out = new Map<string, string>();
  for (const device of ['desktop', 'mobile'] as const) {
    for (const organism of Object.values(context.page11[device].organisms)) {
      for (const intent of organism.intents) if (intent.kind === 'submit' && !out.has(intent.id)) out.set(intent.id, '');
    }
    for (const row of Object.values(context.drafts[device].organisms)) {
      for (const submit of row.submits) if (!out.get(submit.intentId)) out.set(submit.intentId, submit.write);
    }
  }
  return out;
}

/** What a write asks for, by origin (d2_72): transition payload, the page's edits plus required context ids on create, id/version otherwise. */
export function d2WriteRequiredInput(write: D2NeedWrite, entities: Record<string, Ns5OntologyAnyEntity>, pageEdits: readonly string[]): string[] {
  const entityId = write.entity;
  const entity = entities[entityId];
  const identity = [`${entityId}.id`, `${entityId}.version`];
  const edits = pageEdits.filter(path => entityOf(path) === entityId);
  if (write.operation === 'transition') return [...new Set([...d2TransitionPayload(entity, entityId, write.transitionRef ?? ''), ...identity])];
  if (write.operation === 'update') return [...new Set([...edits, ...identity])];
  if (write.operation !== 'create') return identity;
  const relationships = (entity as { relationships?: Record<string, { via?: string; required?: unknown }> } | undefined)?.relationships ?? {};
  const contextIds = Object.values(relationships)
    .filter(rel => (rel.required === true || (typeof rel.required === 'string' && rel.required.trim().length > 0)) && (rel.via ?? '').startsWith(`${entityId}.`))
    .map(rel => rel.via as string);
  return [...new Set([...edits, ...contextIds])];
}

export function checkD2Bff(design: D2BffDesign, context: D2BffCheckContext): D2BffIssue[] {
  const issues: D2BffIssue[] = [];
  const add = (code: string, path: string, message: string): void => { issues.push({ code, path, message: `${path}: ${message}` }); };
  const actors = context.need.actors;
  const outputOrigins = design.endpoints.flatMap(endpoint => d2BffValueLeaves(endpoint.output, design).flatMap(item => item.leaf.origin?.paths ?? []));

  // B.1 coverage: what an organism reads leaves some endpoint as the origin of an output leaf, or inside an aggregate.
  for (const device of ['desktop', 'mobile'] as const) {
    for (const [organismId, row] of Object.entries(context.drafts[device].organisms)) {
      for (const path of row.reads) {
        if (outputOrigins.some(origin => covers(origin, path))) continue;
        if (issues.some(item => item.code === 'D2_BFF_COVERAGE' && item.path === `organisms.${organismId}.reads.${path}`)) continue;
        add('D2_BFF_COVERAGE', `organisms.${organismId}.reads.${path}`, `organism ${organismId} reads ${path}, and no output leaf of the page's endpoints names it as origin (field or aggregate).`);
      }
    }
  }

  // B.2 actions: one command per submit, with the page's write and the input that write asks for.
  const submits = d2PageSubmits(context);
  const pageEdits = [...new Set((['desktop', 'mobile'] as const).flatMap(device => Object.values(context.drafts[device].organisms).flatMap(row => row.edits)))];
  for (const [intentId, write] of submits) {
    const commands = design.endpoints.filter(endpoint => endpoint.kind === 'cmd' && endpoint.when === intentId);
    if (commands.length !== 1) {
      add('D2_BFF_SUBMIT_COMMAND', `submits.${intentId}`, `submit ${intentId} has ${commands.length} commands with when = ${intentId}; it needs exactly one.`);
      continue;
    }
    const command = commands[0];
    if (write && command.writes !== write) add('D2_BFF_SUBMIT_WRITE', `endpoints.${command.id}.writes`, `submit ${intentId} writes ${write} in the page draft, and its command writes ${command.writes}.`);
    const pageWrite = d2WriteByKey(context.need.writes, command.writes ?? '');
    if (!pageWrite) continue; // reported by B.4
    const carried = d2BffValueLeaves(command.input, design).filter(item => item.leaf.origin?.kind === 'field').flatMap(item => item.leaf.origin!.paths);
    const missing = d2WriteRequiredInput(pageWrite, context.entities, pageEdits).filter(path => !carried.some(origin => covers(origin, path)));
    if (missing.length) add('D2_BFF_COMMAND_INPUT', `endpoints.${command.id}.input`, `command ${command.id} (${command.writes}) asks for ${missing.join(', ')}; each input leaf that fills a stored value names that Entity.path as a field origin.`);
  }

  // B.4 nothing beyond the plan: a command writes what the page may write and serves a submit of this page.
  const allowed = new Set(context.need.writes.flatMap(write => { try { return [d2WriteKey(write)]; } catch { return []; } }));
  for (const endpoint of design.endpoints) {
    if (endpoint.kind === 'cmd') {
      if (!allowed.has(endpoint.writes ?? '')) add('D2_BFF_WRITE_OUTSIDE', `endpoints.${endpoint.id}.writes`, `${endpoint.writes} is not a write of this page in the plan (${[...allowed].join(', ') || 'none'}).`);
      if (!submits.has(endpoint.when)) add('D2_BFF_COMMAND_TRIGGER', `endpoints.${endpoint.id}.when`, `${endpoint.when} is not a submit intent of this page (${[...submits.keys()].join(', ') || 'none'}).`);
    } else if (endpoint.when !== 'onLoad' && endpoint.when !== 'interaction') {
      add('D2_BFF_QUERY_TRIGGER', `endpoints.${endpoint.id}.when`, `a query runs onLoad or on interaction, not ${endpoint.when}.`);
    }
  }

  // B.3 facts of L4: origins exist and some page actor sees them; rules exist; enum literals are values of the field.
  const leafSets = [
    ...design.types.map(type => ({ at: `types.${type.name}`, rows: type.fields })),
    ...design.endpoints.flatMap(endpoint => [{ at: `endpoints.${endpoint.id}.input`, rows: endpoint.input }, { at: `endpoints.${endpoint.id}.output`, rows: endpoint.output }]),
  ];
  for (const set of leafSets) {
    for (const leaf of set.rows) {
      const at = `${set.at}.${leaf.name}`;
      for (const path of leaf.origin?.paths ?? []) {
        const entity = context.entities[entityOf(path)];
        if (!entity || !resolvableFieldPaths(entity).includes(path)) add('D2_BFF_ORIGIN_UNKNOWN', at, `origin ${path} is not a field of the L4 ontology.`);
        else if (!isIdentity(path) && !granted(path, actors, context.grants)) add('D2_BFF_ORIGIN_GRANT', at, `origin ${path} is not visible to any actor of the page (${actors.join(', ')}) by its grants.`);
      }
      const ref = parseD2BffType(leaf.type);
      if (ref?.base === 'enum' && leaf.origin?.kind === 'field') {
        const field = fieldAt(context.entities[entityOf(leaf.origin.paths[0])], leaf.origin.paths[0]);
        const values = field?.type === 'enum' ? (field.values ?? []).map(item => item.value) : null;
        if (!values) add('D2_BFF_ENUM', at, `${leaf.origin.paths[0]} is not an enum in L4.`);
        else {
          const extra = ref.values.filter(item => !values.includes(item));
          if (extra.length) add('D2_BFF_ENUM', at, `${extra.map(item => `'${item}'`).join(', ')} is not a value of ${leaf.origin.paths[0]} (${values.map(item => `'${item}'`).join(', ')}).`);
        }
      }
    }
  }
  for (const endpoint of design.endpoints) {
    for (const rule of endpoint.rules) if (!(rule in context.rules)) add('D2_BFF_RULE_UNKNOWN', `endpoints.${endpoint.id}.rules`, `rule ${rule} does not exist in the L4 rules.`);
  }
  issues.push(...checkD2BffBindings(design, context));
  return issues;
}

/** The page access, as the contract states it: page actors, their grants over the entities the endpoints touch, the scope. */
export function d2BffAccess(design: D2BffDesign, need: D2NeedPage, grants: readonly D2Grant[]): { actors: string[]; grants: string[]; scope: string } {
  const touched = new Set<string>();
  for (const endpoint of design.endpoints) {
    if (endpoint.writes) touched.add(entityOf(endpoint.writes));
    for (const item of [...d2BffValueLeaves(endpoint.input, design), ...d2BffValueLeaves(endpoint.output, design)]) for (const path of item.leaf.origin?.paths ?? []) touched.add(entityOf(path));
  }
  const chosen = grants.filter(grant => need.actors.includes(grant.actorRef) && grant.entityRefs.some(id => touched.has(id)));
  return { actors: need.actors, grants: [...new Set(chosen.map(item => item.grantId))], scope: chosen[0]?.dataScope?.mode || (need.reads[0]?.scope ?? 'organization') };
}

/** The entities a page touches (reads, writes, drafted paths), as the prompt of A reads them, and the rule texts that reach them. */
export function d2BffL4Slice(entities: Record<string, Ns5OntologyAnyEntity>, rules: Record<string, string>, need: D2NeedPage, drafts: readonly D2Page11Needs[]): { entities: Record<string, unknown>; rules: Record<string, string> } {
  const touched = new Set<string>([...need.reads.map(read => read.entity), ...need.writes.map(write => write.entity)]);
  for (const draft of drafts) for (const row of Object.values(draft.organisms)) for (const path of [...row.reads, ...row.edits]) touched.add(entityOf(path));
  const linkedBy = (entity: Ns5OntologyAnyEntity | undefined): string[] => {
    const view = entity as { rules?: string[]; transitions?: Array<{ ruleRefs?: string[] }> } | undefined;
    return [...(view?.rules ?? []), ...(view?.transitions ?? []).flatMap(item => item.ruleRefs ?? [])];
  };
  const linkedAnywhere = new Set(Object.values(entities).flatMap(linkedBy));
  const reached = new Set<string>();
  const out: Record<string, unknown> = {};
  for (const entityId of [...touched].sort()) {
    const entity = entities[entityId];
    if (!entity) continue;
    for (const rule of linkedBy(entity)) reached.add(rule);
    const view = entity as {
      title?: string; description?: string; displayField?: string;
      capabilities?: Record<string, string>;
      relationships?: Record<string, { to?: string; via?: string; cardinality?: string; required?: unknown }>;
      transitions?: Array<{ transitionId?: string; from?: string[]; to?: string; by?: string[]; payload?: string[]; ruleRefs?: string[]; description?: string }>;
      record?: { fields?: Record<string, SliceField> };
      rules?: string[];
    };
    const fields: Array<Record<string, unknown>> = [];
    const walk = (rows: Record<string, SliceField> | undefined, prefix: string): void => {
      for (const [key, field] of Object.entries(rows ?? {})) {
        const path = `${prefix}.${key}`;
        if (field.fields) { walk(field.fields, path); continue; }
        fields.push({
          path, type: field.type ?? '', ...(field.required ? { required: true } : {}), ...(field.derived ? { derived: true } : {}),
          ...(field.values?.length ? { values: field.values.map(item => item.value) } : {}),
          ...(field.title ? { title: field.title } : {}), ...(field.description ? { description: field.description } : {}),
        });
      }
    };
    if (view.record?.fields) walk(view.record.fields, entityId);
    else for (const path of resolvableFieldPaths(entity).slice(1)) fields.push({ path });
    out[entityId] = {
      title: view.title ?? '', description: view.description ?? '', displayField: view.displayField ?? '', fields,
      transitions: (view.transitions ?? []).map(item => ({ transitionId: item.transitionId, from: item.from, to: item.to, by: item.by, payload: item.payload ?? [], ruleRefs: item.ruleRefs ?? [], description: item.description ?? '' })),
      relationships: Object.values(view.relationships ?? {}).map(rel => ({ to: rel.to, via: rel.via, cardinality: rel.cardinality, required: Boolean(rel.required) })),
      capabilities: view.capabilities ?? {},
      rules: view.rules ?? [],
    };
  }
  // A rule no entity links (a calculation, a registration rule) still binds what the page shows or writes.
  for (const rule of Object.keys(rules)) if (!linkedAnywhere.has(rule)) reached.add(rule);
  return { entities: out, rules: Object.fromEntries([...reached].filter(id => id in rules).sort().map(id => [id, rules[id]])) };
}

interface SliceField { type?: string; required?: boolean; derived?: boolean; title?: string; description?: string; values?: Array<{ value: string }>; fields?: Record<string, SliceField> }

function fieldAt(entity: Ns5OntologyAnyEntity | undefined, path: string): SliceField | undefined {
  let fields = (entity as { record?: { fields?: Record<string, SliceField> } } | undefined)?.record?.fields;
  const parts = path.split('.').slice(1);
  let field: SliceField | undefined;
  for (const part of parts) {
    field = fields?.[part];
    if (!field) return undefined;
    fields = field.fields;
  }
  return field;
}

function granted(path: string, actors: readonly string[], grants: readonly D2Grant[]): boolean {
  const entity = entityOf(path);
  return grants.some(grant => {
    if (!actors.includes(grant.actorRef) || !grant.entityRefs.includes(entity)) return false;
    if ((grant.disclosure.deniedFields ?? []).some(ref => covers(ref, path))) return false;
    if (grant.disclosure.mode === 'fullRecord') return true;
    if (grant.disclosure.mode === 'fieldsOnly') return (grant.disclosure.allowedFields ?? []).some(ref => covers(ref, path));
    return false;
  });
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** B over the links (d2_75): only facts. Whether a reload or a link is the best one is the design's. */
function checkD2BffBindings(design: D2BffDesign, context: D2BffCheckContext): D2BffIssue[] {
  const issues: D2BffIssue[] = [];
  const add = (code: string, path: string, message: string): void => { issues.push({ code, path, message: `${path}: ${message}` }); };
  const organisms = new Set((['desktop', 'mobile'] as const).flatMap(device => Object.keys(context.page11[device].organisms)));
  const readers = new Set<string>();
  const selectors = new Set<string>();
  for (const device of ['desktop', 'mobile'] as const) {
    for (const [id, row] of Object.entries(context.drafts[device].organisms)) {
      if (row.reads.length) readers.add(id);
      if (row.selects) selectors.add(id);
    }
  }
  const endpoint = (id: string) => design.endpoints.find(item => item.id === id);
  const outputRef = (value: string, at: string): void => {
    const dot = value.indexOf('.');
    const found = dot > 0 ? endpoint(value.slice(0, dot)) : undefined;
    if (!found || !found.output.some(leaf => leaf.name === value.slice(dot + 1))) add('D2_BFF_BINDING_REF', at, `${value} is not <endpointId>.<output key> of an endpoint of the page.`);
  };
  const query = (id: string, at: string): void => {
    if (endpoint(id)?.kind !== 'qry') add('D2_BFF_BINDING_QUERY', at, `${id} is not a query of the page.`);
  };
  const bound = new Map<string, number>();
  design.bindings.organisms.forEach((row, index) => {
    const at = `bindings.organisms.${index}`;
    if (!organisms.has(row.organism)) add('D2_BFF_BINDING_ORGANISM', at, `organism ${row.organism} is not on the page.`);
    bound.set(row.organism, (bound.get(row.organism) ?? 0) + 1);
    outputRef(row.reads, `${at}.reads`);
  });
  for (const id of readers) {
    const count = bound.get(id) ?? 0;
    if (count !== 1) add('D2_BFF_BINDING_ORGANISM', `bindings.organisms.${id}`, `organism ${id} reads and has ${count} sources in bindings.organisms; it needs exactly one.`);
  }
  design.bindings.commands.forEach((row, index) => {
    const at = `bindings.commands.${index}`;
    if (endpoint(row.endpoint)?.kind !== 'cmd') add('D2_BFF_BINDING_COMMAND', at, `${row.endpoint} is not a command of the page.`);
    row.refreshes.forEach((id, position) => query(id, `${at}.refreshes.${position}`));
  });
  const selecting = new Set<string>();
  design.bindings.selections.forEach((row, index) => {
    const at = `bindings.selections.${index}`;
    selecting.add(row.organism);
    if (!organisms.has(row.organism)) add('D2_BFF_BINDING_ORGANISM', at, `organism ${row.organism} is not on the page.`);
    if ('query' in row.via) query(row.via.query, `${at}.via`);
    else outputRef(row.via.list, `${at}.via`);
  });
  for (const id of selectors) if (!selecting.has(id)) add('D2_BFF_BINDING_SELECTION', `bindings.selections.${id}`, `organism ${id} selects and has no row in bindings.selections.`);
  const steps = new Set(d2PageJourneySteps(context.need, context.menu));
  const pages = new Set(d2MenuPages(context.menu));
  design.bindings.journeys.forEach((row, index) => {
    const at = `bindings.journeys.${index}`;
    if (!steps.has(row.step)) add('D2_BFF_BINDING_STEP', at, `${row.step} is not a journey step of this page (${[...steps].join(', ') || 'none'}).`);
    for (const id of row.organisms) if (!organisms.has(id)) add('D2_BFF_BINDING_ORGANISM', `${at}.organisms`, `organism ${id} is not on the page.`);
    for (const id of row.endpoints) if (!endpoint(id)) add('D2_BFF_BINDING_REF', `${at}.endpoints`, `${id} is not an endpoint of the page.`);
    if (row.continuesIn && !pages.has(row.continuesIn)) add('D2_BFF_BINDING_PAGE', `${at}.continuesIn`, `${row.continuesIn} is not a page of the menu.`);
  });
  return issues;
}
