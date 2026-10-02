/// <mls fileReference="_102020_/l2/helpers/llmResponses.ts" enhancement="_blank"/>

import { writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

/**
 * The raw LLM answer of one call, written before it is normalized or validated, so a refused answer of a real run
 * can become a replay case (agentDefsL2/helpers/e2eReplay.test.ts). It never feeds a receipt, a hash or a decision.
 */
export interface D2LlmResponseRecord {
  attempt: string;
  model: string;
  promptChars: number;
  receivedAt: string;
  raw: unknown;
  /** `accepted`, or the refusal text of the gate; absent until validation ran. */
  verdict?: string;
}

export interface D2LlmResponseWriter { writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown> }
const productionWriter: D2LlmResponseWriter = { writeJson };

/** `<folder>/<unit>-<attempt>.json`; a repair is a new attempt and never overwrites the previous one. */
export function d2LlmResponseInfo(project: number, folder: string, unit: string, attempt: string, level: 2 | 4 = 2): Ns5FileInfo {
  return { project, level, folder, shortName: `${unit}-${attempt}`, extension: '.json' };
}

/** The model the host reports in the step trace (`model:<id>`), or '' when the trace does not say. */
export function d2LlmModelOf(step: { interaction?: { trace?: unknown } | null }): string {
  const trace = Array.isArray(step.interaction?.trace) ? step.interaction!.trace as unknown[] : [];
  for (const line of trace) {
    const match = typeof line === 'string' ? /\bmodel:(\S+)/u.exec(line) : null;
    if (match) return match[1];
  }
  return '';
}

export async function recordD2LlmResponse(info: Ns5FileInfo, record: D2LlmResponseRecord, writer: D2LlmResponseWriter = productionWriter): Promise<D2LlmResponseRecord> {
  try { await writer.writeJson(info, record); } catch (error) {
    throw new Error(`D2_LLM_RESPONSE_RECORD_FAILED: ${info.folder}/${info.shortName}${info.extension}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return record;
}

export async function recordD2LlmVerdict(info: Ns5FileInfo, record: D2LlmResponseRecord, verdict: string, writer: D2LlmResponseWriter = productionWriter): Promise<D2LlmResponseRecord> {
  return recordD2LlmResponse(info, { ...record, verdict }, writer);
}
