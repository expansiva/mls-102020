/// <mls fileReference="_102020_/l2/helpers/contractV2/render.ts" enhancement="_blank"/>

import type {
  D2ContractV2Definition, D2ContractV2Location, D2ContractV2Meta, D2ContractV2MetaList, D2ContractV2MetaOutput,
  D2ContractV2MetaParam, D2ContractV2Projection, D2ContractV2Route,
} from '/_102020_/l2/helpers/contractV2/types.js';

export function renderD2ContractV2(location: D2ContractV2Location, definition: D2ContractV2Definition): string {
  const header = `/// <mls fileReference="_${location.project}_/l2/${location.module}/web/contracts/${location.pageId}.defs.ts" enhancement="_blank"/>\n\n`;
  const interfaces = definition.projections.map(item => `export interface ${item.name} {\n${item.body}\n}\n`).join('\n');
  const pageName = pascal(definition.pageId);
  const routes = definition.routes.map(route => {
    const writes = route.writes ? `\n    writes: '${route.writes}';` : '';
    const rules = `[${route.rules.map(item => `'${item}'`).join(', ')}]`;
    const actors = `[${route.access.actors.map(item => `'${item}'`).join(', ')}]`;
    const grants = `[${route.access.grants.map(item => `'${item}'`).join(', ')}]`;
    return `  '${route.route}': {\n    kind: '${route.kind}';${writes}\n    input: ${route.input};\n    output: ${route.output};\n    meta: ${renderMeta(route.meta)};\n    rules: ${rules};\n    access: { actors: ${actors}; grants: ${grants}; scope: '${route.access.scope}' };\n  };`;
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
    const output = /output: ([\s\S]*?);\n    meta:/u.exec(body)?.[1]?.trim() ?? '{}';
    const metaSource = /meta: ([\s\S]*?);\n    rules:/u.exec(body)?.[1]?.trim();
    if (!metaSource) throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
    const rules = splitLits(/rules: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const actors = splitLits(/actors: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const grants = splitLits(/grants: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const scope = /scope: '([^']+)'/u.exec(body)?.[1] ?? 'organization';
    routes.push({
      route, kind, ...(writes ? { writes } : {}), input, output, meta: parseMeta(metaSource), rules,
      access: { actors, grants, scope },
    });
  }
  for (const proj of projections) {
    const requestIds: string[] = [];
    const entities = new Set<string>();
    for (const route of routes) {
      for (const [key, typeName] of outputRefs(route.output)) {
        if (typeName !== proj.name) continue;
        if (!requestIds.includes(requestIdOf(route.route))) requestIds.push(requestIdOf(route.route));
        const entity = route.meta.output[key]?.entity;
        if (entity) entities.add(entity);
      }
    }
    proj.requestIds = requestIds;
    proj.entityId = entities.size === 1 ? [...entities][0] : '';
  }
  return { module: moduleName, pageId, projections, routes };
}

function renderMeta(meta: D2ContractV2Meta): string {
  const output = Object.entries(meta.output).map(([key, row]) => `${key}: { entity: '${row.entity}'; many: ${row.many} }`).join('; ');
  const lists = Object.entries(meta.lists).map(([id, row]) => `${id}: { key: '${row.key}'; page: '${row.page}'; pageSize: '${row.pageSize}'; hasMore: '${row.hasMore}' }`).join('; ');
  const params = Object.entries(meta.params).map(([name, row]) => 'filters' in row
    ? `${name}: { filters: '${row.filters}'; field: '${row.field}' }`
    : `${name}: { pages: '${row.pages}' }`).join('; ');
  return `{ output: ${group(output)}; lists: ${group(lists)}; params: ${group(params)} }`;
}

function group(body: string): string { return body ? `{ ${body} }` : '{}'; }

function parseMeta(source: string): D2ContractV2Meta {
  const root = asRecord(readValue(source, 0).value);
  const output: Record<string, D2ContractV2MetaOutput> = {};
  for (const [key, value] of Object.entries(asRecord(root.output ?? {}))) {
    const row = asRecord(value);
    if (typeof row.entity !== 'string' || typeof row.many !== 'boolean') throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
    output[key] = { entity: row.entity, many: row.many };
  }
  const lists: Record<string, D2ContractV2MetaList> = {};
  for (const [key, value] of Object.entries(asRecord(root.lists ?? {}))) {
    const row = asRecord(value);
    if (typeof row.key !== 'string' || typeof row.page !== 'string' || typeof row.pageSize !== 'string' || typeof row.hasMore !== 'string') {
      throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
    }
    lists[key] = { key: row.key, page: row.page, pageSize: row.pageSize, hasMore: row.hasMore };
  }
  const params: Record<string, D2ContractV2MetaParam> = {};
  for (const [key, value] of Object.entries(asRecord(root.params ?? {}))) {
    const row = asRecord(value);
    if (typeof row.filters === 'string' && typeof row.field === 'string') params[key] = { filters: row.filters, field: row.field };
    else if (typeof row.pages === 'string') params[key] = { pages: row.pages };
    else throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
  }
  return { output, lists, params };
}

interface MetaRecord { [key: string]: string | boolean | MetaRecord }

function readValue(source: string, index: number): { value: string | boolean | MetaRecord; index: number } {
  let i = skip(source, index);
  if (source[i] === '{') return readObject(source, i);
  if (source[i] === '\'') {
    let text = '';
    i += 1;
    while (i < source.length && source[i] !== '\'') {
      text += source[i];
      i += 1;
    }
    return { value: text, index: i + 1 };
  }
  if (source.startsWith('true', i)) return { value: true, index: i + 4 };
  if (source.startsWith('false', i)) return { value: false, index: i + 5 };
  throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
}

function readObject(source: string, index: number): { value: MetaRecord; index: number } {
  let i = index + 1;
  const out: MetaRecord = {};
  while (i < source.length) {
    i = skip(source, i);
    if (source[i] === '}') return { value: out, index: i + 1 };
    const name = /^[A-Za-z][A-Za-z0-9]*/u.exec(source.slice(i))?.[0];
    if (!name) throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
    i = skip(source, i + name.length);
    if (source[i] !== ':') throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
    const read = readValue(source, i + 1);
    out[name] = read.value;
    i = skip(source, read.index);
    if (source[i] === ';') i += 1;
  }
  throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
}

function asRecord(value: string | boolean | MetaRecord): MetaRecord {
  if (typeof value !== 'object' || value === null) throw new Error('D2_CONTRACT_V2_SOURCE_SHAPE');
  return value;
}

function outputRefs(output: string): Array<[string, string]> {
  const refs: Array<[string, string]> = [];
  const pattern = /([A-Za-z][A-Za-z0-9]*):\s*([A-Z][A-Za-z0-9]*)(?:\[\])?/gu;
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(output))) refs.push([found[1], found[2]]);
  return refs;
}

function requestIdOf(route: string): string { return route.split('.').slice(2).join('.'); }
function pascal(value: string): string { return value ? value[0].toUpperCase() + value.slice(1) : value; }
function splitLits(value: string): string[] { return value.split(',').map(item => item.trim().replace(/^'|'$/ug, '')).filter(Boolean); }
function skip(source: string, index: number): number {
  let i = index;
  while (source[i] === ' ' || source[i] === '\n') i += 1;
  return i;
}
