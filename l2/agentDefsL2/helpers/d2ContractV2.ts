/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2ContractV2.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import type { D2Page11Location } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2DerivedPageRequests, D2DerivedProjection } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import type { D2SharedV2Definition } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';

export interface D2ContractV2Issue { code: string; path: string; message: string }

export interface D2ContractV2Projection { name: string; entityId: string; requestIds: string[]; body: string }
export interface D2ContractV2Route {
  route: string;
  kind: 'qry' | 'cmd';
  writes?: string;
  input: string;
  output: string;
  rules: string[];
  access: { actors: string[]; grants: string[]; scope: string };
}
export interface D2ContractV2Definition {
  module: string;
  pageId: string;
  projections: D2ContractV2Projection[];
  routes: D2ContractV2Route[];
}

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
      rules: derived.rules[request.id] ?? [],
      access: derived.access,
    };
  });
  return { module: derived.module, pageId: derived.pageId, projections, routes };
}

export function renderD2ContractV2(location: Omit<D2Page11Location, 'device'>, definition: D2ContractV2Definition): string {
  const header = `/// <mls fileReference="_${location.project}_/l2/${location.module}/web/contracts/${location.pageId}.defs.ts" enhancement="_blank"/>\n\n`;
  const interfaces = definition.projections.map(item => `export interface ${item.name} {\n${item.body}\n}\n`).join('\n');
  const pageName = pascal(definition.pageId);
  const routes = definition.routes.map(route => {
    const writes = route.writes ? `\n    writes: '${route.writes}';` : '';
    const rules = `[${route.rules.map(item => `'${item}'`).join(', ')}]`;
    const actors = `[${route.access.actors.map(item => `'${item}'`).join(', ')}]`;
    const grants = `[${route.access.grants.map(item => `'${item}'`).join(', ')}]`;
    return `  '${route.route}': {\n    kind: '${route.kind}';${writes}\n    input: ${route.input};\n    output: ${route.output};\n    rules: ${rules};\n    access: { actors: ${actors}; grants: ${grants}; scope: '${route.access.scope}' };\n  };`;
  }).join('\n');
  return `${header}${interfaces}\nexport interface ${pageName}Contracts {\n${routes}\n}\n`;
}

export function parseD2ContractV2(source: string): D2ContractV2Definition {
  const loc = /^\/\/\/ <mls fileReference="_(\d+)_\/l2\/([a-z][A-Za-z0-9]*)\/web\/contracts\/([a-z][A-Za-z0-9_]*)\.defs\.ts" enhancement="_blank"\/>\n\n/u.exec(source);
  if (!loc) throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
  const moduleName = loc[2];
  const pageId = loc[3];
  const projections: D2ContractV2Projection[] = [];
  const iface = /export interface ([A-Z][A-Za-z0-9]*) \{([\s\S]*?)\n\}\n/ug;
  let match: RegExpExecArray | null;
  const contractsName = `${pascal(pageId)}Contracts`;
  while ((match = iface.exec(source))) {
    if (match[1] === contractsName) continue;
    projections.push({ name: match[1], entityId: '', requestIds: [], body: match[2].replace(/^\n/u, '').replace(/\n$/u, '') });
  }
  const routes: D2ContractV2Route[] = [];
  const blocks = source.split(/  '([^']+)': \{/u).slice(1);
  for (let i = 0; i < blocks.length; i += 2) {
    const route = blocks[i];
    const body = blocks[i + 1] ?? '';
    const kind = /kind: '(qry|cmd)'/u.exec(body)?.[1] as 'qry' | 'cmd' | undefined;
    if (!kind) continue;
    const writes = /writes: '([^']+)'/u.exec(body)?.[1];
    const input = /input: ([\s\S]*?);\n    output:/u.exec(body)?.[1]?.trim() ?? '{}';
    const output = /output: ([\s\S]*?);\n    rules:/u.exec(body)?.[1]?.trim() ?? '{}';
    const rules = splitLits(/rules: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const actors = splitLits(/actors: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const grants = splitLits(/grants: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const scope = /scope: '([^']+)'/u.exec(body)?.[1] ?? 'organization';
    routes.push({ route, kind, ...(writes ? { writes } : {}), input, output, rules, access: { actors, grants, scope } });
  }
  return { module: moduleName, pageId, projections, routes };
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
  const renderedGate = renderD2ContractV2({ project: 1, module: definition.module, pageId: definition.pageId }, definition);
  if (renderedGate.includes('Pick<') || renderedGate.includes('Partial<')) {
    issues.push({ code: 'D2_CONTRACT_V2_LITERAL', path: 'source', message: 'Contract must use literal types only.' });
  }
  return issues;
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
function splitLits(value: string): string[] { return value.split(',').map(item => item.trim().replace(/^'|'$/ug, '')).filter(Boolean); }
