/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsContracts.ts" enhancement="_blank"/>

// Mechanical l4 contract emitter (D3) — a faithful TypeScript port of todo/generate/emitL4Contracts.py
// (validated 17/jul, tsc --strict clean over the 16 petShop operations). ONE generator, JSON -> TS,
// ZERO LLM re-derivation: a wrong shape becomes a tsc error at the usecase import site by construction
// (kills the ".map is not a function" class — the same kind=list came out of the BE materializer in 3
// different forms on 18/jul). kind semantics are FIXED:
//   list      -> Output = Item[]
//   object    -> Output = interface with the top-level fields
//   paginated -> Output = interface with the top-level fields (array field typed by its Item)
// Pure + dependency-free so the port can be diffed byte-for-byte against the prototype output.

const PUBLIC_SOURCES = new Set(['userInput', 'selectedEntity', 'routeParam']);

export interface NsContractEntry {
  data: Record<string, unknown>; // the operation defs object (contents of `export const x = {...}`)
  fileRef: string;               // mls fileReference of the emitted .ts (e.g. _102049_/l4/contracts/<op>.ts)
  sourceRef: string;             // path of the source defs quoted in the note (e.g. _102049_/l4/operations/<op>.defs.ts)
}

export interface NsContractResult {
  operationId: string;
  kind: string;
  bffName: string;
  tsSource: string;
  dtsSource: string;
}

function tsType(raw: unknown): string {
  const t = (typeof raw === 'string' ? raw : '').toLowerCase();
  if (['string', 'uuid', 'text', 'date', 'datetime'].includes(t)) return 'string';
  if (['number', 'money', 'decimal', 'int', 'integer', 'numeric'].includes(t)) return 'number';
  if (['boolean', 'bool'].includes(t)) return 'boolean';
  return 'string';
}

function pascal(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asFields(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

// Emit the field lines for one interface body; array fields with a nested `item` push an Item interface
// onto nestedOut (name, fields) for the caller to render.
function emitFields(
  fields: Record<string, unknown>[],
  opPascal: string,
  nestedOut: { name: string; fields: Record<string, unknown>[] }[],
  refTypes: Record<string, string>,
): string[] {
  const lines: string[] = [];
  for (const f of fields) {
    const name = String(f.name);
    const opt = f.required === false ? '?' : '';
    if (f.type === 'array' && isRecord(f.item)) {
      const itemName = `${opPascal}${pascal(name)}Item`;
      nestedOut.push({ name: itemName, fields: asFields(f.item.fields) });
      lines.push(`  ${name}${opt}: ${itemName}[];`);
    } else {
      lines.push(`  ${name}${opt}: ${tsType(f.type)};`);
    }
  }
  return lines;
}

export function buildNsContractSet(entries: NsContractEntry[]): NsContractResult[] {
  // fieldRef -> ts type, collected across ALL outputShapes (used to type the public inputs).
  const refTypes: Record<string, string> = {};
  const collect = (fields: Record<string, unknown>[]): void => {
    for (const f of fields) {
      if (typeof f.fieldRef === 'string') refTypes[f.fieldRef] = tsType(f.type);
      if (isRecord(f.item)) collect(asFields(f.item.fields));
    }
  };
  for (const entry of entries) {
    const data = isRecord(entry.data.data) ? entry.data.data : entry.data;
    collect(asFields(isRecord(data.outputShape) ? data.outputShape.fields : undefined));
  }

  const results: NsContractResult[] = [];
  for (const entry of entries) {
    const data = isRecord(entry.data.data) ? entry.data.data : entry.data;
    const op = String(data.operationId);
    const P = pascal(op);
    const bff = String(data.bffName);
    const shape = isRecord(data.outputShape) ? data.outputShape : {};
    const kind = typeof shape.kind === 'string' ? shape.kind : 'object';
    const fields = asFields(shape.fields);
    const nested: { name: string; fields: Record<string, unknown>[] }[] = [];
    const body: string[] = [];

    // ── Output ──
    if (kind === 'list') {
      const itemLines = emitFields(fields, P, nested, refTypes);
      body.push(`export interface ${P}Item {`);
      body.push(...itemLines);
      body.push('}');
      body.push('');
      body.push(`export type ${P}Output = ${P}Item[];`);
      // A list Item may itself carry an array field (CP1 caps at 1 level) — its Item interface is
      // prepended before the list Item interface (matches the prototype's insert-at-front order).
      for (const { name: itemName, fields: itemFields } of nested) {
        const inner: { name: string; fields: Record<string, unknown>[] }[] = [];
        body.unshift(`export interface ${itemName} {`, ...emitFields(itemFields, P, inner, refTypes), '}', '');
        if (inner.length) throw new Error(`${op}: nesting > 1 level not supported (CP1 caps at 1)`);
      }
    } else { // object | paginated
      const topLines = emitFields(fields, P, nested, refTypes);
      for (const { name: itemName, fields: itemFields } of nested) {
        const inner: { name: string; fields: Record<string, unknown>[] }[] = [];
        body.push(`export interface ${itemName} {`);
        body.push(...emitFields(itemFields, P, inner, refTypes));
        body.push('}');
        body.push('');
        if (inner.length) throw new Error(`${op}: nesting > 1 level not supported (CP1 caps at 1)`);
      }
      body.push(`export interface ${P}Output {`);
      body.push(...topLines);
      body.push('}');
    }

    // ── Input (public surfaces only; pagination from accessPattern) ──
    const inLines: string[] = [];
    const seen = new Set<string>();
    for (const i of asFields(data.inputs)) {
      if (typeof i.source !== 'string' || !PUBLIC_SOURCES.has(i.source)) continue;
      const name = String(i.inputId);
      seen.add(name);
      const opt = i.required === true ? '' : '?';
      inLines.push(`  ${name}${opt}: ${refTypes[String(i.fieldRef)] || 'string'};`);
    }
    const accessPattern = isRecord(data.accessPattern) ? data.accessPattern : {};
    const pagination = accessPattern.pagination;
    if (pagination === 'required' || pagination === 'optional') {
      for (const extra of ['page', 'pageSize']) {
        if (!seen.has(extra)) inLines.push(`  ${extra}?: number;`);
      }
    }
    const inputBlock = [`export interface ${P}Input {`];
    inputBlock.push(...(inLines.length ? inLines : ['  // sem inputs públicos (resolvidos por contexto)']));
    inputBlock.push('}');

    const routeConst = `export const ${op}Route = '${bff}' as const;`;
    const routeDecl = `declare const ${op}Route: '${bff}';\nexport { ${op}Route };`;

    const note = `// GENERATED MECHANICALLY from ${entry.sourceRef} — DO NOT EDIT.\n`
      + `// Contract of record: outputShape kind=${kind}; route from bffName.`;
    const tsSource = `/// <mls fileReference="${entry.fileRef}" enhancement="_blank"/>\n\n`
      + `${note}\n\n` + inputBlock.join('\n') + '\n\n' + body.join('\n') + `\n\n${routeConst}\n`;
    const dtsSource = `${note}\n// Declaration twin of ${op}.ts (same shapes, ambient form).\n\n`
      + inputBlock.join('\n') + '\n\n' + body.join('\n') + `\n\n${routeDecl}\n`;

    results.push({ operationId: op, kind, bffName: bff, tsSource, dtsSource });
  }
  return results;
}
