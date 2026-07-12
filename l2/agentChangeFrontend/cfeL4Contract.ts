/// <mls fileReference="_102020_/l2/agentChangeFrontend/cfeL4Contract.ts" enhancement="_blank"/>

import { clientInputPresentation, isClientBoundarySource, type ClientInputPresentation } from '/_102029_/l2/clientBoundarySources.js';

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

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
