/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxCore.ts" enhancement="_blank"/>

/**
 * Identity, entry, paths, template and rules of agentGenomeUx (TASK-102020-genome-ux-3, part A).
 *
 * A genome UX N of a module is the page folder `page{N}1` (UX 1 is page11 itself). For every page the agent
 * writes `web/<device>/page{N}1/<page>.defs.ts` on both devices, in the page11 grammar, with the template of
 * the UX and the molecules chosen again for it. Everything it owns besides those defs lives under
 * `l2/<module>/pipeline/agentGenomeUx/page{N}1/` (receipts and raw LLM answers), never inside `page{N}1`.
 *
 * PURE — no `mls.*`, no file system.
 */

import { getPageTemplate, uxPageKey, uxTemplatePath, type IUxExperienceIndex, type IUxLayout } from '/_102020_/l2/aura/helpers/uxTemplates.js';
import { extractTemplateRules, validateTemplateRules } from '/_102020_/l2/aura/helpers/templateRules.js';

export const GENOME_UX_AGENT_NAME = 'agentGenomeUx' as const;
export const GENOME_UX_DISPATCH_AGENT_NAME = 'agentGenomeUxDispatch' as const;
export const GENOME_UX_PAGE_AGENT_NAME = 'agentGenomeUxPage' as const;
export const GENOME_UX_FOLDER = 'aura/agentGenomeUx' as const;
/** Bumped whenever the receipt shape or the way a variant is built changes: an older receipt is stale. */
export const GENOME_UX_RECEIPT_VERSION = '2026-10-22-genome-ux-v2' as const;
/** The result step every run ends with when all its pages are fresh; the materialize step follows it. */
export const GENOME_UX_DONE_PLAN_ID = 'genomeUx-done' as const;
export const GENOME_UX_MATERIALIZE_PLAN_ID = 'genomeUx-materialize' as const;

export type GenomeUxDevice = 'desktop' | 'mobile';
export const GENOME_UX_DEVICES: readonly GenomeUxDevice[] = ['desktop', 'mobile'];

/** A file in the Studio stor (same shape as `Ns5FileInfo`). */
export interface GenomeUxFileInfo { project: number; level: number; folder: string; shortName: string; extension: string }

// ─── entry ─────────────────────────────────────────────────────────────────────

/**
 * The agent entry, a JSON object (optionally after `@@agentGenomeUx`):
 * `{ module, layout: N, pages?: string[], materialize?: boolean, force?: boolean }`.
 * `pages` limits the run (empty = every page11 page of the module); `force` regenerates even fresh pages.
 */
export interface GenomeUxEntry { module: string; layout: number; pages: string[]; materialize: boolean; force: boolean }
export type GenomeUxEntryResult = { kind: 'run'; entry: GenomeUxEntry } | { kind: 'refusal'; diagnostic: string };

const MODULE = /^[a-z][A-Za-z0-9]{0,59}$/u;
const PAGE_ID = /^[a-z][A-Za-z0-9_]{0,59}$/u;
export const GENOME_UX_USAGE = '@@agentGenomeUx {"module":"<lowerCamel>","layout":N,"pages":["<pageId>"],"materialize":true} — N from 2 to 9 (UX 1 is page11).';

/** `_102047_/l2/m/web/desktop/page11/foo.defs.ts`, `foo.ts` or `foo` → `foo`. */
export function genomeUxPageShortName(value: string): string {
  return (value.split('/').pop() ?? '').replace(/\.defs\.ts$/u, '').replace(/\.ts$/u, '');
}

export function parseGenomeUxEntry(value: string): GenomeUxEntryResult {
  const text = String(value || '').replace(/@@\s*(?:_102020_\/l2\/aura\/agentGenomeUx\/)?agentGenomeUx/giu, ' ').trim();
  let raw: unknown;
  try { raw = JSON.parse(text || '{}'); } catch { return { kind: 'refusal', diagnostic: `GENOME_UX_ENTRY_JSON: the entry must be a JSON object. ${GENOME_UX_USAGE}` }; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'refusal', diagnostic: `GENOME_UX_ENTRY_JSON: the entry must be a JSON object. ${GENOME_UX_USAGE}` };
  const row = raw as Record<string, unknown>;
  const unknown = Object.keys(row).find(key => !['module', 'layout', 'pages', 'materialize', 'force'].includes(key));
  if (unknown) return { kind: 'refusal', diagnostic: `GENOME_UX_ENTRY_KEY: unknown key ${unknown}. ${GENOME_UX_USAGE}` };
  const module = typeof row.module === 'string' ? row.module.trim() : '';
  if (!MODULE.test(module)) return { kind: 'refusal', diagnostic: `GENOME_UX_ENTRY_MODULE: module must be lowerCamel, without a path. ${GENOME_UX_USAGE}` };
  const layout = typeof row.layout === 'string' && /^\d+$/u.test(row.layout) ? Number(row.layout) : row.layout;
  if (typeof layout !== 'number' || !Number.isInteger(layout) || layout < 2 || layout > 9) return { kind: 'refusal', diagnostic: `GENOME_UX_ENTRY_LAYOUT: layout must be an integer from 2 to 9 (UX 1 is page11). ${GENOME_UX_USAGE}` };
  if (row.pages !== undefined && !Array.isArray(row.pages)) return { kind: 'refusal', diagnostic: `GENOME_UX_ENTRY_PAGES: pages must be a list of page ids. ${GENOME_UX_USAGE}` };
  const pages = [...new Set(((row.pages as unknown[] | undefined) ?? []).filter((item): item is string => typeof item === 'string' && !!item).map(genomeUxPageShortName))];
  if (pages.some(page => !PAGE_ID.test(page))) return { kind: 'refusal', diagnostic: `GENOME_UX_ENTRY_PAGES: pages must be page ids. ${GENOME_UX_USAGE}` };
  for (const key of ['materialize', 'force'] as const) {
    if (row[key] !== undefined && typeof row[key] !== 'boolean') return { kind: 'refusal', diagnostic: `GENOME_UX_ENTRY_${key.toUpperCase()}: ${key} must be a boolean. ${GENOME_UX_USAGE}` };
  }
  return { kind: 'run', entry: { module, layout, pages, materialize: row.materialize === true, force: row.force === true } };
}

/** UX N → `page{N}1`. */
export function genomeUxGenome(layout: number): string {
  if (!Number.isInteger(layout) || layout < 2 || layout > 9) throw new Error(`GENOME_UX_LAYOUT: ${layout}`);
  return `page${layout}1`;
}

// ─── paths ─────────────────────────────────────────────────────────────────────

export function genomeUxPage11Info(project: number, module: string, pageId: string, device: GenomeUxDevice): GenomeUxFileInfo {
  return { project, level: 2, folder: `${module}/web/${device}/page11`, shortName: pageId, extension: '.defs.ts' };
}
/** The page's data contract (row types and routes): `l2/<module>/web/contracts/<page>.defs.ts`. */
export function genomeUxContractInfo(project: number, module: string, pageId: string): GenomeUxFileInfo {
  return { project, level: 2, folder: `${module}/web/contracts`, shortName: pageId, extension: '.defs.ts' };
}
/** The page's shared defs (states and the organisms they feed): `l2/<module>/web/shared/<page>.defs.ts`. */
export function genomeUxSharedInfo(project: number, module: string, pageId: string): GenomeUxFileInfo {
  return { project, level: 2, folder: `${module}/web/shared`, shortName: pageId, extension: '.defs.ts' };
}
export function genomeUxVariantInfo(project: number, module: string, pageId: string, device: GenomeUxDevice, genome: string): GenomeUxFileInfo {
  return { project, level: 2, folder: `${module}/web/${device}/${genome}`, shortName: pageId, extension: '.defs.ts' };
}
/** The fileReference a variant defs carries (and the materializer checks): `_<p>_/l2/<m>/web/<device>/<genome>/<page>.defs.ts`. */
export function genomeUxVariantReference(project: number, module: string, pageId: string, device: GenomeUxDevice, genome: string): string {
  return `_${project}_/l2/${module}/web/${device}/${genome}/${pageId}.defs.ts`;
}
/** Everything the agent owns in a module: `l2/<module>/pipeline/agentGenomeUx/<genome>/`. */
export function genomeUxOwnedFolder(module: string, genome: string): string {
  return `${module}/pipeline/agentGenomeUx/${genome}`;
}
/** The receipt of one page: `l2/<module>/pipeline/agentGenomeUx/<genome>/<pageId>.json`. */
export function genomeUxReceiptInfo(project: number, module: string, genome: string, pageId: string): GenomeUxFileInfo {
  return { project, level: 2, folder: genomeUxOwnedFolder(module, genome), shortName: pageId, extension: '.json' };
}
/** The raw LLM answers: `l2/<module>/pipeline/agentGenomeUx/<genome>/responses/<pageId>-<stage>-<attempt>.json`. */
export function genomeUxResponsesFolder(module: string, genome: string): string {
  return `${genomeUxOwnedFolder(module, genome)}/responses`;
}

/** `_102020_/l4/collabux/templates/<category>/<file>.md` → its stor file, or null when the path is not a `.md` file reference. */
export function genomeUxTemplateInfo(templatePath: string): GenomeUxFileInfo | null {
  const match = /^\/?_(\d+)_\/l(\d)\/(.+)\/([^/]+)\.md$/u.exec(String(templatePath || '').trim());
  if (!match || match[3].split('/').some(part => !part || part === '..')) return null;
  return { project: Number(match[1]), level: Number(match[2]), folder: match[3], shortName: match[4], extension: '.md' };
}

// ─── template ──────────────────────────────────────────────────────────────────

/**
 * The template of the page in UX N: `layouts[N].templates.pages["<module>/<page>"]` when the UX chose one,
 * the page11 `template.category` otherwise (phase 1, helpers/uxTemplates.ts).
 */
export function genomeUxEffectiveTemplate(layout: IUxLayout | null | undefined, module: string, pageId: string, page11Template: string): { path: string; isDefault: boolean } {
  const chosen = getPageTemplate(layout, uxPageKey(module, pageId));
  return chosen ? { path: chosen, isDefault: chosen === page11Template } : { path: page11Template, isDefault: true };
}

/** `useMolecules` of `layouts[N]`; an absent key means true. */
export function genomeUxUseMolecules(layout: IUxLayout | null | undefined): boolean {
  return layout?.useMolecules !== false;
}

/**
 * The experience name written in `template.experience`: the experienceIndex entry of that file, else the page11
 * experience when the template is the page11 one, else the file name when it is not a legacy `pageNN.md`.
 */
export function genomeUxExperience(templatePath: string, index: IUxExperienceIndex | null | undefined, page11: { category: string; experience: string }): string | null {
  for (const entries of Object.values(index?.categories ?? {})) {
    if (!Array.isArray(entries)) continue;
    const entry = entries.find(item => item && typeof item.file === 'string' && uxTemplatePath(item.file) === templatePath);
    if (entry?.experience) return entry.experience;
  }
  if (templatePath === page11.category && page11.experience) return page11.experience;
  const name = genomeUxTemplateInfo(templatePath)?.shortName ?? '';
  return name && !/^page\d\d$/u.test(name) ? name : null;
}

// ─── rules ─────────────────────────────────────────────────────────────────────

export interface GenomeUxRules { axes: Record<string, string>; prefer: string[]; forbid: string[] }
export type GenomeUxRulesResult =
  | { kind: 'none' }
  | { kind: 'rules'; rules: GenomeUxRules; problems: string[] }
  | { kind: 'error'; message: string };

/**
 * The `## Molecule rules` of a template (phase 2, helpers/templateRules.ts). A legacy `pageNN.md` (or a bespoke
 * page, `markdown` null) has none: no restriction. `problems` are the validator's findings against the catalog
 * group ids (when given); they do not stop the run — `forbid` is applied as written.
 */
export function genomeUxRules(markdown: string | null, groupIds?: readonly string[]): GenomeUxRulesResult {
  if (markdown === null) return { kind: 'none' };
  const extracted = extractTemplateRules(markdown);
  if (extracted.kind !== 'rules') return extracted;
  const raw = extracted.rules as { axes?: unknown; groups?: { prefer?: unknown; forbid?: unknown } } | null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'error', message: 'the rules must be a JSON object' };
  const list = (value: unknown): string[] | null => Array.isArray(value) && value.every(item => typeof item === 'string') ? [...new Set(value as string[])] : value === undefined ? [] : null;
  const prefer = list(raw.groups?.prefer);
  const forbid = list(raw.groups?.forbid);
  if (!prefer || !forbid) return { kind: 'error', message: 'groups.prefer and groups.forbid must be lists of group ids' };
  const axes: Record<string, string> = {};
  if (raw.axes && typeof raw.axes === 'object' && !Array.isArray(raw.axes)) {
    for (const [axis, axisValue] of Object.entries(raw.axes as Record<string, unknown>)) if (typeof axisValue === 'string') axes[axis] = axisValue;
  }
  const problems = groupIds ? validateTemplateRules(extracted.rules, undefined, groupIds) : [];
  return { kind: 'rules', rules: { axes, prefer, forbid }, problems };
}

/** `groupviewtable--ml-data-table` → `groupviewtable` (the group, lower case). */
export function genomeUxTagGroup(tag: string): string {
  const at = tag.indexOf('--');
  return (at < 0 ? tag : tag.slice(0, at)).toLowerCase();
}

/** Whether a group id (`groupViewTable`) or a tag (`groupviewtable--ml-x`) falls in `forbid`, ignoring case. */
export function genomeUxForbidden(groupOrTag: string, forbid: readonly string[]): boolean {
  const group = genomeUxTagGroup(groupOrTag);
  return forbid.some(item => item.toLowerCase() === group);
}
