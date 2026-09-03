/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c6-summary/agentCopySummary.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c6-summary — the only judgment call of the pipeline, and a cheap one: the closing message in
// the user's language. Everything it says comes from the context and from what is on disk.
// See flow.json; the message contract is in prompt.md.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  C_AGENT_FOLDER,
  cContextFileInfo,
  cDestMoleculeFile,
  cFileExists,
  isRecord,
  parseMaybeJson,
  readCAgentText,
  readJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cFs.js';
import { CopyContext, copyShortName, copyTag, itemsToWrite } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { cParseStepArgs, cUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.js';
import { getCRunKey } from '/_102020_/l2/aura/molecules/agentCopyMolecule/agentCopyMolecule.js';

const AGENT_NAME = 'agentCopySummary';
const PLAN_ID = 'c6-summary';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${C_AGENT_FOLDER}/steps/c6-summary`,
    agentDescription: 'c6-summary — closing message: what was copied, where the translation goes, freezing and shadowing',
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

  const runKey = getCRunKey(context, cParseStepArgs(args || step.prompt).runKey);
  const ctx = await readJsonArtifact<CopyContext>(cContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);

  const copied = itemsToWrite(ctx).map(item => {
    const shortName = copyShortName(item);
    const html = cDestMoleculeFile(item.destination.group, shortName, '.html');
    const defs = cDestMoleculeFile(item.destination.group, shortName, '.defs.ts');
    const less = cDestMoleculeFile(item.destination.group, shortName, '.less');
    return {
      tag: copyTag(item),
      shortName,
      group: item.destination.group,
      from: item.origin.ref,
      flattenedFrom: item.origin.chain.isShell ? item.origin.chain.parentRef : null,
      renamedFrom: item.rename ? item.origin.shortName : null,
      replacedExisting: !!item.collision,
      files: [
        item.destination.files.ts,
        ...(cFileExists(defs) ? [item.destination.files.defs] : []),
        ...(cFileExists(less) ? [item.destination.files.less] : []),
        ...(cFileExists(html) ? [item.destination.files.html] : []),
      ],
      demoCopied: cFileExists(html),
      stylesheetCopied: cFileExists(less),
    };
  });
  const cancelled = !!ctx.cancelled;
  const skipped = cancelled ? [] : ctx.items.filter(item => item.skip).map(item => item.destination.files.ts);
  const demoFailed = copied.some(entry => !entry.demoCopied);
  const stylesheetMissing = copied.some(entry => !entry.stylesheetCopied);

  const promptMd = await readCAgentText('steps/c6-summary', 'prompt', '.md', true);
  const systemPrompt = promptMd
    .split('{{userLanguage}}').join(ctx.userLanguage)
    .split('{{demoFailed}}').join(demoFailed ? 'YES' : 'no')
    .split('{{cancelled}}').join(cancelled ? 'YES' : 'no')
    .split('{{stylesheetMissing}}').join(stylesheetMissing ? 'YES' : 'no')
    .split('{{skipped}}').join(skipped.length ? `${skipped.length} ignorada(s)` : 'nenhuma');

  const humanPrompt = JSON.stringify({
    destProject: ctx.destProject,
    mode: ctx.mode,
    copiedFromDate: ctx.copiedFromDate,
    cancelled,
    // What the user asked for, so the cancel message can name it.
    requested: ctx.items.map(item => item.origin.ref),
    copied,
    skipped,
    demoFailed,
    stylesheetMissing,
    userNotes: ctx.userNotes,
  }, null, 2);

  return [{
    type: 'prompt_ready',
    args: args || JSON.stringify({ planId: PLAN_ID, runKey }),
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
  return [cUpdateStatusIntent(
    context, parentStep, step, hookSequential,
    'completed',
    ok ? undefined : 'resumo com payload inesperado — os arquivos copiados estão no disco',
  )];
}
