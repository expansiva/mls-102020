/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsContracts.ts" enhancement="_blank"/>

// Mechanical l4 contract emitter (D3 + newSolution_10 N4) — ONE generator, JSON -> TS, ZERO LLM
// re-derivation. The contract of record is now the WORKSPACE bffCall (the wire view), not the raw
// operation: each bffCall projects only the fields its page renders, so the emitted Input/Output are
// page-shaped. A wrong shape becomes a tsc error at the usecase/page import site by construction.
//
// One file per bffCall: l4/<module>/contracts/<workspaceId>.<bffId>.ts (+ .d.ts twin). NO l1/l2
// mirrors in this phase (the agent writes only l4/l5). kind semantics are FIXED:
//   list      -> Output = Item[]
//   object    -> Output = interface with the top-level fields
//   paginated -> Output = interface with the top-level fields (array field typed by its Item)
// Pure + dependency-free (loose records in, strings out) so it stays trivially unit-testable.

const PUBLIC_SOURCES = new Set(['userInput', 'selectedEntity', 'routeParam']);
type TsScalar = 'string' | 'number' | 'boolean';

// The operation defs a bffCall composes — only the fields the emitter needs.
export interface NsBffOperationView {
  inputs?: unknown;
  outputShape?: unknown;
  accessPattern?: unknown;
}

export interface NsBffContractEntry {
  workspaceId: string;
  bffId: string;
  route: string;                 // DERIVED <module>.<workspaceId>.<bffId>
  kind: 'query' | 'command';
  input?: unknown;               // bffCall.input[] (projection) — absent for passthrough
  output?: unknown;              // bffCall.output (projection) — absent for passthrough
  uses: Array<{ operationId: string }>;
  operations: Record<string, NsBffOperationView>;
  fileRef: string;               // mls fileReference of the emitted .ts
  sourceRef: string;             // path of the source workspace defs quoted in the note
}

export interface NsBffContractResult {
  bffId: string;
  route: string;
  tsSource: string;
  dtsSource: string;
}

// A field normalized for rendering: a scalar (tsType) or an array of nested fields (item).
interface EmitField {
  name: string;
  optional: boolean;
  tsType?: TsScalar;
  item?: EmitField[];
}

function tsScalar(raw: unknown): TsScalar {
  const t = (typeof raw === 'string' ? raw : '').toLowerCase();
  if (['number', 'money', 'decimal', 'int', 'integer', 'numeric'].includes(t)) return 'number';
  if (['boolean', 'bool'].includes(t)) return 'boolean';
  return 'string'; // string | uuid | text | date | datetime | object | (array leaf) default
}

function pascal(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function shapeOf(op: NsBffOperationView | undefined): { kind: string; fields: Record<string, unknown>[] } {
  const shape = op && isRecord(op.outputShape) ? op.outputShape : {};
  return { kind: typeof shape.kind === 'string' ? shape.kind : 'object', fields: asRecords(shape.fields) };
}

// fieldRef -> ts scalar, collected across ALL operations' outputShapes (types the passthrough inputs).
function collectRefTypes(operations: Record<string, NsBffOperationView>): Record<string, TsScalar> {
  const refTypes: Record<string, TsScalar> = {};
  const walk = (fields: Record<string, unknown>[]): void => {
    for (const f of fields) {
      if (typeof f.fieldRef === 'string') refTypes[f.fieldRef] = tsScalar(f.type);
      if (isRecord(f.item)) walk(asRecords(f.item.fields));
    }
  };
  for (const op of Object.values(operations)) walk(shapeOf(op).fields);
  return refTypes;
}

// The type of each output-shape path of one operation (mirrors the e6 collectNsOutputPaths grammar),
// so a projected bffCall field with no explicit `type` can resolve it from its `from`.
function collectOutputPathTypes(op: NsBffOperationView | undefined): Record<string, TsScalar> {
  const { kind, fields } = shapeOf(op);
  const types: Record<string, TsScalar> = {};
  const itemFieldsOf = (f: Record<string, unknown>) => (isRecord(f.item) ? asRecords(f.item.fields) : []);
  if (kind === 'list') {
    for (const f of fields) {
      const name = typeof f.name === 'string' ? f.name : '';
      if (!name) continue;
      types[`$items.${name}`] = tsScalar(f.type);
      for (const sub of itemFieldsOf(f)) if (typeof sub.name === 'string') types[`$items.${name}.${sub.name}`] = tsScalar(sub.type);
    }
    return types;
  }
  let primaryItems: Record<string, unknown>[] | null = null;
  for (const f of fields) {
    const name = typeof f.name === 'string' ? f.name : '';
    if (!name) continue;
    types[name] = tsScalar(f.type);
    const itemFields = itemFieldsOf(f);
    if (itemFields.length) {
      for (const sub of itemFields) if (typeof sub.name === 'string') types[`${name}.$items.${sub.name}`] = tsScalar(sub.type);
      if (!primaryItems) primaryItems = itemFields;
    }
  }
  if (primaryItems) for (const sub of primaryItems) if (typeof sub.name === 'string') types[`$items.${sub.name}`] = tsScalar(sub.type);
  return types;
}

// The ts type of a declared input whose `from` points at a source operation input ("op.inputId").
function typeOfInputFrom(from: unknown, operations: Record<string, NsBffOperationView>, refTypes: Record<string, TsScalar>): TsScalar {
  const resolved = resolveFrom(from);
  if (!resolved) return 'string';
  const input = asRecords(operations[resolved.op]?.inputs).find(i => i.inputId === resolved.rest);
  if (!input) return 'string';
  if (input.type) return tsScalar(input.type);
  if (typeof input.fieldRef === 'string') return refTypes[input.fieldRef] || 'string';
  return 'string';
}

function resolveFrom(from: unknown): { op: string; rest: string } | null {
  if (typeof from !== 'string') return null;
  const index = from.indexOf('.');
  if (index <= 0 || index >= from.length - 1) return null;
  return { op: from.slice(0, index), rest: from.slice(index + 1) };
}

// Normalize a bffCall projection field[] into EmitField[] (resolving types from the source op when the
// field declares none). Used for query calls with an explicit output projection.
function fromProjection(fields: Record<string, unknown>[], operations: Record<string, NsBffOperationView>): EmitField[] {
  const pathTypesCache: Record<string, Record<string, TsScalar>> = {};
  const typeOfFrom = (from: unknown): TsScalar => {
    const resolved = resolveFrom(from);
    if (!resolved) return 'string';
    if (!pathTypesCache[resolved.op]) pathTypesCache[resolved.op] = collectOutputPathTypes(operations[resolved.op]);
    return pathTypesCache[resolved.op][resolved.rest] || 'string';
  };
  const walk = (list: Record<string, unknown>[]): EmitField[] => list.map(f => {
    const name = typeof f.name === 'string' ? f.name : '';
    const optional = f.required === false;
    if (isRecord(f.item)) return { name, optional, item: walk(asRecords(f.item.fields)) };
    const tsType = f.type ? tsScalar(f.type) : typeOfFrom(f.from);
    return { name, optional, tsType };
  });
  return walk(fields);
}

// Normalize an operation outputShape field[] into EmitField[] (passthrough / identity contract).
function fromOutputShape(fields: Record<string, unknown>[]): EmitField[] {
  return fields.map(f => {
    const name = typeof f.name === 'string' ? f.name : '';
    const optional = f.required === false;
    if (isRecord(f.item)) return { name, optional, item: fromOutputShape(asRecords(f.item.fields)) };
    return { name, optional, tsType: tsScalar(f.type) };
  });
}

// Render the Output interface(s) for one bffCall. Throws (A4.7) if the projection is empty — never emit
// a silent `{}` (the run-9 lesson). CP1 caps nesting at 1 level.
function renderOutput(pascalId: string, kind: string, fields: EmitField[], label: string): string[] {
  if (fields.length === 0) throw new Error(`${label}: projected Output is empty (A4.7 — never emit {})`);
  const nested: { name: string; fields: EmitField[] }[] = [];
  const emitLines = (list: EmitField[]): string[] => list.map(f => {
    const opt = f.optional ? '?' : '';
    if (f.item) {
      const itemName = `${pascalId}${pascal(f.name)}Item`;
      nested.push({ name: itemName, fields: f.item });
      return `  ${f.name}${opt}: ${itemName}[];`;
    }
    return `  ${f.name}${opt}: ${f.tsType || 'string'};`;
  });
  const body: string[] = [];
  if (kind === 'list') {
    const itemLines = emitLines(fields);
    body.push(`export interface ${pascalId}Item {`, ...itemLines, '}', '');
    body.push(`export type ${pascalId}Output = ${pascalId}Item[];`);
  } else {
    const topLines = emitLines(fields);
    body.push(`export interface ${pascalId}Output {`, ...topLines, '}');
  }
  // Nested Item interfaces are emitted BEFORE the interface that references them (declaration order).
  for (const { name, fields: itemFields } of nested) {
    if (itemFields.length === 0) throw new Error(`${label}: nested Item "${name}" is empty (A4.7)`);
    const inner: { name: string; fields: EmitField[] }[] = [];
    const lines = itemFields.map(f => {
      const opt = f.optional ? '?' : '';
      if (f.item) { inner.push({ name: f.name, fields: f.item }); return `  ${f.name}${opt}: never;`; }
      return `  ${f.name}${opt}: ${f.tsType || 'string'};`;
    });
    if (inner.length) throw new Error(`${label}: nesting > 1 level not supported (CP1 caps at 1)`);
    body.unshift(`export interface ${name} {`, ...lines, '}', '');
  }
  return body;
}

// Render the Input interface for one bffCall: the declared projection input, or (passthrough) the
// operation's PUBLIC inputs + pagination.
function renderInput(
  pascalId: string,
  entry: NsBffContractEntry,
  refTypes: Record<string, TsScalar>,
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const declared = asRecords(entry.input);
  if (declared.length) {
    for (const i of declared) {
      const name = typeof i.name === 'string' ? i.name : '';
      if (!name) continue;
      seen.add(name);
      const opt = i.required === true ? '' : '?';
      const type = i.type ? tsScalar(i.type) : typeOfInputFrom(i.from, entry.operations, refTypes);
      lines.push(`  ${name}${opt}: ${type};`);
    }
  } else {
    // Passthrough / identity: derive from the single source operation.
    const op = entry.operations[entry.uses[0]?.operationId];
    for (const i of asRecords(op?.inputs)) {
      if (typeof i.source !== 'string' || !PUBLIC_SOURCES.has(i.source)) continue;
      const name = typeof i.inputId === 'string' ? i.inputId : '';
      if (!name) continue;
      seen.add(name);
      const opt = i.required === true ? '' : '?';
      const type = i.type ? tsScalar(i.type) : (typeof i.fieldRef === 'string' ? refTypes[i.fieldRef] || 'string' : 'string');
      lines.push(`  ${name}${opt}: ${type};`);
    }
    const pagination = isRecord(op?.accessPattern) ? op!.accessPattern.pagination : undefined;
    if (pagination === 'required' || pagination === 'optional') {
      for (const extra of ['page', 'pageSize']) if (!seen.has(extra)) lines.push(`  ${extra}?: number;`);
    }
  }
  const block = [`export interface ${pascalId}Input {`];
  block.push(...(lines.length ? lines : ['  // sem inputs públicos (resolvidos por contexto)']));
  block.push('}');
  return block;
}

export function buildNsBffContractSet(entries: NsBffContractEntry[]): NsBffContractResult[] {
  const results: NsBffContractResult[] = [];
  for (const entry of entries) {
    const P = pascal(entry.bffId);
    const label = `${entry.workspaceId}.${entry.bffId}`;
    const refTypes = collectRefTypes(entry.operations);

    // ── Output ── projection when declared, else the source operation's outputShape (passthrough).
    let outputKind: string;
    let outputFields: EmitField[];
    if (isRecord(entry.output)) {
      outputKind = typeof entry.output.kind === 'string' ? entry.output.kind : 'object';
      outputFields = fromProjection(asRecords(entry.output.fields), entry.operations);
    } else {
      const shape = shapeOf(entry.operations[entry.uses[0]?.operationId]);
      outputKind = shape.kind;
      outputFields = fromOutputShape(shape.fields);
    }
    const outputBody = renderOutput(P, outputKind, outputFields, label);
    const inputBlock = renderInput(P, entry, refTypes);

    const routeConst = `export const ${entry.bffId}Route = '${entry.route}' as const;`;
    const routeDecl = `declare const ${entry.bffId}Route: '${entry.route}';\nexport { ${entry.bffId}Route };`;
    const note = `// GENERATED MECHANICALLY from ${entry.sourceRef} — DO NOT EDIT.\n`
      + `// Contract of record: bffCall ${entry.bffId} (${entry.kind}); Output kind=${outputKind}; route ${entry.route}.`;

    const tsSource = `/// <mls fileReference="${entry.fileRef}" enhancement="_blank"/>\n\n`
      + `${note}\n\n` + inputBlock.join('\n') + '\n\n' + outputBody.join('\n') + `\n\n${routeConst}\n`;
    const dtsSource = `${note}\n// Declaration twin of ${entry.bffId}.ts (same shapes, ambient form).\n\n`
      + inputBlock.join('\n') + '\n\n' + outputBody.join('\n') + `\n\n${routeDecl}\n`;

    results.push({ bffId: entry.bffId, route: entry.route, tsSource, dtsSource });
  }
  return results;
}
