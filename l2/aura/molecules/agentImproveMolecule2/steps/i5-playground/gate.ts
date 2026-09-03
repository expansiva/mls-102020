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
import {
  NM_MIN_DEMO_EXAMPLES,
  demoStateIssues,
  findAttributeSlots,
  findSlotBindings,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n6-demo/gate.js';
import {
  PLAYGROUND_STATE_PLACEHOLDER,
  PLAYGROUND_STATE_WIDGET,
  pageHasStateWidget,
  type MoleculeDemoExample,
} from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';

/**
 * ⚠️ 2026-08-18: this was the SUFFIX and the check was `includes`, so
 * `<widget-playground-state-102020>` — not a registered element — satisfied it. The route E page came
 * out with the truncated tag, no state at all, and the gate approved it. Measured across the six
 * projects: 398 registered against 8 truncated. One shared constant now, compared AS A TAG.
 */
export const IM_STATE_WIDGET = PLAYGROUND_STATE_WIDGET;

/**
 * Is the page BROKEN in a way that regenerating it fixes? Pure, and it is the precondition of route E.
 *
 * ⚠️ WHY A REQUEST IS NOT ENOUGH (2026-08-18). "Regenerate the playground" is destructive by nature: a
 * playground carries **authored sample data** — six examples minimum, each with its own values — and the
 * group index carries hand-written cards. Regenerating a page that works throws that away, and the
 * agent cannot tell "broken" from "not how I would have written it".
 *
 * So the request does not decide; these invariants do. They are the same ones the gate below enforces
 * on what the model writes, which is the point: a page that could not pass the gate is a page worth
 * regenerating. An empty list means the page is healthy and route E ends saying so.
 */
export function playgroundIntegrityIssues(html: string, tag: string): string[] {
  const out: string[] = [];
  if (!html.trim()) return ['the page is empty'];
  if (!html.includes(`<${tag}`)) out.push(`the page does not instantiate <${tag}> even once`);
  if (!pageHasStateWidget(html)) out.push(`the playground state widget (<${IM_STATE_WIDGET}>) is missing or written with a shortened tag — it is not a registered element then, so every {{playground.*}} binding on the page is dead`);
  if (/<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html)) out.push('the page is a full HTML document, and the playground is a fragment');
  for (const name of findAttributeSlots(html)) {
    out.push(`slot content is written as \`slot="${name}"\`, which renders empty in a library with no Shadow DOM`);
  }
  return out;
}

export interface ImPlaygroundGateInputs {
  /**
   * False = nothing may be written. True when the surface moved OR route E asked for a regeneration.
   *
   * The two reasons are deliberately collapsed into one flag: from here on the checks are the same —
   * whatever the reason, the page that comes out has to be a valid playground for this molecule.
   */
  shouldChange: boolean;
  playgroundChanged: boolean;
  /** '' when the page did not exist before. */
  before: string;
  after: string;
  tag: string;
  diff: ImSurfaceDiff;
  /**
   * ROUTE E — the page is being WRITTEN, not amended. Everything below that is delta-scoped exists to
   * avoid punishing a run for a page it inherited; on a regeneration there is nothing inherited, so the
   * page has to satisfy the same contract a NEW playground does (n6-demo's, deliberately the same rules).
   */
  regenerate?: boolean;
  /** Only on a regeneration: the scenarios the state is assembled from. */
  examples?: MoleculeDemoExample[];
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

  // Slot content as an ATTRIBUTE renders empty here — no Shadow DOM, the molecule reads by tag name.
  // The DELTA rule applies: a page that already carried the wrong form is not this run's fault, and
  // blocking on it would freeze the agent on a page nobody asked to repair. What the edit ADDED is.
  const attributeSlots = findAttributeSlots(html)
    .filter(name => !findAttributeSlots(inputs.before).includes(name));
  for (const name of attributeSlots) {
    errors.push(
      issue(
        'slot_as_attribute',
        `the page writes slot content as \`slot="${name}"\`, and this library has NO Shadow DOM — a molecule reads its slots by TAG NAME, so that renders empty. Write <${name}>…</${name}> inside the molecule instance`,
      ),
    );
  }
  // A binding as slot CONTENT shows the literal `{{playground...}}` on screen — bindings resolve on
  // attributes only. The delta rule again, and on a regeneration it costs nothing: the broken page it
  // replaces has none, so everything the run writes is "introduced".
  const introducedBindings = findSlotBindings(html)
    .filter(found => !findSlotBindings(inputs.before).includes(found));
  for (const found of introducedBindings) {
    errors.push(
      issue(
        'slot_binding',
        `\`${found}\` binds slot CONTENT to the state, and bindings only resolve on ATTRIBUTES — inside a slot the token is plain text, so the page shows the literal {{playground...}} on screen. Measured: 0 of the 196 pages in this library do it. Write the content as literal text`,
      ),
    );
  }

  if (/```/.test(html)) errors.push(issue('fence', 'the page carries a markdown fence — raw HTML only'));

  // The page is a FRAGMENT rendered inside the Studio. Measured 0/146 in the library.
  if (/<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>]|<style[\s>]|<link[\s>]/i.test(html)) {
    errors.push(issue('document', 'the playground is a FRAGMENT — remove <!DOCTYPE>/<html>/<head>/<body>/<style>/<link>'));
  }
  if (/<script[\s>]/i.test(html)) errors.push(issue('script', 'the playground must not contain <script> tags'));

  // Losing the widget is how an edit silently breaks every binding on the page.
  if (pageHasStateWidget(inputs.before) && !pageHasStateWidget(html)) {
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

  if (inputs.regenerate) errors.push(...regeneratedPageIssues(html, inputs.tag, inputs.examples || []));

  return errors.length ? imGateFail(...errors) : imGateOk();
}

/**
 * What a REGENERATED page must be, and it is n6-demo's contract on purpose.
 *
 * ⚠️ MEASURED 2026-08-18, first route E run. The page came out at 2.1KB against the library's 21KB
 * median: 4 cards, 4 example keys, a truncated widget tag, and **no state at all** — 20 live
 * `{{playground.*}}` bindings with nothing behind them. Every check in the gate above passed, because
 * every one of them is scoped to the DELTA of an edit, and a regeneration has no delta.
 *
 * The cause was the prompt, not the model: i5 is written for amending ("you are adding to it, not
 * replacing it", "the state widget stays where it is"), and route E hands it a creation job. The
 * creation contract already exists — `skills/playgroundGenerator`, injected by n6-demo and v5-demo —
 * and i5 was not injecting it. These checks are the enforceable half of the same contract.
 */
export function regeneratedPageIssues(html: string, tag: string, examples: MoleculeDemoExample[]): string[] {
  const out: string[] = [];

  if (!pageHasStateWidget(html)) {
    out.push(
      issue(
        'state_widget_missing',
        `a regenerated page must carry the playground state widget with its REGISTERED tag: <${PLAYGROUND_STATE_WIDGET} state='${PLAYGROUND_STATE_PLACEHOLDER}'></${PLAYGROUND_STATE_WIDGET}>. A shortened tag is not a registered element — it renders nothing and every binding dies`,
      ),
    );
  }
  if (!html.includes(PLAYGROUND_STATE_PLACEHOLDER)) {
    out.push(
      issue(
        'state_placeholder',
        `the state widget must carry the literal token state='${PLAYGROUND_STATE_PLACEHOLDER}' — code replaces it with the real state, assembled from the examples you declare. Do not write a state object yourself`,
      ),
    );
  }
  if (examples.length < NM_MIN_DEMO_EXAMPLES) {
    out.push(
      issue(
        'examples_count',
        `a playground page answers at least ${NM_MIN_DEMO_EXAMPLES} distinct questions a developer has, and ${examples.length} were declared — the library's own pages carry 6 or more, never fewer`,
      ),
    );
  }
  const uses = html.split(`<${tag}`).length - 1;
  const expected = Math.max(NM_MIN_DEMO_EXAMPLES, examples.length);
  if (uses < expected) {
    out.push(issue('tag_uses', `<${tag}> must appear at least once per declared example (${expected} expected, ${uses} found)`));
  }
  for (const problem of demoStateIssues(html, examples)) out.push(issue(problem.code, problem.message));

  // ⚠️ MEASURED 2026-08-18, and it is the difference the user saw on screen: in mls-102040 **153 of 153**
  // pages carry the control widgets (text/boolean/number) for EVERY example key they bind, so each card
  // has its own editable "Properties" area. The regenerated page had them for `basic` and for none of the
  // other five — Properties appeared on the first card only.
  //
  // It came from the RETRY. Attempt 1 wrote 15.2KB with all six sets of controls and declared no state
  // entries, so the orphan-binding check refused it; attempt 2 fixed the state and came back at 10.2KB,
  // having dropped the controls. Deleting is always the cheapest way to satisfy "these bindings have no
  // state" — hence both this floor and the reworded message that says not to.
  //
  // The 40 pages in the library that DO lack controls are all theme shells (mls-102054/102055), a
  // different artifact family; the neutral library, which is what this agent writes, is at 153/153.
  const bound = new Set<string>();
  for (const m of html.matchAll(/\{\{\s*playground\.([A-Za-z0-9_$]+)\./g)) bound.add(m[1]);
  const controlled = new Set<string>();
  for (const m of html.matchAll(/<aura--molecules--playground--widget-playground-state-(?:boolean|text|number)-102020[^>]*>/g)) {
    for (const key of m[0].matchAll(/playground\.([A-Za-z0-9_$]+)\./g)) controlled.add(key[1]);
  }
  const uncontrolled = [...bound].filter(key => !controlled.has(key));
  if (uncontrolled.length) {
    out.push(
      issue(
        'controls_missing',
        `these examples have no control widgets, so their card has no editable Properties area: ${uncontrolled.join(', ')}. Every example gets its own text/boolean/number widgets, one per bound property — 153 of the 153 pages in the library do this, and a card without them is a static screenshot`,
      ),
    );
  }
  return out;
}
