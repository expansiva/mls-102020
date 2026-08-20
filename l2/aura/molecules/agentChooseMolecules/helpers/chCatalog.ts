/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.ts" enhancement="_blank"/>

// Reading the catalog, and the l4 paths of a run. The ONLY module here that touches the disk — every
// gate and the report renderer are pure and are fed from what this one reads.
//
// ⚠️ THE GESTURE IS agentImproveMolecule2's readGroupSkill (imResolve.ts:261): `await import(reference)`
// and take the exported string. Validating that this works for the catalog of §10 is half of what the
// pilot is for, so it is used exactly as it stands rather than reinvented — what is added here is the
// STRUCTURED part of the module (groups, molecules, scenarios), which the gates need and a skill string
// cannot give.
//
// ⚠️ THE CATALOG BELONGS TO THE ACTIVE PROJECT, never to a hardcoded 102040. `mls.actualProject` is what
// nmDestProject() returns, so the probe reads whichever project it runs in — which is also why the
// pilot's mls-102040-temp needs no special case: uploaded to the Studio it IS the active project.
//
// ⚠️ AND `await import()` ALONE IS NOT ENOUGH, measured on the first Studio run (2026-08-19). A dynamic
// import is served from the PUBLISHED project — `https://on.collab.codes/_102040_/...` — so level 1
// imported fine and every level 2 died on 'Failed to fetch dynamically imported module': the group
// catalogs existed in the editor and had never been published. The read is therefore a ladder, and which
// rung answered is RECORDED (`via`), because it is a finding about the §10 design and not an incident: a
// generated catalog is unreadable by any consumer until it is published, and a consumer running outside
// the editor has only the first rung.

import { nmDestProject, nmFileExists, readStorText, type NmFileInfo } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import {
  CH_AGENT_FOLDER,
  CH_AGENT_PROJECT,
  ChCatalogVia,
  chFileRefFromImport,
  chGroupFolder,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

// ---- agent-owned files (prompt.md, schemas) in the 102020 agent folder ----

export function chAgentFile(folder: string, shortName: string, extension: string): NmFileInfo {
  const sub = folder ? `${CH_AGENT_FOLDER}/${folder}` : CH_AGENT_FOLDER;
  return { project: CH_AGENT_PROJECT, level: 2, folder: sub, shortName, extension };
}

export async function readChAgentText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(chAgentFile(folder, shortName, extension), required);
}

// ---- l4 work artifacts of one run ----

export function chWorkFile(runKey: string, shortName: string): NmFileInfo {
  return { project: nmDestProject(), level: 4, folder: `agentChooseMolecules/${runKey}`, shortName, extension: '.json' };
}

export const chInputFileInfo = (runKey: string): NmFileInfo => chWorkFile(runKey, 'input');
export const chGroupsFileInfo = (runKey: string): NmFileInfo => chWorkFile(runKey, 'c1-groups');
export const chRunFileInfo = (runKey: string): NmFileInfo => chWorkFile(runKey, 'run');

export function chGroupArtifactFileInfo(runKey: string, groupName: string): NmFileInfo {
  return chWorkFile(runKey, `c2-${chGroupFolder(groupName)}`);
}

export function chTraceFileInfo(runKey: string, planId: string, attempt: number): NmFileInfo {
  return chWorkFile(runKey, `trace-${planId}-${String(attempt).padStart(2, '0')}`);
}

/** The prompt-size measurement of one attempt — written by beforePromptStep, before the call. */
export function chPromptSizeFileInfo(runKey: string, planId: string, attempt: number): NmFileInfo {
  return chWorkFile(runKey, `prompt-${planId}-${String(attempt).padStart(2, '0')}`);
}

// ---- level 1: which groups the active project publishes ----

export interface ChCatalogGroup {
  name: string;
  molecules: number;
  /** The import reference of the group's level 2. Published by level 1; never built here. */
  indexDefs: string;
}

export interface ChLevel1 {
  reference: string;
  groups: ChCatalogGroup[];
  skill: string;
  theme: string | null;
  via: ChCatalogVia;
}

export function chLevel1FileInfo(): NmFileInfo {
  return { project: nmDestProject(), level: 2, folder: 'molecules', shortName: 'skill', extension: '.ts' };
}

export function chLevel1Reference(): string {
  return `/_${nmDestProject()}_/l2/molecules/skill`;
}

export async function readChLevel1(): Promise<{ level1: ChLevel1 | null; error: string }> {
  const reference = chLevel1Reference();
  // Checked before importing: a missing catalog must reach the user as one readable line, not as a
  // module-resolution exception thrown from inside a hook.
  if (!nmFileExists(chLevel1FileInfo())) {
    return { level1: null, error: `the project has no molecule catalog: l2/molecules/skill.ts not found (expected at ${reference})` };
  }
  const imported = await importCatalogModule(reference);
  if (!imported.mod || !imported.via) return { level1: null, error: imported.error };

  const mod = imported.mod as { groups?: unknown; skill?: unknown; theme?: unknown };
  const groups = normalizeGroups(mod.groups);
  const skill = typeof mod.skill === 'string' ? mod.skill : '';
  if (!groups.length) return { level1: null, error: `${reference} publishes no group — nothing can be chosen from it` };
  if (!skill.trim()) return { level1: null, error: `${reference} exports no 'skill' text — level 1 is what the first call reads` };
  return {
    level1: { reference, groups, skill, theme: typeof mod.theme === 'string' ? mod.theme : null, via: imported.via },
    error: '',
  };
}

// ---- level 2: which molecules one group has ----

export interface ChMoleculeEntry {
  /** The published tag, group prefix included: 'groupselectone--ml-card-selector'. */
  tag: string;
  /** null marks a molecule with no .defs.ts — in the pilot, ml-table-multi-select. */
  defs: string | null;
}

export interface ChScenario {
  scenario: string;
  recommended: string[];
}

export interface ChGroupCatalog {
  reference: string;
  via: ChCatalogVia;
  group: string;
  usageContract: string;
  molecules: ChMoleculeEntry[];
  scenarios: ChScenario[];
  skill: string;
}

export async function readChGroupCatalog(reference: string): Promise<{ catalog: ChGroupCatalog | null; error: string }> {
  if (!reference) return { catalog: null, error: 'the group has no index.defs reference in level 1' };

  const imported = await importCatalogModule(reference);
  if (!imported.mod || !imported.via) return { catalog: null, error: imported.error };

  const mod = imported.mod as {
    group?: unknown;
    usageContract?: unknown;
    molecules?: unknown;
    scenarios?: unknown;
    skill?: unknown;
  };
  const molecules = normalizeMolecules(mod.molecules);
  const skill = typeof mod.skill === 'string' ? mod.skill : '';
  // The 26 groups outside the pilot are seeded as one-line stubs: they resolve, and they publish
  // nothing. Saying so beats "cannot read", which would point at the wrong problem.
  if (!molecules.length || !skill.trim()) {
    return { catalog: null, error: `${reference} has no catalog yet (no molecules or no 'skill' text) — this group is not part of the published catalog` };
  }
  return {
    catalog: {
      reference,
      via: imported.via,
      group: typeof mod.group === 'string' ? mod.group : '',
      usageContract: typeof mod.usageContract === 'string' ? mod.usageContract : '',
      molecules,
      scenarios: normalizeScenarios(mod.scenarios),
      skill,
    },
    error: '',
  };
}

// ---- the ladder: published module, then the same file compiled into the browser cache ----

interface ChImported {
  mod: Record<string, unknown> | null;
  via: ChCatalogVia | null;
  error: string;
}

/**
 * Rung 1 is `await import(reference)` — the gesture of readGroupSkill, and the ONLY one available to a
 * consumer that is not the editor. Rung 2 exists because of what the first Studio run measured: the file
 * was in the project, unpublished, and therefore unreachable by URL. `compileAndPostProcess(model, false,
 * true)` emits it into the browser cache (saveCache) and `AddMfileIfNeed` returns the url to import.
 *
 * Rung 2 has a side effect — it puts the compiled file in the local cache — and it is the platform's own
 * mechanism for exactly this, so nothing is written to the project and no source is touched.
 */
async function importCatalogModule(reference: string): Promise<ChImported> {
  let publishedError = '';
  try {
    return { mod: await import(reference) as Record<string, unknown>, via: 'published', error: '' };
  } catch (error) {
    publishedError = error instanceof Error ? error.message : String(error);
  }

  const ref = chFileRefFromImport(reference);
  if (!ref) return { mod: null, via: null, error: `'${reference}' is not a project reference (${publishedError})` };
  if (!nmFileExists(ref)) {
    return { mod: null, via: null, error: `${reference} does not exist in this project (${publishedError})` };
  }

  try {
    const storFile = mls.stor.files[mls.stor.getKeyToFile(ref)];
    const model = await storFile.getOrCreateModel() as mls.editor.IModelTS;
    await mls.l2.typescript.compileAndPostProcess(model, false, true);
    const compileErrors = model.compilerResults?.errors || [];
    if (compileErrors.length) {
      return { mod: null, via: null, error: `${reference} exists in this project but does not compile (${compileErrors.length} error(s)), so nothing can read it` };
    }
    const cacheUrl = await mls.stor.cache.AddMfileIfNeed(model);
    if (!cacheUrl) throw new Error('the local cache returned no url for it');
    return { mod: await import(cacheUrl) as Record<string, unknown>, via: 'local-cache', error: '' };
  } catch (error) {
    const cacheError = error instanceof Error ? error.message : String(error);
    return {
      mod: null,
      via: null,
      error: [
        `${reference} exists in this project but could not be read.`,
        `The published project does not serve it (${publishedError}) and the local cache could not either (${cacheError}).`,
        'SAVE AND PUBLISH the file: a dynamic import is served from the published project, not from the editor.',
      ].join(' '),
    };
  }
}

// ---- normalizers: the catalog is generated code, so shape is checked and never assumed ----

function normalizeGroups(value: unknown): ChCatalogGroup[] {
  if (!Array.isArray(value)) return [];
  const out: ChCatalogGroup[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const indexDefs = typeof item.indexDefs === 'string' ? item.indexDefs.trim() : '';
    if (!name || !indexDefs) continue;
    out.push({ name, molecules: typeof item.molecules === 'number' ? item.molecules : 0, indexDefs });
  }
  return out;
}

function normalizeMolecules(value: unknown): ChMoleculeEntry[] {
  if (!Array.isArray(value)) return [];
  const out: ChMoleculeEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const tag = typeof item.tag === 'string' ? item.tag.trim() : '';
    if (!tag) continue;
    out.push({ tag, defs: typeof item.defs === 'string' && item.defs.trim() ? item.defs.trim() : null });
  }
  return out;
}

function normalizeScenarios(value: unknown): ChScenario[] {
  if (!Array.isArray(value)) return [];
  const out: ChScenario[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const scenario = typeof item.scenario === 'string' ? item.scenario.trim() : '';
    if (!scenario) continue;
    const recommended = Array.isArray(item.recommended)
      ? item.recommended.filter((tag): tag is string => typeof tag === 'string')
      : [];
    out.push({ scenario, recommended });
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
