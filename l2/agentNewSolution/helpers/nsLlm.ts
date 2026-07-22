/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsLlm.ts" enhancement="_blank"/>

// Generic LLM tool-call payload handling for ns steps. Policy: this helper is
// step-agnostic — it knows tool NAMES only as parameters, never step semantics.

// isRecord/parseMaybeJson are kept LOCAL (not imported from nsFs) so this module stays pure and
// unit-testable — nsFs pulls the libStor/DOM import chain, which crashes under node:test.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

export type NsToolStatus = 'ok' | 'failed';

export interface NsToolOutput {
  status: NsToolStatus;
  result: Record<string, unknown>;
  trace: string[];
}

export function createNsToolSchema(
  toolName: string,
  description: string,
  resultSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  // Grok/xAI (and other strict providers) validate the ENTIRE tool schema from the wrapper root, so a
  // `$ref: "#/$defs/..."` that lives inside `result` is unresolvable — the root wrapper has no `$defs` —
  // and the provider rejects the whole request with HTTP 400 (run06/run07, all 110 e5 items failed).
  // Fix (provider-only, in the agent that owns the tool): hoist result's top-level `$defs` to the
  // tool-parameters root, where `#/$defs/...` resolves, and drop the nested `$id` the provider does not
  // need. The refs stay `#/$defs/...` (now correct). Schemas without `$defs` pass through unchanged.
  const resultBody: Record<string, unknown> = { ...resultSchema };
  const hoistedDefs = resultBody.$defs;
  delete resultBody.$defs;
  delete resultBody.$id;
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
  } as unknown as mls.msg.LLMTool;
}

export function buildNsToolInstruction(toolName: string, failedWhen: string): string {
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
export function extractNsToolOutput(payload: unknown, toolName: string): NsToolOutput {
  const parsed = parseMaybeJson(payload);
  if (!isRecord(parsed)) throw new Error(`missing ${toolName} payload`);
  if (parsed.type === 'result') throw new Error(readString(parsed.result) || `${toolName} returned result error`);

  const direct = tryNormalizeEnvelope(parsed, toolName);
  if (direct) return direct;

  if (parsed.type === 'flexible') {
    const flexible = parseMaybeJson(parsed.result);
    const fromFlexible = tryNormalizeEnvelope(flexible, toolName);
    if (fromFlexible) return fromFlexible;
    const fromFlexibleTool = tryExtractToolWrapper(flexible, toolName);
    if (fromFlexibleTool) return fromFlexibleTool;
    const fromFlexibleOpenAi = tryExtractOpenAiToolCall(flexible, toolName);
    if (fromFlexibleOpenAi) return fromFlexibleOpenAi;
  }

  const fromTool = tryExtractToolWrapper(parsed, toolName);
  if (fromTool) return fromTool;
  const fromOpenAi = tryExtractOpenAiToolCall(parsed, toolName);
  if (fromOpenAi) return fromOpenAi;
  throw new Error(`payload does not contain a recognized ${toolName} output`);
}

function tryExtractToolWrapper(value: unknown, toolName: string): NsToolOutput | null {
  const record = parseMaybeJson(value);
  if (!isRecord(record) || record.toolName !== toolName) return null;
  return normalizeToolArguments(record.arguments, toolName);
}

function normalizeToolArguments(value: unknown, toolName: string, depth = 0): NsToolOutput {
  const args = parseMaybeJson(value);
  if (!isRecord(args)) throw new Error('tool arguments must be an object');
  const direct = tryNormalizeEnvelope(args, toolName);
  if (direct) return direct;
  if (args.arguments !== undefined && depth < 3) return normalizeToolArguments(args.arguments, toolName, depth + 1);
  throw new Error(`tool arguments do not contain ${toolName} output`);
}

function tryExtractOpenAiToolCall(value: unknown, toolName: string): NsToolOutput | null {
  if (!isRecord(value) || !Array.isArray(value.tool_calls)) return null;
  for (const call of value.tool_calls) {
    if (!isRecord(call) || !isRecord(call.function) || call.function.name !== toolName) continue;
    return normalizeToolArguments(call.function.arguments, toolName);
  }
  return null;
}

function tryNormalizeEnvelope(value: unknown, toolName: string): NsToolOutput | null {
  const output = parseMaybeJson(value);
  if (!isRecord(output) || output.result === undefined) return null;
  const result = parseMaybeJson(output.result);
  if (!isRecord(result) || isToolWrapperShape(result, toolName)) return null;
  return {
    status: normalizeStatus(output.status),
    result,
    trace: normalizeStringArray(output.trace),
  };
}

function isToolWrapperShape(value: unknown, toolName: string): boolean {
  const record = parseMaybeJson(value);
  return isRecord(record) && record.toolName === toolName && record.arguments !== undefined;
}

function normalizeStatus(value: unknown): NsToolStatus {
  if (value === undefined || value === 'needs_input') return 'ok';
  if (value === 'ok' || value === 'failed') return value;
  throw new Error(`invalid tool status: ${String(value)}`);
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => readString(item)).filter((item): item is string => !!item) : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
