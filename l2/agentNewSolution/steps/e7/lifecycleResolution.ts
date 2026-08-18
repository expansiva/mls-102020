/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e7/lifecycleResolution.ts" enhancement="_blank"/>

import type { Ns4E7GateIssue } from '/_102020_/l2/agentNewSolution/steps/e7/gate.js';

export interface Ns4E7LifecycleResolutionReview {
  planId: 'e7-lifecycle-resolution';
  moduleName: string;
  findings: Array<Ns4E7GateIssue & { findingId: string }>;
}

export interface Ns4E7LifecycleResolutionEvent {
  moduleName: string;
  selections: Array<{ findingId: string; action: 'operateState' | 'shrinkLifecycle' }>;
}

export function createNs4E7LifecycleResolutionReview(
  moduleName: string,
  issues: Ns4E7GateIssue[],
): Ns4E7LifecycleResolutionReview {
  return {
    planId: 'e7-lifecycle-resolution', moduleName,
    findings: issues.filter(issue => !!issue.repairOptions).map((issue, index) => ({
      ...issue, findingId: `${issue.code}:${issue.path}:${index}`,
    })),
  };
}
