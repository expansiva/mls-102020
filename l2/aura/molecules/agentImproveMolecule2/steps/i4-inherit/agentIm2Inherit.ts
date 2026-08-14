/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/agentIm2Inherit.ts" enhancement="_102027_/l2/enhancementAgent"/>

// i4-inherit — ROUTE C ONLY. The second clarification, and it is not the defs one.
//
// Shape borrowed from n2-plan: a reasoning call whose answer IS a { type: 'clarification', json }
// payload; afterPromptStep gates that suggestion and returns [] so the payload — and therefore the
// widget — stays mounted; beforeClarificationStep mounts the widget; Confirm re-gates what the
// HUMAN chose, because that is what gets written.
//
// THE DECISION THAT DEFINES THIS STEP: 'parent' is a valid answer and is NOT executable. The user
// is allowed to conclude the base molecule is wrong, and this agent still will not touch it
// (flow.json.principles, "NEVER touch the parent"). The run ends with the instruction and writes
// nothing — the i4-done anchor IS emitted, carrying where:'parent', and i3-edit completes as a
// declared no-op. See the ⚠️ at applyChoice: "no anchor" was the 2026-08-10 defect that hung the run.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  parseMaybeJson,
  readJsonArtifact,
  toDisplayPath,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import {
  nmAgentStepIntent,
  nmAnswerResultIntent,
  nmApplyIntentsAndRefresh,
  nmCheckClarificationPayload,
  nmClarificationPromptReady,
  nmFindMutableParent,
  nmParseStepArgs,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  IM_AGENT_FOLDER,
  IM_MAX_ATTEMPTS,
  ImContext,
  ImInheritChoice,
  ImTriage,
  ImUnreachable,
  imDoneAnchor,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import {
  artifactOf,
  imContextFileInfo,
  imTraceFileInfo,
  imTriageFileInfo,
  imWorkFile,
  readImAgentText,
  sourceOf,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { IM_LIFECYCLE_HOOKS } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.js';
import { getImRunKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import { readSurface, renderSurface } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';
import { ImInheritAnswer, runImInheritGate } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/gate.js';
import type {
  InheritChoiceResult,
  InheritChoiceValue,
  InheritWhere,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/widgetInheritChoiceLogic.js';

const AGENT_NAME = 'agentIm2Inherit';
const PLAN_ID = 'i4-inherit';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${IM_AGENT_FOLDER}/steps/i4-inherit`,
    agentDescription: 'i4-inherit — asks the human where a fix goes on an inherited shell',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
    beforeClarificationStep,
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
  const { ctx, triage } = await readRun(runKey);

  const promptMd = await readImAgentText('steps/i4-inherit', 'prompt', '.md', true);

  const inh = ctx.inheritance;
  const members = inh.overridableMembers.length
    ? inh.overridableMembers.map(m => `- \`${m.name}\` (${m.kind}${IM_LIFECYCLE_HOOKS.includes(m.name) ? ', lifecycle hook — it runs around the parent\'s behaviour, it is not where the behaviour is implemented' : ''})`).join('\n')
    : '- (the parent source is not readable from here — you may still name a member, but you cannot verify it exists)';
  const unreachable = renderUnreachable(inh.unreachableMembers);

  const systemPrompt = promptMd
    .split('{{tag}}').join(ctx.target.tag)
    .split('{{parentClassName}}').join(inh.parentClassName || '(unknown)')
    .split('{{parentReference}}').join(inh.parentReference || '(unknown)')
    .split('{{hasLess}}').join(hasLess(ctx) ? 'yes' : 'no — choosing `less` makes the agent create one')
    .split('{{ownMembers}}').join(inh.ownMembers.length ? inh.ownMembers.join(', ') : 'none — the body is empty')
    .split('{{overridableMembers}}').join(members)
    .split('{{unreachableMembers}}').join(unreachable)
    .split('{{surface}}').join(renderSurface(readSurface(sourceOf(ctx.artifacts, 'ts'))))
    .split('{{userPrompt}}').join(ctx.userPrompt)
    .split('{{triage}}').join(triage.rationale)
    .split('{{userLanguage}}').join(ctx.userLanguage || 'the language of the request');

  const humanPrompt = [
    `Suggest where the fix for ${ctx.target.tag} goes.`,
    parsedArgs.retryContext ? `## What the gate rejected — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  // NO TOOL CALL. The answer must be a { type: 'clarification', json } envelope — that payload is
  // what the framework renders the checkpoint from, and a tool result would leave the widget
  // unmounted. Same mechanism as n2-plan.
  return [nmClarificationPromptReady(context, parentStep, hookSequential, {
    planId: PLAN_ID,
    stepArgs: args || step.prompt || JSON.stringify({ planId: PLAN_ID, runKey }),
    systemPrompt,
    humanPrompt,
  })];
}

/**
 * Gates the SUGGESTION and, on success, returns [] — the payload stays mounted and the widget
 * takes over. A bad suggestion is cheap to retry and expensive to show: pre-selected, it is the
 * one a hurried user clicks through.
 */
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
  const { ctx } = await readRun(runKey);

  const envelopeError = nmCheckClarificationPayload(step.interaction?.payload?.[0], PLAN_ID);
  const answer = envelopeError ? null : readSuggestion(step.interaction?.payload?.[0]);

  const gate = answer
    ? runImInheritGate({
      answer,
      isShell: ctx.inheritance.isShell,
      overridableMembers: ctx.inheritance.overridableMembers,
      unreachableMembers: ctx.inheritance.unreachableMembers,
      hasLess: hasLess(ctx),
      fromModel: true,
    })
    : { ok: false, errors: [`payload: ${envelopeError || 'the clarification json could not be read'}`] };
  const errorText = gate.errors.join('\n');

  await writeJsonArtifact(imTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: gate.ok,
    ...(gate.ok ? { suggestion: answer } : { error: errorText, suggestion: answer }),
  });

  // The suggestion is kept on disk so beforeClarificationStep can rebuild the widget value from
  // DISK rather than trusting the mounted payload — same reason n2-plan does it.
  if (gate.ok && answer) {
    await writeJsonArtifact(imWorkFile(runKey, 'inherit-suggestion'), { ...answer, savedAt: new Date().toISOString() });
    return [];
  }

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

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const planId = readPlanId(json);
  if (planId !== PLAN_ID) throw new Error(`[${AGENT_NAME}] unsupported clarification ${planId || '(missing)'}`);

  const runKey = getImRunKey(context);
  const { ctx } = await readRun(runKey);
  const suggestion = await readJsonArtifact<ImInheritAnswer>(imWorkFile(runKey, 'inherit-suggestion'), false);
  const inh = ctx.inheritance;

  await import('/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/widgetInheritChoice.js');
  const el = document.createElement('widget-inherit-choice-102020');
  const value: InheritChoiceValue = {
    planId: PLAN_ID,
    title: suggestion?.title || '',
    userLanguage: ctx.userLanguage,
    tag: ctx.target.tag,
    parentClassName: inh.parentClassName || '',
    parentReference: inh.parentReference || '',
    ownMembers: inh.ownMembers,
    overridableMembers: inh.overridableMembers,
    unreachableMembers: inh.unreachableMembers || [],
    hasLess: hasLess(ctx),
    suggested: {
      where: ((suggestion?.where || 'less') as InheritWhere),
      member: suggestion?.member || '',
    },
    suggestionReason: suggestion?.reason || '',
  };
  (el as unknown as { value: InheritChoiceValue }).value = value;
  el.addEventListener('clarification-finish', (event: Event) => {
    const detail = (event as CustomEvent<{ value: InheritChoiceResult; action: 'continue' | 'cancel' }>).detail;
    void applyChoice(context, parentStep, step, hookSequential, ctx, detail.value, detail.action)
      .catch(error => console.error(`[${AGENT_NAME}] ${error instanceof Error ? error.message : String(error)}`));
  });
  return el;
}

async function applyChoice(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  ctx: ImContext,
  confirmed: InheritChoiceResult | undefined,
  action: 'continue' | 'cancel',
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const mutationParent = nmFindMutableParent(context, parentStep);
  const pt = (ctx.userLanguage || '').startsWith('pt');

  if (action !== 'continue' || !confirmed) {
    await nmApplyIntentsAndRefresh(context, [
      nmUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed',
        pt ? 'cancelado pelo usuário — nada foi alterado' : 'cancelled by the user — nothing was changed'),
    ], false);
    return;
  }

  // The human could pick anything the widget allowed, so the gate runs AGAIN on what they
  // confirmed: the widget blocks the obvious cases, and this is what gets written.
  const gate = runImInheritGate({
    answer: { where: confirmed.where, member: confirmed.member },
    isShell: ctx.inheritance.isShell,
    overridableMembers: ctx.inheritance.overridableMembers,
    unreachableMembers: ctx.inheritance.unreachableMembers,
    hasLess: hasLess(ctx),
    fromModel: false,
  });
  if (!gate.ok) {
    await nmApplyIntentsAndRefresh(context, [
      nmUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `the confirmed choice is not valid:\n${gate.errors.join('\n')}`),
    ], false);
    return;
  }

  // 'parent' IS A LEGITIMATE OUTCOME, and it must not look like a failure.
  //
  // ⚠️ THE 2026-08-10 DEFECT: the first version emitted no anchor at all — "no i4-done, so i3-edit
  // never starts" — and passed resume:false. The step went green and the run HUNG: i3/i5/i6/i7 were
  // already planted by the router and sat on an anchor that would never land. From the user's side,
  // Confirm did nothing.
  //
  // So the anchor IS emitted, carrying where:'parent'. i3-edit reads it and completes as a declared
  // no-op without calling a model, i5 and i6 no-op after it, and i7 closes with the instruction and
  // the coherence report. Nothing is written to any file, and the run ENDS — which is what "the fix
  // belongs to the base" means.
  const choice: ImInheritChoice = {
    where: confirmed.where,
    ...(confirmed.member ? { member: confirmed.member } : {}),
  };
  await writeJsonArtifact(imWorkFile(ctx.runKey, 'inherit'), { ...choice, confirmedAt: new Date().toISOString() });

  const reference = ctx.inheritance.parentReference || '(the base molecule)';
  const summary = choice.where === 'less'
    ? (pt ? 'a correção vai no .less da casca' : 'the fix goes in the shell\'s .less')
    : choice.where === 'override'
      ? (pt ? `sobrescrever \`${choice.member}\` na casca` : `override \`${choice.member}\` in the shell`)
      : (pt
        ? `a correção é do componente base — nada será alterado aqui. Abra o pedido em: ${reference}`
        : `the fix belongs to the base component — nothing will be changed here. Open the request at: ${reference}`);

  // Intent order matters: the completed answer result (the 'i4-done' anchor i3-edit depends on)
  // lands BEFORE the update-status that closes this step.
  await nmApplyIntentsAndRefresh(context, [
    nmAnswerResultIntent(context, mutationParent, {
      planId: imDoneAnchor(PLAN_ID),
      stepTitle: summary,
      result: { ...choice, inheritFile: toDisplayPath(imWorkFile(ctx.runKey, 'inherit')), runKey: ctx.runKey },
    }),
    nmUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
  ], true);
}

// ---- helpers ----

async function readRun(runKey: string): Promise<{ ctx: ImContext; triage: ImTriage }> {
  const ctx = await readJsonArtifact<ImContext>(imContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  const triage = await readJsonArtifact<ImTriage>(imTriageFileInfo(runKey), true);
  if (!triage) throw new Error(`[${AGENT_NAME}] triage.json missing for ${runKey}`);
  return { ctx, triage };
}

function hasLess(ctx: ImContext): boolean {
  return !!artifactOf(ctx.artifacts, 'less')?.present;
}

/**
 * What the shell cannot reach, for the prompt. Capped: on a molecule with an i18n block this list runs
 * long, and the first names are the ones the request is about.
 */
function renderUnreachable(members: ImUnreachable[] | undefined): string {
  const list = members || [];
  if (!list.length) return '- (none detected — every member of the parent is reachable, or its source could not be read)';
  const shown = list.slice(0, 12).map(m => m.why === 'private'
    ? `- \`${m.name}\` — private: an override does not compile`
    : `- \`${m.name}\` — module-scope constant: not a class member, no subclass can change it`);
  if (list.length > shown.length) shown.push(`- (and ${list.length - shown.length} more)`);
  return shown.join('\n');
}

/** The suggestion out of the clarification envelope. Everything is defaulted; the gate rejects. */
function readSuggestion(payload: unknown): ImInheritAnswer | null {
  const parsed = parseMaybeJson(payload);
  const outer = isRecord(parsed) && parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
  if (!isRecord(outer)) return null;
  const json = parseMaybeJson(outer.json);
  if (!isRecord(json)) return null;
  return {
    where: String(json.where || '').trim(),
    member: typeof json.member === 'string' ? json.member : '',
    reason: typeof json.reason === 'string' ? json.reason : '',
    title: typeof json.title === 'string' ? json.title : '',
  };
}

function readPlanId(json: unknown): string {
  const parsed = parseMaybeJson(json);
  return isRecord(parsed) && typeof parsed.planId === 'string' ? parsed.planId : '';
}
