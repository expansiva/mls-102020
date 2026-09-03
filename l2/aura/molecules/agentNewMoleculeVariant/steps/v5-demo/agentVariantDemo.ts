/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v5-demo/agentVariantDemo.ts" enhancement="_102027_/l2/enhancementAgent"/>

// v5-demo — generates the variant's .html demo page. See flow.json.
// Persistent failure does NOT block the pipeline: v5-done is always emitted
// (with ok:false on failure) so v6-summary can run and report it.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { skills as skillList } from '/_102020_/l2/aura/molecules/skills/index';
import { skill as playgroundSkill } from '/_102020_/l2/aura/molecules/skills/playgroundGenerator.js';
import {
  V_AGENT_FOLDER,
  isRecord,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  readVAgentText,
  vContextFileInfo,
  vMoleculeFile,
  vTraceFileInfo,
  writeJsonArtifact,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vFs.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { loadThemeSignature } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTheme.js';
import { VDemoExample, substituteDemoState } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
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
import { runDemoGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v5-demo/gate.js';
import { getVariantShortName } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/agentNewMoleculeVariant.js';

const AGENT_NAME = 'agentVariantDemo';
const TOOL_NAME = 'submitVariantDemo';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${V_AGENT_FOLDER}/steps/v5-demo`,
    agentDescription: 'v5-demo — generates the variant demo page (.html)',
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

  const originTs = await readStorText({ project: ctx.origin.project, level: 2, folder: `molecules/${ctx.origin.group}`, shortName: ctx.origin.shortName, extension: '.ts' }, true);
  const usageSkill = await loadUsageSkill(ctx.origin.groupCanonical);
  const themeSignature = await loadThemeSignature(ctx.theme.project);
  const promptMd = await readVAgentText('steps/v5-demo', 'prompt', '.md', true);
  const schemaRaw = await readVAgentText('schemas', 'v5-demo.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid v5-demo schema`);

  const systemPrompt = promptMd
    .split('{{variantTag}}').join(ctx.variant.tag)
    .split('{{backgroundCss}}').join(ctx.theme.info.background.css)
    .split('{{backgroundNote}}').join(ctx.theme.info.background.note)
    .split('{{playgroundSkill}}').join(playgroundSkill)
    .split('{{themeSignature}}').join(themeSignature)
    .split('{{usageSkill}}').join(usageSkill || '(no group usage notes available)')
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the provided context is insufficient to produce the page')}`;

  const humanPrompt = [
    `## Origin molecule source (API: properties, slots, events)\n\`\`\`typescript\n${originTs}\n\`\`\``,
    parsedArgs.retryContext ? `## Previous attempt failed the deterministic gate — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [{
    type: 'prompt_ready',
    args: args || JSON.stringify({ planId: 'v5-demo' }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, 'Submit the variant demo page', schema as Record<string, unknown>)],
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

  let html = '';
  let examples: VDemoExample[] = [];
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['html', 'examples']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else {
      html = String(output.result.html || '');
      examples = Array.isArray(output.result.examples) ? output.result.examples as VDemoExample[] : [];
    }
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  const issues = extractError ? [{ code: 'extract', message: extractError }] : runDemoGate(html, ctx);
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(vTraceFileInfo(shortName, 'v5-demo', attempt), {
    savedAt: new Date().toISOString(),
    planId: 'v5-demo',
    attempt,
    ok: issues.length === 0,
    ...(issues.length ? { error: errorText } : { htmlChars: html.length, examples: examples.length }),
  });

  if (issues.length === 0) {
    const finalHtml = substituteDemoState(html, examples);
    await writeStorTextAtomic(vMoleculeFile(ctx.variant.group, ctx.variant.shortName, '.html'), finalHtml, true);
    return [
      vResultStepIntent(context, parentStep, {
        planId: vDoneAnchor('v5-demo'),
        dependsOn: [],
        stepTitle: ctx.variant.files.html,
        result: { ok: true, file: ctx.variant.files.html, attempt },
      }),
      vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `demo written (attempt ${attempt})`, 'input_output'),
    ];
  }

  if (attempt >= 2) {
    // Demo failure never blocks the pipeline: emit the anchor with ok:false so
    // v6-summary unlocks and reports the failure (flow.json v5-demo.onFail).
    return [
      vResultStepIntent(context, parentStep, {
        planId: vDoneAnchor('v5-demo'),
        dependsOn: [],
        stepTitle: 'demo failed (reported in summary)',
        result: { ok: false, error: errorText },
      }),
      vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `demo failed after retry (pipeline continues):\n${errorText}`, 'input_output'),
    ];
  }

  return [
    vAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || 'v5-demo'} (retry)`,
      planId: 'v5-demo-retry1',
      prompt: { planId: 'v5-demo', retryAttempt: 2, retryContext: errorText },
    }),
    vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
  ];
}

async function loadUsageSkill(groupCanonical: string): Promise<string> {
  const path = skillList.find(item => item.name === groupCanonical)?.skillUsageReference;
  if (!path) return '';
  try {
    const mod = await import(path) as { skill?: unknown };
    return typeof mod.skill === 'string' ? mod.skill : '';
  } catch {
    return '';
  }
}

