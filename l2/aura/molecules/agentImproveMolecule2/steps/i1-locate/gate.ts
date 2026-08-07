/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i1-locate/gate.ts" enhancement="_blank"/>

// Admission gate for the Improve Molecule 2 pipeline (pure — unit-testable).
// flow.json: NO retry here; failures are readable and immediate. Two entry points:
// - checkImClassification: used by the ROOT right after the cheap classification (i0);
// - runImLocateGate: used by i1-locate once the target has been resolved and read.
//
// ⚠️ THE INVERTED PRECONDITION. agentNewMolecule2's gate refuses a molecule that ALREADY EXISTS
// (nmFs.ts:75, "a new molecule must not overwrite an existing one"). This one refuses a molecule
// that does NOT exist, and says which agent to use instead. The two gates are mirror images, and
// that is precisely why the steps are not shared: making one serve both needs a create/update mode
// field inside it — the multi-role agent agentsBestPractices forbids (§2).

import {
  ImArtifact,
  ImArtifactKind,
  ImContext,
  ImGateResult,
  ImInheritance,
  imGateFail,
  imGateOk,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

export interface ImKnownGroup {
  name: string;
  skillReference?: string;
  skillUsageReference?: string;
}

/** `code: message` — one convention across every IM2 gate, so a step reports issues verbatim. */
function issue(code: string, message: string): string {
  return `${code}: ${message}`;
}

/**
 * i0-classify's gate. The classifier is a cheap model reading prose, and there are exactly two
 * ways for it to produce something unusable: claim the input is invalid without saying why (the
 * user gets a dead end), or claim it is valid without naming a molecule.
 */
export function checkImClassification(input: { target?: string; validInput?: boolean; reason?: string }): ImGateResult {
  if (input.validInput !== true) {
    return input.reason?.trim()
      ? imGateOk() // a readable refusal IS a valid outcome — the root ends the run with it
      : imGateFail(issue('no_reason', 'the request was classified as out of scope with no reason to show the user'));
  }

  const target = (input.target || '').trim();
  if (!target) {
    return imGateFail(issue('target_missing', 'the request was accepted but no molecule was extracted from the prose'));
  }
  // 'ml-data-table' or 'groupviewtable/ml-data-table'. Anything else is not a molecule name, and
  // resolving it would search all 31 groups for something that cannot match.
  if (!/^(?:[a-z0-9]+\/)?ml-[a-z0-9-]+$/.test(target.replace(/\.ts$/, ''))) {
    return imGateFail(
      issue('target_shape', `'${target}' does not look like a molecule — expected 'ml-<name>' or '<group>/ml-<name>'`),
    );
  }

  return imGateOk();
}

export interface ImLocateInputs {
  /** What i0 extracted, kept for the message when nothing resolves. */
  targetRaw: string;
  /** The ImNotFoundError message when resolution failed; null when it succeeded. */
  notFound: string | null;
  groupFolder: string;
  knownGroups: ImKnownGroup[];
  artifacts: ImArtifact[];
  inheritance: ImInheritance;
  destProject: number;
  context: ImContext | null;
}

function sourceOf(artifacts: ImArtifact[], kind: ImArtifactKind): ImArtifact | undefined {
  return artifacts.find(a => a.kind === kind);
}

export function runImLocateGate(inputs: ImLocateInputs): ImGateResult {
  // The molecule must EXIST. Reported alone: every check below reads artifacts that were never
  // read, so piling on would bury the one line the user needs.
  if (inputs.notFound) {
    return imGateFail(issue('molecule_not_found', inputs.notFound));
  }

  const errors: string[] = [];

  if (!inputs.destProject) {
    errors.push(issue('dest_project', 'destination project could not be resolved (mls.actualProject)'));
  }

  // The group must exist in skills/index.ts AND have a creation skill: the group contract is what
  // every later step edits against. Today only `groupnavigatemain` lacks one (31 of 32 groups have
  // it) — same decision as the NM2 gate, failing readably instead of editing blind.
  const entry = inputs.knownGroups.find(item => item.name.toLowerCase() === inputs.groupFolder.toLowerCase());
  if (!entry) {
    errors.push(
      issue(
        'group_unknown',
        `the molecule lives in '${inputs.groupFolder}', which is not a group in skills/index.ts — known groups: ${inputs.knownGroups.map(item => item.name).join(', ')}`,
      ),
    );
  } else if (!entry.skillReference) {
    errors.push(
      issue(
        'group_no_skill',
        `group '${entry.name}' has no creation skill (skillReference) — a molecule cannot be changed without its group contract to check the change against`,
      ),
    );
  }

  // .ts and .defs.ts are the two artifacts every route reads. A .less or .html that is absent is
  // recorded as `present: false` and is NOT an error: plenty of molecules have no playground yet,
  // and i5-playground is exactly the step that creates one.
  const ts = sourceOf(inputs.artifacts, 'ts');
  if (!ts?.present || !ts.source.trim()) {
    errors.push(issue('ts_unreadable', 'the molecule .ts was located but came back empty — nothing can be edited from it'));
  }
  const defs = sourceOf(inputs.artifacts, 'defs');
  if (!defs?.present || !defs.source.trim()) {
    errors.push(
      issue(
        'defs_missing',
        'the molecule has no readable .defs.ts — the playground slot list and the Design System catalog are both built from it, so a change made without it silently drops the molecule out of the catalog',
      ),
    );
  }

  // Strategy D means the parent lives in ANOTHER project. A class extending a molecule of the same
  // project is a local base class, not a shell, and routing it through the inheritance
  // clarification would offer the user a choice that does not apply.
  const inh = inputs.inheritance;
  if (inh.isShell) {
    if (!inh.parentReference || !inh.parentProject) {
      errors.push(issue('parent_unresolved', 'the molecule extends another molecule but its parent reference could not be resolved'));
    } else if (inh.parentProject === inputs.destProject) {
      errors.push(
        issue(
          'parent_same_project',
          `the molecule extends '${inh.parentClassName}' from the SAME project (mls-${inh.parentProject}) — inheritance across projects is what makes a shell; this is a local base class and route C does not apply`,
        ),
      );
    }
  }

  if (!inputs.context && !errors.length) {
    errors.push(issue('context', 'context could not be assembled'));
  }

  return errors.length ? imGateFail(...errors) : imGateOk();
}
