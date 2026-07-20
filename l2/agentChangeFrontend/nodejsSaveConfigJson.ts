/// <mls fileReference="_102020_/l2/agentChangeFrontend/nodejsSaveConfigJson.ts" enhancement="_blank"/>

// Publish-time composer (frontend side). Runs on the dev machine via tsx, BEFORE rsync:
//   tsx mls-102020/l2/agentChangeFrontend/nodejsSaveConfigJson.ts <clientId>
// The screen list does NOT live in l5/project.json: this routine discovers the pages by
// itself — l4 workflows/operations are the functional source of truth (pageId + title),
// and a page is only registered when its l2 artifacts are materialized on disk
// (contracts/<page>.ts + shared/<page>.ts + desktop/page11/<page>.ts).
// Additional desktop/pageNN variants are registered as extra routes when materialized.
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
// Relative path (not /_102029_/...) because this file runs standalone via tsx at publish:
// tsx resolves relative .ts, but does not swap .js→.ts for path-mapped (/_XXX_/) runtime imports.

const HERE = path.dirname(process.argv[1] ? path.resolve(process.argv[1]) : process.cwd());
const ROOT = process.env.SAVE_CONFIG_ROOT ? path.resolve(process.env.SAVE_CONFIG_ROOT) : path.resolve(HERE, '../../../');

function fail(msg: string): never { console.error(`[nodejsSaveConfigJson:frontend] ${msg}`); process.exit(1); }
function warn(msg: string): void { console.warn(`[nodejsSaveConfigJson:frontend] WARN ${msg}`); }

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
}

function projectRuntimeMetadata(l5: L5ProjectJson, clientId: string) {
  return {
    projectId: l5.projectId || clientId,
    domain: l5.domain,
    port: l5.port,
    databaseName: l5.databaseName,
    environment: l5.environment,
    studioEnabled: l5.studioEnabled,
  };
}

function addL5Dependencies(config: ProjectsConfig, l5: L5ProjectJson, clientId: string): void {
  for (const dep of l5.dependencies || []) {
    const id = String(dep?.projectId || '').trim();
    if (!/^\d+$/.test(id) || id === clientId) continue;
    config.projects[id] = config.projects[id] || { root: `../mls-${id}`, type: 'lib' };
  }
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

/** Tag for a generated page component. Page .ts files register the custom element in the LEGACY full
 *  format `<folder-kebab>--<shortName>-<project>` (e.g. cafe-flow--web--desktop--page11--ws-cook-kitchen-102049),
 *  regardless of whether the shortName contains hyphens. The previous "new format" special-case for
 *  hyphenated shortNames produced a truncated tag (page11--ws-cook-kitchen) that did not match the
 *  @customElement in the .ts, so the page rendered blank. Always use the legacy full format here. */
function convertFileToTag(info: { shortName: string; project: number; folder?: string }): string {
  const kebabName = toKebab(info.shortName);
  const folderPrefix = info.folder ? `${toKebab(info.folder).replace(/\//g, '--')}--` : '';
  return `${folderPrefix}${kebabName}-${info.project}`;
}

interface DiscoveredPage { pageId: string; label: string; routeParams: string[]; actors: string[]; landing: boolean; }
interface PageVariant {
  variantId: string;
  layout: string;
  routePageId: string;
  route: string;
  source: string;
  definition: string;
  componentTag: string;
  title: string;
}

/** Pages from l4. Primary grouping is the journey WORKSPACES (one page per workspace, matching
 *  agentChangeFrontend buildPagePlans); owners not covered by any workspace fall back to a per-owner
 *  page. When there is no journey, uses the legacy per-workflow/per-operation grouping. */
function discoverPages(clientRoot: string, moduleName: string): DiscoveredPage[] {
  // Tolerant readers (l4 v2): each owner type lives either in the legacy flat l4/<folder>/ or the
  // module-scoped l4/<module>/<folder>/. Read both and merge.
  const listDefsIn = (dir: string): Record<string, unknown>[] => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(name => name.endsWith('.defs.ts'))
      .map(name => readDefsData(path.join(dir, name)))
      .filter((data): data is Record<string, unknown> => !!data);
  };
  const listDefs = (folder: string): Record<string, unknown>[] => [
    ...listDefsIn(path.join(clientRoot, 'l4', folder)),
    ...listDefsIn(path.join(clientRoot, 'l4', moduleName, folder)),
  ];

  // Actors catalog + landings (l4/<module>/actors.defs.ts + siteMap.defs.ts | navigation.defs.ts).
  const validActors = new Set(
    (readDefsData(path.join(clientRoot, 'l4', moduleName, 'actors.defs.ts'))?.actors as Record<string, unknown>[] | undefined || [])
      .map(actor => readString(actor?.actorId)).filter(Boolean),
  );
  const siteMapData = readDefsData(path.join(clientRoot, 'l4', moduleName, 'siteMap.defs.ts'))
    || readDefsData(path.join(clientRoot, 'l4', moduleName, 'navigation.defs.ts'));
  const landingWorkspaceIds = new Set(
    (siteMapData && Array.isArray(siteMapData.landings) ? siteMapData.landings as Record<string, unknown>[] : [])
      .map(landing => toSafeShortName(readString(landing?.workspaceId))).filter(Boolean),
  );

  // Workspaces: standalone l4/<module>/workspaces/*.defs.ts (v2) OR nested in journeys/*.defs.ts (legacy).
  const workspaces: { pageId: string; label: string; ops: Set<string>; wf: string; actors: string[]; landing: boolean }[] = [];
  const addWorkspace = (ws: Record<string, unknown>): void => {
    const wsId = readString(ws.workspaceId);
    if (!wsId) return;
    const actors = readStringArray(ws.actors).length ? readStringArray(ws.actors) : (readString(ws.actor) ? [readString(ws.actor)] : []);
    const bffUses = Array.isArray(ws.bffCalls)
      ? (ws.bffCalls as Record<string, unknown>[]).flatMap(call => Array.isArray(call?.uses) ? (call.uses as Record<string, unknown>[]).map(use => readString(use?.operationId)) : [])
      : [];
    const pageId = toSafeShortName(wsId);
    workspaces.push({
      pageId,
      label: readString(ws.title) || humanizeId(wsId),
      ops: new Set([...readStringArray(ws.operationIds), ...bffUses].filter(Boolean)),
      wf: readString(ws.workflowId),
      actors: actors.filter(actor => validActors.size === 0 || validActors.has(actor)),
      landing: readString(ws.kind) === 'landing' || landingWorkspaceIds.has(pageId),
    });
  };
  const workspacesDir = path.join(clientRoot, 'l4', moduleName, 'workspaces');
  if (fs.existsSync(workspacesDir)) {
    for (const name of fs.readdirSync(workspacesDir).filter(n => n.endsWith('.defs.ts'))) {
      const data = readDefsData(path.join(workspacesDir, name));
      if (data) addWorkspace(data);
    }
  }
  const journeyDir = path.join(clientRoot, 'l4', moduleName, 'journeys');
  if (workspaces.length === 0 && fs.existsSync(journeyDir)) {
    for (const name of fs.readdirSync(journeyDir).filter(n => n.endsWith('.defs.ts'))) {
      const data = readDefsData(path.join(journeyDir, name));
      const list = data && Array.isArray(data.workspaces) ? data.workspaces as Record<string, unknown>[] : [];
      for (const ws of list) if (ws && typeof ws === 'object') addWorkspace(ws);
    }
  }

  const workflows = listDefs('workflows');
  const operations = listDefs('operations');
  const operationsById = new Map(operations.map(operation => [readString(operation.operationId), operation]));
  const routeParamsFor = (operationIds: string[]): string[] => [...new Set(operationIds.flatMap(operationId => {
    const operation = operationsById.get(operationId);
    const inputs = operation && Array.isArray(operation.inputs) ? operation.inputs as Record<string, unknown>[] : [];
    return inputs
      .filter(input => readString(input?.source) === 'routeParam')
      .map(input => readString(input?.inputId))
      .filter(Boolean);
  }))];
  const actorsForOps = (operationIds: string[]): string[] => [...new Set(operationIds
    .map(operationId => readString(operationsById.get(operationId)?.actor))
    .filter(actor => actor && (validActors.size === 0 || validActors.has(actor))))];
  const page = (pageId: string, label: string, operationIds: string[], actors: string[], landing = false): DiscoveredPage =>
    ({ pageId, label, routeParams: routeParamsFor(operationIds), actors: actors.length ? actors : actorsForOps(operationIds), landing });
  const pages: DiscoveredPage[] = [];
  const operationIdsUsedByWorkflow = new Set<string>();
  for (const workflow of workflows) for (const opId of readStringArray(workflow.operationIds)) operationIdsUsedByWorkflow.add(opId);

  if (workspaces.length > 0) {
    const coveredOps = new Set<string>();
    const coveredWf = new Set<string>();
    for (const ws of workspaces) { pages.push(page(ws.pageId, ws.label, [...ws.ops], ws.actors, ws.landing)); ws.ops.forEach(o => coveredOps.add(o)); if (ws.wf) coveredWf.add(ws.wf); }
    // Leftover owners not covered by any workspace keep a legacy per-owner page.
    for (const workflow of workflows) {
      const workflowId = readString(workflow.workflowId);
      if (!workflowId || coveredWf.has(workflowId)) continue;
      pages.push(page(toSafeShortName(readString(workflow.pageId) || workflowId), readString(workflow.title) || humanizeId(workflowId), readStringArray(workflow.operationIds), readStringArray(workflow.actors)));
    }
    for (const operation of operations) {
      const operationId = readString(operation.operationId);
      if (!operationId || operationIdsUsedByWorkflow.has(operationId) || coveredOps.has(operationId)) continue;
      pages.push(page(toSafeShortName(readString(operation.pageId) || operationId), readString(operation.title) || humanizeId(operationId), [operationId], []));
    }
  } else {
    for (const workflow of workflows) {
      const workflowId = readString(workflow.workflowId);
      if (!workflowId) continue;
      pages.push(page(toSafeShortName(readString(workflow.pageId) || workflowId), readString(workflow.title) || humanizeId(workflowId), readStringArray(workflow.operationIds), readStringArray(workflow.actors)));
    }
    for (const operation of operations) {
      const operationId = readString(operation.operationId);
      if (!operationId || operationIdsUsedByWorkflow.has(operationId)) continue;
      pages.push(page(toSafeShortName(readString(operation.pageId) || operationId), readString(operation.title) || humanizeId(operationId), [operationId], []));
    }
  }

  const seen = new Set<string>();
  return pages.filter(page => seen.has(page.pageId) ? false : (seen.add(page.pageId), true))
    .sort((a, b) => a.pageId.localeCompare(b.pageId));
}

function pageRoute(moduleName: string, pageId: string, routeParams: string[]): string {
  return routeParams.reduce((route, param) => `${route}/:${param}?`, `/${moduleName}/${pageId}`);
}

function isMaterialized(clientRoot: string, moduleName: string, pageId: string): boolean {
  const web = path.join(clientRoot, 'l2', moduleName, 'web');
  const sharedOk = fs.existsSync(path.join(web, 'shared', `${pageId}.ts`));
  const pageOk = fs.existsSync(path.join(web, 'desktop/page11', `${pageId}.ts`));
  // Contracts: legacy is one per-page `<pageId>.ts`; l4 v2 (F3) is one per bffCall `<pageId>.<bffId>.ts`.
  // Accept either — a page is materialized when its shared+page11 exist and at least one contract does.
  const contractsDir = path.join(web, 'contracts');
  const contractOk = fs.existsSync(path.join(contractsDir, `${pageId}.ts`))
    || (fs.existsSync(contractsDir) && fs.readdirSync(contractsDir).some(name =>
      name.startsWith(`${pageId}.`) && name.endsWith('.ts') && !name.endsWith('.d.ts') && !name.endsWith('.defs.ts') && !name.endsWith('.test.ts')));
  return sharedOk && pageOk && contractOk;
}

function discoverPageVariants(clientRoot: string, clientId: string, moduleName: string, page: DiscoveredPage): PageVariant[] {
  const desktopDir = path.join(clientRoot, 'l2', moduleName, 'web', 'desktop');
  if (!fs.existsSync(desktopDir)) return [];

  const layouts = fs.readdirSync(desktopDir)
    .filter(name => /^page\d+$/.test(name) && name !== 'page11')
    .sort((a, b) => a.localeCompare(b));

  const variants: PageVariant[] = [];
  const usedRoutePageIds = new Set<string>();

  for (const layout of layouts) {
    const tsPath = path.join(desktopDir, layout, `${page.pageId}.ts`);
    const defsPath = path.join(desktopDir, layout, `${page.pageId}.defs.ts`);
    if (!fs.existsSync(tsPath) || !fs.existsSync(defsPath)) continue;

    const defs = readDefsData(defsPath);
    const variantId = toSafeShortName(readString(defs?.variantId) || layout);
    let routePageId = `${page.pageId}-${variantId}`;
    if (usedRoutePageIds.has(routePageId)) routePageId = `${routePageId}-${layout}`;
    usedRoutePageIds.add(routePageId);

    variants.push({
      variantId,
      layout,
      routePageId,
      route: pageRoute(moduleName, routePageId, page.routeParams),
      source: `l2/${moduleName}/web/desktop/${layout}/${page.pageId}.ts`,
      definition: `l2/${moduleName}/web/desktop/${layout}/${page.pageId}.defs.ts`,
      componentTag: convertFileToTag({ project: Number(clientId), folder: `${moduleName}/web/desktop/${layout}`, shortName: page.pageId }),
      title: `${page.label} - ${variantId.toUpperCase()}`,
    });
  }

  return variants;
}

function main(): void {
  const clientId = (process.argv[2] || '').replace(/^mls-/, '');
  if (!/^\d+$/.test(clientId)) fail('usage: tsx nodejsSaveConfigJson.ts <clientId>');

  const clientRoot = path.join(ROOT, `mls-${clientId}`);
  const runtimeL5Path = path.join(clientRoot, 'l5', 'runtime.project.json');
  const l5Path = fs.existsSync(runtimeL5Path) ? runtimeL5Path : path.join(clientRoot, 'l5', 'project.json');
  const l5 = readJson<L5ProjectJson>(l5Path);
  if (!l5) fail(`cannot read ${l5Path}`);

  const signature = l5.masters?.frontend;
  if (!signature) fail('l5/project.json has no masters.frontend signature (run agentChangeFrontend or add it)');
  const runtimeId = String(signature.runtimeProject);

  // Module resolution: from the l5 modules; multi-module needs the l4->module inference and
  // is out of scope until a real multi-module client exists.
  const moduleNames = (l5.modules || []).map(m => m.moduleName).filter(Boolean);
  if (moduleNames.length !== 1) fail(`expected exactly 1 module in l5/project.json, found ${moduleNames.length}`);
  const moduleName = moduleNames[0];

  const discovered = discoverPages(clientRoot, moduleName);
  if (discovered.length === 0) fail('no pages discovered from l4 workflows/operations');
  const pages = discovered.filter(page => {
    if (isMaterialized(clientRoot, moduleName, page.pageId)) return true;
    warn(`page '${page.pageId}' skipped: l2 artifacts not materialized (contracts/shared/page11)`);
    return false;
  });
  if (pages.length === 0) fail('no discovered page is materialized in l2; run the materialization first');

  const customize = l5.customize || {};
  // Single source of truth: l5/config.json (read by the Studio apps, the publish and the runtime).
  const configPath = path.join(clientRoot, 'l5', 'config.json');
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
  config.projects[clientId] = { ...(config.projects[clientId] || {}), root: '.', type: 'client', runtime: projectRuntimeMetadata(l5, clientId) };
  config.projects[runtimeId] = { root: `../mls-${runtimeId}`, type: 'master frontend' };
  // Frontend shared libs used by the generated l2 code and by the master frontend.
  config.projects['102027'] = config.projects['102027'] || { root: '../mls-102027', type: 'lib' };
  config.projects['102029'] = config.projects['102029'] || { root: '../mls-102029', type: 'lib' };
  // 102036 (collab-messages base) is imported by 102027 (aiAgentOrchestration/aiAgentHelper),
  // so it must be part of the client's project set (build + runtime).
  config.projects['102036'] = config.projects['102036'] || { root: '../mls-102036', type: 'lib' };
  addL5Dependencies(config, l5, clientId);

  const client = config.projects[clientId];
  client.modules = client.modules || [];
  let mod = client.modules.find(m => m.moduleId === moduleName);
  if (!mod) { mod = { moduleId: moduleName, basePath: `/${moduleName}`, shellMode: 'spa' } as ProjectModuleConfig; client.modules.push(mod); }
  mod.basePath = mod.basePath || `/${moduleName}`;
  mod.shellMode = mod.shellMode || 'spa';

  const labels = customize.navigationLabels || {};
  // F5: menu derived from workspaces + siteMap/actors. `actors` lets the shell filter the menu by the
  // logged-in actor (menu is UX; route enforcement is changeBackend's job). `landing` marks the
  // public/pre-login entry. Both ride as extra JSON fields (the shell reads them; types stay in 102029).
  mod.navigation = pages.map((page): ProjectNavigationEntry => ({
    id: page.pageId,
    label: labels[page.pageId] || page.label,
    href: `/${moduleName}/${page.pageId}`,
    description: labels[page.pageId] || page.label,
    ...(page.actors.length ? { actors: page.actors } : {}),
    ...(page.landing ? { landing: true } : {}),
  } as ProjectNavigationEntry & { actors?: string[]; landing?: boolean }));

  // F5: landings (siteMap | navigation) -> initial route per actor. Only for pages that materialized.
  const pageIds = new Set(pages.map(page => page.pageId));
  const siteMapForLandings = readDefsData(path.join(clientRoot, 'l4', moduleName, 'siteMap.defs.ts'))
    || readDefsData(path.join(clientRoot, 'l4', moduleName, 'navigation.defs.ts'));
  const landings = ((siteMapForLandings && Array.isArray(siteMapForLandings.landings) ? siteMapForLandings.landings as Record<string, unknown>[] : [])
    .map(landing => ({ actorId: readString(landing?.actorId), pageId: toSafeShortName(readString(landing?.workspaceId)) }))
    .filter(landing => landing.actorId && pageIds.has(landing.pageId))
    .map(landing => ({ actorId: landing.actorId, pageId: landing.pageId, route: `/${moduleName}/${landing.pageId}` })));
  if (landings.length > 0) (mod as ProjectModuleConfig & { landings?: unknown[] }).landings = landings;

  const variantPages = pages.flatMap(page => discoverPageVariants(clientRoot, clientId, moduleName, page));
  // Item 2a: publish the generated page11 <page>.test.ts files (resolver .js form) so the devenv
  // monitor Tests runner can discover them from config.json (never importing the client directly).
  const pageTests = pages
    .filter(page => fs.existsSync(path.join(clientRoot, 'l2', moduleName, 'web', 'desktop', 'page11', `${page.pageId}.test.ts`)))
    .map(page => `_${clientId}_/l2/${moduleName}/web/desktop/page11/${page.pageId}.test.js`);
  mod.frontend = {
    layer: 'l2',
    ...(pageTests.length > 0 ? { pageTests } : {}),
    pages: [
      ...pages.map((page): ProjectFrontendPageConfig => ({
        pageId: page.pageId,
        route: pageRoute(moduleName, page.pageId, page.routeParams),
        source: `l2/${moduleName}/web/desktop/page11/${page.pageId}.ts`,
        definition: `l2/${moduleName}/web/desktop/page11/${page.pageId}.defs.ts`,
        componentTag: convertFileToTag({ project: Number(clientId), folder: `${moduleName}/web/desktop/page11`, shortName: page.pageId }),
        title: labels[page.pageId] || page.label,
        // F5: actors that may reach this page; landing pages are public/pre-login (no actor gate).
        ...(page.actors.length ? { actors: page.actors } : {}),
        ...(page.landing ? { public: true } : {}),
      } as ProjectFrontendPageConfig & { actors?: string[]; public?: boolean })),
      ...variantPages.map((page): ProjectFrontendPageConfig => ({
        pageId: page.routePageId,
        route: page.route,
        source: page.source,
        definition: page.definition,
        componentTag: page.componentTag,
        title: page.title,
      })),
    ],
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`[nodejsSaveRuntimeConfig:frontend] composed ${pages.length} page(s) for module '${moduleName}' → ${configPath}`);
}

main();
