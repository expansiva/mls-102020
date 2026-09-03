/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v6-summary/agentVariantSummary.ts" enhancement="_102027_/l2/enhancementAgent"/>

// v6-summary — cheap final summary in the user's language. See flow.json.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  V_AGENT_FOLDER,
  isRecord,
  parseMaybeJson,
  readJsonArtifact,
  readVAgentText,
  vContextFileInfo,
  vFileExists,
  vMoleculeFile,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vFs.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { vUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.js';
import { getVariantShortName } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/agentNewMoleculeVariant.js';

const AGENT_NAME = 'agentVariantSummary';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${V_AGENT_FOLDER}/steps/v6-summary`,
    agentDescription: 'v6-summary — final human summary of the variant pipeline',
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

  const shortName = getVariantShortName(context);
  const ctx = await readJsonArtifact<VariantContext>(vContextFileInfo(shortName), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${shortName}`);

  const demoFailed = !vFileExists(vMoleculeFile(ctx.variant.group, ctx.variant.shortName, '.html'));
  const files = [ctx.variant.files.ts, ctx.variant.files.defs, ctx.variant.files.less]
    .concat(demoFailed ? [] : [ctx.variant.files.html]);

  const promptMd = await readVAgentText('steps/v6-summary', 'prompt', '.md', true);
  const systemPrompt = promptMd
    .split('{{userLanguage}}').join(ctx.userLanguage)
    .split('{{demoFailed}}').join(demoFailed ? 'YES' : 'no')
    .split('{{coldStart}}').join(ctx.example.coldStart ? 'YES' : 'no')
    .split('{{indexNote}}').join(' and the group index page');

  const humanPrompt = JSON.stringify({
    variantTag: ctx.variant.tag,
    theme: ctx.theme.info.displayName,
    origin: ctx.origin.tag,
    originProject: ctx.origin.project,
    portal: ctx.origin.portal,
    filesWritten: files,
    demoFailed,
    coldStart: ctx.example.coldStart,
    userNotes: ctx.userNotes,
  }, null, 2);

  return [{
    type: 'prompt_ready',
    args: args || JSON.stringify({ planId: 'v6-summary' }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
  } as mls.msg.AgentIntentPromptReady];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const payload = parseMaybeJson(step.interaction?.payload?.[0]);
  const ok = isRecord(payload) && (payload.type === 'flexible' || payload.type === 'result');
  return [vUpdateStatusIntent(
    context, parentStep, step, hookSequential,
    'completed',
    ok ? undefined : 'summary payload unexpected — pipeline artifacts are on disk',
  )];
}
