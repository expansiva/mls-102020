/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/agentNewTheme.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of the New Theme pipeline (spec: flow.json / spec.md in this folder).
// Entry: @@agentNewTheme { prompt: '<free style description>' }.
// Admission (the project must NOT already have l2/skills/theme.ts) is checked BEFORE
// spending any LLM call. The root's own message call IS the cheap t1-plan step
// (steps/t1-plan/prompt.md): language + title + known fields + the missing-field
// questions. afterPromptStep gates that plan, persists l4/agentNewTheme/plan.json and
// plants the remaining steps — t2-clarify only when there are questions to ask.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  NT_AGENT_FOLDER,
  ntPlanFile,
  readNtAgentText,
  themeExists,
  themeFile,
  toDisplayPath,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntFs.js';
import { NtPlan } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';
import {
  ntAgentStepIntent,
  ntDoneAnchor,
  ntUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntSteps.js';
import { normalizeNtPlan, runPlanGate } from '/_102020_/l2/aura/molecules/agentNewTheme/steps/t1-plan/gate.js';

const AGENT_NAME = 'agentNewTheme';

// Step titles are UI text, so they follow the detected userLanguage. Only the two
// languages the Studio actually runs in are tabled; anything else falls back to English.
const STEP_TITLES: Record<string, { 't2-clarify': string; 't3-generate': string; 't4-confirm': string }> = {
  pt: { 't2-clarify': 'Completar o estilo', 't3-generate': 'Gerar o tema', 't4-confirm': 'Confirmar e criar' },
  en: { 't2-clarify': 'Complete the style', 't3-generate': 'Generate the theme', 't4-confirm': 'Confirm and create' },
};

interface IDataPrompt {
  prompt?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: NT_AGENT_FOLDER,
    agentDescription: 'Creates this project\'s theme (l2/skills/theme.ts, contract v1) from a description, with 2 checkpoints',
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
  // Admission first: New Theme only creates from scratch, it never clobbers a theme.
  if (themeExists()) {
    throw new Error(`[${AGENT_NAME}] this project already has ${toDisplayPath(themeFile('.ts'))} — New Theme only creates a theme from scratch (Improve Theme is not available yet)`);
  }

  let prompt: string;
  if (context.isTest) {
    const testData = JSON.parse(userPrompt || '{}') as IDataPrompt;
    prompt = (testData.prompt || '').trim();
  } else {
    const pp = context.message.content
      .replace(`@@ ${agent.agentName}`, '')
      .replace(`@@${agent.agentName}`, '').trim();
    const parsed = mls.common.safeParseArgs(pp) as IDataPrompt;
    // The mention itself is not a description — a bare '@@agentNewTheme' means
    // "ask me everything" (all fields fall to Checkpoint 1).
    const raw = (parsed?.prompt || pp || '').trim();
    prompt = raw.startsWith('@@') ? '' : raw;
  }

  const planPrompt = await readNtAgentText('steps/t1-plan', 'prompt', '.md', true);
  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: planPrompt },
        { type: 'human', content: JSON.stringify({ prompt }) },
      ],
      taskTitle: 'New theme',
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
    const plan = normalizeNtPlan(step.interaction?.payload?.[0]);
    const issues = runPlanGate(plan);
    if (issues.length) {
      const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
      return [ntUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', errorText)];
    }
    await writeJsonArtifact(ntPlanFile(), { savedAt: new Date().toISOString(), ...plan });

    const titles = STEP_TITLES[plan.userLanguage.slice(0, 2).toLowerCase()] || STEP_TITLES.en;
    const hasQuestions = plan.questions.length > 0;
    const intents: mls.msg.AgentIntent[] = [];

    // Fast path: with nothing missing, Checkpoint 1 is not planted at all and
    // t3-generate becomes the first step to run.
    if (hasQuestions) {
      intents.push(ntAgentStepIntent(context, step, {
        agentName: 'agentNtClarify',
        stepTitle: titles['t2-clarify'],
        planId: 't2-clarify',
        prompt: { planId: 't2-clarify' },
        status: 'waiting_human_input',
      }));
    }
    intents.push(ntAgentStepIntent(context, step, {
      agentName: 'agentNtGenerate',
      stepTitle: titles['t3-generate'],
      planId: 't3-generate',
      dependsOn: hasQuestions ? [ntDoneAnchor('t2-clarify')] : [],
      prompt: { planId: 't3-generate' },
      status: hasQuestions ? 'waiting_dependency' : 'waiting_human_input',
    }));
    intents.push(ntAgentStepIntent(context, step, {
      agentName: 'agentNtConfirm',
      stepTitle: titles['t4-confirm'],
      planId: 't4-confirm',
      dependsOn: [ntDoneAnchor('t3-generate')],
      prompt: { planId: 't4-confirm' },
      status: 'waiting_dependency',
    }));
    return intents;
  } catch (error) {
    return [ntUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

// ---- shared reader for the step agents ----

// The initial description, published to task memory by beforePromptImplicit.
export function getNtInput(context: mls.msg.ExecutionContext): { prompt: string } {
  const memory = context.task?.iaCompressed?.longMemory || {};
  return { prompt: typeof memory.prompt === 'string' ? memory.prompt : '' };
}

export type { NtPlan };
