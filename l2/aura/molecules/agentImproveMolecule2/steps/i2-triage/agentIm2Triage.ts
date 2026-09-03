/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2-triage/agentIm2Triage.ts" enhancement="_102027_/l2/enhancementAgent"/>

// i2-triage — THE routing decision. The first LLM call of this flow. See flow.json.
//
// It decides the route and nothing else: not how to fix, not which lines to change. The routes are
// planted by the root from this answer, so a wrong route is not corrected downstream — it is
// executed. That is why the prompt spends its length on one question (does the PUBLIC SURFACE
// change) and why the gate refuses only the mechanically impossible.
//
// The call is deliberately cheap in input: the .defs.ts plus a DERIVED surface summary, not the
// molecule's source. ml-data-table is 300+ lines and its surface is 20 — the other 280 cannot
// answer the routing question.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { isRecord, parseMaybeJson, toDisplayPath, writeJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { readJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
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
  ImRoute,
  ImTriage,
  ImUnreachable,
  imDoneAnchor,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import {
  imContextFileInfo,
  imTraceFileInfo,
  imTriageFileInfo,
  readGroupSkill,
  readImAgentText,
  sourceOf,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { contractFingerprint } from '/_102020_/l2/aura/molecules/shared/contractFingerprint.js';
import { capableOverridesOf } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.js';
import { getImRunKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import { readSurface, renderSurface } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';
import {
  ImTriageOutput,
  normalizeExpectedArtifacts,
  runImTriageGate,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2-triage/gate.js';

const AGENT_NAME = 'agentIm2Triage';
const PLAN_ID = 'i2-triage';
const TOOL_NAME = 'submitTriage';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${IM_AGENT_FOLDER}/steps/i2-triage`,
    agentDescription: 'i2-triage — decides which route handles the change request',
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

  const promptMd = await readImAgentText('steps/i2-triage', 'prompt', '.md', true);
  const schemaRaw = await readImAgentText('schemas', 'i2-triage.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid i2-triage schema`);

  const present = ctx.artifacts.filter(a => a.present).map(a => a.kind);
  // THE GROUP's usage contract — what the group OFFERS a consumer, which is exactly what the first
  // question asks: "does the contract already promise this?". The molecule's own .defs.ts can be silent
  // where the group is not, and the group's name is the one to use; without this the triage
  // reads a silence as "a new responsibility" when it is a defect. Read, never written.
  const groupUsage = await readGroupSkill(ctx.groupSkill.usageReference);

  const systemPrompt = promptMd
    .split('{{tag}}').join(ctx.target.tag)
    .split('{{groupCanonical}}').join(ctx.target.groupCanonical)
    .split('{{artifactsPresent}}').join(present.join(', ') || '(none)')
    .split('{{inheritance}}').join(renderInheritance(ctx))
    .split('{{groupUsage}}').join(groupUsage || '(the group usage contract could not be read — decide from the molecule\'s own contract)')
    .split('{{surface}}').join(renderSurface(readSurface(sourceOf(ctx.artifacts, 'ts'))))
    .split('{{defs}}').join(renderContract(ctx))
    .split('{{userPrompt}}').join(ctx.userPrompt)
    .split('{{userLanguage}}').join(ctx.userLanguage || 'the language of the request')
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the request cannot be routed from what is shown')}`;

  const humanPrompt = [
    `Route this request for ${ctx.target.tag}.`,
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit the routing decision', schema as Record<string, unknown>)],
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

  let output: ImTriageOutput | null = null;
  let extractError = '';
  try {
    const raw = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['route']);
    if (raw.status === 'failed') extractError = `model reported failure: ${raw.trace.join('; ') || 'no reason'}`;
    else output = normalizeOutput(raw.result);
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  const present = ctx.artifacts.filter(a => a.present).map(a => a.kind);
  const gate = output
    ? runImTriageGate({ output, isShell: ctx.inheritance.isShell, artifactsPresent: present })
    : { ok: false, errors: [`extract: ${extractError}`] };
  const errorText = gate.errors.join('\n');

  await writeJsonArtifact(imTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: gate.ok,
    // WHICH usage contract the runtime served — this is the first step of the pipeline to load one,
    // and `readGroupSkill` degrades a broken import to '' in silence (the gate then skips its
    // vocabulary check). `loaded: false` here is that failure, finally visible; the pair
    // chars/hash tells a later analysis whether the text was the published one.
    contract: contractTrace(ctx.groupSkill.usageReference, await readGroupSkill(ctx.groupSkill.usageReference)),
    ...(gate.ok ? {} : { error: errorText, output }),
  });

  if (gate.ok && output) {
    // Normalization happens AFTER the gate: the gate judges what the model said, the artifact
    // records what will be done. Folding groupIndex in earlier would hide the model's answer.
    const triage: ImTriage = {
      route: output.route as ImRoute,
      rationale: output.rationale.trim(),
      expectedArtifacts: normalizeExpectedArtifacts(output.expectedArtifacts) as ImArtifactKind[],
    };
    await writeJsonArtifact(imTriageFileInfo(runKey), {
      ...triage,
      definitionElements: output.definitionElements.filter(item => item.trim()),
      decidedAt: new Date().toISOString(),
    });

    const summary = `route ${triage.route}${triage.expectedArtifacts.length ? ` · ${triage.expectedArtifacts.join(', ')}` : ''}`;
    return [
      nmResultStepIntent(context, parentStep, {
        planId: imDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: summary,
        // The ROOT reads this result to plant the branch — flow.json.routes. Everything it needs
        // to choose is here, so it never has to open triage.json.
        result: {
          route: triage.route,
          rationale: triage.rationale,
          expectedArtifacts: triage.expectedArtifacts,
          definitionElements: output.definitionElements,
          triageFile: toDisplayPath(imTriageFileInfo(runKey)),
          runKey,
          attempt,
        },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${summary} — ${triage.rationale}`, 'input_output'),
    ];
  }

  if (attempt >= IM_MAX_ATTEMPTS) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${PLAN_ID} failed after ${attempt} attempts:\n${errorText}`)];
  }

  // Bounded retry: the OPEN retry step comes first, then complete-with-trace (never 'failed' with
  // a retry in flight — skills/collab_messages.md).
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

async function readContext(runKey: string): Promise<ImContext> {
  const ctx = await readJsonArtifact<ImContext>(imContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  return ctx;
}

/** Everything is defaulted here so the gate reads one shape; the gate is what rejects. */
function normalizeOutput(result: Record<string, unknown>): ImTriageOutput {
  const list = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  return {
    route: String(result.route || '').trim().toUpperCase(),
    rationale: String(result.rationale || ''),
    expectedArtifacts: list(result.expectedArtifacts),
    definitionElements: list(result.definitionElements),
  };
}

/**
 * The contract that governs the molecule — its own, or its parent's when it is a shell without one.
 * Saying WHICH matters: a shell's contract describes the parent, so "the contract promises X" is
 * still the right test, but the reader must know it is not this file that promises it.
 */
// WHICH usage contract the runtime served. This step is the first of the pipeline to load one, and
// `readGroupSkill` degrades a broken import to '' in SILENCE (the gate then skips its vocabulary
// check) — `loaded: false` here is that failure, finally visible. The chars/hash pair tells a later
// analysis whether the text was the published one — the same pair, computed over the working copy of
// the contract, is what it compares against.
//
// Re-reading here instead of threading the text from `beforePromptStep` is free: `await import`
// caches by specifier, so the second call returns the very same module.
function contractTrace(reference: string, text: string): Record<string, unknown> {
  return { reference, kind: 'usage', loaded: !!text, ...contractFingerprint(text) };
}

function renderContract(ctx: ImContext): string {
  if (!ctx.contract.source.trim()) return '(the contract could not be read — decide from the code alone, and say so in the rationale)';
  if (!ctx.contract.inherited) return ctx.contract.source;
  return [
    `⚠️ This molecule is a shell and has no contract of its own. What follows is the contract of its`,
    `PARENT, \`${ctx.contract.reference}\` — it is what the molecule promises, because a shell changes`,
    `appearance and not promises.`,
    '',
    ctx.contract.source,
  ].join('\n');
}

/**
 * The inheritance block of the prompt. When the molecule is not a shell the section still exists
 * and says so: route C has to be visibly unavailable, not merely unmentioned.
 *
 * ⚠️ THE UNREACHABLE LIST IS THE EVIDENCE FOR THE THIRD QUESTION (2026-08-14). Until then this block
 * showed only what the shell COULD override, so "the code lives in the parent, out of reach" — the
 * whole of route C — had to be inferred from a short list with no explanation for why it was short.
 * That is the same silent filter that made i4-inherit suggest a teardown hook for a timer duration on
 * 2026-08-13, one step later and with the same cause. Measured, not judged: the model is not being
 * asked to guess what it cannot see.
 */
function renderInheritance(ctx: ImContext): string {
  const inh = ctx.inheritance;
  if (!inh.isShell) {
    return '### Inheritance\n\nThis molecule is **not a shell** — it does not extend a molecule from another project. Route C is not available for it.';
  }
  // Filtered to what could carry a change, same as i4-inherit: a member that compiles as an override
  // and cannot do anything is not an argument for route B.
  const capable = capableOverridesOf(inh.overridableMembers);
  const members = !inh.overridableMembers.length
    ? '- (the parent source is not readable from here)'
    : capable.length
      ? capable.slice(0, 12).map(m => `- \`${m.name}\` (${m.kind})`).join('\n')
      : '- **NONE** — every member the parent exposes composes private ones, so no override in this shell could carry a change';
  const own = inh.ownMembers.length ? inh.ownMembers.join(', ') : 'nothing — the body is empty';
  return [
    '### Inheritance',
    '',
    `This molecule is a **shell**: \`${inh.parentClassName}\` from \`${inh.parentReference}\` (project ${inh.parentProject}).`,
    `It overrides: ${own}.`,
    '',
    'Members of the parent it could override, cheapest first:',
    members,
    '',
    'Members of the parent NO subclass can reach — if what has to change is one of these, the fix is not in this file:',
    renderUnreachable(inh.unreachableMembers),
  ].join('\n');
}

/** Capped: on a molecule with an i18n block the list runs long, and the first names are the ones the request is about. */
function renderUnreachable(members: ImUnreachable[] | undefined): string {
  const list = members || [];
  if (!list.length) return '- (none detected — every member of the parent is reachable, or its source could not be read)';
  const shown = list.slice(0, 12).map(m => m.why === 'private'
    ? `- \`${m.name}\` — private`
    : `- \`${m.name}\` — module-scope constant, not a class member`);
  if (list.length > shown.length) shown.push(`- (and ${list.length - shown.length} more)`);
  return shown.join('\n');
}
