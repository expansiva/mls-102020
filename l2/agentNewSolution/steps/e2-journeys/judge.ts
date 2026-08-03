/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/judge.ts" enhancement="_blank"/>

// improveJourneys T4 — the E2 JUDGE: the defects that no deterministic gate can see, caught while the
// artifact is still cheap to regenerate (before the human checkpoint, one small call, no fan-out).
//
// This file is the POLICY, and it is deliberately the larger half of the feature: the LLM only proposes
// findings against a CLOSED rubric, and everything that decides anything lives here, in pure code.
//   - the rubric is a fixed set of codes; an invented code is dropped;
//   - SEVERITY comes from the code, never from the model (a judge cannot escalate its own finding);
//   - a finding naming a journey that does not exist is dropped (an unactionable finding burns the one
//     repair round the run has);
//   - J2 only applies to artifacts that carry the `prerequisite` contract — on an older document the
//     model is being asked about a field the author had no way to write.
// The judge NEVER edits an artifact: at most it feeds findings into the standard e2 retry channel, and
// the human checkpoint stays the final authority.

import { NsGateSeverity } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { NsE2Journey, NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';

/** The e2 schema version from which a journey can declare `prerequisite` (J2 is meaningless before it). */
export const NS_E2_PREREQUISITE_SCHEMA_VERSION = '2026-08-02-ns-e2-v2';
/** 1 judge call on the first pass, 1 more on the repaired artifact. Never a third. */
export const NS_E2_MAX_JUDGE_ATTEMPTS = 2;

export type NsE2JudgeCode =
  | 'journey.step.locateMissing'        // J1
  | 'journey.prerequisite.missing'      // J2
  | 'journey.prerequisite.invalid'      // J2
  | 'journey.actor.stepMismatch'        // J3
  | 'entity.noReadSurface'              // J4
  | 'journey.outcome.unobservable';     // J5

/** SEVERITY IS OWNED HERE. J4/J5 are genuinely interpretive: they annotate, the human decides. */
const JUDGE_SEVERITY: Record<NsE2JudgeCode, NsGateSeverity> = {
  'journey.step.locateMissing': 'error',
  'journey.prerequisite.missing': 'error',
  'journey.prerequisite.invalid': 'error',
  'journey.actor.stepMismatch': 'error',
  'entity.noReadSurface': 'warning',
  'journey.outcome.unobservable': 'warning',
};

const JUDGE_CODES = Object.keys(JUDGE_SEVERITY) as NsE2JudgeCode[];
const PREREQUISITE_CODES: readonly NsE2JudgeCode[] = ['journey.prerequisite.missing', 'journey.prerequisite.invalid'];

export interface NsE2JudgeFinding {
  code: NsE2JudgeCode;
  severity: NsGateSeverity;
  journeyId?: string;
  stepId?: string;
  subject?: string;   // J4: the record whose state no journey ever shows
  detail: string;     // the model's one-sentence justification, in the user's language
}

export interface NsE2JudgeReport {
  moduleName: string;
  version: number;
  judgeAttempt: number;
  findings: NsE2JudgeFinding[];
  /** What was thrown away and why — a silent drop must never read as "the judge found nothing". */
  discarded: { reason: string; raw: string }[];
}

/** Does this artifact even carry the field J2 asks about? */
export function nsE2SupportsPrerequisite(artifact: Pick<NsE2JourneysArtifact, 'schemaVersion'>): boolean {
  return artifact.schemaVersion === NS_E2_PREREQUISITE_SCHEMA_VERSION;
}

/**
 * Turn whatever the model returned into findings this pipeline is willing to act on. Everything that
 * cannot be acted on is discarded WITH a reason.
 */
export function normalizeNsE2JudgeFindings(
  raw: unknown,
  artifact: NsE2JourneysArtifact,
  judgeAttempt: number,
): NsE2JudgeReport {
  const journeys = new Map(artifact.journeys.map(journey => [journey.journeyId, journey]));
  const supportsPrerequisite = nsE2SupportsPrerequisite(artifact);
  const findings: NsE2JudgeFinding[] = [];
  const discarded: { reason: string; raw: string }[] = [];
  const seen = new Set<string>();

  for (const item of Array.isArray(raw) ? raw : []) {
    const record = isRecord(item) ? item : {};
    const label = JSON.stringify(record).slice(0, 200);
    const code = readText(record.code) as NsE2JudgeCode;
    if (!JUDGE_CODES.includes(code)) {
      discarded.push({ reason: 'code is not in the rubric', raw: label });
      continue;
    }
    if (PREREQUISITE_CODES.includes(code) && !supportsPrerequisite) {
      discarded.push({ reason: `artifact schema ${artifact.schemaVersion} has no prerequisite field`, raw: label });
      continue;
    }
    const journeyId = readText(record.journeyId);
    if (journeyId && !journeys.has(journeyId)) {
      discarded.push({ reason: `journey ${journeyId} does not exist`, raw: label });
      continue;
    }
    // Every code except the module-wide J4 is a statement ABOUT a journey.
    if (!journeyId && code !== 'entity.noReadSurface') {
      discarded.push({ reason: 'finding names no journey', raw: label });
      continue;
    }
    const finding: NsE2JudgeFinding = {
      code,
      severity: JUDGE_SEVERITY[code],
      detail: readText(record.detail) || readText(record.message) || '(no detail)',
    };
    if (journeyId) finding.journeyId = journeyId;
    const stepId = readText(record.stepId);
    // A step that does not exist does not invalidate the journey-level claim — only the pointer.
    if (stepId && journeyId && journeys.get(journeyId)?.steps.some(step => step.stepId === stepId)) finding.stepId = stepId;
    const subject = readText(record.subject);
    if (subject) finding.subject = subject;
    const key = `${finding.code}|${finding.journeyId || ''}|${finding.subject || ''}`;
    if (seen.has(key)) {
      discarded.push({ reason: 'duplicate of a finding already reported', raw: label });
      continue;
    }
    seen.add(key);
    findings.push(finding);
  }

  return { moduleName: artifact.moduleName, version: artifact.version, judgeAttempt, findings, discarded };
}

export interface NsE2JudgeDecisionInput {
  findings: readonly NsE2JudgeFinding[];
  judgeAttempt: number;
  /** The human asked for this version: the judge may annotate it, never regenerate over the request. */
  annotateOnly: boolean;
}

/**
 * `repair` = one rerun of e2 with the findings in the standard retry context. Anything else proceeds to
 * the checkpoint carrying the findings — a judge that keeps disagreeing does NOT get to block the run;
 * the human reads the annotation and decides.
 */
export function decideNsE2JudgeOutcome(input: NsE2JudgeDecisionInput): 'repair' | 'proceed' {
  if (input.annotateOnly) return 'proceed';
  if (input.judgeAttempt >= NS_E2_MAX_JUDGE_ATTEMPTS) return 'proceed';
  return input.findings.some(finding => finding.severity === 'error') ? 'repair' : 'proceed';
}

/** What e2 does next once its gate is green — one place, so three booleans cannot drift into a deadlock. */
export interface NsE2NextStepInput {
  judgeAttempt: number;
  afterAdjustment: boolean;
  fastMode: boolean;
  hasCheckpoint: boolean;
}

export function decideNsE2NextStep(input: NsE2NextStepInput): 'judge' | 'checkpoint' | 'none' {
  const wantsCheckpoint = input.afterAdjustment || !input.hasCheckpoint;
  // /fast is the dev shortcut that auto-approves the checkpoint server-side: it must not pay for a
  // judge call and a possible repair round on the way there.
  if (input.fastMode) return wantsCheckpoint ? 'checkpoint' : 'none';
  if (input.judgeAttempt > NS_E2_MAX_JUDGE_ATTEMPTS) return wantsCheckpoint ? 'checkpoint' : 'none';
  return 'judge';
}

/** The findings as the e2 rerun receives them — the same channel a gate error uses. */
export function renderNsE2JudgeRetryContext(report: NsE2JudgeReport): string {
  const errors = report.findings.filter(finding => finding.severity === 'error');
  if (errors.length === 0) return '';
  return [
    'A review of these journeys found the problems below. Fix EXACTLY these, changing nothing else:',
    ...errors.map(finding => `- [${finding.code}] ${describeTarget(finding)}: ${finding.detail}`),
  ].join('\n');
}

/** The findings as the human reads them at the checkpoint (appended to e2-journeys.md). */
export function renderNsE2JudgeMarkdown(report: NsE2JudgeReport): string {
  if (report.findings.length === 0 && report.discarded.length === 0) return '';
  const lines: string[] = ['', '## Journey Review'];
  if (report.findings.length === 0) lines.push('- No findings.');
  for (const finding of report.findings) {
    lines.push(`- **${finding.severity}** \`${finding.code}\` ${describeTarget(finding)}: ${finding.detail}`);
  }
  if (report.discarded.length > 0) {
    lines.push(`- (${report.discarded.length} proposed finding(s) discarded as unactionable — see the trace.)`);
  }
  return lines.join('\n');
}

function describeTarget(finding: NsE2JudgeFinding): string {
  const parts = [finding.journeyId, finding.stepId, finding.subject].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : 'module';
}

/**
 * The two steps the judge adds to the task. Pure, so the SHAPE THE RUNNER NEEDS is pinned by a test
 * instead of being a guess: `status: waiting_human_input` + `dependsOn: []` + sequential/client is the
 * shape `addCheckpointReviewStep` has always used to make the next step run right after e2 completes.
 * Getting this wrong does not fail — it hangs (the run04 class of bug), so it is asserted, not assumed.
 */
export interface NsE2StepPlan {
  stepTitle: string;
  status: 'waiting_human_input';
  prompt: string;
  planning: { planId: string; dependsOn: string[]; executionMode: 'sequential'; executionHost: 'client' };
}

export function buildNsE2JudgeStepPlan(input: { moduleName: string; judgeAttempt: number; annotateOnly: boolean; now: number }): NsE2StepPlan {
  return {
    stepTitle: 'Review E2 journeys (automatic)',
    status: 'waiting_human_input',
    prompt: JSON.stringify({ planId: 'e2-judge', moduleName: input.moduleName, judgeAttempt: input.judgeAttempt, annotateOnly: input.annotateOnly }),
    planning: { planId: `e2-judge-${input.judgeAttempt}-${input.now}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

/** The repair: ONE rerun of e2 through the same `retryContext` channel a gate error uses. */
export function buildNsE2JudgeRepairStepPlan(input: { moduleName: string; retryContext: string; judgeAttempt: number; now: number }): NsE2StepPlan {
  return {
    stepTitle: 'Rework E2 journeys (review findings)',
    status: 'waiting_human_input',
    prompt: JSON.stringify({ planId: 'e2-journeys', moduleName: input.moduleName, retryContext: input.retryContext, judgeAttempt: input.judgeAttempt }),
    planning: { planId: `e2-journeys-review-${input.now}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

/** Compact view handed to the judge: the narrative it must reason about, without the catalog noise. */
export function summarizeNsE2ForJudge(artifact: NsE2JourneysArtifact): Record<string, unknown> {
  return {
    schemaVersion: artifact.schemaVersion,
    userLanguage: artifact.userLanguage,
    declaresPrerequisite: nsE2SupportsPrerequisite(artifact),
    actors: artifact.actors.map(actor => ({ actorId: actor.actorId, name: actor.name, description: actor.description })),
    journeys: artifact.journeys.map(summarizeJourneyForJudge),
  };
}

function summarizeJourneyForJudge(journey: NsE2Journey): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    journeyId: journey.journeyId,
    actorId: journey.actorId,
    title: journey.title,
    goal: journey.goal,
    outcome: journey.outcome,
    steps: journey.steps.map(step => ({ stepId: step.stepId, title: step.title, intent: step.intent, result: step.result })),
    businessRules: journey.businessRules,
  };
  if (journey.prerequisite) summary.prerequisite = journey.prerequisite;
  return summary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
