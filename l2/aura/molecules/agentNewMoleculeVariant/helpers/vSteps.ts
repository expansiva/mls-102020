/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.ts" enhancement="_blank"/>

// Task-step intent builders + LLM tool plumbing for the variant pipeline.
// Deliberately self-contained (mirrors agentNewSolution/helpers/nsSteps.ts and
// nsLlm.ts) so this agent has zero coupling to another agent's folder.
// Orchestration rules honored (mls-base/skills/collab_messages.md):
// - parents auto-complete per intent — add the next OPEN step before any
//   completed result / update-status in the same batch;
// - downstream steps depend ONLY on 'vN-done' anchors (retries have dynamic planIds).

export const V_PLAN_IDS = ['v1-bootstrap', 'v2-shell', 'v3-less', 'v4-index', 'v5-demo', 'v6-summary'] as const;
export type VPlanId = typeof V_PLAN_IDS[number];

export function vDoneAnchor(planId: VPlanId): string {
  return `${planId.split('-')[0]}-done`; // 'v3-less' -> 'v3-done'
}

export function vUpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  // traceMsg is accepted by the backend (production usage: nsSteps.ts) but the
  // local mls.d.ts is behind — hence the assertion instead of a typed literal.
  const intent = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    ...(traceMsg ? { traceMsg } : {}),
    ...(cleaner ? { cleaner } : {}),
  } as mls.msg.AgentIntentUpdateStatus;
  return intent;
}

export function vResultStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  args: { planId: string; dependsOn: string[]; stepTitle: string; result: unknown },
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'result',
      stepId: 0,
      interaction: null,
      stepTitle: args.stepTitle,
      status: 'completed',
      nextSteps: [],
      result: JSON.stringify(args.result, null, 2),
      planning: { planId: args.planId, dependsOn: args.dependsOn, executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  };
}

// Dynamic agent step (retries). Status 'waiting_human_input' == runs immediately.
export function vAgentStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  args: {
    agentName: string;
    stepTitle: string;
    planId: string;
    dependsOn?: string[];
    prompt: Record<string, unknown>;
    status?: mls.msg.AIStepStatus;
  },
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: args.stepTitle,
      status: args.status || 'waiting_human_input',
      nextSteps: [],
      agentName: args.agentName,
      prompt: JSON.stringify(args.prompt),
      rags: [],
      planning: { planId: args.planId, dependsOn: args.dependsOn || [], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
}

export function vParseStepArgs(value: unknown): { planId?: string; retryAttempt?: number; retryContext?: string } {
  const parsed = parseMaybeJsonLocal(value);
  if (typeof parsed !== 'object' || parsed === null) return {};
  const record = parsed as Record<string, unknown>;
  return {
    planId: typeof record.planId === 'string' ? record.planId : undefined,
    retryAttempt: typeof record.retryAttempt === 'number' ? record.retryAttempt : undefined,
    retryContext: typeof record.retryContext === 'string' ? record.retryContext : undefined,
  };
}

// ---- strict tool plumbing (mirror of nsLlm.ts, provider-hardened) ----

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
// Both otherwise throw "tool arguments do not contain <tool> output" (the
// intermittent v3-less failure). Passing no resultKeys keeps the strict
// behavior unchanged.
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

// Local copies keep this module pure/node-testable (no nsFs DOM import chain).
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
