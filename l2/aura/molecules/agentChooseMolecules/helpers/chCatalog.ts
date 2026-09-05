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
// ⚠️ THE CATALOG IS NOT NECESSARILY IN THE ACTIVE PROJECT, and from 2026-08-20 it is looked up. The probe
// runs from the CLIENT project while the molecules live in a dependency: the base library, a theme project,
// or — after a molecule is copied — the client itself. So the search set is the active project plus its
// DIRECT dependencies, and exactly one catalog answers a run (helpers/chEntry.chChooseCatalog). Never a
// hardcoded 102040.
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
import {
  ChCatalogChoice,
  ChCatalogSelectedBy,
  chChooseCatalog,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chEntry.js';

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

/**
 * Is this run folder already claimed? Asked by the root, once, so a re-run of the same definition gets its
 * own folder instead of overwriting the previous report (helpers/chTypes.chUniqueRunKey).
 *
 * `input.json` is the marker because c1 writes it on attempt 1, before anything else in the folder: a run
 * that died before that wrote no measurement, so reusing its slug loses nothing.
 */
export function chRunKeyTaken(runKey: string): boolean {
  return nmFileExists(chInputFileInfo(runKey));
}
export const chGroupsFileInfo = (runKey: string): NmFileInfo => chWorkFile(runKey, 'c1-groups');
/**
 * The consolidated report of a run.
 *
 * ⚠️ NAMED report.json, NOT run.json (2026-08-21). A file called run.json in this folder was found holding a
 * TaskData dump — the platform's task, not this report, and not even of the same run as its folder. Whatever
 * writes it, the name is contested and this artifact is the one thing a run must not lose.
 */
export const chRunFileInfo = (runKey: string): NmFileInfo => chWorkFile(runKey, 'report');

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
  project: number;
  reference: string;
  groups: ChCatalogGroup[];
  skill: string;
  theme: string | null;
  via: ChCatalogVia;
}

export function chLevel1FileInfo(project: number): NmFileInfo {
  return { project, level: 2, folder: 'molecules', shortName: 'skill', extension: '.ts' };
}

export function chLevel1Reference(project: number): string {
  return `/_${project}_/l2/molecules/skill`;
}

export async function readChLevel1(project: number): Promise<{ level1: ChLevel1 | null; error: string }> {
  const reference = chLevel1Reference(project);
  const imported = await loadCatalogModule(reference);
  if (!imported.mod || !imported.via) return { level1: null, error: imported.error };

  const mod = imported.mod as { groups?: unknown; skill?: unknown; theme?: unknown };
  const groups = normalizeGroups(mod.groups);
  const skill = typeof mod.skill === 'string' ? mod.skill : '';
  if (!groups.length) return { level1: null, error: `${reference} publishes no group — nothing can be chosen from it` };
  if (!skill.trim()) return { level1: null, error: `${reference} exports no 'skill' text — level 1 is what the first call reads` };
  return {
    level1: { project, reference, groups, skill, theme: typeof mod.theme === 'string' ? mod.theme : null, via: imported.via },
    error: '',
  };
}

// ---- discovery: which project's catalog answers this run ----

export interface ChDiscovery extends ChCatalogChoice {
  activeProject: number;
  /** Declared dependencies of the active project: what its pages may import from. */
  directDeps: number[];
  /**
   * What mls.l5.getProjectDependencies resolves, recorded but NOT used to search.
   *
   * ⚠️ Two lists, on purpose. The docs of that API say "all unique project dependencies" and offer a
   * forceUpdate that "recalculates", which reads like the transitive closure — and transitive is wrong here:
   * a client that depends on a theme would be offered the base library's molecules through it. So the search
   * uses the DECLARED list (prj_dependencies, the same source libCommom.loadModuleFromProjectOrDependency
   * uses) and the resolved one is recorded so the difference is measured instead of assumed.
   */
  resolvedDeps: number[];
  /** Projects that have l2/molecules/skill.ts, in search order. */
  candidates: number[];
}

/**
 * The search set is [active project, ...direct dependencies] and the rule that picks one of them is pure
 * (chChooseCatalog). Scanning is a filter over mls.stor.files, the same gesture utils.resolveNewTag uses to
 * resolve a molecule tag across projects — no fetch.
 */
export async function discoverChCatalog(argProject: number | null): Promise<ChDiscovery> {
  const activeProject = nmDestProject();
  // A cold session may not have the dependencies' file index in memory yet, and without it every candidate
  // would look absent.
  try {
    await mls.stor.loadProjectdependenciesInfoIfNeed(activeProject);
  } catch {
    // Best effort: if it fails, the scan below simply sees whatever is loaded and the error names it.
  }

  const declared = mls.l5.getProjectDetails(activeProject)?.prj_dependencies;
  const resolvedDeps = mls.l5.getProjectDependencies(activeProject, false) || [];
  const directDeps = Array.isArray(declared) ? declared.filter(project => project !== activeProject) : resolvedDeps;

  const searchOrder = [activeProject, ...directDeps];
  const candidates = searchOrder.filter(project => nmFileExists(chLevel1FileInfo(project)));
  const choice = chChooseCatalog({ activeProject, argProject, candidates, directDeps });

  return { ...choice, activeProject, directDeps, resolvedDeps, candidates };
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
