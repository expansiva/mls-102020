/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.ts" enhancement="_blank"/>

// Reading the catalog, and the l4 paths of a run. The ONLY module here that touches the disk — every
// gate and the report renderer are pure and are fed from what this one reads.
//
// ⚠️ THE STOR IS READ FIRST, and the published module is the fallback. Inverted on 2026-08-19 after the
// first Studio run, for a reason that outlives the pilot: `await import(reference)` — the gesture of
// imResolve.readGroupSkill, which the pilot plan asked for — is served by the PUBLISHED project, so a
// catalog that exists in the editor and was never published is unreadable by it, and a published one that
// has unsaved edits is read STALE without saying so. Every other agent of this family reads the stor
// (nmFs), which is how agentNewMolecule2 writes a molecule and reads it back in the same run;
// readGroupSkill is the exception because it reads 102020's own published skills.
//
// The import stays as the second rung: it is the only one a consumer outside the editor has, and it needs
// no parser. Which rung answered is recorded per level (`via`).
//
// ⚠️ THE CATALOG BELONGS TO THE ACTIVE PROJECT, never to a hardcoded 102040. `mls.actualProject` is what
// nmDestProject() returns, so the probe reads whichever project it runs in — which is also why the
// pilot's mls-102040-temp needs no special case: uploaded to the Studio it IS the active project.
//
// ⚠️ AND THE FINDING BEHIND THAT ORDER IS ABOUT THE §10 DESIGN, not about this agent: a generated
// `index.defs.ts` is unreadable by any consumer until it is published. Publishing is part of generating a
// catalog, and the report says which rung answered so a run can never pass that off silently.

import { nmDestProject, nmFileExists, readStorText, type NmFileInfo } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import {
  CH_AGENT_FOLDER,
  CH_AGENT_PROJECT,
  ChCatalogVia,
  chFileRefFromImport,
  chGroupFolder,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { chExtractCatalogModule } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chExtract.js';

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
  const imported = await loadCatalogModule(reference);
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

  const imported = await loadCatalogModule(reference);
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
  // The 26 groups outside the pilot are one-line stubs: the file is there and says nothing. Saying that
  // beats "cannot read", which would point at the wrong problem.
  if (!molecules.length || !skill.trim()) {
    return { catalog: null, error: `${reference} has no catalog yet (no molecules or no 'skill' text) — this group is not part of the catalog of this project` };
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

// ---- the ladder: the stor first, the published module second ----

interface ChLoaded {
  mod: Record<string, unknown> | null;
  via: ChCatalogVia | null;
  error: string;
}

/**
 * Rung 1 is the STOR: the source of truth inside the editor, including content that was never published.
 * Its text is turned into values by the pure chExtract, which parses only what the gates need and
 * evaluates nothing.
 *
 * Rung 2 is `await import(reference)`, the published module — the only rung available to a consumer that
 * is not the editor, and the one that needs no parser.
 *
 * Failing both, the message says which rung failed how: a file absent from the project is a different
 * problem from a file that is present, unparseable and unpublished.
 */
async function loadCatalogModule(reference: string): Promise<ChLoaded> {
  const trace: string[] = [];
  const ref = chFileRefFromImport(reference);

  if (!ref) {
    trace.push(`'${reference}' is not a project reference`);
  } else if (!nmFileExists(ref)) {
    trace.push('it is not in this project');
  } else {
    const extracted = chExtractCatalogModule(await readStorText(ref, false));
    if (extracted.module) return { mod: extracted.module as Record<string, unknown>, via: 'stor', error: '' };
    trace.push(`the file in this project could not be read as a catalog (${extracted.error})`);
  }

  try {
    return { mod: await import(reference) as Record<string, unknown>, via: 'published', error: '' };
  } catch (error) {
    trace.push(`the published project does not serve it (${error instanceof Error ? error.message : String(error)})`);
  }

  return { mod: null, via: null, error: `${reference} could not be read: ${trace.join('; ')}.` };
}

// ---- normalizers: the catalog is generated code, so shape is checked and never assumed ----
//
// Both rungs pass through them. chExtract already returns typed arrays, so on the stor path they are a
// second guard; on the published path they are the only one, since a module can export anything.

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
