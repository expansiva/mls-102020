/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/widgetDefinitionChoiceLogic.ts" enhancement="_blank"/>

// Logic of the definition checkpoint. PURE — no DOM, unit-tested without a browser.
//
// THE QUESTION THIS WIDGET ASKS is not i4's. There the human chooses WHERE a fix goes, among three
// mutually exclusive places. Here they confirm WHAT the molecule will start promising — a list, of
// which they may accept some and drop others, because a request often implies more than the person
// meant and dropping one line is cheaper than cancelling a run.
//
// ⚠️ THIS IS THE ONLY CHECKPOINT IN THE AGENT THAT CHANGES A PROMISE. Every other route repairs or
// restyles something the molecule already said it does; route A moves the public surface, which is
// what existing pages are written against. So the shape here is deliberately conservative:
//
//   - every change is listed separately and can be dropped separately;
//   - dropping ALL of them is not a confirmation, it is a cancellation, and the widget says so
//     rather than letting Confirm write an empty decision;
//   - nothing is written until Confirm, exactly like i4.

import { ImDefinitionChange, imMessageKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

export type DefinitionAction = 'continue' | 'cancel';

export interface DefinitionChoiceValue {
  planId: string;
  title: string;
  userLanguage: string;
  tag: string;
  /** The user's own words, so the human can judge the proposal against what they asked. */
  request: string;
  /** One line from the model: why the definition has to move. */
  reason: string;
  /** What the molecule declares TODAY, for the "before" column. */
  current: { slots: string[]; properties: string[]; events: string[] };
  /** The model's proposal, all pre-selected. */
  changes: ImDefinitionChange[];
}

export interface DefinitionChoiceResult {
  changes: ImDefinitionChange[];
  action: DefinitionAction;
}

/** Everything the model proposed starts accepted — the human drops, rather than picks. */
export function initialSelection(changes: ImDefinitionChange[]): boolean[] {
  return changes.map(() => true);
}

export function toggleSelection(selection: boolean[], index: number): boolean[] {
  return selection.map((on, i) => (i === index ? !on : on));
}

export function selectedChanges(changes: ImDefinitionChange[], selection: boolean[]): ImDefinitionChange[] {
  return changes.filter((_, i) => selection[i]);
}

/**
 * Reasons the human cannot confirm yet.
 *
 * Only one, and it is the one that matters: dropping every line leaves nothing to do. Confirming it
 * would write an empty decision and instruct i3-edit to change the definition to itself.
 */
export function definitionBlockingIssues(changes: ImDefinitionChange[], selection: boolean[]): string[] {
  return selectedChanges(changes, selection).length ? [] : ['no_change'];
}

export function canConfirmDefinition(changes: ImDefinitionChange[], selection: boolean[]): boolean {
  return definitionBlockingIssues(changes, selection).length === 0;
}

export function buildDefinitionResult(
  changes: ImDefinitionChange[],
  selection: boolean[],
  action: DefinitionAction,
): DefinitionChoiceResult {
  return { changes: selectedChanges(changes, selection), action };
}

/**
 * A stable key per change, for the widget's own label lookup.
 *
 * Returned as a key rather than a sentence so the wording lives with the other messages and gets
 * translated with them — `slot_add`, `event_remove`, and so on.
 */
export function changeLabelKey(change: ImDefinitionChange): string {
  return `${change.kind}_${change.op}`;
}

/** Which message set the chrome uses — the run's language first. See imMessageKey. */
export function definitionMessageKey(userLanguage: string | undefined, available: string[], fallback: string): string {
  return imMessageKey(userLanguage, available, fallback);
}
