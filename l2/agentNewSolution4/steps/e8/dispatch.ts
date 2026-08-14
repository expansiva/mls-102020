interface Ns4PlannedStepLike {
  planning?: { planId?: string | null } | null;
}

export function ns4E8DetailsPlanId(reviewRound: number, repairRound = 0): string {
  return `e8-workspaces-round-${reviewRound}-details-${repairRound}`;
}

export function hasNs4E8DetailsDispatch(steps: Ns4PlannedStepLike[], reviewRound: number, repairRound = 0): boolean {
  const planId = ns4E8DetailsPlanId(reviewRound, repairRound);
  return steps.some(step => step.planning?.planId === planId);
}

export function isNs4E8PresentationRepairPlanId(planId: string): boolean {
  return /^e8-workspaces-presentation-repair-[1-9]\d*-[1-9]\d*$/.test(planId);
}

export function isNs4E8ImplementedPlanId(planId: string): boolean {
  return planId.startsWith('e8-workspaces-round-')
    || planId.startsWith('e8-workspaces-finalize-')
    || isNs4E8PresentationRepairPlanId(planId);
}
