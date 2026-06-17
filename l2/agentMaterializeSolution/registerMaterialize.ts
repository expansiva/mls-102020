/// <mls fileReference="_102020_/l2/agentMaterializeSolution/registerMaterialize.ts" enhancement="_blank"/>

import { convertFileNameToTag } from '/_102027_/l2/utils.js';
import {
  getContentByMlsPath,
  saveGeneratedTs,
  saveGeneratedJson,
  parseMlsPath,
  toMlsPath,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import {
  addImport,
  addRoute,
} from '/_102020_/l2/agentMaterializeSolution/ast/astRouter.js';
import {
  addModuleNav,
  addModuleRoute,
} from '/_102020_/l2/agentMaterializeSolution/ast/astModuleFront.js';
import {
  addNav,
  addPage,
} from '/_102020_/l2/agentMaterializeSolution/ast/astIndex.js';
import {
  addTableDef,
  extractTableDefVarName,
} from '/_102020_/l2/agentMaterializeSolution/ast/astPersistence.js';
import {
  addNavigation,
  addPage as addCollabPage,
} from '/_102020_/l2/agentMaterializeSolution/ast/astCollab.js';

// ─── Controller registration ──────────────────────────────────────────────────

interface RouterEntry {
  routeKey: string;
  handlerName: string;
  importPath: string;
}

function extractRouterEntries(source: string): RouterEntry[] {
  const results: RouterEntry[] = [];
  const re = /'([^']+)'\s*:\s*\{\s*handlerName\s*:\s*'([^']+)'\s*,\s*importPath\s*:\s*'([^']+)'\s*,?\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    results.push({ routeKey: m[1], handlerName: m[2], importPath: m[3] });
  }
  return results;
}

export async function registerController(
  project: number,
  moduleName: string,
  generatedSource: string,
): Promise<void> {
  const entries = extractRouterEntries(generatedSource);
  if (!entries.length) return;

  const routerPath = toMlsPath(project, 1, `${moduleName}/layer_2_controllers`, 'router', '.ts');
  const routerSource = await getContentByMlsPath(routerPath);
  if (!routerSource) return;

  let updated = routerSource;
  for (const { routeKey, handlerName, importPath } of entries) {
    updated = addImport(updated, { kind: 'value', names: [handlerName], from: importPath });
    updated = addRoute(updated, routeKey, handlerName);
  }

  if (updated === routerSource) return;

  const p = parseMlsPath(routerPath);
  if (p) await saveGeneratedTs(p.project, p.level, p.folder, p.shortName, updated);
}

// ─── Page registration ────────────────────────────────────────────────────────

export async function registerPage(
  project: number,
  moduleName: string,
  shortName: string,
  outputPath: string,
): Promise<void> {
  const parsed = parseMlsPath(outputPath);
  if (!parsed) return;

  const tag = convertFileNameToTag({ shortName: parsed.shortName, project: parsed.project, folder: parsed.folder });
  const href = `/${moduleName}/${shortName}`;
  const label = toLabel(shortName);
  const loader = '/' + outputPath.replace(/\.ts$/, '.js');

  await updateModuleTs(project, moduleName, shortName, href, label, loader, tag);
  await updateIndexTs(project, moduleName, href, label, loader, tag);
  await updateCollabConfig(project, moduleName, shortName, outputPath, href, label, tag);
}

async function updateModuleTs(
  project: number,
  moduleName: string,
  shortName: string,
  href: string,
  label: string,
  loader: string,
  tag: string,
): Promise<void> {
  const path = toMlsPath(project, 2, moduleName, 'module', '.ts');
  const source = await getContentByMlsPath(path);
  if (!source) return;

  let updated = source;
  updated = addModuleNav(updated, { id: shortName, label, href, description: label });
  updated = addModuleRoute(updated, { path: href, aliases: [], entrypoint: loader, tag, title: label });

  if (updated === source) return;
  const p = parseMlsPath(path);
  if (p) await saveGeneratedTs(p.project, p.level, p.folder, p.shortName, updated);
}

async function updateIndexTs(
  project: number,
  moduleName: string,
  href: string,
  label: string,
  loader: string,
  tag: string,
): Promise<void> {
  const path = toMlsPath(project, 2, moduleName, 'index', '.ts');
  const source = await getContentByMlsPath(path);
  if (!source) return;

  let updated = source;
  updated = addNav(updated, { label, href });
  updated = addPage(updated, { path: href, title: label, tagName: tag, loader });

  if (updated === source) return;
  const p = parseMlsPath(path);
  if (p) await saveGeneratedTs(p.project, p.level, p.folder, p.shortName, updated);
}

async function updateCollabConfig(
  project: number,
  moduleName: string,
  shortName: string,
  outputPath: string,
  href: string,
  label: string,
  tag: string,
): Promise<void> {
  const configPath = toMlsPath(project, 0, '', 'config', '.json');
  const configSource = await getContentByMlsPath(configPath);
  if (!configSource) return;

  const projectId = String(project);
  // source/definition as relative paths (strip leading _xxx_/)
  const relPath = outputPath.replace(/^_\d+_\//, '');
  const source = relPath;
  const definition = relPath.replace(/\.ts$/, '.defs.ts');

  let updated = configSource;
  updated = addNavigation(updated, projectId, moduleName, {
    id: shortName,
    label,
    href,
    description: label,
  });
  updated = addCollabPage(updated, projectId, moduleName, {
    pageId: shortName,
    route: href,
    source,
    definition,
    componentTag: tag,
  });

  if (updated === configSource) return;
  await saveGeneratedJson(project, 0, '', 'config', updated);
}

// ─── Layer1 (persistence) registration ───────────────────────────────────────

export async function registerLayer1(
  project: number,
  moduleName: string,
  generatedSource: string,
  outputPath: string,
): Promise<void> {
  const varName = extractTableDefVarName(generatedSource);
  if (!varName) return;

  const importPath = '/' + outputPath.replace(/\.ts$/, '.js');
  const persistencePath = toMlsPath(project, 1, `${moduleName}/layer_1_external`, 'persistence', '.ts');
  const persistenceSource = await getContentByMlsPath(persistencePath);
  if (!persistenceSource) return;

  const updated = addTableDef(persistenceSource, varName, importPath);
  if (updated === persistenceSource) return;

  const p = parseMlsPath(persistencePath);
  if (p) await saveGeneratedTs(p.project, p.level, p.folder, p.shortName, updated);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLabel(shortName: string): string {
  return shortName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}
