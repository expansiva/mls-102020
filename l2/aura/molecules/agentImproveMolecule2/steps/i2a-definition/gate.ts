/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/gate.ts" enhancement="_blank"/>

// Gate for the definition checkpoint (pure — unit-testable).
//
// It runs TWICE, like i4-inherit's: once on the MODEL's proposal before the widget mounts, once on
// what the HUMAN confirmed, because that second one is what i3-edit is instructed by.
//
// WHAT THIS GATE CAN CHECK, and it is more than the routing gates can. A definition change is a
// movement of the measured surface, and the surface is measured — so "you propose adding a slot that
// already exists" and "you propose removing an event the molecule does not have" are decidable here,
// not judgement. That is the whole reason this step is cheap to make safe: route A is the first
// route that changes what the molecule PROMISES, and every promise it moves is checked against what
// the molecule declares today.

import { groupVocabulary } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';
import {
  ImDefinitionChange,
  ImGateResult,
  ImSurfaceNames,
  imGateFail,
  imGateOk,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const KINDS = ['slot', 'property', 'event'];
const OPS = ['add', 'remove', 'rename'];

export interface ImDefinitionAnswer {
  changes: ImDefinitionChange[];
  /** Only on the model's proposal; the human's confirmation carries none. */
  reason?: string;
  /** Checkpoint title, in the user's language. Cosmetic — never gated. */
  title?: string;
}

export interface ImDefinitionGateInputs {
  answer: ImDefinitionAnswer;
  /** The surface as the CODE declares it today, from imSurface. The gate checks against this. */
  current: ImSurfaceNames;
  /**
   * The GROUP's usage contract, for `groupVocabulary`. Empty when it could not be read — the check
   * then admits everything, because unmeasured must not mean forbidden.
   *
   * ⚠️ WHY THE CHECKPOINT NEEDS IT (2026-08-17). The group contract declares the public surface of
   * every molecule in the group, and altering it is MANUAL work in mls-102020 — the agents read it and
   * never write it. Without this check route A was the hole in that rule: measured on
   * `ml-kpi-indicator`, "define the label by attribute" was routed A and the checkpoint was ready to
   * add a public property `label` that `groupViewMetric` does not declare anywhere. The route that
   * exists to change a promise was the one route that could widen a whole group by accident.
   */
  groupSkill: string;
  /** True when validating the model's proposal, false for the human's confirmation. */
  fromModel: boolean;
}

function issue(code: string, message: string): string {
  return `${code}: ${message}`;
}

/** The names the molecule declares today, for the kind this change is about. */
function existing(current: ImSurfaceNames, kind: string): string[] {
  if (kind === 'slot') return current.slots;
  if (kind === 'property') return current.properties;
  if (kind === 'event') return current.events;
  return [];
}

export function runImDefinitionGate(inputs: ImDefinitionGateInputs): ImGateResult {
  const changes = inputs.answer.changes || [];
  const errors: string[] = [];

  // Route A exists to move the public surface. A checkpoint that moves nothing is not a definition
  // change, and the run would go on to instruct i3-edit with an empty list.
  if (!changes.length) {
    return imGateFail(issue('no_change', 'a definition change that names nothing is not a definition change — say which slot, property or event moves, or this request is a route B edit'));
  }

  const seen = new Set<string>();
  changes.forEach((change, index) => {
    const at = `change ${index + 1}`;
    const kind = String(change.kind || '').trim();
    const op = String(change.op || '').trim();
    const name = String(change.name || '').trim();
    const previousName = String(change.previousName || '').trim();

    if (!KINDS.includes(kind)) {
      errors.push(issue('kind_invalid', `${at}: '${kind}' is not one of ${KINDS.join(', ')} — those three ARE the public surface`));
      return;
    }
    if (!OPS.includes(op)) {
      errors.push(issue('op_invalid', `${at}: '${op}' is not one of ${OPS.join(', ')}`));
      return;
    }
    if (!name) {
      errors.push(issue('name_missing', `${at}: the ${kind} being ${op}d has no name`));
      return;
    }
    if (!String(change.purpose || '').trim()) {
      // The purpose is not decoration: it is what the human weighs at the checkpoint and the only
      // instruction i3-edit gets about what the new contract sentence should say.
      errors.push(issue('purpose_missing', `${at}: say in one line what \`${name}\` is for — the human reads it and i3-edit writes the contract from it`));
    }

    const key = `${kind}:${name}`;
    if (seen.has(key)) errors.push(issue('duplicate', `${at}: ${kind} \`${name}\` is named twice`));
    seen.add(key);

    // The group's vocabulary bounds what may be added at all: widening the group is manual work.
    if ((op === 'add' || op === 'rename') && inputs.groupSkill.trim() && !groupVocabulary(inputs.groupSkill).has(name)) {
      errors.push(
        issue(
          'not_in_group',
          `${at}: the group contract does not declare a ${kind} called \`${name}\`, and this agent never widens a group — that file is edited by hand. Either use the name the group already has, exactly (it is case-sensitive), or the group contract has to change first`,
        ),
      );
    }

    const declared = existing(inputs.current, kind);
    if (op === 'add' && declared.includes(name)) {
      errors.push(issue('already_exists', `${at}: ${kind} \`${name}\` already exists in this molecule — adding it changes nothing. If it exists and does not work, that is a defect, and defects are route B`));
    }
    if ((op === 'remove' || op === 'rename') && !declared.includes(op === 'rename' ? previousName : name)) {
      const missing = op === 'rename' ? previousName : name;
      errors.push(
        issue(
          'not_declared',
          `${at}: ${kind} \`${missing || '(unnamed)'}\` is not declared by this molecule — it declares ${declared.length ? declared.join(', ') : '(none)'}`,
        ),
      );
    }
    if (op === 'rename') {
      if (!previousName) errors.push(issue('previous_missing', `${at}: a rename needs the name it had before`));
      else if (previousName === name) errors.push(issue('rename_noop', `${at}: \`${name}\` is renamed to itself`));
    }
    if (op !== 'rename' && previousName) {
      errors.push(issue('previous_off_op', `${at}: a previous name ('${previousName}') was given on '${op}' — only a rename has one`));
    }
  });

  // The proposal arrives pre-selected in the widget, so an unexplained one is a nudge with no
  // argument. The human's own confirmation needs no justification.
  if (inputs.fromModel && !(inputs.answer.reason || '').trim()) {
    errors.push(issue('reason_missing', 'the proposal arrives pre-selected in the widget and must say why the definition has to move, in the user\'s language'));
  }

  return errors.length ? imGateFail(...errors) : imGateOk();
}
