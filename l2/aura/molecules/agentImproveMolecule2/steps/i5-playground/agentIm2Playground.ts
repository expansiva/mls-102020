/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i5-playground/agentIm2Playground.ts" enhancement="_102027_/l2/enhancementAgent"/>

// i5-playground — brings the playground page up to date, and ONLY when it is stale.
//
// The decision is deterministic and it is the whole point of the step: the playground demonstrates
// the molecule's public surface, so it goes stale exactly when that surface moves. A `.less` edit
// leaves it correct. That is the common improve run, and it must not cost an LLM call — so
// beforePromptStep skips the model entirely and the step completes as a declared no-op.
//
// When the surface DID move, the LLM is spent on one thing: writing the examples for what is new.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeJsonArtifact,
  writeStorTextAtomic,
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
  artifactOf,
  imContextFileInfo,
  imFileInfoFor,
  imTraceFileInfo,
  imWorkFile,
  readImAgentText,
  sourceOf,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { getImRunKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import {
  ImSurfaceDiff,
  diffSurface,
  readSurface,
  renderSurface,
  renderSurfaceDiff,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';
import { ImEdit, ImFileState, applyEdits } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/applyEdits.js';
import { runImPlaygroundGate } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i5-playground/gate.js';

const AGENT_NAME = 'agentIm2Playground';
const PLAN_ID = 'i5-playground';
const TOOL_NAME = 'submitPlaygroundEdits';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${IM_AGENT_FOLDER}/steps/i5-playground`,
    agentDescription: 'i5-playground — updates the playground page when the public surface moved',
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
  const { diff } = await measure(ctx);

  // THE NO-OP BRANCH. No prompt is emitted at all: the step ends here, having decided in code that
  // there is nothing for a model to do. i6-index reads playgroundChanged=false and follows.
  if (!diff.changed) {
    const summary = 'playground unchanged — the public surface did not move';
    return [
      nmResultStepIntent(context, parentStep, {
        planId: imDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: summary,
        result: { playgroundChanged: false, runKey, reason: 'surface unchanged' },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
    ];
  }

  const promptMd = await readImAgentText('steps/i5-playground', 'prompt', '.md', true);
  const schemaRaw = await readImAgentText('schemas', 'i5-playground.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid i5-playground schema`);

  const page = await currentPage(ctx);
  const systemPrompt = promptMd
    .split('{{tag}}').join(ctx.target.tag)
    .split('{{groupCanonical}}').join(ctx.target.groupCanonical)
    .split('{{userLanguage}}').join(ctx.userLanguage || 'the language of the request')
    .split('{{surfaceDiff}}').join(renderSurfaceDiff(diff))
    .split('{{surface}}').join(renderSurface(readSurface(await currentTs(ctx))))
    .split('{{page}}').join(
      page
        ? `----- FILE: html (${artifactOf(ctx.artifacts, 'html')?.reference}) -----\n${page}\n----- END FILE -----`
        : '----- THE PAGE DOES NOT EXIST YET — use op "create" and write the whole fragment -----',
    )
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the playground cannot be updated from what is shown')}`;

  const humanPrompt = [
    `Update the playground of ${ctx.target.tag}.`,
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit the playground edits', schema as Record<string, unknown>)],
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
  const { diff } = await measure(ctx);

  const before = await currentPage(ctx);
  const artifact = artifactOf(ctx.artifacts, 'html');

  let edits: ImEdit[] = [];
  let extractError = '';
  try {
    const raw = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['edits']);
    if (raw.status === 'failed') extractError = `model reported failure: ${raw.trace.join('; ') || 'no reason'}`;
    else edits = normalizeEdits(raw.result.edits);
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  const files = new Map<ImArtifactKind, ImFileState>([['html', { present: !!before, source: before }]]);
  const apply = extractError
    ? { changed: new Map<ImArtifactKind, string>(), errors: [`extract: ${extractError}`], applied: [] as string[] }
    : applyEdits(files, edits);

  const after = apply.changed.get('html') || '';
  const gate = apply.errors.length
    ? { ok: false, errors: apply.errors }
    : runImPlaygroundGate({
      shouldChange: diff.changed,
      playgroundChanged: !!after,
      before,
      after,
      tag: ctx.target.tag,
      diff,
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
    // Nothing was written yet — applyEdits is pure and the write happens only past the gate. The
    // page on disk is untouched, so the retry's `find` strings still describe reality.
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

  await writeStorTextAtomic(imFileInfoFor(ctx, 'html'), after, !artifact?.present);
  await writeJsonArtifact(imWorkFile(runKey, 'playground'), {
    savedAt: new Date().toISOString(),
    playgroundChanged: true,
    addedSlots: diff.addedSlots,
    why: edits.map(e => e.why.trim()).filter(Boolean),
    attempt,
  });

  const summary = `playground updated${diff.addedSlots.length ? ` · slots ${diff.addedSlots.join(', ')}` : ''}`;
  return [
    nmResultStepIntent(context, parentStep, {
      planId: imDoneAnchor(PLAN_ID),
      dependsOn: [],
      // i6-index depends on this flag. It is the rule of 2026-08-05, carried as data.
      stepTitle: summary,
      result: { playgroundChanged: true, addedSlots: diff.addedSlots, runKey, attempt },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
  ];
}

// ---- helpers ----

async function readContext(runKey: string): Promise<ImContext> {
  const ctx = await readJsonArtifact<ImContext>(imContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  return ctx;
}

/** The .ts as it is NOW — i3 has already written to it; context.json holds the pre-edit snapshot. */
async function currentTs(ctx: ImContext): Promise<string> {
  return readStorText(imFileInfoFor(ctx, 'ts'), false);
}

async function currentPage(ctx: ImContext): Promise<string> {
  const artifact = artifactOf(ctx.artifacts, 'html');
  if (!artifact?.present) return '';
  return readStorText(imFileInfoFor(ctx, 'html'), false);
}

/**
 * The staleness decision, in code.
 *
 * `context.json` is the snapshot i1 took BEFORE the edit; the disk holds what i3 wrote. Comparing
 * the two surfaces is the whole test, and it is why context.json keeps the original sources
 * instead of being refreshed as the run goes.
 */
async function measure(ctx: ImContext): Promise<{ diff: ImSurfaceDiff }> {
  const before = readSurface(sourceOf(ctx.artifacts, 'ts'));
  const after = readSurface(await currentTs(ctx));
  return { diff: diffSurface(before, after) };
}

function normalizeEdits(raw: unknown): ImEdit[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map(item => ({
    artifact: 'html' as ImArtifactKind,
    op: (String(item.op || 'replace') as ImEdit['op']),
    find: typeof item.find === 'string' ? item.find : undefined,
    content: typeof item.content === 'string' ? item.content : '',
    why: typeof item.why === 'string' ? item.why : '',
  }));
}
