import type { Ns4JourneyStepKind } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export const NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL = 'moduleWithoutDecide' as const;

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
}

interface Ns4E2StepSource {
  journeys: Array<{
    business: {
      steps: Array<{ kind: unknown }>;
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
  };
}
