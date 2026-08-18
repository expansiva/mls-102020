/** Resolves the open phase that owns dynamically-created New Solution 4 steps. */
export function resolveNs4MutableParent(
  allSteps: mls.msg.AIPayload[] | undefined,
  parentStep: mls.msg.AIAgentStep,
  phaseStep?: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  const steps = allSteps || [];
  const root = steps[0];
  const current = steps.find(item => item.stepId === parentStep.stepId);
  if (isOpenAgent(current) && (!phaseStep || current.stepId !== root?.stepId)) return current;

  const phase = phaseStep && steps.find(item => item.stepId === phaseStep.stepId);
  if (isOpenAgent(phase)) return phase;
  if (isOpenAgent(current)) return current;

  const owner = steps.find(candidate => isOpenAgent(candidate)
    && (candidate.nextSteps?.some(child => child.stepId === parentStep.stepId)
      || candidate.interaction?.payload?.some(child => child.stepId === parentStep.stepId)));
  return isOpenAgent(owner) ? owner : isOpenAgent(root) ? root : parentStep;
}

function isOpenAgent(step: mls.msg.AIPayload | undefined): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}
