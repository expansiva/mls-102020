import type { Ns4JourneyStepKind } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export const NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL = 'moduleWithoutDecide' as const;
export const NS4_E2_JOURNEY_WITHOUT_PROCESS_SIGNAL = 'journeyWithoutProcess' as const;

export interface Ns4E2StepKindHistogram {
  locate: number;
  inspect: number;
  act: number;
  decide: number;
  handoff: number;
}

export interface Ns4E2MechanicalCoverageFinding {
  signalId: typeof NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL;
}

export interface Ns4E2MechanicalCoverageReport {
  stepKindHistogram: Ns4E2StepKindHistogram;
  findings: Ns4E2MechanicalCoverageFinding[];
  /** Journeys that carry no process: pure capture or maintenance of one record catalogue. */
  captureOnlyJourneys: Array<{ journeyId: string; entity: string }>;
}

interface Ns4E2StepSource {
  journeys: Array<{
    journeyId?: unknown;
    business: {
      steps: Array<{ kind: unknown; entity?: unknown }>;
    };
  }>;
}

const STEP_KINDS: Ns4JourneyStepKind[] = ['locate', 'inspect', 'act', 'decide', 'handoff'];

export function analyzeNs4E2MechanicalCoverage(source: Ns4E2StepSource): Ns4E2MechanicalCoverageReport {
  const stepKindHistogram: Ns4E2StepKindHistogram = {
    locate: 0,
    inspect: 0,
    act: 0,
    decide: 0,
    handoff: 0,
  };
  source.journeys.forEach(journey => journey.business.steps.forEach(step => {
    if (STEP_KINDS.includes(step.kind as Ns4JourneyStepKind)) {
      stepKindHistogram[step.kind as Ns4JourneyStepKind] += 1;
    }
  }));
  return {
    stepKindHistogram,
    findings: stepKindHistogram.decide === 0
      ? [{ signalId: NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL }]
      : [],
    captureOnlyJourneys: source.journeys.flatMap(journey => {
      const journeyId = typeof journey.journeyId === 'string' ? journey.journeyId : '';
      const entities = [...new Set(journey.business.steps.map(step => typeof step.entity === 'string' ? step.entity : '').filter(Boolean))];
      const hasProcess = journey.business.steps.some(step => step.kind === 'decide' || step.kind === 'handoff');
      const touchesRecords = journey.business.steps.some(step => step.kind === 'act');
      return journeyId && touchesRecords && !hasProcess && entities.length === 1
        ? [{ journeyId, entity: entities[0] }]
        : [];
    }),
  };
}

/**
 * A journey with no decision, no handoff and one single entity is the record catalogue of that
 * entity written as a flow. Tier 1 already owns that screen, so the module records the demotion as
 * a visible product choice instead of shipping the same catalogue twice.
 */
export function ns4E2DemotionDecisionId(journeyId: string): string {
  return `demote${journeyId.slice(0, 1).toUpperCase()}${journeyId.slice(1)}ToRecordCatalogue`;
}

export function isNs4E2DemotionDecisionId(decisionId: string): boolean {
  return /^demote[A-Z][A-Za-z0-9]*ToRecordCatalogue$/.test(decisionId);
}
