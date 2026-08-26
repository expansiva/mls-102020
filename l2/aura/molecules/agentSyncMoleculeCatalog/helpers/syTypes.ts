/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.ts" enhancement="_blank"/>

// Types, constants and small pure helpers of agentSyncMoleculeCatalog. No I/O, no mls.* access — see
// flow.json and spec.md for the design record (analysis: the molecule-catalog analysis for this
// agent, on the author's machine — never cited by path here, per the invariant this project ships to
// other developers through the Studio).
//
// Plumbing that already exists is imported, not restated: intents and l4 mechanics come from
// agentNewMolecule2/helpers (nmSteps, nmFs), the same way agentChooseMolecules reuses them.

export const SY_AGENT_NAME = 'agentSyncMoleculeCatalog';
export const SY_AGENT_FOLDER = 'aura/molecules/agentSyncMoleculeCatalog';
export const SY_AGENT_PROJECT = 102020;

/** Fixed planIds. The s1/s3 steps are one per group — see syGroupPlanId / syIndexTsPlanId. */
export const SY_PLAN_S2 = 's2-project';
export const SY_PLAN_S4 = 's4-report';

/** The shared reference-table renderer's import specifier — see shared/indexReferenceTable.ts. */
export const SY_SHARED_TABLE_IMPORT = '/_102020_/l2/aura/molecules/shared/indexReferenceTable.js';

/** The folder spelling of a group: the catalog publishes 'groupSelectOne', the folder is lowercase. */
export function syGroupFolder(groupName: string): string {
  return (groupName || '').trim().toLowerCase();
}

export function syGroupPlanId(groupName: string): string {
  return `s1-${syGroupFolder(groupName)}`;
}

/**
 * 's2-project' -> 's2-done'. Same convention as the rest of the family (nmDoneAnchor / chDoneAnchor).
 *
 * ⚠️ NOT USABLE FOR THE s1 GROUP STEPS — splitting on '-' would give every group's step the same
 * 's1-done' anchor, so s2 (which dependsOn every s1) would unlock as soon as the FIRST group finished.
 * Use syGroupDoneAnchor for those (same reasoning as chGroupDoneAnchor).
 */
export function syDoneAnchor(planId: string): string {
  return `${planId.split('-')[0]}-done`;
}

export function syGroupDoneAnchor(groupName: string): string {
  return `${syGroupPlanId(groupName)}-done`;
}

export function syIndexTsPlanId(groupName: string): string {
  return `s3-${syGroupFolder(groupName)}`;
}

export function syIndexTsDoneAnchor(groupName: string): string {
  return `${syIndexTsPlanId(groupName)}-done`;
}

// ---- what the catalog is made of, once discovered/extracted ----

/** Axis -> value, only for axes that VARY between the siblings of a group (§6.2 of the analysis). */
export type SyLayoutAxes = Record<string, string>;

export interface SyMoleculeEntry {
  /** The real `@customElement(...)` tag, group-prefixed: 'groupenternumber--ml-number-input'. */
  tag: string;
  /** The stor short name of the molecule's own files, group prefix aside: 'ml-number-input'. */
  shortName: string;
  /** Only the axes that vary AND that this molecule's own layoutConfig defines. Omitted when none. */
  layout?: SyLayoutAxes;
  /** The import reference of the molecule's own .defs.ts, or null when it has none (out of contract). */
  defsRef: string | null;
  /** The full `# Objective` text, or null when defsRef is null (nothing to read). */
  objective: string | null;
}

export interface SyScenario {
  scenario: string;
  /** Full prefixed tags, in this group only — a recommendation naming another group's tag is dropped. */
  recommended: string[];
}

// ---- discovery (syDiscover) ----

export interface SyDiscoveredGroup {
  /** Lowercase folder name, as it exists on disk under l2/molecules/. */
  folder: string;
  /** skills/index.ts spelling (canonical casing), or '' when the group has no entry there. */
  canonical: string;
  /** skills/index.ts description, verbatim, or '' when the group has no entry there. */
  purpose: string;
  usageContract: string;
}

export interface SyIgnoredGroup {
  folder: string;
  reason: string;
}

export interface SyDiscoveryResult {
  matched: SyDiscoveredGroup[];
  ignored: SyIgnoredGroup[];
}

// ---- what the root leaves behind for every step to read (l4/agentSyncMoleculeCatalog/<runKey>/input.json) ----

export interface SyRunInput {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  /** The mention, after stripping the agent's own '@@name' prefix. */
  mentionRaw: string;
  wantsAll: boolean;
  /**
   * True when the mention matched a recognized index.ts phrase (G2). ⚠️ Since E8, this does NOT gate
   * whether index.ts is touched — migration (G3) fires automatically, no opt-in needed, because it is
   * deterministic and safe (flow.json `decisions.migrationIsAutomatic`). It still feeds s4's honesty
   * obligation for a G1 group (creation), which is not built in this version regardless of the request.
   */
  includeIndexTsRequested: boolean;
  /** Canonical names of the groups this run actually generates, alphabetical by folder. */
  matchedGroups: string[];
  /** G3 (todo §1): index.ts exists and still has the pre-migration code table. Migrated automatically. */
  indexTsMigrationGroups: string[];
  /** G1 (todo §1): no index.ts at all. E8b (creation, LLM) is not built in this version — todo §6 step 7. */
  indexTsCreationGroups: string[];
  /** Ignored in a batch run (D4) — not requested by name, or requested via 'all'. */
  ignoredGroups: SyIgnoredGroup[];
  /** Named explicitly, but this project ignores them too — same reason, same D4 outcome. */
  requestedButIgnoredGroups: SyIgnoredGroup[];
  /** Named in the mention, but no project folder answers to it. Reported by s4, never thrown (see `refusal`). */
  unknownGroups: string[];
  /**
   * EVERY group of the project that has a skills/index.ts entry — not just this run's targets.
   *
   * ⚠️ WHY THIS EXISTS. s2 rewrites l2/molecules/skill.ts WHOLE, and level 1 must list every group the
   * project has. Building it from `matchedGroups` alone meant a targeted run ('atualizar grupo X')
   * silently DELETED every other group from level 1 — and a group missing from level 1 is unreachable
   * by the consumer, which is the exact failure the catalog pilot measured as fatal (it refuses at the
   * door what the level below could serve). s2 now reads this list and falls back to each group's own
   * index.defs.ts for the ones this run did not regenerate.
   */
  catalogGroups: SyDiscoveredGroup[];
  /**
   * Set when the run has NOTHING to generate — bad mention syntax, only unknown group names, or no
   * eligible group at all. The run still happens: it plants s4 alone, which reports this in the summary.
   *
   * ⚠️ It is NOT thrown. A throw inside beforePromptImplicit reaches no one: the platform's
   * executeBeforePromptStream has no try/catch around that hook, so the error lands as an uncaught
   * promise rejection in the browser console and the user sees an empty screen. Measured 2026-08-26 on
   * a real Studio run.
   */
  refusal?: string;
}

// ---- what s1 leaves behind for s2/s4 to read (l4/agentSyncMoleculeCatalog/<runKey>/s1-<folder>.json) ----

export interface SyGroupArtifact {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  folder: string;
  canonical: string;
  purpose: string;
  usageContract: string;
  /** Short tags ('ml-card-selector', no group prefix), alphabetical — what skill.ts lists per group. */
  moleculeShortTags: string[];
  /** Tags (full, prefixed) with no .defs.ts — reported so the human knows what is out of contract. */
  moleculesWithoutDefs: string[];
  scenarioCount: number;
  /**
   * The path the platform will serve index.defs.ts from, or '' when it could not be cached. Recorded
   * because a module that is written and compiled but NOT cached fails only later, in the page, with a
   * fetch error — the run itself looks perfectly successful (measured 2026-08-26, twice).
   */
  cachedAs?: string;
  cacheError?: string;
  scenariosSource: 'harvested' | 'preserved-existing' | 'empty-no-source';
  indexDefsFile: string;
  indexHtmlFile: string;
}

// ---- what s2 leaves behind for s4 to read (l4/agentSyncMoleculeCatalog/<runKey>/s2-project.json) ----

export interface SyProjectArtifact {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  groupCount: number;
  moleculeCount: number;
  skillFile: string;
}

// ---- what s3 leaves behind for s4 to read (l4/agentSyncMoleculeCatalog/<runKey>/s3-<folder>.json) ----

export interface SyIndexTsArtifact {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  folder: string;
  canonical: string;
  status: 'migrated' | 'failed';
  /** Set when status is 'failed' — why the migration did not apply. */
  reason?: string;
  indexTsFile: string;
}
