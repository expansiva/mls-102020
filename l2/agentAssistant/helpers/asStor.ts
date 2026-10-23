/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asStor.ts" enhancement="_blank"/>

// Reads the generated app's files from mls.stor (filled by the studio login, or by cbeMiniCfe on
// the runtime VM) and hands them to the pure catalog builder. Which modules exist and which routes
// are live come from l5/project.json (modules[].backend.routeKeys); which contract each page uses
// comes from the controllers defs (handlers[].contractPath).

import type { AsCatalog, AsModuleSources } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { buildManual, type AsManual, type AsManualSources } from '/_102020_/l2/agentAssistant/helpers/asManual.js';
import { asArray, asRecord, asString, buildCatalog } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { extractExportedObject } from '/_102020_/l2/agentAssistant/helpers/asSource.js';

export const AS_AGENT_PROJECT = 102020;
export const AS_AGENT_FOLDER = 'agentAssistant';

type FileRef = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

const catalogs = new Map<number, Promise<AsCatalog>>();
const manuals = new Map<number, Promise<AsManual | null>>();

// One build per project per page load: the interpret hooks run twice (before/after the call).
export function loadCatalog(project: number): Promise<AsCatalog> {
  let pending = catalogs.get(project);
  if (!pending) {
    pending = readModules(project).then(buildCatalog);
    pending.catch(() => catalogs.delete(project));
    catalogs.set(project, pending);
  }
  return pending;
}

export function actualProject(): number {
  const project = mls.actualProject;
  if (!project) throw new Error('[agentAssistant] mls.actualProject is not available');
  return project;
}

async function readModules(project: number): Promise<AsModuleSources[]> {
  const projectJson = asRecord(parseJson(await readText({ project, level: 5, folder: '', shortName: 'project', extension: '.json' })));
  const out: AsModuleSources[] = [];
  for (const rawModule of asArray(projectJson.modules)) {
    const moduleConfig = asRecord(rawModule);
    const module = asString(moduleConfig.moduleName);
    const routeKeys = asArray(asRecord(moduleConfig.backend).routeKeys).map(asString).filter(Boolean);
    if (!module || !routeKeys.length) continue;

    const requests = await readAll(filesIn(project, 1, `${module}/layer_2_application/requests`));
    const controllers = await readAll(filesIn(project, 1, `${module}/layer_1_external/adapters/http/controllers`));
    const contractRefs = new Map<string, FileRef>();
    for (const text of controllers) {
      for (const handler of asArray(asRecord(asRecord(extractExportedObject(text)).data).handlers)) {
        const ref = fileRefFromPath(project, asString(asRecord(handler).contractPath));
        if (ref) contractRefs.set(mls.stor.getKeyToFile(ref), ref);
      }
    }
    const contracts = await readAll([...contractRefs.values()]);
    const ontology = await readAll(filesIn(project, 4, `${module}/ontology`).filter(file => file.shortName !== 'index'));
    out.push({ module, routeKeys, requests, contracts, ontology });
  }
  return out;
}

// The user manual of the app (modes 'manual'). Separate from the catalog and never fatal: if the
// defs cannot be read the agent works exactly as before, only without manual answers.
export function loadManual(project: number): Promise<AsManual | null> {
  let pending = manuals.get(project);
  if (!pending) {
    pending = readManualSources(project)
      .then(buildManual)
      .catch(error => {
        console.warn(`[agentAssistant] manual unavailable: ${error instanceof Error ? error.message : String(error)}`);
        manuals.delete(project);
        return null;
      });
    manuals.set(project, pending);
  }
  return pending;
}

async function readManualSources(project: number): Promise<AsManualSources[]> {
  const projectJson = asRecord(parseJson(await readText({ project, level: 5, folder: '', shortName: 'project', extension: '.json' })));
  const out: AsManualSources[] = [];
  // every module of the app, with or without a backend: the manual describes them all
  for (const rawModule of asArray(projectJson.modules)) {
    const module = asString(asRecord(rawModule).moduleName);
    if (!module) continue;
    const l4 = (folder: string, shortName: string, extension: string) => readText({ project, level: 4, folder: folder ? `${module}/${folder}` : module, shortName, extension });
    const pageRefs = Object.values(mls.stor.files).filter(file =>
      file.project === project && file.level === 2 && file.extension === '.defs.ts' && file.status !== 'deleted'
      && file.folder.startsWith(`${module}/web/desktop/`));
    const pageDefs = await Promise.all(pageRefs.map(async ref => ({ pageId: ref.shortName, text: await readText(ref) })));
    out.push({
      module,
      moduleDef: await l4('', 'module', '.defs.ts'),
      access: await l4('', 'access', '.defs.ts'),
      rules: await l4('', 'rules', '.defs.ts'),
      journeys: await readAll(filesIn(project, 4, `${module}/journeys`).filter(file => file.shortName !== 'index')),
      menuJson: await l4('pool/l2/web', 'menu', '.json'),
      pageDefs: pageDefs.filter(item => item.text),
      controllers: await readAll(filesIn(project, 1, `${module}/layer_1_external/adapters/http/controllers`)),
    });
  }
  return out;
}

function filesIn(project: number, level: number, folder: string): FileRef[] {
  return Object.values(mls.stor.files).filter(file =>
    file.project === project
    && file.level === level
    && file.folder === folder
    && file.extension === '.defs.ts'
    && file.status !== 'deleted');
}

// 'l2/comandaRestaurante/web/contracts/atendimento.defs.ts' -> stor file ref
export function fileRefFromPath(project: number, path: string): FileRef | null {
  const match = /^l(\d)\/(.+\/)?([^/.]+)(\..+)$/.exec(path);
  if (!match) return null;
  return { project, level: Number(match[1]), folder: (match[2] || '').replace(/\/$/, ''), shortName: match[3], extension: match[4] };
}

async function readAll(refs: FileRef[]): Promise<string[]> {
  const texts = await Promise.all(refs.map(ref => readText(ref)));
  return texts.filter(Boolean);
}

export async function readText(ref: FileRef): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(ref)];
  if (!file || file.status === 'deleted') return '';
  const raw = await file.getContent();
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && !(raw instanceof Blob)) return JSON.stringify(raw);
  return '';
}

// prompt.md / schemas owned by this agent
export async function readAgentText(folder: string, shortName: string, extension: string): Promise<string> {
  const text = await readText({ project: AS_AGENT_PROJECT, level: 2, folder: folder ? `${AS_AGENT_FOLDER}/${folder}` : AS_AGENT_FOLDER, shortName, extension });
  if (!text) throw new Error(`[agentAssistant] missing ${AS_AGENT_FOLDER}/${folder}/${shortName}${extension}`);
  return text;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
