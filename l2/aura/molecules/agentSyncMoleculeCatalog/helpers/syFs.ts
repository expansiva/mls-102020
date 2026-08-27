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
export function syIndexTsArtifactFileInfo(runKey: string, groupFolder: string): NmFileInfo {
  return syWorkFile(runKey, `s3-${groupFolder}`);
}

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

/**
 * Puts an already-written, already-compiled module into the browser CACHE, and returns the path the
 * platform will serve it from ('' when it could not).
 *
 * ⚠️ WHY WRITING + COMPILING IS STILL NOT ENOUGH. The preview bundles a page by FETCHING each import.
 * A module that was written to the stor and compiled for diagnostics is still not served: the group
 * page failed with `Error get /_102053_/l2/molecules/groupenterboolean/index.defs.js` while the file sat
 * compiled in the editor (measured 2026-08-26, twice — once without the extension and once with it, so
 * the specifier was never the problem).
 *
 * The missing step is the CACHE. `mls.l2.typescript.compileAndPostProcess(model, runAfterCompile,
 * saveCache)` takes a third argument for exactly this, and every agent in this family passes it FALSE —
 * they only ever needed the compiler's diagnostics, because their files are molecule sources that the
 * runtime already knows how to reach. This agent is the first to write a module that another file
 * IMPORTS BY NAME, so it is the first that needs the module to be fetchable.
 *
 * The door is the `saveCache` argument of `compileAndPostProcess` — which is literally what the editor
 * service calls when a human saves a file, which is why editing the .defs by hand made the import start
 * working. (`mls.stor.cache.AddMfileIfNeed` is the lower-level primitive; the editor goes through
 * compileAndPostProcess, so this does too — copy the product's path, do not invent a parallel one.)
 *
 * Never throws: a cache miss must degrade to a reported warning, not to a failed run that wrote correct
 * files.
 */
export async function syPublishToCache(fileInfo: NmFileInfo): Promise<{ path: string; error: string }> {
  try {
    const storFile = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    if (!storFile) return { path: '', error: 'arquivo não está no stor' };
    const modelTs = await storFile.getOrCreateModel() as mls.editor.IModelTS;
    if (!modelTs) return { path: '', error: 'sem model para compilar' };
    // ⚠️ THIS EXACT CALL IS THE PRODUCT'S OWN SAVE PATH, not a guess. The editor service does
    // `compileAndPostProcess(mmodel, false, true)` (mls-100554/l2/serviceSource.ts) — and the third
    // argument, `saveCache`, is the whole difference. `nmFs.compileStorTs` passes it FALSE, as do all
    // ten agents in this family: they only ever wanted diagnostics, because their files are molecule
    // sources the runtime already reaches. A module that another file IMPORTS BY NAME has to be in the
    // cache, and only saveCache puts it there. Measured 2026-08-26: writing, then writing + compiling,
    // both left the group page failing with `Error get …/index.defs.js` — and editing the same file by
    // hand in the editor (which runs this call) made the import start working.
    const ok = await mls.l2.typescript.compileAndPostProcess(modelTs, false, true);
    return { path: ok ? 'cache' : '', error: ok ? '' : 'compileAndPostProcess(saveCache) devolveu false' };
  } catch (e) {
    return { path: '', error: (e as Error)?.message || String(e) };
  }
}
