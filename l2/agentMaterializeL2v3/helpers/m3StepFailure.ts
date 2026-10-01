/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3StepFailure.ts" enhancement="_blank"/>

import { readJson } from '/_102035_/l2/solution/fs.js';
import { M3_AGENT_FOLDER, m3TraceFileInfo, recordM3Degradation, saveM3RunSummary, type M3RunSummary } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.js';

/** What every failing step does BEFORE it answers `failed`: leave a degradation and a summary (L4, L6). */
export interface M3FailurePort {
  recordDegradation(kind: string, reason: string): Promise<void>;
  saveSummary(summary: M3RunSummary): Promise<string | null>;
  readRun(): Promise<{ startedAt?: string; command?: string } | null>;
  now(): Date;
}

export function productionFailurePort(project: number, moduleName: string, runDir: string): M3FailurePort {
  return {
    recordDegradation: (kind, reason) => recordM3Degradation(project, moduleName, runDir, kind, reason),
    saveSummary: summary => saveM3RunSummary(project, summary),
    readRun: async () => { try { return await readJson<{ startedAt?: string; command?: string }>(m3TraceFileInfo(project, moduleName, runDir, 'run')); } catch { return null; } },
    now: () => new Date(),
  };
}

/** first `M3_X:` code in the message -> `M3_X`; none -> `M3_STEP_FAILED`. */
export function m3ErrorCode(message: string): string {
  return /(?:^|\s)(M3_[A-Z0-9_]+):/u.exec(message)?.[1] ?? 'M3_STEP_FAILED';
}

export function m3ErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Records the degradation, saves a `failed` summary and returns the reason. Never throws. */
export async function failM3Step(
  port: M3FailurePort,
  args: { module: string; runDir: string; stepId: string },
  reason: string,
): Promise<string> {
  const kind = m3ErrorCode(reason);
  const at = port.now().toISOString();
  let run: { startedAt?: string; command?: string } | null = null;
  try { run = await port.readRun(); } catch { /* best-effort: summary keeps null/'' */ }
  try { await port.recordDegradation(kind, reason); } catch { /* best-effort: the summary below still names the failure */ }
  try {
    await port.saveSummary({
      moduleName: args.module, agent: M3_AGENT_FOLDER, runDir: args.runDir, command: run?.command ?? '', startedAt: run?.startedAt ?? null, finishedAt: at,
      verdict: 'failed', reason, counts: { failedStep: args.stepId }, degradations: [{ at, kind, reason }],
    });
  } catch { /* nothing else to do */ }
  return reason;
}
