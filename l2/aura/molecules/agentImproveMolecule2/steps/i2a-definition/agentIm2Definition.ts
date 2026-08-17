/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/agentIm2Definition.ts" enhancement="_102027_/l2/enhancementAgent"/>

// i2a-definition — ROUTE A ONLY. The checkpoint where a molecule's PROMISE changes.
//
// Shape borrowed from i4-inherit, which borrowed it from n2-plan: a reasoning call whose answer IS a
// { type: 'clarification', json } payload; afterPromptStep gates the proposal and returns [] so the
// widget stays mounted; Confirm re-gates what the HUMAN chose, because that is what runs.
//
// ⚠️ WHY ROUTE A IS AN EDIT AND NOT A REBUILD (decision of 2026-08-14, and it replaced the
// i2a-rebuild-handoff this step is named after). The first design handed the run to
// agentNewMolecule2 from n2-plan onward. That meant n3-defs, n4-render and n5-less regenerating a
// molecule whose contract was approved and whose implementation works — to add one slot. It also
// created a problem that had blocked the route since 2026-08-06: NM2's gate refuses to overwrite an
// existing molecule, and route A hands off on a molecule that exists by definition.
//
// Editing in place removes both. i3-edit already writes `.defs.ts` and `.ts`; i5-playground already
// regenerates the playground when the surface moves; i6-index already follows. What was missing was
// only this: a human saying "yes, it will start promising that". NM2 is not involved, and the
// collision gate never comes up.
//
// ⚠️ CAN ANY OTHER ROUTE REACH i5 AND i6? The claim went back and forth twice on 2026-08-14, so here is
// where it landed, with the measurements:
//
//   1. i5-playground and i6-index decide by MEASURING the public surface before and after the edit.
//   2. Route B DID move it once — `ml-currency-input`, where the edit added the public properties
//      `label` and `helper`. But those were an invention the group contract does not declare, and
//      i3-edit's `definition_changed` gate now refuses exactly that. So that path is closed.
//   3. A LEGITIMATE route B movement would need a molecule missing something whose name the group
//      already declares. Swept for it and found no confirmed case: of the 26 molecules that do not
//      declare every slot their group lists, 15 are missing only table-variant slots and 10 more the
//      `Detail` of row expansion — the group contract is a UNION across variants, so nearly all are
//      normal rather than defective.
//
// So route A is, as far as anything measured shows, still the only route that reaches those two
// branches — and it is certainly the only one for an INTENTIONAL change of what the molecule promises,
// which is what the tables consolidation needs. Note the consequence of the group contract enumerating
// the surface: a legitimate route A on this library usually implies the group contract moving first.

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
  nmResultStepIntent,
  nmParseStepArgs,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  IM_AGENT_FOLDER,
  IM_MAX_ATTEMPTS,
  ImContext,
  ImDefinitionChange,
  ImSurfaceNames,
  ImTriage,
  imDoneAnchor,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import {
  imContextFileInfo,
  imTraceFileInfo,
  imTriageFileInfo,
  imWorkFile,
  readGroupSkill,
  readImAgentText,
  sourceOf,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { getImRunKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import { readSurface, renderSurface } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';
import { ImDefinitionAnswer, runImDefinitionGate } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/gate.js';
import type {
  DefinitionChoiceResult,
  DefinitionChoiceValue,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/widgetDefinitionChoiceLogic.js';

const AGENT_NAME = 'agentIm2Definition';
const PLAN_ID = 'i2a-definition';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${IM_AGENT_FOLDER}/steps/i2a-definition`,
    agentDescription: 'i2a-definition — asks the human to confirm what the molecule will start promising',
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

  const promptMd = await readImAgentText('steps/i2a-definition', 'prompt', '.md', true);

  const systemPrompt = promptMd
    .split('{{tag}}').join(ctx.target.tag)
    .split('{{surface}}').join(renderSurface(readSurface(sourceOf(ctx.artifacts, 'ts'))))
    .split('{{userPrompt}}').join(ctx.userPrompt)
    .split('{{triage}}').join(triage.rationale)
    .split('{{definitionElements}}').join(triage.definitionElements?.length ? triage.definitionElements.join(', ') : '(none named)')
    .split('{{userLanguage}}').join(ctx.userLanguage || 'the language of the request');

  const humanPrompt = [
    `Say which elements of the public surface of ${ctx.target.tag} move.`,
    parsedArgs.retryContext ? `## What the gate rejected — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [nmClarificationPromptReady(context, parentStep, hookSequential, {
    planId: PLAN_ID,
    stepArgs: args || step.prompt || JSON.stringify({ planId: PLAN_ID, runKey }),
    systemPrompt,
    humanPrompt,
  })];
}

/** Gates the PROPOSAL and, on success, returns [] — the payload stays mounted and the widget takes over. */
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
  const answer = envelopeError ? null : readProposal(step.interaction?.payload?.[0]);

  const gate = answer
    ? runImDefinitionGate({ answer, current: currentSurface(ctx), groupSkill: await readGroupSkill(ctx.groupSkill.usageReference), fromModel: true })
    : { ok: false, errors: [`payload: ${envelopeError || 'the clarification json could not be read'}`] };
  const errorText = gate.errors.join('\n');

  await writeJsonArtifact(imTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: gate.ok,
    ...(gate.ok ? { proposal: answer } : { error: errorText, proposal: answer }),
  });

  // BLOCKED: nothing to choose, so no widget. The request needs a name the group contract does not
  // declare, and that file is edited by hand — the run ends here with the instruction, which IS the
  // deliverable. Same shape as route C's `parent`: the anchor is emitted so the branch already planted
  // (i3, i5, i6, i7) completes instead of hanging on it (the 2026-08-10 defect).
  if (gate.ok && answer?.blocked) {
    const reference = ctx.groupSkill.reference || '(the group contract)';
    const pt = (ctx.userLanguage || '').startsWith('pt');
    const summary = pt
      ? `nada foi alterado — o contrato do grupo precisa mudar primeiro: ${reference}`
      : `nothing was changed — the group contract has to change first: ${reference}`;
    await writeJsonArtifact(imWorkFile(runKey, 'definition'), {
      changes: [],
      blocked: true,
      blockedReason: answer.reason || '',
      confirmedAt: new Date().toISOString(),
    });
    return [
      nmResultStepIntent(context, parentStep, {
        planId: imDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: summary,
        result: { changes: [], blocked: true, blockedReason: answer.reason || '', groupContract: reference, runKey },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${summary}\n\n${answer.reason || ''}`, 'input_output'),
    ];
  }

  // Kept on disk so beforeClarificationStep rebuilds the widget value from DISK rather than trusting
  // the mounted payload — same reason n2-plan and i4-inherit do it.
  if (gate.ok && answer) {
    await writeJsonArtifact(imWorkFile(runKey, 'definition-proposal'), { ...answer, savedAt: new Date().toISOString() });
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
  const proposal = await readJsonArtifact<ImDefinitionAnswer>(imWorkFile(runKey, 'definition-proposal'), false);

  await import('/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/widgetDefinitionChoice.js');
  const el = document.createElement('widget-definition-choice-102020');
  const value: DefinitionChoiceValue = {
    planId: PLAN_ID,
    title: proposal?.title || '',
    userLanguage: ctx.userLanguage,
    tag: ctx.target.tag,
    request: ctx.userPrompt,
    reason: proposal?.reason || '',
    current: currentSurface(ctx),
    changes: proposal?.changes || [],
  };
  (el as unknown as { value: DefinitionChoiceValue }).value = value;
  el.addEventListener('clarification-finish', (event: Event) => {
    const detail = (event as CustomEvent<{ value: DefinitionChoiceResult; action: 'continue' | 'cancel' }>).detail;
    void applyDecision(context, parentStep, step, hookSequential, ctx, detail.value, detail.action)
      .catch(error => console.error(`[${AGENT_NAME}] ${error instanceof Error ? error.message : String(error)}`));
  });
  return el;
}

async function applyDecision(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  ctx: ImContext,
  confirmed: DefinitionChoiceResult | undefined,
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

  // The human dropped lines, so what they confirmed is NOT what the model proposed. It is gated
  // again for the same reason i4 does it: this is what gets written.
  const gate = runImDefinitionGate({
    answer: { changes: confirmed.changes },
    current: currentSurface(ctx),
    groupSkill: await readGroupSkill(ctx.groupSkill.usageReference),
    fromModel: false,
  });
  if (!gate.ok) {
    await nmApplyIntentsAndRefresh(context, [
      nmUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `the confirmed definition change is not valid:\n${gate.errors.join('\n')}`),
    ], false);
    return;
  }

  await writeJsonArtifact(imWorkFile(ctx.runKey, 'definition'), {
    changes: confirmed.changes,
    confirmedAt: new Date().toISOString(),
  });

  const summary = describe(confirmed.changes, pt);
  // Intent order matters: the 'i2a-done' anchor that i3-edit depends on lands BEFORE the
  // update-status that closes this step.
  await nmApplyIntentsAndRefresh(context, [
    nmAnswerResultIntent(context, mutationParent, {
      planId: imDoneAnchor(PLAN_ID),
      stepTitle: summary,
      result: {
        changes: confirmed.changes,
        definitionFile: toDisplayPath(imWorkFile(ctx.runKey, 'definition')),
        runKey: ctx.runKey,
      },
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

/**
 * The surface as the CODE declares it today — read from the pre-edit snapshot in context.json, which
 * is what the gate must check against: "does this molecule already have a slot called Footer".
 */
function currentSurface(ctx: ImContext): ImSurfaceNames {
  const surface = readSurface(sourceOf(ctx.artifacts, 'ts'));
  return {
    slots: surface.slots,
    properties: surface.properties.map(property => property.name),
    events: surface.events,
  };
}

/** One line for the step title. The full list lives in definition.json and in the summary. */
function describe(changes: ImDefinitionChange[], pt: boolean): string {
  const verb: Record<string, string> = pt
    ? { add: 'novo', remove: 'removido', rename: 'renomeado' }
    : { add: 'added', remove: 'removed', rename: 'renamed' };
  const parts = changes.map(change => `${change.kind} \`${change.name}\` ${verb[change.op] || change.op}`);
  return pt ? `a definição muda: ${parts.join('; ')}` : `the definition changes: ${parts.join('; ')}`;
}

/** The proposal out of the clarification envelope. Everything is defaulted; the gate rejects. */
function readProposal(payload: unknown): ImDefinitionAnswer | null {
  const parsed = parseMaybeJson(payload);
  const outer = isRecord(parsed) && parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
  if (!isRecord(outer)) return null;
  const json = parseMaybeJson(outer.json);
  if (!isRecord(json)) return null;
  const raw = Array.isArray(json.changes) ? json.changes : [];
  return {
    changes: raw.filter(isRecord).map(item => ({
      kind: String(item.kind || '') as ImDefinitionChange['kind'],
      op: String(item.op || '') as ImDefinitionChange['op'],
      name: typeof item.name === 'string' ? item.name.trim() : '',
      ...(typeof item.previousName === 'string' && item.previousName.trim()
        ? { previousName: item.previousName.trim() }
        : {}),
      purpose: typeof item.purpose === 'string' ? item.purpose : '',
    })),
    reason: typeof json.reason === 'string' ? json.reason : '',
    title: typeof json.title === 'string' ? json.title : '',
    ...(json.blocked === true || json.blocked === 'true' ? { blocked: true } : {}),
  };
}

function readPlanId(json: unknown): string {
  const parsed = parseMaybeJson(json);
  return isRecord(parsed) && typeof parsed.planId === 'string' ? parsed.planId : '';
}
