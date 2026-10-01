/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2ContractV2.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type {
  D2ContractV2Definition, D2ContractV2Meta, D2ContractV2MetaParam, D2ContractV2Projection, D2ContractV2Route,
} from '/_102020_/l2/helpers/contractV2/types.js';
import type { D2DerivedPageRequests, D2DerivedProjection, D2DerivedRequest } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import type { D2SharedV2Definition } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';

export type { D2ContractV2Definition, D2ContractV2Projection, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';

export interface D2ContractV2Issue { code: string; path: string; message: string }

export function buildD2ContractV2(derived: D2DerivedPageRequests, shared: D2SharedV2Definition, entities: Record<string, Ns5OntologyAnyEntity>): D2ContractV2Definition {
  const projections: D2ContractV2Projection[] = [];
  for (const row of derived.projections) {
    const body = renderFields(entities[row.entityId], row, 1);
    const existing = projections.find(item => item.body === body);
    if (existing) {
      if (!existing.requestIds.includes(row.requestId)) existing.requestIds.push(row.requestId);
    } else {
      projections.push({ name: `${row.entityId}${pascal(row.requestId)}`, entityId: row.entityId, requestIds: [row.requestId], body });
    }
  }
  const routes: D2ContractV2Route[] = derived.requests.map(request => {
    const sharedReq = shared.requests[request.id];
    const returns = sharedReq?.returns ?? request.returns;
    const outputParts = returns.map(name => {
      const entityId = request.returnEntities[name];
      const proj = projections.find(item => item.requestIds.includes(request.id) && item.entityId === entityId)
        ?? projections.find(item => item.entityId === entityId);
      const many = request.kind === 'qry' && request.id === 'load' ? '[]' : '';
      return `${name}: ${proj?.name ?? 'never'}${many}`;
    });
    if (request.id === 'load') {
      for (const list of request.lists) {
        const stem = pascal(list.organismId);
        outputParts.push(`page${stem}: number`, `pageSize${stem}: number`, `hasMore${stem}: boolean`);
      }
    }
    const input = request.kind === 'cmd' ? renderInput(entities, request.writes ?? '', request.inputPaths) : renderQueryInput(request.params);
    return {
      route: `${derived.module}.${derived.pageId}.${request.id}`,
      kind: request.kind,
      ...(request.writes ? { writes: request.writes } : {}),
      input,
      output: `{ ${outputParts.join('; ')} }`,
      meta: contractMeta(derived.pageId, request, entities),
      rules: derived.rules[request.id] ?? [],
      access: derived.access,
    };
  });
  return { module: derived.module, pageId: derived.pageId, projections, routes };
}

export function gateD2ContractV2(
  definition: D2ContractV2Definition,
  derived: D2DerivedPageRequests,
  shared: D2SharedV2Definition,
  entities: Record<string, Ns5OntologyAnyEntity>,
): D2ContractV2Issue[] {
  const issues: D2ContractV2Issue[] = [];
  for (const id of Object.keys(shared.requests)) {
    if (!definition.routes.some(route => route.route.endsWith(`.${id}`))) issues.push({ code: 'D2_CONTRACT_V2_REQUEST_TYPE', path: id, message: `Shared request ${id} has no contract type.` });
  }
  const covered = new Set<string>();
  for (const proj of definition.projections) {
    const rows = derived.projections.filter(row => row.entityId === proj.entityId && proj.requestIds.includes(row.requestId));
    if (!rows.length) {
      issues.push({ code: 'D2_CONTRACT_V2_PROJECTION_UNKNOWN', path: proj.name, message: `Projection ${proj.name} matches no derived row.` });
    } else {
      const leaves = leavesOf(proj.body);
      const rendered = new Set(leaves.map(item => item.path));
      const derivedSet = derivedPaths(entities[proj.entityId]);
      for (const leaf of leaves) {
        if (leaf.path !== 'id' && leaf.path !== 'version' && derivedSet.has(leaf.path) && !leaf.readonly) {
          issues.push({ code: 'D2_CONTRACT_V2_DERIVED', path: `${proj.name}.${leaf.path}`, message: `Derived path ${leaf.path} must be readonly.` });
        }
      }
      for (const row of rows) {
        covered.add(`${row.requestId}:${row.entityId}`);
        const expected = new Set(row.paths);
        if (!sameSet(rendered, expected)) {
          issues.push({ code: 'D2_CONTRACT_V2_FIELD_OUTSIDE', path: proj.name, message: `Projection ${proj.name} fields are not the derived path set for ${row.requestId}.` });
        }
        const hasVersion = rendered.has('version');
        if (hasVersion !== row.includeVersion) {
          issues.push({ code: 'D2_CONTRACT_V2_VERSION', path: proj.name, message: hasVersion ? 'version is present without update or transition.' : 'version is required for update or transition.' });
        }
      }
    }
  }
  for (const row of derived.projections) {
    if (!covered.has(`${row.requestId}:${row.entityId}`)) {
      issues.push({ code: 'D2_CONTRACT_V2_PROJECTION_UNKNOWN', path: `${row.requestId}:${row.entityId}`, message: `Derived projection ${row.requestId}:${row.entityId} has no contract projection.` });
    }
  }
  for (const route of definition.routes) {
    if (route.kind === 'cmd' && route.writes) {
    const requestId = route.route.split('.').slice(2).join('.');
    const request = derived.requests.find(item => item.id === requestId);
    const entityId = route.writes.split('.')[0] ?? '';
    const operation = route.writes.split('.')[1] ?? '';
    const derivedSet = derivedPaths(entities[entityId]);
    const actual = leavesOf(route.input).map(item => item.path);
    for (const path of actual) {
      if (path !== 'id' && path !== 'version' && derivedSet.has(path)) issues.push({ code: 'D2_CONTRACT_V2_DERIVED', path: route.route, message: `Derived path ${path} is in the command input.` });
    }
    const expected = (request?.inputPaths ?? [])
      .filter(path => path.startsWith(`${entityId}.`))
      .map(path => path.slice(entityId.length + 1))
      .filter(path => operation !== 'create' || (path !== 'id' && path !== 'version'));
    if (!request || !sameSet(new Set(actual), new Set(expected))) {
      issues.push({ code: 'D2_CONTRACT_V2_INPUT', path: route.route, message: `Command input leaves are not the request input paths.` });
    }
    }
  }
  for (const route of definition.routes) {
    const requestId = route.route.split('.').slice(2).join('.');
    const request = derived.requests.find(item => item.id === requestId);
    if (!request) continue;
    const expected = contractMeta(definition.pageId, request, entities);
    if (!sameJson(route.meta.output, expected.output)) {
      issues.push({ code: 'D2_CONTRACT_V2_META_OUTPUT', path: route.route, message: 'Entity output keys are missing from meta or disagree with returnEntities.' });
    }
    if (!sameJson(route.meta.lists, expected.lists)) {
      issues.push({ code: 'D2_CONTRACT_V2_META_LIST', path: route.route, message: 'A derived list is missing from meta or points at the wrong output key.' });
    }
    if (request.kind === 'qry' && !sameJson(route.meta.params, expected.params)) {
      issues.push({ code: 'D2_CONTRACT_V2_META_PARAM', path: route.route, message: 'A query param is missing from meta or filters the wrong field.' });
    }
    if (danglingMetaRef(route, request, entities)) {
      issues.push({ code: 'D2_CONTRACT_V2_META_REF', path: route.route, message: 'meta names an output key, list, or entity that does not exist.' });
    }
  }
  const renderedGate = renderD2ContractV2({ project: 1, module: definition.module, pageId: definition.pageId }, definition);
  if (renderedGate.includes('Pick<') || renderedGate.includes('Partial<')) {
    issues.push({ code: 'D2_CONTRACT_V2_LITERAL', path: 'source', message: 'Contract must use literal types only.' });
  }
  return issues;
}

function contractMeta(pageId: string, request: D2DerivedRequest, entities: Record<string, Ns5OntologyAnyEntity>): D2ContractV2Meta {
  const output: D2ContractV2Meta['output'] = {};
  for (const [key, entityId] of Object.entries(request.returnEntities)) {
    output[key] = { entity: entityId, many: request.kind === 'qry' && request.id === 'load' };
  }
  const lists: D2ContractV2Meta['lists'] = {};
  for (const list of request.lists) {
    const stem = pascal(list.organismId);
    lists[list.organismId] = {
      key: listOutputKey(pageId, request, list, entities),
      page: `page${stem}`,
      pageSize: `pageSize${stem}`,
      hasMore: `hasMore${stem}`,
    };
  }
  const params: D2ContractV2Meta['params'] = {};
  if (request.kind === 'qry') {
    for (const name of request.params) params[name] = paramMeta(pageId, request, name, entities);
  }
  return { output, lists, params };
}

function listOutputKey(
  pageId: string,
  request: D2DerivedRequest,
  list: D2DerivedRequest['lists'][number],
  entities: Record<string, Ns5OntologyAnyEntity>,
): string {
  const returns = Object.entries(request.returnEntities);
  if (returns.some(([key]) => key === list.organismId)) return list.organismId;
  const filters = list.params.filter(name => name !== 'page' && name !== 'pageSize');
  const matched = returns.filter(([, entityId]) => filters.length > 0 && filters.every(name => Boolean(filterField(entities[entityId], entityId, name))));
  if (matched.length === 1) return matched[0][0];
  if (returns.some(([key]) => key === pageId)) return pageId;
  if (returns.length === 1) return returns[0][0];
  return matched[0]?.[0] ?? '';
}

function paramMeta(pageId: string, request: D2DerivedRequest, name: string, entities: Record<string, Ns5OntologyAnyEntity>): D2ContractV2MetaParam {
  if (name === 'page' || name === 'pageSize') {
    const list = request.lists.find(item => item.params.includes(name));
    return { pages: list?.organismId ?? '' };
  }
  const list = request.lists.find(item => item.params.includes(name));
  const key = list ? listOutputKey(pageId, request, list, entities) : Object.keys(request.returnEntities)[0] ?? '';
  const entityId = request.returnEntities[key] ?? '';
  const field = name === 'id' && request.id !== 'load' ? 'id' : filterField(entities[entityId], entityId, name);
  return { filters: key, field };
}

function filterField(entity: Ns5OntologyAnyEntity | undefined, entityId: string, param: string): string {
  const view = entity as {
    displayField?: string;
    capabilities?: Record<string, string>;
    relationships?: Record<string, { via?: string }>;
    record?: { fields?: Record<string, Field> };
  } | undefined;
  const caps = new Set(Object.keys(view?.capabilities ?? {}));
  if (param === 'search' && caps.has('locate.byName')) return stripEntity(view?.displayField ?? '', entityId);
  if (caps.has('listByForeignKey')) {
    for (const rel of Object.values(view?.relationships ?? {})) {
      const via = stripEntity(rel.via ?? '', entityId);
      if (via === param || via.endsWith(`.${param}`)) return via;
    }
  }
  if (caps.has('locate.byColumn')) {
    const indexed = indexedPaths(view?.record?.fields);
    const found = indexed.find(path => path === param || path.endsWith(`.${param}`));
    if (found) return found;
  }
  return '';
}

function indexedPaths(fields: Record<string, Field> | undefined, prefix = ''): string[] {
  const out: string[] = [];
  for (const [key, field] of Object.entries(fields ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (field.indexed && !field.fields) out.push(path);
    if (field.fields) out.push(...indexedPaths(field.fields, path));
  }
  return out;
}

function stripEntity(path: string, entityId: string): string {
  const prefix = `${entityId}.`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

function danglingMetaRef(route: D2ContractV2Route, request: D2DerivedRequest, entities: Record<string, Ns5OntologyAnyEntity>): boolean {
  for (const [key, row] of Object.entries(route.meta.output)) {
    if (!(key in request.returnEntities) || !entities[row.entity]) return true;
  }
  for (const [id, row] of Object.entries(route.meta.lists)) {
    if (!request.lists.some(list => list.organismId === id)) return true;
    if (!(row.key in route.meta.output)) return true;
    const stem = pascal(id);
    if (row.page !== `page${stem}` || row.pageSize !== `pageSize${stem}` || row.hasMore !== `hasMore${stem}`) return true;
  }
  for (const row of Object.values(route.meta.params)) {
    if ('filters' in row && !(row.filters in route.meta.output)) return true;
    if ('pages' in row && !(row.pages in route.meta.lists)) return true;
  }
  return false;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  for (const item of left) if (!right.has(item)) return false;
  return true;
}

function leavesOf(source: string): Array<{ path: string; readonly: boolean }> {
  const out: Array<{ path: string; readonly: boolean }> = [];
  const stack: string[] = [];
  let i = 0;
  while (i < source.length) {
    while (i < source.length && /[\s{};,]/.test(source[i])) {
      if (source[i] === '}') stack.pop();
      i += 1;
    }
    if (i >= source.length) break;
    const readonly = source.startsWith('readonly ', i);
    if (readonly) i += 'readonly '.length;
    const name = /^[A-Za-z][A-Za-z0-9]*/u.exec(source.slice(i))?.[0];
    if (!name) { i += 1; continue; }
    i += name.length;
    while (source[i] === ' ' || source[i] === '?') i += 1;
    if (source[i] !== ':') continue;
    i += 1;
    while (source[i] === ' ') i += 1;
    if (source[i] === '{') { stack.push(name); i += 1; continue; }
    out.push({ path: [...stack, name].join('.'), readonly });
    let quote = '';
    while (i < source.length) {
      const ch = source[i];
      if (quote) { if (ch === quote) quote = ''; i += 1; continue; }
      if (ch === '\'' || ch === '"') { quote = ch; i += 1; continue; }
      if (ch === ';') { i += 1; break; }
      if (ch === '}') break;
      i += 1;
    }
  }
  return out;
}

function renderFields(entity: Ns5OntologyAnyEntity | undefined, row: D2DerivedProjection, depth: number): string {
  const indent = '  '.repeat(depth);
  const derivedSet = derivedPaths(entity);
  const tree = treeFromPaths(row.paths.filter(path => path !== 'id' && (row.includeVersion || path !== 'version')));
  const lines = [`${indent}id: string;`];
  if (row.includeVersion) lines.push(`${indent}readonly version: number;`);
  if (Object.keys(tree).length) lines.push(renderTree(tree, entity, derivedSet, row.entityId, depth));
  return lines.filter(Boolean).join('\n');
}

interface Node { children: Record<string, Node>; leaf?: string }

function treeFromPaths(paths: string[]): Record<string, Node> {
  const root: Record<string, Node> = {};
  for (const path of paths) {
    const parts = path.split('.');
    let cursor = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      cursor[part] = cursor[part] ?? { children: {} };
      if (i === parts.length - 1) cursor[part].leaf = path;
      cursor = cursor[part].children;
    }
  }
  return root;
}

function renderTree(tree: Record<string, Node>, entity: Ns5OntologyAnyEntity | undefined, derivedSet: Set<string>, prefix: string, depth: number): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];
  for (const [key, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const fieldPath = path.startsWith(`${(entity as { entityId?: string })?.entityId}.`) ? path.slice(((entity as { entityId?: string }).entityId?.length ?? 0) + 1) : key;
    const readonly = derivedSet.has(path) || derivedSet.has(fieldPath) ? 'readonly ' : '';
    if (node.leaf && !Object.keys(node.children).length) {
      lines.push(`${indent}${readonly}${key}: ${tsType(entity, node.leaf)};`);
    } else {
      lines.push(`${indent}${key}: {`);
      lines.push(renderTree(node.children, entity, derivedSet, path, depth + 1));
      lines.push(`${indent}};`);
    }
  }
  return lines.join('\n');
}

function tsType(entity: Ns5OntologyAnyEntity | undefined, path: string): string {
  const parts = path.split('.');
  let fields = (entity as { record?: { fields?: Record<string, Field> } } | undefined)?.record?.fields;
  for (const part of parts) {
    const field = fields?.[part];
    if (!field) return 'string';
    if (part === parts[parts.length - 1]) return leafType(field);
    fields = field.fields;
  }
  return 'string';
}

interface Field {
  type?: string;
  derived?: boolean;
  indexed?: boolean;
  values?: Array<{ value: string }>;
  fields?: Record<string, Field>;
}

function leafType(field: Field): string {
  if (field.type === 'enum' && field.values?.length) return field.values.map(item => `'${item.value}'`).join(' | ');
  if (field.type === 'boolean') return 'boolean';
  if (field.type === 'integer' || field.type === 'number' || field.type === 'decimal') return 'number';
  return 'string';
}

function derivedPaths(entity: Ns5OntologyAnyEntity | undefined): Set<string> {
  const out = new Set<string>();
  const walk = (fields: Record<string, Field> | undefined, prefix: string): void => {
    for (const [key, field] of Object.entries(fields ?? {})) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (field.derived) out.add(path);
      if (field.fields) walk(field.fields, path);
    }
  };
  walk((entity as { record?: { fields?: Record<string, Field> } } | undefined)?.record?.fields, '');
  return out;
}

function renderInput(entities: Record<string, Ns5OntologyAnyEntity>, writes: string, paths: string[]): string {
  const entityId = writes.split('.')[0] ?? '';
  const operation = writes.split('.')[1] ?? '';
  const keepIdentity = operation === 'update' || operation === 'transition';
  const prefix = `${entityId}.`;
  const fields = paths
    .filter(path => path.startsWith(prefix))
    .map(path => path.slice(prefix.length))
    .filter(path => keepIdentity || (path !== 'id' && path !== 'version'));
  if (!fields.length) return '{}';
  return renderInline(treeFromPaths(fields), entities[entityId], '');
}

function renderInline(tree: Record<string, Node>, entity: Ns5OntologyAnyEntity | undefined, prefix: string): string {
  const parts: string[] = [];
  for (const [key, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (node.leaf && !Object.keys(node.children).length) parts.push(`${key}: ${tsType(entity, node.leaf)}`);
    else parts.push(`${key}: ${renderInline(node.children, entity, path)}`);
  }
  return `{ ${parts.join('; ')} }`;
}

function renderQueryInput(params: string[]): string {
  if (!params.length) return '{}';
  const types: Record<string, string> = { page: 'number', pageSize: 'number' };
  return `{ ${params.map(item => `${item}?: ${types[item] ?? 'string'}`).join('; ')} }`;
}

function pascal(value: string): string { return value ? value[0].toUpperCase() + value.slice(1) : value; }
