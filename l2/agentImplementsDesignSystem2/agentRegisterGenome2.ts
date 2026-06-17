/// <mls fileReference="_102020_/l2/agentImplementsDesignSystem2/agentRegisterGenome2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal step — NO-LLM wrapper agent (like agentNewSolutionPlanner: only
// beforePromptStep, returns completed). Its `dependsOn` lists EVERY gen:<page> step, so
// the framework only starts it once ALL pages produced their final defs. It then
// registers the variation in module.ts ONCE (module-level, deterministic).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { registerPageGenome } from '/_102020_/l2/dsMatch/registerPageGenome.js';
import { parseStepArgs, mkCompleted, mkFail } from '/_102020_/l2/agentImplementsDesignSystem2/planning.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentRegisterGenome2',
    agentProject: 102020,
    agentFolder: 'agentImplementsDesignSystem2',
    agentDescription: 'Register the new page variation in module.ts (terminal, no LLM)',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const a = parseStepArgs(args ?? step.prompt);
    const project = mls.actualProject || 0;
    if (!context.isTest) await registerPageGenome(project, a.module, a.layout, a.ds, a.device);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentRegisterGenome2] ${error instanceof Error ? error.message : String(error)}`)];
  }
}
