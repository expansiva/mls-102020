/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/agentIm2Index.ts" enhancement="_102027_/l2/enhancementAgent"/>

// i6-index — keeps the group index page in step with the playground.
//
// THE RULE: playgroundChanged => the index is updated. Not conditional on judgement
// (flow.json.conventions.playgroundThenIndex). On 2026-08-05 the playground of
// ml-lazy-record-detail-table was fixed and the group page kept showing an empty detail area.
//
// ⚠️ flow.json declared this step DETERMINISTIC and that was wrong; building it is what showed it.
// The import line is derivable and code writes it. The showcase card is not: a group index is a
// hand-written Lit page (groupviewtable/index.ts is 782 lines of per-molecule cards with real
// sample data), and fitting a new slot into an existing card is authoring, not derivation. So the
// model is called ONLY when a card has to change — and never when the import was the whole gap.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import {
  buildVToolInstruction,
  createVToolSchema,
  extractVToolOutput,
  nmAgentStepIntent,
  nmParseStepArgs,
  nmResultStepIntent,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  IM_AGENT_FOLDER,
  IM_MAX_ATTEMPTS,
  ImArtifactKind,
  ImContext,
  imDoneAnchor,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import {
  imContextFileInfo,
  imFileInfoFor,
  imTraceFileInfo,
  imWorkFile,
  readImAgentText,
  writeImSource,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { getImRunKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import { ImEdit, ImFileState, applyEdits } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/applyEdits.js';
import { runImIndexGate } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/gate.js';
import {
  ImIndexPlan,
  insertImport,
  lastMoleculeImport,
  planIndexWork,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/indexPlan.js';

const AGENT_NAME = 'agentIm2Index';
const PLAN_ID = 'i6-index';
const TOOL_NAME = 'submitIndexEdits';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${IM_AGENT_FOLDER}/steps/i6-index`,
    agentDescription: 'i6-index — keeps the group index page in step with the playground',
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
  const runKey = getImRunKey(context, parsedArgs.runKey);
  const ctx = await readContext(runKey);
  const { playgroundChanged, addedSlots } = await readPlaygroundResult(runKey);

  const before = await readStorText(imFileInfoFor(ctx, 'groupIndex'), false);
  const plan = planIndexWork({
    indexSource: before,
    project: ctx.target.project,
    groupFolder: ctx.target.groupFolder,
    shortName: ctx.target.shortName,
    tag: ctx.target.tag,
    addedSlots,
    playgroundChanged,
  });

  // THE DETERMINISTIC BRANCHES. Both end the step without a prompt: nothing to do, or something a
  // model would only be able to do worse than a template.
  if (plan.noop) {
    return done(context, parentStep, step, hookSequential, runKey, false, 'index unchanged — the playground did not change');
  }
  if (!plan.needsModel) {
    const after = plan.missingImport
      ? insertImport(before, plan.missingImport, lastMoleculeImport(before, ctx.target.project, ctx.target.groupFolder))
      : before;
    const gate = runImIndexGate({
      playgroundChanged, indexUpdated: after !== before, before, after,
      project: ctx.target.project, groupFolder: ctx.target.groupFolder,
      shortName: ctx.target.shortName, tag: ctx.target.tag, addedSlots,
    });
    if (!gate.ok) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', gate.errors.join('\n'))];
    }
    if (after !== before) await writeImSource(imFileInfoFor(ctx, 'groupIndex'), after);
    return done(
      context, parentStep, step, hookSequential, runKey, after !== before,
      after !== before ? 'index updated — import added' : 'index already in step',
    );
  }

  const promptMd = await readImAgentText('steps/i6-index', 'prompt', '.md', true);
  const schemaRaw = await readImAgentText('schemas', 'i6-index.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid i6-index schema`);

  // The import, if it was missing, is written BEFORE the model is called — so the page the model
  // reads is the page it will be editing, and it never has to think about imports at all.
  let current = before;
  if (plan.missingImport) {
    current = insertImport(before, plan.missingImport, lastMoleculeImport(before, ctx.target.project, ctx.target.groupFolder));
    await writeImSource(imFileInfoFor(ctx, 'groupIndex'), current);
  }

  const systemPrompt = promptMd
    .split('{{tag}}').join(ctx.target.tag)
    .split('{{userLanguage}}').join(ctx.userLanguage || 'the language of the request')
    .split('{{work}}').join(renderWork(plan))
    .split('{{index}}').join(`----- FILE: index -----\n${current}\n----- END FILE -----`)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the showcase card cannot be updated from what is shown')}`;

  const humanPrompt = [
    `Update the ${ctx.target.tag} card of the ${ctx.target.groupCanonical} index.`,
    parsedArgs.retryContext ? `## What the gate rejected — fix ALL of these, and re-copy every \`find\` from the page above\n${parsedArgs.retryContext}` : '',
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit the group index edits', schema as Record<string, unknown>)],
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
  const runKey = getImRunKey(context, parsedArgs.runKey);
  const ctx = await readContext(runKey);
  const { playgroundChanged, addedSlots } = await readPlaygroundResult(runKey);

  // What is on disk now: the original plus the import this step may already have written.
  const before = await readStorText(imFileInfoFor(ctx, 'groupIndex'), false);

  let edits: ImEdit[] = [];
  let extractError = '';
  try {
    const raw = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['edits']);
    if (raw.status === 'failed') extractError = `model reported failure: ${raw.trace.join('; ') || 'no reason'}`;
    else edits = normalizeEdits(raw.result.edits);
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  const files = new Map<ImArtifactKind, ImFileState>([['groupIndex', { present: true, source: before }]]);
  const apply = extractError
    ? { changed: new Map<ImArtifactKind, string>(), errors: [`extract: ${extractError}`], applied: [] as string[] }
    : applyEdits(files, edits);
  const after = apply.changed.get('groupIndex') || before;

  const gate = apply.errors.length
    ? { ok: false, errors: apply.errors }
    : runImIndexGate({
      playgroundChanged, indexUpdated: after !== before, before, after,
      project: ctx.target.project, groupFolder: ctx.target.groupFolder,
      shortName: ctx.target.shortName, tag: ctx.target.tag, addedSlots,
    });
  const errorText = gate.errors.join('\n');

  await writeJsonArtifact(imTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: gate.ok,
    ...(gate.ok ? {} : { error: errorText, edits }),
  });

  if (!gate.ok) {
    // Nothing written: applyEdits is pure and the write is past the gate. The import, if it was
    // added, stays — it is derivable, correct on its own, and the retry reads the page with it.
    if (attempt >= IM_MAX_ATTEMPTS) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${PLAN_ID} failed after ${attempt} attempts:\n${errorText}`)];
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

  await writeImSource(imFileInfoFor(ctx, 'groupIndex'), after);
  await writeJsonArtifact(imWorkFile(runKey, 'index'), {
    savedAt: new Date().toISOString(),
    indexUpdated: true,
    addedSlots,
    why: edits.map(e => e.why.trim()).filter(Boolean),
    attempt,
  });

  return done(context, parentStep, step, hookSequential, runKey, true, `index updated · slots ${addedSlots.join(', ')}`);
}

// ---- helpers ----

async function readContext(runKey: string): Promise<ImContext> {
  const ctx = await readJsonArtifact<ImContext>(imContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  return ctx;
}

/**
 * i5's decision, read from its artifact rather than recomputed. Recomputing would let the two
 * steps disagree, and their disagreement IS the 2026-08-05 defect.
 */
async function readPlaygroundResult(runKey: string): Promise<{ playgroundChanged: boolean; addedSlots: string[] }> {
  const saved = await readJsonArtifact<{ playgroundChanged?: boolean; addedSlots?: string[] }>(imWorkFile(runKey, 'playground'), false);
  return {
    playgroundChanged: saved?.playgroundChanged === true,
    addedSlots: Array.isArray(saved?.addedSlots) ? saved!.addedSlots! : [],
  };
}

function renderWork(plan: ImIndexPlan): string {
  const lines = plan.missingSlots.map(slot => `- add content for the slot \`${slot}\` to this molecule's card`);
  if (plan.duplicateImport) lines.push('- (note: the molecule is imported more than once in this page — leave it, it is reported separately)');
  return lines.join('\n');
}

function normalizeEdits(raw: unknown): ImEdit[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map(item => ({
    artifact: 'groupIndex' as ImArtifactKind,
    op: (String(item.op || 'replace') as ImEdit['op']),
    find: typeof item.find === 'string' ? item.find : undefined,
    content: typeof item.content === 'string' ? item.content : '',
    why: typeof item.why === 'string' ? item.why : '',
  }));
}

function done(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  runKey: string,
  indexUpdated: boolean,
  summary: string,
): mls.msg.AgentIntent[] {
  return [
    nmResultStepIntent(context, parentStep, {
      planId: imDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: summary,
      result: { indexUpdated, runKey },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
  ];
}
