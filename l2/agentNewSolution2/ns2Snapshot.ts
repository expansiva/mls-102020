/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2Snapshot.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Assembles the reduced planning context the domain/behavior agents read. Isolating the cross-agent
// getters here keeps the (benign, function-level) import cycles in one place.

import { getInitialPlanSummary } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import {
  getRequirementsClarificationAnswer,
  getImplementationDecisionResult,
  type RequirementsClarificationAnswer,
  type ImplementationDecisionResult,
} from '/_102020_/l2/agentNewSolution2/agentNewSolution2Requirements.js';
import { getDiscoverScopeOutput, type DiscoverScopeResult } from '/_102020_/l2/agentNewSolution2/agentNs2DiscoverScope.js';
import { getRecommendOutput, type RecommendResult } from '/_102020_/l2/agentNewSolution2/agentNs2Recommend.js';

export interface PlanningSnapshot {
  initialPlan: Record<string, unknown>;
  clarificationAnswer: RequirementsClarificationAnswer;
  discoveredScope: DiscoverScopeResult;
  recommendations: RecommendResult;
  decisions: ImplementationDecisionResult;
}

export function getSnapshot(context: mls.msg.ExecutionContext): PlanningSnapshot {
  return {
    initialPlan: getInitialPlanSummary(context),
    clarificationAnswer: getRequirementsClarificationAnswer(context),
    discoveredScope: getDiscoverScopeOutput(context).result,
    recommendations: getRecommendOutput(context).result,
    decisions: getImplementationDecisionResult(context),
  };
}
