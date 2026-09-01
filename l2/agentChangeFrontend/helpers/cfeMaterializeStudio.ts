/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.ts" enhancement="_blank"/>

import { parseDefs, checkSharedDtsProvenance, contractTsPathOf, insertGeneratedTsLineBreaks, sharedDtsArtifactRef, stampSharedDtsArtifact, stripAllWhitespace, type PipelineItem } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import { createStorFile } from '/_102027_/l2/libStor.js';

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

interface BorrowedModel { project: number; shortName: string; folder: string; level: number; }

let activeCompiles = 0;
const pendingRelease: BorrowedModel[] = [];

/**
 * Models the VERIFY/PRELOAD path created, keyed by the editor key so borrowing the same file twice is
 * queued once.
 *
 * `saveGeneratedTs` releases the model it created in its own `finally`, but `compileAndGetErrors` and
 * `getCompiledDtsByMlsPath` also reach `getOrCreateModel`, and those creations were never released: a
 * run of a 34-workspace module verifies 34 shared + 102 pages + 34 tests and preloads a contract per
 * item, so Monaco reported "potential listener LEAK detected, having 200 listeners already" and the
 * console stopped being usable for diagnosis.
 *
 * Released at a PHASE boundary rather than per item, on purpose: the 102029 runtime contracts a page
 * preloads for its context are the same for every page of the phase, and disposing them per item would
 * trade the leak for one full recompile each. The queue still honours `activeCompiles` — a model
 * disposed mid-compile of a file that imports it is a FALSE error that burns repair budget.
 */
const borrowedByScope = new Map<string, BorrowedModel>();

/**
 * Release the Monaco models THIS step created, once no compile is in flight.
 *
 * Without any release the registry only grows — every materialized file leaves a model behind and Monaco
 * hits "potential listener LEAK detected, having 200 listeners already", after which the console is
 * useless for diagnosis. A module generates dozens of files (a page11 per workspace + contracts + tests).
 *
 * Safe because nothing in this agent needs a model to outlive its compile: `mls.editor.models` is read in
 * exactly two places, both inside getGeneratedModel and both "return it if it already exists" guards. The
 * materialization step is an independent process (it also runs from the CLI, `pnpm materializeL2`), so it
 * can never assume a warm registry — whoever needs a model loads it. `deleteModels` only disposes the
 * model and drops the registry entry; it never touches `mls.stor`, so the generated file stays intact.
 *
 * Deferred until `activeCompiles === 0` because the phase fans out in `parallel_dynamic`: file A can be
 * an import of B, and disposing A mid-compile of B yields a FALSE compile error that burns repair budget.
 */
function releaseBorrowedModels(borrowed: BorrowedModel[]): void {
  pendingRelease.push(...borrowed);
  // Whoever releases a borrow owns it: keep the scope from queuing the same model a second time.
  for (const model of borrowed) {
    try { borrowedByScope.delete(mls.editor.getKeyModel(model.project, model.shortName, model.folder, model.level)); } catch { /* best effort */ }
  }
  if (activeCompiles > 0) return;
  for (const model of pendingRelease.splice(0, pendingRelease.length)) {
    // Signature is (project, shortName, folder, releaseMonacoModel, level) — the boolean comes BEFORE
    // the level. `true` disposes the underlying monaco model, which is what holds the listeners.
    try { mls.editor.deleteModels(model.project, model.shortName, model.folder, true, model.level); } catch { /* best effort */ }
  }
}

/**
 * Queue every model the verify/preload path borrowed since the last call. Returns how many were queued,
 * for the caller's trace — the actual dispose still waits for `activeCompiles === 0`.
 */
export function releaseBorrowedModelScope(): number {
  const borrowed = [...borrowedByScope.values()];
  if (borrowed.length) releaseBorrowedModels(borrowed);
  borrowedByScope.clear();
  return borrowed.length;
}

/** How many borrowed models are waiting for the next scope release (telemetry/tests). */
export function borrowedModelScopeSize(): number {
  return borrowedByScope.size;
}

/**
 * ONE hidden, persistent model+editor reused by every `formatGeneratedTsInStudio` call of the
 * session (cf_format_monaco_dispose, 28/ago).
 *
 * The first version created a temporary model+editor per file and disposed both. `createModel`
 * fires the TS worker's async validation, which answers AFTER the dispose and rejects without a
 * catch — run01/102047 flooded the console with one
 * `Uncaught (in promise) Error: Could not find source file: 'inmemory://model/N'` per generated
 * file (same family as the Monaco listener leak `releaseBorrowedModels` documents above). With a
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
  activeCompiles++;
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
    activeCompiles--;
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

export async function compileAndGetErrors(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension = '.ts',
): Promise<string[]> {
  try {
    const modelTs = await getGeneratedModel(project, level, folder, shortName, extension);
    if (!modelTs?.model) return [];
    if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
    await mls.l2.typescript.compile(modelTs);
    const errors: unknown[] = modelTs.compilerResults?.errors ?? [];
    return errors.map(formatCompilerDiagnostic);
  } catch (error) {
    recordStudioMessage('error', 'compileAndGetErrors failed', error);
    return [`compileAndGetErrors failed: ${formatUnknownError(error)}`];
  }
}

export async function compileMlsPathAndGetErrors(mlsPath: string): Promise<string[]> {
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
  const w = window as any;
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

function formatCompilerDiagnostic(error: unknown): string {
  if (typeof error === 'string') return error;
  if (!isRecord(error)) return formatUnknownError(error);

  const code = typeof error.code === 'number' ? `TS${error.code}` : '';
  const file = isRecord(error.file) && typeof error.file.fileName === 'string' ? error.file.fileName : '';
  const position = diagnosticPosition(error);
  const message = flattenMessageText(error.messageText ?? error.message ?? error);
  return [file ? `${file}${position}` : '', code, message].filter(Boolean).join(' - ');
}

function diagnosticPosition(error: Record<string, any>): string {
  const file = error.file;
  if (!isRecord(file) || typeof error.start !== 'number' || typeof file.getLineAndCharacterOfPosition !== 'function') return '';
  try {
    const pos = file.getLineAndCharacterOfPosition(error.start);
    if (!pos || typeof pos.line !== 'number' || typeof pos.character !== 'number') return '';
    return `:${pos.line + 1}:${pos.character + 1}`;
  } catch {
    return '';
  }
}

function flattenMessageText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    const head = flattenMessageText(value.messageText ?? '');
    const next = Array.isArray(value.next) ? value.next.map(flattenMessageText).filter(Boolean) : [];
    return [head, ...next].filter(Boolean).join(' ');
  }
  return formatUnknownError(value);
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}

async function getGeneratedModel(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): Promise<any | null> {
  const editorKey = mls.editor.getKeyModel(project, shortName, folder, level);
  const slot = getModelSlot(extension);
  let modelBase = mls.editor.models[editorKey];
  if (modelBase?.[slot]?.model) {
    // Resident model (open tab, leftover from a previous compile): Monaco compiles against MEMORY,
    // so a hook that only wrote stor would leave this buffer stale. Sync from stor here — the
    // compile owns its inputs (same idea as CB addModels). Hooks must not touch mls.editor.
    const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension });
    const file = (mls.stor.files as Record<string, any>)[key];
    if (file && file.status !== 'deleted') await syncModelFromStor(modelBase[slot], file);
    return modelBase[slot];
  }
  // OWNERSHIP, decided BEFORE getOrCreateModel can create anything — the same rule saveGeneratedTs
  // applies: no registry entry at all means the Studio does not have this file open, so a model created
  // below is ours to release. An entry that already exists belongs to a tab and is never disposed.
  const owned = !modelBase;

  const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension });
  const file = (mls.stor.files as Record<string, any>)[key];
  if (!file || file.status === 'deleted') return null;

  const model = await file.getOrCreateModel?.();
  modelBase = mls.editor.models[editorKey];
  if (owned && modelBase) borrowedByScope.set(editorKey, { project, shortName, folder, level });
  return modelBase?.[slot] ?? model ?? null;
}

async function syncModelFromStor(entry: any, file: { getContent?: () => Promise<unknown> }): Promise<void> {
  const textModel = entry?.model && typeof entry.model.getValue === 'function' ? entry.model
    : typeof entry?.getValue === 'function' ? entry
    : null;
  if (!textModel?.getValue || !textModel.setValue) return;
  try {
    const content = await file.getContent?.();
    if (typeof content === 'string' && textModel.getValue() !== content) textModel.setValue(content);
  } catch { /* best effort: compile still runs against whatever is already in the model */ }
}

function isGeneratedTsExtension(extension: string): boolean {
  return extension === '.ts' || extension === '.test.ts';
}

function getModelSlot(extension: string): 'ts' | 'test' {
  return extension === '.test.ts' ? 'test' : 'ts';
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
