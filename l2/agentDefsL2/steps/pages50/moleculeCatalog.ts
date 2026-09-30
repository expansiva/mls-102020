/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.ts" enhancement="_blank"/>

import { indexedFile, readSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { D2MoleculeCatalogPort, D2MoleculeGroup, D2MoleculeGroupSummary } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';

function file(reference: string): Ns5FileInfo {
  const match = /^\/?_(\d+)_\/l2\/(.+)\/([^/]+?)(\.defs)?(?:\.ts)?$/u.exec(reference);
  if (!match || match[2].split('/').some(part => !part || part === '..')) throw new Error(`D2_MOLECULE_REFERENCE: ${reference}`);
  return { project: Number(match[1]), level: 2, folder: match[2], shortName: match[3], extension: match[4] ? '.defs.ts' : '.ts' };
}
async function source(reference: string): Promise<string> {
  const info = file(reference);
  try { return await readSourceText(info); } catch { throw new Error(`D2_MOLECULE_SOURCE_UNREADABLE: ${reference}`); }
}
function exportedArray(text: string, name: string): string[] {
  const start = text.indexOf(`export const ${name} = [`);
  if (start < 0) return [];
  const end = text.indexOf('];', start);
  if (end < 0) throw new Error(`D2_MOLECULE_ARRAY_UNCLOSED: ${name}`);
  return text.slice(start, end).split('\n');
}
function field(line: string, key: string): string { return new RegExp(`${key}:\\s*(['"])(.*?)\\1`, 'u').exec(line)?.[2] ?? ''; }
function quotedExport(text: string, key: string): string { return new RegExp(`export const ${key}\\s*=\\s*(['"])(.*?)\\1`, 'u').exec(text)?.[2] ?? ''; }
function skill(text: string): string { const marker = 'export const skill = `'; const start = text.indexOf(marker); const end = text.lastIndexOf('`'); return start >= 0 && end > start ? text.slice(start + marker.length, end) : ''; }

export const d2MoleculeCatalogPort: D2MoleculeCatalogPort = {
  async discover(project) {
    if (typeof mls === 'undefined') throw new Error('D2_MOLECULE_STUDIO_UNAVAILABLE');
    if (typeof mls.stor.loadProjectdependenciesInfoIfNeed === 'function') {
      await mls.stor.loadProjectdependenciesInfoIfNeed(project);
    }
    const declared = mls.l5.getProjectDetails(project)?.prj_dependencies;
    const directDependencies = Array.isArray(declared) ? declared.filter(id => id !== project) : (mls.l5.getProjectDependencies(project, false) || []).filter(id => id !== project);
    const candidates = [project, ...directDependencies].filter(id => indexedFile({ project: id, level: 2, folder: 'molecules', shortName: 'skill', extension: '.ts' }));
    if (candidates.length > 1) throw new Error(`D2_MOLECULE_CATALOG_AMBIGUOUS: ${candidates.join(', ')}`);
    if (!candidates.length) return { catalogProject: null, selectedBy: null, directDependencies, groups: [], source: '' };
    const catalogProject = candidates[0];
    const catalogSource = await source(`_${catalogProject}_/l2/molecules/skill.ts`);
    const descriptions = new Map([...skill(catalogSource).matchAll(/^###\s+(\S+)\s+\(\d+ molecules\)\s*\n+([^\n]+)/gmu)].map(match => [match[1], match[2].trim()]));
    const groups = exportedArray(catalogSource, 'groups').map(line => ({ groupId: field(line, 'name'), indexReference: field(line, 'indexDefs'), count: Number(/molecules:\s*(\d+)/u.exec(line)?.[1] ?? 0) })).filter(row => row.groupId && row.indexReference).map(row => ({ ...row, purpose: descriptions.get(row.groupId) ?? '' }));
    for (const group of groups) if (!group.purpose) throw new Error(`D2_MOLECULE_PURPOSE_MISSING: ${group.groupId}`);
    return { catalogProject, selectedBy: catalogProject === project ? 'local' : 'dependency', directDependencies, groups, source: catalogSource };
  },
  async readGroup(summary: D2MoleculeGroupSummary): Promise<D2MoleculeGroup> {
    const indexText = await source(summary.indexReference);
    const groupId = quotedExport(indexText, 'group');
    const usageReference = quotedExport(indexText, 'usageContract');
    if (groupId !== summary.groupId || !usageReference) throw new Error(`D2_MOLECULE_INDEX_INVALID: ${summary.groupId}`);
    const tags = exportedArray(indexText, 'molecules').map(line => field(line, 'tag')).filter(Boolean);
    const scenarios = exportedArray(indexText, 'scenarios').map(line => {
      const scenario = field(line, 'scenario');
      const listed = /recommended:\s*\[([^\]]*)\]/u.exec(line)?.[1] ?? '';
      const recommended = [...listed.matchAll(/['"]([^'"]+)['"]/gu)].map(match => match[1]);
      return { scenario, recommended };
    }).filter(row => row.scenario);
    if (!tags.length) throw new Error(`D2_MOLECULE_INDEX_EMPTY: ${summary.groupId}`);
    const usageSource = await source(usageReference);
    const usageText = skill(usageSource);
    return { groupId, purpose: summary.purpose, indexReference: summary.indexReference, usageReference,
      tags, scenarios, indexSource: indexText, indexText: skill(indexText), usageSource, usageText };
  },
};
