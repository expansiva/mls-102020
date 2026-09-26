/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/categoryCatalog.ts" enhancement="_blank"/>

import { readSourceText } from '/_102035_/l2/solution/fs.js';
import { nmDestProject } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import type { D2PageSkillPort } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import type { D2TemplateDiscovery, D2TemplateFile, D2TemplatePort } from '/_102020_/l2/agentDefsL2/steps/pages50/templateContext.js';

interface StoredFile {
  status?: string;
}

const templatePort: D2TemplatePort = {
  async discover(explicitCatalogProject = null): Promise<D2TemplateDiscovery> {
    const activeProject = nmDestProject();
    try { await mls.stor.loadProjectdependenciesInfoIfNeed(activeProject); } catch { /* use the loaded dependency index */ }
    const declared = typeof mls.l5.getProjectDetails === 'function' ? mls.l5.getProjectDetails(activeProject)?.prj_dependencies : undefined;
    const resolved = mls.l5.getProjectDependencies(activeProject, false) || [];
    const directDeps = Array.isArray(declared) ? declared.filter(project => project !== activeProject) : resolved;
    const allowed = new Set([activeProject, ...directDeps]);
    const files = Object.entries(mls.stor.files as Record<string, StoredFile>)
      .filter(([, stored]) => stored.status !== 'deleted')
      .map(([key]) => parseStorageKey(key))
      .filter((file): file is StorageEntry => file !== null && allowed.has(file.project) && file.level === 4);
    const catalogs = files.filter(file => file.folder === 'collabux/templates' && file.shortName === 'categoryList' && file.extension === '.json');
    const chosen = chooseCatalog(catalogs, activeProject, directDeps, explicitCatalogProject);
    if (!chosen) return { categoryCatalog: null, files: [] };
    const categoryCatalog = reference(chosen);
    let categoryIds = new Set<string>();
    try {
      const raw = await readSourceText(toFileInfo(chosen));
      const parsed = JSON.parse(raw) as { categories?: Array<{ categoryId?: unknown }> };
      categoryIds = new Set((parsed.categories ?? []).flatMap(item => typeof item.categoryId === 'string' ? [item.categoryId] : []));
    } catch { /* selection reports the unreadable catalog */ }
    const templates: D2TemplateFile[] = [];
    for (const file of files) {
      if (file.project === chosen.project && file.folder.startsWith('collabux/templates/') && categoryIds.has(file.folder.slice('collabux/templates/'.length)) && ['page11', 'page21', 'page31'].includes(file.shortName) && file.extension === '.md') {
        templates.push({ reference: reference(file), role: 'category', categoryRef: file.folder.slice('collabux/templates/'.length) });
        continue;
      }
      if (!file.folder.startsWith('templates/') || file.shortName !== 'template' || file.extension !== '.md') continue;
      const parts = file.folder.split('/');
      if (parts.length === 2) templates.push({ reference: reference(file), role: 'style-global', styleId: parts[1] });
      else if (parts.length === 3 && categoryIds.has(parts[2])) templates.push({ reference: reference(file), role: 'style-category', styleId: parts[1], categoryRef: parts[2] });
      else if (parts.length === 5 && parts[3] === 'layouts' && categoryIds.has(parts[2])) templates.push({ reference: reference(file), role: 'layout', styleId: parts[1], categoryRef: parts[2], layoutId: parts[4] });
    }
    return { categoryCatalog, files: templates };
  },
  async readText(reference: string): Promise<string | null> {
    const file = parseReference(reference);
    if (!file) throw new Error(`D2_TEMPLATE_REF_INVALID: ${reference}`);
    try { return await readSourceText(toFileInfo(file)); } catch { return null; }
  },
};

export const d2PageSkillPort: D2PageSkillPort = {
  async readText(reference: string): Promise<string | null> {
    const match = /^_(\d+)_\/l([24])\/(.+)\/([^/]+)(\.(?:ts|md|json))$/.exec(reference);
    if (!match) throw new Error(`D2_PAGE_SKILL_REF_INVALID: ${reference}`);
    try { return await readSourceText({ project: Number(match[1]), level: Number(match[2]) as 2 | 4, folder: match[3], shortName: match[4], extension: match[5] }); }
    catch { return null; }
  },
};

export const d2TemplatePort = templatePort;

interface StorageEntry { project: number; level: 2 | 4; folder: string; shortName: string; extension: string; }
function parseStorageKey(key: string): StorageEntry | null {
  const match = /^(\d+)_(2|4)_(.*)\/([^/]+)(\.[^.]+)$/.exec(key);
  if (!match) return null;
  return { project: Number(match[1]), level: Number(match[2]) as 2 | 4, folder: match[3], shortName: match[4], extension: match[5] };
}
function parseReference(value: string): StorageEntry | null {
  const match = /^_([0-9]+)_\/l(2|4)\/(.*)\/([^/]+)(\.[^.]+)$/.exec(value);
  if (!match) return null;
  return { project: Number(match[1]), level: Number(match[2]) as 2 | 4, folder: match[3], shortName: match[4], extension: match[5] };
}
function reference(file: StorageEntry): string { return `_${file.project}_/l${file.level}/${file.folder}/${file.shortName}${file.extension}`; }
function toFileInfo(file: StorageEntry) { return { ...file }; }
function chooseCatalog(catalogs: StorageEntry[], activeProject: number, directDeps: number[], explicit: number | null): StorageEntry | null {
  if (explicit !== null) {
    const found = catalogs.find(file => file.project === explicit);
    if (!found) throw new Error(`D2_TEMPLATE_CATALOG_UNAVAILABLE: ${explicit}`);
    return found;
  }
  const own = catalogs.find(file => file.project === activeProject);
  if (own) return own;
  const dependencies = catalogs.filter(file => directDeps.includes(file.project));
  if (dependencies.length > 1) throw new Error(`D2_TEMPLATE_CATALOG_AMBIGUOUS: ${dependencies.map(file => file.project).join(', ')}`);
  return dependencies[0] ?? null;
}
