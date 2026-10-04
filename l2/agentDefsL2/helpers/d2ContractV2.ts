/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2ContractV2.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition, D2ContractV2Location, D2ContractV2Meta, D2ContractV2Projection, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import { parseD2BffType, type D2BffDesign, type D2BffJsdoc, type D2BffLeaf } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';

export type { D2ContractV2Definition, D2ContractV2Projection, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';

/**
 * E (d2_73): the contract keeps today's form. Interfaces are the named types of the approved BFF, one route per endpoint,
 * and the JSDoc of A sits above each route. meta.output names an entity only for a key whose named type carries one
 * entity's fields; a composite or aggregated key is left out of meta (the parser accepts any subset of output keys).
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
    entityId: typeEntity(type.name, design),
    requestIds: design.endpoints.filter(endpoint => endpoint.output.some(leaf => references(leaf, type.name, design))).map(endpoint => endpoint.id),
    body: type.fields.map(leaf => `  ${readonly(leaf, entities)}${leaf.name}${leaf.optional ? '?' : ''}: ${leaf.type};`).join('\n'),
  }));
  const routes: D2ContractV2Route[] = design.endpoints.map(endpoint => ({
    route: `${input.module}.${input.pageId}.${endpoint.id}`,
    kind: endpoint.kind,
    ...(endpoint.writes ? { writes: endpoint.writes } : {}),
    input: inline(endpoint.input, entities, false),
    output: inline(endpoint.output, entities, true),
    meta: meta(endpoint.output, design),
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

/** The one entity whose fields a named type carries directly; '' when composite or aggregated. */
function typeEntity(name: string, design: D2BffDesign): string {
  const type = design.types.find(item => item.name === name);
  if (!type) return '';
  const direct = type.fields.filter(leaf => parseD2BffType(leaf.type)?.base !== 'ref');
  if (direct.some(leaf => leaf.origin?.kind === 'aggregate')) return '';
  const entities = new Set(direct.flatMap(leaf => (leaf.origin?.kind === 'field' ? leaf.origin.paths : []).map(path => path.split('.')[0])));
  return entities.size === 1 ? [...entities][0] : '';
}

function meta(output: readonly D2BffLeaf[], design: D2BffDesign): D2ContractV2Meta {
  const rows: D2ContractV2Meta['output'] = {};
  for (const leaf of output) {
    const ref = parseD2BffType(leaf.type);
    if (ref?.base !== 'ref') continue;
    const entity = typeEntity(ref.ref, design);
    if (entity) rows[leaf.name] = { entity, many: ref.list };
  }
  return { output: rows, lists: {}, params: {} };
}
