/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/steps/t3-generate/agentNtGenerate.ts" enhancement="_102027_/l2/enhancementAgent"/>

// t3-generate — THE generation call. See flow.json.
// beforePromptStep assembles the themeAuthoring meta-skill + the user's description +
// the known fields + the Checkpoint 1 answers; afterPromptStep gates the output
// (shared contract validator + header + summary consistency) with retry <= 1 and saves
// a DRAFT to l4. Nothing is written to l2/skills here — only Checkpoint 2 writes.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  NT_AGENT_FOLDER,
  isRecord,
  ntAnswersFile,
  ntDestProject,
  ntDraftFile,
  ntPlanFile,
  ntTraceFile,
  parseMaybeJson,
  readJsonArtifact,
  readNtAgentText,
  toMlsFileReference,
  themeFile,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntFs.js';
import {
  NtAnswer,
  NtDraft,
  NtPlan,
  NtThemeSummary,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';
import {
  buildVToolInstruction,
  createVToolSchema,
  extractVToolOutput,
  ntAgentStepIntent,
  ntDoneAnchor,
  ntParseStepArgs,
  ntResultStepIntent,
  ntUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntSteps.js';
import { runThemeGate } from '/_102020_/l2/aura/molecules/agentNewTheme/steps/t3-generate/gate.js';
import { getNtInput } from '/_102020_/l2/aura/molecules/agentNewTheme/agentNewTheme.js';

const AGENT_NAME = 'agentNtGenerate';
const TOOL_NAME = 'submitTheme';
const PLAN_ID = 't3-generate';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NT_AGENT_FOLDER}/steps/t3-generate`,
    agentDescription: 't3-generate — generates the complete theme.ts (contract v1) as a draft',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
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
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsedArgs = ntParseStepArgs(args ?? step.prompt);

  const plan = await readJsonArtifact<NtPlan>(ntPlanFile(), true);
  if (!plan) throw new Error(`[${AGENT_NAME}] plan.json missing`);
  const answers = await readAnswers();
  const authoring = await loadAuthoringSkill();
  const promptMd = await readNtAgentText('steps/t3-generate', 'prompt', '.md', true);
  const schemaRaw = await readNtAgentText('schemas', 't3-generate.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid t3-generate schema`);

  const systemPrompt = promptMd
    .split('{{themeAuthoringSkill}}').join(authoring)
    .split('{{headerRef}}').join(toMlsFileReference(themeFile('.ts')))
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the description and answers are contradictory or impossible to turn into a theme')}`;

  const { prompt } = getNtInput(context);
  const humanPrompt = [
    `## User description\n${prompt || '(empty — everything was decided at the checkpoint)'}`,
    `## Fields already decided (known)\n${JSON.stringify(plan.known, null, 2)}`,
    answers.length ? `## Checkpoint 1 answers\n${JSON.stringify(answers, null, 2)}` : '',
    parsedArgs.retryContext ? `## Previous attempt failed the deterministic gate — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [{
    type: 'prompt_ready',
    args: args || JSON.stringify({ planId: PLAN_ID }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, 'Submit the complete theme.ts and its structured summary', schema as Record<string, unknown>)],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  } as mls.msg.AgentIntentPromptReady];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsedArgs = ntParseStepArgs(step.prompt);
  const attempt = parsedArgs.retryAttempt || 1;

  let themeTs = '';
  let summary: NtThemeSummary | null = null;
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['themeTs', 'summary']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else {
      themeTs = String(output.result.themeTs || '');
      const raw = parseMaybeJson(output.result.summary);
      summary = isRecord(raw) ? raw as unknown as NtThemeSummary : null;
    }
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  const issues = extractError
    ? [{ code: 'extract', message: extractError }]
    : runThemeGate({ themeTs, summary, destProject: ntDestProject() });
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(ntTraceFile(PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: issues.length === 0,
    themeChars: themeTs.length,
    ...(issues.length ? { error: errorText } : {}),
  });

  if (issues.length === 0 && summary) {
    const draft: NtDraft = { themeTs, summary };
    await writeJsonArtifact(ntDraftFile(), draft);
    return [
      ntResultStepIntent(context, parentStep, {
        planId: ntDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: summary.displayName,
        result: { theme: summary.name, palette: summary.palette.length, attempt },
      }),
      ntUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `theme drafted (attempt ${attempt})`, 'input_output'),
    ];
  }

  if (attempt >= 2) {
    return [ntUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `t3-generate failed after retry:\n${errorText}`)];
  }

  // Bounded retry: the OPEN retry step lands FIRST, then this one completes with the
  // trace (never 'failed' while a retry is in flight — collab_messages.md).
  return [
    ntAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || PLAN_ID} (retry)`,
      planId: 't3-generate-retry1',
      prompt: { planId: PLAN_ID, retryAttempt: 2, retryContext: errorText },
    }),
    ntUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
  ];
}

async function readAnswers(): Promise<NtAnswer[]> {
  const saved = await readJsonArtifact<{ answers?: NtAnswer[] }>(ntAnswersFile(), false);
  return Array.isArray(saved?.answers) ? saved!.answers : [];
}

async function loadAuthoringSkill(): Promise<string> {
  const mod = await import('/_102020_/l2/aura/molecules/skills/themeAuthoring/index.js') as { skill?: unknown };
  if (typeof mod.skill !== 'string' || !mod.skill.trim()) throw new Error(`[${AGENT_NAME}] themeAuthoring skill unreadable`);
  return mod.skill;
}
