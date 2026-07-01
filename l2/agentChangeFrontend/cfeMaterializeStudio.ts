/// <mls fileReference="_102020_/l2/agentChangeFrontend/cfeMaterializeStudio.ts" enhancement="_blank"/>

import { parseDefs, type PipelineItem } from '/_102020_/l2/agentChangeFrontend/cfeMaterializeCore.js';
import { createStorFile } from '/_102027_/l2/libStor.js';

declare const mls: any;

export interface GenStepArgs {
  planId: string;
  defPath: string;
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
    if (file.updatedAt) return Date.parse(file.updatedAt);
    return file.status === 'new' || file.status === 'changed' ? Number.MAX_SAFE_INTEGER : null;
  } catch {
    return null;
  }
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

export async function saveGeneratedTs(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  content: string,
  extension = '.ts',
): Promise<boolean> {
  try {
    const fileInfo = { project, level, folder, shortName, extension };
    const key = mls.stor.getKeyToFile(fileInfo);
    let file = (mls.stor.files as Record<string, any>)[key];
    if (!file) {
      file = await createStorFile({ ...fileInfo, source: content }, false, false, false);
    } else {
      const model = await file.getOrCreateModel?.();
      if (model) model.model.setValue(content);
    }
    await mls.stor.localStor.setContent(file, { contentType: 'string', content });
    await compileGeneratedTs(project, level, folder, shortName, extension);
    return true;
  } catch (error) {
    console.warn('[cfeMaterializeStudio] saveGeneratedTs failed', error);
    return false;
  }
}

export async function saveGeneratedTsByMlsPath(mlsPath: string, content: string): Promise<boolean> {
  const parsed = parseMlsPath(mlsPath);
  if (!parsed || !isGeneratedTsExtension(parsed.extension)) return false;
  return saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, content, parsed.extension);
}

export async function compileAndGetErrors(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension = '.ts',
): Promise<string[]> {
  try {
    const editorKey = mls.editor.getKeyModel(project, shortName, folder, level);
    let modelBase = mls.editor.models[editorKey];
    if (!modelBase) modelBase = await mls.editor.addModels(project, shortName, folder, level);
    const modelTs = modelBase?.[getModelSlot(extension)];
    if (!modelTs?.model) return [];
    if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
    await mls.l2.typescript.compile(modelTs);
    const errors: unknown[] = modelTs.compilerResults?.errors ?? [];
    return errors.map(error => typeof error === 'string' ? error : JSON.stringify(error));
  } catch (error) {
    console.warn('[cfeMaterializeStudio] compileAndGetErrors failed', error);
    return [];
  }
}

export async function compileMlsPathAndGetErrors(mlsPath: string): Promise<string[]> {
  const parsed = parseMlsPath(mlsPath);
  if (!parsed || !isGeneratedTsExtension(parsed.extension)) return [];
  return compileAndGetErrors(parsed.project, parsed.level, parsed.folder, parsed.shortName, parsed.extension);
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
    const editorKey = mls.editor.getKeyModel(project, shortName, folder, level);
    let modelBase = mls.editor.models[editorKey];
    if (!modelBase) modelBase = await mls.editor.addModels(project, shortName, folder, level);
    const modelTs = modelBase?.[getModelSlot(extension)];
    if (!modelTs) return;
    if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
    await mls.l2.typescript.compileAndPostProcess(modelTs, extension === '.ts', true);
    mls.editor.forceModelUpdate(modelTs.model);
  } catch (error) {
    console.warn('[cfeMaterializeStudio] compileGeneratedTs failed', error);
  }
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
