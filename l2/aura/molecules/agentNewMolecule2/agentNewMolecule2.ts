/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of the New Molecule 2 pipeline (spec: flow.json / spec.md in this folder).
// Entry: @@agentNewMolecule2 <prose description of the molecule>. PROSE ONLY (decision D6) —
// mls.common.safeParseArgs is never called on it, because it throws on anything that is not an
// object literal (lesson A2).
//
// The root's own message call IS the cheap classification: pick the GROUP from the short
// descriptions in skills/index.ts, detect the language, propose the l4 runKey and localize the
// step titles. Everything the group IMPLIES (its skills, the molecule base, the theme) is resolved
// deterministically by n1-bootstrap — none of it can be resolved before the group is known, which
// is why the classification comes first and the expensive requirements call comes after.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { skills as skillList } from '/_102020_/l2/aura/molecules/skills/index';
import { isBareMention, stripAgentMention } from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';
import { NM_AGENT_FOLDER, isRecord, parseMaybeJson } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { NM_PLAN_IDS, NmPlanId, NmRootPlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { nmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { nmDoneAnchor, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { checkNmGroupChoice } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';

const AGENT_NAME = 'agentNewMolecule2';

const STEP_AGENTS: Record<NmPlanId, string> = {
  'n1-bootstrap': 'agentNm2Bootstrap',
  'n2-plan': 'agentNm2Plan',
  'n3-defs': 'agentNm2Defs',
  'n4-render': 'agentNm2Render',
  'n5-less': 'agentNm2Less',
  'n6-demo': 'agentNm2Demo',
  'n7-index': 'agentNm2Index',
  'n8-summary': 'agentNm2Summary',
};

interface IDataPrompt {
  prompt?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: NM_AGENT_FOLDER,
    agentDescription: 'Creates a new molecule (.defs.ts, .ts, .less, .html and the group index) from a prose description, with one confirmation checkpoint; in a themed project the molecule is born in the theme',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  let prompt: string;
  if (context.isTest) {
    const testData = JSON.parse(userPrompt || '{}') as IDataPrompt;
    prompt = (testData.prompt || '').trim();
  } else {
    const text = stripAgentMention(userPrompt, agent.agentName);
    // A bare mention (ours, stripped to nothing, or another agent's) carries no description, and
    // there is nothing to build without one.
    prompt = isBareMention(text) ? '' : text;
  }
  if (prompt.length < 5) {
    throw new Error(`[${AGENT_NAME}] describe the molecule to create, e.g. '@@${AGENT_NAME} a KPI card with a label, a big value and a variation badge'`);
  }

  const groups = skillList.map(item => ({ name: item.name, description: item.description }));
  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: rootPlanSystemPrompt.replace('{{groups}}', JSON.stringify(groups, null, 2)) },
        { type: 'human', content: JSON.stringify({ prompt }) },
      ],
      taskTitle: 'New molecule',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: AGENT_NAME, prompt },
    },
  };
  return [addMessageAI];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const plan = normalizeNmRootPlan(step.interaction?.payload?.[0]);
    if (!plan.validInput) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', plan.invalidReason || 'Invalid input')];
    }
    // Fail here rather than three steps later: without a group contract there is nothing to
    // generate against (decision Q5).
    const groupIssues = checkNmGroupChoice(plan.group, skillList);
    if (groupIssues.length) {
      const message = groupIssues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
    }

    // The whole pipeline is planted at once, each step waiting on the previous done anchor, so the
    // tree shows what will happen before it happens.
    const intents: mls.msg.AgentIntent[] = [];
    let previous: NmPlanId | null = null;
    for (const planId of NM_PLAN_IDS) {
      intents.push({
        type: 'add-step',
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: step.stepId,
        step: {
          type: 'agent',
          stepId: 0,
          interaction: null,
          stepTitle: plan.titles[planId] || planId,
          status: previous ? 'waiting_dependency' : 'waiting_human_input',
          nextSteps: [],
          agentName: STEP_AGENTS[planId],
          prompt: JSON.stringify({ planId, runKey: plan.runKey }),
          rags: [],
          planning: {
            planId,
            dependsOn: previous ? [nmDoneAnchor(previous)] : [],
            executionMode: 'sequential',
            executionHost: 'client',
          },
        } as mls.msg.AIAgentStep,
      } as mls.msg.AgentIntentAddStep);
      previous = planId;
    }
    return intents;
  } catch (error) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

// ---- shared readers for the step agents ----

export function getNmRootPlan(context: mls.msg.ExecutionContext): NmRootPlan {
  if (!context.task) throw new Error('[getNmRootPlan] task invalid');
  const root = getAllSteps(context.task.iaCompressed?.nextSteps).find(
    item => item.type === 'agent' && (item as mls.msg.AIAgentStep).agentName === AGENT_NAME,
  ) as mls.msg.AIAgentStep | undefined;
  return normalizeNmRootPlan(root?.interaction?.payload?.[0]);
}

// The prose description, published to task memory by beforePromptImplicit.
export function getNmInput(context: mls.msg.ExecutionContext): { prompt: string } {
  const memory = context.task?.iaCompressed?.longMemory || {};
  const prompt = typeof memory.prompt === 'string' ? memory.prompt : '';
  if (!prompt) throw new Error('[getNmInput] missing prompt in task memory');
  return { prompt };
}

// Steps locate their l4 artifacts by runKey. It travels in each step's own args (planted by the
// root); task memory is the fallback for a step re-run outside the original batch.
export function getNmRunKey(context: mls.msg.ExecutionContext, stepArgsRunKey?: string): string {
  if (stepArgsRunKey) return stepArgsRunKey;
  const memory = context.task?.iaCompressed?.longMemory || {};
  const fromMemory = typeof memory.runKey === 'string' ? memory.runKey : '';
  if (fromMemory) return fromMemory;
  const plan = getNmRootPlan(context);
  if (plan.runKey) return plan.runKey;
  throw new Error('[getNmRunKey] runKey not available — the root did not plant it');
}

export function normalizeNmRootPlan(payload: unknown): NmRootPlan {
  const parsed = parseMaybeJson(payload);
  const record = isRecord(parsed) ? parsed : {};
  const resultRaw = parseMaybeJson(record.result);
  const result = isRecord(resultRaw) ? resultRaw : {};
  const titlesRaw = isRecord(result.titles) ? result.titles : {};
  const titles = {} as Record<NmPlanId, string>;
  for (const planId of NM_PLAN_IDS) {
    titles[planId] = typeof titlesRaw[planId] === 'string' ? titlesRaw[planId] as string : planId;
  }
  const group = typeof result.group === 'string' ? result.group : '';
  return {
    validInput: result.validInput !== false,
    invalidReason: typeof result.invalidReason === 'string' ? result.invalidReason : undefined,
    group,
    runKey: nmRunKey(typeof result.runKey === 'string' ? result.runKey : '', group.toLowerCase()),
    userLanguage: typeof result.userLanguage === 'string' ? result.userLanguage : 'pt',
    titles,
  };
}

const rootPlanSystemPrompt = `
<!-- modelType: classifier -->

You are the root planner of a pipeline that creates a NEW web-component molecule from a prose description.
The human message is a JSON: { "prompt": "<the user's description>" }.

Tasks:
1. validInput: false ONLY when the prompt is clearly not a request for a UI component (e.g. it asks for a backend routine, a document, or is unintelligible). Everything else is validated later by deterministic code — do NOT over-reject.
2. group: the molecule group that owns this component, chosen from the list below. Match on the USER INTENT (what the user does with the component), not on wording. Return the name exactly as listed.
3. runKey: a short kebab-case slug naming the intent (e.g. 'kpi-card', 'currency-input'). It names a work folder — NOT the molecule, which is chosen later. Max 40 characters, ascii letters/digits/dashes.
4. userLanguage: detect from the prompt ('pt' | 'en' | ...); default 'pt' when ambiguous.
5. titles: SHORT step titles in the detected language for each planId:
   n1-bootstrap (analyze group, base and theme), n2-plan (define requirements and confirm), n3-defs (write the contract), n4-render (create the component), n5-less (generate the stylesheet), n6-demo (create the demo page), n7-index (update the group index), n8-summary (final summary).

## Molecule groups
{{groups}}

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    validInput: boolean;
    invalidReason?: string;
    group: string;
    runKey: string;
    userLanguage: string;
    titles: {
      'n1-bootstrap': string;
      'n2-plan': string;
      'n3-defs': string;
      'n4-render': string;
      'n5-less': string;
      'n6-demo': string;
      'n7-index': string;
      'n8-summary': string;
    };
  };
};
//#endregion OutputSection
