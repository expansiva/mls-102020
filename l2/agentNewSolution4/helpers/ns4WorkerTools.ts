/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4WorkerTools.ts" enhancement="_blank"/>

/**
 * Shared mechanics for strict artifact workers.  Step-specific artifact schemas stay under
 * `schemas/`; this helper only makes their result a payload that collab-messages can schedule.
 */
export function createNs4FlexibleWorkerTool(
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

/** Keeps already persisted raw worker payloads resumable while new workers use the envelope. */
export function unwrapNs4FlexibleWorkerPayload(value: unknown): unknown {
  const root = parse(value);
  return isRecord(root) && root.type === 'flexible' ? parse(root.result) : root;
}

function parse(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
