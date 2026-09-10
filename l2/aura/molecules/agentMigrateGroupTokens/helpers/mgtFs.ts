/// <mls fileReference="_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtFs.ts" enhancement="_blank"/>

// stor + l4 mechanics for agentMigrateGroupTokens. Reuses IM2's own target resolution and
// artifact readers instead of restating them (flow.json.principles #1) — the same rule IM2 itself
// follows for agentNewMolecule2's plumbing, and agentSyncMoleculeCatalog follows for its stor scan.

import { NmFileInfo, nmDestProject } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { syScanGroupMoleculeShortNames } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';
import { readArtifacts, readInheritance, resolveTarget, sourceOf } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { MGT_AGENT_NAME } from '/_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtTypes.js';

export function mgtWorkFile(runKey: string, shortName: string): NmFileInfo {
  return { project: nmDestProject(), level: 4, folder: `${MGT_AGENT_NAME}/${runKey}`, shortName, extension: '.json' };
}
export const mgtProgressFileInfo = (runKey: string): NmFileInfo => mgtWorkFile(runKey, 'progress');

/** Every `ml-*` of the group, alphabetical — the same stor scan agentSyncMoleculeCatalog uses. */
export function mgtListMolecules(groupFolder: string): string[] {
  return syScanGroupMoleculeShortNames(groupFolder);
}

/**
 * The one check that keeps a molecule OUT of the queue before it is ever planted — the same
 * `defs_missing` rule `steps/i1-locate/gate.ts:127` enforces, reused rather than restated. A shell
 * is exempt: its contract lives in its parent, which i1-locate itself would also accept.
 *
 * Returns '' when the molecule is fine to queue, or a readable reason when it is not.
 */
export async function mgtDefsMissingReason(groupFolder: string, shortName: string): Promise<string> {
  const target = resolveTarget(`${groupFolder}/${shortName}`, [groupFolder]);
  const artifacts = await readArtifacts(target);
  const inheritance = await readInheritance(sourceOf(artifacts, 'ts'));
  if (sourceOf(artifacts, 'defs').trim() || inheritance.isShell) return '';
  return 'defs_missing: no readable .defs.ts and not a shell — same check as steps/i1-locate/gate.ts';
}
