/// <mls fileReference="_102020_/l2/agentChangeFrontend/nodejsSaveConfigJson.ts" enhancement="_blank"/>

// Publish-time composer (frontend side). Runs on the dev machine via tsx, BEFORE rsync:
//   tsx mls-102020/l2/agentChangeFrontend/nodejsSaveConfigJson.ts <clientId>
// The screen list does NOT live in l5/project.json: this routine discovers the pages by
// itself — l4 workflows/operations are the functional source of truth (pageId + title),
// and a page is only registered when its l2 artifacts are materialized on disk
// (contracts/<page>.ts + shared/<page>.ts + desktop/page11/<page>.ts).
// It merges the frontend part of the workspace ProjectsConfig into mls-<clientId>/config.json:
// shellTemplates, publication, clientShell (l5 customize overrides win), projects
// (master frontend + libs) and modules[].frontend.pages / navigation.

import fs from 'node:fs';
import path from 'node:path';
import type {
  L5ProjectJson,
  ProjectFrontendPageConfig,
  ProjectModuleConfig,
  ProjectNavigationEntry,
  ProjectsConfig,
} from '/_102029_/l2/runtimeConfigTypes.js';

const HERE = path.dirname(process.argv[1] ? path.resolve(process.argv[1]) : process.cwd());
const ROOT = process.env.SAVE_CONFIG_ROOT ? path.resolve(process.env.SAVE_CONFIG_ROOT) : path.resolve(HERE, '../../../');

function fail(msg: string): never { console.error(`[nodejsSaveConfigJson:frontend] ${msg}`); process.exit(1); }
function warn(msg: string): void { console.warn(`[nodejsSaveConfigJson:frontend] WARN ${msg}`); }

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
}

/** Object literal of a generated .defs.ts (`export const x = {...};` or `... as const;`). */
function readDefsData(file: string): Record<string, unknown> | null {
  let content: string;
  try { content = fs.readFileSync(file, 'utf8'); } catch { return null; }
  const start = content.indexOf('= {');
  if (start === -1) return null;
  const asConst = content.lastIndexOf(' as const;');
  const end = asConst !== -1 ? asConst : content.lastIndexOf('};') + 1;
  if (end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start + 2, asConst !== -1 ? end : end + 1).trim().replace(/;$/, ''));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

function readString(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function readStringArray(value: unknown): string[] { return Array.isArray(value) ? value.map(readString).filter(Boolean) : []; }
function toSafeShortName(value: string): string { return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'page'; }
function humanizeId(id: string): string { const spaced = id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim(); return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : id; }
function toKebab(str: string): string { return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(); }

/** Same tag convention as nodejsMaterializeL2.ts / _102020_/l2/utils.ts. */
function convertFileToTag(info: { shortName: string; project: number; folder?: string }): string {
  const kebabName = toKebab(info.shortName);
  if (info.shortName.includes('-')) {
    if (!info.folder) return kebabName;
    const parts = info.folder.split('/');
    return `${toKebab(parts[parts.length - 1] || '')}--${kebabName}`;
  }
  const folderPrefix = info.folder ? `${toKebab(info.folder).replace(/\//g, '--')}--` : '';
  return `${folderPrefix}${kebabName}-${info.project}`;
}

interface DiscoveredPage { pageId: string; label: string; }

/** Pages from l4 (workflows own their operations; remaining operations get their own page). */
function discoverPages(clientRoot: string): DiscoveredPage[] {
  const listDefs = (folder: string): Record<string, unknown>[] => {
    const dir = path.join(clientRoot, 'l4', folder);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(name => name.endsWith('.defs.ts'))
      .map(name => readDefsData(path.join(dir, name)))
      .filter((data): data is Record<string, unknown> => !!data);
  };

  const pages: DiscoveredPage[] = [];
  const operationIdsUsedByWorkflow = new Set<string>();

  for (const workflow of listDefs('workflows')) {
    const workflowId = readString(workflow.workflowId);
    if (!workflowId) continue;
    for (const opId of readStringArray(workflow.operationIds)) operationIdsUsedByWorkflow.add(opId);
    pages.push({
      pageId: toSafeShortName(readString(workflow.pageId) || workflowId),
      label: readString(workflow.title) || humanizeId(workflowId),
    });
  }

  for (const operation of listDefs('operations')) {
    const operationId = readString(operation.operationId);
    if (!operationId || operationIdsUsedByWorkflow.has(operationId)) continue;
    pages.push({
      pageId: toSafeShortName(readString(operation.pageId) || operationId),
      label: readString(operation.title) || humanizeId(operationId),
    });
  }

  const seen = new Set<string>();
  return pages.filter(page => seen.has(page.pageId) ? false : (seen.add(page.pageId), true))
    .sort((a, b) => a.pageId.localeCompare(b.pageId));
}

function isMaterialized(clientRoot: string, moduleName: string, pageId: string): boolean {
  const web = path.join(clientRoot, 'l2', moduleName, 'web');
  return ['contracts', 'shared', 'desktop/page11']
    .every(part => fs.existsSync(path.join(web, part, `${pageId}.ts`)));
}

function main(): void {
  const clientId = (process.argv[2] || '').replace(/^mls-/, '');
  if (!/^\d+$/.test(clientId)) fail('usage: tsx nodejsSaveConfigJson.ts <clientId>');

  const clientRoot = path.join(ROOT, `mls-${clientId}`);
  const l5 = readJson<L5ProjectJson>(path.join(clientRoot, 'l5', 'project.json'));
  if (!l5) fail(`cannot read ${path.join(clientRoot, 'l5', 'project.json')}`);

  const signature = l5.masters?.frontend;
  if (!signature) fail('l5/project.json has no masters.frontend signature (run agentChangeFrontend or add it)');
  const runtimeId = String(signature.runtimeProject);

  // Module resolution: from the l5 modules; multi-module needs the l4->module inference and
  // is out of scope until a real multi-module client exists.
  const moduleNames = (l5.modules || []).map(m => m.moduleName).filter(Boolean);
  if (moduleNames.length !== 1) fail(`expected exactly 1 module in l5/project.json, found ${moduleNames.length}`);
  const moduleName = moduleNames[0];

  const discovered = discoverPages(clientRoot);
  if (discovered.length === 0) fail('no pages discovered from l4 workflows/operations');
  const pages = discovered.filter(page => {
    if (isMaterialized(clientRoot, moduleName, page.pageId)) return true;
    warn(`page '${page.pageId}' skipped: l2 artifacts not materialized (contracts/shared/page11)`);
    return false;
  });
  if (pages.length === 0) fail('no discovered page is materialized in l2; run the materialization first');

  const customize = l5.customize || {};
  const configPath = path.join(clientRoot, 'config.json');
  const config = (readJson<ProjectsConfig>(configPath) || {}) as ProjectsConfig;

  config.defaultProjectId = config.defaultProjectId || clientId;
  config.shellTemplates = customize.shellTemplates
    || { spa: `./_${runtimeId}_/l2/shared/spa/index.html`, pwa: `./_${runtimeId}_/l2/shared/pwa/index.html` };
  config.publication = customize.publication
    || config.publication
    || { defaultTarget: 'web', targets: { web: { assetBaseUrl: '', serveStaticFromServer: true, minify: false, sourcemap: true } } };
  config.clientShell = customize.clientShell
    || config.clientShell
    || {
      mode: 'spa',
      activeProfile: 'production',
      regions: {
        aside: {
          activeProfile: 'defaultAura',
          profiles: {
            defaultAura: {
              renderer: { entrypoint: `/_${runtimeId}_/l2/shared/layout/aura-aside.js`, source: `../mls-${runtimeId}/l2/shared/layout/aura-aside.ts`, tag: 'collab-aura-aside' },
              widthPx: 280,
            },
          },
        },
      },
    };

  config.projects = config.projects || {};
  config.projects[clientId] = { ...(config.projects[clientId] || {}), root: '.', type: 'client' };
  config.projects[runtimeId] = { root: `../mls-${runtimeId}`, type: 'master frontend' };
  // Frontend shared libs used by the generated l2 code and by the master frontend.
  config.projects['102027'] = config.projects['102027'] || { root: '../mls-102027', type: 'lib' };
  config.projects['102029'] = config.projects['102029'] || { root: '../mls-102029', type: 'lib' };

  const client = config.projects[clientId];
  client.modules = client.modules || [];
  let mod = client.modules.find(m => m.moduleId === moduleName);
  if (!mod) { mod = { moduleId: moduleName, basePath: `/${moduleName}`, shellMode: 'spa' } as ProjectModuleConfig; client.modules.push(mod); }
  mod.basePath = mod.basePath || `/${moduleName}`;
  mod.shellMode = mod.shellMode || 'spa';

  const labels = customize.navigationLabels || {};
  mod.navigation = pages.map((page): ProjectNavigationEntry => ({
    id: page.pageId,
    label: labels[page.pageId] || page.label,
    href: `/${moduleName}/${page.pageId}`,
    description: labels[page.pageId] || page.label,
  }));
  mod.frontend = {
    layer: 'l2',
    pages: pages.map((page): ProjectFrontendPageConfig => ({
      pageId: page.pageId,
      route: `/${moduleName}/${page.pageId}`,
      source: `l2/${moduleName}/web/desktop/page11/${page.pageId}.ts`,
      definition: `l2/${moduleName}/web/desktop/page11/${page.pageId}.defs.ts`,
      componentTag: convertFileToTag({ project: Number(clientId), folder: `${moduleName}/web/desktop/page11`, shortName: page.pageId }),
      title: labels[page.pageId] || page.label,
    })),
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`[nodejsSaveConfigJson:frontend] composed ${pages.length} page(s) for module '${moduleName}' into ${configPath}`);
}

main();
