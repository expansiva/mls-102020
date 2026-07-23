/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/agentVariantIndex.ts" enhancement="_102027_/l2/enhancementAgent"/>

// v4-index — regenerates the group's SHOWCASE index page (index.ts + index.html)
// reusing the shared indexGroupPage skill, exactly the content agentUpdateIndexGroupPage
// produces. It does NOT invoke that agent (its afterPromptStep chains "next groups"
// off the task's original message, which would fan out / break our anchors — see
// todo). Instead it reuses the SKILL and drives generation as a normal pipeline step:
// beforePromptStep assembles the prompt; afterPromptStep gates + retries + writes,
// best-effort compiles and, on a compile error, schedules agentNewMoleculeFix. Index
// failure NEVER blocks the pipeline: the v4-done anchor is emitted ok:false and the
// summary reports it (flow.json v4-index.onFail).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  V_AGENT_FOLDER,
  isRecord,
  parseMaybeJson,
  readJsonArtifact,
  readVAgentText,
  toDisplayPath,
  vContextFileInfo,
  vMoleculeFile,
  vTraceFileInfo,
  writeJsonArtifact,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vFs.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { renderGroupIndexHtml } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import {
  buildVToolInstruction,
  createVToolSchema,
  extractVToolOutput,
  vAgentStepIntent,
  vDoneAnchor,
  vParseStepArgs,
  vResultStepIntent,
  vUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.js';
import { runIndexGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/gate.js';
import { getVariantShortName } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/agentNewMoleculeVariant.js';
import { skills } from '/_102020_/l2/aura/molecules/skills/index.js';
import { skill as indexGroupPageSkill } from '/_102020_/l2/aura/molecules/skills/indexGroupPage.js';

const AGENT_NAME = 'agentVariantIndex';
const TOOL_NAME = 'submitGroupIndex';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${V_AGENT_FOLDER}/steps/v4-index`,
    agentDescription: 'v4-index — regenerates the group showcase index page (reuses the indexGroupPage skill)',
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
  const parsedArgs = vParseStepArgs(args ?? step.prompt);
  const shortName = getVariantShortName(context);
  const ctx = await readJsonArtifact<VariantContext>(vContextFileInfo(shortName), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${shortName}`);

  const groupEntry = skills.find(s => s.name === ctx.origin.groupCanonical);
  if (!groupEntry) throw new Error(`[${AGENT_NAME}] group '${ctx.origin.groupCanonical}' not found in skills index`);
  const usageSkill = await loadUsageSkill(groupEntry.skillUsageReference);
  const moleculeShortNames = scanGroupMolecules(ctx);
  const fileReference = indexFileReference(ctx);

  const promptMd = await readVAgentText('steps/v4-index', 'prompt', '.md', true);
  const schemaRaw = await readVAgentText('schemas', 'v4-index.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid v4-index schema`);

  const systemPrompt = promptMd
    .split('{{actualProjectId}}').join(String(ctx.theme.project))
    .split('{{fileReference}}').join(fileReference)
    .split('{{indexGroupPageSkill}}').join(indexGroupPageSkill)
    .split('{{groupName}}').join(groupEntry.name)
    .split('{{groupName_lower}}').join(ctx.variant.group)
    .split('{{groupDescription}}').join(groupEntry.description)
    .split('{{usageSkill}}').join(usageSkill)
    .split('{{moleculeFiles}}').join(moleculeShortNames.join('\n'))
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the group has no molecules to showcase')}`;

  const humanPrompt = [
    `Generate the showcase index page for group ${groupEntry.name}.`,
    `Molecules (tags are ${ctx.variant.group}--<shortName>): ${moleculeShortNames.join(', ')}`,
    parsedArgs.retryContext ? `## Previous attempt failed the deterministic gate — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [{
    type: 'prompt_ready',
    args: args || JSON.stringify({ planId: 'v4-index' }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, 'Submit the complete group showcase index.ts', schema as Record<string, unknown>)],
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
  const parsedArgs = vParseStepArgs(step.prompt);
  const attempt = parsedArgs.retryAttempt || 1;
  const shortName = getVariantShortName(context);
  const ctx = await readJsonArtifact<VariantContext>(vContextFileInfo(shortName), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${shortName}`);

  let indexTs = '';
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['ts']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else indexTs = String(output.result.ts || '');
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  const issues = extractError ? [{ code: 'extract', message: extractError }] : runIndexGate(indexTs, ctx);
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  if (issues.length === 0) {
    const indexTsInfo = vMoleculeFile(ctx.variant.group, 'index', '.ts');
    const indexHtmlInfo = vMoleculeFile(ctx.variant.group, 'index', '.html');
    await writeStorTextAtomic(indexTsInfo, indexTs, true);
    await writeStorTextAtomic(indexHtmlInfo, renderGroupIndexHtml(ctx), true);
    const compileOk = await compileIndex(indexTsInfo);

    await writeJsonArtifact(vTraceFileInfo(shortName, 'v4-index', attempt), {
      savedAt: new Date().toISOString(), planId: 'v4-index', attempt, ok: true, compiled: compileOk,
    });

    const fileReference = indexFileReference(ctx);
    const intents: mls.msg.AgentIntent[] = [
      vResultStepIntent(context, parentStep, {
        planId: vDoneAnchor('v4-index'),
        dependsOn: [],
        stepTitle: toDisplayPath(indexTsInfo),
        result: { ok: true, files: [toDisplayPath(indexTsInfo), toDisplayPath(indexHtmlInfo)], compiled: compileOk, attempt },
      }),
    ];
    // Compile error: schedule the Fix agent on the index file (it takes a plain
    // fileReference and never fans out over groups). The pipeline still advances.
    if (!compileOk) intents.push(fixStepIntent(context, parentStep, fileReference));
    intents.push(vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
      compileOk ? `index written (attempt ${attempt})` : `index written with compile errors — Fix scheduled`, 'input_output'));
    return intents;
  }

  await writeJsonArtifact(vTraceFileInfo(shortName, 'v4-index', attempt), {
    savedAt: new Date().toISOString(), planId: 'v4-index', attempt, ok: false, error: errorText,
  });

  if (attempt >= 2) {
    // Resilience: index failure does NOT block the molecule delivery. Emit the
    // anchor ok:false so v5/v6 proceed; v6-summary reports the failure.
    return [
      vResultStepIntent(context, parentStep, {
        planId: vDoneAnchor('v4-index'),
        dependsOn: [],
        stepTitle: 'index failed (reported in summary)',
        result: { ok: false, error: errorText },
      }),
      vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `index failed after retry (pipeline continues):\n${errorText}`, 'input_output'),
    ];
  }

  return [
    vAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || 'v4-index'} (retry)`,
      planId: 'v4-index-retry1',
      prompt: { planId: 'v4-index', retryAttempt: 2, retryContext: errorText },
    }),
    vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
  ];
}

function indexFileReference(ctx: VariantContext): string {
  return `_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/index.ts`;
}

async function loadUsageSkill(ref: string): Promise<string> {
  const mod = await import(ref) as { skill?: unknown };
  if (typeof mod.skill !== 'string' || !mod.skill.trim()) throw new Error(`[${AGENT_NAME}] usage skill unreadable at ${ref}`);
  return mod.skill;
}

// All molecule shortNames of the group in the destination project (the variant
// created earlier in the pipeline is already in the stor). index is excluded.
function scanGroupMolecules(ctx: VariantContext): string[] {
  const folder = `molecules/${ctx.variant.group}`;
  const found = Object.keys(mls.stor.files)
    .map(key => mls.stor.files[key])
    .filter(sf => sf && sf.status !== 'deleted' && sf.project === ctx.theme.project && sf.extension === '.ts' && sf.folder === folder && sf.shortName !== 'index')
    .map(sf => sf.shortName);
  if (!found.includes(ctx.variant.shortName)) found.push(ctx.variant.shortName);
  return Array.from(new Set(found)).sort();
}

// Best-effort compile: mirrors agentUpdateIndexGroupPage. Any failure of the
// compile machinery itself is swallowed (returns true) so it never blocks — only
// a definite compileOk===false schedules the Fix.
async function compileIndex(indexInfo: ReturnType<typeof vMoleculeFile>): Promise<boolean> {
  try {
    const storFile = mls.stor.files[mls.stor.getKeyToFile(indexInfo)];
    if (!storFile) return true;
    const model = await storFile.getOrCreateModel();
    if (!model?.model) return true;
    return await mls.l2.typescript.compileAndPostProcess(model, true, false);
  } catch {
    return true;
  }
}

function fixStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  fileReference: string,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: `Fix index compile errors: ${fileReference}`,
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: 'agentNewMoleculeFix',
      prompt: fileReference,
      rags: [],
      planning: { planId: 'v4-index-fix', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
}
