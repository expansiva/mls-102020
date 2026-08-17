/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/gate.ts" enhancement="_blank"/>

// Gate for the group index (pure — unit-testable).
//
// It enforces ONE rule above all others, and that rule is the whole reason the step exists:
//
//   playgroundChanged == true  =>  the index was updated.
//
// Not a heuristic, not conditional on judgement (flow.json.conventions.playgroundThenIndex). On
// 2026-08-05 the playground of ml-lazy-record-detail-table was fixed and the group page was left
// behind still showing an empty detail area. Nobody noticed; it was found by accident days later.

import { ImGateResult, imGateFail, imGateOk } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import { slotIsExercised } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';
import { countImports } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/indexPlan.js';

export interface ImIndexGateInputs {
  playgroundChanged: boolean;
  indexUpdated: boolean;
  /**
   * Did the index actually have work to do? From `planIndexWork`: a missing import, or an added slot
   * the showcase does not exercise.
   *
   * ⚠️ MEASURED 2026-08-14, and it blocked the first run that ever reached this step. The rule used
   * to be `playgroundChanged => the index changed`, full stop. But the playground can change for a
   * reason the index has no part in: on `ml-currency-input` the run added an example, the import was
   * already there and no slot was added, so the deterministic branch produced `after === before` and
   * this gate called it the 2026-08-05 defect. It was not — there was nothing to do.
   *
   * The protection is unchanged where it applies: if there IS work and the index did not move, it
   * still fails. Optional so a caller that cannot compute it keeps the old, stricter behaviour.
   */
  workExpected?: boolean;
  before: string;
  after: string;
  project: number;
  groupFolder: string;
  shortName: string;
  tag: string;
  /** Only the slots this run added; pre-existing gaps are not this run's business. */
  addedSlots: string[];
}

function issue(code: string, message: string): string {
  return `${code}: ${message}`;
}

export function runImIndexGate(inputs: ImIndexGateInputs): ImGateResult {
  if (!inputs.playgroundChanged) {
    return inputs.indexUpdated
      ? imGateFail(issue('should_be_noop', 'the playground did not change, so the index was already in step and must not be rewritten'))
      : imGateOk();
  }

  // Nothing to do is not the same as not doing it. `workExpected === false` means the plan found no
  // missing import and no added slot the showcase lacks — the index is already in step.
  if (!inputs.indexUpdated && inputs.workExpected !== false) {
    return imGateFail(
      issue(
        'index_stale',
        'the playground changed, the index had work to do — a missing import or a slot the showcase does not exercise — and it was not updated. This is the exact 2026-08-05 defect: the demo was fixed and the group page kept showing the old component',
      ),
    );
  }
  if (!inputs.indexUpdated) return imGateOk();

  const errors: string[] = [];
  const after = inputs.after;

  if (!after.trim()) return imGateFail(issue('empty', 'the index came out empty'));

  const imports = countImports(after, inputs.project, inputs.groupFolder, inputs.shortName);
  if (imports === 0) {
    errors.push(issue('import_missing', `the index does not import ${inputs.shortName} — its showcase card would render an unknown element`));
  } else if (imports > 1) {
    errors.push(issue('import_duplicate', `${inputs.shortName} is imported ${imports} times in the index`));
  }

  if (!after.includes(`<${inputs.tag}`)) {
    errors.push(issue('showcase_missing', `the index has no <${inputs.tag}> instance — the molecule is imported and never shown`));
  }

  // The 2026-08-05 check, at the index level this time.
  for (const slot of inputs.addedSlots) {
    if (!slotIsExercised(after, slot)) {
      errors.push(issue('slot_missing', `the slot '${slot}' was added and the showcase card does not use it — the group page would show the same empty area the playground just fixed`));
    }
  }

  // Nothing in this step justifies losing content: it adds an import and extends a card.
  if (after.length < inputs.before.length * 0.9) {
    errors.push(issue('shrunk', `the index lost ${inputs.before.length - after.length} characters — this step adds to the page, it does not rewrite it`));
  }

  return errors.length ? imGateFail(...errors) : imGateOk();
}
