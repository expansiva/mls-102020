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

/** Fixed planIds. The s1 steps are one per group — see syGroupPlanId. */
export const SY_PLAN_S2 = 's2-project';
export const SY_PLAN_S4 = 's4-report';

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
  /** True when the mention matched a recognized index.ts phrase (G2) — s3 does not exist yet (todo §9,
   * "pare depois do E7"), so this only feeds s4's honesty obligation: say the request was heard. */
  includeIndexTsRequested: boolean;
  /** Canonical names of the groups this run actually generates, alphabetical by folder. */
  matchedGroups: string[];
  /** Ignored in a batch run (D4) — not requested by name, or requested via 'all'. */
  ignoredGroups: SyIgnoredGroup[];
  /** Named explicitly, but this project ignores them too — same reason, same D4 outcome. */
  requestedButIgnoredGroups: SyIgnoredGroup[];
  /** Named in the mention, but no project folder answers to it — the run refuses before planting anything if this is non-empty. */
  unknownGroups: string[];
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
