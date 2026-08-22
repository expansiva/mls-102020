/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeRunDossier.ts" enhancement="_blank"/>

import { saveArtifactTextByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';

/**
 * One file per CF run: provenance, pages/owners, repair rounds, gate result, leftover errors,
 * and the step tree (title/status/last trace). There was no CF equivalent of `cb-run-*.json`.
 */
export async function saveCfRunReport(moduleName: string, report: Record<string, unknown>): Promise<string | null> {
  const project = mls.actualProject || 0;
  const module = moduleName && moduleName !== 'unknown' ? moduleName : '';
  if (!project || !module) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shortName = `cf-run-${stamp}`;
  const mlsPath = `_${project}_/l4/${module}/trace/${shortName}.json`;
  const source = `${JSON.stringify({ savedAt: new Date().toISOString(), ...report }, null, 2)}\n`;
  const ok = await saveArtifactTextByMlsPath(mlsPath, source);
  return ok ? `l4/${module}/trace/${shortName}.json` : null;
}
