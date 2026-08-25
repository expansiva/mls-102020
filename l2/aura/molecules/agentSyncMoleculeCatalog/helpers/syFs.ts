/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.ts" enhancement="_blank"/>

// I/O for agentSyncMoleculeCatalog: l4 paths of a run, the project's level-1 skill.ts location, and
// the two stor scans this agent needs (which group folders the project has, and which molecule files
// one group has). The ONLY module here that touches mls.stor / mls.actualProject — everything
// downstream (syDiscover, syExtract, syRenderDefs, syRenderSkill) is pure, same split as
// agentChooseMolecules' chCatalog.ts.

import { NmFileInfo, nmDestProject, nmDefsFile, nmGroupDefsFile, nmGroupIndexFile, nmTsFile } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { skills as skillListSource } from '/_102020_/l2/aura/molecules/skills/index.js';
import { SySkillListEntry } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDiscover.js';

export function sySkillList(): SySkillListEntry[] {
  return skillListSource;
}

// ---- l4 work artifacts of one run ----

export function syWorkFile(runKey: string, shortName: string): NmFileInfo {
  return { project: nmDestProject(), level: 4, folder: `agentSyncMoleculeCatalog/${runKey}`, shortName, extension: '.json' };
}

export const syInputFileInfo = (runKey: string): NmFileInfo => syWorkFile(runKey, 'input');
export const syReportFileInfo = (runKey: string): NmFileInfo => syWorkFile(runKey, 'report');
export function syGroupArtifactFileInfo(runKey: string, groupFolder: string): NmFileInfo {
  return syWorkFile(runKey, `s1-${groupFolder}`);
}
export const syProjectArtifactFileInfo = (runKey: string): NmFileInfo => syWorkFile(runKey, 's2-project');

// ---- the source artifacts this agent writes ----

export { nmGroupDefsFile, nmGroupIndexFile, nmDefsFile, nmTsFile };

export function syProjectSkillFile(): NmFileInfo {
  return { project: nmDestProject(), level: 2, folder: 'molecules', shortName: 'skill', extension: '.ts' };
}

// ---- discovery: which group folders the project actually has ----

/**
 * Every DISTINCT `molecules/<groupFolder>` the destination project has a file in, sorted alphabetically
 * — a directory is not a first-class stor concept, so "the group exists" is read off any file that
 * lives directly under it (a molecule .ts, its .defs.ts, index.ts, …), the same gesture
 * `getMoleculeFiles` in the legacy agentUpdateIndexGroupPage uses, one level up.
 */
export function syScanProjectGroupFolders(): string[] {
  const project = nmDestProject();
  const folders = new Set<string>();
  for (const key of Object.keys(mls.stor.files)) {
    const file = mls.stor.files[key];
    if (!file || file.project !== project || file.status === 'deleted') continue;
    const match = /^molecules\/(group[a-z0-9]+)$/i.exec(file.folder || '');
    if (match) folders.add(match[1].toLowerCase());
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}

/** Every molecule short name (no 'index', no .defs/.html/.less) one group folder has, sorted. */
export function syScanGroupMoleculeShortNames(groupFolder: string): string[] {
  const project = nmDestProject();
  const target = `molecules/${groupFolder}`;
  const names = new Set<string>();
  for (const key of Object.keys(mls.stor.files)) {
    const file = mls.stor.files[key];
    if (!file || file.project !== project || file.status === 'deleted') continue;
    if (file.folder !== target || file.extension !== '.ts' || file.shortName === 'index') continue;
    names.add(file.shortName);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
