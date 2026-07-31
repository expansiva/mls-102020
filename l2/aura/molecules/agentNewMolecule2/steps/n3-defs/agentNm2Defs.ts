/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n3-defs/agentNm2Defs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// n3-defs — writes the .defs.ts, the spec every later step reads. See flow.json.
//
// Boundary (decision Q7/Q7b): the model writes ONLY the five-section markdown; the template writes
// the header, the 'Do not change' comment, `export const group`, `export const layoutConfig = {}`
// (left EMPTY for the Design System process to fill) and the escaped skill literal, and it swaps the
// `- TagName:` line for the derived tag. The gate then validates the rendered file.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  NM_AGENT_FOLDER,
  compileStorTs,
  isRecord,
  nmContextFileInfo,
  nmDefsFile,
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
import { nmDefsHeader, nmIdentityFromPlan, renderDefsTs } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.js';
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
import { runNm2DefsGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n3-defs/gate.js';
import { getNmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.js';

const AGENT_NAME = 'agentNm2Defs';
const PLAN_ID = 'n3-defs';
const TOOL_NAME = 'submitMoleculeContract';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NM_AGENT_FOLDER}/steps/n3-defs`,
    agentDescription: 'n3-defs — writes the molecule contract (.defs.ts)',
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

  const promptMd = await readNmAgentText('steps/n3-defs', 'prompt', '.md', true);
  const schemaRaw = await readNmAgentText('schemas', 'n3-defs.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid n3-defs schema`);
  const groupSkill = await loadGroupSkill(ctx);

  const systemPrompt = promptMd
    .split('{{tag}}').join(plan.tag)
    .split('{{groupCanonical}}').join(plan.groupCanonical)
    .split('{{groupSkill}}').join(groupSkill)
    .split('{{requirements}}').join(buildRequirements(plan))
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the confirmed requirements are not enough to write a contract')}`;

  // F1: on a retry, hand back the RENDERED contract of the previous attempt. The model only writes
  // the markdown, but the file is what the gate judged — an unescaped backtick, a missing section or a
  // wrong TagName is only visible there.
  const previousAttempt = await readPreviousAttemptSource(runKey, PLAN_ID, parsedArgs.retryAttempt || 1);

  const humanPrompt = [
    `Write the contract for ${plan.tag} in '${ctx.userLanguage}'.`,
    previousAttempt.trim() ? `## The .defs.ts your last markdown produced — FIX IT, do not start over\n\`\`\`typescript\n${previousAttempt}\n\`\`\`` : '',
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit the molecule contract markdown', schema as Record<string, unknown>)],
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
  const { plan } = await readArtifacts(runKey);
  const identity = nmIdentityFromPlan(plan);

  let source = '';
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['skillMd']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else {
      const skillMd = String(output.result.skillMd || '');
      source = skillMd.trim() ? renderDefsTs(identity, skillMd, plan.layoutConfig || {}) : '';
    }
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  // A5b (2026-07-30): the .defs.ts is TypeScript and used to be written blind. Its known failure mode
  // is an unescaped backtick or `${` inside the skill literal, which the gate checks textually — the
  // compiler is the definitive check, so the file is written first and compiled. A failed attempt
  // leaves the content on disk for the retry to read, the same trade n4-render already makes.
  const fileInfo = nmDefsFile(plan.group, plan.shortName);
  let compileErrors: string[] = [];
  if (!extractError && source.trim()) {
    await writeStorTextAtomic(fileInfo, source, true);
    compileErrors = (await compileStorTs(fileInfo, source)).errors;
  }

  const issues = extractError
    ? [{ code: 'extract', message: extractError }]
    : [
      ...runNm2DefsGate(source, plan, nmDefsHeader(identity)),
      ...compileErrors.map(message => ({ code: 'compile', message })),
    ];
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(nmTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: issues.length === 0,
    chars: source.length,
    ...(issues.length ? { error: errorText, source } : {}),
  });

  if (issues.length === 0) {
    const display = toDisplayPath(fileInfo);
    return [
      nmResultStepIntent(context, parentStep, {
        planId: nmDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: display,
        result: { file: display, attempt },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `contract written (attempt ${attempt})`, 'input_output'),
    ];
  }

  if (attempt >= NM_MAX_ATTEMPTS) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${PLAN_ID} failed after ${attempt} attempts:\n${errorText}`)];
  }

  // Bounded retry: the OPEN retry step comes first, then complete-with-trace (never 'failed' with a
  // retry in flight — collab_messages.md).
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

async function loadGroupSkill(ctx: MoleculeContext): Promise<string> {
  const mod = await import(ctx.groupSkill.reference) as { skill?: unknown };
  if (typeof mod.skill !== 'string' || !mod.skill.trim()) {
    throw new Error(`[${AGENT_NAME}] group creation skill unreadable: ${ctx.groupSkill.reference}`);
  }
  return mod.skill;
}

function buildRequirements(plan: MoleculePlan): string {
  const lines = [
    `**Description**: ${plan.description}`,
    '',
    `**Instruction**: ${plan.prompt}`,
    '',
    '**Functional requirements**',
    ...plan.functionalRequirements.map(item => `- ${item}`),
  ];
  if (plan.visualRequirements.length) {
    lines.push('', '**Visual requirements** (fold these in as hierarchy statements, never as values)');
    lines.push(...plan.visualRequirements.map(item => `- ${item}`));
  }
  return lines.join('\n');
}
