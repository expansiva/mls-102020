/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n6-demo/agentNm2Demo.ts" enhancement="_102027_/l2/enhancementAgent"/>

// n6-demo — writes the molecule's playground page. See flow.json.
//
// The page is NOT a shell: it is the demonstration of the molecule, with at least 6 distinct
// scenarios. Two things are deterministic:
// - the literal `playgroundDinamicState` token is replaced by the state assembled from the model's
//   examples (port of agentNewMoleculePlayground.generatePlaygroundState);
// - in a themed project the page container must carry the theme background (glass is invisible on
//   white), which the gate verifies.
//
// A persistent failure does NOT block the pipeline: the anchor is emitted with ok:false, because a
// molecule that compiles and has a stylesheet is delivered work.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { skill as playgroundGeneratorSkill } from '/_102020_/l2/aura/molecules/skills/playgroundGenerator.js';
import {
  NM_AGENT_FOLDER,
  isRecord,
  nmContextFileInfo,
  nmHtmlFile,
  nmPlanFileInfo,
  nmTraceFileInfo,
  nmTsFile,
  parseMaybeJson,
  readJsonArtifact,
  readNmAgentText,
  readStorText,
  toDisplayPath,
  writeJsonArtifact,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { substituteDemoState, type MoleculeDemoExample } from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';
import {
  buildVToolInstruction,
  createVToolSchema,
  extractVToolOutput,
  nmAgentStepIntent,
  nmDoneAnchor,
  nmParseStepArgs,
  nmResultStepIntent,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { runNm2DemoGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n6-demo/gate.js';
import { getNmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.js';

const AGENT_NAME = 'agentNm2Demo';
const PLAN_ID = 'n6-demo';
const TOOL_NAME = 'submitMoleculeDemo';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NM_AGENT_FOLDER}/steps/n6-demo`,
    agentDescription: 'n6-demo — creates the molecule playground page',
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
  const parsedArgs = nmParseStepArgs(args ?? step.prompt);
  const runKey = getNmRunKey(context, parsedArgs.runKey);
  const { ctx, plan } = await readArtifacts(runKey);

  const promptMd = await readNmAgentText('steps/n6-demo', 'prompt', '.md', true);
  const schemaRaw = await readNmAgentText('schemas', 'n6-demo.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid n6-demo schema`);

  const renderTs = await readStorText(nmTsFile(plan.group, plan.shortName), true);
  const groupUsageSkill = await loadGroupUsageSkill(ctx);

  const systemPrompt = promptMd
    .split('{{tag}}').join(plan.tag)
    .split('{{backgroundSection}}').join(buildBackgroundSection(ctx))
    .split('{{renderTs}}').join(renderTs)
    .split('{{playgroundGenerator}}').join(playgroundGeneratorSkill)
    .split('{{groupUsageSkill}}').join(groupUsageSkill)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the molecule source is insufficient to build a playground')}`;

  const humanPrompt = [
    `## The molecule\n${plan.description}`,
    `## Language\nCaptions and titles in '${ctx.userLanguage}'; code comments in English.`,
    parsedArgs.retryContext ? `## The previous attempt failed the deterministic gate — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [{
    type: 'prompt_ready',
    args: args || step.prompt || JSON.stringify({ planId: PLAN_ID, runKey }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, 'Submit the playground page and its examples', schema as Record<string, unknown>)],
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
  const parsedArgs = nmParseStepArgs(step.prompt);
  const attempt = parsedArgs.retryAttempt || 1;
  const runKey = getNmRunKey(context, parsedArgs.runKey);
  const { ctx, plan } = await readArtifacts(runKey);

  let html = '';
  let examples: MoleculeDemoExample[] = [];
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['html', 'examples']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else {
      html = String(output.result.html || '');
      examples = normalizeExamples(output.result.examples);
    }
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  // The gate runs on the model's html, BEFORE substitution — that is when the placeholder must be
  // there for the check to mean anything.
  const issues = extractError
    ? [{ code: 'extract', message: extractError }]
    : runNm2DemoGate(html, examples, plan, ctx);
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(nmTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: issues.length === 0,
    examples: examples.length,
    ...(issues.length ? { error: errorText } : {}),
  });

  const fileInfo = nmHtmlFile(plan.group, plan.shortName);
  const display = toDisplayPath(fileInfo);

  if (issues.length === 0) {
    await writeStorTextAtomic(fileInfo, substituteDemoState(html, examples), true);
    return [
      nmResultStepIntent(context, parentStep, {
        planId: nmDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: display,
        result: { file: display, attempt, examples: examples.length, ok: true },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `demo written with ${examples.length} examples (attempt ${attempt})`, 'input_output'),
    ];
  }

  if (attempt >= 2) {
    // The demo does NOT block the pipeline: the anchor is emitted with ok:false so n7-index and
    // n8-summary still run, and the summary reports what is missing.
    return [
      nmResultStepIntent(context, parentStep, {
        planId: nmDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: `${display} (not created)`,
        result: { file: display, attempt, ok: false, error: errorText },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `demo skipped after retry:\n${errorText}`, 'input_output'),
    ];
  }

  return [
    nmAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || PLAN_ID} (retry)`,
      planId: `${PLAN_ID}-retry1`,
      prompt: { planId: PLAN_ID, runKey, retryAttempt: 2, retryContext: errorText },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
  ];
}

// ---- helpers ----

async function readArtifacts(runKey: string): Promise<{ ctx: MoleculeContext; plan: MoleculePlan }> {
  const ctx = await readJsonArtifact<MoleculeContext>(nmContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  const plan = await readJsonArtifact<MoleculePlan>(nmPlanFileInfo(runKey), true);
  if (!plan || !plan.confirmedAt) throw new Error(`[${AGENT_NAME}] plan.json missing or not confirmed for ${runKey}`);
  return { ctx, plan };
}

async function loadGroupUsageSkill(ctx: MoleculeContext): Promise<string> {
  if (!ctx.groupSkill.usageReference) return '(this group has no usage skill)';
  try {
    const mod = await import(ctx.groupSkill.usageReference) as { skill?: unknown };
    return typeof mod.skill === 'string' && mod.skill.trim() ? mod.skill : '(this group has no usage skill)';
  } catch {
    // The usage skill is a nice-to-have for the demo, not an admission requirement.
    return '(this group has no usage skill)';
  }
}

function buildBackgroundSection(ctx: MoleculeContext): string {
  if (!ctx.theme.present || !ctx.theme.info) {
    return [
      '## Page background',
      '',
      'This project has no theme: use a neutral Tailwind background on the page container',
      '(`bg-white dark:bg-slate-900 min-h-screen`), like the rest of the library. Do not mention',
      'themes or named styles anywhere on the page.',
    ].join('\n');
  }
  const info = ctx.theme.info;
  return [
    `## Page background — theme ${info.displayName || info.name}`,
    '',
    'The page container MUST carry the theme background exactly as written here, or the molecule is',
    'invisible on the page (a translucent style over white shows nothing):',
    '',
    '```css',
    info.background.css,
    '```',
    '',
    info.background.note ? `Note from the theme: ${info.background.note}` : '',
  ].filter(Boolean).join('\n');
}

function normalizeExamples(raw: unknown): MoleculeDemoExample[] {
  if (!Array.isArray(raw)) return [];
  const examples: MoleculeDemoExample[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const state = Array.isArray(item.state)
      ? item.state.filter(isRecord).map(entry => ({
        stateName: typeof entry.stateName === 'string' ? entry.stateName.trim() : '',
        value: typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value ?? null),
      }))
      : [];
    if (name) examples.push({ name, state });
  }
  return examples;
}
