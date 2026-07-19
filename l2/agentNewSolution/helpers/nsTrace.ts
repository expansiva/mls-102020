/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsTrace.ts" enhancement="_blank"/>

import { nsTraceFileInfo, readJsonArtifact, writeJsonArtifact } from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { normalizeNsId } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';

export interface NsTraceRecord {
  savedAt: string;
  stepId: string;
  agentName: string;
  attempt: number;
  payload: unknown;
  error?: string;
  promptChars?: number; // P3: size of the human+system prompt actually sent to the LLM
}

export async function writeNsTrace(
  moduleName: string,
  stepId: string,
  agentName: string,
  attempt: number,
  payload: unknown,
  error?: string,
  promptChars?: number,
): Promise<string> {
  const shortName = `${normalizeNsId(stepId)}-${normalizeNsId(agentName)}-${String(attempt).padStart(2, '0')}`;
  const record: NsTraceRecord = {
    savedAt: new Date().toISOString(),
    stepId,
    agentName,
    attempt,
    payload,
    ...(error ? { error } : {}),
    ...(typeof promptChars === 'number' ? { promptChars } : {}),
  };
  return writeJsonArtifact(nsTraceFileInfo(moduleName, shortName), record);
}

// P5 (newSolution_14): the last recorded error of a step's trace (latest attempt first) — so the
// e5-finalize "items missing" failure can inline WHY each item is missing (its gate errors live in the
// per-item trace, not in finalize). Returns '' when no trace/error is found.
export async function readLastNsTraceError(moduleName: string, stepId: string, agentName: string): Promise<string> {
  for (const attempt of [2, 1]) {
    const shortName = `${normalizeNsId(stepId)}-${normalizeNsId(agentName)}-${String(attempt).padStart(2, '0')}`;
    const record = await readJsonArtifact<NsTraceRecord>(nsTraceFileInfo(moduleName, shortName), false);
    if (record?.error) return record.error.slice(0, 400);
  }
  return '';
}

// P3 (newSolution_14): observability of the human-prompt size (chars) — the evidence for calibrating
// the e6 two-phase split (P7) and spotting prompts that risk an LLM-call failure on large modules.
// Read from the step's interaction.input (the system+human messages actually sent to the model).
export function nsPromptChars(step: mls.msg.AIAgentStep | undefined): number {
  const input = step?.interaction?.input;
  if (!Array.isArray(input)) return 0;
  return input.reduce((sum, message) => {
    const content = (message as { content?: unknown })?.content;
    return sum + (typeof content === 'string' ? content.length : 0);
  }, 0);
}

