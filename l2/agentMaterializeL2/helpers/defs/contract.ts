/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/defs/contract.ts" enhancement="_blank"/>

// Reader of the page contract (web/contracts/<pageId>.defs.ts): types only, one interface per projection
// plus `interface <Page>Contracts` keyed by route. Grammar only, no policy.
//
// COPY of the official parser `_102020_/l2/helpers/contractV2/render.ts` (parseD2ContractV2, d2_78/d2_79,
// 05/10/2026), private to this agent (agentCodeIsPrivate). Differences, on purpose:
// - no render and no `meta` (the contract of the BFF per page has none, briefing P11); an old `meta` line is skipped;
// - CRLF is normalized (the Studio may save it), and `_` is allowed in names (snake_case page ids:
//   `Agenda_profissionalContracts`, agendaClinica 02/10/2026);
// - it also exposes what the materializer reads: `requestId`, the top-level input/output members, the
//   route JSDoc (purpose, input, processing, output) and the leaves of each projection by dotted path.

export interface L2PageLocation { project: number; module: string; pageId: string }
/** A top-level member of an inline object type: `{ produtos: ProdutoLoad[]; page?: number }`. */
export interface L2TypeMember { name: string; optional: boolean; type: string }
/** A leaf of a projection, nested ones by dotted path (`details.subtotal`, d2_79). */
export interface L2ProjectionField { name: string; type: string; optional: boolean; readonly: boolean }
export interface L2ContractProjection { name: string; body: string; jsdoc?: string; fields: L2ProjectionField[] }
/** The comment above a route: the four sections when their labels are recognized, always the raw text. */
export interface L2RouteJsdoc { raw: string; purpose?: string; input?: string; processing?: string; output?: string }
export interface L2ContractRoute {
  route: string;
  /** Last segment of the route: `<mod>.<pageId>.<requestId>`. */
  requestId: string;
  kind: 'qry' | 'cmd';
  writes?: string;
  input: string;
  output: string;
  inputMembers: L2TypeMember[];
  outputMembers: L2TypeMember[];
  rules: string[];
  access: { actors: string[]; grants: string[]; scope: string };
  jsdoc?: L2RouteJsdoc;
}
export interface L2ContractDefinition {
  contractsInterface: string;
  projections: L2ContractProjection[];
  routes: L2ContractRoute[];
}

/** Labels of the four JSDoc sections, by module language (d2_78). */
const JSDOC_LABELS: Record<string, [string, string, string, string]> = {
  en: ['Purpose', 'Input', 'Processing', 'Output'],
  pt: ['Finalidade', 'Entrada', 'Processamento', 'Saída'],
  es: ['Finalidad', 'Entrada', 'Procesamiento', 'Salida'],
};
const JSDOC_KEYS = ['purpose', 'input', 'processing', 'output'] as const;

export function contractsInterfaceName(pageId: string): string {
  return `${pageId[0].toUpperCase()}${pageId.slice(1)}Contracts`;
}

export function parseL2Contract(rawSource: string): { location: L2PageLocation; definition: L2ContractDefinition } {
  const source = `${rawSource.replace(/\r\n/gu, '\n').replace(/\n*$/u, '')}\n`;
  const loc = /^\/\/\/ <mls fileReference="_(\d+)_\/l2\/([a-z][A-Za-z0-9]*)\/web\/contracts\/([a-z][A-Za-z0-9_]*)\.defs\.ts" enhancement="_blank"\/>\n\n/u.exec(source);
  if (!loc) throw new Error('L2_CONTRACT_SOURCE_SHAPE');
  const location = { project: Number(loc[1]), module: loc[2], pageId: loc[3] };
  const contractsInterface = contractsInterfaceName(location.pageId);
  // A page without endpoints (a hub) has the empty contract `export {};`: valid, no route (briefing §5).
  if (/^\s*export \{\};\s*$/u.test(source.slice(loc[0].length))) return { location, definition: { contractsInterface, projections: [], routes: [] } };
  if (!/\nexport interface [A-Z][A-Za-z0-9_]*Contracts \{\n/u.test(source) || !source.endsWith('\n}\n')) throw new Error(`L2_CONTRACT_INTERFACE_MISSING: ${contractsInterface}`);

  const projections: L2ContractProjection[] = [];
  const iface = /export interface ([A-Z][A-Za-z0-9_]*) \{([\s\S]*?)\n\}\n/gu;
  let match: RegExpExecArray | null;
  while ((match = iface.exec(source))) {
    if (match[1] === contractsInterface || /Contracts$/u.test(match[1])) continue;
    const body = match[2].replace(/^\n/u, '').replace(/\n$/u, '');
    const doc = /\/\*\* ([^\n]*?) \*\/\n$/u.exec(source.slice(0, match.index))?.[1];
    projections.push({ name: match[1], body, ...(doc ? { jsdoc: doc } : {}), fields: bodyFields(body) });
  }

  const routes: L2ContractRoute[] = [];
  const parts = source.split(/  '([^']+)': \{/u);
  // The comment above a route ends the chunk before it: it is cut there, so its text never reaches a field regex.
  const chunks: string[] = [];
  const docs: Array<string | undefined> = [];
  for (let i = 0; i < parts.length; i += 2) {
    const found = /  \/\*\*\n((?:   \*[^\n]*\n)*)   \*\/\n$/u.exec(parts[i]);
    chunks.push(found ? parts[i].slice(0, found.index) : parts[i]);
    docs.push(found ? found[1].split('\n').filter(Boolean).map(line => line.replace(/^   \* ?/u, '')).join('\n') : undefined);
  }
  for (let i = 1; i < parts.length; i += 2) {
    const route = parts[i];
    const body = chunks[(i + 1) / 2] ?? '';
    const jsdoc = docs[(i - 1) / 2];
    const kind = /kind: '(qry|cmd)'/u.exec(body)?.[1] as 'qry' | 'cmd' | undefined;
    if (!kind) throw new Error(`L2_CONTRACT_ROUTE_KIND: ${route}`);
    const writes = /writes: '([^']+)'/u.exec(body)?.[1];
    const input = /\binput: ([\s\S]*?);\n {4}output:/u.exec(body)?.[1]?.trim();
    const output = /\boutput: ([\s\S]*?);\n {4}(?:meta|rules):/u.exec(body)?.[1]?.trim();
    if (input === undefined || output === undefined) throw new Error(`L2_CONTRACT_ROUTE_SHAPE: ${route}`);
    routes.push({
      route,
      requestId: route.slice(route.lastIndexOf('.') + 1),
      kind,
      ...(writes ? { writes } : {}),
      input,
      output,
      inputMembers: typeMembers(input),
      outputMembers: typeMembers(output),
      rules: literals(/rules: \[([^\n]*)\]/u.exec(body)?.[1] ?? ''),
      access: {
        actors: literals(/actors: \[([^\n\]]*)\]/u.exec(body)?.[1] ?? ''),
        grants: literals(/grants: \[([^\n\]]*)\]/u.exec(body)?.[1] ?? ''),
        scope: /scope: '([^']+)'/u.exec(body)?.[1] ?? 'organization',
      },
      ...(jsdoc ? { jsdoc: parseJsdoc(jsdoc) } : {}),
    });
  }
  return { location, definition: { contractsInterface, projections, routes } };
}

/** Splits an inline object type into its top-level members, respecting nested braces and brackets. */
export function typeMembers(typeText: string): L2TypeMember[] {
  const inner = typeText.trim().replace(/^\{/u, '').replace(/\}$/u, '');
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of inner) {
    if (ch === '{' || ch === '[' || ch === '(' || ch === '<') depth += 1;
    if (ch === '}' || ch === ']' || ch === ')' || ch === '>') depth -= 1;
    if (ch === ';' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  parts.push(current);
  const members: L2TypeMember[] = [];
  for (const part of parts.map(item => item.trim()).filter(Boolean)) {
    const member = /^(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*([\s\S]+)$/u.exec(part);
    if (member) members.push({ name: member[1], optional: Boolean(member[2]), type: member[3].trim() });
  }
  return members;
}

/** `ProdutoLoad[]` → `ProdutoLoad`; any other type text is returned as is. */
export function elementType(typeText: string): string {
  return typeText.endsWith('[]') ? typeText.slice(0, -2).trim() : typeText.trim();
}

/** The four sections, when every line starts with a label of one language; otherwise only the raw text. */
function parseJsdoc(raw: string): L2RouteJsdoc {
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

/** The leaves of an interface body, nested ones by their dotted path. */
function bodyFields(body: string): L2ProjectionField[] {
  const out: L2ProjectionField[] = [];
  const path: string[] = [];
  for (const line of body.split('\n')) {
    const open = /^( *)(?:readonly )?([A-Za-z][A-Za-z0-9_]*)\??: \{$/u.exec(line);
    if (open) { path.length = open[1].length / 2 - 1; path.push(open[2]); continue; }
    if (/^ *\};?$/u.test(line)) { path.pop(); continue; }
    const found = /^( *)(readonly )?([A-Za-z][A-Za-z0-9_]*)(\?)?: (.+);$/u.exec(line);
    if (!found) continue;
    path.length = found[1].length / 2 - 1;
    out.push({ name: [...path, found[3]].join('.'), type: found[5], optional: Boolean(found[4]), readonly: Boolean(found[2]) });
  }
  return out;
}

function literals(value: string): string[] {
  return value.split(',').map(item => item.trim().replace(/^'|'$/gu, '')).filter(Boolean);
}
