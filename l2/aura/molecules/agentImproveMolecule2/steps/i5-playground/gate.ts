/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i5-playground/gate.ts" enhancement="_blank"/>

// Gate for the playground update (pure — unit-testable).
//
// Two things it must get right, and they pull in opposite directions:
//
//   1. A NO-OP RUN MUST WRITE NOTHING. Most improve runs change a colour; the playground still
//      demonstrates the same surface and is still correct. Rewriting it would produce a diff the
//      user has to review for no reason.
//   2. WHEN THE SURFACE MOVED, THE PAGE MUST FOLLOW. On 2026-08-05 the `Detail` slot was added and
//      the demo never showed it, so the playground opened with an empty detail area.
//
// The delta rule again: a slot the page was ALREADY not exercising does not block. Only the slots
// this run added have to appear. Anything else would refuse to fix a molecule because of a
// playground nobody asked to repair.

import { ImGateResult, imGateFail, imGateOk } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import { ImSurfaceDiff, slotIsExercised } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';

/** The widget every playground page carries; measured 146/146 in mls-102040. */
export const IM_STATE_WIDGET = 'widget-playground-state-102020';

export interface ImPlaygroundGateInputs {
  /** False = the surface did not move; nothing may be written. */
  shouldChange: boolean;
  playgroundChanged: boolean;
  /** '' when the page did not exist before. */
  before: string;
  after: string;
  tag: string;
  diff: ImSurfaceDiff;
}

function issue(code: string, message: string): string {
  return `${code}: ${message}`;
}

export function runImPlaygroundGate(inputs: ImPlaygroundGateInputs): ImGateResult {
  // A no-op that wrote is worse than a no-op that did nothing: it produces a diff to review and
  // claims work that was not needed.
  if (!inputs.shouldChange) {
    return inputs.playgroundChanged
      ? imGateFail(issue('should_be_noop', 'the public surface did not move, so the playground was already correct and must not be rewritten'))
      : imGateOk();
  }

  if (!inputs.playgroundChanged) {
    return imGateFail(issue('not_updated', `the public surface moved and the playground was left as it was — it demonstrates a surface that no longer exists`));
  }

  const errors: string[] = [];
  const html = inputs.after;

  if (!html.trim()) return imGateFail(issue('empty', 'the playground came out empty'));
  if (/```/.test(html)) errors.push(issue('fence', 'the page carries a markdown fence — raw HTML only'));

  // The page is a FRAGMENT rendered inside the Studio. Measured 0/146 in the library.
  if (/<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>]|<style[\s>]|<link[\s>]/i.test(html)) {
    errors.push(issue('document', 'the playground is a FRAGMENT — remove <!DOCTYPE>/<html>/<head>/<body>/<style>/<link>'));
  }
  if (/<script[\s>]/i.test(html)) errors.push(issue('script', 'the playground must not contain <script> tags'));

  // Losing the widget is how an edit silently breaks every binding on the page.
  if (inputs.before.includes(IM_STATE_WIDGET) && !html.includes(IM_STATE_WIDGET)) {
    errors.push(issue('state_widget', `the playground state widget ('${IM_STATE_WIDGET}') was removed — every {{playground.*}} binding on the page depends on it`));
  }

  if (!html.includes(`<${inputs.tag}`)) {
    errors.push(issue('tag_missing', `the page no longer instantiates <${inputs.tag}>`));
  }

  // THE 2026-08-05 CHECK. Only the slots this run added: one the page never exercised is
  // pre-existing debt, reported by i7 and not blocking here.
  for (const slot of inputs.diff.addedSlots) {
    if (!slotIsExercised(html, slot)) {
      errors.push(
        issue('slot_missing', `the slot '${slot}' was added to the molecule and no example on the page uses it — that is exactly the defect this step exists to prevent`),
      );
    }
  }

  // A property the molecule no longer has, still bound on the page, renders empty.
  for (const property of inputs.diff.removedProperties) {
    if (new RegExp(`\\{\\{\\s*playground\\.[A-Za-z0-9_$]+\\.${property}\\b`).test(html)) {
      errors.push(issue('binding_stale', `the page still binds '${property}', which the molecule no longer has — it would render empty`));
    }
  }

  return errors.length ? imGateFail(...errors) : imGateOk();
}
