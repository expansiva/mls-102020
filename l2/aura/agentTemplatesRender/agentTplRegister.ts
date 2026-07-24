/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplRegister.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal barrier (deterministic, no LLM). dependsOn every render:<page>, so it runs once ALL pages
// rendered. Upserts an l5/config.json frontend page entry per generated variation
// ({pageId}-{genome}) so the publish/runtime can mount the route — mirroring the shape produced by
// agentChangeFrontend's frontendConfigPages. Best-effort: on any config-write problem it still
// completes, surfacing the exact entries to register manually (the .defs/.ts are already on disk).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkCompleted, readRawSource, saveFile } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { parseDefs } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import { convertFileToTag } from '/_102020_/l2/utils.js';
import { parseTplArgs, tsDestRef, defsDestRef, readFile, type TplArgs } from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';

interface PageEntry {
  pageId: string;
  route: string;
  source: string;
  definition: string;
  componentTag: string;
  title: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplRegister',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Register the generated page variations in l5/config.json (terminal barrier, no LLM)',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {

  const a = parseTplArgs(args ?? step.prompt);
  const project = mls.actualProject || 0;
  const pages = a.pages ?? [];
  console.info(`[agentTplRegister] ▶ terminal — ${a.genome} (${a.module}), ${pages.length} page(s)`);

  // Build config entries for pages whose .ts actually exists (render succeeded).
  const entries: PageEntry[] = [];
  for (const page of pages) {
    const perPage: TplArgs = { ...a, page };
    const ts = await readFile(tsDestRef(perPage, project));
    if (!ts) { console.warn(`[agentTplRegister]   ⚠ ${page}: no .ts (render failed?) — skipping`); continue; }
    entries.push(await buildEntry(project, perPage, page));
  }

  if (context.isTest) return [mkCompleted(context, parentStep, step, hookSequential, `would register ${entries.length} entry(ies)`)];

  if (!entries.length) {
    return [mkCompleted(context, parentStep, step, hookSequential, 'no rendered pages to register')];
  }

  try {
    const configRef = `_${project}_/l5/config.json`;
    const raw = await readRawSource(configRef);
    if (!raw) throw new Error('l5/config.json not found');
    const config = JSON.parse(raw);
    const moduleObj = findModule(config, a.module);
    if (!moduleObj) throw new Error(`module '${a.module}' not found in config.json`);

    const frontend = (moduleObj.frontend && typeof moduleObj.frontend === 'object') ? moduleObj.frontend : (moduleObj.frontend = {});
    if (!frontend.layer) frontend.layer = 'l2';
    const existing: any[] = Array.isArray(frontend.pages) ? frontend.pages : [];
    frontend.pages = upsertByPageId(existing, entries);

    await saveFile(configRef, `${JSON.stringify(config, null, 2)}\n`);
    console.info(`[agentTplRegister] ✓ registered ${entries.length} entry(ies) in ${configRef}`);
    return [mkCompleted(context, parentStep, step, hookSequential, `registered ${entries.length}: ${entries.map(e => e.pageId).join(', ')}`)];
  } catch (error) {
    // Never hard-fail: the pages exist; surface the entries so the user can register them manually.
    const detail = error instanceof Error ? error.message : String(error);
    const manual = entries.map(e => JSON.stringify(e)).join('\n');
    console.warn(`[agentTplRegister] config upsert skipped (${detail}). Register manually:\n${manual}`);
    return [mkCompleted(context, parentStep, step, hookSequential, `REGISTER-MANUAL (${detail}). Entries:\n${manual}`)];
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function buildEntry(project: number, a: TplArgs, page: string): Promise<PageEntry> {
  const folder = `${a.module}/web/${a.device}/${a.genome}`;
  const componentTag = convertFileToTag({ project, folder, shortName: page });
  const pageId = `${page}-${a.genome}`;
  const baseRoute = `/${a.module}/${page}`;

  // Preserve any `/:param?` suffix and a human title from the defs (mirrors frontendConfigPages).
  let routeParams = '';
  let title = `${page} - ${a.genome.toUpperCase()}`;
  const defs = parseDefs(await readFile(defsDestRef(a, project))).data as Record<string, unknown> | null;
  if (defs) {
    const routePattern = typeof defs.routePattern === 'string' ? defs.routePattern : '';
    if (routePattern.startsWith(baseRoute)) routeParams = routePattern.slice(baseRoute.length);
    const pageName = typeof defs.pageName === 'string' ? defs.pageName : '';
    if (pageName) title = `${pageName} - ${a.genome.toUpperCase()}`;
  }

  return {
    pageId,
    route: `/${a.module}/${pageId}${routeParams}`,
    source: `l2/${folder}/${page}.ts`,
    definition: `l2/${folder}/${page}.defs.ts`,
    componentTag,
    title,
  };
}

function upsertByPageId(existing: any[], next: PageEntry[]): any[] {
  const map = new Map<string, any>();
  for (const item of existing) { const id = item?.pageId; if (typeof id === 'string' && id) map.set(id, item); }
  for (const item of next) map.set(item.pageId, { ...(map.get(item.pageId) || {}), ...item });
  return [...map.values()];
}

/** Recursively locate the module object with the given moduleId anywhere in the config tree. */
function findModule(node: any, moduleId: string): any | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === 'object' && item.moduleId === moduleId) return item;
      const found = findModule(item, moduleId);
      if (found) return found;
    }
    return null;
  }
  if (node.moduleId === moduleId) return node;
  for (const key of Object.keys(node)) {
    const found = findModule(node[key], moduleId);
    if (found) return found;
  }
  return null;
}
