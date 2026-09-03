/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2/gate.ts" enhancement="_blank"/>

import {
  Ns4E2Review,
  Ns4JourneyProposal,
  Ns4PolicyDecisionSelection,
} from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import { isNs4E2DemotionDecisionId } from '/_102020_/l2/agentNewSolution/steps/e2/coverageSignals.js';

export interface Ns4E2GateIssue {
  code: string;
  path: string;
  message: string;
}

export interface Ns4E2GateResult {
  ok: boolean;
  issues: Ns4E2GateIssue[];
}

const ID_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
const RAW_TECHNICAL_ID_PATTERN = /\b(?:[a-z][A-Za-z0-9]*Id|[a-z][a-z0-9]*_id|[A-Za-z][A-Za-z0-9]*\s+(?:id|ID))\b/;
const STEP_KINDS = new Set(['locate', 'inspect', 'act', 'decide', 'handoff']);

/**
 * The E2 gate is structural only. There is no declared context graph left to validate: contexts are
 * derived downstream by helpers/ns4Context.ts from the step entity, the step kind, the journey
 * sequence and the approved ontology.
 */
export function validateNs4E2Review(review: Ns4E2Review): Ns4E2GateResult {
  const issues: Ns4E2GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });

  if (!ID_PATTERN.test(review.moduleName)) add('NS4_E2_MODULE_ID', 'moduleName', 'moduleName must be lower-camel identifier.');
  if (!review.journeys.length) add('NS4_E2_NO_JOURNEYS', 'journeys', 'At least one business journey is required.');

  const journeyIds = new Set<string>();
  const journeyIndex = new Map<string, number>();
  review.journeys.forEach((journey, index) => {
    checkId(journey.journeyId, `journeys[${index}].journeyId`, 'journey', journeyIds, add);
    journeyIndex.set(journey.journeyId, index);
  });

  const policyDecisionIds = new Set<string>();
  review.journeys.forEach((journey, journeyPosition) => {
    journey.policyDecisions.forEach((decision, decisionPosition) => {
      const path = `journeys[${journeyPosition}].policyDecisions[${decisionPosition}]`;
      checkId(decision.decisionId, `${path}.decisionId`, 'policy decision', policyDecisionIds, add);
      if (!decision.question) add('NS4_E2_POLICY_QUESTION', `${path}.question`, 'Policy decision question is required.');
      if (!decision.chosen) add('NS4_E2_POLICY_CHOSEN', `${path}.chosen`, 'Policy decision chosen value is required.');
      if (decision.alternatives.some(alternative => !alternative)) add('NS4_E2_POLICY_ALTERNATIVE', `${path}.alternatives`, 'Policy alternatives cannot be empty.');
      if (new Set(decision.alternatives).size !== decision.alternatives.length) add('NS4_E2_POLICY_ALTERNATIVE_DUPLICATE', `${path}.alternatives`, 'Policy alternatives must be unique.');
      decision.relatedJourneyIds?.forEach(relatedJourneyId => {
        if (!journeyIds.has(relatedJourneyId)) add('NS4_E2_POLICY_RELATED_JOURNEY', `${path}.relatedJourneyIds`, `Unknown related journey ${relatedJourneyId}.`);
      });
    });
  });

  const featureIds = new Set<string>();
  review.features.forEach((feature, index) => {
    checkId(feature.featureId, `features[${index}].featureId`, 'feature', featureIds, add);
    if (!feature.title) add('NS4_E2_FEATURE_TITLE', `features[${index}].title`, 'Feature title is required.');
  });

  const validStepRefs = new Set<string>();
  review.journeys.forEach((journey, journeyPosition) => {
    const base = `journeys[${journeyPosition}]`;
    const business = journey.business;
    if (!business.actorRef) add('NS4_E2_ACTOR', `${base}.business.actorRef`, 'actorRef is required.');
    if (!business.title) add('NS4_E2_TITLE', `${base}.business.title`, 'Journey title is required.');
    if (!business.goal) add('NS4_E2_GOAL', `${base}.business.goal`, 'Journey goal is required.');
    checkBusinessText(business.goal, `${base}.business.goal`, add);
    if (!business.steps.length) add('NS4_E2_STEPS', `${base}.business.steps`, 'Journey must contain at least one step.');
    if (!business.outcome.statement) add('NS4_E2_OUTCOME', `${base}.business.outcome.statement`, 'Outcome statement is required.');
    if (!business.outcome.evidence.length || business.outcome.evidence.some(item => !item)) {
      add('NS4_E2_EVIDENCE', `${base}.business.outcome.evidence`, 'Outcome needs observable evidence.');
    }

    const preferredRef = business.entry.preferredFromJourneyRef;
    if (preferredRef) checkEarlierJourneyRef(preferredRef, journey.journeyId, journeyPosition, journeyIndex, `${base}.business.entry.preferredFromJourneyRef`, add);

    const stepIds = new Set<string>();
    business.steps.forEach((step, stepPosition) => {
      const path = `${base}.business.steps[${stepPosition}]`;
      checkId(step.stepId, `${path}.stepId`, 'step', stepIds, add);
      validStepRefs.add(`${journey.journeyId}.${step.stepId}`);
      if (!STEP_KINDS.has(step.kind)) {
        add('NS4_E2_STEP_KIND', `${path}.kind`, `Unknown step kind ${step.kind || '(empty)'}. Use locate, inspect, act, decide or handoff.`);
      }
      if (!step.entity) add('NS4_E2_STEP_ENTITY', `${path}.entity`, 'Every step names the business record it operates on.');
      else if (!ENTITY_PATTERN.test(step.entity)) {
        add('NS4_E2_STEP_ENTITY_ID', `${path}.entity`, 'Step entity must be a stable PascalCase identifier, not a display label.');
      }
      if (!step.title) add('NS4_E2_STEP_TITLE', `${path}.title`, 'Step title is required.');
      if (!step.description) add('NS4_E2_STEP_DESCRIPTION', `${path}.description`, 'Step description must state an observable result.');
      checkBusinessText(step.title, `${path}.title`, add);
      checkBusinessText(step.description, `${path}.description`, add);
      if (step.targetProfile && !ID_PATTERN.test(step.targetProfile)) {
        add('NS4_E2_STEP_TARGET_PROFILE_ID', `${path}.targetProfile`, 'targetProfile must be a lower-camel profile id.');
      }
      if (step.kind !== 'handoff' && step.targetProfile) {
        add('NS4_E2_STEP_TARGET_PROFILE', `${path}.targetProfile`, 'Only a handoff step names a receiving profile.');
      }
      step.featureRefs.forEach(featureRef => {
        if (!featureIds.has(featureRef)) add('NS4_E2_FEATURE_REF', `${path}.featureRefs`, `Unknown featureRef ${featureRef}.`);
      });
    });

    if (business.entry.mode === 'contextOrLookup' && !business.steps.some(step => step.kind === 'locate')) {
      add('NS4_E2_LOOKUP_FALLBACK', `${base}.business.steps`, 'contextOrLookup must include a locate step as the direct-entry fallback.');
    }

    const ruleIds = new Set<string>();
    business.useRules.forEach((ruleId, index) => {
      checkId(ruleId, `${base}.business.useRules[${index}]`, 'rule reference', ruleIds, add);
    });
  });

  addTwinJourneyIssues(review.journeys, add);

  review.features.forEach((feature, index) => {
    if (feature.priority === 'now' && !feature.journeyStepRefs.length) {
      add('NS4_E2_NOW_FEATURE_UNMAPPED', `features[${index}].journeyStepRefs`, 'A now feature must map to at least one journey step.');
    }
    feature.journeyStepRefs.forEach(stepRef => {
      if (!validStepRefs.has(stepRef)) add('NS4_E2_FEATURE_STEP_REF', `features[${index}].journeyStepRefs`, `Unknown journey step ${stepRef}.`);
    });
  });

  return { ok: issues.length === 0, issues };
}

/**
 * Selection integrity is separate from the structural review gate because an alternative is valid
 * at the human checkpoint but must become the generated choice in the next complete rewrite.
 */
export function validateNs4E2PolicySelections(
  review: Ns4E2Review,
  selections: Array<Pick<Ns4PolicyDecisionSelection, 'decisionId' | 'selectedChoice'>>,
  requireHonored = false,
): Ns4E2GateResult {
  const issues: Ns4E2GateIssue[] = [];
  const decisions = new Map(review.journeys.flatMap(journey => journey.policyDecisions.map(decision => [decision.decisionId, decision])));
  const seen = new Set<string>();
  selections.forEach((selection, index) => {
    const path = `policyDecisionSelections[${index}]`;
    if (seen.has(selection.decisionId)) issues.push({ code: 'NS4_E2_POLICY_SELECTION_DUPLICATE', path, message: `Duplicate selection for ${selection.decisionId}.` });
    seen.add(selection.decisionId);
    const decision = decisions.get(selection.decisionId);
    if (!decision) {
      issues.push({ code: 'NS4_E2_POLICY_SELECTION_UNKNOWN', path, message: `Unknown policy decision ${selection.decisionId}.` });
      return;
    }
    if (selection.selectedChoice !== decision.chosen && !decision.alternatives.includes(selection.selectedChoice)) {
      issues.push({ code: 'NS4_E2_POLICY_SELECTION_VALUE', path, message: 'Selected policy choice must be the generated choice or one declared alternative.' });
    }
    // A demotion decision is recomputed deterministically on every round, so the generator cannot
    // "honor" it in a rewrite; the human choice is honored by E8 when it assigns the tier instead.
    if (requireHonored && !isNs4E2DemotionDecisionId(selection.decisionId) && selection.selectedChoice !== decision.chosen) {
      issues.push({ code: 'NS4_E2_POLICY_SELECTION_NOT_HONORED', path, message: `Rewritten draft must choose the human selection for ${selection.decisionId}.` });
    }
  });
  return { ok: issues.length === 0, issues };
}

/**
 * Operation set of a journey: sorted unique `kind:entity`. Titles and step ids do not count —
 * persona copies of the same flow (sign-as-morador vs sign-as-visitante) hash equal.
 */
export function ns4E2JourneyOperationKey(journey: Ns4JourneyProposal): string {
  return [...new Set(journey.business.steps.map(step => `${step.kind}:${step.entity}`).filter(item => item !== ':'))].sort().join(',');
}

function addTwinJourneyIssues(journeys: Ns4JourneyProposal[], add: AddIssue): void {
  const groups = new Map<string, Ns4JourneyProposal[]>();
  journeys.forEach(journey => {
    const key = ns4E2JourneyOperationKey(journey);
    if (!key || !journey.business.actorRef) return;
    const group = groups.get(key) || [];
    group.push(journey);
    groups.set(key, group);
  });
  groups.forEach((group, operations) => {
    const actors = [...new Set(group.map(journey => journey.business.actorRef))];
    if (actors.length < 2) return;
    const journeyIds = group.map(journey => journey.journeyId);
    add(
      'NS4_E2_TWIN_JOURNEYS',
      'journeys',
      `Journeys ${journeyIds.join(', ')} are twins: same operations (${operations}) with different actors (${actors.join(', ')}). A persona or demographic segment does not create an actor — collapse them into one actor.`,
    );
  });
}

type AddIssue = (code: string, path: string, message: string) => void;

function checkId(value: string, path: string, label: string, ids: Set<string>, add: AddIssue): void {
  if (!ID_PATTERN.test(value)) add('NS4_E2_ID', path, `${label} id must be a lower-camel identifier.`);
  if (ids.has(value)) add('NS4_E2_DUPLICATE_ID', path, `Duplicate ${label} id ${value || '(empty)'}.`);
  if (value) ids.add(value);
}

function checkBusinessText(value: string, path: string, add: AddIssue): void {
  if (RAW_TECHNICAL_ID_PATTERN.test(value)) {
    add('NS4_E2_RAW_TECHNICAL_ID', path, 'Business-facing journey text must name the business record, not ask for a technical id.');
  }
}

function checkEarlierJourneyRef(
  journeyRef: string,
  currentJourneyId: string,
  currentPosition: number,
  indexes: Map<string, number>,
  path: string,
  add: AddIssue,
): void {
  if (!journeyRef || !indexes.has(journeyRef)) {
    add('NS4_E2_PREFERRED_REF', path, `Unknown preferred origin journey ${journeyRef || '(empty)'}.`);
    return;
  }
  if (journeyRef === currentJourneyId) add('NS4_E2_PREFERRED_SELF', path, 'A journey cannot be its own preferred origin.');
  if ((indexes.get(journeyRef) ?? currentPosition) >= currentPosition) {
    add('NS4_E2_PREFERRED_ORDER', path, `Preferred origin ${journeyRef} must appear before ${currentJourneyId}.`);
  }
}
