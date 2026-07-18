/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsTrace.ts" enhancement="_blank"/>

import { nsTraceFileInfo, writeJsonArtifact } from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { normalizeNsId } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';

export interface NsTraceRecord {
  savedAt: string;
  stepId: string;
  agentName: string;
  attempt: number;
  payload: unknown;
  error?: string;
}

export async function writeNsTrace(
  moduleName: string,
  stepId: string,
  agentName: string,
  attempt: number,
  payload: unknown,
  error?: string,
): Promise<string> {
  const shortName = `${normalizeNsId(stepId)}-${normalizeNsId(agentName)}-${String(attempt).padStart(2, '0')}`;
  const record: NsTraceRecord = {
    savedAt: new Date().toISOString(),
    stepId,
    agentName,
    attempt,
    payload,
    ...(error ? { error } : {}),
  };
  return writeJsonArtifact(nsTraceFileInfo(moduleName, shortName), record);
}

