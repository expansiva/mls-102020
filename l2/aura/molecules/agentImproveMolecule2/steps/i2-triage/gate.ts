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

import {
  IM_CREATABLE_ARTIFACTS,
  ImArtifactKind,
  ImGateResult,
  ImRoute,
  imGateFail,
  imGateOk,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const ROUTES: ImRoute[] = ['A', 'B', 'C', 'D'];
const KINDS: ImArtifactKind[] = ['defs', 'ts', 'less', 'html', 'groupIndex'];

/** Routes that WRITE. A hands over to a rebuild and D writes nothing, so both name no artifacts. */
const WRITING_ROUTES: ImRoute[] = ['B', 'C'];

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
    return imGateFail(issue('route_invalid', `route '${output.route}' is not one of A, B, C or D`));
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
        'route A means the public definition changes, and nothing was named — list the slots, properties or events whose change forces existing markup to be rewritten. If no page that uses this molecule would have to be written differently, this is route B, and that includes correcting a contract sentence that described the defect',
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
