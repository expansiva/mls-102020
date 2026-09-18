/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/contracts30/contracts.ts" enhancement="_blank"/>

import { moduleFile, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import {
  isNs5OntologyEntityV3,
  type Ns5OntologyAnyEntity,
  type Ns5OntologyFieldsV3,
} from '/_102035_/l2/solution/types.js';
import { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';
import {
  isDdmEntity,
  type P2L4Sources,
  type P2WorkspacesDraft,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

export const P2_CONTRACTS_SCHEMA_VERSION = '2026-09-18-p2-contracts-v1' as const;
export const P2_CONTRACT_KINDS = ['query', 'command'] as const;
export const P2_CONTRACT_SHAPES = ['list', 'get', 'create', 'update', 'transition', 'ddm'] as const;

export type P2ContractKind = typeof P2_CONTRACT_KINDS[number];
export type P2ContractShape = typeof P2_CONTRACT_SHAPES[number];

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const STRING_TYPES = new Set([
  'string', 'uuid', 'guid', 'email', 'url', 'uri', 'date', 'datetime', 'dateTime',
  'date-time', 'time', 'timestamp', 'timestamptz', 'record',
]);
const NUMBER_TYPES = new Set([
  'number', 'integer', 'int', 'int32', 'int64', 'float', 'double', 'decimal', 'money', 'currency',
]);

export interface P2EntityField {
  path: string;
  name: string;
  entityId: string;
  type: string;
  tsType: string;
  derived: boolean;
  /** Ontology `required`. Absent means optional on Input, required on Output. */
  required?: boolean;
  enumValues: string[];
  leaf: boolean;
}

export interface P2CallSlot {
  workspaceId: string;
  stepRef: string;
  entityRef: string;
  kind: P2ContractKind;
  shape: P2ContractShape;
  transitionRef: string;
}

export interface P2ContractCall {
  callName: string;
  kind: P2ContractKind;
  stepRef: string;
  entityRef: string;
  shape: P2ContractShape;
  transitionRef: string;
  inputFields: string[];
  outputFields: string[];
}

export interface P2ContractWorkspace {
  workspaceId: string;
  calls: P2ContractCall[];
}

export interface P2ContractsDraft {
  schemaVersion: typeof P2_CONTRACTS_SCHEMA_VERSION;
  moduleName: string;
  workspaces: P2ContractWorkspace[];
}

export function isP2ContractKind(value: string): value is P2ContractKind {
  return (P2_CONTRACT_KINDS as readonly string[]).includes(value);
}

export function isP2ContractShape(value: string): value is P2ContractShape {
  return (P2_CONTRACT_SHAPES as readonly string[]).includes(value);
}

export function p2ContractFile(moduleName: string, workspaceId: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 2,
    folder: `${base.folder}/web/contracts`,
    shortName: workspaceId,
    extension: '.defs.ts',
  };
}

/** Every addressable field of one entity, entity root excluded. Types come from the ontology. */
export function collectP2EntityFields(entity: Ns5OntologyAnyEntity): P2EntityField[] {
  const meta = new Map<string, FieldMeta>();
  if (isNs5OntologyEntityV3(entity)) {
    walkFieldMeta(entity.record.fields, entity.entityId, meta);
  } else {
    for (const field of entity.fields ?? []) {
      const path = `${entity.entityId}.${field.fieldId}`;
      meta.set(path, {
        type: String(field.type || ''),
        derived: false,
        required: field.required === true ? true : field.required === false ? false : undefined,
        enumValues: enumCodes(field.enum),
        leaf: true,
      });
    }
  }

  const out: P2EntityField[] = [];
  for (const path of resolvableFieldPaths(entity)) {
    if (path === entity.entityId) continue;
    const found = meta.get(path);
    if (!found) continue;
    out.push({
      path,
      name: lastSegment(path),
      entityId: entity.entityId,
      type: found.type,
      tsType: tsTypeOf(found),
      derived: found.derived,
      required: found.required,
      enumValues: found.enumValues,
      leaf: found.leaf,
    });
  }
  return out;
}

export function collectP2FieldCatalog(sources: P2L4Sources): P2EntityField[] {
  const out: P2EntityField[] = [];
  for (const entity of sources.ontologyEntities) {
    out.push(...collectP2EntityFields(entity));
  }
  return out;
}

/**
 * One slot per relevant journey step in the workspace cut.
 * locate → paginated list; inspect → get (ddm when the workspace is a hub);
 * act → cmd by effect; decide → one cmd per branching origin (ns5_57).
 */
export function collectP2CallSlots(
  draft: P2WorkspacesDraft,
  sources: P2L4Sources,
): P2CallSlot[] {
  const stepById = new Map<string, { kind: string; entity: string; effect?: string; transitionRef?: string }>();
  for (const journey of sources.journeys) {
    for (const step of journey.steps) {
      stepById.set(step.stepId, step);
    }
  }

  const slots: P2CallSlot[] = [];
  for (const workspace of draft.workspaces) {
    for (const stepRef of workspace.stepRefs) {
      const step = stepById.get(stepRef);
      if (!step) continue;
      if (step.kind === 'decide') {
        const branches = branchingTransitions(step.entity, sources);
        if (branches.length) {
          for (const branch of branches) {
            slots.push({
              workspaceId: workspace.workspaceId,
              stepRef,
              entityRef: step.entity,
              kind: 'command',
              shape: 'transition',
              transitionRef: branch.transitionId,
            });
          }
          continue;
        }
        slots.push({
          workspaceId: workspace.workspaceId,
          stepRef,
          entityRef: step.entity,
          kind: 'command',
          shape: 'transition',
          transitionRef: '',
        });
        continue;
      }
      slots.push(slotForStep(workspace.workspaceId, stepRef, step, workspace.kind, sources));
    }
  }
  return slots;
}

export function normalizeP2ContractsPayload(value: unknown, moduleName: string): P2ContractsDraft {
  const root = record(value);
  return {
    schemaVersion: P2_CONTRACTS_SCHEMA_VERSION,
    moduleName: memberId(text(root.moduleName) || moduleName),
    workspaces: list(root.workspaces).map(item => normalizeWorkspace(item)).filter(workspace => workspace.workspaceId),
  };
}

export function buildP2ContractsTool(schema: Record<string, unknown>): mls.msg.LLMTool {
  return createP2ArtifactTool(
    'submitP2Contracts',
    'Submit one BFF contract per workspace: named calls chosen from the deterministic slots, fields chosen from the ontology catalog.',
    schema,
  );
}

export function unwrapP2ArtifactPayload(value: unknown): unknown {
  const root = parseMaybeJson(value);
  const payload = isRecord(root) && root.type === 'flexible' ? parseMaybeJson(root.result) : root;
  const argumentsValue = toolArguments(payload);
  if (argumentsValue === undefined) return payload;
  const argumentsPayload = parseMaybeJson(argumentsValue);
  return isRecord(argumentsPayload) && argumentsPayload.type === 'flexible'
    ? parseMaybeJson(argumentsPayload.result)
    : argumentsPayload;
}

export function fieldByPath(catalog: readonly P2EntityField[]): Map<string, P2EntityField> {
  return new Map(catalog.map(field => [field.path, field]));
}

export function collectionFieldName(entityRef: string): string {
  if (!entityRef) return 'recordItems';
  return `${entityRef.slice(0, 1).toLowerCase()}${entityRef.slice(1)}Items`;
}

export function commandPascal(callName: string): string {
  return callName ? `${callName.slice(0, 1).toUpperCase()}${callName.slice(1)}` : '';
}

export function isIdentityPath(entityRef: string, path: string): boolean {
  return path === `${entityRef}.id`;
}

/** Deterministic TypeScript for one workspace. Types come from the ontology catalog, never from the model. */
export function emitP2ContractDefs(input: {
  project: number;
  moduleName: string;
  workspaceId: string;
  calls: readonly P2ContractCall[];
  catalog: ReadonlyMap<string, P2EntityField>;
}): string {
  const filePath = `_${input.project}_/l2/${input.moduleName}/web/contracts/${input.workspaceId}.defs.ts`;
  const lines: string[] = [
    `/// <mls fileReference="${filePath}" enhancement="_blank"/>`,
    '',
    `// GENERATED from l4 — do not edit (workspace ${input.workspaceId}; one contract file per workspace, all bffCalls).`,
    '',
  ];

  for (const call of input.calls) {
    const pascal = commandPascal(call.callName);
    const route = `${input.moduleName}.${input.workspaceId}.${call.callName}`;
    const outputKind = call.shape === 'list' ? 'paginated' : 'object';
    lines.push(`// bffCall ${call.callName} (${call.kind}) — Output kind=${outputKind}; route ${route}.`);
    lines.push(`export interface ${pascal}Input {`);
    lines.push(...emitInputProperties(call, input.catalog));
    lines.push('}');
    lines.push('');

    if (call.shape === 'list') {
      const itemName = `${pascal}OutputItem`;
      lines.push(`export interface ${itemName} {`);
      lines.push(...emitOutputProperties(call.outputFields, input.catalog));
      lines.push('}');
      lines.push('');
      const itemsKey = collectionFieldName(call.entityRef);
      lines.push(`export interface ${pascal}Output {`);
      lines.push(`  ${itemsKey}: ${itemName}[];`);
      lines.push('  total: number;');
      lines.push('  page?: number;');
      lines.push('  pageSize?: number;');
      lines.push('}');
    } else {
      lines.push(`export interface ${pascal}Output {`);
      lines.push(...emitOutputProperties(call.outputFields, input.catalog));
      lines.push('}');
    }
    lines.push('');
    lines.push(`export const ${call.callName}Route = '${route}' as const;`);
    lines.push('');
  }

  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  lines.push('');
  return lines.join('\n');
}

export function countP2CallsByKind(draft: P2ContractsDraft): { query: number; command: number } {
  let query = 0;
  let command = 0;
  for (const workspace of draft.workspaces) {
    for (const call of workspace.calls) {
      if (call.kind === 'query') query += 1;
      else command += 1;
    }
  }
  return { query, command };
}

interface FieldMeta {
  type: string;
  derived: boolean;
  required?: boolean;
  enumValues: string[];
  leaf: boolean;
}

function walkFieldMeta(
  fields: Ns5OntologyFieldsV3 | undefined,
  parent: string,
  into: Map<string, FieldMeta>,
): void {
  for (const [id, field] of Object.entries(fields ?? {})) {
    const path = `${parent}.${id}`;
    const nested = field.fields;
    into.set(path, {
      type: String(field.type || ''),
      derived: field.derived === true,
      required: field.required === true ? true : field.required === false ? false : undefined,
      enumValues: enumCodes(field.values),
      leaf: !nested || Object.keys(nested).length === 0,
    });
    if (nested) walkFieldMeta(nested, path, into);
  }
}

function tsTypeOf(meta: FieldMeta): string {
  if (meta.enumValues.length) return meta.enumValues.map(value => `'${escapeLiteral(value)}'`).join(' | ');
  if (STRING_TYPES.has(meta.type)) return 'string';
  if (NUMBER_TYPES.has(meta.type)) return 'number';
  if (meta.type === 'boolean') return 'boolean';
  return 'unknown';
}

function enumCodes(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const item of values) {
    if (typeof item === 'string' && item.trim()) out.push(item.trim());
    else if (isRecord(item) && typeof item.value === 'string' && item.value.trim()) out.push(item.value.trim());
  }
  return out;
}

function slotForStep(
  workspaceId: string,
  stepRef: string,
  step: { kind: string; entity: string; effect?: string; transitionRef?: string },
  workspaceKind: string,
  sources: P2L4Sources,
): P2CallSlot {
  if (step.kind === 'locate') {
    return { workspaceId, stepRef, entityRef: step.entity, kind: 'query', shape: 'list', transitionRef: '' };
  }
  if (step.kind === 'inspect') {
    const entity = sources.entities.find(item => item.entityId === step.entity);
    const ddm = workspaceKind === 'hub' || (entity ? isDdmEntity(entity) : false);
    return {
      workspaceId,
      stepRef,
      entityRef: step.entity,
      kind: 'query',
      shape: ddm ? 'ddm' : 'get',
      transitionRef: '',
    };
  }
  const effect = step.effect || 'create';
  const shape: P2ContractShape = effect === 'update' || effect === 'transition' ? effect : 'create';
  return {
    workspaceId,
    stepRef,
    entityRef: step.entity,
    kind: 'command',
    shape,
    transitionRef: shape === 'transition' ? (step.transitionRef || '') : '',
  };
}

function branchingTransitions(
  entityId: string,
  sources: P2L4Sources,
): P2L4Sources['entities'][number]['transitions'] {
  const entity = sources.entities.find(item => item.entityId === entityId);
  const transitions = entity?.transitions || [];
  const byFrom = new Map<string, typeof transitions>();
  for (const transition of transitions) {
    for (const from of transition.from) {
      const group = byFrom.get(from) || [];
      group.push(transition);
      byFrom.set(from, group);
    }
  }
  const out: typeof transitions = [];
  const seen = new Set<string>();
  for (const group of byFrom.values()) {
    if (group.length < 2) continue;
    for (const transition of group) {
      if (seen.has(transition.transitionId)) continue;
      seen.add(transition.transitionId);
      out.push(transition);
    }
  }
  return out;
}

function emitInputProperties(call: P2ContractCall, catalog: ReadonlyMap<string, P2EntityField>): string[] {
  const lines = call.inputFields.map(path => propertyLine(path, catalog, 'input'));
  if (call.shape === 'list') {
    lines.push('  page?: number;');
    lines.push('  pageSize?: number;');
  }
  return lines;
}

function emitOutputProperties(paths: readonly string[], catalog: ReadonlyMap<string, P2EntityField>): string[] {
  return paths.map(path => propertyLine(path, catalog, 'output'));
}

function propertyLine(path: string, catalog: ReadonlyMap<string, P2EntityField>, direction: 'input' | 'output'): string {
  const field = catalog.get(path);
  const name = field?.name || lastSegment(path);
  const tsType = field?.tsType && field.tsType !== 'any' ? field.tsType : 'unknown';
  const optional = direction === 'input' ? field?.required !== true : field?.required === false;
  return `  ${name}${optional ? '?' : ''}: ${tsType};`;
}

function normalizeWorkspace(value: unknown): P2ContractWorkspace {
  const source = record(value);
  return {
    workspaceId: memberId(text(source.workspaceId)),
    calls: list(source.calls).map(item => normalizeCall(item)).filter(call => call.callName || call.stepRef),
  };
}

function normalizeCall(value: unknown): P2ContractCall {
  const source = record(value);
  const kind = text(source.kind);
  const shape = text(source.shape);
  return {
    callName: memberId(text(source.callName)),
    kind: isP2ContractKind(kind) ? kind : '' as P2ContractKind,
    stepRef: memberId(text(source.stepRef)),
    entityRef: text(source.entityRef),
    shape: isP2ContractShape(shape) ? shape : '' as P2ContractShape,
    transitionRef: memberId(text(source.transitionRef)),
    inputFields: uniquePaths(source.inputFields),
    outputFields: uniquePaths(source.outputFields),
  };
}

function createP2ArtifactTool(
  toolName: string,
  description: string,
  artifactSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  const result: Record<string, unknown> = { ...artifactSchema };
  const defs = result.$defs;
  delete result.$defs;
  delete result.$id;
  delete result.$schema;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'result'],
    properties: {
      type: { type: 'string', const: 'flexible' },
      result,
    },
  };
  if (isRecord(defs)) parameters.$defs = defs;
  return { type: 'function', function: { name: toolName, description, parameters } } as mls.msg.LLMTool;
}

function uniquePaths(value: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list(value)) {
    const path = typeof item === 'string' ? item.trim() : '';
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

function toolArguments(value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  if ('arguments' in value) return value.arguments;
  const calls = value.tool_calls;
  if (!Array.isArray(calls) || !isRecord(calls[0])) return undefined;
  const call = calls[0];
  return isRecord(call.function) && 'arguments' in call.function ? call.function.arguments : call.arguments;
}

function lastSegment(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] || path;
}

function escapeLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function memberId(value: string): string {
  const trimmed = value.trim();
  return MEMBER_ID.test(trimmed) ? trimmed : trimmed;
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value === 'string') {
    const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(clean); } catch { return value; }
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
