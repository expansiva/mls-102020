/// <mls fileReference="_102020_/l2/aura/plugins/helpers/configIo.ts" enhancement="_blank"/>

// Reading and writing `l5/config.json` of a client project — the RUNTIME document (`clientShell`),
// the one the shell boots from.
//
// It lives apart from the pure cores (headerPluginCore, menuConfigCore) because it touches the stor,
// and apart from the widgets because several of them need it: the l5 service (to build the Header
// knob), the header list, the header editor and the menu editor. Two rules are easy to get wrong and
// are fixed here:
//
//   * the file is read from `mls.stor.files` DIRECTLY, so "the project is not loaded" can be told
//     apart from "the project has no header" — both used to render as an empty screen;
//   * it is written through `localStor.setContent`, NEVER through a model: `getOrCreateModel` only
//     exists for editor source files and throws on a .json.

import type { FileRef, ValidationEnv } from '/_102020_/l2/aura/helpers/appConfigSections.js';

/** The file reference, for messages. */
export const configRef = (projectId: number): string => `_${projectId}_/l5/config.json`;

/** The stor file of `l5/config.json`, or undefined when the project is not loaded. */
export function configFile(projectId: number): mls.stor.IFileInfo | undefined {
  const key = mls.stor.getKeyToFile({
    project: projectId, level: 5, folder: '', shortName: 'config', extension: '.json',
  } as mls.stor.IFileInfoBase);
  return mls.stor.files[key];
}

/**
 * Loads the project into the stor when it is not the active one.
 *
 * Every read here goes through `mls.stor.files`, and a project that was never opened has nothing
 * there — the reads would come back empty with no explanation.
 */
export async function ensureProjectLoaded(projectId: number): Promise<void> {
  if (!projectId || projectId === mls.actualProject) return;
  await mls.stor.server.loadProjectInfoIfNeeded(projectId, false);
}

/**
 * Parsed `l5/config.json`.
 *
 * @throws When the file is not in the stor, is empty, or is not valid JSON — with the reason, which
 * is the whole point of not returning undefined for all three.
 */
export async function readConfig(projectId: number): Promise<unknown> {
  const storFile = configFile(projectId);
  if (!storFile) throw new Error(`${configRef(projectId)} is not loaded in mls.stor`);
  const raw = String((await storFile.getContent()) ?? '');
  if (!raw.trim()) throw new Error(`${configRef(projectId)} is empty`);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${configRef(projectId)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Same read, but an unreadable config answers undefined instead of throwing (for a knob probe). */
export async function tryReadConfig(projectId: number): Promise<unknown | undefined> {
  try {
    return await readConfig(projectId);
  } catch {
    return undefined;
  }
}

/** Writes `l5/config.json` back through localStor (never through a model — see the file header). */
export async function writeConfig(projectId: number, config: unknown): Promise<void> {
  const storFile = configFile(projectId);
  if (!storFile) throw new Error(`${configRef(projectId)} is not loaded in mls.stor`);
  if (storFile.status !== 'renamed' && storFile.status !== 'new') storFile.status = 'changed';
  storFile.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(storFile, {
    contentType: 'string',
    content: `${JSON.stringify(config, null, 2)}\n`,
  });
}

/**
 * The stor lookups the config validation needs (appConfigSections.validateConfig): does a file or
 * folder the config points at exist, and which page files the client has. Shared by the App Config
 * and the modules dashboard, so both report the same missing files and orphan pages.
 */
export function storValidationEnv(projectId: number): ValidationEnv {
  const files = Object.values(mls.stor.files) as mls.stor.IFileInfo[];
  const loaded = new Set(files.map(file => file.project));
  const folders = new Set(files.map(file => `${file.project}/${file.level}/${file.folder}`));
  const refExists = (ref: FileRef): boolean | undefined => {
    if (!loaded.has(ref.project)) return undefined;
    if (ref.kind === 'dir') {
      const prefix = `${ref.project}/${ref.level}/${ref.folder}`;
      return [...folders].some(folder => folder === prefix || folder.startsWith(`${prefix}/`));
    }
    const key = mls.stor.getKeyToFile({
      project: ref.project, level: ref.level, folder: ref.folder, shortName: ref.shortName, extension: ref.extension,
    } as mls.stor.IFileInfoBase);
    return Boolean(mls.stor.files[key]);
  };
  const pageFiles = files
    .filter(file => file.project === projectId && file.level === 2 && file.extension === '.ts' && /\/web\/[^/]+\/page\d+$/.test(file.folder))
    .map(file => `l2/${file.folder}/${file.shortName}.ts`);
  return { refExists, pageFiles };
}
