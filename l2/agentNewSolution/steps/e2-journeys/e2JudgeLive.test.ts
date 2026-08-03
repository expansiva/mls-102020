/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/e2JudgeLive.test.ts" enhancement="_blank"/>

// GOLDEN REPLAY of the E2 journey judge (improveJourneys T4), against a real provider through the REAL
// prompt on the REAL artifacts of three audited runs.
//
// WHAT IS ASSERTED vs WHAT IS REPORTED — this split is the finding of T4, not a weakening of the test.
// Measured over 4 live runs while the rubric was being written:
//
//   STABLE (asserted): the judge never reported a self-contained journey. `generateStatusReport`,
//   `followOrderUntilServe`, the four self-contained petShop journeys and `createBooking` came back
//   clean in every run. That is the property the pipeline depends on — a judge that invents problems
//   burns the one regeneration a run has and churns the human checkpoint.
//
//   STABLE (asserted): J2 on a v2 document. `updateBooking` continues `createBooking` on a record it
//   never declares inheriting; `confirmArrival` declares it and must stay clean.
//
//   UNSTABLE (reported, not asserted): detection of the cases todo/newSolution/improveJourneys.md T4
//   named. Checked against the artifact text, three of the four were misattributed to this layer:
//     - `manageChangeOrder` (buildFlowFsm) — its FIRST step documents (creates) the change order it
//       then approves. Under J1 as written it is correct to leave it alone. Its real defect is that a
//       lifecycle collapses create → review → approve into one sitting, which is what produces a page
//       with no list. Encoding that would require deciding WHICH decisions deserve a second visit —
//       domain knowledge the rubric is forbidden to carry. Detected in 2 of 4 runs, for the wrong
//       reason, and no longer after J1 was made unambiguous.
//     - `runDailyShift` (cafeFlow) — opens the shift it later closes: nothing to locate.
//     - J4 on cafeFlow's `DailyShift` — "no listing operation exists in the module" is a fact of e5/e6;
//       the e2 text has the manager monitoring the open shift and reading its closing report.
//     - `maintainMenu` (cafeFlow) — a true case ("create or edit" an existing item, never opened), but
//       borderline enough to be detected intermittently.
//   petShop is also NOT clean at e2, though §3.2 calls its l4 clean: `processInStorePayment` reviews a
//   reservation that a DIFFERENT journey locates — a true J1 on a v1 document, and exactly what
//   `prerequisite` exists to express.
//
// GATED: skipped unless live tests are enabled (AGENT_LIVE_TESTS=1).
//   Run:  AGENT_LIVE_TESTS=1 node scripts/run-tests.mjs 102020

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { liveTestsEnabled, liveRuns, callToolProvider, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { buildNsToolInstruction, createNsToolSchema } from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';
import { prepareE2JourneysArtifact, NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import {
  NsE2JudgeFinding,
  normalizeNsE2JudgeFindings,
  summarizeNsE2ForJudge,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/judge.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const JUDGE_TOOL = 'submitNsJourneyJudgment';
const MODEL_TYPE = 'reasoning'; // the marker promptJudge.md declares
const config = () => parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));

const judgePrompt = () => readFileSync(path.join(HERE, 'promptJudge.md'), 'utf8').split('{{toolName}}').join(JUDGE_TOOL);
const judgeSchema = () => JSON.parse(readFileSync(path.join(HERE, '../../schemas/e2-judge.schema.json'), 'utf8')) as Record<string, unknown>;

function baselineArtifact(name: string): NsE2JourneysArtifact {
  const raw = JSON.parse(readFileSync(path.join(HERE, 'fixture/baseline', name, 'e2-journeys.json'), 'utf8')) as Record<string, unknown>;
  // The captures are v1: prepare would stamp them as v2 and make J2 appear answerable. Keep the
  // version the run actually produced, which is what the judge must be told.
  return { ...prepareE2JourneysArtifact(raw), schemaVersion: raw.schemaVersion } as unknown as NsE2JourneysArtifact;
}

// A v2 document for J2 only: `updateBooking` continues work `createBooking` started, on a record it
// never obtains and never declares arriving. Two journeys, no domain content beyond what the rubric needs.
function prerequisiteArtifact(): NsE2JourneysArtifact {
  return prepareE2JourneysArtifact({
    moduleName: 'bookingFlow', moduleTitle: 'Booking Flow', userLanguage: 'en', version: 1,
    actors: [{ actorId: 'agent', name: 'Booking agent', description: 'Creates and updates bookings for callers.' }],
    journeys: [
      {
        journeyId: 'createBooking', actorId: 'agent', title: 'Create a booking', goal: 'register a new booking for a caller',
        steps: [
          { stepId: 'openForm', title: 'Start a booking', intent: 'the agent starts a new booking while the caller is on the line', featureRefs: ['booking'] },
          { stepId: 'confirm', title: 'Confirm the booking', intent: 'the agent confirms the booking and reads the confirmation back to the caller', featureRefs: ['booking'] },
        ],
        outcome: 'a confirmed booking exists and the agent has read it back to the caller',
        businessRules: [], notes: '',
      },
      {
        journeyId: 'confirmArrival', actorId: 'agent', title: 'Confirm the arrival', goal: 'mark that the caller of the booking just created has arrived',
        prerequisite: { kind: 'journey', journeyId: 'createBooking', carries: ['booking'] },
        steps: [
          { stepId: 'markArrived', title: 'Mark as arrived', intent: 'the agent marks the booking as arrived', featureRefs: ['booking'] },
          { stepId: 'seeArrived', title: 'See the new state', intent: 'the agent sees the booking listed as arrived', featureRefs: ['booking'] },
        ],
        outcome: 'the booking is marked as arrived',
        businessRules: [], notes: '',
      },
      {
        journeyId: 'updateBooking', actorId: 'agent', title: 'Change a booking', goal: 'change the date of the booking that was just created',
        steps: [
          { stepId: 'changeDate', title: 'Change the date', intent: 'the agent changes the date of the booking', featureRefs: ['booking'] },
          { stepId: 'confirmChange', title: 'Confirm the change', intent: 'the agent confirms and sees the new date on the booking', featureRefs: ['booking'] },
        ],
        outcome: 'the booking now carries the new date',
        businessRules: [], notes: '',
      },
    ],
    features: [{ featureId: 'booking', title: 'Bookings', priority: 'now', actorIds: ['agent'] }],
    decisions: [], createdAt: '2026-08-02T00:00:00.000Z',
  });
}

async function judge(artifact: NsE2JourneysArtifact): Promise<NsE2JudgeFinding[]> {
  const result = await callToolProvider(config(), {
    modelType: MODEL_TYPE,
    system: `${judgePrompt()}\n\n${buildNsToolInstruction(JUDGE_TOOL, 'the journey document is missing or unreadable')}`,
    human: ['## Journeys under review', JSON.stringify(summarizeNsE2ForJudge(artifact), null, 2)].join('\n'),
    tool: createNsToolSchema(JUDGE_TOOL, 'Report the journey review findings (an empty list is a valid answer).', judgeSchema()),
    timeoutMs: 300000,
  });
  assert.ok(!result.schemaReject, `schema-definition rejection (status ${result.status}): ${result.text.slice(0, 300)}`);
  assert.equal(result.status, 200, `expected 200, got ${result.status}: ${result.text.replace(/\s+/g, ' ').slice(0, 300)}`);
  assert.ok(result.args, 'no tool_call result in response');
  return normalizeNsE2JudgeFindings((result.args as { findings?: unknown }).findings, artifact, 1).findings;
}

const errorsOn = (findings: NsE2JudgeFinding[], journeyId: string): NsE2JudgeFinding[] =>
  findings.filter(finding => finding.severity === 'error' && finding.journeyId === journeyId);

/** Detection is reported, not asserted — see the header. The diagnostic is the point of running this. */
function report(fixture: string, findings: NsE2JudgeFinding[]): void {
  const line = findings.length === 0
    ? 'no findings'
    : findings.map(finding => `${finding.severity}/${finding.code}@${finding.journeyId || finding.subject || 'module'}`).join(', ');
  assert.ok(true, `[judge] ${fixture}: ${line}`);
  process.stdout.write(`[judge] ${fixture}: ${line}\n`);
}

void test('live: the judge never reports a self-contained journey', { skip: !liveTestsEnabled() }, async () => {
  for (let run = 0; run < liveRuns(); run += 1) {
    const buildFlowFsm = await judge(baselineArtifact('buildFlowFsm'));
    assert.deepEqual(errorsOn(buildFlowFsm, 'generateStatusReport'), [],
      `generateStatusReport opens by locating the project: ${JSON.stringify(buildFlowFsm)}`);
    report('buildFlowFsm', buildFlowFsm);

    const cafeFlow = await judge(baselineArtifact('cafeFlow'));
    assert.deepEqual(errorsOn(cafeFlow, 'followOrderUntilServe'), [],
      `followOrderUntilServe opens by consulting the order: ${JSON.stringify(cafeFlow)}`);
    // Weaker than the assertions around it: observed clean once under the final wording, while the
    // others have several runs behind them. Its later steps ("monitor the day", "check payment totals")
    // are readable as acting on records it never locates — if this flakes, that is why.
    assert.deepEqual(errorsOn(cafeFlow, 'runDailyShift'), [],
      `runDailyShift opens the shift it later closes: ${JSON.stringify(cafeFlow)}`);
    report('cafeFlow', cafeFlow);

    const petShop = await judge(baselineArtifact('petShop'));
    for (const journeyId of ['browseFeaturedProducts', 'searchAndFilterCatalog', 'reserveProducts', 'manageReservations']) {
      assert.deepEqual(errorsOn(petShop, journeyId), [], `${journeyId} is self-contained: ${JSON.stringify(petShop)}`);
    }
    report('petShop', petShop);
  }
});

void test('live: J2 fires when a journey continues another one without declaring what it inherits', { skip: !liveTestsEnabled() }, async () => {
  for (let run = 0; run < liveRuns(); run += 1) {
    const findings = await judge(prerequisiteArtifact());
    assert.ok(findings.some(finding => finding.journeyId === 'updateBooking' && finding.code.startsWith('journey.prerequisite')),
      `updateBooking inherits a booking it never declares: ${JSON.stringify(findings)}`);
    assert.deepEqual(errorsOn(findings, 'createBooking'), [],
      'createBooking creates what it works on — it must pass');
    // The other half of the same rule: declaring what arrives IS how the actor got there.
    assert.deepEqual(errorsOn(findings, 'confirmArrival'), [],
      `confirmArrival declares the booking arriving from createBooking: ${JSON.stringify(findings)}`);
  }
});
