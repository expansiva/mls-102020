/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/gate.ts" enhancement="_blank"/>

// Gate for the inheritance clarification (pure — unit-testable).
//
// It runs TWICE on different things, which is the shape n2-plan established and the reason both
// entry points live here:
//
//   1. runImInheritGate on the MODEL's suggestion, before the widget mounts. A bad suggestion is
//      cheap to retry and expensive to show — a pre-selected wrong answer is the one a hurried
//      user clicks through.
//   2. runImInheritGate again on what the HUMAN confirmed. The widget blocks the obvious cases,
//      but the confirmed answer is what gets written, so it is what must be valid.
//
// 'parent' passes the gate and is NOT executable. That distinction is the point of the step: the
// user is allowed to conclude the base molecule is wrong, and this agent still will not touch it
// (flow.json.principles, "NEVER touch the parent"). The run ends with the instruction.

import {
  ImGateResult,
  ImOverridable,
  ImUnreachable,
  imGateFail,
  imGateOk,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

export interface ImInheritAnswer {
  where: string;
  member?: string;
  /** Only on the model's suggestion; the human's answer carries none. */
  reason?: string;
  /** Checkpoint title, in the user's language. Cosmetic — never gated. */
  title?: string;
}

export interface ImInheritGateInputs {
  answer: ImInheritAnswer;
  /** Measured by imInherit — the model is told, the gate checks. */
  isShell: boolean;
  overridableMembers: ImOverridable[];
  /**
   * Measured by imInherit too. Optional because a context.json written before 2026-08-13 has no such
   * field; absent means "not measured", never "there are none".
   */
  unreachableMembers?: ImUnreachable[];
  hasLess: boolean;
  /** True when validating the model's proposal, false for the human's confirmation. */
  fromModel: boolean;
}

const WHERE = ['less', 'override', 'parent'];

const WHY_UNREACHABLE: Record<ImUnreachable['why'], string> = {
  'private': 'it is private in the parent, and a private member does not compile as an override',
  'module-constant': 'it is a module-scope constant, not a class member — no subclass can reach it',
};

function issue(code: string, message: string): string {
  return `${code}: ${message}`;
}

export function runImInheritGate(inputs: ImInheritGateInputs): ImGateResult {
  const { answer } = inputs;
  const errors: string[] = [];

  // This step only exists on route C, and route C only exists for a shell. Reaching it without one
  // means the routing broke, and no answer here would mean anything.
  if (!inputs.isShell) {
    return imGateFail(issue('not_a_shell', 'the inheritance clarification was reached for a molecule that is not a shell — there is no parent to decide about'));
  }

  const where = (answer.where || '').trim();
  if (!WHERE.includes(where)) {
    return imGateFail(issue('where_invalid', `'${where}' is not one of less, override or parent`));
  }

  if (where === 'less' && !inputs.hasLess) {
    errors.push(issue('no_less', 'the fix was placed in the .less and this molecule has none — i3-edit can create one, but say so deliberately rather than by default'));
  }

  if (where === 'override') {
    const member = (answer.member || '').trim();
    const unreachable = (inputs.unreachableMembers || []).find(m => m.name === member);
    if (!member) {
      errors.push(issue('member_missing', 'an override needs the member to override — a property or a narrow method before render()'));
    } else if (unreachable) {
      // A member that CANNOT carry the change is a wrong answer, not a cheap one. Saying only
      // "unknown member" here would be false — it exists — and would send the retry looking for a
      // typo instead of drawing the conclusion that follows: nothing in this shell can express it.
      errors.push(
        issue(
          'member_unreachable',
          `'${member}' exists in the parent and cannot be overridden: ${WHY_UNREACHABLE[unreachable.why]}. If that is where the change has to happen, no override in this shell can express it — the answer is 'parent', the fix belongs to the base component`,
        ),
      );
    } else if (inputs.overridableMembers.length && !inputs.overridableMembers.some(m => m.name === member)) {
      // Only checked when the map is populated: when the parent lives in a project this run cannot
      // read, imInherit returns an empty map and any name has to be accepted. Refusing everything
      // would leave the user with no way to answer a question they were still asked.
      errors.push(
        issue(
          'member_unknown',
          `'${member}' is not a member of the parent class — the ones it exposes are: ${inputs.overridableMembers.slice(0, 12).map(m => m.name).join(', ')}`,
        ),
      );
    }
  }

  if (where !== 'override' && (answer.member || '').trim()) {
    errors.push(issue('member_off_choice', `a member ('${answer.member}') was named on choice '${where}' — only an override targets a member`));
  }

  // The suggestion is pre-selected in the widget, so an unexplained one is a nudge with no
  // argument. The human's own answer needs no justification.
  if (inputs.fromModel && !(answer.reason || '').trim()) {
    errors.push(issue('reason_missing', 'the suggestion arrives pre-selected in the widget and must say why, in the user\'s language'));
  }

  return errors.length ? imGateFail(...errors) : imGateOk();
}

/** 'parent' is a valid ANSWER and not an executable one: the run ends, nothing is written. */
export function isExecutableChoice(where: string): boolean {
  return where === 'less' || where === 'override';
}
