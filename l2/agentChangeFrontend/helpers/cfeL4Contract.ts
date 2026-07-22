/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeL4Contract.ts" enhancement="_blank"/>

import { clientInputPresentation, isClientBoundarySource, type ClientInputPresentation } from '/_102029_/l2/clientBoundarySources.js';

export type { ClientInputPresentation } from '/_102029_/l2/clientBoundarySources.js';

export type CfeFrontendOutputShape = 'array' | 'paginated' | 'object';
export type CfeOperationInputSource =
  | 'userInput'
  | 'actorSession'
  | 'businessContext'
  | 'currentWorkspace'
  | 'selectedEntity'
  | 'activeLifecycleInstance'
  | 'workflowState'
  | 'routeParam'
  | 'previousStepOutput'
  | 'systemDefault';

export interface CfeL4OperationInput {
  inputId: string;
  fieldRef: string;
  required: boolean;
  source: CfeOperationInputSource | string;
  description: string;
}

export interface CfeQueryStateDefaults {
  collection: boolean;
  defaultValue: unknown;
}

const RUNTIME_RESOLVED_SOURCES = new Set<string>([
  'actorSession',
  'businessContext',
  'currentWorkspace',
  'activeLifecycleInstance',
  'workflowState',
  'previousStepOutput',
  'systemDefault',
]);

export function frontendOutputShapeForOperation(operationData: unknown): CfeFrontendOutputShape {
  const operation = isRecord(operationData) ? operationData : {};
  const kind = readString(operation.kind).toLowerCase();
  const accessPattern = isRecord(operation.accessPattern) ? operation.accessPattern : {};
  const accessKind = readString(accessPattern.kind).toLowerCase();
  const pagination = readString(accessPattern.pagination).toLowerCase();
  const isQuery = kind === 'query' || kind === 'view';

  if (!isQuery) return 'object';
  if (accessKind === 'getbyid' || accessKind === 'commandinput') return 'object';
  if ((accessKind === 'list' || accessKind === 'lookup') && (pagination === 'optional' || pagination === 'required')) return 'paginated';
  return 'array';
}

export function frontendQueryStateDefaults(outputShape: CfeFrontendOutputShape | string): CfeQueryStateDefaults {
  const shape = normalizeOutputShape(outputShape);
  if (shape === 'paginated') return { collection: false, defaultValue: { items: [], total: 0 } };
  if (shape === 'object') return { collection: false, defaultValue: null };
  return { collection: true, defaultValue: [] };
}

export function normalizeOutputShape(value: unknown): CfeFrontendOutputShape {
  const shape = readString(value);
  if (shape === 'paginated' || shape === 'object') return shape;
  return 'array';
}

export function isRuntimeResolvedInputSource(source: unknown): boolean {
  return RUNTIME_RESOLVED_SOURCES.has(readString(source));
}

export function isUserFacingOperationInput(input: CfeL4OperationInput): boolean {
  return isClientBoundarySource(input.source);
}

/** userInput is editable; selectedEntity and routeParam are browser context, never form fields. */
export function frontendInputPresentation(input: CfeL4OperationInput): ClientInputPresentation | null {
  return clientInputPresentation(input.source);
}

export function hasL4OperationInputs(operationData: unknown): boolean {
  const operation = isRecord(operationData) ? operationData : {};
  return Array.isArray(operation.inputs);
}

export function l4OperationInputs(operationData: unknown): CfeL4OperationInput[] {
  const operation = isRecord(operationData) ? operationData : {};
  if (!Array.isArray(operation.inputs)) return [];
  return operation.inputs
    .filter(isRecord)
    .map(input => ({
      inputId: readString(input.inputId),
      fieldRef: readString(input.fieldRef),
      required: input.required === true,
      source: readString(input.source),
      description: readString(input.description),
    }))
    .filter(input => input.inputId && input.fieldRef);
}

export function hasL4OperationOutputRefs(operationData: unknown): boolean {
  const operation = isRecord(operationData) ? operationData : {};
  const accessPattern = isRecord(operation.accessPattern) ? operation.accessPattern : {};
  return Array.isArray(accessPattern.output);
}

export function l4OperationOutputRefs(operationData: unknown): string[] {
  const operation = isRecord(operationData) ? operationData : {};
  const accessPattern = isRecord(operation.accessPattern) ? operation.accessPattern : {};
  return Array.isArray(accessPattern.output) ? accessPattern.output.map(readString).filter(Boolean) : [];
}

// ---- L4 v2: workspace bffCalls (the wire contract of a page) ----
// A workspace declares bffCalls[] (projected views over 1..N operations) and sections[].organisms[]
// (roles that reference a bffId via dataSource/action/attachTo). One bffCall => one page "command".
// The precise TS types are the byte-copied l4 contract (l4/<module>/contracts/<ws>.<bffId>.ts); the
// shapes below carry only what the deterministic pipeline needs (names, kind, required, presentation).

export interface CfeBffCallField {
  name: string;
  from: string;
  type?: string;
  required?: boolean;
  item?: { fields: CfeBffCallField[] };
}

export interface CfeBffCallOutput {
  kind: CfeFrontendOutputShape;
  fields: CfeBffCallField[];
}

export interface CfeBffCall {
  bffId: string;
  kind: 'query' | 'command';
  route: string;
  uses: string[];
  input: CfeBffCallField[];
  output: CfeBffCallOutput | null;
}

export type CfeOrganismRole =
  | 'primarySurface'
  | 'filterControl'
  | 'detailPanel'
  | 'contextualAction'
  | 'batchAction'
  | 'hero'
  | 'banner'
  | 'richText'
  | 'imageSet'
  | 'ctaLink'
  | 'showcase';

export interface CfeWorkspaceOrganism {
  role: string;
  dataSource?: string;   // query bffId (primarySurface / detailPanel / showcase)
  action?: string;       // command bffId (contextualAction / batchAction)
  attachTo?: string;     // query bffId whose inputs the filterControl drives
  slice?: string;        // slice of a composed (uses N>1) output
}

export interface CfeWorkspaceSection {
  sectionId: string;
  intent: string;
  organisms: CfeWorkspaceOrganism[];
}

const CONTENT_ORGANISM_ROLES = new Set<string>(['hero', 'banner', 'richText', 'imageSet', 'ctaLink', 'showcase']);

export function isContentOrganismRole(role: unknown): boolean {
  return CONTENT_ORGANISM_ROLES.has(readString(role));
}

function bffOutputKind(value: unknown): CfeFrontendOutputShape {
  const kind = readString(value);
  if (kind === 'paginated' || kind === 'object') return kind;
  if (kind === 'list' || kind === 'array') return 'array';
  return 'object';
}

function bffCallField(value: unknown): CfeBffCallField | null {
  if (!isRecord(value)) return null;
  const name = readString(value.name);
  if (!name) return null;
  const field: CfeBffCallField = { name, from: readString(value.from) };
  const type = readString(value.type);
  if (type) field.type = type;
  if (value.required === true) field.required = true;
  if (isRecord(value.item) && Array.isArray(value.item.fields)) {
    const fields = value.item.fields.map(bffCallField).filter((f): f is CfeBffCallField => f !== null);
    if (fields.length) field.item = { fields };
  }
  return field;
}

/** True when the workspace declares the l4 v2 bffCalls[] (vs the legacy operationIds-only shape). */
export function hasWorkspaceBffCalls(data: unknown): boolean {
  const workspace = isRecord(data) ? data : {};
  return Array.isArray(workspace.bffCalls) && workspace.bffCalls.length > 0;
}

export function parseWorkspaceBffCalls(data: unknown): CfeBffCall[] {
  const workspace = isRecord(data) ? data : {};
  if (!Array.isArray(workspace.bffCalls)) return [];
  return workspace.bffCalls
    .filter(isRecord)
    .map(raw => {
      const bffId = readString(raw.bffId);
      if (!bffId) return null;
      const output = isRecord(raw.output)
        ? { kind: bffOutputKind(raw.output.kind), fields: (Array.isArray(raw.output.fields) ? raw.output.fields : []).map(bffCallField).filter((f): f is CfeBffCallField => f !== null) }
        : null;
      const call: CfeBffCall = {
        bffId,
        kind: readString(raw.kind) === 'command' ? 'command' : 'query',
        route: readString(raw.route),
        uses: (Array.isArray(raw.uses) ? raw.uses : []).filter(isRecord).map(use => readString(use.operationId)).filter(Boolean),
        input: (Array.isArray(raw.input) ? raw.input : []).map(bffCallField).filter((f): f is CfeBffCallField => f !== null),
        output,
      };
      return call;
    })
    .filter((call): call is CfeBffCall => call !== null);
}

export function parseWorkspaceSections(data: unknown): CfeWorkspaceSection[] {
  const workspace = isRecord(data) ? data : {};
  if (!Array.isArray(workspace.sections)) return [];
  return workspace.sections
    .filter(isRecord)
    .map((raw, index) => ({
      sectionId: readString(raw.sectionId) || `section${index + 1}`,
      intent: readString(raw.intent),
      organisms: (Array.isArray(raw.organisms) ? raw.organisms : [])
        .filter(isRecord)
        .map(org => {
          const organism: CfeWorkspaceOrganism = { role: readString(org.role) };
          const dataSource = readString(org.dataSource);
          const action = readString(org.action);
          const attachTo = readString(org.attachTo);
          const slice = readString(org.slice);
          if (dataSource) organism.dataSource = dataSource;
          if (action) organism.action = action;
          if (attachTo) organism.attachTo = attachTo;
          if (slice) organism.slice = slice;
          return organism;
        })
        .filter(org => org.role),
    }))
    .filter(section => section.organisms.length > 0);
}

// ---- L4 v2: one bffCall => one page command (the shape prepared.commands entries share) ----
// Resolves `required`/presentation for each input by tracing `from` = "<operationId>.<inputId>" back to
// the referenced operation's inputs[]. Types stay the l4 contract's responsibility (byte-copied), so the
// command only carries what shared state / page tests / layout context need.

export interface CfeBffCommandInput {
  name: string;
  required: boolean;
  presentation: ClientInputPresentation | null;
  source: string;
}

export interface CfeBffCommandShape {
  commandName: string;
  kind: 'query' | 'command';
  routeKey: string;
  outputShape: CfeFrontendOutputShape;
  canonicalOutputShape: { kind: CfeFrontendOutputShape; fields: { name: string; type: string; required: boolean; item?: { fields: unknown[] } }[] } | null;
  input: CfeBffCommandInput[];
  output: { name: string; type: string; required: boolean }[];
}

function fromOperationId(from: string): { operationId: string; path: string } {
  const dot = from.indexOf('.');
  if (dot < 0) return { operationId: '', path: from };
  return { operationId: from.slice(0, dot), path: from.slice(dot + 1) };
}

/** Deterministic bffCall -> command shape. `operationInputs` maps operationId -> its l4 inputs[]. */
export function bffCallCommandShape(bffCall: CfeBffCall, operationInputs: Map<string, CfeL4OperationInput[]>): CfeBffCommandShape {
  const inputs: CfeBffCommandInput[] = bffCall.input.map(field => {
    const ref = fromOperationId(field.from);
    const opInput = (operationInputs.get(ref.operationId) || []).find(input => input.inputId === ref.path);
    const source = opInput ? opInput.source : 'userInput';
    return {
      name: field.name,
      required: field.required === true || (opInput ? opInput.required : false),
      presentation: clientInputPresentation(source),
      source,
    };
  });
  const outputFields = bffCall.output ? bffCall.output.fields.map(field => ({ name: field.name, type: field.type || 'string', required: field.required !== false })) : [];
  const outputKind: CfeFrontendOutputShape = bffCall.output ? bffCall.output.kind : 'object';
  return {
    commandName: bffCall.bffId,
    kind: bffCall.kind,
    routeKey: bffCall.route,
    outputShape: outputKind,
    canonicalOutputShape: bffCall.output ? { kind: outputKind, fields: outputFields } : null,
    input: inputs,
    output: outputFields,
  };
}

// F3: the l2 contract .ts is GENERATED deterministically from the l4 workspace (l4 holds only .defs.ts —
// never a compilable .ts; agentChangeFrontend never reads a .ts from l4). ONE file per workspace holds
// every bffCall's Input/Output interfaces (Output is the projected item shape for a list/paginated call)
// plus its `<bffId>Route` const. A stable marker keeps the file recognizable so cleanup preserves it.
export interface CfeContractField { name: string; type: string; optional?: boolean }

export interface CfeContractCall {
  interfaceName: string;   // PascalCase(bffId) — unique within the workspace
  bffId: string;
  kind: string;            // query | command
  outputKind: string;      // object | list | paginated
  route: string;
  input: CfeContractField[];
  output: CfeContractField[];
}

const GENERATED_CONTRACT_MARKER = 'GENERATED from l4 bffCalls — do not edit';

/** One l2 contract file for a whole workspace: all bffCall Input/Output interfaces + route consts. */
export function buildWorkspaceContractSource(args: { l2Ref: string; workspaceId: string; calls: CfeContractCall[] }): string {
  const iface = (name: string, fields: CfeContractField[]): string => {
    if (fields.length === 0) return `export interface ${name} {}`;
    const body = fields.map(field => `  ${safeIdent(field.name)}${field.optional ? '?' : ''}: ${field.type};`).join('\n');
    return `export interface ${name} {\n${body}\n}`;
  };
  const blocks = args.calls.flatMap(call => [
    `// bffCall ${call.bffId} (${call.kind}) — Output kind=${call.outputKind}; route ${call.route}.`,
    iface(`${call.interfaceName}Input`, call.input),
    iface(`${call.interfaceName}Output`, call.output),
    `export const ${call.bffId}Route = '${call.route}' as const;`,
    '',
  ]);
  return [
    `/// <mls fileReference="${args.l2Ref}" enhancement="_blank"/>`,
    '',
    `// ${GENERATED_CONTRACT_MARKER} (workspace ${args.workspaceId}; one contract file per workspace, all bffCalls).`,
    '',
    ...blocks,
  ].join('\n');
}

function safeIdent(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

/** True when a contract .ts was generated from l4 bffCalls — preserved by rebuild-defs cleanup. */
export function isCopiedL4Contract(source: string): boolean {
  return /GENERATED from l4 bffCalls — do not edit/.test(source);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
