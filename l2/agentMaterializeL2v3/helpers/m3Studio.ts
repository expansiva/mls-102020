/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3Studio.ts" enhancement="_blank"/>

import { headerEnhancementForOutputPath } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3MlsHeader.js';
import { declaredEnhancementPackages } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3MlsImports.js';
import { insertGeneratedTsLineBreaks, stripAllWhitespace } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3TsLineBreaks.js';
import { createStorFile } from '/_102027_/l2/libStor.js';
import {
  enterStudioCompile, formatCompilerDiagnostic, formatUnknownError, getStudioModel as getGeneratedModel, leaveStudioCompile,
  releaseBorrowedModels, studioCompileAvailable,
} from '/_102035_/l2/solution/studioCompile.js';

// p4_20: the model registry, the borrow scope and the Studio compile live in the neutral lib, shared with
// the NS5 (`mls-102035/l2/solution/studioCompile.ts`). The names the steps import stay here.
export { borrowedModelScopeSize, releaseBorrowedModelScope } from '/_102035_/l2/solution/studioCompile.js';

declare const mls: any;

export interface M3StudioMessage {
  level: 'warn' | 'error';
  message: string;
}

export interface ParsedMlsPath {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

const studioMessages: M3StudioMessage[] = [];

export function consumeM3StudioMessages(): M3StudioMessage[] {
  const ret = [...studioMessages];
  studioMessages.length = 0;
  return ret;
}

export function parseMlsPath(mlsPath: string): ParsedMlsPath | null {
  const match = mlsPath.match(/^_(\d+)_\/l(\d+)\/(.+)$/);
  if (!match) return null;

  const project = Number(match[1]);
  const level = Number(match[2]);
  const rest = match[3];
  const lastSlash = rest.lastIndexOf('/');
  const folder = lastSlash >= 0 ? rest.slice(0, lastSlash) : '';
  const filename = lastSlash >= 0 ? rest.slice(lastSlash + 1) : rest;

  if (filename.endsWith('.defs.ts')) {
    return { project, level, folder, shortName: filename.slice(0, -'.defs.ts'.length), extension: '.defs.ts' };
  }
  if (filename.endsWith('.test.ts')) {
    return { project, level, folder, shortName: filename.slice(0, -'.test.ts'.length), extension: '.test.ts' };
  }
  if (filename.endsWith('.d.ts')) {
    return { project, level, folder, shortName: filename.slice(0, -'.d.ts'.length), extension: '.d.ts' };
  }

  const dot = filename.lastIndexOf('.');
  return {
    project,
    level,
    folder,
    shortName: dot >= 0 ? filename.slice(0, dot) : filename,
    extension: dot >= 0 ? filename.slice(dot) : '',
  };
}

export async function getContentByMlsPath(mlsPath: string): Promise<string | null> {
  try {
    const info = mls.stor.convertFileReferenceToFile(mlsPath);
    if (!info) return null;
    const key = mls.stor.getKeyToFile(info);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return null;
    return String(await file.getContent());
  } catch {
    return null;
  }
}

/** Current indexed source refs and package map declared by the output's effective enhancement. */
export async function mlsImportContextForOutput(outputPath: string): Promise<{ knownFiles: string[]; declaredPackages: string[] }> {
  const knownFiles: string[] = [];
  try {
    for (const file of Object.values(mls.stor.files as Record<string, any>)) {
      if (!file || file.status === 'deleted') continue;
      const project = Number(file.project);
      const level = Number(file.level);
      const shortName = typeof file.shortName === 'string' ? file.shortName : '';
      const extension = typeof file.extension === 'string' ? file.extension : '';
      const folder = typeof file.folder === 'string' ? file.folder.replace(/^\/+|\/+$/gu, '') : '';
      if (!Number.isSafeInteger(project) || project <= 0 || !Number.isSafeInteger(level) || level <= 0 || !shortName || !/^\.(?:defs\.)?(?:ts|tsx|mts|cts|js)$/u.test(extension)) continue;
      knownFiles.push(`_${project}_/l${level}/${folder ? `${folder}/` : ''}${shortName}${extension}`);
    }
  } catch (error) {
    recordStudioMessage('error', 'mlsImportContextForOutput index read failed', error);
  }

  const enhancement = headerEnhancementForOutputPath(outputPath);
  if (!enhancement || enhancement === '_blank') return { knownFiles, declaredPackages: [] };
  const source = await getContentByMlsPath(`${enhancement}.ts`);
  if (!source) return { knownFiles, declaredPackages: [] };
  return { knownFiles, declaredPackages: declaredEnhancementPackages(source) };
}

/**
 * ONE hidden, persistent model+editor reused by every `formatGeneratedTsInStudio` call of the
 * session (cf_format_monaco_dispose, 28/ago).
 *
 * The first version created a temporary model+editor per file and disposed both. `createModel`
 * fires the TS worker's async validation, which answers AFTER the dispose and rejects without a
 * catch — run01/102047 flooded the console with one
 * `Uncaught (in promise) Error: Could not find source file: 'inmemory://model/N'` per generated
 * file (same family as the Monaco listener leak `releaseBorrowedModels` documents in `studioCompile.ts`). With a
 * singleton there is no create/dispose per file, so there is no orphan worker response at all.
 *
 * The URI is stable and self-describing so anything the worker ever logs about this model is
 * attributable at a glance. Lazy: nothing is created until the first format of the session. If
 * creation fails halfway, the half is disposed and the NEXT call retries from scratch.
 */
let formatterSingleton: { model: any; editor: any } | null = null;

function getFormatterSingleton(): { model: any; editor: any } {
  if (formatterSingleton) return formatterSingleton;
  const model = monaco.editor.createModel('', 'typescript', monaco.Uri.parse('inmemory://collab-m3-formatter/formatGeneratedTs.ts'));
  try {
    model.updateOptions({ tabSize: 2, indentSize: 2, insertSpaces: true });
    const editor = monaco.editor.create(document.createElement('div'), { model });
    formatterSingleton = { model, editor };
    return formatterSingleton;
  } catch (error) {
    // Only on the creation-failure path: the model never reached the singleton, keeping it would
    // be a leak. One orphan validation of an EMPTY model is the worst this can cost.
    model.dispose();
    throw error;
  }
}

/**
 * Calls are chained because the singleton is shared mutable state and the materialize phase fans
 * out in `parallel_dynamic` (see `releaseBorrowedModels`): two interleaved calls would format each
 * other's `setValue`. Failures never break the chain — each turn resolves regardless.
 */
let formatterTurn: Promise<void> = Promise.resolve();

/**
 * Format a generated .ts before it is saved (cf_format_codigo_gerado, 27/ago).
 *
 * run02/102047: taskCatalogue.ts was born as 13KB in 35 lines while its siblings came out formatted —
 * per-call LLM variation, so the model's output cannot be the only source of formatting. Two stages:
 * the pure line-break pass (m3TsLineBreaks, shared with the CLI so both surfaces emit the same
 * shape), then Monaco's own `editor.action.formatDocument` for indentation, on the persistent
 * singleton above (cf_format_monaco_dispose: per-call model+editor dispose left orphan TS-worker
 * validations rejecting all over the console). tabSize 2 mirrors the CLI's ts-languageService
 * settings (same formatter engine). The singleton is emptied (`setValue('')`) after every call so
 * the last file's content is not retained.
 *
 * Conservative by contract: the result is accepted only when it is whitespace-identical to the
 * input (the i18n markers and every token survive byte-for-byte modulo whitespace); on any failure
 * — Monaco missing, worker error, guard mismatch — the ORIGINAL code is returned, never an
 * exception, and the singleton stays usable for the next call.
 */
export async function formatGeneratedTsInStudio(code: string): Promise<string> {
  const turn = formatterTurn.then(async () => {
    const broken = insertGeneratedTsLineBreaks(code);
    const { model, editor } = getFormatterSingleton();
    try {
      model.setValue(broken);
      await editor.getAction('editor.action.formatDocument')?.run();
      const formatted = model.getValue();
      return stripAllWhitespace(formatted) === stripAllWhitespace(code) ? formatted : code;
    } finally {
      model.setValue('');
    }
  });
  formatterTurn = turn.then(() => undefined, () => undefined);
  return turn.catch(error => {
    recordStudioMessage('warn', 'formatGeneratedTsInStudio failed (kept unformatted code)', error);
    return code;
  });
}

export async function saveGeneratedTs(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  content: string,
  extension = '.ts',
): Promise<boolean> {
  // OWNERSHIP, decided BEFORE anything below can create a model: createStorFile(needCreateModel=true) and
  // getGeneratedModel's getOrCreateModel both create one, so checking afterwards would always say "not
  // ours" and nothing would ever be released. A model already in the registry belongs to the Studio (the
  // file is open in a tab) and must never be disposed.
  const ownsModel = !mls.editor.models[mls.editor.getKeyModel(project, shortName, folder, level)];
  enterStudioCompile();
  try {
    const fileInfo = { project, level, folder, shortName, extension };
    const key = mls.stor.getKeyToFile(fileInfo);
    let file = (mls.stor.files as Record<string, any>)[key];
    if (!file) {
      file = await createStorFile({ ...fileInfo, source: content }, true, false, false);
    }
    if (file.status !== 'renamed' && file.status !== 'new') file.status = 'changed';
    file.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(file, { contentType: 'string', content });
    const model = await getGeneratedModel(project, level, folder, shortName, extension);
    if (model?.model && model.model.getValue?.() !== content) model.model.setValue(content);
    await compileGeneratedTs(project, level, folder, shortName, extension);
    return true;
  } catch (error) {
    recordStudioMessage('error', 'saveGeneratedTs failed', error);
    return false;
  } finally {
    // The content is durable in stor; the model was only a working copy for the compile. Queue it even on
    // failure — a thrown compile leaks exactly the same listeners.
    leaveStudioCompile();
    if (ownsModel) releaseBorrowedModels([{ project, shortName, folder, level }]);
  }
}

export async function saveGeneratedTsByMlsPath(mlsPath: string, content: string): Promise<boolean> {
  const parsed = parseMlsPath(mlsPath);
  if (!parsed || !isGeneratedTsExtension(parsed.extension)) return false;
  return saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, content, parsed.extension);
}

// Plain text artifact writer (no editor model, no compile) — used to persist the shared compiled
// .d.ts to web/shared/<page>Dts.txt so the CLI runtime can read the same context from disk.
export async function saveArtifactTextByMlsPath(mlsPath: string, content: string): Promise<boolean> {
  try {
    const parsed = parseMlsPath(mlsPath);
    if (!parsed) return false;
    const fileInfo = { project: parsed.project, level: parsed.level, folder: parsed.folder, shortName: parsed.shortName, extension: parsed.extension };
    const key = mls.stor.getKeyToFile(fileInfo);
    let file = (mls.stor.files as Record<string, any>)[key];
    if (!file) {
      // needCreateModel=FALSE: this writer never compiles and nothing reads a model for a trace artifact,
      // so creating one only leaked listeners (it contradicted this function's own contract above).
      file = await createStorFile({ ...fileInfo, source: content }, false, false, false);
    }
    if (file.status !== 'renamed' && file.status !== 'new') file.status = 'changed';
    file.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(file, { contentType: 'string', content });
    return true;
  } catch (error) {
    recordStudioMessage('error', 'saveArtifactTextByMlsPath failed', error);
    return false;
  }
}

/**
 * Capability, never host: the Studio compile path needs `mls.l2.typescript.compile` and the
 * `mls.editor` surface `getGeneratedModel` actually calls. Missing either is `unavailable`, not a
 * clean compile.
 */
export function monacoCompileAvailable(): boolean {
  return studioCompileAvailable();
}

/** `null` = no compile capability. `[]` = compiled and clean. */
export async function compileAndGetErrors(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension = '.ts',
): Promise<string[] | null> {
  if (!monacoCompileAvailable()) return null;
  enterStudioCompile();
  try {
    const file = { project, level, folder, shortName, extension };
    const modelTs = await getGeneratedModel(project, level, folder, shortName, extension);
    if (!modelTs?.model) return null;
    const compiler = mls.l2.typescript.compile;
    if (typeof compiler !== 'function') return null;
    if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
    const result: unknown = await compiler(modelTs);
    if (typeof result !== 'boolean') return null;
    const after = await getGeneratedModel(project, level, folder, shortName, extension);
    const diagnostics = after?.compilerResults?.errors;
    if (!after?.model || !Array.isArray(diagnostics)) return null;
    const errors = diagnostics.map(formatCompilerDiagnostic);
    if (!result && errors.length === 0) {
      recordStudioMessage('error', 'Studio compiler failed without diagnostics', file);
      return null;
    }
    return errors;
  } catch (error) {
    recordStudioMessage('error', 'compileAndGetErrors failed', error);
    return null;
  } finally {
    leaveStudioCompile();
  }
}

export async function compileMlsPathAndGetErrors(mlsPath: string): Promise<string[] | null> {
  const parsed = parseMlsPath(mlsPath);
  if (!parsed || !isGeneratedTsExtension(parsed.extension)) return null;
  return compileAndGetErrors(parsed.project, parsed.level, parsed.folder, parsed.shortName, parsed.extension);
}

async function compileGeneratedTs(project: number, level: number, folder: string, shortName: string, extension: string): Promise<void> {
  try {
    const modelTs = await getGeneratedModel(project, level, folder, shortName, extension);
    if (!modelTs) return;
    if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
    await mls.l2.typescript.compileAndPostProcess(modelTs, extension === '.ts', true);
    mls.editor.forceModelUpdate(modelTs.model);
  } catch (error) {
    recordStudioMessage('warn', 'compileGeneratedTs failed', error);
  }
}

function recordStudioMessage(level: 'warn' | 'error', message: string, error?: unknown): void {
  const detail = error === undefined ? message : `${message}: ${formatUnknownError(error)}`;
  studioMessages.push({ level, message: detail });
  const line = `[m3Studio] ${detail}`;
  if (level === 'error') console.error(line);
  else console.warn(line);
}

function isGeneratedTsExtension(extension: string): boolean {
  return extension === '.ts' || extension === '.test.ts';
}
