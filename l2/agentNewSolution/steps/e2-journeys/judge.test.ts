/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/judge.test.ts" enhancement="_blank"/>

// The judge's POLICY is what these tests pin: what the pipeline is willing to act on, who owns severity,
// and how many times a disagreement may cost a regeneration. The rubric's phrasing is exercised
// separately by e2JudgeLive.test.ts (gated, real provider).

import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareE2JourneysArtifact, NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import {
  buildNsE2JudgeRepairStepPlan,
  buildNsE2JudgeStepPlan,
  decideNsE2JudgeOutcome,
  decideNsE2NextStep,
  normalizeNsE2JudgeFindings,
  renderNsE2JudgeMarkdown,
  renderNsE2JudgeRetryContext,
  summarizeNsE2ForJudge,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/judge.js';

function artifact(): NsE2JourneysArtifact {
  return prepareE2JourneysArtifact({
    moduleName: 'cafeFlow', moduleTitle: 'Cafe Flow', userLanguage: 'en', version: 1,
    actors: [{ actorId: 'clerk', name: 'Clerk' }],
    journeys: [{
      journeyId: 'takeOrder', actorId: 'clerk', title: 'Take an order', goal: 'g', outcome: 'o',
      steps: [{ stepId: 'openOrder', title: 'Open', intent: 'i', featureRefs: ['pos'] }],
      businessRules: [], notes: '',
    }],
    features: [{ featureId: 'pos', title: 'POS', priority: 'now', actorIds: ['clerk'] }],
    decisions: [], createdAt: '2026-08-02T00:00:00.000Z',
  });
}

const codesOf = (raw: unknown, source = artifact()) => normalizeNsE2JudgeFindings(raw, source, 1).findings.map(finding => finding.code);

void test('E2 judge: severity comes from the rubric, never from the model', () => {
  const report = normalizeNsE2JudgeFindings([
    { code: 'journey.step.locateMissing', journeyId: 'takeOrder', detail: 'd', severity: 'warning' },
    { code: 'entity.noReadSurface', subject: 'Shift', detail: 'd', severity: 'error' },
  ], artifact(), 1);
  assert.deepEqual(report.findings.map(finding => [finding.code, finding.severity]), [
    ['journey.step.locateMissing', 'error'],
    ['entity.noReadSurface', 'warning'],
  ]);
});

void test('E2 judge: an unactionable finding is discarded WITH a reason, never silently', () => {
  const report = normalizeNsE2JudgeFindings([
    { code: 'journey.isUgly', journeyId: 'takeOrder', detail: 'invented code' },
    { code: 'journey.step.locateMissing', journeyId: 'ghostJourney', detail: 'journey does not exist' },
    { code: 'journey.actor.stepMismatch', detail: 'names no journey' },
    { code: 'journey.step.locateMissing', journeyId: 'takeOrder', detail: 'first' },
    { code: 'journey.step.locateMissing', journeyId: 'takeOrder', detail: 'same problem again' },
  ], artifact(), 1);
  assert.deepEqual(report.findings.map(finding => finding.detail), ['first']);
  assert.deepEqual(report.discarded.map(entry => entry.reason), [
    'code is not in the rubric',
    'journey ghostJourney does not exist',
    'finding names no journey',
    'duplicate of a finding already reported',
  ]);
});

void test('E2 judge: J2 is dropped on a document that predates the prerequisite field', () => {
  const legacy = { ...artifact(), schemaVersion: '2026-07-06-ns-e2-v1' } as unknown as NsE2JourneysArtifact;
  assert.deepEqual(codesOf([{ code: 'journey.prerequisite.missing', journeyId: 'takeOrder', detail: 'd' }], legacy), []);
  // The same finding on the current contract is kept.
  assert.deepEqual(codesOf([{ code: 'journey.prerequisite.missing', journeyId: 'takeOrder', detail: 'd' }]), ['journey.prerequisite.missing']);
  assert.equal(summarizeNsE2ForJudge(legacy).declaresPrerequisite, false);
  assert.equal(summarizeNsE2ForJudge(artifact()).declaresPrerequisite, true);
});

void test('E2 judge: a step pointer that does not resolve loses the pointer, not the finding', () => {
  const report = normalizeNsE2JudgeFindings([
    { code: 'journey.step.locateMissing', journeyId: 'takeOrder', stepId: 'ghostStep', detail: 'd' },
    { code: 'journey.actor.stepMismatch', journeyId: 'takeOrder', stepId: 'openOrder', detail: 'd' },
  ], artifact(), 1);
  assert.equal(report.findings[0].stepId, undefined);
  assert.equal(report.findings[1].stepId, 'openOrder');
});

void test('E2 judge: one regeneration at most, and never over what the human just asked for', () => {
  const errors = [{ code: 'journey.step.locateMissing' as const, severity: 'error' as const, detail: 'd' }];
  const warnings = [{ code: 'entity.noReadSurface' as const, severity: 'warning' as const, detail: 'd' }];
  assert.equal(decideNsE2JudgeOutcome({ findings: errors, judgeAttempt: 1, annotateOnly: false }), 'repair');
  assert.equal(decideNsE2JudgeOutcome({ findings: errors, judgeAttempt: 2, annotateOnly: false }), 'proceed');
  assert.equal(decideNsE2JudgeOutcome({ findings: errors, judgeAttempt: 1, annotateOnly: true }), 'proceed');
  assert.equal(decideNsE2JudgeOutcome({ findings: warnings, judgeAttempt: 1, annotateOnly: false }), 'proceed');
  assert.equal(decideNsE2JudgeOutcome({ findings: [], judgeAttempt: 1, annotateOnly: false }), 'proceed');
});

void test('E2 judge: what e2 does after a green gate is one decision, not three booleans', () => {
  const base = { judgeAttempt: 1, afterAdjustment: false, fastMode: false, hasCheckpoint: false };
  assert.equal(decideNsE2NextStep(base), 'judge');
  assert.equal(decideNsE2NextStep({ ...base, hasCheckpoint: true }), 'judge', 'a repaired run is judged again');
  assert.equal(decideNsE2NextStep({ ...base, afterAdjustment: true }), 'judge', 'an adjustment is reviewed too (annotate-only)');
  // /fast auto-approves the checkpoint server-side: it must not pay for a review plus a regeneration.
  assert.equal(decideNsE2NextStep({ ...base, fastMode: true }), 'checkpoint');
  assert.equal(decideNsE2NextStep({ ...base, fastMode: true, hasCheckpoint: true }), 'none');
  // Past the bound the review is over: open the checkpoint even with findings on the table.
  assert.equal(decideNsE2NextStep({ ...base, judgeAttempt: 3 }), 'checkpoint');
  assert.equal(decideNsE2NextStep({ ...base, judgeAttempt: 3, hasCheckpoint: true }), 'none');
});

void test('E2 judge: the retry context carries only the errors, the markdown carries everything', () => {
  const report = normalizeNsE2JudgeFindings([
    { code: 'journey.step.locateMissing', journeyId: 'takeOrder', stepId: 'openOrder', detail: 'the clerk edits an order nobody located' },
    { code: 'entity.noReadSurface', subject: 'Shift', detail: 'no journey ever shows the shift' },
    { code: 'journey.isUgly', journeyId: 'takeOrder', detail: 'dropped' },
  ], artifact(), 1);
  const retry = renderNsE2JudgeRetryContext(report);
  assert.match(retry, /journey\.step\.locateMissing\] takeOrder \/ openOrder: the clerk edits/);
  assert.doesNotMatch(retry, /noReadSurface/, 'a warning must not trigger or steer a regeneration');
  const markdown = renderNsE2JudgeMarkdown(report);
  assert.match(markdown, /## Journey Review/);
  assert.match(markdown, /\*\*error\*\* `journey\.step\.locateMissing`/);
  assert.match(markdown, /\*\*warning\*\* `entity\.noReadSurface` Shift/);
  assert.match(markdown, /1 proposed finding\(s\) discarded/);
});

void test('E2 judge: a clean review produces no retry context at all', () => {
  const report = normalizeNsE2JudgeFindings([], artifact(), 1);
  assert.equal(renderNsE2JudgeRetryContext(report), '');
  assert.equal(renderNsE2JudgeMarkdown(report), '');
});

void test('E2 judge: the review sees the narrative, not the feature catalog', () => {
  const summary = summarizeNsE2ForJudge(artifact()) as Record<string, unknown>;
  assert.deepEqual(Object.keys(summary).sort(), ['actors', 'declaresPrerequisite', 'journeys', 'schemaVersion', 'userLanguage']);
  const journey = (summary.journeys as Record<string, unknown>[])[0];
  assert.equal(journey.featureRefs, undefined);
  assert.deepEqual(Object.keys(journey).sort(), ['actorId', 'businessRules', 'goal', 'journeyId', 'outcome', 'steps', 'title']);
});

// The step SHAPE is the one thing about this feature that fails silently: a step the runner never picks
// up leaves the task "in progress" forever (the run04 class of bug documented in flow.json.conventions).
void test('E2 judge: both steps carry the shape that makes the runner pick them up next', () => {
  const judgeStep = buildNsE2JudgeStepPlan({ moduleName: 'cafeFlow', judgeAttempt: 1, annotateOnly: false, now: 1000 });
  const repairStep = buildNsE2JudgeRepairStepPlan({ moduleName: 'cafeFlow', retryContext: 'fix this', judgeAttempt: 2, now: 2000 });
  for (const plan of [judgeStep, repairStep]) {
    // Identical to what addCheckpointReviewStep has always used to run right after e2 completes.
    assert.equal(plan.status, 'waiting_human_input');
    assert.deepEqual(plan.planning.dependsOn, []);
    assert.equal(plan.planning.executionMode, 'sequential');
    assert.equal(plan.planning.executionHost, 'client');
    assert.ok(plan.planning.planId.length > 0);
  }
  // The judge is entered by planId, and the attempt/annotate flags must survive the round trip.
  assert.deepEqual(JSON.parse(judgeStep.prompt), { planId: 'e2-judge', moduleName: 'cafeFlow', judgeAttempt: 1, annotateOnly: false });
  // The repair re-enters e2 itself, through the standard retry channel, carrying the attempt bound.
  assert.deepEqual(JSON.parse(repairStep.prompt), { planId: 'e2-journeys', moduleName: 'cafeFlow', retryContext: 'fix this', judgeAttempt: 2 });
  // Distinct planIds: two steps sharing one id would make the unlock ambiguous.
  assert.notEqual(judgeStep.planning.planId, repairStep.planning.planId);
});

void test('E2 judge: the repaired run is reviewed once more and can no longer regenerate', () => {
  const repair = buildNsE2JudgeRepairStepPlan({ moduleName: 'cafeFlow', retryContext: 'c', judgeAttempt: 2, now: 1 });
  const attempt = (JSON.parse(repair.prompt) as { judgeAttempt: number }).judgeAttempt;
  assert.equal(decideNsE2NextStep({ judgeAttempt: attempt, afterAdjustment: false, fastMode: false, hasCheckpoint: false }), 'judge');
  const errors = [{ code: 'journey.step.locateMissing' as const, severity: 'error' as const, detail: 'd' }];
  assert.equal(decideNsE2JudgeOutcome({ findings: errors, judgeAttempt: attempt, annotateOnly: false }), 'proceed');
});
