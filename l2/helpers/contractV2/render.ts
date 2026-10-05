/// <mls fileReference="_102020_/l2/helpers/contractV2/render.ts" enhancement="_blank"/>

import type {
  D2ContractV2Definition, D2ContractV2Jsdoc, D2ContractV2Location, D2ContractV2Meta, D2ContractV2MetaList, D2ContractV2MetaOutput,
  D2ContractV2MetaParam, D2ContractV2Projection, D2ContractV2Route,
} from '/_102020_/l2/helpers/contractV2/types.js';

/** Labels of the four JSDoc sections, by module language (d2_78). */
const JSDOC_LABELS: Record<string, [string, string, string, string]> = {
  en: ['Purpose', 'Input', 'Processing', 'Output'],
  pt: ['Finalidade', 'Entrada', 'Processamento', 'Saída'],
  es: ['Finalidad', 'Entrada', 'Procesamiento', 'Salida'],
};
const JSDOC_KEYS = ['purpose', 'input', 'processing', 'output'] as const;

export function renderD2ContractV2(location: D2ContractV2Location, definition: D2ContractV2Definition): string {
  const header = `/// <mls fileReference="_${location.project}_/l2/${location.module}/web/contracts/${location.pageId}.defs.ts" enhancement="_blank"/>\n\n`;
  const interfaces = definition.projections.map(item => `${item.jsdoc ? `/** ${item.jsdoc} */\n` : ''}export interface ${item.name} {\n${item.body}\n}\n`).join('\n');
  const pageName = pascal(definition.pageId);
  const routes = definition.routes.map(route => {
    const writes = route.writes ? `\n    writes: '${route.writes}';` : '';
    const rules = `[${route.rules.map(item => `'${item}'`).join(', ')}]`;
    const actors = `[${route.access.actors.map(item => `'${item}'`).join(', ')}]`;
    const grants = `[${route.access.grants.map(item => `'${item}'`).join(', ')}]`;
    const doc = route.jsdoc ? `  /**\n${route.jsdoc.raw.split('\n').map(line => `   * ${line}`).join('\n')}\n   */\n` : '';
    const empty = !Object.keys(route.meta.output).length && !Object.keys(route.meta.lists).length && !Object.keys(route.meta.params).length;
    const meta = empty ? '' : `\n    meta: ${renderMeta(route.meta)};`;
    return `${doc}  '${route.route}': {\n    kind: '${route.kind}';${writes}\n    input: ${route.input};\n    output: ${route.output};${meta}\n    rules: ${rules};\n    access: { actors: ${actors}; grants: ${grants}; scope: '${route.access.scope}' };\n  };`;
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
    const body = match[2].replace(/^\n/u, '').replace(/\n$/u, '');
    const doc = /\/\*\* ([^\n]*?) \*\/\n$/u.exec(source.slice(0, match.index))?.[1];
    projections.push({ name: match[1], entityId: '', requestIds: [], body, ...(doc ? { jsdoc: doc } : {}), fields: bodyFields(body) });
  }
  const routes: D2ContractV2Route[] = [];
  const parts = source.split(/  '([^']+)': \{/u);
  // The comment above a route ends the chunk before it: it is cut there, so its text never reaches a field regex.
  const chunks: string[] = [];
  const docs: Array<string | undefined> = [];
  for (let i = 0; i < parts.length; i += 2) {
    const found = /  \/\*\*\n((?:   \* [^\n]*\n)*)   \*\/\n$/u.exec(parts[i]);
    chunks.push(found ? parts[i].slice(0, found.index) : parts[i]);
    docs.push(found ? found[1].split('\n').filter(Boolean).map(line => line.replace(/^   \* /u, '')).join('\n') : undefined);
  }
  for (let i = 1; i < parts.length; i += 2) {
    const route = parts[i];
    const body = chunks[(i + 1) / 2] ?? '';
    const jsdoc = docs[(i - 1) / 2];
    const kind = /kind: '(qry|cmd)'/u.exec(body)?.[1] as 'qry' | 'cmd' | undefined;
    if (!kind) continue;
    const writes = /writes: '([^']+)'/u.exec(body)?.[1];
    const input = /input: ([\s\S]*?);\n    output:/u.exec(body)?.[1]?.trim() ?? '{}';
    const output = /output: ([\s\S]*?);\n    (?:meta|rules):/u.exec(body)?.[1]?.trim() ?? '{}';
    const metaSource = /meta: ([\s\S]*?);\n    rules:/u.exec(body)?.[1]?.trim();
    const rules = splitLits(/rules: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const actors = splitLits(/actors: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const grants = splitLits(/grants: \[([^\n]*)\]/u.exec(body)?.[1] ?? '');
    const scope = /scope: '([^']+)'/u.exec(body)?.[1] ?? 'organization';
    routes.push({
      route, kind, ...(writes ? { writes } : {}), input, output, meta: metaSource ? parseMeta(metaSource) : { output: {}, lists: {}, params: {} }, rules,
      access: { actors, grants, scope }, ...(jsdoc ? { jsdoc: parseJsdoc(jsdoc) } : {}),
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

/** The four sections, when every line starts with a label of one language; otherwise only the raw text. */
function parseJsdoc(raw: string): D2ContractV2Jsdoc {
  for (const labels of Object.values(JSDOC_LABELS)) {
    const sections: Partial<Record<typeof JSDOC_KEYS[number], string>> = {};
    let ok = true;
    for (const line of raw.split('\n')) {
      const index = labels.findIndex(label => line.startsWith(`${label}: `));
      if (index < 0) { ok = false; break; }
      sections[JSDOC_KEYS[index]] = line.slice(labels[index].length + 2);
    }
    if (ok && JSDOC_KEYS.every(key => sections[key] !== undefined)) return { raw, ...sections };
  }
  return { raw };
}

function bodyFields(body: string): D2ContractV2Projection['fields'] {
  return body.split('\n').flatMap(line => {
    const found = /^  (readonly )?([A-Za-z][A-Za-z0-9]*)(\?)?: (.+);$/u.exec(line);
    return found ? [{ name: found[2], type: found[4], optional: Boolean(found[3]), readonly: Boolean(found[1]) }] : [];
  });
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
