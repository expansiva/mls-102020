/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asIds.ts" enhancement="_blank"/>

// Names, planIds and the clarification envelope check (pure: no engine imports, node-testable).

export const AS_AGENT_NAME = 'agentAssistant';
export const AS_INTERPRET_AGENT = 'agentAsInterpret';
export const AS_ASK_AGENT = 'agentAsAsk';
export const AS_ANSWER_AGENT = 'agentAsAnswer';
export const AS_ANSWER_PLAN_ID = 'answer';
export const AS_INTERPRET_PLAN_ID = 'interpret';
export const AS_MEMORY_KEY = 'assistantState';

export function askPlanId(round: number): string {
  return `ask-${round}`;
}

export function roundOfPlanId(planId: string): number {
  const match = /^ask-(\d+)$/.exec(planId);
  return match ? Number(match[1]) : 0;
}

// The asking step's payload must be a { type: 'clarification', json: { planId } } envelope,
// otherwise the widget never mounts. Returns '' when valid, else a readable reason.
export function checkClarificationPayload(payload: unknown, planId: string): string {
  const parsed = parseMaybeJson(payload);
  const envelope = isRecord(parsed) && parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
  if (!isRecord(envelope)) return `${planId}: the model returned no payload object`;
  if (envelope.type === 'result') return typeof envelope.result === 'string' ? envelope.result : `${planId}: the model returned an error`;
  if (envelope.type !== 'clarification') return `${planId}: invalid payload type ${String(envelope.type)}`;
  const json = parseMaybeJson(envelope.json);
  if (!isRecord(json) || json.planId !== planId) return `${planId}: clarification json does not carry planId ${planId}`;
  return '';
}

// The answer step's model writes the answer inside the clarification json.
export function readAnswerFromJson(value: unknown): string {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) && typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
}

export function readPlanIdFromJson(value: unknown): string {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) && typeof parsed.planId === 'string' ? parsed.planId : '';
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
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
