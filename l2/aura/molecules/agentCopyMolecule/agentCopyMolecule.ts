/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/agentCopyMolecule.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of the copy pipeline (spec: flow.json / spec.md in this folder).
// Two entry doors (flow.json conventions.input): the preview payload { fullName, page, prompt }
// and prose typed in collab-messages. One cheap rootPlan LLM call (input validation +
// userLanguage + localized step titles), then the 6 steps are planted. All real work happens
// in steps/c*, and NONE of it needs an LLM except the closing summary.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { C_AGENT_FOLDER, isRecord, parseMaybeJson } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cFs.js';
import { REF_FORMAT_HINT, parseCopyEntry, parseCopyRefs } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cOrigin.js';
import { C_PLAN_IDS, C_STEP_AGENTS, CPlanId, cDoneAnchor, cUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.js';

const AGENT_NAME = 'agentCopyMolecule';

export interface CRootPlan {
  validInput: boolean;
  invalidReason?: string;
  userLanguage: string;
  titles: Record<CPlanId, string>;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: C_AGENT_FOLDER,
    agentDescription: 'Copies the real code of a molecule from a dependency project into the current project (one molecule, a whole group, or a list), so the client can translate it',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
    scope: ['l2_preview'],
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!userPrompt || userPrompt.length < 5) throw new Error(`[${AGENT_NAME}] invalid prompt — expected a molecule/group reference`);

  let entryText: string;
  let notes: string;
  if (context.isTest) {
    const testData = JSON.parse(userPrompt) as { fileReference?: string; refs?: string[]; prompt?: string };
    const refs = Array.isArray(testData.refs) ? testData.refs : [];
    const single = typeof testData.fileReference === 'string' ? [testData.fileReference.replace(/\.ts$/, '')] : [];
    entryText = [...single, ...refs].join('\n');
    if (!entryText.trim()) throw new Error(`[${AGENT_NAME}] invalid test prompt: missing fileReference/refs`);
    notes = cleanNotes(testData.prompt);
  } else {
    const entry = parseCopyEntry(userPrompt, agent.agentName, raw => mls.common.safeParseArgs(raw));
    entryText = entry.text;
    notes = entry.notes;
  }

  // Fail HERE when the mention carries no complete reference (decision D5): the deterministic
  // parser is the only resolver in v1 — finding a molecule by bare shortName is v2, and a
  // pipeline that starts without knowing what to copy would fail later and cost more.
  const { refs } = parseCopyRefs(entryText);
  if (!refs.length) {
    throw new Error(`[${AGENT_NAME}] nenhuma referência de molécula encontrada. Mencione no formato '${REF_FORMAT_HINT}' — uma molécula, um grupo inteiro (sem o nome da molécula) ou uma lista, uma por linha.`);
  }

  const runKey = `run-${context.message.orderAt}`;
  const taskTitle = refs.length === 1
    ? `Copiar molécula: ${refs[0].shortName || refs[0].group}`
    : `Copiar ${refs.length} moléculas`;

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: rootPlanSystemPrompt },
        { type: 'human', content: JSON.stringify({ refs: refs.map(ref => ref.ref), notes }) },
      ],
      taskTitle,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: AGENT_NAME, entryText, notes, runKey },
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
    const plan = normalizeRootPlan(step.interaction?.payload?.[0]);
    if (!plan.validInput) {
      return [cUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', plan.invalidReason || 'Invalid input')];
    }
    const runKey = getCRunKey(context);
    const intents: mls.msg.AgentIntent[] = [];
    let previous: CPlanId | null = null;
    // All 6 steps are planted upfront, sequential. c2-clarify is planted ALWAYS (decision 4):
    // with no collision it auto-completes without asking anything. A conditionally planted
    // checkpoint would need an add-step from inside c1, which is a second plan shape.
    for (const planId of C_PLAN_IDS) {
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
          agentName: C_STEP_AGENTS[planId],
          prompt: JSON.stringify({ planId, runKey }),
          rags: [],
          planning: {
            planId,
            dependsOn: previous ? [cDoneAnchor(previous)] : [],
            executionMode: 'sequential',
            executionHost: 'client',
          },
        } as mls.msg.AIAgentStep,
      } as mls.msg.AgentIntentAddStep);
      previous = planId;
    }
    return intents;
  } catch (error) {
    return [cUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

// ---- shared readers for the step agents ----

export function getCRootPlan(context: mls.msg.ExecutionContext): CRootPlan {
  if (!context.task) throw new Error('[getCRootPlan] task invalid');
  const root = getAllSteps(context.task.iaCompressed?.nextSteps).find(
    item => item.type === 'agent' && (item as mls.msg.AIAgentStep).agentName === AGENT_NAME,
  ) as mls.msg.AIAgentStep | undefined;
  return normalizeRootPlan(root?.interaction?.payload?.[0]);
}

export function getCInput(context: mls.msg.ExecutionContext): { entryText: string; notes: string } {
  const memory = context.task?.iaCompressed?.longMemory || {};
  const entryText = typeof memory.entryText === 'string' ? memory.entryText : '';
  const notes = typeof memory.notes === 'string' ? memory.notes : '';
  if (!entryText) throw new Error('[getCInput] missing entry text in task memory');
  return { entryText, notes };
}

// The runKey names the work folder of the run (a batch has no single shortName). Planted by
// the root; steps receive it in their own args and fall back to task memory — the same
// belt-and-suspenders as agentImproveMolecule2.getImRunKey.
export function getCRunKey(context: mls.msg.ExecutionContext, stepArgsRunKey?: string): string {
  if (stepArgsRunKey) return stepArgsRunKey;
  const memory = context.task?.iaCompressed?.longMemory || {};
  const fromMemory = typeof memory.runKey === 'string' ? memory.runKey : '';
  if (fromMemory) return fromMemory;
  throw new Error('[getCRunKey] runKey not available — the root did not plant it');
}

function cleanNotes(prompt: string | undefined): string {
  const raw = (prompt || '').trim();
  if (!raw || raw.startsWith('@@')) return '';
  return raw;
}

function normalizeRootPlan(payload: unknown): CRootPlan {
  const parsed = parseMaybeJson(payload);
  const record = isRecord(parsed) ? parsed : {};
  const result = isRecord(parseMaybeJson(record.result)) ? parseMaybeJson(record.result) as Record<string, unknown> : {};
  const titlesRaw = isRecord(result.titles) ? result.titles : {};
  const titles = {} as Record<CPlanId, string>;
  for (const planId of C_PLAN_IDS) {
    titles[planId] = typeof titlesRaw[planId] === 'string' ? titlesRaw[planId] as string : planId;
  }
  return {
    validInput: result.validInput !== false,
    invalidReason: typeof result.invalidReason === 'string' ? result.invalidReason : undefined,
    userLanguage: typeof result.userLanguage === 'string' ? result.userLanguage : 'pt',
    titles,
  };
}

const rootPlanSystemPrompt = `
<!-- modelType: classifier -->

You are the root planner of a pipeline that COPIES existing web-component molecules from a dependency project into the current project, so the client can translate them.
The human message is a JSON: { "refs": ["<molecule or group reference>", ...], "notes": "<optional user notes>" }.

Tasks:
1. validInput: false ONLY when the refs are clearly not molecule/group references (expected shape: _<digits>_/l2/molecules/<group>[/<ml-name>]). Everything else is validated later by deterministic code — do NOT over-reject. The list may legitimately hold one entry or many.
2. userLanguage: detect from the notes ('pt' | 'en' | ...); default 'pt' when notes are empty or ambiguous.
3. titles: SHORT step titles in the detected language for each planId:
   c1-bootstrap (check origins and prepare), c2-clarify (resolve collisions), c3-copy (copy code and contract), c4-less (copy stylesheet), c5-demo (copy demo page), c6-summary (final summary).

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
    userLanguage: string;
    titles: {
      'c1-bootstrap': string;
      'c2-clarify': string;
      'c3-copy': string;
      'c4-less': string;
      'c5-demo': string;
      'c6-summary': string;
    };
  };
};
//#endregion
