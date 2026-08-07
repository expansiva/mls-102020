/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/widgetInheritChoiceLogic.ts" enhancement="_blank"/>

// Logic of the inheritance clarification. PURE — no DOM, unit-tested without a browser.
//
// The question this widget asks is not the one n2-plan's widget asks, which is why flow.json
// forbids reusing it: there the human is confirming REQUIREMENTS, here they are choosing WHERE a
// fix goes, and the three answers have different consequences that must be visible before the
// click.
//
// The consequences, which the widget spells out and this file encodes:
//
//   less     — style only, in the shell's own sheet. Cheapest, reversible, keeps inheriting.
//   override — solves anything, and the shell STOPS INHERITING that member: a later fix in the
//              base no longer reaches it. Measured 2026-08-06: of 84 shells, 14 override a single
//              property and ZERO override render(). Overriding render() is the expensive end of
//              that scale and the widget has to say so.
//   parent   — NOT EXECUTABLE. The fix belongs to the base molecule in another project, and this
//              agent never crosses that boundary. Choosing it ends the run with an instruction and
//              writes nothing. It is offered because it is often the RIGHT answer, and hiding it
//              would push the user into an override that is merely the reachable one.

import { ImOverridable } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

export type InheritWhere = 'less' | 'override' | 'parent';
export type InheritAction = 'continue' | 'cancel';

export interface InheritChoiceValue {
  planId: string;
  title: string;
  userLanguage: string;
  tag: string;
  parentClassName: string;
  parentReference: string;
  /** What the shell already declares — a member here is already overridden. */
  ownMembers: string[];
  /** Cheapest first, from imInherit. Empty when the parent is unreadable from here. */
  overridableMembers: ImOverridable[];
  /** Whether the molecule has a .less at all; 'less' is not offered when it cannot be created. */
  hasLess: boolean;
  /** The model's suggestion, pre-selected. The human is free to ignore it. */
  suggested: InheritChoiceData;
  /** One line, in the user's language, saying why that suggestion. */
  suggestionReason: string;
}

export interface InheritChoiceData {
  where: InheritWhere;
  /** Required when where === 'override'. */
  member: string;
}

export interface InheritChoiceResult extends InheritChoiceData {
  action: InheritAction;
}

export function emptyInheritData(): InheritChoiceData {
  return { where: 'less', member: '' };
}

/**
 * Changing the choice clears the member unless the new choice is 'override'.
 *
 * Without this, picking 'override', selecting `render`, then switching to 'less' would submit
 * `{ where: 'less', member: 'render' }` — the gate would pass it and inherit.json would record a
 * member nobody chose.
 */
export function applyInheritWhere(data: InheritChoiceData, where: InheritWhere): InheritChoiceData {
  return { where, member: where === 'override' ? data.member : '' };
}

export function applyInheritMember(data: InheritChoiceData, member: string): InheritChoiceData {
  return { ...data, where: 'override', member };
}

/** True when overriding this member forfeits the whole parent render, not just a piece of it. */
export function isExpensiveOverride(member: string): boolean {
  return member === 'render';
}

/** Reasons the human cannot confirm yet, in the widget's own words. */
export function inheritBlockingIssues(data: InheritChoiceData, value: Pick<InheritChoiceValue, 'overridableMembers' | 'hasLess'>): string[] {
  const issues: string[] = [];
  if (data.where === 'less' && !value.hasLess) {
    issues.push('no_less');
  }
  if (data.where === 'override') {
    if (!data.member.trim()) issues.push('no_member');
    else if (value.overridableMembers.length && !value.overridableMembers.some(m => m.name === data.member)) {
      issues.push('unknown_member');
    }
  }
  return issues;
}

export function canConfirmInherit(data: InheritChoiceData, value: Pick<InheritChoiceValue, 'overridableMembers' | 'hasLess'>): boolean {
  return inheritBlockingIssues(data, value).length === 0;
}

export function buildInheritResult(data: InheritChoiceData, action: InheritAction): InheritChoiceResult {
  return {
    where: data.where,
    member: data.where === 'override' ? data.member.trim() : '',
    action,
  };
}

/**
 * Members offered for override, with the ones the shell already declares marked.
 *
 * They are not removed: seeing that `portalWidgetName` is already overridden is what tells the
 * user the shell has a local answer to a related question, and re-choosing it is legitimate.
 */
export function offerableMembers(value: Pick<InheritChoiceValue, 'overridableMembers' | 'ownMembers'>): Array<ImOverridable & { alreadyOverridden: boolean }> {
  return value.overridableMembers.map(member => ({
    ...member,
    alreadyOverridden: value.ownMembers.includes(member.name),
  }));
}
