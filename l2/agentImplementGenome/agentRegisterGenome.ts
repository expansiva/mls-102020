/// <mls fileReference="_102020_/l2/agentImplementGenome/agentRegisterGenome.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal step — NO-LLM wrapper agent (like agentNewSolutionPlanner: only
// beforePromptStep, returns completed). Its `dependsOn` lists EVERY gen:<page> step, so
// the framework only starts it once ALL pages produced their final defs. It then, ONCE:
//   1. registers the variation in module.ts (module-level, deterministic).
//
// It no longer records `resolvedMolecules` on the DS: the molecules a page used live in
// the page's own defs (moleculeAssignments) — the authoritative, per-page source — and
// nothing reads a DS-level aggregate. Staleness uses dsVersion (per-page stamp) instead.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { registerPageGenome } from '/_102020_/l2/dsMatch/registerPageGenome.js';
import { buildGlobalCss } from '/_102020_/l2/dsMatch/buildGlobalCss.js';
import { parseStepArgs, mkCompleted, mkFail } from '/_102020_/l2/agentImplementGenome/planning.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentRegisterGenome',
    agentProject: 102020,
    agentFolder: 'agentImplementGenome',
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
    if (!context.isTest) {
      // Register the new variation in module.ts.
      await registerPageGenome(project, a.module, a.layout, a.ds, a.device);
      // Regenerate the project-wide DS stylesheet from designSystems[*].tokens (Phase B).
      await buildGlobalCss(project);
    }
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentRegisterGenome] ${error instanceof Error ? error.message : String(error)}`)];
  }
}
