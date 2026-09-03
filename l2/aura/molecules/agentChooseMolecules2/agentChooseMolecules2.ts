/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/agentChooseMolecules2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of agentChooseMolecules2 (spec: flow.json / spec.md in this folder).
//
// Entry: '@@agentChooseMolecules2 {"catalogProject": N, "target": "<page .defs.ts reference>"}'. Unlike
// agentChooseMolecules (the probe), there is no free prose and no classifier call: the whole argument
// is one JSON object and both the catalog and the target file are explicit, so the root bootstraps
// DETERMINISTICALLY (skipRootLLM, same gesture agentChangeFrontend's 'only-materialize' command uses)
// straight into c1-groups — no c0-classify.
//
// THE TREE IS STILL PLANTED IN TWO PHASES, same reason as the probe (agentImproveMolecule2's router
// precedent): the number of c2 steps is unknown until c1 answers. Phase 1 (this file's
// beforePromptImplicit) plants c1-groups and the fan-out step, both parented at the bootstrap step.
// Phase 2 (beforePromptStep on c1r-fanout) reads c1's result and plants one c2 per group plus c3-patch.
//
// c3-patch DEPENDS ON THE PER-GROUP ANCHORS BY NAME, never a shared 'c2-done' — see cm2Types.ts.
//
// ZERO ARTIFACT RULE: nothing in this run writes to l4, to a trace folder, or anywhere but the target
// .defs.ts (steps/c3-patch, the run's only write). Every handoff between steps travels through the
// task tree's own step `result` field (helpers/cm2Types.cm2ReadC1Result / cm2ReadGroupResult), never a
// file — there is no report.json, no c1-groups.json, no per-attempt trace here.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { cm2ParseEntry } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Entry.js';
import {
  CM2_AGENT_FOLDER,
  CM2_AGENT_NAME,
  CM2_PLAN_C1,
  CM2_PLAN_C3,
  CM2_PLAN_FANOUT,
  cm2DoneAnchor,
  cm2GroupDoneAnchor,
  cm2GroupPlanId,
  cm2ParseStepArgs,
  cm2ReadC1Result,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.js';

const STEP_AGENTS: Record<string, string> = {
  [CM2_PLAN_C1]: 'agentCm2Groups',
  c2: 'agentCm2Molecules',
  [CM2_PLAN_C3]: 'agentCm2Patch',
};

export function createAgent(): IAgentAsync {
  return {
    agentName: CM2_AGENT_NAME,
    agentProject: 102020,
    agentFolder: CM2_AGENT_FOLDER,
    agentDescription: 'Given a catalogProject and the reference of an existing page .defs.ts, decides which molecule serves each of its regions and rewrites that .defs.ts in place — definition and pipeline. Writes nothing else: no report, no l4 artifact.',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

/** PHASE 1 — deterministic bootstrap (skipRootLLM): plant c1-groups and the fan-out together. */
async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const raw = userPrompt || context.message.content || '';
  const entry = cm2ParseEntry(raw);
  if (entry.error) throw new Error(`[${CM2_AGENT_NAME}] ${entry.error}`);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `${CM2_AGENT_NAME} deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.` },
        { type: 'human', content: raw },
      ],
      taskTitle: `Choose molecules for ${entry.target}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: CM2_AGENT_NAME, catalogProject: String(entry.catalogProject), target: entry.target },
    },
  };

  return [
    addMessageAI,
    bootstrapAddStepIntent(context, agentStepPayload({
      agentName: STEP_AGENTS[CM2_PLAN_C1],
      stepTitle: CM2_PLAN_C1,
      planId: CM2_PLAN_C1,
      dependsOn: [],
      prompt: { planId: CM2_PLAN_C1, catalogProject: entry.catalogProject, target: entry.target },
      status: 'waiting_human_input',
    })),
    bootstrapAddStepIntent(context, agentStepPayload({
      agentName: CM2_AGENT_NAME,
      stepTitle: 'fan-out',
      planId: CM2_PLAN_FANOUT,
      dependsOn: [cm2DoneAnchor(CM2_PLAN_C1)],
      prompt: { planId: CM2_PLAN_FANOUT, catalogProject: entry.catalogProject, target: entry.target },
      status: 'waiting_dependency',
    })),
  ];
}

/** Completes the trivial bootstrap step — the real work was already planted in beforePromptImplicit. */
async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'root bootstrap completed without using the model payload')];
}

/**
 * PHASE 2 — the fan-out. Deterministic, no LLM: reads c1's result from the task tree and plants one c2
 * per DISTINCT group, plus c3-patch depending on all of them. With no group chosen, c3-patch still
 * runs alone (it is what completes the run — and with zero regions it completes without writing).
 */
async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${CM2_AGENT_NAME}] task invalid`);
  const parsed = cm2ParseStepArgs(args ?? step.prompt);
  if (parsed.planId !== CM2_PLAN_FANOUT) {
    throw new Error(`[${CM2_AGENT_NAME}] unexpected step '${parsed.planId || '(none)'}' — the root only handles ${CM2_PLAN_FANOUT}`);
  }
  if (!parsed.catalogProject || !parsed.target) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${CM2_AGENT_NAME}] missing catalogProject/target in fan-out args`)];
  }

  const c1 = cm2ReadC1Result(context);
  if (!c1) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${CM2_AGENT_NAME}] c1's result could not be read — nothing to fan out over`)];
  }

  const intents: mls.msg.AgentIntent[] = [];
  for (const group of c1.groups) {
    intents.push(addStep(context, step, {
      agentName: STEP_AGENTS.c2,
      stepTitle: `c2 · ${group}`,
      planId: cm2GroupPlanId(group),
      dependsOn: [],
      prompt: { planId: cm2GroupPlanId(group), catalogProject: parsed.catalogProject, target: parsed.target, group },
      status: 'waiting_human_input',
    }));
  }

  intents.push(addStep(context, step, {
    agentName: STEP_AGENTS[CM2_PLAN_C3],
    stepTitle: CM2_PLAN_C3,
    planId: CM2_PLAN_C3,
    dependsOn: c1.groups.map(cm2GroupDoneAnchor),
    prompt: { planId: CM2_PLAN_C3, catalogProject: parsed.catalogProject, target: parsed.target },
    status: c1.groups.length ? 'waiting_dependency' : 'waiting_human_input',
  }));

  const note = c1.groups.length
    ? `${c1.regions.length} region(s) → ${c1.groups.join(', ')}`
    : `${c1.regions.length} region(s), no published group covers any — patching directly with nothing chosen`;
  intents.push(nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', note, 'input_output'));
  return intents;
}

// ---- helpers ----

interface StepPayloadArgs {
  agentName: string;
  stepTitle: string;
  planId: string;
  dependsOn: string[];
  prompt: Record<string, unknown>;
  status: mls.msg.AIStepStatus;
}

function agentStepPayload(args: StepPayloadArgs): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: args.stepTitle,
    status: args.status,
    nextSteps: [],
    agentName: args.agentName,
    prompt: JSON.stringify(args.prompt),
    rags: [],
    planning: { planId: args.planId, dependsOn: args.dependsOn, executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

/** Bootstrap-only: there is no parentStep object yet, so parentStepId is the task's own root (1) —
 * same convention agentChangeFrontend's deterministic bootstrap uses. */
function bootstrapAddStepIntent(context: mls.msg.ExecutionContext, step: mls.msg.AIAgentStep): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1, step };
}

function addStep(context: mls.msg.ExecutionContext, parent: mls.msg.AIAgentStep, args: StepPayloadArgs): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parent.stepId,
    step: agentStepPayload(args),
  };
}

