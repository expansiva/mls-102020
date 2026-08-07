/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/coverageJudge.ts" enhancement="_blank"/>

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
}

export interface Ns4E2CoverageVerdict {
  planId: 'e2-coverage-judge';
  moduleName: string;
  reviewRound: number;
  complete: boolean;
  summary: string;
  issues: Ns4E2CoverageIssue[];
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
  });

  const blockers = verdict.issues.filter(issue => issue.severity === 'blocking');
  if (verdict.complete && blockers.length) errors.push('complete=true cannot contain blocking issues.');
  if (!verdict.complete && !blockers.length) errors.push('complete=false requires at least one blocking issue.');
  return { ok: errors.length === 0, errors };
}

export function formatNs4E2CoverageRepairFeedback(verdict: Ns4E2CoverageVerdict): string {
  return [
    `Coverage judge: ${verdict.summary}`,
    ...verdict.issues
      .filter(issue => issue.severity === 'blocking')
      .map(issue => [
        `${issue.issueId} [${issue.category}]`,
        `Evidence: ${issue.sourceEvidence}`,
        `Finding: ${issue.finding}`,
        `Required repair: ${issue.repairInstruction}`,
        issue.relatedJourneyIds.length ? `Related journeys: ${issue.relatedJourneyIds.join(', ')}` : '',
      ].filter(Boolean).join(' | ')),
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
