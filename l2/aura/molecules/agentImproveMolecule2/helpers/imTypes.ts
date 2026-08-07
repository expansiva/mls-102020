/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.ts" enhancement="_blank"/>

// Types and constants for agentImproveMolecule2. Pure — no I/O, no mls.* access.
//
// Everything about GENERATING artifact content is imported from agentNewMolecule2/helpers
// (nmTemplates, nmFs, nmTypes, nmLayoutAxes). This file only declares what is specific to
// CHANGING a molecule that already exists. See flow.json.principles.

export const IM_MAX_ATTEMPTS = 2;

/** The root agent. Steps find the root's own step (and its classification) by this name. */
export const IM_AGENT_NAME = 'agentImproveMolecule2';
export const IM_AGENT_FOLDER = 'aura/molecules/agentImproveMolecule2';
/** The agent lives in 102020 whatever project it is acting ON. */
export const IM_AGENT_PROJECT = 102020;

/** Artifacts a later step can CREATE when absent — i5-playground and i6-index do exactly that. */
export const IM_CREATABLE_ARTIFACTS: ImArtifactKind[] = ['less', 'html', 'groupIndex'];

export const IM_PLAN_IDS = [
  'i1-locate',
  'i2-triage',
  'i2a-rebuild-handoff',
  'i4-inherit',
  'i3-edit',
  'i5-playground',
  'i6-index',
  'i7-summary',
] as const;
export type ImPlanId = (typeof IM_PLAN_IDS)[number];

/**
 * 'i1-locate' -> 'i1-done'. Same anchor convention as agentNewMolecule2: downstream steps depend
 * ONLY on these anchors, never on a step id, so a route that never plants a step never deadlocks
 * a step in another route (flow.json.routes).
 */
export function imDoneAnchor(planId: ImPlanId): string {
  return `${planId.split('-')[0]}-done`;
}

/**
 * The routes of flow.json.routes. The tree is planted per route — only the chosen branch runs.
 *
 * A: the DEFINITION changes → rebuild through agentNewMolecule2.
 * B: a MINOR change → edit in place.
 * C: an inherited SHELL whose fix needs the parent → its own clarification.
 * D: out of scope → readable failure, nothing written.
 */
export type ImRoute = 'A' | 'B' | 'C' | 'D';

/** The four artifacts a molecule is made of, plus the group index that must follow the playground. */
export type ImArtifactKind = 'defs' | 'ts' | 'less' | 'html' | 'groupIndex';

export interface ImArtifact {
  kind: ImArtifactKind;
  /** `_<project>_/l2/molecules/<group>/<shortName>.<ext>` — the display/reference form. */
  reference: string;
  present: boolean;
  /** Content as read at i1-locate. Steps write a DELTA over this, never a fresh file. */
  source: string;
}

/**
 * What makes a molecule a SHELL: its class extends a molecule imported from ANOTHER project.
 *
 * Measured on 2026-08-06: 84 shells exist (42 in mls-102054, 42 in mls-102055) — 70 with an empty
 * body, 14 overriding a single property, ZERO overriding render(). That last number is why the
 * clarification of route C has to spell out the cost: a shell that overrides render() stops
 * inheriting every future fix from the base.
 */
export interface ImInheritance {
  isShell: boolean;
  /** '_102040_/l2/molecules/groupenternumber/ml-range-slider.ts' — null when not a shell. */
  parentReference: string | null;
  parentProject: number | null;
  parentClassName: string | null;
  /** Members the shell already declares. Empty body = the 70 pure-.less cases. */
  ownMembers: string[];
  /**
   * Members of the parent the shell COULD override, cheapest first: properties before narrow
   * methods before render(). The clarification uses this order to steer away from render().
   */
  overridableMembers: ImOverridable[];
}

export interface ImOverridable {
  name: string;
  kind: 'property' | 'method';
  /** Lower is cheaper to override. render() is always the most expensive. */
  cost: number;
}

export interface ImContext {
  schemaVersion: 1;
  createdAt: string;
  runKey: string;
  userPrompt: string;
  userLanguage: string;
  target: {
    project: number;
    groupFolder: string;
    groupCanonical: string;
    shortName: string;
    /** The single source of truth, exactly as in agentNewMolecule2. */
    fileReference: string;
    /** DERIVED from the path, never authored. */
    tag: string;
  };
  groupSkill: {
    description: string;
    reference: string;
    usageReference: string;
  };
  artifacts: ImArtifact[];
  inheritance: ImInheritance;
}

export interface ImTriage {
  route: ImRoute;
  rationale: string;
  /** Only artifacts present in context.artifacts may be named here — the i2 gate enforces it. */
  expectedArtifacts: ImArtifactKind[];
}

/**
 * Route C's answer. 'parent' is NOT executable: the agent only writes in the current project
 * (flow.json.conventions.targetProject), so choosing it ends the run with an instruction.
 */
export interface ImInheritChoice {
  where: 'less' | 'override' | 'parent';
  member?: string;
}

export type ImCoherenceSeverity = 'preexisting' | 'introduced';

export interface ImCoherenceFinding {
  gate: 'defs-x-slottags-x-contract' | 'declared-x-used';
  severity: ImCoherenceSeverity;
  message: string;
  reference: string;
}

/**
 * REPORT ONLY — never blocks (decision §8.2 of the analysis). An improve run is when these are
 * cheapest to fix, so the report is an opportunity; blocking on pre-existing debt would freeze the
 * agent on molecules nobody asked to repair.
 */
export interface ImCoherenceReport {
  findings: ImCoherenceFinding[];
  checkedAt: string;
}

export interface ImGateResult {
  ok: boolean;
  errors: string[];
}

export function imGateOk(): ImGateResult {
  return { ok: true, errors: [] };
}

export function imGateFail(...errors: string[]): ImGateResult {
  return { ok: false, errors: errors.filter(Boolean) };
}
