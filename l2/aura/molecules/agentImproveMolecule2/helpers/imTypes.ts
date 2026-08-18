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
  'i2a-definition',
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
 * A: the DEFINITION changes → checkpoint, then edit the contract and the code in place.
 * B: a MINOR change → edit in place.
 * C: an inherited SHELL whose fix needs the parent → its own clarification.
 * D: out of scope → readable failure, nothing written.
 * E: a DERIVED artifact is broken or missing → regenerate it, without touching the molecule.
 *
 * ⚠️ WHY E EXISTS, and why it stops at the derived artifacts (2026-08-18). Asked "the playground was
 * not generated", every route was wrong: B runs the editor, which writes only defs/ts/less; A needs the
 * definition to move, and it does not; D would refuse work the agent can plainly do. The playground and
 * the group index are DERIVED — given the molecule's surface there is a correct form, which is why i5
 * and i6 can produce them at all. Regenerating them is well defined.
 *
 * The `.less`, the `.ts` and the `.defs.ts` are AUTHORED: regenerating them means discarding decisions
 * nobody can recover, which is the same argument that stopped route A from being a rebuild. "Update the
 * .less" is already route B — a targeted edit — and creating one that is missing already works
 * (IM_CREATABLE_ARTIFACTS, and route C's `less` outcome).
 */
export type ImRoute = 'A' | 'B' | 'C' | 'D' | 'E';

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
   * methods before lifecycle hooks before render(). The clarification uses this order to steer away
   * from render().
   */
  overridableMembers: ImOverridable[];
  /**
   * What the shell CANNOT reach, and why. Reads `[]` when the parent source is not readable from
   * here (and on a context.json written before 2026-08-13).
   */
  unreachableMembers: ImUnreachable[];
}

export interface ImOverridable {
  name: string;
  kind: 'property' | 'method';
  /** Lower is cheaper to override. render() is always the most expensive. */
  cost: number;
  /**
   * Can an override of this member actually CARRY a change, or only compile?
   *
   * A property always can — an override assigns a value. A method can only when its body does not
   * depend on `private` members of the parent: a subclass cannot call those, so reproducing the
   * behaviour would mean reimplementing it, which the shell is explicitly forbidden to do.
   *
   * ⚠️ MEASURED 2026-08-14, and it is why this field exists. Across the 154 base molecules of
   * mls-102040, agentNewMolecule2 declares every render helper `private`. The result is that of the
   * 84 shells in the library, NONE has a member it could usefully override: `disconnectedCallback`
   * calls a private timer helper, `getPortalTemplate` composes private renderers, and `render`
   * assembles private sections. Offering those is offering a trap — on 2026-08-13 the model picked
   * the cheapest of them, `disconnectedCallback`, to change a timer duration it cannot reach.
   *
   * Reads `true` when the parent source could not be read: with nothing measured, refusing every
   * member would leave the user unable to answer a question they were still asked.
   *
   * **Optional, and absent means NOT MEASURED — never "incapable".** A `context.json` written before
   * 2026-08-14 carries none, and reading that as "nothing can be overridden" would retro-actively
   * disable the choice on every older run. Always test it through `isCapableMember`.
   */
  capable?: boolean;
}

/**
 * A member of the parent that exists and that no subclass can override, with the reason.
 *
 * ⚠️ WHY THIS LIST EXISTS — 2026-08-13, measured in the Studio. On `ml-copy-button` every method of
 * the copy-confirmation cycle is `private` and the duration is a module-scope `const`, so
 * `overridableMembers` came back with `render` and `disconnectedCallback` only. Asked to make the
 * confirmation last 3 seconds, the model suggested overriding `disconnectedCallback` — a teardown
 * hook that cannot change a duration — because it was the cheapest of what it had been shown.
 *
 * The filter was SILENT: nothing told the model that the members which DO implement the behaviour
 * exist and are out of reach, so it could not draw the conclusion that follows from it — that no
 * override in the shell can express the change, and the fix belongs to the base.
 */
export interface ImUnreachable {
  name: string;
  why: 'private' | 'module-constant';
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
  /**
   * The contract that GOVERNS this molecule, and where it came from.
   *
   * For a normal molecule it is its own .defs.ts. For a shell with no .defs.ts of its own it is the
   * PARENT's — a shell changes appearance, not promises, so the parent's contract is the molecule's
   * contract. The steps render `source` and say which of the two it is; nothing downstream has to
   * know the rule.
   */
  contract: {
    source: string;
    reference: string;
    inherited: boolean;
  };
}

export interface ImTriage {
  route: ImRoute;
  rationale: string;
  /** Only artifacts present in context.artifacts may be named here — the i2 gate enforces it. */
  expectedArtifacts: ImArtifactKind[];
  /**
   * Route A only, and non-empty there — the i2 gate enforces both. The slots, properties or events
   * whose change forces existing markup to be rewritten.
   *
   * It is a STARTING POINT for the i2a-definition checkpoint, not an instruction: it was written
   * before anything measured the molecule's current surface, so an element named here may already
   * exist. The definition gate checks each one against the surface and the model is told to drop it.
   */
  definitionElements?: string[];
}

/**
 * Route C's answer. 'parent' is NOT executable: the agent only writes in the current project
 * (flow.json.conventions.targetProject), so choosing it ends the run with an instruction.
 */
export interface ImInheritChoice {
  where: 'less' | 'override' | 'parent';
  member?: string;
}

/** The three things a consumer of a molecule ever writes, and therefore the whole public surface. */
export type ImDefinitionKind = 'slot' | 'property' | 'event';
export type ImDefinitionOp = 'add' | 'remove' | 'rename';

/**
 * ONE movement of the public surface, as the human confirms it on route A.
 *
 * The checkpoint shows a DELTA, never a rewritten contract: "slot `Footer` will be ADDED" is a thing
 * a person can weigh in a second, and forty lines of regenerated skill text is not. The `.defs.ts`
 * sentence that says it is written afterwards by i3-edit, instructed by this.
 */
export interface ImDefinitionChange {
  kind: ImDefinitionKind;
  op: ImDefinitionOp;
  /** On `rename`, the NEW name. */
  name: string;
  /** On `rename` only, and it must differ from `name`. */
  previousName?: string;
  /** One line in the user's language: what it is for. It is what the human weighs and what i3 writes to. */
  purpose: string;
}

/** What the human confirmed at the route A checkpoint. Written to `definition.json`. */
export interface ImDefinitionDecision {
  changes: ImDefinitionChange[];
  confirmedAt: string;
  /**
   * The change cannot be made at all: it needs a name the GROUP contract does not declare, and that
   * file is edited by hand. `changes` is empty and nothing is written — the run ends with the
   * instruction, exactly like route C's `parent` outcome.
   *
   * ⚠️ MEASURED 2026-08-17, and it is the reason this field exists. Asked to "define the label by
   * attribute" on `ml-kpi-indicator`, the model answered `changes: []` with the reason "no element can
   * be proposed until the group contract declares this property" — the correct answer, and the prompt
   * had told it so in as many words. The gate then refused it with `no_change`, and on the retry the
   * model, forced to name something, proposed REMOVING the `Label` slot. Prose asked, code refused,
   * and the escalation was destructive.
   */
  blocked?: boolean;
  /** Why it is blocked, in the user's language. It IS the deliverable when nothing is written. */
  blockedReason?: string;
}

/**
 * The public surface as NAMES only — what the definition gate checks a proposed change against.
 *
 * `imSurface` returns the rich shape (properties carry their attribute and type); the gate only ever
 * asks "does this molecule declare a slot called Footer today", so it takes the flattened form and
 * stays pure and trivially testable.
 */
export interface ImSurfaceNames {
  slots: string[];
  properties: string[];
  events: string[];
}

/**
 * Which message set a widget's own chrome uses.
 *
 * ⚠️ Measured 2026-08-14: with `userLanguage: 'pt'` in the payload, the inheritance widget rendered
 * in English beside a title and a reason in Portuguese — the model's text obeyed the run and the
 * widget's did not. The base `getMessageKey` reads `document.documentElement.lang` and, with it
 * unset, returns the FIRST key of the map. The run measured the language at i0-classify and carries
 * it; preferring it is the whole fix. `fallback` is what the document said, for a run that recorded
 * nothing. Shared by every widget of this agent, so the defect is fixed in one place.
 */
export function imMessageKey(userLanguage: string | undefined, available: string[], fallback: string): string {
  const tag = (userLanguage || '').toLowerCase().split('-')[0];
  return available.includes(tag) ? tag : fallback;
}

export type ImCoherenceSeverity = 'preexisting' | 'introduced';

export interface ImCoherenceFinding {
  gate: 'defs-x-slottags-x-contract' | 'declared-x-used';
  severity: ImCoherenceSeverity;
  message: string;
  reference: string;
}

/**
 * REPORT ONLY — never blocks (the decision, and why, in spec.md §8). An improve run is when these are
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
