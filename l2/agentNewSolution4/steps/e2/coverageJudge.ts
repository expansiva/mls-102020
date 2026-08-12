/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/coverageJudge.ts" enhancement="_blank"/>

import type { Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';

export type Ns4E2CoverageCategory =
  | 'missingJourney'
  | 'missingActorJourney'
  | 'missingRecipientJourney'
  | 'missingContextAcquisition'
  | 'missingLookupSource'
  | 'missingOutcomeCoverage'
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
  const resolution = resolveNs4Findings(review, verdict.issues
    .filter(issue => issue.severity === 'blocking')
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
    'Linear-contract rule: never retain one act/decide step that combines creation with maintenance when maintenance needs an existing record. Split those outcomes into separate journeys; creation produces the record context, while maintenance locates or carries it before acting.',
    'Final self-check: each numbered blocker is absent from the complete replacement draft and every affected feature/prerequisite/handoff points to valid replacement journey steps.',
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
