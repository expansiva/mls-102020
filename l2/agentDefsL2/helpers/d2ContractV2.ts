/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2ContractV2.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition, D2ContractV2Location, D2ContractV2Meta, D2ContractV2Projection, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import { d2BffTypeRoot, parseD2BffType, type D2BffDesign, type D2BffEndpoint, type D2BffJsdoc, type D2BffLeaf } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';

export type { D2ContractV2Definition, D2ContractV2Projection, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';

/**
 * E (d2_73): the contract keeps today's form. Interfaces are the named types of the approved BFF, one route per endpoint,
 * and the JSDoc of A sits above each route. Names and types of field leaves already come from the ontology (d2_75).
 */
export function buildD2ContractFromBff(input: {
  module: string;
  pageId: string;
  design: D2BffDesign;
  access: { actors: string[]; grants: string[]; scope: string };
  entities: Record<string, Ns5OntologyAnyEntity>;
}): D2ContractV2Definition {
  const { design, entities } = input;
  const projections: D2ContractV2Projection[] = design.types.map(type => ({
    name: type.name,
    entityId: d2BffTypeRoot(type.name, design),
    requestIds: design.endpoints.filter(endpoint => endpoint.output.some(leaf => references(leaf, type.name, design))).map(endpoint => endpoint.id),
    body: type.fields.map(leaf => `  ${readonly(leaf, entities)}${leaf.name}${leaf.optional ? '?' : ''}: ${leaf.type};`).join('\n'),
  }));
  const routes: D2ContractV2Route[] = design.endpoints.map(endpoint => ({
    route: `${input.module}.${input.pageId}.${endpoint.id}`,
    kind: endpoint.kind,
    ...(endpoint.writes ? { writes: endpoint.writes } : {}),
    input: inline(endpoint.input, entities, false),
    output: inline(endpoint.output, entities, true),
    meta: meta(endpoint, design),
    rules: endpoint.rules,
    access: input.access,
  }));
  return { module: input.module, pageId: input.pageId, projections, routes };
}

const LABELS: Record<string, [string, string, string, string]> = {
  en: ['Purpose', 'Input', 'Processing', 'Output'],
  pt: ['Finalidade', 'Entrada', 'Processamento', 'Saída'],
  es: ['Finalidad', 'Entrada', 'Procesamiento', 'Salida'],
};

export function d2JsdocLabels(userLanguage: string): [string, string, string, string] {
  return LABELS[userLanguage.toLowerCase().split(/[-_]/u)[0]] ?? LABELS.en;
}

/**
 * The comment is text for a model, never parsed. It stays on one line per label, without a closing comment marker or a
 * quote, so the regex parser of the contract never reads it as a route, a write or a rule.
 */
export function d2JsdocText(text: string): string {
  return text.replace(/\s+/gu, ' ').replace(/\*\//gu, '* /').replace(/'/gu, '’').trim();
}

export function renderD2ContractWithJsdoc(location: D2ContractV2Location, definition: D2ContractV2Definition, design: D2BffDesign, userLanguage: string): string {
  let source = renderD2ContractV2(location, definition);
  for (const type of design.types) {
    if (!type.description) continue;
    source = insertBefore(source, `export interface ${type.name} {\n`, `/** ${d2JsdocText(type.description)} */\n`);
  }
  const labels = d2JsdocLabels(userLanguage);
  const keys: Array<keyof D2BffJsdoc> = ['purpose', 'input', 'processing', 'output'];
  for (const endpoint of design.endpoints) {
    const lines = keys.map((key, index) => `   * ${labels[index]}: ${d2JsdocText(endpoint.jsdoc[key])}`);
    source = insertBefore(source, `  '${location.module}.${location.pageId}.${endpoint.id}': {\n`, `  /**\n${lines.join('\n')}\n   */\n`);
  }
  return source;
}

function insertBefore(source: string, anchor: string, text: string): string {
  const at = source.indexOf(anchor);
  if (at < 0 || source.indexOf(anchor, at + 1) >= 0) throw new Error(`D2_CONTRACTS_JSDOC_ANCHOR: ${anchor.trim()}`);
  return `${source.slice(0, at)}${text}${source.slice(at)}`;
}

function inline(rows: readonly D2BffLeaf[], entities: Record<string, Ns5OntologyAnyEntity>, output: boolean): string {
  if (!rows.length) return '{}';
  return `{ ${rows.map(leaf => `${output ? readonly(leaf, entities) : ''}${leaf.name}${leaf.optional ? '?' : ''}: ${leaf.type}`).join('; ')} }`;
}

/** A value the page cannot write: a derived field or an aggregate. */
function readonly(leaf: D2BffLeaf, entities: Record<string, Ns5OntologyAnyEntity>): string {
  if (leaf.origin?.kind === 'aggregate') return 'readonly ';
  if (leaf.origin?.kind !== 'field') return '';
  const path = leaf.origin.paths[0];
  const parts = path.split('.');
  let fields = (entities[parts[0]] as { record?: { fields?: Record<string, { derived?: boolean; fields?: Record<string, unknown> }> } } | undefined)?.record?.fields;
  let derived = false;
  for (const part of parts.slice(1)) {
    const field = fields?.[part];
    if (!field) return '';
    derived = Boolean(field.derived);
    fields = field.fields as typeof fields;
  }
  const identity = parts.length === 2 && (parts[1] === 'id' || parts[1] === 'version');
  return derived && !identity ? 'readonly ' : '';
}

function references(leaf: D2BffLeaf, name: string, design: D2BffDesign, seen = new Set<string>()): boolean {
  const ref = parseD2BffType(leaf.type);
  if (ref?.base !== 'ref' || seen.has(ref.ref)) return false;
  if (ref.ref === name) return true;
  const type = design.types.find(item => item.name === ref.ref);
  return Boolean(type?.fields.some(child => references(child, name, design, new Set([...seen, ref.ref]))));
}

/**
 * meta from the origins (d2_75), in the form the parser and the L1 of main read (d2_61). output: each key whose named
 * type has a root entity (its `Entity.id` leaf, else its single entity). lists and params: a query that takes page and
 * pageSize and returns a hasMore flag pages its lists; an input that carries a field filters the key of that entity.
 * A key with only aggregates has no entity and stays out: the L1 reads meta.output[key].entity as a table.
 */
function meta(endpoint: D2BffEndpoint, design: D2BffDesign): D2ContractV2Meta {
  const output: D2ContractV2Meta['output'] = {};
  for (const leaf of endpoint.output) {
    const ref = parseD2BffType(leaf.type);
    if (ref?.base !== 'ref') continue;
    const entity = d2BffTypeRoot(ref.ref, design);
    if (entity) output[leaf.name] = { entity, many: ref.list };
  }
  const lists: D2ContractV2Meta['lists'] = {};
  const params: D2ContractV2Meta['params'] = {};
  if (endpoint.kind !== 'qry') return { output, lists, params };
  const names = new Set(endpoint.input.map(leaf => leaf.name));
  const hasMore = endpoint.output.find(leaf => leaf.type === 'boolean' && leaf.name.startsWith('hasMore'))?.name;
  const listKeys = Object.entries(output).filter(([, row]) => row.many).map(([key]) => key);
  if (names.has('page') && names.has('pageSize') && hasMore) {
    for (const key of listKeys) {
      const organisms = design.bindings.organisms.filter(row => row.reads === `${endpoint.id}.${key}`).map(row => row.organism);
      for (const organism of organisms.length ? organisms : [key]) lists[organism] = { key, page: 'page', pageSize: 'pageSize', hasMore };
    }
  }
  const firstList = Object.keys(lists)[0];
  for (const leaf of endpoint.input) {
    if ((leaf.name === 'page' || leaf.name === 'pageSize') && firstList) { params[leaf.name] = { pages: firstList }; continue; }
    const path = leaf.origin?.kind === 'field' ? leaf.origin.paths[0] : '';
    if (!path) continue;
    const entity = path.split('.')[0];
    const key = [...listKeys, ...Object.keys(output)].find(item => output[item].entity === entity);
    if (key) params[leaf.name] = { filters: key, field: path.slice(entity.length + 1) };
  }
  return { output, lists, params };
}
