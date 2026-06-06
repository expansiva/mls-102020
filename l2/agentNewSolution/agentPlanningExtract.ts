/// <mls fileReference="_102020_/l2/agentNewSolution/agentPlanningExtract.ts" enhancement="_blank"/>

export const PLANNER_SCHEMA_VERSION = '2026-06-02';

export type PlannerStatus = 'ok' | 'needs_input' | 'failed';
export type Priority = 'now' | 'soon' | 'later' | 'never';

export interface PlannerOutput<T> {
  runId: string;
  stepId: string;
  schemaVersion: typeof PLANNER_SCHEMA_VERSION;
  status: PlannerStatus;
  result: T;
  questions: string[];
  trace: string[];
}

export interface PlannerExtractConfig<T> {
  toolName: string;
  stepId: string;
  stepIdAliases?: string[];
  schemaVersion?: typeof PLANNER_SCHEMA_VERSION;
  schemaVersionAliases?: string[];
  normalizeResult: (value: unknown) => T;
}

const plannerResultSchemasByToolName: Record<string, Record<string, unknown>> = {};

export function createPlannerToolSchema(
  toolName: string,
  description: string,
  stepId: string,
  resultSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  plannerResultSchemasByToolName[toolName] = resultSchema;

  return {
    type: 'function',
    function: {
      name: toolName,
      description,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'result'],
        properties: {
          type: { const: 'flexible' },
          result: {
            type: 'object',
            additionalProperties: false,
            required: ['runId', 'stepId', 'schemaVersion', 'status', 'result', 'questions', 'trace'],
            properties: {
              runId: { type: 'string' },
              stepId: { const: stepId },
              schemaVersion: { const: PLANNER_SCHEMA_VERSION },
              status: { enum: ['ok', 'needs_input', 'failed'] },
              result: resultSchema,
              questions: {
                type: 'array',
                items: { type: 'string' },
              },
              trace: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  } as unknown as mls.msg.LLMTool;
}

export function createPlannerVariableToolSchema(
  toolName: string,
  description: string,
  resultSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  plannerResultSchemasByToolName[toolName] = resultSchema;

  return {
    type: 'function',
    function: {
      name: toolName,
      description,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'result', 'questions', 'trace'],
        properties: {
          status: { enum: ['ok', 'needs_input', 'failed'] },
          result: resultSchema,
          questions: {
            type: 'array',
            items: { type: 'string' },
          },
          trace: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  } as unknown as mls.msg.LLMTool;
}

export function extractPlannerOutput<T>(payload: unknown, config: PlannerExtractConfig<T>): PlannerOutput<T> {
  const value = parseMaybeJson(payload);
  if (!isRecord(value)) throw new Error('tool payload must be an object');

  if (value.type === 'result') throw new Error(String(value.result || 'agent returned result error'));

  const directOutput = tryNormalizePlannerOutput(value, config);
  if (directOutput) return directOutput;

  if (value.type === 'flexible') {
    const flexibleResult = parseMaybeJson(value.result);
    const outputFromFlexibleResult = tryNormalizePlannerOutput(flexibleResult, config);
    if (outputFromFlexibleResult) return outputFromFlexibleResult;

    const outputFromFlexibleTool = tryExtractToolArguments(flexibleResult, config);
    if (outputFromFlexibleTool) return outputFromFlexibleTool;
  }

  const outputFromTool = tryExtractToolArguments(value, config);
  if (outputFromTool) return outputFromTool;

  const outputFromOpenAIToolCall = tryExtractOpenAIToolCall(value, config);
  if (outputFromOpenAIToolCall) return outputFromOpenAIToolCall;

  throw new Error(`payload does not contain a recognized ${config.toolName} tool output`);
}

function tryExtractOpenAIToolCall<T>(value: Record<string, unknown>, config: PlannerExtractConfig<T>): PlannerOutput<T> | null {
  const toolCalls = value.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;

  const call = toolCalls.find(item => {
    const record = isRecord(item) ? item : null;
    const fn = record && isRecord(record.function) ? record.function : null;
    return fn?.name === config.toolName;
  });

  if (!isRecord(call)) return null;
  const fn = call.function;
  if (!isRecord(fn)) return null;
  return normalizeToolArguments(fn.arguments, config);
}

function tryExtractToolArguments<T>(value: unknown, config: PlannerExtractConfig<T>): PlannerOutput<T> | null {
  const record = parseMaybeJson(value);
  if (!isRecord(record)) return null;
  if (record.toolName !== config.toolName) return null;
  return normalizeToolArguments(record.arguments, config);
}

function normalizeToolArguments<T>(value: unknown, config: PlannerExtractConfig<T>, depth: number = 0): PlannerOutput<T> {
  const args = parseMaybeJson(value);
  if (!isRecord(args)) throw new Error('tool arguments must be an object');

  const resultValue = parseMaybeJson(args.result);
  const outputFromNestedPlannerEnvelope = tryNormalizePlannerEnvelope(resultValue, config);
  if (outputFromNestedPlannerEnvelope) return outputFromNestedPlannerEnvelope;

  const directOutput = tryNormalizePlannerOutput(args, config);
  if (directOutput) return directOutput;

  const output = tryNormalizePlannerOutput(resultValue, config);
  if (output) return output;

  const outputFromNestedResultTool = tryExtractToolArguments(resultValue, config);
  if (outputFromNestedResultTool) return outputFromNestedResultTool;

  if (args.arguments !== undefined && depth < 3) {
    const outputFromNestedArguments = tryNormalizeNestedToolArguments(args.arguments, config, depth + 1);
    if (outputFromNestedArguments) return outputFromNestedArguments;
  }

  const bareResultOutput = tryNormalizeBareResult(args, config);
  if (bareResultOutput) return bareResultOutput;

  throw new Error(`tool arguments do not contain ${config.stepId} output`);
}

function tryNormalizePlannerEnvelope<T>(value: unknown, config: PlannerExtractConfig<T>): PlannerOutput<T> | null {
  const output = parseMaybeJson(value);
  if (!isRecord(output)) return null;
  if (!looksLikePlannerEnvelope(output)) return null;
  if (output.schemaVersion !== undefined && !isKnownSchemaVersion(output.schemaVersion, config)) return null;
  if (output.stepId !== undefined && !isKnownStepId(output.stepId, config)) {
    throw new Error(`stepId must be ${config.stepId}`);
  }
  if (output.result === undefined) return null;
  validatePlannerResultSchema(output.result, config);

  return {
    runId: optionalString(output.runId, 'runId') || 'provider-tool-call',
    stepId: config.stepId,
    schemaVersion: PLANNER_SCHEMA_VERSION,
    status: output.status === undefined ? 'ok' : assertPlannerStatus(output.status, 'status'),
    result: config.normalizeResult(output.result),
    questions: normalizeStringList(output.questions, 'questions'),
    trace: normalizeStringList(output.trace, 'trace'),
  };
}

function looksLikePlannerEnvelope(value: Record<string, unknown>): boolean {
  return value.runId !== undefined ||
    value.stepId !== undefined ||
    value.schemaVersion !== undefined ||
    value.status !== undefined ||
    value.questions !== undefined ||
    value.trace !== undefined;
}

function tryNormalizeNestedToolArguments<T>(value: unknown, config: PlannerExtractConfig<T>, depth: number): PlannerOutput<T> | null {
  try {
    return normalizeToolArguments(value, config, depth);
  } catch {
    return null;
  }
}

function tryNormalizeBareResult<T>(value: Record<string, unknown>, config: PlannerExtractConfig<T>): PlannerOutput<T> | null {
  try {
    validatePlannerResultSchema(value, config);
    return {
      runId: optionalString(value.runId, 'runId') || 'provider-tool-call',
      stepId: config.stepId,
      schemaVersion: PLANNER_SCHEMA_VERSION,
      status: isPlannerStatus(value.status) ? value.status : 'ok',
      result: config.normalizeResult(value),
      questions: normalizeStringList(value.questions, 'questions'),
      trace: normalizeStringList(value.trace, 'trace'),
    };
  } catch {
    return null;
  }
}

function isPlannerStatus(value: unknown): value is PlannerStatus {
  return value === 'ok' || value === 'needs_input' || value === 'failed';
}

function tryNormalizePlannerOutput<T>(value: unknown, config: PlannerExtractConfig<T>): PlannerOutput<T> | null {
  const output = parseMaybeJson(value);
  if (!isRecord(output)) return null;
  if (output.schemaVersion !== undefined && !isKnownSchemaVersion(output.schemaVersion, config)) return null;
  if (output.stepId !== undefined && !isKnownStepId(output.stepId, config)) return null;
  if (output.result === undefined) return null;
  if (isToolWrapper(output.result, config.toolName)) return null;
  if (isNestedPlannerOutput(output.result, config)) return null;
  validatePlannerResultSchema(output.result, config);

  return {
    runId: optionalString(output.runId, 'runId') || 'provider-tool-call',
    stepId: config.stepId,
    schemaVersion: PLANNER_SCHEMA_VERSION,
    status: output.status === undefined ? 'ok' : assertPlannerStatus(output.status, 'status'),
    result: config.normalizeResult(output.result),
    questions: normalizeStringList(output.questions, 'questions'),
    trace: normalizeStringList(output.trace, 'trace'),
  };
}

function validatePlannerResultSchema<T>(value: unknown, config: PlannerExtractConfig<T>): void {
  const schema = plannerResultSchemasByToolName[config.toolName];
  if (!schema) return;
  validateJsonSchema(value, schema, 'result');
}

function validateJsonSchema(value: unknown, schema: unknown, path: string): void {
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

  if (schema.const !== undefined && value !== schema.const) {
    throw new Error(`${path} must be ${JSON.stringify(schema.const)}`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    throw new Error(`${path} must be one of ${schema.enum.map(item => JSON.stringify(item)).join(', ')}`);
  }

  if (schema.type !== undefined) validateJsonSchemaType(value, schema.type, path);

  if (schema.type === 'object' || (schema.properties !== undefined || schema.required !== undefined)) {
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

    const additionalProperties = schema.additionalProperties;
    if (additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (properties[key] === undefined) throw new Error(`${path}.${key} is not allowed`);
      }
    } else if (isRecord(additionalProperties)) {
      for (const key of Object.keys(value)) {
        if (properties[key] === undefined) validateJsonSchema(value[key], additionalProperties, `${path}.${key}`);
      }
    }
  }

  if (schema.type === 'array' || schema.items !== undefined) {
    if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
    if (schema.items !== undefined) {
      value.forEach((item, index) => validateJsonSchema(item, schema.items, `${path}[${index}]`));
    }
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

function isToolWrapper(value: unknown, toolName: string): boolean {
  const record = parseMaybeJson(value);
  return isRecord(record) && record.toolName === toolName && record.arguments !== undefined;
}

function isNestedPlannerOutput<T>(value: unknown, config: PlannerExtractConfig<T>): boolean {
  const record = parseMaybeJson(value);
  if (!isRecord(record)) return false;
  if (record.result === undefined) return false;
  if (record.stepId !== undefined) return isKnownStepId(record.stepId, config);
  return record.runId !== undefined || record.schemaVersion !== undefined || isPlannerStatus(record.status);
}

function isKnownStepId<T>(value: unknown, config: PlannerExtractConfig<T>): boolean {
  return [config.stepId, ...(config.stepIdAliases || [])].includes(value as string);
}

function isKnownSchemaVersion<T>(value: unknown, config: PlannerExtractConfig<T>): boolean {
  return [config.schemaVersion || PLANNER_SCHEMA_VERSION, ...(config.schemaVersionAliases || ['1.0'])].includes(value as string);
}

export function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  return JSON.parse(trimmed);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path} must be an object`);
  return value;
}

export function assertArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value;
}

export function assertString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${path} must be a non-empty string`);
  return value.trim();
}

export function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return assertString(value, path);
}

export function assertStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value.map((item, index) => assertString(item, `${path}[${index}]`));
}

export function normalizeStringList(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((item, index) => normalizeStringListItem(item, `${path}[${index}]`));
  if (isRecord(value)) {
    return Object.entries(value).map(([key, item]) => {
      const normalized = normalizeStringListItem(item, `${path}.${key}`);
      return normalized || key;
    });
  }
  return [assertString(value, path)];
}

export function assertPriority(value: unknown, path: string): Priority {
  if (value === 'now' || value === 'soon' || value === 'later' || value === 'never') return value;
  throw new Error(`${path} must be now, soon, later, or never`);
}

function normalizeStringListItem(value: unknown, path: string): string {
  if (typeof value === 'string') return assertString(value, path);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isRecord(value)) {
    const parts = [
      optionalString(value.title, `${path}.title`),
      optionalString(value.question, `${path}.question`),
      optionalString(value.description, `${path}.description`),
      optionalString(value.reason, `${path}.reason`),
      optionalString(value.message, `${path}.message`),
    ].filter((item): item is string => !!item);
    if (parts.length > 0) return parts.join(' - ');
    return JSON.stringify(value);
  }
  throw new Error(`${path} must be a string-compatible value`);
}

function assertPlannerStatus(value: unknown, path: string): PlannerStatus {
  if (value === 'ok' || value === 'needs_input' || value === 'failed') return value;
  throw new Error(`${path} must be ok, needs_input, or failed`);
}
