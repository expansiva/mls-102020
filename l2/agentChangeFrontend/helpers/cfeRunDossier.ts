/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeRunDossier.ts" enhancement="_blank"/>

import { saveArtifactTextByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import { cfRunLatestMlsPath, cfRunSnapshotMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeRunReport.js';

/**
 * One dossier per CF run: provenance, pages/owners, repair rounds, gate result, leftover errors,
 * and the step tree (title/status/last trace). There was no CF equivalent of `cb-run-*.json`.
 *
 * Run fe4 wrote ONLY the failing first finalize (`cf-run-<stamp>.json`, repairRounds: 0). The
 * successful `finalize-create-r2` completed the task and left nothing — post-mortem reads the
 * single file and concludes the run failed. A timestamped snapshot is still written; the LAST
 * finalize always overwrites `cf-run.json` so the durable file is the final state.
 */
export async function saveCfRunReport(moduleName: string, report: Record<string, unknown>): Promise<string | null> {
  const project = mls.actualProject || 0;
  const module = moduleName && moduleName !== 'unknown' ? moduleName : '';
  if (!project || !module) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const source = `${JSON.stringify({ savedAt: new Date().toISOString(), ...report }, null, 2)}\n`;
  const latestPath = cfRunLatestMlsPath(project, module);
  const snapshotPath = cfRunSnapshotMlsPath(project, module, stamp);
  // Latest FIRST: if the snapshot create fails, post-mortem still has the final state.
  const latestOk = await saveArtifactTextByMlsPath(latestPath, source);
  const snapshotOk = await saveArtifactTextByMlsPath(snapshotPath, source);
  if (latestOk) return cfRunLatestMlsPath(project, module).replace(/^_\d+_\//, '');
  if (snapshotOk) return cfRunSnapshotMlsPath(project, module, stamp).replace(/^_\d+_\//, '');
  return null;
}
