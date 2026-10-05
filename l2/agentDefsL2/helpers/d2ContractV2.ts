/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2ContractV2.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import type { D2ContractV2Definition, D2ContractV2Projection, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import { d2BffTypeRoot, parseD2BffType, type D2BffDesign, type D2BffJsdoc, type D2BffLeaf } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';

export type { D2ContractV2Definition, D2ContractV2Projection, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';

/**
 * E (d2_73): the contract keeps today's form. Interfaces are the named types of the approved BFF, one route per endpoint,
 * and the JSDoc of A sits above each route. Names and types of field leaves already come from the ontology (d2_75).
 * d2_78: no meta. The contract says what the page needs; where it comes from is the L1's (the origins stay in the BFF).
 */
export function buildD2ContractFromBff(input: {
  module: string;
  pageId: string;
  design: D2BffDesign;
  access: { actors: string[]; grants: string[]; scope: string };
  entities: Record<string, Ns5OntologyAnyEntity>;
  userLanguage: string;
}): D2ContractV2Definition {
  const { design, entities } = input;
  const labels = d2JsdocLabels(input.userLanguage);
  const keys: Array<keyof D2BffJsdoc> = ['purpose', 'input', 'processing', 'output'];
  const projections: D2ContractV2Projection[] = design.types.map(type => ({
    name: type.name,
    entityId: d2BffTypeRoot(type.name, design),
    requestIds: design.endpoints.filter(endpoint => endpoint.output.some(leaf => references(leaf, type.name, design))).map(endpoint => endpoint.id),
    body: bodyLines(type.fields, entities, 1).join('\n'),
    ...(type.description ? { jsdoc: d2JsdocText(type.description) } : {}),
  }));
  const routes: D2ContractV2Route[] = design.endpoints.map(endpoint => ({
    route: `${input.module}.${input.pageId}.${endpoint.id}`,
    kind: endpoint.kind,
    ...(endpoint.writes ? { writes: endpoint.writes } : {}),
    input: inline(endpoint.input, entities, false),
    output: inline(endpoint.output, entities, true),
    meta: { output: {}, lists: {}, params: {} },
    rules: endpoint.rules,
    access: input.access,
    jsdoc: { raw: keys.map((key, index) => `${labels[index]}: ${d2JsdocText(endpoint.jsdoc[key])}`).join('\n'), ...Object.fromEntries(keys.map(key => [key, d2JsdocText(endpoint.jsdoc[key])])) },
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
 * The comment is text for a model; the parser cuts it from the field regexes (d2_78). It stays on one line per label,
 * without a closing comment marker, a quote or a run of spaces, so it never reads as a route line either.
 */
export function d2JsdocText(text: string): string {
  return text.replace(/\s+/gu, ' ').replace(/\*\//gu, '* /').replace(/'/gu, '’').trim();
}

/** The type text of a leaf: a paged list is the one form of d2_79. */
function leafType(leaf: D2BffLeaf): string {
  return leaf.paginated ? `{ items: ${leaf.type}; page: number; pageSize: number; hasMore: boolean }` : leaf.type;
}

/** Leaves whose names are ontology paths (`details.total`, `customer.name`) nest as the ontology does (d2_79). */
interface LeafNode { leaf?: D2BffLeaf; children: Map<string, LeafNode> }
function leafTree(rows: readonly D2BffLeaf[]): Map<string, LeafNode> {
  const root = new Map<string, LeafNode>();
  for (const leaf of rows) {
    const parts = leaf.name.split('.');
    let level = root;
    parts.forEach((part, index) => {
      const node = level.get(part) ?? { children: new Map<string, LeafNode>() };
      if (index === parts.length - 1) node.leaf = leaf;
      level.set(part, node);
      level = node.children;
    });
  }
  return root;
}

function bodyLines(rows: readonly D2BffLeaf[], entities: Record<string, Ns5OntologyAnyEntity>, depth: number, tree = leafTree(rows)): string[] {
  const indent = '  '.repeat(depth);
  return [...tree].flatMap(([key, node]) => node.children.size
    ? [`${indent}${key}: {`, ...bodyLines([], entities, depth + 1, node.children), `${indent}};`]
    : [`${indent}${readonly(node.leaf!, entities)}${key}${node.leaf!.optional ? '?' : ''}: ${leafType(node.leaf!)};`]);
}

function inline(rows: readonly D2BffLeaf[], entities: Record<string, Ns5OntologyAnyEntity>, output: boolean, tree = leafTree(rows)): string {
  if (!tree.size) return '{}';
  return `{ ${[...tree].map(([key, node]) => node.children.size
    ? `${key}: ${inline([], entities, output, node.children)}`
    : `${output ? readonly(node.leaf!, entities) : ''}${key}${node.leaf!.optional ? '?' : ''}: ${leafType(node.leaf!)}`).join('; ')} }`;
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
