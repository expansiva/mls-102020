/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2-triage/gate.ts" enhancement="_blank"/>

// Gate for THE routing decision (pure — unit-testable).
//
// flow.json: retry 1 with the gate errors in context; a 2nd failure fails the step.
//
// What this gate can and cannot do. It CANNOT tell whether A or B was the right call — that is
// judgement, and it is what the prompt is for. It CAN refuse the mechanically impossible: route C
// on a molecule that is not a shell, route A with nothing named as changing, an artifact list that
// contradicts the route. Every check below is of that second kind; none of them second-guesses the
// model's reasoning.
//
// ⚠️ 2026-08-13: a defect the contract DESCRIBED as intended was routed to A, which is not built, so
// the run died on a request that was one line of code plus one sentence of the contract. No gate here
// could have caught it — "would existing markup have to be rewritten?" is not decidable from this
// payload. What was fixable was the vocabulary: the schema said "or changes meaning" and this file's
// own retry message repeated it. Both now say what the criterion actually is. The taxonomy was the
// defect, not the model's care (CHANGELOG 2026-08-13).
//
// ⚠️ 2026-08-14, AND THE SAME CONCLUSION FOR B AGAINST C. A defect on a shell whose code lives in the
// parent was routed B. The tempting gate is "on a shell, route B may not name `ts`" — and it is WRONG:
// 14 of the 84 shells legitimately override a member of the parent, and that edit is a route-B `ts`
// edit. A gate that refuses a correct answer costs the whole run (IM_MAX_ATTEMPTS is 2) and teaches
// the model to lie about its artifacts. B against C is judgement, exactly like A against B: what the
// payload holds is a route and a list, never "is the code that implements this behaviour reachable
// from the shell". The fix therefore went where it could work — the third ordered question in
// prompt.md, and the unreachable-member list rendered next to it as measured evidence.
//
// The code-side half of that defect exists, one step later: i3-edit's `dead_member` refuses the
// invented override that a wrong B produces, so the run now fails legibly instead of reporting a
// change that did not happen. Better than nothing and worse than routing to C — see the CHANGELOG.

import {
  IM_CREATABLE_ARTIFACTS,
  ImArtifactKind,
  ImGateResult,
  ImRoute,
  imGateFail,
  imGateOk,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const ROUTES: ImRoute[] = ['A', 'B', 'C', 'D', 'E'];
const KINDS: ImArtifactKind[] = ['defs', 'ts', 'less', 'html', 'groupIndex'];

/** Routes that WRITE. A hands its work to the checkpoint and D writes nothing, so both name no artifacts. */
const WRITING_ROUTES: ImRoute[] = ['B', 'C', 'E'];

/**
 * What i3-edit can actually write. The playground belongs to i5 and the group index to i6.
 *
 * ⚠️ MEASURED 2026-08-18, and it is a whole run lost. Asked "the playground was not generated", the
 * triage answered route B with `expectedArtifacts: ['html','groupIndex']` — a correct reading of the
 * request, since nothing about the surface moves. But route B runs i3-edit, i3 offers only these three
 * kinds, so the model was shown the `.ts` alone and refused, twice: "the html and groupIndex were not
 * included, so I cannot make targeted edits." It was right.
 *
 * Naming html/groupIndex ALONGSIDE a writable artifact is fine and accurate — a route B edit that moves
 * the surface really does make the playground follow. What cannot happen is naming ONLY artifacts no
 * step in the branch can write. That request is route E.
 */
const I3_WRITABLE: ImArtifactKind[] = ['defs', 'ts', 'less'];

export interface ImTriageOutput {
  route: string;
  rationale: string;
  expectedArtifacts: string[];
  definitionElements: string[];
}

export interface ImTriageInputs {
  output: ImTriageOutput;
  /** From context.json — the model is told, but the gate checks against the measured fact. */
  isShell: boolean;
  artifactsPresent: ImArtifactKind[];
}

function issue(code: string, message: string): string {
  return `${code}: ${message}`;
}

/**
 * The playground rule of flow.json.conventions, applied as a NORMALIZATION rather than a gate
 * failure: "if the playground changed, the group index MUST be updated in the same run".
 *
 * Code can fix this, so it does — spending a retry to make the model re-say something derivable
 * is the cost agentsBestPractices §3 warns about. The rule is still enforced, just not by refusal.
 */
export function normalizeExpectedArtifacts(expected: string[]): ImArtifactKind[] {
  const out = expected.filter((k): k is ImArtifactKind => (KINDS as string[]).includes(k));
  if (out.includes('html') && !out.includes('groupIndex')) out.push('groupIndex');
  return [...new Set(out)];
}

export function runImTriageGate(inputs: ImTriageInputs): ImGateResult {
  const { output } = inputs;
  const errors: string[] = [];

  const route = output.route as ImRoute;
  if (!ROUTES.includes(route)) {
    // Nothing below means anything without a route, and a wrong route makes every other message
    // misleading. Fail alone.
    return imGateFail(issue('route_invalid', `route '${output.route}' is not one of A, B, C, D or E`));
  }

  if (!output.rationale?.trim()) {
    errors.push(issue('rationale_missing', 'the route was chosen with no rationale — on route D it is the only answer the user gets'));
  }

  // Route C is not "the molecule is a shell". It is "the molecule is a shell AND the behaviour to
  // change lives in the parent". The first half is measured, so a non-shell on C is impossible and
  // means the model invented an inheritance that is not there.
  if (route === 'C' && !inputs.isShell) {
    errors.push(
      issue(
        'route_c_not_shell',
        'route C was chosen but this molecule is not a shell — it does not extend a molecule from another project, so there is no parent whose behaviour could be the problem',
      ),
    );
  }

  // Route A is a REBUILD. Naming what changes in the public definition is what makes it a rebuild
  // rather than an opinion, and the list pre-fills the clarification the user answers next.
  if (route === 'A' && !output.definitionElements?.filter(item => item.trim()).length) {
    errors.push(
      issue(
        'route_a_no_elements',
        'route A means the public definition changes, and nothing was named — list the slots, properties or events whose change forces existing markup to be rewritten. If no page that uses this molecule would have to be written differently, this is not route A: it is B, or C when the molecule is a shell whose parent holds the code that has to change. That includes correcting a contract sentence that described the defect',
      ),
    );
  }
  if (route !== 'A' && output.definitionElements?.filter(item => item.trim()).length) {
    errors.push(
      issue(
        'definition_elements_off_route',
        `definition elements were named (${output.definitionElements.join(', ')}) on route ${route} — a change to the public definition is route A, so either the route or the list is wrong`,
      ),
    );
  }

  const expected = output.expectedArtifacts || [];
  const unknown = expected.filter(kind => !(KINDS as string[]).includes(kind));
  if (unknown.length) {
    errors.push(issue('artifact_unknown', `'${unknown.join("', '")}' is not an artifact of a molecule — the artifacts are ${KINDS.join(', ')}`));
  }

  if (WRITING_ROUTES.includes(route) && !expected.length) {
    errors.push(issue('artifacts_empty', `route ${route} makes a change and named no artifact to change — a change that touches nothing is not a change`));
  }
  // See I3_WRITABLE: naming only artifacts the editing step cannot write is a promise nothing keeps.
  if ((route === 'B' || route === 'C') && expected.length && !expected.some(kind => (I3_WRITABLE as string[]).includes(kind))) {
    errors.push(
      issue(
        'artifacts_not_writable',
        `route ${route} named only ${expected.join(', ')}, and the step that edits writes just ${I3_WRITABLE.join(', ')} — the playground belongs to i5 and the group index to i6, and both FOLLOW the surface rather than being edited. If the request is only about regenerating a derived artifact, that is route E`,
      ),
    );
  }
  if (!WRITING_ROUTES.includes(route) && expected.length) {
    errors.push(
      issue(
        'artifacts_off_route',
        route === 'A'
          ? 'route A names no artifacts — the rebuild decides what it writes, this step only routes'
          : 'route D writes nothing, so it names no artifacts',
      ),
    );
  }

  // An artifact that does not exist yet may still be named — but only the ones a later step can
  // create. i5-playground writes a missing .html, i6-index a missing index; nothing creates a
  // missing .ts or .defs.ts, and i1-locate already refused the molecule if either was absent.
  for (const kind of expected) {
    if (!(KINDS as string[]).includes(kind)) continue;
    const artifactKind = kind as ImArtifactKind;
    if (inputs.artifactsPresent.includes(artifactKind)) continue;
    if (IM_CREATABLE_ARTIFACTS.includes(artifactKind)) continue;
    errors.push(issue('artifact_absent', `'${kind}' does not exist for this molecule and no step creates it`));
  }

  return errors.length ? imGateFail(...errors) : imGateOk();
}
