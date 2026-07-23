/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v3-less/agentVariantLess.ts" enhancement="_102027_/l2/enhancementAgent"/>

// v3-less — THE generation call of the pipeline. See flow.json.
// beforePromptStep assembles prompt.md + attached context (theme skill, origin
// sources, example or cold-start instruction); afterPromptStep gates the output
// with retry<=1 and writes the .less.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
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
import { normalizeLessContent } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import { parseOriginRef } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.js';
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
import { runLessGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v3-less/gate.js';
import { getVariantShortName } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/agentNewMoleculeVariant.js';

const AGENT_NAME = 'agentVariantLess';
const TOOL_NAME = 'submitVariantLess';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${V_AGENT_FOLDER}/steps/v3-less`,
    agentDescription: 'v3-less — generates the complete theme sheet for the variant',
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

  const theme = await loadThemeSkill(ctx.theme.project);
  const originTs = await readOriginFile(ctx, '.ts');
  const originLess = await readOriginFile(ctx, '.less');
  const promptMd = await readVAgentText('steps/v3-less', 'prompt', '.md', true);
  const schemaRaw = await readVAgentText('schemas', 'v3-less.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid v3-less schema`);

  const exampleSection = await buildExampleSection(ctx);
  const portalSelectorHint = ctx.origin.portal ? `,\ndiv[data-widget="${ctx.variant.tag}"]` : '';
  const portalRule = ctx.origin.portal
    ? ` This molecule renders a PORTAL: add the second root selector \`div[data-widget="${ctx.variant.tag}"]\` and style the panel classes under it.`
    : ' This molecule has NO portal: do not use data-widget selectors.';

  const systemPrompt = promptMd
    .split('{{variantTag}}').join(ctx.variant.tag)
    .split('{{portalSelectorHint}}').join(portalSelectorHint)
    .split('{{portalRule}}').join(portalRule)
    .split('{{themeSkill}}').join(theme.skill)
    .split('{{exampleSection}}').join(exampleSection)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the provided context is insufficient to produce the sheet')}`;

  const humanPrompt = [
    `## Origin molecule .ts (class inventory source)\n\`\`\`typescript\n${originTs}\n\`\`\``,
    `## Origin molecule .less (base values and class inventory)\n\`\`\`less\n${originLess}\n\`\`\``,
    `## ml-* class inventory (the ONLY classes you may style)\n${ctx.origin.mlClassInventory.join(', ')}`,
    ctx.userNotes ? `## User notes\n${ctx.userNotes}` : '',
    parsedArgs.retryContext ? `## Previous attempt failed the deterministic gate — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [{
    type: 'prompt_ready',
    args: args || JSON.stringify({ planId: 'v3-less' }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, 'Submit the complete variant .less theme sheet', schema as Record<string, unknown>)],
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

  let less = '';
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['lessContent']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else {
      // M2: the mls header is owned by code — strip whatever the model wrote
      // (it copies the reference sheet's project) and prepend the correct one.
      const raw = String(output.result.lessContent || '');
      less = raw.trim() ? normalizeLessContent(raw, ctx) : raw;
    }
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  const issues = extractError ? [{ code: 'extract', message: extractError }] : runLessGate(less, ctx);
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(vTraceFileInfo(shortName, 'v3-less', attempt), {
    savedAt: new Date().toISOString(),
    planId: 'v3-less',
    attempt,
    ok: issues.length === 0,
    ...(issues.length ? { error: errorText, lessChars: less.length } : { lessChars: less.length }),
  });

  if (issues.length === 0) {
    await writeStorTextAtomic(vMoleculeFile(ctx.variant.group, ctx.variant.shortName, '.less'), less, true);
    return [
      vResultStepIntent(context, parentStep, {
        planId: vDoneAnchor('v3-less'),
        dependsOn: [],
        stepTitle: ctx.variant.files.less,
        result: { file: ctx.variant.files.less, attempt },
      }),
      vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `less written (attempt ${attempt})`, 'input_output'),
    ];
  }

  if (attempt >= 2) {
    return [vUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `v3-less failed after retry:\n${errorText}`)];
  }

  // Bounded retry: add the OPEN retry step FIRST, then complete-with-trace
  // (never 'failed' with a retry in flight — collab_messages.md).
  return [
    vAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || 'v3-less'} (retry)`,
      planId: 'v3-less-retry1',
      prompt: { planId: 'v3-less', retryAttempt: 2, retryContext: errorText },
    }),
    vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
  ];
}

async function loadThemeSkill(project: number): Promise<{ skill: string }> {
  const mod = await import(`/_${project}_/l2/skills/theme.js`) as { skill?: unknown };
  if (typeof mod.skill !== 'string' || !mod.skill.trim()) throw new Error(`[${AGENT_NAME}] theme skill unreadable for project ${project}`);
  return { skill: mod.skill };
}

async function readOriginFile(ctx: VariantContext, extension: '.ts' | '.less'): Promise<string> {
  return readStorText({
    project: ctx.origin.project,
    level: 2,
    folder: `molecules/${ctx.origin.group}`,
    shortName: ctx.origin.shortName,
    extension,
  }, extension === '.ts');
}

async function buildExampleSection(ctx: VariantContext): Promise<string> {
  if (ctx.example.coldStart || !ctx.example.ref) {
    return `## Reference example
No reference implementation exists yet for this theme. Derive everything from the Visual Signature, Tokens and Canonical CSS Rules sections of the theme skill — do not invent values that are not there. This is the FIRST molecule of this theme (pilot).`;
  }
  const parsed = parseOriginRef(ctx.example.ref);
  if (!parsed.ref) {
    return '## Reference example\n(example reference unreadable — proceed from the theme skill alone)';
  }
  const exampleLess = await readStorText({
    project: parsed.ref.project,
    level: 2,
    folder: `molecules/${parsed.ref.group}`,
    shortName: parsed.ref.shortName,
    extension: '.less',
  }, false);
  if (!exampleLess.trim()) {
    return '## Reference example\n(example reference unreadable — proceed from the theme skill alone)';
  }
  return `## Reference example (${ctx.example.pattern} pattern) — a validated sheet of THIS theme; follow its structure
\`\`\`less
${exampleLess}
\`\`\``;
}
