/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n4-render/agentNm2Render.ts" enhancement="_102027_/l2/enhancementAgent"/>

// n4-render — writes the molecule .ts and COMPILES it. See flow.json.
//
// Two things the old chain did differently:
// - the mls header is prepended by code (the old flow parsed the model's first line to decide where
//   to save the file, so a hallucinated project wrote to the wrong path — lesson M2);
// - the compile fix loop lives HERE, bounded at one retry, instead of in a separate agent whose
//   attempt counter lived in longTermMemory as a string. The retry receives the real compiler
//   errors plus the prodDTS of the molecule's own imports — the same context the old Fix agent
//   assembled, because that is what gives the model actual type signatures.
//
// A second failure FAILS the step: generating a stylesheet and a demo for a molecule that does not
// compile is worse than stopping.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { skill as moleculeGenerationSkill } from '/_102020_/l2/aura/molecules/skills/moleculeGeneration.js';
import { skill as auraOverviewSkill } from '/_102020_/l2/skills/aura/overview.js';
import {
  NM_AGENT_FOLDER,
  compileStorTs,
  isRecord,
  nmBaseFile,
  nmContextFileInfo,
  nmDefsFile,
  nmPlanFileInfo,
  nmTraceFileInfo,
  nmTsFile,
  parseMaybeJson,
  readJsonArtifact,
  readNmAgentText,
  readPreviousAttemptSource,
  readStorText,
  toDisplayPath,
  writeJsonArtifact,
  writeStorTextAtomic,
  type NmFileInfo,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { MoleculePlan, NM_MAX_ATTEMPTS } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { nmIdentityFromPlan, normalizeMoleculeTs } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.js';
import { extractSkillLiteral } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n3-defs/gate.js';
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
import { collectMlClasses, runNm2RenderGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n4-render/gate.js';
import { getNmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.js';

const AGENT_NAME = 'agentNm2Render';
const PLAN_ID = 'n4-render';
const TOOL_NAME = 'submitMoleculeRender';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NM_AGENT_FOLDER}/steps/n4-render`,
    agentDescription: 'n4-render — writes the molecule .ts and compiles it',
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

  const promptMd = await readNmAgentText('steps/n4-render', 'prompt', '.md', true);
  const schemaRaw = await readNmAgentText('schemas', 'n4-render.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid n4-render schema`);

  const groupSkill = await loadGroupSkill(ctx);
  const moleculeBase = await readStorText(nmBaseFile(), true);
  const defsSource = await readStorText(nmDefsFile(plan.group, plan.shortName), true);
  const defsSkill = extractSkillLiteral(defsSource) || defsSource;

  const systemPrompt = promptMd
    .split('{{tag}}').join(plan.tag)
    .split('{{baseClass}}').join(ctx.base.className)
    .split('{{baseImport}}').join(ctx.base.importPath)
    .split('{{groupCanonical}}').join(plan.groupCanonical)
    .split('{{defsSkill}}').join(defsSkill)
    .split('{{moleculeBase}}').join(moleculeBase)
    .split('{{moleculeGeneration}}').join(moleculeGenerationSkill)
    .split('{{auraOverview}}').join(auraOverviewSkill)
    .split('{{groupSkill}}').join(groupSkill)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the contract cannot be implemented as specified')}`;

  // F1 (2026-07-31): on a retry, hand back the file the model itself wrote. See
  // readPreviousAttemptSource for why it comes from the trace and what it fixes.
  const previousAttempt = await readPreviousAttemptSource(runKey, PLAN_ID, parsedArgs.retryAttempt || 1);

  const humanPrompt = [
    `## Confirmed instruction\n${plan.prompt}`,
    plan.visualRequirements.length ? `## Visual requirements\n${plan.visualRequirements.map(item => `- ${item}`).join('\n')}` : '',
    previousAttempt.trim()
      ? `## The file you wrote last time — FIX IT, do not start over\n\`\`\`typescript\n${previousAttempt}\n\`\`\``
      : '',
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit the complete molecule .ts', schema as Record<string, unknown>)],
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
  const fileInfo = nmTsFile(plan.group, plan.shortName);

  let source = '';
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['ts']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else {
      const raw = String(output.result.ts || '');
      source = raw.trim() ? normalizeMoleculeTs(raw, identity) : '';
    }
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  // The file has to be ON DISK to be compiled, so it is written before the gate and only kept when
  // the gate passes — a failed attempt leaves the previous content in place for the retry to read.
  let compileErrors: string[] = [];
  let dependencyDefs = '';
  if (!extractError && source.trim()) {
    await writeStorTextAtomic(fileInfo, source, true);
    const compiled = await compileMolecule(fileInfo, source);
    compileErrors = compiled.errors;
    if (compileErrors.length) dependencyDefs = await collectDependencyDefs(compiled.imports);
  }

  const issues = extractError
    ? [{ code: 'extract', message: extractError }]
    : runNm2RenderGate(source, plan, ctx, { compileErrors });
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(nmTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: issues.length === 0,
    chars: source.length,
    mlClasses: collectMlClasses(source),
    ...(issues.length ? { error: errorText, source } : {}),
  });

  if (issues.length === 0) {
    const display = toDisplayPath(fileInfo);
    return [
      nmResultStepIntent(context, parentStep, {
        planId: nmDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: display,
        result: { file: display, attempt, mlClasses: collectMlClasses(source) },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `molecule written and compiled (attempt ${attempt})`, 'input_output'),
    ];
  }

  if (attempt >= NM_MAX_ATTEMPTS) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${PLAN_ID} failed after ${attempt} attempts:\n${errorText}`)];
  }

  // The retry carries the compiler's own errors AND the type definitions of the imports — what the
  // old Fix agent assembled, because prose about an error is not the same as the signature.
  const retryContext = dependencyDefs ? `${errorText}\n\n## Type definitions of the imports\n${dependencyDefs}` : errorText;
  return [
    nmAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || PLAN_ID} (retry)`,
      planId: `${PLAN_ID}-retry${attempt}`,
      prompt: { planId: PLAN_ID, runKey, retryAttempt: attempt + 1, retryContext },
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

// Moved to helpers/nmFs (compileStorTs) when A5b gave the same treatment to the .defs.ts, the group
// index.ts and the .less — one implementation, so the four steps cannot drift apart.
const compileMolecule = compileStorTs;

// Type definitions of the molecule's own dependencies (port of agentNewMoleculeFix's
// getDefinitonsByImports): the model cannot fix a type error it cannot see the signature for.
async function collectDependencyDefs(imports: string[]): Promise<string> {
  const parts: string[] = [];
  for (const importName of imports) {
    if (!importName.startsWith('./')) continue;
    const fileInfo = importPathToFileInfo(importName);
    if (!fileInfo) continue;
    const storFile = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    if (!storFile) continue;
    const modelTs = await storFile.getOrCreateModel() as mls.editor.IModelTS;
    if (!modelTs) continue;
    await mls.l2.typescript.compileAndPostProcess(modelTs, false, false);
    const definition = modelTs.compilerResults?.prodDTS || '';
    if (definition) parts.push(`**${importName}**\n${definition}`);
  }
  return parts.join('\n\n');
}

// './_102033_/l2/moleculeBase.js' -> the stor file info of its .ts
function importPathToFileInfo(importName: string): NmFileInfo | null {
  const match = /^\.\/_(\d+)_\/l(\d+)\/(.+?)(\.js)?$/.exec(importName);
  if (!match) return null;
  const rest = match[3];
  const lastSlash = rest.lastIndexOf('/');
  return {
    project: Number(match[1]),
    level: Number(match[2]),
    folder: lastSlash >= 0 ? rest.slice(0, lastSlash) : '',
    shortName: lastSlash >= 0 ? rest.slice(lastSlash + 1) : rest,
    extension: '.ts',
  };
}
