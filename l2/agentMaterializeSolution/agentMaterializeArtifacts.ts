/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import type {
  PipelineItem,
  PipelineItemType,
  ProjectJson,
  ScannedDefFile,
  ScannedDefType,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

// ─── project.json ─────────────────────────────────────────────────────────────

export async function readProjectJson(): Promise<ProjectJson | null> {
  try {
    const project = mls.actualProject || 0;
    const fileInfo = { project, level: 5, folder: '', shortName: 'project', extension: '.json' };
    const key = mls.stor.getKeyToFile(fileInfo);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return null;
    const raw = await file.getContent();
    const parsed = parseMaybeJson(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.modules)) return null;
    return parsed as unknown as ProjectJson;
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] readProjectJson failed', err);
    return null;
  }
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

export function scanModuleDefsFiles(project: number, moduleName: string): ScannedDefFile[] {
  const result: ScannedDefFile[] = [];
  try {
    for (const f of Object.values(mls.stor.files as Record<string, any>)) {
      if (f.project !== project) continue;
      if (f.status === 'deleted') continue;
      if (f.extension !== '.defs.ts') continue;
      if (f.level !== 1 && f.level !== 2) continue;

      const folder: string = f.folder || '';
      // Accept only files directly inside the module folder or a known sub-layer
      if (folder !== moduleName && !folder.startsWith(`${moduleName}/`)) continue;

      const type = classifyDefFile(f.level as number, folder, f.shortName as string);
      if (!type) continue;

      result.push({
        project,
        level: f.level,
        folder,
        shortName: f.shortName,
        filePath: toFilePath(project, f.level, folder, f.shortName, '.defs.ts'),
        moduleName,
        type,
        layer: f.level === 1 ? 'l1' : 'l2',
      });
    }
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] scanModuleDefsFiles failed', err);
  }
  return result;
}

export function classifyDefFile(level: number, folder: string, shortName: string): ScannedDefType | null {
  if (level === 1) {
    if (folder.includes('/layer_1_external')) return 'layer_1_external';
    if (folder.includes('/layer_4_entities')) return 'layer_4_entities';
    if (folder.includes('/layer_3_usecases')) return 'layer_3_usecases';
    if (folder.includes('/layer_2_controllers')) return 'layer_2_controllers';
    return null;
  }
  if (level === 2) {
    // Only files directly in the module folder (not trace/, outputs/, plugins/)
    const parts = folder.split('/');
    if (parts.length !== 1) return null;
    if (shortName === 'layer_2_contracts') return 'l2_layer2contracts';
    // Ignore non-page defs (project.defs.ts etc.)
    if (shortName === 'project') return null;
    return 'l2_page';
  }
  return null;
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

export function toFilePath(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): string {
  const folderPart = folder ? `${folder}/` : '';
  return `${project}/l${level}/${folderPart}${shortName}${extension}`;
}

export function typeToFileInfo(
  moduleName: string,
  shortName: string,
  type: ScannedDefType,
): { level: number; folder: string } {
  switch (type) {
    case 'layer_1_external':    return { level: 1, folder: `${moduleName}/layer_1_external` };
    case 'layer_4_entities':    return { level: 1, folder: `${moduleName}/layer_4_entities` };
    case 'layer_3_usecases':    return { level: 1, folder: `${moduleName}/layer_3_usecases` };
    case 'layer_2_controllers': return { level: 1, folder: `${moduleName}/layer_2_controllers` };
    case 'l2_page':             return { level: 2, folder: moduleName };
    case 'l2_layer2contracts':  return { level: 2, folder: moduleName };
  }
}

export function computeOutputPath(
  project: number,
  moduleName: string,
  shortName: string,
  type: PipelineItemType,
): string {
  switch (type) {
    case 'layer_1_external':
      return toFilePath(project, 1, `${moduleName}/layer_1_external`, shortName, '.ts');
    case 'layer_4_entities':
      return toFilePath(project, 1, `${moduleName}/layer_4_entities`, shortName, '.ts');
    case 'layer_3_usecases':
      return toFilePath(project, 1, `${moduleName}/layer_3_usecases`, shortName, '.ts');
    case 'layer_2_controllers':
      return toFilePath(project, 1, `${moduleName}/layer_2_controllers`, shortName, '.ts');
    case 'l2_page':
      return toFilePath(project, 2, `${moduleName}/web/desktop/${shortName}`, shortName, '.ts');
    case 'l2_shared':
      return toFilePath(project, 2, `${moduleName}/web/desktop/${shortName}`, `${shortName}.shared`, '.ts');
    case 'l2_contract':
      return toFilePath(project, 2, `${moduleName}/web/desktop/${shortName}`, `${shortName}.contract`, '.ts');
    case 'l2_layer2contracts':
      return toFilePath(project, 2, `${moduleName}/web/contracts`, shortName, '.ts');
  }
}

export function makeItemId(shortName: string, type: PipelineItemType): string {
  return `${shortName}__${type}`;
}

// ─── Dependency layer lookup ──────────────────────────────────────────────────

// Returns files from the layer that `forType` depends on.
export function getAvailableDepFiles(
  project: number,
  moduleName: string,
  forType: ScannedDefType,
): ScannedDefFile[] {
  const depType = dependencyLayerOf(forType);
  if (!depType) return [];
  return scanModuleDefsFiles(project, moduleName).filter(f => f.type === depType);
}

function dependencyLayerOf(type: ScannedDefType): ScannedDefType | null {
  switch (type) {
    case 'layer_4_entities':    return 'layer_1_external';
    case 'layer_3_usecases':    return 'layer_4_entities';
    case 'layer_2_controllers': return 'layer_3_usecases';
    default: return null;
  }
}

// ─── Save pipeline ─────────────────────────────────────────────────────────────

export async function saveMaterializePipeline(
  moduleName: string,
  items: PipelineItem[],
): Promise<boolean> {
  try {
    const project = mls.actualProject || 0;
    const fileInfo = {
      project,
      level: 5,
      folder: moduleName,
      shortName: 'materialize-pipeline',
      extension: '.json',
    };
    const source = `${JSON.stringify(items, null, 2)}\n`;
    await saveStorContent(fileInfo, source, false);

    // Read-back verify (F-06 pattern)
    const key = mls.stor.getKeyToFile(fileInfo);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file) return false;
    const readBack = await file.getContent();
    return typeof readBack === 'string' && readBack.length === source.length;
  } catch (err) {
    console.warn('[agentMaterializeArtifacts] saveMaterializePipeline failed', err);
    return false;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

export async function saveStorContent(
  fileInfo: { project: number; level: number; folder: string; shortName: string; extension: string },
  source: string,
  needCreateModel: boolean,
): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = (mls.stor.files as Record<string, any>)[key];
  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source }, needCreateModel, needCreateModel, false);
  } else if (needCreateModel) {
    const model = await storFile.getOrCreateModel();
    if (model?.model) model.model.setValue(source);
  }
  await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });
}

// ─── Tool call payload extractor ─────────────────────────────────────────────

/**
 * Extracts typed arguments from a tool call payload.
 * The framework wraps tool call results in one of:
 *   { toolName, arguments: { ... } }          — direct format
 *   { type: 'flexible', result: { toolName, arguments } } — flexible wrapper
 *   { tool_calls: [{ function: { name, arguments } }] }   — OpenAI format
 */
export function extractToolCallArgs<T>(raw: unknown, toolName: string): T | null {
  const v = parseMaybeJson(raw);
  if (!isRecord(v)) return null;

  // Direct: { toolName, arguments }
  if (v.toolName === toolName) {
    const args = parseMaybeJson(v.arguments);
    return isRecord(args) ? (args as unknown as T) : null;
  }

  // Flexible wrapper: { type: 'flexible', result: { toolName, arguments } }
  if (v.type === 'flexible' && v.result !== undefined) {
    const result = parseMaybeJson(v.result);
    if (isRecord(result) && result.toolName === toolName) {
      const args = parseMaybeJson(result.arguments);
      return isRecord(args) ? (args as unknown as T) : null;
    }
  }

  // OpenAI format: { tool_calls: [{ function: { name, arguments } }] }
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
