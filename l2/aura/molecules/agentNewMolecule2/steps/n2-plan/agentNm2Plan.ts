/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n2-plan/agentNm2Plan.ts" enhancement="_102027_/l2/enhancementAgent"/>

// n2-plan — the requirements call AND the pipeline's only human stop. See flow.json.
//
// Checkpoint pattern (skills/collab_messages.md "Rendering a checkpoint"): beforePromptStep emits
// the reasoning prompt whose answer IS a { type: 'clarification', json } payload; afterPromptStep
// gates that proposal and returns [] so the payload (and therefore the widget) stays mounted;
// beforeClarificationStep mounts shared/widgetDefsClarification; Confirm re-gates the EDITED data,
// writes plan.json and emits the 'n2-done' anchor that unlocks n3-defs. Cancel writes nothing.
//
// The checkpoint sits here — before the .defs.ts — because the .defs.ts is the spec every later
// step reads: an error there propagates into four files. The old flow stopped in the same place,
// through agentNewMoleculePlannerClarification.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { skills as skillList } from '/_102020_/l2/aura/molecules/skills/index';
import { skill as moleculeGenerationSkill } from '/_102020_/l2/aura/molecules/skills/moleculeGeneration.js';
import {
  NM_AGENT_FOLDER,
  isRecord,
  nmBaseFile,
  nmContextFileInfo,
  nmExistingArtifacts,
  nmPlanFileInfo,
  nmTraceFileInfo,
  parseMaybeJson,
  readJsonArtifact,
  readNmAgentText,
  readStorText,
  toDisplayPath,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { MoleculePlan, NM_MAX_ATTEMPTS } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext, themeLabel } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { nmCandidateAxes, nmLayoutConfigSummary } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmLayoutAxes.js';
import {
  nmAgentStepIntent,
  nmAnswerResultIntent,
  nmApplyIntentsAndRefresh,
  nmCheckClarificationPayload,
  nmClarificationPromptReady,
  nmDoneAnchor,
  nmFindMutableParent,
  nmParseStepArgs,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { normalizeNm2Plan, runNm2PlanGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n2-plan/gate.js';
import type {
  DefsAxisOption,
  DefsClarificationData,
  DefsClarificationResult,
  DefsClarificationValue,
} from '/_102020_/l2/aura/molecules/shared/widgetDefsClarificationLogic.js';
import { getNmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.js';

const AGENT_NAME = 'agentNm2Plan';
const PLAN_ID = 'n2-plan';

interface NmPlanLabels {
  title: string;
  intro: string;
  confirmed: string;
  cancelled: string;
}

const LABELS: Record<string, NmPlanLabels> = {
  pt: {
    title: 'Confirmar a molécula',
    intro: 'Revise os requisitos antes de gerar os arquivos. O nome e a tag podem ser ajustados agora — depois exigem renomear quatro arquivos.',
    confirmed: 'Requisitos confirmados',
    cancelled: 'Cancelado pelo usuário',
  },
  en: {
    title: 'Confirm the molecule',
    intro: 'Review the requirements before the files are generated. The name and the tag can be adjusted now — later they mean renaming four files.',
    confirmed: 'Requirements confirmed',
    cancelled: 'Cancelled by the user',
  },
};

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NM_AGENT_FOLDER}/steps/n2-plan`,
    agentDescription: 'n2-plan — defines the molecule requirements and asks the human to confirm them',
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
  const runKey = getNmRunKey(context, parsedArgs.runKey);
  const ctx = await readContext(runKey);

  const promptMd = await readNmAgentText('steps/n2-plan', 'prompt', '.md', true);
  const groupSkill = await loadGroupSkill(ctx);
  const moleculeBase = await readStorText(nmBaseFile(), true);

  const systemPrompt = promptMd
    .split('{{themeSection}}').join(buildThemeSection(ctx))
    .split('{{moleculeBase}}').join(moleculeBase)
    .split('{{moleculeGeneration}}').join(moleculeGenerationSkill)
    .split('{{groupCanonical}}').join(ctx.destination.groupCanonical)
    .split('{{groupSkill}}').join(groupSkill)
    .split('{{layoutAxesSection}}').join(buildLayoutAxesSection(ctx));

  const humanPrompt = [
    `## What the user asked for\n${ctx.userPrompt}`,
    `## Language\nAnswer in '${ctx.userLanguage}'.`,
    parsedArgs.retryContext ? `## The previous proposal was rejected — fix ALL of these\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [nmClarificationPromptReady(context, parentStep, hookSequential, {
    planId: PLAN_ID,
    stepArgs: args || step.prompt || JSON.stringify({ planId: PLAN_ID, runKey }),
    systemPrompt,
    humanPrompt,
  })];
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
  const runKey = getNmRunKey(context, parsedArgs.runKey);
  const ctx = await readContext(runKey);

  const envelopeError = nmCheckClarificationPayload(step.interaction?.payload?.[0], PLAN_ID);
  const candidate = envelopeError ? {} : readClarificationJson(step.interaction?.payload?.[0]);
  const { plan, coercions } = normalizeNm2Plan(candidate, ctx);
  const issues = envelopeError
    ? [{ code: 'payload', message: envelopeError }]
    : runNm2PlanGate(plan, ctx, { known: skillList, collisions: nmExistingArtifacts(plan.group, plan.shortName) });
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(nmTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: issues.length === 0,
    coercions,
    ...(issues.length ? { error: errorText } : { proposed: plan.fileReference }),
  });

  if (issues.length) {
    if (attempt >= NM_MAX_ATTEMPTS) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${PLAN_ID} failed after ${attempt} attempts:\n${errorText}`)];
    }
    // Bounded retry: the OPEN retry step comes first, then complete-with-trace (never 'failed'
    // with a retry in flight — collab_messages.md).
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

  // Provisional plan: the widget rebuilds from DISK instead of trusting the mounted payload, and a
  // re-run of the checkpoint shows the same data.
  await writeJsonArtifact(nmPlanFileInfo(runKey), plan);
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

  const runKey = getNmRunKey(context);
  const ctx = await readContext(runKey);
  const plan = await readJsonArtifact<MoleculePlan>(nmPlanFileInfo(runKey), true);
  if (!plan) throw new Error(`[${AGENT_NAME}] plan.json missing for ${runKey}`);
  const labels = labelsFor(ctx.userLanguage);

  await import('/_102020_/l2/aura/molecules/shared/widgetDefsClarification.js');
  const el = document.createElement('widget-defs-clarification-102020');
  const value: DefsClarificationValue = {
    planId: PLAN_ID,
    title: readClarificationTitle(json) || labels.title,
    intro: labels.intro,
    userLanguage: ctx.userLanguage,
    themeLabel: themeLabel(ctx),
    // The axes the group is governed by, offered as closed enums. Empty for the 5 groups that have
    // none, and then the section is not rendered at all.
    axes: buildAxisOptions(ctx),
    data: {
      fileReference: plan.fileReference,
      description: plan.description,
      prompt: plan.prompt,
      group: plan.group,
      functionalRequirements: plan.functionalRequirements,
      visualRequirements: plan.visualRequirements,
      layoutConfig: plan.layoutConfig || {},
    },
  };
  (el as unknown as { value: DefsClarificationValue }).value = value;
  el.addEventListener('clarification-finish', (event: Event) => {
    const detail = (event as CustomEvent<{ value: DefsClarificationResult; action: 'continue' | 'cancel' }>).detail;
    void applyConfirmation(context, parentStep, step, hookSequential, ctx, detail.value, detail.action)
      .catch(error => console.error(`[${AGENT_NAME}] ${error instanceof Error ? error.message : String(error)}`));
  });
  return el;
}

async function applyConfirmation(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  ctx: MoleculeContext,
  confirmed: DefsClarificationResult | undefined,
  action: 'continue' | 'cancel',
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const labels = labelsFor(ctx.userLanguage);
  const mutationParent = nmFindMutableParent(context, parentStep);

  if (action !== 'continue' || !confirmed) {
    await nmApplyIntentsAndRefresh(context, [
      nmUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', labels.cancelled),
    ], false);
    return;
  }

  // The human could edit the reference (moving groups) or empty a field, so the gate runs AGAIN on
  // what they confirmed — the widget blocks the obvious cases, not collisions or unknown groups.
  const { plan } = normalizeNm2Plan(confirmed, ctx);
  const issues = runNm2PlanGate(plan, ctx, { known: skillList, collisions: nmExistingArtifacts(plan.group, plan.shortName) });
  if (issues.length) {
    const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await nmApplyIntentsAndRefresh(context, [
      nmUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `the confirmed plan is not valid:\n${errorText}`),
    ], false);
    return;
  }

  plan.confirmedAt = new Date().toISOString();
  await writeJsonArtifact(nmPlanFileInfo(ctx.runKey), plan);

  // Intent order matters: the completed answer result (the 'n2-done' anchor n3 depends on) lands
  // BEFORE the update-status that closes this step.
  await nmApplyIntentsAndRefresh(context, [
    nmAnswerResultIntent(context, mutationParent, {
      planId: nmDoneAnchor(PLAN_ID),
      stepTitle: `${labels.confirmed}: ${plan.tag}`,
      result: {
        planFile: toDisplayPath(nmPlanFileInfo(ctx.runKey)),
        tag: plan.tag,
        fileReference: plan.fileReference,
        layoutConfig: nmLayoutConfigSummary(plan.layoutConfig || {}),
      },
    }),
    // 'input_output' drops the widget interaction once the plan is on disk (the task record has a
    // 400KB limit).
    nmUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
  ], true);
}

// ---- helpers ----

async function readContext(runKey: string): Promise<MoleculeContext> {
  const ctx = await readJsonArtifact<MoleculeContext>(nmContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  return ctx;
}

async function loadGroupSkill(ctx: MoleculeContext): Promise<string> {
  const mod = await import(ctx.groupSkill.reference) as { skill?: unknown };
  if (typeof mod.skill !== 'string' || !mod.skill.trim()) {
    throw new Error(`[${AGENT_NAME}] group creation skill unreadable: ${ctx.groupSkill.reference}`);
  }
  return mod.skill;
}

// With a theme, the requirements must speak the theme's visual language; without one, the molecule
// is neutral and NOTHING about themes may leak into the artifacts (acceptance 3.11).
function buildThemeSection(ctx: MoleculeContext): string {
  if (!ctx.theme.present || !ctx.theme.info) {
    return '## Theme\n\nThis project has NO theme. Do not mention themes, palettes or visual styles beyond the hierarchy and states the component needs.';
  }
  const info = ctx.theme.info;
  return [
    '## Theme',
    '',
    `This project has the theme **${info.displayName || info.name}** (suffix \`${info.suffix}\`, applied to the name by code).`,
    info.description ? `Theme description: ${info.description}` : '',
    '',
    'Let it inform the visual requirements (which states exist, what dominates) — but never write concrete values: the stylesheet step owns colors, radii and shadows.',
  ].filter(Boolean).join('\n');
}

function buildAxisOptions(ctx: MoleculeContext): DefsAxisOption[] {
  return nmCandidateAxes(ctx.destination.groupCanonical).map(axis => ({
    key: axis.key,
    label: axis.label,
    values: axis.values,
    default: axis.default,
  }));
}

// The Design System vocabulary is GIVEN to the model as a closed enum: it picks a value per axis, or
// says the molecule is a wildcard on it. Code never lets a value outside the enum through (decision
// D7; analysis in todo/analise-layoutconfig-new-molecule-2.md).
function buildLayoutAxesSection(ctx: MoleculeContext): string {
  const axes = nmCandidateAxes(ctx.destination.groupCanonical);
  if (!axes.length) {
    return [
      '## Layout axes (Design System)',
      '',
      `The group \`${ctx.destination.groupCanonical}\` is not governed by any layout axis, so return`,
      '`layoutConfig` as an empty object `{}`. Do not invent axes.',
    ].join('\n');
  }
  const rows = axes.map(axis => `| \`${axis.key}\` | ${axis.label} | ${axis.values.map(value => `\`${value}\``).join(', ')} | \`${axis.default}\` |`);
  return [
    '## Layout axes (Design System)',
    '',
    'The Design System picks which molecule of a group a page uses, by matching these axes against the',
    'page rules. Declaring an axis means "I am THIS value"; OMITTING it means "I work under any value".',
    'An empty `layoutConfig` makes this molecule the fallback wildcard of the group, chosen by',
    'alphabetical order — so declare at least the axis that distinguishes this molecule from its siblings.',
    '',
    '| axis | meaning | allowed values | default |',
    '|---|---|---|---|',
    ...rows,
    '',
    'Rules: use ONLY these axis names and ONLY these values. Omit an axis when the molecule genuinely',
    'works under every one of its values — that is a claim, not laziness.',
  ].join('\n');
}

function readClarificationJson(payload: unknown): Record<string, unknown> {
  const parsed = parseMaybeJson(payload);
  const result = isRecord(parsed) && parsed.type === 'flexible' ? parseMaybeJson(parsed.result) : parsed;
  if (!isRecord(result)) return {};
  const json = parseMaybeJson(result.json);
  return isRecord(json) ? json : {};
}

function readClarificationTitle(json: unknown): string {
  const parsed = parseMaybeJson(json);
  if (!isRecord(parsed)) return '';
  return typeof parsed.title === 'string' ? parsed.title : '';
}

function readPlanId(value: unknown): string {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return '';
  return typeof parsed.planId === 'string' ? parsed.planId : '';
}

function labelsFor(userLanguage: string): NmPlanLabels {
  return LABELS[(userLanguage || '').slice(0, 2).toLowerCase()] || LABELS.en;
}

export type { DefsClarificationData };
