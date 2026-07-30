/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n8-summary/agentNm2Summary.ts" enhancement="_102027_/l2/enhancementAgent"/>

// n8-summary — cheap final summary in the user's language. See flow.json.
//
// It reports what was created AND what was not: n6-demo and n7-index are allowed to fail with
// ok:false, so their anchors' result payloads are read here. A missing playground page or a stale
// group index is stated plainly rather than silently absent.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  NM_AGENT_FOLDER,
  isRecord,
  nmContextFileInfo,
  nmDefsFile,
  nmFileExists,
  nmGroupIndexFile,
  nmHtmlFile,
  nmLessFile,
  nmPlanFileInfo,
  nmTsFile,
  parseMaybeJson,
  readJsonArtifact,
  readNmAgentText,
  toDisplayPath,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { nmParseStepArgs, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { getNmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.js';

const AGENT_NAME = 'agentNm2Summary';
const PLAN_ID = 'n8-summary';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NM_AGENT_FOLDER}/steps/n8-summary`,
    agentDescription: 'n8-summary — final human summary of the New Molecule 2 pipeline',
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
  const ctx = await readJsonArtifact<MoleculeContext>(nmContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  const plan = await readJsonArtifact<MoleculePlan>(nmPlanFileInfo(runKey), true);
  if (!plan) throw new Error(`[${AGENT_NAME}] plan.json missing for ${runKey}`);

  // Both the anchor payload and the file on disk are consulted: the anchor says what the step
  // decided, the file says what is actually there.
  const demoOk = anchorOk(context, 'n6-done') && nmFileExists(nmHtmlFile(plan.group, plan.shortName));
  const indexOk = anchorOk(context, 'n7-done') && nmFileExists(nmGroupIndexFile(plan.group, '.ts'));

  const files = [
    toDisplayPath(nmDefsFile(plan.group, plan.shortName)),
    toDisplayPath(nmTsFile(plan.group, plan.shortName)),
    toDisplayPath(nmLessFile(plan.group, plan.shortName)),
    ...(demoOk ? [toDisplayPath(nmHtmlFile(plan.group, plan.shortName))] : []),
    ...(indexOk ? [toDisplayPath(nmGroupIndexFile(plan.group, '.ts'))] : []),
  ];

  const themed = ctx.theme.present && !!ctx.theme.info;
  const promptMd = await readNmAgentText('steps/n8-summary', 'prompt', '.md', true);
  const systemPrompt = promptMd
    .split('{{userLanguage}}').join(ctx.userLanguage)
    .split('{{themeName}}').join(themed ? (ctx.theme.info?.displayName || ctx.theme.info?.name || '') : 'no theme')
    .split('{{themed}}').join(themed ? 'YES' : 'no')
    .split('{{demoFailed}}').join(demoOk ? 'no' : 'YES')
    .split('{{indexFailed}}').join(indexOk ? 'no' : 'YES');

  const humanPrompt = JSON.stringify({
    moleculeTag: plan.tag,
    group: plan.groupCanonical,
    description: plan.description,
    theme: themed ? ctx.theme.info?.displayName || ctx.theme.info?.name : null,
    filesWritten: files,
    demoOk,
    indexOk,
  }, null, 2);

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
  return [nmUpdateStatusIntent(
    context, parentStep, step, hookSequential,
    'completed',
    ok ? undefined : 'summary payload unexpected — the pipeline artifacts are on disk',
  )];
}

// A done anchor carries `ok:false` when its step gave up without blocking the pipeline.
function anchorOk(context: mls.msg.ExecutionContext, planId: string): boolean {
  if (!context.task) return false;
  const anchor = getAllSteps(context.task.iaCompressed?.nextSteps)
    .find(item => item.planning?.planId === planId);
  if (!anchor) return false;
  const result = parseMaybeJson((anchor as mls.msg.AIResultStep).result);
  if (!isRecord(result)) return true; // no structured verdict: trust the file check
  return result.ok !== false;
}
