/// <mls fileReference="_102020_/l2/agentNewSolution3/helpers/ns3Gate.ts" enhancement="_blank"/>

import {
  Ns3PipelineState,
  recordNs3GateResult,
  writeNs3Pipeline,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.js';

export type Ns3GateSeverity = 'error' | 'warning';

export interface Ns3GateIssue {
  severity: Ns3GateSeverity;
  code: string;
  message: string;
  path?: string;
}

export interface Ns3GateCheck<T> {
  artifact: T;
  issues: Ns3GateIssue[];
  needsHumanInput?: boolean;
}

export interface Ns3GateRunResult<T> {
  ok: boolean;
  artifact: T;
  errors: Ns3GateIssue[];
  warnings: Ns3GateIssue[];
  attempts: number;
  needsHumanInput: boolean;
  retryContext?: string;
  pipeline?: Ns3PipelineState;
}

export interface Ns3GateRunArgs<T> {
  stepId: string;
  artifact: T;
  schema: Record<string, unknown>;
  inputs?: unknown;
  pipeline?: Ns3PipelineState;
  persistPipeline?: boolean;
  validate?: (artifact: T) => Ns3GateCheck<T> | Promise<Ns3GateCheck<T>>;
  retry?: (context: string, previous: T) => T | Promise<T>;
}

export async function runNs3Gate<T>(args: Ns3GateRunArgs<T>): Promise<Ns3GateRunResult<T>> {
  let artifact = args.artifact;
  let attempts = 1;
  let result = await validateOnce(args, artifact);
  let retryContext = formatGateErrors(result.errors);

  if (!result.ok && args.retry) {
    attempts = 2;
    artifact = await args.retry(retryContext, artifact);
    result = await validateOnce(args, artifact);
    retryContext = formatGateErrors(result.errors);
  }

  const pipeline = args.pipeline
    ? recordNs3GateResult(args.pipeline, args.stepId, {
      ok: result.ok,
      errors: result.errors.map(formatIssue),
      warnings: result.warnings.map(formatIssue),
    }, args.inputs)
    : undefined;

  if (pipeline && args.persistPipeline) await writeNs3Pipeline(pipeline);

  return {
    ok: result.ok,
    artifact,
    errors: result.errors,
    warnings: result.warnings,
    attempts,
    needsHumanInput: result.needsHumanInput,
    retryContext: result.ok ? undefined : retryContext,
    pipeline,
  };
}

export function errorIssue(code: string, message: string, path?: string): Ns3GateIssue {
  return { severity: 'error', code, message, path };
}

export function warningIssue(code: string, message: string, path?: string): Ns3GateIssue {
  return { severity: 'warning', code, message, path };
}

export function formatIssue(issue: Ns3GateIssue): string {
  return `${issue.code}${issue.path ? ` ${issue.path}` : ''}: ${issue.message}`;
}

export function formatGateErrors(errors: Ns3GateIssue[]): string {
  return errors.length ? errors.map(formatIssue).join('\n') : 'gate failed';
}

async function validateOnce<T>(args: Ns3GateRunArgs<T>, artifact: T): Promise<{
  ok: boolean;
  errors: Ns3GateIssue[];
  warnings: Ns3GateIssue[];
  needsHumanInput: boolean;
}> {
  const issues: Ns3GateIssue[] = [];
  try {
    validateJsonSchema(artifact, args.schema, 'artifact');
  } catch (error) {
    issues.push(errorIssue('schema', error instanceof Error ? error.message : String(error)));
  }

  if (args.validate) {
    const checked = await args.validate(artifact);
    issues.push(...checked.issues);
  }

  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    needsHumanInput: issues.some(issue => issue.code === 'blocking_question'),
  };
}

export function validateJsonSchema(value: unknown, schemaInput: unknown, path: string): void {
  const schema = parseMaybeJson(schemaInput);
  if (!isRecord(schema)) return;

  const anyOf = schema.anyOf;
  if (Array.isArray(anyOf)) {
    const errors: string[] = [];
    for (const option of anyOf) {
      try {
        validateJsonSchema(value, option, path);
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new Error(`${path} must match one allowed schema: ${errors.join('; ')}`);
  }

  if (schema.const !== undefined && value !== schema.const) throw new Error(`${path} must be ${JSON.stringify(schema.const)}`);
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    throw new Error(`${path} must be one of ${schema.enum.map(item => JSON.stringify(item)).join(', ')}`);
  }
  if (schema.type !== undefined) validateJsonSchemaType(value, schema.type, path);

  if (schema.type === 'object' || schema.properties !== undefined || schema.required !== undefined) {
    if (!isRecord(value)) throw new Error(`${path} must be an object`);
    const required = schema.required;
    if (Array.isArray(required)) {
      for (const key of required) {
        if (typeof key === 'string' && value[key] === undefined) throw new Error(`${path}.${key} is required`);
      }
    }
    const properties = isRecord(schema.properties) ? schema.properties : {};
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (value[key] !== undefined) validateJsonSchema(value[key], propertySchema, `${path}.${key}`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (properties[key] === undefined) throw new Error(`${path}.${key} is not allowed`);
      }
    }
  }

  if (schema.type === 'array' || schema.items !== undefined) {
    if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      throw new Error(`${path} must have at least ${schema.minItems} item(s)`);
    }
    if (schema.uniqueItems === true && new Set(value.map(item => JSON.stringify(item))).size !== value.length) {
      throw new Error(`${path} must contain unique items`);
    }
    if (schema.items !== undefined) value.forEach((item, index) => validateJsonSchema(item, schema.items, `${path}[${index}]`));
  }

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) throw new Error(`${path} must have at least ${schema.minLength} character(s)`);
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) throw new Error(`${path} must have at most ${schema.maxLength} character(s)`);
    if (typeof schema.pattern === 'string' && !(new RegExp(schema.pattern).test(value))) throw new Error(`${path} must match ${schema.pattern}`);
  }
}

function validateJsonSchemaType(value: unknown, type: unknown, path: string): void {
  const types = Array.isArray(type) ? type : [type];
  const ok = types.some(item => {
    if (item === 'array') return Array.isArray(value);
    if (item === 'object') return isRecord(value);
    if (item === 'integer') return Number.isInteger(value);
    if (item === 'number') return typeof value === 'number';
    if (item === 'string') return typeof value === 'string';
    if (item === 'boolean') return typeof value === 'boolean';
    if (item === 'null') return value === null;
    return true;
  });
  if (!ok) throw new Error(`${path} must be ${types.join(' or ')}`);
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
