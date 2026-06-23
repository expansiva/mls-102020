/// <mls fileReference="_102020_/l2/agentMaterializeSolution/registerFrontEnd.ts" enhancement="_blank"/>

import {
  getFileContent,
  saveGeneratedTs,
  saveGeneratedJson,
  saveGeneratedHtml,
  parseMlsPath,
  toMlsPath,
} from '/_102027_/l2/agentMaterializeSolution/artifactsMaterialize.js';
import type { AfterSaveCtx } from '/_102027_/l2/agentMaterializeSolution/artifactsMaterialize.js';
import { convertFileNameToTag } from '/_102027_/l2/utils.js';
import {
  addNavigation,
  addPage as addCollabPage,
} from '/_102020_/l2/agentMaterializeSolution/ast/astCollab.js';

// ─── File-level mutex ─────────────────────────────────────────────────────────

const fileLocks = new Map<string, Promise<void>>();

function withLock<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(path) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(res => { release = res; });
  fileLocks.set(path, current);
  return prev.then(() => fn()).finally(() => release());
}

// ─── Page registration ────────────────────────────────────────────────────────

export async function registerPage(ctx: AfterSaveCtx): Promise<void> {
  const parsed = parseMlsPath(ctx.outputPath);
  if (!parsed) return;

  const tag = convertFileNameToTag({ shortName: parsed.shortName, project: parsed.project, folder: parsed.folder });
  const href = `/${ctx.moduleName}/${ctx.shortName}`;
  const label = toLabel(ctx.shortName);

  await Promise.all([
    saveGeneratedHtml(parsed.project, parsed.level, parsed.folder, parsed.shortName, `<${tag}></${tag}>`),
    updateCollabConfig(ctx.project, ctx.moduleName, ctx.shortName, ctx.outputPath, href, label, tag),
  ]);
}

function updateCollabConfig(
  project: number,
  moduleName: string,
  shortName: string,
  outputPath: string,
  href: string,
  label: string,
  tag: string,
): Promise<void> {
  const configPath = toMlsPath(project, 0, '', 'config', '.json');

  return withLock(configPath, async () => {
    const configSource = await getFileContent(project, 0, '', 'config', '.json');
    if (!configSource) return;

    const projectId = String(project);
    const relPath = outputPath.replace(/^_\d+_\//, '');

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
      source: relPath,
      definition: relPath.replace(/\.ts$/, '.defs.ts'),
      componentTag: tag,
    });

    if (updated === configSource) return;
    await saveGeneratedJson(project, 0, '', 'config', updated);
  });
}

function toLabel(shortName: string): string {
  return shortName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}
