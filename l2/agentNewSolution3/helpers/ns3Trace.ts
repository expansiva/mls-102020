/// <mls fileReference="_102020_/l2/agentNewSolution3/helpers/ns3Trace.ts" enhancement="_blank"/>

import { ns3TraceFileInfo, writeJsonArtifact } from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';
import { normalizeNs3Id } from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';

export interface Ns3TraceRecord {
  savedAt: string;
  stepId: string;
  agentName: string;
  attempt: number;
  payload: unknown;
  error?: string;
}

export async function writeNs3Trace(
  moduleName: string,
  stepId: string,
  agentName: string,
  attempt: number,
  payload: unknown,
  error?: string,
): Promise<string> {
  const shortName = `${normalizeNs3Id(stepId)}-${normalizeNs3Id(agentName)}-${String(attempt).padStart(2, '0')}`;
  const record: Ns3TraceRecord = {
    savedAt: new Date().toISOString(),
    stepId,
    agentName,
    attempt,
    payload,
    ...(error ? { error } : {}),
  };
  return writeJsonArtifact(ns3TraceFileInfo(moduleName, shortName), record);
}

