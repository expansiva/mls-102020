/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/agentNewMoleculeVariant.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of the variant pipeline (spec: flow.json / spec.md in this folder).
// Receives { page, prompt } exactly like agentImproveMolecule, runs ONE cheap
// rootPlan LLM call (input validation + userLanguage + localized step titles)
// and plants the planned step tree. All real work happens in steps/v*.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { V_AGENT_FOLDER, isRecord, parseMaybeJson } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vFs.js';
import { normalizeOriginPage } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.js';
import { V_PLAN_IDS, VPlanId, vDoneAnchor, vUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.js';

const AGENT_NAME = 'agentNewMoleculeVariant';

const STEP_AGENTS: Record<VPlanId, string> = {
  'v1-bootstrap': 'agentVariantBootstrap',
  'v2-shell': 'agentVariantShell',
  'v3-less': 'agentVariantLess',
  'v4-index': 'agentVariantIndex',
  'v5-demo': 'agentVariantDemo',
  'v6-summary': 'agentVariantSummary',
};

export interface VRootPlan {
  validInput: boolean;
  invalidReason?: string;
  userLanguage: string;
  titles: Record<VPlanId, string>;
}

interface IDataPrompt {
  page?: string;
  fullName?: string;   // preview sends this alongside page
  prompt?: string;
  position?: string;   // preview editor pane; unused here
}

// The preview sends `prompt` = the agent mention (e.g. "@@NewMoleculeVariant"),
// NOT user notes. Strip any leading mention so it never pollutes the LLM notes.
function cleanNotes(prompt: string | undefined): string {
  const raw = (prompt || '').trim();
  if (!raw || raw.startsWith('@@')) return '';
  return raw;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: V_AGENT_FOLDER,
    agentDescription: 'Creates a themed variant (Strategy D, by inheritance) of an existing molecule in the current themed project',
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
  if (!userPrompt || userPrompt.length < 5) throw new Error(`[${AGENT_NAME}] invalid prompt — expected { page, prompt }`);

  let page: string;
  let notes: string;
  if (context.isTest) {
    const testData = JSON.parse(userPrompt) as { fileReference: string; prompt?: string };
    if (!testData.fileReference) throw new Error(`[${AGENT_NAME}] invalid test prompt: missing fileReference`);
    page = testData.fileReference.replace(/\.ts$/, '');
    notes = cleanNotes(testData.prompt);
  } else {
    const pp = context.message.content
      .replace(`@@ ${agent.agentName}`, '')
      .replace(`@@${agent.agentName}`, '').trim();
    const parsed = mls.common.safeParseArgs(pp) as IDataPrompt;
    // Origin ref: `page` (both paths) or the preview `fullName` fallback.
    // parseOriginRef (v1-bootstrap) normalizes both the /l2/-less preview page
    // and the space-carrying fullName.
    const ref = (parsed?.page || parsed?.fullName || '').trim();
    if (!ref) throw new Error(`[${AGENT_NAME}] invalid prompt structure: missing page/fullName (origin molecule reference)`);
    page = ref;
    notes = cleanNotes(parsed?.prompt);
  }
  // Normalize to the canonical ref once at entry, so the rootPlan classifier and
  // task memory hold the clean form (preview sends /l2/-less page or spaced fullName).
  page = normalizeOriginPage(page);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: rootPlanSystemPrompt },
        { type: 'human', content: JSON.stringify({ page, notes }) },
      ],
      taskTitle: `Molecule variant: ${page.split('/').pop()}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: AGENT_NAME, page, notes },
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
      return [vUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', plan.invalidReason || 'Invalid input')];
    }
    const intents: mls.msg.AgentIntent[] = [];
    let previous: VPlanId | null = null;
    for (const planId of V_PLAN_IDS) {
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
          prompt: JSON.stringify({ planId }),
          rags: [],
          planning: {
            planId,
            dependsOn: previous ? [vDoneAnchor(previous)] : [],
            executionMode: 'sequential',
            executionHost: 'client',
          },
        } as mls.msg.AIAgentStep,
      } as mls.msg.AgentIntentAddStep);
      previous = planId;
    }
    return intents;
  } catch (error) {
    return [vUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

// ---- shared readers for the step agents ----

export function getVRootPlan(context: mls.msg.ExecutionContext): VRootPlan {
  if (!context.task) throw new Error('[getVRootPlan] task invalid');
  const root = getAllSteps(context.task.iaCompressed?.nextSteps).find(
    item => item.type === 'agent' && (item as mls.msg.AIAgentStep).agentName === AGENT_NAME,
  ) as mls.msg.AIAgentStep | undefined;
  const plan = normalizeRootPlan(root?.interaction?.payload?.[0]);
  return plan;
}

export function getVInput(context: mls.msg.ExecutionContext): { page: string; notes: string } {
  const memory = context.task?.iaCompressed?.longMemory || {};
  const page = typeof memory.page === 'string' ? memory.page : '';
  const notes = typeof memory.notes === 'string' ? memory.notes : '';
  if (!page) throw new Error('[getVInput] missing origin page in task memory');
  return { page, notes };
}

// Steps v2..v6 locate the context artifact through the task memory published by v1-bootstrap.
export function getVariantShortName(context: mls.msg.ExecutionContext): string {
  const memory = context.task?.iaCompressed?.longMemory || {};
  const shortName = typeof memory.variantShortName === 'string' ? memory.variantShortName : '';
  if (!shortName) throw new Error('[getVariantShortName] v1-bootstrap did not publish variantShortName');
  return shortName;
}

function normalizeRootPlan(payload: unknown): VRootPlan {
  const parsed = parseMaybeJson(payload);
  const record = isRecord(parsed) ? parsed : {};
  const result = isRecord(parseMaybeJson(record.result)) ? parseMaybeJson(record.result) as Record<string, unknown> : {};
  const titlesRaw = isRecord(result.titles) ? result.titles : {};
  const titles = {} as Record<VPlanId, string>;
  for (const planId of V_PLAN_IDS) {
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

You are the root planner of a pipeline that creates a THEMED VARIANT of an existing web-component molecule.
The human message is a JSON: { "page": "<origin molecule reference>", "notes": "<optional user notes>" }.

Tasks:
1. validInput: false ONLY when page is clearly not a molecule reference (expected shape: _<digits>_/l2/molecules/<group>/<name>). Everything else is validated later by deterministic code — do NOT over-reject.
2. userLanguage: detect from the notes ('pt' | 'en' | ...); default 'pt' when notes are empty or ambiguous.
3. titles: SHORT step titles in the detected language for each planId:
   v1-bootstrap (analyze origin and theme), v2-shell (create inherited shell), v3-less (generate theme stylesheet), v4-index (register in group index), v5-demo (create demo page), v6-summary (final summary).

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
      'v1-bootstrap': string;
      'v2-shell': string;
      'v3-less': string;
      'v4-index': string;
      'v5-demo': string;
      'v6-summary': string;
    };
  };
};
//#endregion
