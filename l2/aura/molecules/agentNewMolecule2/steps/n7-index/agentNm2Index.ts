/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n7-index/agentNm2Index.ts" enhancement="_102027_/l2/enhancementAgent"/>

// n7-index — regenerates the group's showcase page (index.ts + index.html). See flow.json.
//
// Decision D5: the skill is reused IN THIS STEP; no other agent is invoked. agentUpdateIndexGroupPage
// fans out (lesson P4), and the Variant's v4-index already proved that reusing the skill in-step is
// the calmer path.
//
// A persistent failure does NOT block the pipeline: the anchor is emitted with ok:false and
// n8-summary reports it. index.html is deterministic — just the group index element.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { skill as indexGroupPageSkill } from '/_102020_/l2/aura/molecules/skills/indexGroupPage.js';
import {
  NM_AGENT_FOLDER,
  compileStorTs,
  isRecord,
  nmContextFileInfo,
  nmGroupIndexFile,
  nmPlanFileInfo,
  nmTraceFileInfo,
  parseMaybeJson,
  readJsonArtifact,
  readNmAgentText,
  readPreviousAttemptSource,
  toDisplayPath,
  writeJsonArtifact,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { MoleculePlan, NM_MAX_ATTEMPTS } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import {
  nmGroupIndexTag,
  nmIdentityFromPlan,
  nmMoleculeRef,
  renderGroupIndexHtml,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.js';
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
import { runNm2IndexGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n7-index/gate.js';
import { getNmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.js';

const AGENT_NAME = 'agentNm2Index';
const PLAN_ID = 'n7-index';
const TOOL_NAME = 'submitGroupIndex';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NM_AGENT_FOLDER}/steps/n7-index`,
    agentDescription: 'n7-index — regenerates the group showcase page',
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
  const identity = nmIdentityFromPlan(plan);

  const promptMd = await readNmAgentText('steps/n7-index', 'prompt', '.md', true);
  const schemaRaw = await readNmAgentText('schemas', 'n7-index.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid n7-index schema`);

  const groupMolecules = scanGroupMolecules(ctx, plan);
  const groupUsageSkill = await loadGroupUsageSkill(ctx);

  const systemPrompt = promptMd
    .split('{{indexReference}}').join(indexReference(ctx, plan))
    .split('{{indexTag}}').join(nmGroupIndexTag(identity))
    .split('{{groupCanonical}}').join(plan.groupCanonical)
    .split('{{groupMolecules}}').join(groupMolecules.map(name => `\`${name}\``).join(', '))
    .split('{{newMoleculeShortName}}').join(plan.shortName)
    .split('{{newMoleculeTag}}').join(plan.tag)
    .split('{{backgroundSection}}').join(buildBackgroundSection(ctx))
    .split('{{indexGroupPage}}').join(indexGroupPageSkill)
    .split('{{groupUsageSkill}}').join(groupUsageSkill)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the group cannot be showcased with the given context')}`;

  // F1: on a retry, hand back the index the model itself wrote (see readPreviousAttemptSource).
  const previousAttempt = await readPreviousAttemptSource(runKey, PLAN_ID, parsedArgs.retryAttempt || 1);

  const humanPrompt = [
    `## The molecule just added\n${plan.shortName} — ${plan.description}`,
    `## Language\nTitles and captions in '${ctx.userLanguage}'; code comments in English.`,
    previousAttempt.trim() ? `## The index you wrote last time — FIX IT, do not start over\n\`\`\`typescript\n${previousAttempt}\n\`\`\`` : '',
    parsedArgs.retryContext ? `## What the gate rejected — fix ALL of these\n${parsedArgs.retryContext}` : '',
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit the complete group index.ts', schema as Record<string, unknown>)],
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
  const identity = nmIdentityFromPlan(plan);
  const groupMolecules = scanGroupMolecules(ctx, plan);
  const groupUsageSkill = await loadGroupUsageSkill(ctx);

  let indexTs = '';
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['indexTs']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else indexTs = String(output.result.indexTs || '');
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  // A5b (2026-07-30): of the three artifacts that were written blind, this is the dangerous one — the
  // group index is SHARED, rewritten with a new import line and a whole Lit component, so a break
  // takes down the page of every molecule in the group, not just the new one.
  const tsInfo = nmGroupIndexFile(plan.group, '.ts');
  let compileErrors: string[] = [];
  if (!extractError && indexTs.trim()) {
    await writeStorTextAtomic(tsInfo, indexTs, true);
    compileErrors = (await compileStorTs(tsInfo, indexTs)).errors;
  }

  const issues = extractError
    ? [{ code: 'extract', message: extractError }]
    : [
      ...runNm2IndexGate(indexTs, plan, ctx, { indexTag: nmGroupIndexTag(identity), groupMolecules, groupUsageSkill }),
      ...compileErrors.map(message => ({ code: 'compile', message })),
    ];
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(nmTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: issues.length === 0,
    groupMolecules,
    ...(issues.length ? { error: errorText, source: indexTs } : {}),
  });

  const display = toDisplayPath(tsInfo);

  if (issues.length === 0) {
    // index.html is deterministic: just the group index element.
    await writeStorTextAtomic(nmGroupIndexFile(plan.group, '.html'), `${renderGroupIndexHtml(identity)}\n`, true);
    return [
      nmResultStepIntent(context, parentStep, {
        planId: nmDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: display,
        result: { file: display, attempt, molecules: groupMolecules.length, ok: true },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `group index regenerated with ${groupMolecules.length} molecules (attempt ${attempt})`, 'input_output'),
    ];
  }

  if (attempt >= NM_MAX_ATTEMPTS) {
    // The index NEVER blocks the pipeline (decision in flow.json): n8-summary reports the gap.
    return [
      nmResultStepIntent(context, parentStep, {
        planId: nmDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: `${display} (not updated)`,
        result: { file: display, attempt, ok: false, error: errorText },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `index skipped after retry:\n${errorText}`, 'input_output'),
    ];
  }

  return [
    nmAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || PLAN_ID} (retry)`,
      planId: `${PLAN_ID}-retry${attempt}`,
      prompt: { planId: PLAN_ID, runKey, retryAttempt: attempt + 1, retryContext: errorText },
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

function indexReference(ctx: MoleculeContext, plan: MoleculePlan): string {
  return `_${ctx.destination.project}_/l2/molecules/${plan.group}/index.ts`;
}

async function loadGroupUsageSkill(ctx: MoleculeContext): Promise<string> {
  if (!ctx.groupSkill.usageReference) return '(this group has no usage skill)';
  try {
    const mod = await import(ctx.groupSkill.usageReference) as { skill?: unknown };
    return typeof mod.skill === 'string' && mod.skill.trim() ? mod.skill : '(this group has no usage skill)';
  } catch {
    return '(this group has no usage skill)';
  }
}

// Every molecule shortName of the group in the destination project (the one created earlier in this
// pipeline is already in the stor). `index` is excluded, and `.defs` companions are not `.ts` roots.
function scanGroupMolecules(ctx: MoleculeContext, plan: MoleculePlan): string[] {
  const folder = `molecules/${plan.group}`;
  const found = Object.keys(mls.stor.files)
    .map(key => mls.stor.files[key])
    .filter(storFile => storFile
      && storFile.status !== 'deleted'
      && storFile.project === ctx.destination.project
      && storFile.extension === '.ts'
      && storFile.folder === folder
      && storFile.shortName !== 'index'
      && !storFile.shortName.endsWith('.defs')
      && !storFile.shortName.endsWith('.test'))
    .map(storFile => storFile.shortName);
  if (!found.includes(plan.shortName)) found.push(plan.shortName);
  return Array.from(new Set(found)).sort();
}

function buildBackgroundSection(ctx: MoleculeContext): string {
  if (!ctx.theme.present || !ctx.theme.info) {
    return [
      '## Page background',
      '',
      'This project has no theme: use a neutral Tailwind background on the page container, like the',
      'rest of the library. Do not mention themes or named styles anywhere on the page.',
    ].join('\n');
  }
  const info = ctx.theme.info;
  return [
    `## Page background — theme ${info.displayName || info.name}`,
    '',
    'The showcase container MUST carry the theme background exactly as written here, or the themed',
    'molecules render on neutral surfaces and a translucent style shows nothing:',
    '',
    '```css',
    info.background.css,
    '```',
  ].join('\n');
}

export { nmMoleculeRef };
