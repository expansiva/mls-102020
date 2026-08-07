/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/judge.ts" enhancement="_blank"/>

export type Ns4E5JudgeCategory = 'missingCoverage' | 'contradiction' | 'unenforceable'
  | 'wrongDestination' | 'hardcodedExample' | 'invalidTraceability';
export interface Ns4E5JudgeIssue {
  issueId: string; severity: 'blocking' | 'advisory'; category: Ns4E5JudgeCategory;
  sourceEvidence: string; finding: string; repairInstruction: string; relatedRuleIds: string[];
}
export interface Ns4E5JudgeVerdict {
  planId: 'e5-rules-judge'; moduleName: string; reviewRound: number;
  complete: boolean; summary: string; issues: Ns4E5JudgeIssue[];
}

const ID = /^[a-z][A-Za-z0-9]*$/;
const CATEGORIES = new Set<Ns4E5JudgeCategory>(['missingCoverage', 'contradiction', 'unenforceable', 'wrongDestination', 'hardcodedExample', 'invalidTraceability']);

export function normalizeNs4E5JudgeVerdict(value: unknown, moduleName: string, reviewRound: number): Ns4E5JudgeVerdict {
  const root = unwrap(value);
  return {
    planId: 'e5-rules-judge', moduleName: text(root.moduleName) || moduleName,
    reviewRound: positiveInteger(root.reviewRound, reviewRound), complete: root.complete === true,
    summary: text(root.summary), issues: array(root.issues).map(item => {
      const issue = record(item);
      return {
        issueId: text(issue.issueId), severity: issue.severity === 'advisory' ? 'advisory' : 'blocking',
        category: CATEGORIES.has(issue.category as Ns4E5JudgeCategory) ? issue.category as Ns4E5JudgeCategory : 'missingCoverage',
        sourceEvidence: text(issue.sourceEvidence), finding: text(issue.finding),
        repairInstruction: text(issue.repairInstruction), relatedRuleIds: array(issue.relatedRuleIds).map(text).filter(Boolean),
      };
    }),
  };
}

export function validateNs4E5JudgeVerdict(verdict: Ns4E5JudgeVerdict, moduleName: string, reviewRound: number): string[] {
  const errors: string[] = [];
  if (verdict.moduleName !== moduleName) errors.push(`moduleName must be ${moduleName}.`);
  if (verdict.reviewRound !== reviewRound) errors.push(`reviewRound must be ${reviewRound}.`);
  if (!verdict.summary) errors.push('summary is required.');
  const ids = new Set<string>();
  verdict.issues.forEach((issue, index) => {
    if (!ID.test(issue.issueId) || ids.has(issue.issueId)) errors.push(`issues[${index}].issueId must be unique lower-camel.`);
    ids.add(issue.issueId);
    if (!issue.sourceEvidence || !issue.finding || !issue.repairInstruction) errors.push(`issues[${index}] requires evidence, finding and repairInstruction.`);
  });
  const blockers = verdict.issues.filter(issue => issue.severity === 'blocking');
  if (verdict.complete && blockers.length) errors.push('complete=true cannot contain blocking issues.');
  if (!verdict.complete && !blockers.length) errors.push('complete=false requires a blocking issue.');
  return errors;
}

export function formatNs4E5JudgeFeedback(verdict: Ns4E5JudgeVerdict): string {
  return [verdict.summary, ...verdict.issues.filter(issue => issue.severity === 'blocking')
    .map(issue => `${issue.issueId} [${issue.category}] Evidence: ${issue.sourceEvidence} | Finding: ${issue.finding} | Repair: ${issue.repairInstruction}`)].join('\n');
}

function unwrap(value: unknown): Record<string, unknown> {
  let current: unknown = value;
  if (typeof current === 'string') { try { current = JSON.parse(current.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { current = {}; } }
  const root = record(current);
  if (root.type === 'flexible') return unwrap(root.result);
  return root;
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function positiveInteger(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback; }
