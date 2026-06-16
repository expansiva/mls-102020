/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import type {
  PipelineItem,
  ProjectJson,
  ScannedDefsFile,
  L1LayerFolder,
  ParsedMlsPath,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

// ─── Path helpers ─────────────────────────────────────────────────────────────

/** _102043_/l1/cafeFlow/layer_4_entities/pedidoEntity.defs.ts */
export function toMlsPath(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): string {
  const folderPart = folder ? `${folder}/` : '';
  return `_${project}_/l${level}/${folderPart}${shortName}${extension}`;
}

// ─── project.json ─────────────────────────────────────────────────────────────

export async function readProjectJson(): Promise<ProjectJson | null> {
  try {
    const project = mls.actualProject || 0;
    const fileInfo = { project, level: 5, folder: '', shortName: 'project', extension: '.json' };
    const key = mls.stor.getKeyToFile(fileInfo);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return null;
    const raw = await file.getContent();
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || !Array.isArray(parsed.modules)) return null;
    return parsed as ProjectJson;
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] readProjectJson failed', err);
    return null;
  }
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

const L1_LAYERS: L1LayerFolder[] = ['layer_1_external', 'layer_4_entities', 'layer_3_usecases', 'layer_2_controllers'];

export function scanL1DefsFiles(project: number, moduleName: string): ScannedDefsFile[] {
  const result: ScannedDefsFile[] = [];
  try {
    for (const layer of L1_LAYERS) {
      const folder = `${moduleName}/${layer}`;
      for (const f of Object.values(mls.stor.files as Record<string, any>)) {
        if (f.project !== project) continue;
        if (f.level !== 1) continue;
        if (f.folder !== folder) continue;
        if (f.extension !== '.defs.ts') continue;
        if (f.status === 'deleted') continue;
        result.push({
          project,
          level: 1,
          folder,
          shortName: f.shortName,
          moduleName,
          mlsPath: toMlsPath(project, 1, folder, f.shortName, '.defs.ts'),
        });
      }
    }
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] scanL1DefsFiles failed', err);
  }
  return result;
}

export async function scanL1DefsWithPipeline(
  project: number,
  moduleName: string,
): Promise<Array<{ folder: string; shortName: string; pipeline: PipelineItem[] }>> {
  const result: Array<{ folder: string; shortName: string; pipeline: PipelineItem[] }> = [];
  try {
    for (const layer of L1_LAYERS) {
      const folder = `${moduleName}/${layer}`;
      for (const f of Object.values(mls.stor.files as Record<string, any>)) {
        if (f.project !== project) continue;
        if (f.level !== 1) continue;
        if (f.folder !== folder) continue;
        if (f.extension !== '.defs.ts') continue;
        if (f.status === 'deleted') continue;
        const content = String(await f.getContent());
        const pipeline = parsePipelineFromContent(content);
        if (!pipeline || pipeline.length === 0) continue;
        result.push({ folder, shortName: f.shortName as string, pipeline });
      }
    }
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] scanL1DefsWithPipeline failed', err);
  }
  return result;
}

export function scanL2PageDefsFiles(project: number, moduleName: string): ScannedDefsFile[] {
  const result: ScannedDefsFile[] = [];
  try {
    const SKIP = new Set(['layer_2_contracts', 'project']);
    for (const f of Object.values(mls.stor.files as Record<string, any>)) {
      if (f.project !== project) continue;
      if (f.level !== 2) continue;
      if (f.folder !== moduleName) continue;
      if (f.extension !== '.defs.ts') continue;
      if (f.status === 'deleted') continue;
      if (SKIP.has(f.shortName as string)) continue;
      result.push({
        project,
        level: 2,
        folder: moduleName,
        shortName: f.shortName,
        moduleName,
        mlsPath: toMlsPath(project, 2, moduleName, f.shortName, '.defs.ts'),
      });
    }
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] scanL2PageDefsFiles failed', err);
  }
  return result;
}

// ─── Dep layer listing ────────────────────────────────────────────────────────

// Returns the .defs.ts MLS paths for the dependency layer of a given L1 layer.
// Used to show the LLM what's available so it can decide which files to reference.
export function listDepLayerPaths(
  project: number,
  moduleName: string,
  forLayer: L1LayerFolder,
): string[] {
  const depLayer: Partial<Record<L1LayerFolder, L1LayerFolder>> = {
    layer_4_entities: 'layer_1_external',
    layer_3_usecases: 'layer_4_entities',
  };
  const dep = depLayer[forLayer];
  if (!dep) return [];
  const folder = `${moduleName}/${dep}`;
  const result: string[] = [];
  try {
    for (const f of Object.values(mls.stor.files as Record<string, any>)) {
      if (f.project !== project) continue;
      if (f.level !== 1) continue;
      if (f.folder !== folder) continue;
      if (f.extension !== '.defs.ts') continue;
      if (f.status === 'deleted') continue;
      result.push(toMlsPath(project, 1, folder, f.shortName, '.defs.ts'));
    }
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] listDepLayerPaths failed', err);
  }
  return result;
}

// ─── File content reader ──────────────────────────────────────────────────────

export async function getFileContent(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): Promise<string | null> {
  try {
    const fileInfo = { project, level, folder, shortName, extension };
    const key = mls.stor.getKeyToFile(fileInfo);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return null;
    return String(await file.getContent());
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] getFileContent failed', err);
    return null;
  }
}

// ─── Append pipeline to existing .defs.ts ────────────────────────────────────

export async function appendPipelineToFile(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  items: PipelineItem[],
): Promise<boolean> {
  try {
    const fileInfo = { project, level, folder, shortName, extension: '.defs.ts' };
    const key = mls.stor.getKeyToFile(fileInfo);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return false;

    const existing = String(await file.getContent());
    if (existing.includes('export const pipeline')) return true; // already done

    const pipelineSrc = `\nexport const pipeline = ${JSON.stringify(items, null, 2)} as const;\n`;
    const newContent = existing.trimEnd() + '\n' + pipelineSrc;

    await mls.stor.localStor.setContent(file, { contentType: 'string', content: newContent });

    // Read-back verify
    const readBack = String(await file.getContent());
    return readBack.includes('export const pipeline');
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] appendPipelineToFile failed', err);
    return false;
  }
}

// ─── Create new .defs.ts file ─────────────────────────────────────────────────

export async function createDefsFile(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  definitionJson: unknown,
  items: PipelineItem[],
): Promise<boolean> {
  try {
    const fileRef = toMlsPath(project, level, folder, shortName, '.defs.ts');
    const defStr = JSON.stringify(definitionJson, null, 2);
    const source = [
      `/// <mls fileReference="${fileRef}" enhancement="_blank"/>`,
      ``,
      `export const definition = \``,
      `## Definition`,
      `\`\`\`JSON`,
      defStr,
      `\`\`\``,
      `\`;`,
      ``,
      `export const pipeline = ${JSON.stringify(items, null, 2)} as const;`,
      ``,
    ].join('\n');

    const fileInfo = { project, level, folder, shortName, extension: '.defs.ts' };
    const key = mls.stor.getKeyToFile(fileInfo);
    let storFile = (mls.stor.files as Record<string, any>)[key];

    if (!storFile) {
      storFile = await createStorFile({ ...fileInfo, source }, false, false, false);
    }
    await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });

    // Read-back verify
    const readBack = String(await storFile.getContent());
    return readBack.includes('export const pipeline');
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] createDefsFile failed', err);
    return false;
  }
}

// ─── esbuild helpers (shared, used by agentMaterializeL2 and agentMaterializeGen) ──

export async function getEsbuild(): Promise<any> {
  const w = window as any;
  const url = 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.25.4/esm/browser.js';
  if (!w.__esbuildInstance) w.__esbuildInstance = import(url);
  const esbuild = await w.__esbuildInstance;
  if (!w.__esbuildReady) {
    w.__esbuildReady = esbuild.initialize({
      wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.25.4/esbuild.wasm',
    });
  }
  await w.__esbuildReady;
  return esbuild;
}

export async function loadModuleByBuild(path: string): Promise<any> {
  try {
    const info = mls.stor.convertFileReferenceToFile(path);
    if (!info) return null;
    const key = mls.stor.getKeyToFile(info);
    const sf = (mls.stor.files as Record<string, mls.stor.IFileInfo>)[key];
    if (!sf) return null;
    const src = await sf.getContent() as string;
    const esbuild = await getEsbuild();
    const result = await esbuild.transform(src, { loader: 'ts', format: 'esm', target: 'esnext' });
    const blob = new Blob([result.code], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      return await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    return null;
  }
}

// ─── Fase 2: Generation helpers ──────────────────────────────────────────────

/** Extract the `pipeline` array from a .defs.ts content string. */
export function parsePipelineFromContent(content: string): PipelineItem[] | null {
  try {
    const match = content.match(/export\s+const\s+pipeline\s*=\s*([\s\S]*?)\s+as\s+const\s*;/);
    if (!match) return null;
    return JSON.parse(match[1]) as PipelineItem[];
  } catch {
    return null;
  }
}

/** Extract the `definition` template literal value from a .defs.ts content string. */
export function parseDefinitionFromContent(content: string): string {
  const match = content.match(/export\s+const\s+definition\s*=\s*`([\s\S]*?)`;/);
  return match ? match[1].trim() : content;
}

/** Returns the updatedAt timestamp (ms) of a file, or null if unavailable. */
export function getFileModified(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): number | null {
  try {
    const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension });
    const file = (mls.stor.files as Record<string, mls.stor.IFileInfo>)[key];
    if (!file || file.status === 'deleted') return null;
    return file.updatedAt ? Date.parse(file.updatedAt) : null;
  } catch {
    return null;
  }
}

/** Read any file by its full MLS path string. */
export async function getContentByMlsPath(mlsPath: string): Promise<string | null> {
  try {
    const info = mls.stor.convertFileReferenceToFile(mlsPath);
    const key = mls.stor.getKeyToFile(info);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return null;
    return String(await file.getContent());
  } catch {
    return null;
  }
}

/** Parse a MLS path like `_102043_/l2/cafeFlow/web/contracts/page.defs.ts`. */
export function parseMlsPath(mlsPath: string): ParsedMlsPath | null {
  const match = mlsPath.match(/^_(\d+)_\/l(\d+)\/(.+)$/);
  if (!match) return null;
  const project = parseInt(match[1], 10);
  const level   = parseInt(match[2], 10);
  const rest    = match[3];
  const lastSlash = rest.lastIndexOf('/');
  const folder    = lastSlash >= 0 ? rest.slice(0, lastSlash) : '';
  const filename  = lastSlash >= 0 ? rest.slice(lastSlash + 1) : rest;
  let shortName: string, extension: string;
  if (filename.endsWith('.defs.ts')) {
    shortName = filename.slice(0, -'.defs.ts'.length);
    extension = '.defs.ts';
  } else {
    const dot = filename.lastIndexOf('.');
    shortName = dot >= 0 ? filename.slice(0, dot) : filename;
    extension = dot >= 0 ? filename.slice(dot) : '';
  }
  return { project, level, folder, shortName, extension };
}

/**
 * Scan all l2 .defs.ts in sub-folders of a module that contain a pipeline export.
 * Excludes top-level source files (folder === moduleName).
 */
export async function scanL2DefsWithPipeline(
  project: number,
  moduleName: string,
): Promise<Array<{ project: number; level: number; folder: string; shortName: string; pipeline: PipelineItem[] }>> {
  const result: Array<{ project: number; level: number; folder: string; shortName: string; pipeline: PipelineItem[] }> = [];
  try {
    const prefix = moduleName + '/';
    for (const f of Object.values(mls.stor.files as Record<string, any>)) {
      if (f.project !== project) continue;
      if (f.level !== 2) continue;
      if (f.extension !== '.defs.ts') continue;
      if (f.status === 'deleted') continue;
      const folder = f.folder as string;
      if (folder === moduleName) continue;
      if (!folder.startsWith(prefix)) continue;
      const content = String(await f.getContent());
      const pipeline = parsePipelineFromContent(content);
      if (!pipeline || pipeline.length === 0) continue;
      result.push({ project, level: 2, folder, shortName: f.shortName as string, pipeline });
    }
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] scanL2DefsWithPipeline failed', err);
  }
  return result;
}

/** Save (create or overwrite) a generated .ts file. */
export async function saveGeneratedTs(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  content: string,
): Promise<boolean> {
  try {
    const fileInfo = { project, level, folder, shortName, extension: '.ts' };
    const key = mls.stor.getKeyToFile(fileInfo);
    let file = (mls.stor.files as Record<string, any>)[key];
    if (!file) {
      file = await createStorFile({ ...fileInfo, source: content }, false, false, false);
    }
    await mls.stor.localStor.setContent(file, { contentType: 'string', content });
    return true;
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] saveGeneratedTs failed', err);
    return false;
  }
}

// ─── Tool call payload extractor ─────────────────────────────────────────────

export function extractToolCallArgs<T>(raw: unknown, toolName: string): T | null {
  const v = parseMaybeJson(raw);
  if (!isRecord(v)) return null;

  if (v.toolName === toolName) {
    const args = parseMaybeJson(v.arguments);
    return isRecord(args) ? (args as unknown as T) : null;
  }

  if (v.type === 'flexible' && v.result !== undefined) {
    const result = parseMaybeJson(v.result);
    if (isRecord(result) && result.toolName === toolName) {
      const args = parseMaybeJson(result.arguments);
      return isRecord(args) ? (args as unknown as T) : null;
    }
  }

  if (Array.isArray(v.tool_calls)) {
    const call = (v.tool_calls as unknown[]).find(
      (item) => isRecord(item) && isRecord((item as any).function) && (item as any).function.name === toolName,
    );
    if (isRecord(call)) {
      const fn = (call as any).function;
      const args = parseMaybeJson(fn.arguments);
      return isRecord(args) ? (args as unknown as T) : null;
    }
  }

  return null;
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
