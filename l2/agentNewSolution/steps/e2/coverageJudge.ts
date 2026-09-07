/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2/coverageJudge.ts" enhancement="_blank"/>

import type { Ns4E2Review } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import { resolveNs4Findings, type Ns4TypeBFinding } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';
import {
  analyzeNs4E2MechanicalCoverage,
  NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL,
  Ns4E2MechanicalCoverageReport,
} from '/_102020_/l2/agentNewSolution/steps/e2/coverageSignals.js';
import {
  NS4_E2_DECIDE_ON_READ_MODEL,
  ns4E2DecideOnReadModelSteps,
} from '/_102020_/l2/agentNewSolution/steps/e2/gate.js';

export const NS4_E2_MODULE_WITHOUT_DECIDE_POLICY_ID = 'moduleWithoutDecidePolicy' as const;
export const NS4_E2_NO_DECISION_STEP_CHOICE = 'noDecisionStepInThisModule' as const;
export const NS4_E2_ADD_DECISION_STEP_CHOICE = 'addDecisionStep' as const;
export const NS4_E2_DEMOTE_DECIDE_TO_RULE_ID = 'demoteDecideToRule' as const;
export const NS4_E2_KEEP_DECIDE_STEP_CHOICE = 'keepDecideStep' as const;
export const NS4_E2_CONVERT_TO_ACT_WITH_RULE_CHOICE = 'convertToActWithRule' as const;

export type Ns4E2CoverageCategory =
  | 'missingJourney'
  | 'missingActorJourney'
  | 'missingRecipientJourney'
  | 'missingContextAcquisition'
  | 'missingLookupSource'
  | 'missingOutcomeCoverage'
  | 'moduleWithoutDecide'
  | 'contradictoryScope';

export interface Ns4E2CoverageIssue {
  issueId: string;
  severity: 'blocking' | 'advisory';
  category: Ns4E2CoverageCategory;
  sourceEvidence: string;
  finding: string;
  repairInstruction: string;
  relatedJourneyIds: string[];
  question: string;
  alternatives: string[];
  defaultChoice: string;
}

export interface Ns4E2CoverageVerdict {
  planId: 'e2-coverage-judge';
  moduleName: string;
  reviewRound: number;
  complete: boolean;
  summary: string;
  issues: Ns4E2CoverageIssue[];
  policyDecisionImpacts: Array<{
    decisionId: string;
    impact: string;
    relatedJourneyIds: string[];
  }>;
}

export interface Ns4E2CoverageVerdictValidation {
  ok: boolean;
  errors: string[];
}

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const CATEGORIES = new Set<Ns4E2CoverageCategory>([
  'missingJourney',
  'missingActorJourney',
  'missingRecipientJourney',
  'missingContextAcquisition',
  'missingLookupSource',
  'missingOutcomeCoverage',
  'moduleWithoutDecide',
  'contradictoryScope',
]);

export function normalizeNs4E2CoverageVerdict(
  value: unknown,
  fallbackModule = '',
  fallbackRound = 1,
): Ns4E2CoverageVerdict {
  const source = record(value);
  return {
    planId: 'e2-coverage-judge',
    moduleName: text(source.moduleName) || fallbackModule,
    reviewRound: positiveInteger(source.reviewRound, fallbackRound),
    complete: source.complete === true,
    summary: text(source.summary),
    issues: array(source.issues).map(item => {
      const issue = record(item);
      return {
        issueId: text(issue.issueId),
        severity: issue.severity === 'advisory' ? 'advisory' : 'blocking',
        category: category(issue.category),
        sourceEvidence: text(issue.sourceEvidence),
        finding: text(issue.finding),
        repairInstruction: text(issue.repairInstruction),
        relatedJourneyIds: strings(issue.relatedJourneyIds),
        question: text(issue.question),
        alternatives: strings(issue.alternatives),
        defaultChoice: text(issue.defaultChoice),
      };
    }),
    policyDecisionImpacts: array(source.policyDecisionImpacts).map(item => {
      const impact = record(item);
      return {
        decisionId: text(impact.decisionId),
        impact: text(impact.impact),
        relatedJourneyIds: strings(impact.relatedJourneyIds),
      };
    }),
  };
}

export function validateNs4E2CoverageVerdict(
  verdict: Ns4E2CoverageVerdict,
  expectedModule: string,
  expectedRound: number,
  mechanicalCoverage?: Ns4E2MechanicalCoverageReport,
  review?: Ns4E2Review,
): Ns4E2CoverageVerdictValidation {
  const errors: string[] = [];
  if (verdict.moduleName !== expectedModule) errors.push(`moduleName must be ${expectedModule}.`);
  if (verdict.reviewRound !== expectedRound) errors.push(`reviewRound must be ${expectedRound}.`);
  if (!verdict.summary) errors.push('summary is required.');

  const issueIds = new Set<string>();
  verdict.issues.forEach((issue, index) => {
    const path = `issues[${index}]`;
    if (!MEMBER_ID.test(issue.issueId)) errors.push(`${path}.issueId must be lower-camel.`);
    if (issueIds.has(issue.issueId)) errors.push(`${path}.issueId duplicates ${issue.issueId}.`);
    if (issue.issueId) issueIds.add(issue.issueId);
    if (!CATEGORIES.has(issue.category)) errors.push(`${path}.category is invalid.`);
    if (!issue.sourceEvidence) errors.push(`${path}.sourceEvidence is required.`);
    if (!issue.finding) errors.push(`${path}.finding is required.`);
    if (!issue.repairInstruction) errors.push(`${path}.repairInstruction is required.`);
    if (!issue.question) errors.push(`${path}.question is required.`);
    if (!issue.defaultChoice) errors.push(`${path}.defaultChoice is required.`);
    if (issue.alternatives.length < 2) errors.push(`${path}.alternatives requires at least two choices.`);
    if (issue.defaultChoice && !issue.alternatives.includes(issue.defaultChoice)) errors.push(`${path}.defaultChoice must be one of alternatives.`);
  });

  if (mechanicalCoverage) {
    const active = mechanicalCoverage.findings.some(finding => finding.signalId === NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL);
    const matching = verdict.issues.filter(issue => issue.category === NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL);
    if (!active && matching.length) errors.push('moduleWithoutDecide issue is not allowed when the module contains a decide step.');
  }

  const blockers = verdict.issues.filter(issue =>
    issue.severity === 'blocking' && issue.category !== NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL
  );
  if (verdict.complete && blockers.length) errors.push('complete=true cannot contain blocking issues.');
  if (!verdict.complete && !blockers.length) {
    const leftover = verdict.issues.some(issue => issue.category === NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL);
    if (!leftover) errors.push('complete=false requires at least one blocking issue.');
  }
  const impactIds = new Set<string>();
  verdict.policyDecisionImpacts.forEach((impact, index) => {
    const path = `policyDecisionImpacts[${index}]`;
    if (!MEMBER_ID.test(impact.decisionId)) errors.push(`${path}.decisionId must be lower-camel.`);
    if (impactIds.has(impact.decisionId)) errors.push(`${path}.decisionId duplicates ${impact.decisionId}.`);
    if (impact.decisionId) impactIds.add(impact.decisionId);
    if (!impact.impact) errors.push(`${path}.impact is required.`);
  });
  return { ok: errors.length === 0, errors };
}

export function applyNs4E2PolicyDecisionImpacts(
  review: Ns4E2Review,
  verdict: Ns4E2CoverageVerdict,
): Ns4E2Review {
  const impacts = new Map(verdict.policyDecisionImpacts.map(impact => [impact.decisionId, impact]));
  return {
    ...review,
    journeys: review.journeys.map(journey => ({
      ...journey,
      policyDecisions: journey.policyDecisions.map(decision => {
        const impact = impacts.get(decision.decisionId);
        return impact ? { ...decision, impact: impact.impact, ...(impact.relatedJourneyIds.length ? { relatedJourneyIds: impact.relatedJourneyIds } : {}) } : decision;
      }),
    })),
  };
}

export function resolveNs4E2CoverageFindings(
  review: Ns4E2Review,
  verdict: Ns4E2CoverageVerdict,
): Ns4E2Review {
  const resolution = resolveNs4Findings(review, verdict.issues
    .filter(issue => issue.severity === 'blocking' && issue.category !== NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL)
    .map(issue => ({
      classification: 'B' as const,
      findingRef: issue.issueId,
      stage: 'e2',
      question: issue.question,
      defaultChoice: issue.defaultChoice,
      alternatives: issue.alternatives,
      changeHint: issue.repairInstruction,
    })));
  const byId = new Map(review.systemDecisions.map(decision => [decision.decisionId, decision]));
  resolution.systemDecisions.forEach(decision => byId.set(decision.decisionId, decision));
  return applyNs4E2RegistrarDecisions({ ...resolution.artifact, systemDecisions: [...byId.values()] });
}

export function resolveNs4E2CoverageJudgeFailure(review: Ns4E2Review): Ns4E2Review {
  return applyNs4E2RegistrarDecisions(review);
}

/**
 * Deterministic registrars recorded after the structural gate / coverage judge. Neither is a
 * blocking issue and neither may ask the generator to invent a decide step.
 */
export function applyNs4E2RegistrarDecisions(review: Ns4E2Review): Ns4E2Review {
  const findings: Ns4TypeBFinding[] = [];
  const known = new Set(review.systemDecisions.map(decision => decision.decisionId));
  const mechanical = analyzeNs4E2MechanicalCoverage(review);
  if (
    mechanical.findings.some(finding => finding.signalId === NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL)
    && !known.has(NS4_E2_MODULE_WITHOUT_DECIDE_POLICY_ID)
  ) {
    findings.push({
      classification: 'B',
      decisionId: NS4_E2_MODULE_WITHOUT_DECIDE_POLICY_ID,
      findingRef: NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL,
      stage: 'e2',
      question: 'Does this module need a human decision step between named outcomes?',
      defaultChoice: NS4_E2_NO_DECISION_STEP_CHOICE,
      alternatives: [NS4_E2_ADD_DECISION_STEP_CHOICE],
      changeHint: 'A module that only records facts has no decide step. Add a decide step only when the request names a human choice between outcomes.',
    });
  }
  ns4E2DecideOnReadModelSteps(review).forEach(hit => {
    const decisionId = demoteDecideToRuleDecisionId(hit.stepId);
    if (known.has(decisionId)) return;
    findings.push({
      classification: 'B',
      decisionId,
      findingRef: NS4_E2_DECIDE_ON_READ_MODEL,
      stage: 'e2',
      question: 'A decide step operates on an entity that no act step writes. Keep it, or convert it to an act with a rule?',
      defaultChoice: NS4_E2_KEEP_DECIDE_STEP_CHOICE,
      alternatives: [NS4_E2_CONVERT_TO_ACT_WITH_RULE_CHOICE],
      changeHint: 'The entity is never written in this module, so it has no state of its own to transition. Prefer an act that applies a rule.',
    });
  });
  if (!findings.length) return review;
  const resolution = resolveNs4Findings(review, findings);
  const byId = new Map(review.systemDecisions.map(decision => [decision.decisionId, decision]));
  resolution.systemDecisions.forEach(decision => byId.set(decision.decisionId, decision));
  return { ...review, systemDecisions: [...byId.values()] };
}

function demoteDecideToRuleDecisionId(stepId: string): string {
  return `${NS4_E2_DEMOTE_DECIDE_TO_RULE_ID}${stepId.slice(0, 1).toUpperCase()}${stepId.slice(1)}`;
}

export function formatNs4E2CoverageRepairFeedback(verdict: Ns4E2CoverageVerdict): string {
  const blockers = verdict.issues.filter(issue =>
    issue.severity === 'blocking' && issue.category !== NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL
  );
  return [
    `Coverage judge: ${verdict.summary}`,
    `Mandatory repair checklist: ${blockers.length} blocking issue(s). Resolve every numbered item; preserve unaffected journeys.`,
    ...blockers.map((issue, index) => [
        `${index + 1}. ${issue.issueId} [${issue.category}]`,
        `Evidence: ${issue.sourceEvidence}`,
        `Finding: ${issue.finding}`,
        `Required repair: ${issue.repairInstruction}`,
        issue.relatedJourneyIds.length ? `Related journeys: ${issue.relatedJourneyIds.join(', ')}` : '',
      ].filter(Boolean).join(' | ')),
    'Linear-contract rule: never retain one act/decide step that combines creation with maintenance when maintenance needs an existing record. Split those outcomes into separate journeys; creation produces the record, while maintenance locates it in an earlier step before acting.',
    'Final self-check: each numbered blocker is absent from the complete replacement draft and every affected feature and handoff points to valid replacement journey steps.',
  ].join('\n');
}

function category(value: unknown): Ns4E2CoverageCategory {
  return CATEGORIES.has(value as Ns4E2CoverageCategory)
    ? value as Ns4E2CoverageCategory
    : 'missingJourney';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return array(value).map(text).filter(Boolean);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
