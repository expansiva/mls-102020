/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asBff.ts" enhancement="_blank"/>

// Calls the generated app's backend the same way its own pages do: same-origin POST /execBff,
// so the logged user's cauth cookie travels and the controllers apply their authorize /
// validateInput / scope checks. Works where the agent runs inside the app (runtime VM messages
// panel); in the Studio there is no /execBff and the call reports that plainly.

import type { AsBffCall, AsBffResponse } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';

export const execBffCall: AsBffCall = async (routine, params) => {
  let response: Response;
  try {
    response = await fetch('/execBff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ routine, params, meta: { source: 'http' } }),
    });
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : String(error));
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return unavailable(`HTTP ${response.status} without a JSON body (is this page served by the app runtime?)`);
  }
  return normalizeBffResponse(body, response.status);
};

export function normalizeBffResponse(body: unknown, status: number): AsBffResponse {
  if (typeof body !== 'object' || body === null) return unavailable(`HTTP ${status}: unexpected response`);
  const record = body as Record<string, unknown>;
  const rawError = record.error;
  const error = typeof rawError === 'object' && rawError !== null
    ? {
      code: String((rawError as Record<string, unknown>).code ?? 'ERROR'),
      message: String((rawError as Record<string, unknown>).message ?? ''),
      details: (rawError as Record<string, unknown>).details,
    }
    : null;
  return { ok: record.ok === true, data: record.data ?? null, error: record.ok === true ? null : error || { code: `HTTP_${status}`, message: '' } };
}

function unavailable(message: string): AsBffResponse {
  return { ok: false, data: null, error: { code: 'BFF_UNAVAILABLE', message } };
}
