/// <mls fileReference="_102020_/l2/aura/molecules/shared/llmTool.ts" enhancement="_blank"/>

// SHARED strict LLM tool plumbing (provider-hardened). Single source of truth for
// building a tool schema, the tool-call instruction, and extracting the tool output —
// consumed by every agent that drives a tool-call step (agentNewMoleculeVariant,
// agentNewTheme, ...). Pure/node-testable. Names keep the "V" prefix for back-compat
// (agentNewMoleculeVariant re-exports these from its vSteps).

export interface VToolOutput {
  status: 'ok' | 'failed';
  result: Record<string, unknown>;
  trace: string[];
}

// Local tool type: mls.msg has no tool type in the local d.ts; the platform
// accepts this OpenAI-style shape via the prompt_ready assertion (ns pattern).
export interface VLlmTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export function createVToolSchema(
  toolName: string,
  description: string,
  resultSchema: Record<string, unknown>,
): VLlmTool {
  // Strict providers validate from the wrapper root: hoist $defs, drop $id
  // (lesson: agentNewSolution run06/run07 — HTTP 400 on the whole request).
  const resultBody: Record<string, unknown> = { ...resultSchema };
  const hoistedDefs = resultBody.$defs;
  delete resultBody.$defs;
  delete resultBody.$id;
  delete resultBody.version;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['status', 'result', 'trace'],
    properties: {
      status: { type: 'string', enum: ['ok', 'failed'] },
      result: resultBody,
      trace: { type: 'array', items: { type: 'string' } },
    },
  };
  if (hoistedDefs && typeof hoistedDefs === 'object') parameters.$defs = hoistedDefs;
  return {
    type: 'function',
    function: { name: toolName, description, parameters },
  };
}

export function buildVToolInstruction(toolName: string, failedWhen: string): string {
  return `
Call the "${toolName}" tool with only these top-level arguments:
{
  "status": "ok" | "failed",
  "result": artifact matching the JSON schema,
  "trace": []
}

Do not include "type", "toolName", or "arguments" in the tool arguments.
Use status "failed" only when ${failedWhen}.
`;
}

// Accepts the payload shapes seen in production: direct envelope, "flexible"
// wrapper, internal tool wrapper ({toolName, arguments}) and OpenAI tool_calls.
// resultKeys = the artifact schema's required field names (e.g. ['lessContent']).
// When provided, extraction also tolerates the two envelope-collapse shapes the
// _102027_ provider lets through (it does not enforce the strict tool schema):
//   A) the artifact flattened to the arguments root: { lessContent: '...' }
//   B) a single-field artifact whose value was put directly in `result` as a
//      bare string: { status:'ok', result:'<less…>', trace:[] }
// Both otherwise throw "tool arguments do not contain <tool> output". Passing no
// resultKeys keeps the strict behavior unchanged.
export function extractVToolOutput(payload: unknown, toolName: string, resultKeys: string[] = []): VToolOutput {
  const parsed = parseMaybeJsonLocal(payload);
  if (!isRecordLocal(parsed)) throw new Error(`missing ${toolName} payload`);
  if (parsed.type === 'result') throw new Error(String(parsed.result || `${toolName} returned result error`));

  const direct = tryNormalizeEnvelope(parsed, toolName, resultKeys);
  if (direct) return direct;

  if (parsed.type === 'flexible') {
    const flexible = parseMaybeJsonLocal(parsed.result);
    const fromFlexible = tryNormalizeEnvelope(flexible, toolName, resultKeys);
    if (fromFlexible) return fromFlexible;
    const fromFlexibleTool = tryExtractToolWrapper(flexible, toolName, resultKeys);
    if (fromFlexibleTool) return fromFlexibleTool;
    const fromFlexibleOpenAi = tryExtractOpenAiToolCall(flexible, toolName, resultKeys);
    if (fromFlexibleOpenAi) return fromFlexibleOpenAi;
    const fromFlexibleFlat = tryFlattenedArtifact(flexible, resultKeys);
    if (fromFlexibleFlat) return fromFlexibleFlat;
  }

  const fromTool = tryExtractToolWrapper(parsed, toolName, resultKeys);
  if (fromTool) return fromTool;
  const fromOpenAi = tryExtractOpenAiToolCall(parsed, toolName, resultKeys);
  if (fromOpenAi) return fromOpenAi;
  const fromFlat = tryFlattenedArtifact(parsed, resultKeys);
  if (fromFlat) return fromFlat;
  throw new Error(`payload does not contain a recognized ${toolName} output`);
}

function tryExtractToolWrapper(value: unknown, toolName: string, resultKeys: string[]): VToolOutput | null {
  const record = parseMaybeJsonLocal(value);
  if (!isRecordLocal(record) || record.toolName !== toolName) return null;
  return normalizeToolArguments(record.arguments, toolName, resultKeys);
}

function normalizeToolArguments(value: unknown, toolName: string, resultKeys: string[], depth = 0): VToolOutput {
  const args = parseMaybeJsonLocal(value);
  if (!isRecordLocal(args)) throw new Error('tool arguments must be an object');
  const direct = tryNormalizeEnvelope(args, toolName, resultKeys);
  if (direct) return direct;
  if (args.arguments !== undefined && depth < 3) return normalizeToolArguments(args.arguments, toolName, resultKeys, depth + 1);
  const flat = tryFlattenedArtifact(args, resultKeys);
  if (flat) return flat;
  throw new Error(`tool arguments do not contain ${toolName} output`);
}

function tryExtractOpenAiToolCall(value: unknown, toolName: string, resultKeys: string[]): VToolOutput | null {
  if (!isRecordLocal(value) || !Array.isArray(value.tool_calls)) return null;
  for (const call of value.tool_calls) {
    if (!isRecordLocal(call) || !isRecordLocal(call.function) || call.function.name !== toolName) continue;
    return normalizeToolArguments(call.function.arguments, toolName, resultKeys);
  }
  return null;
}

function tryNormalizeEnvelope(value: unknown, toolName: string, resultKeys: string[]): VToolOutput | null {
  const output = parseMaybeJsonLocal(value);
  if (!isRecordLocal(output) || output.result === undefined) return null;
  let result = parseMaybeJsonLocal(output.result);
  // Collapse B: single-field artifact whose value was placed directly in
  // `result` as a bare string instead of `result: { <field>: <value> }`.
  if (typeof result === 'string' && resultKeys.length === 1) result = { [resultKeys[0]]: result };
  if (!isRecordLocal(result)) return null;
  if (result.toolName === toolName && result.arguments !== undefined) return null;
  return {
    status: output.status === 'failed' ? 'failed' : 'ok',
    result,
    trace: Array.isArray(output.trace) ? output.trace.filter((item): item is string => typeof item === 'string') : [],
  };
}

// Collapse A: the artifact was flattened to the arguments root (no `result`
// wrapper), e.g. { lessContent: '...' }. Accepted only when at least one
// expected field is present, so random payloads still throw. An explicit
// model-declared failure with no body is surfaced as a failure, not wrapped.
function tryFlattenedArtifact(value: unknown, resultKeys: string[]): VToolOutput | null {
  const record = parseMaybeJsonLocal(value);
  if (!isRecordLocal(record) || record.result !== undefined) return null;
  const trace = Array.isArray(record.trace) ? record.trace.filter((item): item is string => typeof item === 'string') : [];
  if (record.status === 'failed') return { status: 'failed', result: {}, trace };
  if (!resultKeys.length || !resultKeys.some(key => key in record)) return null;
  return { status: 'ok', result: record, trace };
}

// Local copies keep this module pure/node-testable (no DOM import chain).
function parseMaybeJsonLocal(value: unknown): unknown {
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

function isRecordLocal(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
