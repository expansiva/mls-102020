/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c2-clarify/agentCopyClarify.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c2-clarify — the pipeline's ONLY human stop, and it only stops when there is something to
// decide. ALWAYS planted (decision 4): with zero collisions it auto-completes and emits
// c2-done without asking anything, so there is a single plan shape.
//
// Checkpoint pattern (skills/collab_messages.md "Rendering a checkpoint", precedent
// agentNewTheme/steps/t2-clarify): beforePromptStep emits a cheap clarification envelope into
// THIS step's payload, afterPromptStep returns [] so the payload (and the widget) stays
// mounted, beforeClarificationStep mounts the SHARED decision widget, and the human answer
// becomes the completed 'c2-done' result that unlocks c3.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  C_AGENT_FOLDER,
  cAnswersFileInfo,
  cContextFileInfo,
  cTraceFileInfo,
  listGroupMolecules,
  readJsonArtifact,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cFs.js';
import { CopyContext, collidingItems, itemsToWrite } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import {
  cAnswerResultIntent,
  cApplyIntentsAndRefresh,
  cCheckClarificationPayload,
  cClarificationPromptReady,
  cDoneAnchor,
  cFindMutableParent,
  cParseStepArgs,
  cResultStepIntent,
  cUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.js';
import {
  COLLISION_QUESTION_ID,
  CClarifyAnswer,
  applyCancelToContext,
  applyChoiceToContext,
  collisionLines,
  collisionSummary,
  optionsFor,
  renameAllowed,
  runClarifyGate,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c2-clarify/gate.js';
import type {
  DecisionAnswer,
  DecisionClarificationValue,
  DecisionOption,
} from '/_102020_/l2/aura/molecules/shared/widgetDecisionClarificationLogic.js';
import { getCRunKey } from '/_102020_/l2/aura/molecules/agentCopyMolecule/agentCopyMolecule.js';

const AGENT_NAME = 'agentCopyClarify';
const PLAN_ID = 'c2-clarify';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${C_AGENT_FOLDER}/steps/c2-clarify`,
    agentDescription: 'c2-clarify — resolves destination collisions with the user; auto-completes when there is none',
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
  const runKey = getCRunKey(context, cParseStepArgs(args || step.prompt).runKey);
  const ctx = await readContext(runKey);

  // NO collision: auto-complete. The anchor is what matters — a step that neither writes nor
  // anchors is how a run goes green and hangs (i4-inherit, 2026-08-10).
  if (!collidingItems(ctx).length) {
    return [
      cResultStepIntent(context, parentStep, {
        planId: cDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: 'sem colisão',
        result: { collisions: 0, choice: 'none', skipped: [] },
      }),
      cUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'nenhuma colisão no destino', 'input_output'),
    ];
  }

  return [cClarificationPromptReady(context, parentStep, hookSequential, {
    planId: PLAN_ID,
    stepArgs: args || step.prompt || JSON.stringify({ planId: PLAN_ID, runKey }),
    systemPrompt: buildEnvelopePrompt(titleFor(ctx)),
    humanPrompt: `Render the collision checkpoint for ${collidingItems(ctx).length} item(s). Return only the clarification payload requested in the system prompt.`,
  })];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const error = cCheckClarificationPayload(step.interaction?.payload?.[0], PLAN_ID);
  if (error) return [cUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error)];
  // Keep the payload: it is what the framework renders the checkpoint from.
  return [];
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

  const runKey = getCRunKey(context);
  const ctx = await readContext(runKey);

  await import('/_102020_/l2/aura/molecules/shared/widgetDecisionClarification.js');
  const el = document.createElement('widget-decision-clarification-102020');
  const value: DecisionClarificationValue = {
    title: titleFor(ctx),
    intro: introFor(ctx),
    userLanguage: ctx.userLanguage,
    questions: [{
      id: COLLISION_QUESTION_ID,
      question: questionFor(ctx),
      options: optionsForWidget(ctx),
      // The free text IS the new molecule name when 'rename' is chosen — that is why rename
      // needs no second question (and why it exists only in single mode).
      allowNotes: renameAllowed(ctx.mode),
      notesPlaceholder: renameAllowed(ctx.mode) ? 'Novo nome, se escolher renomear (ex.: ml-combobox-app)' : '',
    }],
  };
  (el as unknown as { value: DecisionClarificationValue }).value = value;
  el.addEventListener('clarification-finish', (event: Event) => {
    const detail = (event as CustomEvent<{ value: { answers: DecisionAnswer[] }; action: 'continue' | 'cancel' }>).detail;
    void applyAnswer(context, parentStep, step, hookSequential, runKey, ctx, detail.value?.answers || [], detail.action)
      .catch(error => console.error(`[${AGENT_NAME}] ${error instanceof Error ? error.message : String(error)}`));
  });
  return el;
}

async function applyAnswer(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  runKey: string,
  ctx: CopyContext,
  widgetAnswers: DecisionAnswer[],
  action: 'continue' | 'cancel',
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const mutationParent = cFindMutableParent(context, parentStep);

  const raw = widgetAnswers.find(item => item.id === COLLISION_QUESTION_ID);
  const answer: CClarifyAnswer = {
    choice: action === 'continue' ? (raw?.optionId || '') : 'cancel',
    newShortName: raw?.notes,
  };

  // Cancel cancels EVERYTHING, with nothing written (decision 5). The widget's own cancel button
  // and the 'cancel' option end in the same place.
  //
  // It ANCHORS, though — and that is the lesson T2 cost us in the Studio (2026-08-20). Failing this
  // step without emitting c2-done left c3/c4/c5/c6 planted and waiting on an anchor that would
  // never land: the run sat there and the user saw NOTHING happen. So cancel marks the context
  // cancelled, emits the anchor, and lets the pipeline walk to the summary, which closes the run
  // saying nothing was copied. Same shape as agentImproveMolecule2's terminal 'parent' choice.
  if (action !== 'continue' || answer.choice === 'cancel') {
    const cancelled = applyCancelToContext(ctx);
    await writeJsonArtifact(cContextFileInfo(runKey), cancelled);
    await writeJsonArtifact(cAnswersFileInfo(runKey), { savedAt: new Date().toISOString(), choice: 'cancel' });
    await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), {
      savedAt: new Date().toISOString(),
      planId: PLAN_ID,
      choice: 'cancel',
      cancelled: true,
      collisions: collisionLines(ctx),
    });
    await cApplyIntentsAndRefresh(context, [
      cAnswerResultIntent(context, mutationParent, {
        planId: cDoneAnchor(PLAN_ID),
        stepTitle: 'cancelado — nada foi copiado',
        result: { choice: 'cancel', cancelled: true, willWrite: 0 },
      }),
      cUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', 'cancelado pelo usuário — nada foi copiado', 'input_output'),
    ], true);
    return;
  }

  // Only the rename path consults it, and rename exists only in single mode — so the list is
  // the destination group's molecules, and empty everywhere else.
  const existingShortNames = ctx.mode === 'single'
    ? listGroupMolecules(ctx.destProject, ctx.items[0].destination.group)
    : [];
  const issues = runClarifyGate({ context: ctx, answer, existingShortNames });
  if (issues.length) {
    const message = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await cApplyIntentsAndRefresh(context, [
      cUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', message),
    ], false);
    return;
  }

  // The ONE documented exception to "the context is written once by c1": rename/skip.
  const updated = applyChoiceToContext(ctx, answer);
  await writeJsonArtifact(cContextFileInfo(runKey), updated);
  await writeJsonArtifact(cAnswersFileInfo(runKey), {
    savedAt: new Date().toISOString(),
    choice: answer.choice,
    newShortName: answer.newShortName || null,
    collisions: collisionLines(ctx),
  });
  await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    choice: answer.choice,
    skipped: updated.items.filter(item => item.skip).map(item => item.origin.ref),
    renamed: updated.items.filter(item => !!item.rename).map(item => item.rename),
  });

  // Intent order matters: the completed answer result (the 'c2-done' anchor c3 depends on)
  // lands BEFORE the update-status that closes this step.
  await cApplyIntentsAndRefresh(context, [
    cAnswerResultIntent(context, mutationParent, {
      planId: cDoneAnchor(PLAN_ID),
      stepTitle: collisionSummary(ctx, answer.choice),
      result: {
        choice: answer.choice,
        skipped: updated.items.filter(item => item.skip).map(item => item.destination.files.ts),
        willWrite: itemsToWrite(updated).length,
      },
    }),
    cUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
  ], true);
}

// ---- widget copy (pt/en) ------------------------------------------------------
// The CONSEQUENCE is written in the option itself. 'Replace' can destroy the client's
// translation — which is the whole reason the copy exists — so the text says it out loud, with
// the date of the copy at risk when the copiedFrom line is readable.

function optionsForWidget(ctx: CopyContext): DecisionOption[] {
  const isEn = (ctx.userLanguage || '').slice(0, 2).toLowerCase() === 'en';
  const ids = optionsFor(ctx.mode);
  const labels: Record<string, { pt: string; en: string; descPt: string; descEn: string }> = {
    'replace': {
      pt: 'Substituir', en: 'Replace',
      descPt: 'Sobrescreve os arquivos existentes. DESCARTA as alterações locais da cópia, INCLUSIVE traduções.',
      descEn: 'Overwrites the existing files. DISCARDS local changes to the copy, INCLUDING translations.',
    },
    'replace-all': {
      pt: 'Substituir todas', en: 'Replace all',
      descPt: 'Sobrescreve todas as moléculas que já existem. DESCARTA as alterações locais delas, INCLUSIVE traduções.',
      descEn: 'Overwrites every molecule that already exists. DISCARDS their local changes, INCLUDING translations.',
    },
    'ignore-existing': {
      pt: 'Ignorar já existentes', en: 'Ignore existing ones',
      descPt: 'Copia somente as que ainda não existem no projeto. As existentes ficam intactas.',
      descEn: 'Copies only the ones that do not exist yet. The existing ones are left untouched.',
    },
    'cancel': {
      pt: 'Cancelar a operação', en: 'Cancel the operation',
      descPt: 'Nada é copiado. Nenhum arquivo é escrito.',
      descEn: 'Nothing is copied. No file is written.',
    },
    'rename': {
      pt: 'Renomear a cópia', en: 'Rename the copy',
      descPt: 'Cria a cópia com outro nome (escreva o novo nome no campo abaixo). A molécula existente fica intacta. Só existe ao copiar UMA molécula.',
      descEn: 'Creates the copy under another name (type it in the field below). The existing molecule is untouched. Single-molecule copies only.',
    },
  };
  return ids.map(id => ({
    id,
    label: isEn ? labels[id].en : labels[id].pt,
    description: isEn ? labels[id].descEn : labels[id].descPt,
    recommended: id === 'ignore-existing' || (ctx.mode === 'single' && id === 'rename'),
  }));
}

function titleFor(ctx: CopyContext): string {
  const isEn = (ctx.userLanguage || '').slice(0, 2).toLowerCase() === 'en';
  return isEn ? 'The destination already has these molecules' : 'O destino já tem estas moléculas';
}

function introFor(ctx: CopyContext): string {
  const lines = collisionLines(ctx);
  const isEn = (ctx.userLanguage || '').slice(0, 2).toLowerCase() === 'en';
  const head = isEn
    ? 'Copying would overwrite what is already in the current project:'
    : 'Copiar sobrescreveria o que já está no projeto atual:';
  return `${head}\n${lines.map(line => `• ${line}`).join('\n')}`;
}

function questionFor(ctx: CopyContext): string {
  const isEn = (ctx.userLanguage || '').slice(0, 2).toLowerCase() === 'en';
  if (ctx.mode === 'single') return isEn ? 'What should be done with the existing molecule?' : 'O que fazer com a molécula que já existe?';
  return isEn ? 'What should be done with the molecules that already exist?' : 'O que fazer com as moléculas que já existem?';
}

// ---- plumbing ----------------------------------------------------------------

async function readContext(runKey: string): Promise<CopyContext> {
  const ctx = await readJsonArtifact<CopyContext>(cContextFileInfo(runKey), true);
  if (!ctx || !Array.isArray(ctx.items)) throw new Error(`[${AGENT_NAME}] context.json missing or invalid for ${runKey}`);
  return ctx;
}

function readPlanId(value: unknown): string {
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  if (typeof parsed !== 'object' || parsed === null) return '';
  const planId = (parsed as Record<string, unknown>).planId;
  return typeof planId === 'string' ? planId : '';
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// The cheap call only produces the envelope the framework needs to render a checkpoint; the
// question and the options come from the context (deterministic, already gated).
function buildEnvelopePrompt(title: string): string {
  return `<!-- modelType: general -->

Return JSON only. Do not call tools. Do not explain.

Required payload:
{
  "type": "clarification",
  "json": {
    "planId": "${PLAN_ID}",
    "title": ${JSON.stringify(title)}
  }
}`;
}
