/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeStudio.ts" enhancement="_blank"/>

import { parseDefs, checkSharedDtsProvenance, contractTsPathOf, insertGeneratedTsLineBreaks, sharedDtsArtifactRef, stampSharedDtsArtifact, stripAllWhitespace, type PipelineItem } from '/_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeCore.js';
import { sessionScope } from '/_102020_/l2/agentMaterializeL2/helpers/cfeSessionScope.js';
import {
  flattenTscErrorsAsRefs, mlsBaseFromDiskPath, traceProjectTscResult,
  type CompileModuleTrace,
} from '/_102020_/l2/agentMaterializeL2/helpers/cfeProjectTsc.js';
import { createStorFile } from '/_102027_/l2/libStor.js';
import {
  compileStudioFile, enterStudioCompile, getStudioModel as getGeneratedModel, leaveStudioCompile,
  releaseBorrowedModels, studioCompileAvailable,
} from '/_102035_/l2/solution/studioCompile.js';

// p4_20: the model registry, the borrow scope and the Studio compile live in the neutral lib, shared with
// the NS5 (`mls-102035/l2/solution/studioCompile.ts`). The names the M2 steps import stay here.
export { borrowedModelScopeSize, releaseBorrowedModelScope } from '/_102035_/l2/solution/studioCompile.js';

declare const mls: any;

export interface MaterializeStudioMessage {
  level: 'warn' | 'error';
  message: string;
}

export interface GenStepArgs {
  planId: string;
  defPath: string;
  /**
   * WHICH pipeline item of that defs this slot generates.
   *
   * One defs used to mean one artifact, so the slot could assume `pipeline[0]`. A SPLIT page breaks that:
   * the same defs carries N organisms plus the page (paginaDividida.md §5), and without this the slot
   * would always build the first one. Optional so a task queued before this change still resolves to
   * `pipeline[0]`, which is what it meant.
   */
  itemId?: string;
  attempt?: number;
  repairHint?: string;
}

export interface ParsedMlsPath {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

export function parsePipelineFromContent(content: string): PipelineItem[] | null {
  const parsed = parseDefs(content);
  return parsed.item ? [parsed.item] : null;
}

const studioMessages: MaterializeStudioMessage[] = [];

export function consumeMaterializeStudioMessages(): MaterializeStudioMessage[] {
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

export function getFileModified(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): number | null {
  try {
    const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension });
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return null;
    if (file.status === 'new' || file.status === 'changed') return Number.MAX_SAFE_INTEGER;
    if (file.updatedAt) return Date.parse(file.updatedAt);
    return null;
  } catch {
    return null;
  }
}

export function getFileModifiedByMlsPath(mlsPath: string): number | null {
  const parsed = parseMlsPath(mlsPath);
  if (!parsed) return null;
  return getFileModified(parsed.project, parsed.level, parsed.folder, parsed.shortName, parsed.extension);
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

export async function loadModuleByBuild(path: string): Promise<any> {
  try {
    const source = await getContentByMlsPath(path);
    if (!source) return null;
    const esbuild = await getEsbuild();
    const result = await esbuild.transform(source, { loader: 'ts', format: 'esm', target: 'esnext' });
    const blobUrl = URL.createObjectURL(new Blob([result.code], { type: 'text/javascript' }));
    try {
      return await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    return null;
  }
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
  const model = monaco.editor.createModel('', 'typescript', monaco.Uri.parse('inmemory://collab-cfe-formatter/formatGeneratedTs.ts'));
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
 * the pure line-break pass (cfeMaterializeCore, shared with the CLI so both surfaces emit the same
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
 * (Re)persist the shared compiled .d.ts artifact whenever it was not derived from the shared .ts on disk.
 *
 * The materialize-time persist (agentCfeMaterializeGen) runs only right after a SUCCESSFUL
 * materialization — a shared that only compiled after a repair round never got a second chance and
 * its pages silently fell back to the raw .ts (run02 102047: taskCatalogue, the largest shared,
 * had no artifact at all). Called from the phase verify whenever a shared item verifies clean, so
 * the artifact converges by the module gate. Best-effort: never blocks a run.
 *
 * The freshness test is the artifact's STAMP, not mtime. `getFileModified` answers MAX_SAFE_INTEGER for
 * any file with status new/changed, so from the moment both the artifact and the shared are dirty — every
 * round after the first — the old comparison was MAX >= MAX and this returned early forever. In run01 of
 * 102047 that froze the artifact at the round-1 surface while the repair rounds went on rewriting the
 * shared, and the pages were generated against the frozen one.
 */
export async function persistSharedDtsArtifactIfStale(sharedTsPath: string): Promise<void> {
  const artifactPath = sharedDtsArtifactRef(sharedTsPath);
  if (!artifactPath) return;
  const source = await getContentByMlsPath(sharedTsPath);
  if (!source) return;
  const artifact = await getContentByMlsPath(artifactPath);
  if (artifact && checkSharedDtsProvenance(artifact, source).dts) return;
  const dts = await getCompiledDtsByMlsPath(sharedTsPath);
  if (dts) await saveArtifactTextByMlsPath(artifactPath, stampSharedDtsArtifact(dts, source));
}

/**
 * Capability, never host: the Studio compile path needs `mls.l2.typescript.compile` and the
 * `mls.editor` surface `getGeneratedModel` actually calls. Missing either is `unavailable`, not a
 * clean compile.
 */
export function monacoCompileAvailable(): boolean {
  return studioCompileAvailable();
}

// Call it as a METHOD, never detached. `diskPath` is host-only (it does not exist in mls.d.ts nor
// in the cfe) and on the CLI host it is a CLASS method that reads a private field.
// `const fn = mls.stor.diskPath; fn(info)` throws `Cannot read properties of undefined (reading
// '#mlsBase')`, the catch swallows it, and the project-tsc gate reports `no-diskPath`.
export function storDiskPath(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string | null {
  const stor = mls.stor as unknown as { diskPath?: (file: typeof info) => string };
  if (typeof stor.diskPath !== 'function') return null;
  try { return stor.diskPath(info); } catch { return null; }
}

type ProjectTscSpawn = (cmd: string, args: string[], opts: Record<string, unknown>) => {
  stdout?: { on: (ev: string, fn: (chunk: unknown) => void) => void };
  stderr?: { on: (ev: string, fn: (chunk: unknown) => void) => void };
  on: (ev: string, fn: (arg?: unknown) => void) => void;
};

export async function runProjectFrontendTsc(cwd: string, spawnFn?: ProjectTscSpawn): Promise<string | null> {
  try {
    const spawn = spawnFn ?? await loadChildProcessSpawn();
    if (typeof spawn !== 'function') return null;
    return await new Promise(resolve => {
      const child = spawn('npx', ['tsc', '-p', 'tsconfig.frontend.json', '--noEmit', '--pretty', 'false'], { cwd });
      let out = '';
      child.stdout?.on('data', chunk => { out += String(chunk); });
      child.stderr?.on('data', chunk => { out += String(chunk); });
      child.on('error', () => resolve(null));
      child.on('close', code => resolve(code === 0 || /\(\d+,\d+\): error TS\d+:/u.test(out) ? out : null));
    });
  } catch {
    return null;
  }
}

async function loadChildProcessSpawn(): Promise<ProjectTscSpawn | null> {
  const childProcessSpec = 'node:child_process';
  const loaded = await import(childProcessSpec) as { spawn?: ProjectTscSpawn };
  return typeof loaded.spawn === 'function' ? loaded.spawn : null;
}

export async function compileModuleViaProjectTsc(
  project: number,
  moduleName: string,
  files: Array<{ folder: string; shortName: string }>,
  runTsc?: (cwd: string) => Promise<string | null>,
): Promise<{ errors: string[]; trace: CompileModuleTrace }> {
  const sample = files[0];
  if (!sample) {
    return {
      errors: [],
      trace: { path: 'unavailable', reason: 'no-files', rawDiagnostics: 0, afterFilter: 0, files: 0 },
    };
  }
  const abs = storDiskPath({ project, level: 2, folder: sample.folder, shortName: sample.shortName, extension: '.ts' });
  if (!abs) {
    return {
      errors: [],
      trace: { path: 'unavailable', reason: 'no-diskPath', rawDiagnostics: 0, afterFilter: 0, files: files.length },
    };
  }
  const cwd = mlsBaseFromDiskPath(abs);
  if (!cwd) {
    return {
      errors: [],
      trace: { path: 'unavailable', reason: 'no-diskPath', rawDiagnostics: 0, afterFilter: 0, files: files.length },
    };
  }
  const output = runTsc ? await runTsc(cwd) : await runProjectFrontendTsc(cwd);
  const { grouped, trace } = traceProjectTscResult(output, moduleName, project, files.length, 'no-child-process');
  if (!grouped) return { errors: [], trace };
  return { errors: flattenTscErrorsAsRefs(project, grouped), trace };
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
  try {
    const compiled = await compileStudioFile({ project, level, folder, shortName, extension });
    return compiled ? compiled.errors : [];
  } catch (error) {
    recordStudioMessage('error', 'compileAndGetErrors failed', error);
    return [`compileAndGetErrors failed: ${formatUnknownError(error)}`];
  }
}

export async function compileMlsPathAndGetErrors(mlsPath: string): Promise<string[] | null> {
  const parsed = parseMlsPath(mlsPath);
  if (!parsed || !isGeneratedTsExtension(parsed.extension)) return [];
  return compileAndGetErrors(parsed.project, parsed.level, parsed.folder, parsed.shortName, parsed.extension);
}

// Compiled .d.ts (prodDTS) of a runtime .ts model, compiling on demand when the model has not been
// compiled yet in this session. Used to give the page-materialization LLM the EXACT public surface
// of its base class (typed msg keys, @property names, handlers) instead of only the raw source.
export async function getCompiledDtsByMlsPath(mlsPath: string): Promise<string | null> {
  try {
    const parsed = parseMlsPath(mlsPath);
    if (!parsed || parsed.extension !== '.ts') return null;
    const modelTs = await getGeneratedModel(parsed.project, parsed.level, parsed.folder, parsed.shortName, parsed.extension);
    if (!modelTs?.model) return null;
    if (!modelTs.compilerResults?.prodDTS) {
      if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
      await mls.l2.typescript.compile(modelTs);
    }
    const dts = modelTs.compilerResults?.prodDTS;
    return typeof dts === 'string' && dts.trim() ? dts : null;
  } catch (error) {
    recordStudioMessage('error', 'getCompiledDtsByMlsPath failed', error);
    return null;
  }
}

/**
 * Compile a file's dependency `.d.ts` BEFORE it is compiled, so the per-file Studio compile resolves
 * cross-file types the way `tsc -p` does. An unloaded import resolves to `any` and the check silently
 * PASSES (102051 run19: shiftWorkspace passed the verify and failed the real tsc).
 *
 * The preloaded models are deliberately left alive: they exist so the files compiled after them resolve,
 * and they go back at the phase boundary (`releaseBorrowedModelScope`). Best-effort — a dependency that
 * fails to compile just leaves its import unresolved, never throws.
 */
export async function preloadTypecheckDeps(deps: Array<string | null>): Promise<void> {
  for (const dep of deps) {
    if (!dep) continue;
    try { await getCompiledDtsByMlsPath(dep); } catch { /* best-effort */ }
  }
}

/**
 * `…/web/desktop/page11/x.ts` -> `…/web/shared/x.defs.ts`, the defs that names the page's contract.
 *
 * A split page's organism is `…/page11/x_O1.ts` (`organismShortName`), and its shared defs is the PAGE's:
 * the organism is a render function over the same base class and the same contract, so it needs the same
 * two models loaded to be typechecked at all.
 */
export function sharedDefsPathForPageOutput(outputPath: string): string | null {
  const match = outputPath.match(/^(.*\/web)\/(?:desktop|mobile)\/page\d+\/([^/]+?)(?:_O\d+)?\.ts$/u);
  return match ? `${match[1]}/shared/${match[2]}.defs.ts` : null;
}

/**
 * The dependency preload for ONE item, by type — a page needs its shared base class runtime `.ts` and the
 * contract that shared imports; a shared needs its own contract.
 *
 * It lives here, next to the compile, because every place that compiles a generated file must load the
 * same deps or it asks a different question: the verify preloaded and the repair hint did not, so a
 * cross-file TS2339 was visible to the verify and INVISIBLE to the hint — the model was handed a repair
 * without the error it had to fix, returned an almost identical file, and the round burned. Three rounds
 * went that way on one `project.clientName` in the buildFlowFsm run.
 */
export async function preloadItemTypecheckDeps(
  type: string,
  outputPath: string,
  ownDefsContent: string | null,
): Promise<void> {
  // A split page's organism resolves against the SAME shared base class and contract as its page, and
  // `computeRepairHint` and the worker compile run for organisms too — leaving it out would keep exactly
  // the blindness this function exists to remove, one file type further down.
  if (type === 'l2_page' || type === 'l2_page_organism') {
    const sharedDefsPath = sharedDefsPathForPageOutput(outputPath);
    const sharedDefs = sharedDefsPath ? await getContentByMlsPath(sharedDefsPath) : null;
    await preloadTypecheckDeps([
      sharedDefsPath ? sharedDefsPath.replace(/\.defs\.ts$/u, '.ts') : null,
      contractTsPathOf(sharedDefs),
    ]);
    return;
  }
  if (type === 'l2_shared') await preloadTypecheckDeps([contractTsPathOf(ownDefsContent)]);
}

export function extractToolCallArgs<T>(raw: unknown, toolName: string): T | null {
  const value = parseMaybeJson(raw);
  if (!isRecord(value)) return null;

  if (value.toolName === toolName) {
    const args = parseMaybeJson(value.arguments);
    return isRecord(args) ? args as T : null;
  }

  if (value.type === 'flexible' && value.result !== undefined) {
    const result = parseMaybeJson(value.result);
    if (isRecord(result) && result.toolName === toolName) {
      const args = parseMaybeJson(result.arguments);
      return isRecord(args) ? args as T : null;
    }
  }

  if (Array.isArray(value.tool_calls)) {
    const call = value.tool_calls.find(item => isRecord(item) && isRecord(item.function) && item.function.name === toolName);
    if (isRecord(call) && isRecord(call.function)) {
      const args = parseMaybeJson(call.function.arguments);
      return isRecord(args) ? args as T : null;
    }
  }

  return null;
}

async function getEsbuild(): Promise<any> {
  const w = sessionScope() as any;
  const url = 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.25.4/esm/browser.js';
  if (!w.__cfeEsbuildInstance) w.__cfeEsbuildInstance = import(url);
  const esbuild = await w.__cfeEsbuildInstance;
  if (!w.__cfeEsbuildReady) {
    w.__cfeEsbuildReady = esbuild.initialize({
      wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.25.4/esbuild.wasm',
    });
  }
  await w.__cfeEsbuildReady;
  return esbuild;
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
  const line = `[cfeMaterializeStudio] ${detail}`;
  if (level === 'error') console.error(line);
  else console.warn(line);
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}

function isGeneratedTsExtension(extension: string): boolean {
  return extension === '.ts' || extension === '.test.ts';
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
