/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/agentChooseMolecules.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of the Choose Molecules probe (spec: flow.json / spec.md in this folder).
// Entry: @@agentChooseMolecules <definition of the page or system>. PROSE ONLY —
// mls.common.safeParseArgs is never called on it, because it throws on anything that is not an object
// literal.
//
// The root's own message call IS c0-classify, and it is deliberately thin: slug, language, step titles.
// It must not name a group, a molecule or a tag. The probe measures whether the CATALOG carries the
// decision, so a decision leaking in from a cheap call before any catalog level was read would corrupt
// the measurement.
//
// ⚠️ THE TREE IS PLANTED IN TWO PHASES, for the same reason agentImproveMolecule2 has a router: how many
// c2 steps exist is not known until c1 answers. Phase 1 plants c1 and a FAN-OUT step handled by this
// same agent; when c1-done lands, that step reads the chosen groups and plants one c2 per group plus c3.
//
// ⚠️ AND c3 DEPENDS ON THE PER-GROUP ANCHORS BY NAME, never on a shared 'c2-done'. Several steps writing
// one anchor would unlock the report as soon as the FIRST group finished, and the run would report a
// partial answer as if it were the whole one (helpers/chTypes.chGroupDoneAnchor).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { isBareMention, stripAgentMention } from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';
import { isRecord, parseMaybeJson } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { nmParseStepArgs, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  CH_AGENT_FOLDER,
  CH_AGENT_NAME,
  CH_PLAN_C1,
  CH_PLAN_C3,
  CH_PLAN_FANOUT,
  chDoneAnchor,
  chGroupDoneAnchor,
  chGroupPlanId,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { checkChRootPlan, getChRootPlan, normalizeChRootPlan } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chRootPlan.js';

const AGENT_NAME = CH_AGENT_NAME;

/** Step agents that EXIST. The c2 steps all run the same agent, one per group. */
const STEP_AGENTS: Record<string, string> = {
  [CH_PLAN_C1]: 'agentChGroups',
  c2: 'agentChMolecules',
  [CH_PLAN_C3]: 'agentChReport',
};

/** The shortest definition worth walking a catalog for. */
const MIN_DEFINITION = 15;

interface IDataPrompt {
  prompt?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: CH_AGENT_FOLDER,
    agentDescription: 'EXPERIMENTAL PROBE: given a page or system definition, walks the molecule catalog of this project and reports which group and which molecule serve each region. Writes no page and no molecule — only the measurement of the run',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  let definition: string;
  if (context.isTest) {
    const testData = JSON.parse(userPrompt || '{}') as IDataPrompt;
    definition = (testData.prompt || '').trim();
  } else {
    const text = stripAgentMention(userPrompt, agent.agentName);
    definition = isBareMention(text) ? '' : text;
  }
  if (definition.length < MIN_DEFINITION) {
    throw new Error(
      `[${AGENT_NAME}] describe the page or system, e.g. '@@${AGENT_NAME} Cadastro de cliente: nome completo, CPF, telefone, e-mail e data de nascimento'`,
    );
  }

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: rootPlanSystemPrompt },
        { type: 'human', content: JSON.stringify({ definition }) },
      ],
      taskTitle: 'Choose molecules',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      // The definition travels in task memory, verbatim: it is the input of c1 and it is recorded in
      // input.json for whoever scores the battery.
      longTermMemory: { flowName: AGENT_NAME, definition },
    },
  };
  return [addMessageAI];
}

/** PHASE 1 — the classification landed. Plant c1 and the fan-out step. */
async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const plan = normalizeChRootPlan(step.interaction?.payload?.[0]);
    const gate = checkChRootPlan(plan);
    if (!gate.ok) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', gate.errors.join('\n'))];
    }

    const runKey = nmRunKey(plan.runKey, 'choose');
    return [
      addStep(context, step, {
        planId: CH_PLAN_C1,
        agentName: STEP_AGENTS[CH_PLAN_C1],
        title: plan.titles[CH_PLAN_C1] || CH_PLAN_C1,
        dependsOn: [],
        runKey,
        first: true,
      }),
      addStep(context, step, {
        planId: CH_PLAN_FANOUT,
        agentName: AGENT_NAME,
        title: plan.titles[CH_PLAN_FANOUT] || 'fan-out',
        dependsOn: [chDoneAnchor(CH_PLAN_C1)],
        runKey,
      }),
    ];
  } catch (error) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

/**
 * PHASE 2 — the fan-out. Deterministic, no LLM: it reads c1's result and plants one c2 per group.
 *
 * It is a hook on the ROOT and not a step agent of its own because it holds no logic of its own: it is
 * the shape of the tree, and the shape belongs where the tree is planted (agentsBestPractices §6).
 */
async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsedArgs = nmParseStepArgs(args ?? step.prompt);
  if (parsedArgs.planId !== CH_PLAN_FANOUT) {
    throw new Error(`[${AGENT_NAME}] unexpected step '${parsedArgs.planId || '(none)'}' — the root only handles ${CH_PLAN_FANOUT}`);
  }

  const plan = getChRootPlan(context);
  const runKey = parsedArgs.runKey || plan.runKey;
  const answer = readGroupsResult(context);
  if (!answer) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] c1's result could not be read — nothing to fan out over`)];
  }

  const intents: mls.msg.AgentIntent[] = [];
  for (const group of answer.groups) {
    intents.push(addStep(context, step, {
      planId: chGroupPlanId(group),
      agentName: STEP_AGENTS.c2,
      title: `${plan.titles['c2-molecules'] || 'c2'} · ${group}`,
      dependsOn: [],
      runKey,
      group,
      first: true,
    }));
  }

  // The report always runs — with no group it is the whole answer (battery case #10).
  intents.push(addStep(context, step, {
    planId: CH_PLAN_C3,
    agentName: STEP_AGENTS[CH_PLAN_C3],
    title: plan.titles[CH_PLAN_C3] || CH_PLAN_C3,
    dependsOn: answer.groups.map(group => chGroupDoneAnchor(group)),
    runKey,
    first: !answer.groups.length,
  }));

  const note = answer.groups.length
    ? `${answer.regionCount} região(ões) → ${answer.groups.join(', ')}${answer.grouplessCount ? ` · ${answer.grouplessCount} sem grupo` : ''}`
    : `${answer.regionCount} região(ões) e nenhum grupo publicado cobre — segue direto para o relatório`;
  intents.push(nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', note, 'input_output'));
  return intents;
}

// ---- helpers ----

function addStep(
  context: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  args: { planId: string; agentName: string; title: string; dependsOn: string[]; runKey: string; group?: string; first?: boolean },
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parent.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: args.title,
      // 'waiting_human_input' runs immediately; 'waiting_dependency' waits on the anchors.
      status: args.first ? 'waiting_human_input' : 'waiting_dependency',
      nextSteps: [],
      agentName: args.agentName,
      prompt: JSON.stringify({ planId: args.planId, runKey: args.runKey, ...(args.group ? { group: args.group } : {}) }),
      rags: [],
      planning: {
        planId: args.planId,
        dependsOn: args.dependsOn,
        executionMode: 'sequential',
        executionHost: 'client',
      },
    } as mls.msg.AIAgentStep,
  } as mls.msg.AgentIntentAddStep;
}

/** c1's answer, read from the anchor result it planted. */
function readGroupsResult(context: mls.msg.ExecutionContext): { groups: string[]; regionCount: number; grouplessCount: number } | null {
  const anchor = chDoneAnchor(CH_PLAN_C1);
  const found = getAllSteps(context.task?.iaCompressed?.nextSteps).find(
    item => item.type === 'result' && item.planning?.planId === anchor,
  ) as mls.msg.AIResultStep | undefined;

  const parsed = parseMaybeJson(found?.result);
  if (!isRecord(parsed)) return null;
  return {
    groups: Array.isArray(parsed.groups) ? parsed.groups.filter((item): item is string => typeof item === 'string') : [],
    regionCount: typeof parsed.regionCount === 'number' ? parsed.regionCount : 0,
    grouplessCount: typeof parsed.grouplessCount === 'number' ? parsed.grouplessCount : 0,
  };
}

const rootPlanSystemPrompt = `<!-- modelType: classifier -->

You are the entry point of an EXPERIMENTAL PROBE that reads a definition of a page or system and reports which components of a library could serve it.

This is a cheap classification. You do not choose anything: which groups and which components serve the page is decided by later steps, reading the catalog one level at a time.

⚠️ Do NOT name a group, a component or a tag, not even as a suggestion. The probe exists to measure whether the CATALOG carries that decision; anything you name here would corrupt the measurement.

Tasks:
1. validInput: false ONLY when the text is clearly not a definition of a page, screen or system (e.g. it is a question about the codebase, a request to change an existing component, or unintelligible). When it asks to create or change a component, say so in reason and name @@agentNewMolecule2 or @@agentImproveMolecule2. Everything else is validated by deterministic code — do NOT over-reject.
2. runKey: a short kebab-case slug naming the page (e.g. 'cadastro-cliente', 'tela-assinatura'). It names a work folder. Max 40 characters, ascii lowercase letters, digits and dashes.
3. userLanguage: detect from the text ('pt' | 'en' | ...); default 'pt' when ambiguous.
4. title: a SHORT task title in the detected language.
5. titles: SHORT step titles in the detected language for each planId:
   c1-groups (break the page into regions and choose the groups), c1r-fanout (plan one step per group), c2-molecules (choose the component of a group), c3-report (report and measurements).

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    validInput: boolean;
    reason?: string;
    runKey: string;
    userLanguage: string;
    title: string;
    titles: {
      'c1-groups': string;
      'c1r-fanout': string;
      'c2-molecules': string;
      'c3-report': string;
    };
  };
};
//#endregion OutputSection
