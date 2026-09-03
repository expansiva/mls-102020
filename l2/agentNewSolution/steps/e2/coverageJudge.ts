/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2/coverageJudge.ts" enhancement="_blank"/>

import type { Ns4E2Review } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';
import {
  NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL,
  Ns4E2MechanicalCoverageReport,
} from '/_102020_/l2/agentNewSolution/steps/e2/coverageSignals.js';

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
    if (issue.category === NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL) {
      if (issue.issueId !== NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL) errors.push(`${path}.issueId must be moduleWithoutDecide.`);
      if (issue.severity !== 'blocking') errors.push(`${path}.severity must be blocking for moduleWithoutDecide.`);
      if (!issue.relatedJourneyIds.length) errors.push(`${path}.relatedJourneyIds must identify the affected journey for moduleWithoutDecide.`);
      const journeyIds = new Set(review?.journeys.map(journey => journey.journeyId) || []);
      if (review) issue.relatedJourneyIds.forEach(journeyId => {
        if (!journeyIds.has(journeyId)) errors.push(`${path}.relatedJourneyIds contains unknown journey ${journeyId}.`);
      });
    }
  });

  if (mechanicalCoverage) {
    const active = mechanicalCoverage.findings.some(finding => finding.signalId === NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL);
    const matching = verdict.issues.filter(issue => issue.category === NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL);
    if (active && matching.length !== 1) errors.push('moduleWithoutDecide mechanical signal requires exactly one matching issue.');
    if (!active && matching.length) errors.push('moduleWithoutDecide issue is not allowed when the module contains a decide step.');
  }

  const blockers = verdict.issues.filter(issue => issue.severity === 'blocking');
  if (verdict.complete && blockers.length) errors.push('complete=true cannot contain blocking issues.');
  if (!verdict.complete && !blockers.length) errors.push('complete=false requires at least one blocking issue.');
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
  const moduleWithoutDecide = verdict.issues.find(issue =>
    issue.severity === 'blocking' && issue.category === NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL
  );
  let reviewWithPolicy = review;
  if (moduleWithoutDecide) {
    const existingJourneyIds = new Set(review.journeys.map(journey => journey.journeyId));
    const ownerJourneyId = moduleWithoutDecide.relatedJourneyIds.find(journeyId => existingJourneyIds.has(journeyId));
    if (ownerJourneyId) {
      const decision = {
        decisionId: 'moduleWithoutDecidePolicy',
        question: moduleWithoutDecide.question,
        chosen: moduleWithoutDecide.defaultChoice,
        alternatives: moduleWithoutDecide.alternatives.filter(choice => choice !== moduleWithoutDecide.defaultChoice),
        impact: moduleWithoutDecide.finding,
        relatedJourneyIds: moduleWithoutDecide.relatedJourneyIds,
      };
      reviewWithPolicy = {
        ...review,
        journeys: review.journeys.map(journey => journey.journeyId !== ownerJourneyId ? journey : {
          ...journey,
          policyDecisions: [
            ...journey.policyDecisions.filter(item => item.decisionId !== decision.decisionId),
            decision,
          ],
        }),
      };
    }
  }
  const resolution = resolveNs4Findings(reviewWithPolicy, verdict.issues
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
  const byId = new Map(reviewWithPolicy.systemDecisions.map(decision => [decision.decisionId, decision]));
  resolution.systemDecisions.forEach(decision => byId.set(decision.decisionId, decision));
  return { ...resolution.artifact, systemDecisions: [...byId.values()] };
}

export function resolveNs4E2CoverageJudgeFailure(review: Ns4E2Review): Ns4E2Review {
  const portuguese = review.userLanguage.toLowerCase().startsWith('pt');
  const resolution = resolveNs4Findings(review, [{
    classification: 'B' as const,
    findingRef: `${NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL}.judgeUnavailable`,
    stage: 'e2',
    question: portuguese
      ? 'A necessidade de decisões ou aprovações nas jornadas do módulo foi avaliada nesta versão?'
      : 'Was the need for decision or approval steps evaluated in this module version?',
    defaultChoice: portuguese
      ? 'Não avaliada; as jornadas atuais foram preservadas.'
      : 'Not evaluated; the current journeys were preserved.',
    alternatives: [portuguese
      ? 'Reavaliar a cobertura de decisões em uma nova revisão.'
      : 'Re-evaluate decision coverage in a new review.'],
    changeHint: portuguese
      ? 'Peça uma nova revisão do E2 para avaliar decisões e aprovações.'
      : 'Request a new E2 review to evaluate decisions and approvals.',
  }]);
  const byId = new Map(review.systemDecisions.map(decision => [decision.decisionId, decision]));
  resolution.systemDecisions.forEach(decision => byId.set(decision.decisionId, decision));
  return { ...resolution.artifact, systemDecisions: [...byId.values()] };
}

export function formatNs4E2CoverageRepairFeedback(verdict: Ns4E2CoverageVerdict): string {
  const blockers = verdict.issues.filter(issue => issue.severity === 'blocking');
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
