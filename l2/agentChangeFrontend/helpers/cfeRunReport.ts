/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeRunReport.ts" enhancement="_blank"/>

/**
 * Pure CF run-dossier shape. Kept off `cfeRunDossier.ts` so tests do not load Studio/mls.
 */
export interface CfRunReport {
  moduleName: string;
  attempt: number;
  final: boolean;
  repairRounds: number;
  pagesDone: unknown;
  ownersDone: unknown;
  skippedPages: unknown;
  gate: Record<string, unknown>;
  agentBuild: unknown;
  steps: unknown;
  summary: string;
}

export function buildCfRunReport(report: CfRunReport): Record<string, unknown> {
  return {
    moduleName: report.moduleName,
    attempt: report.attempt,
    final: report.final,
    repairRounds: report.repairRounds,
    pagesDone: report.pagesDone,
    ownersDone: report.ownersDone,
    skippedPages: report.skippedPages,
    gate: report.gate,
    agentBuild: report.agentBuild,
    steps: report.steps,
    summary: report.summary,
  };
}

export function cfRunLatestMlsPath(project: number, moduleName: string): string {
  return `_${project}_/l4/${moduleName}/pipeline/trace/cf-run.json`;
}

export function cfRunSnapshotMlsPath(project: number, moduleName: string, stamp: string): string {
  return `_${project}_/l4/${moduleName}/pipeline/trace/cf-run-${stamp}.json`;
}
