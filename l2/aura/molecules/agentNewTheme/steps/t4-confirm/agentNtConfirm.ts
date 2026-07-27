/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/steps/t4-confirm/agentNtConfirm.ts" enhancement="_102027_/l2/enhancementAgent"/>

// t4-confirm — CHECKPOINT 2: the only place that writes to disk.
// Same checkpoint mechanics as t2-clarify (emit the clarification into this step's own
// payload; the widget is mounted by beforeClarificationStep). The shared Theme
// Confirmation widget shows the draft's layout signature + palette swatches over the
// theme background. CONFIRM => write l2/skills/theme.ts (+ the deterministic theme.html)
// and compile best-effort, so the molecule agents can import the theme right away.
// EXIT => discard the draft; nothing is written. No adjust/iterate loop in v1.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  NT_AGENT_FOLDER,
  NtFileInfo,
  ntDraftFile,
  ntPlanFile,
  readJsonArtifact,
  themeFile,
  toDisplayPath,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntFs.js';
import { NtDraft, NtPlan } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';
import { renderThemeHtml } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntThemeHtml.js';
import {
  ntApplyIntentsAndRefresh,
  ntCheckClarificationPayload,
  ntClarificationPromptReady,
  ntDoneAnchor,
  ntFindMutableParent,
  ntResultStepIntent,
  ntUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntSteps.js';
import { parseThemeSource } from '/_102020_/l2/aura/molecules/agentNewTheme/steps/t3-generate/gate.js';
import type { ThemeConfirmationValue } from '/_102020_/l2/aura/molecules/shared/widgetThemeConfirmationLogic.js';

const AGENT_NAME = 'agentNtConfirm';
const PLAN_ID = 't4-confirm';

const LABELS: Record<string, { title: string; created: string; discarded: string }> = {
  pt: { title: 'Confirmar o tema', created: 'Tema criado', discarded: 'Tema descartado pelo usuário' },
  en: { title: 'Confirm the theme', created: 'Theme created', discarded: 'Theme discarded by the user' },
};

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NT_AGENT_FOLDER}/steps/t4-confirm`,
    agentDescription: 't4-confirm — Checkpoint 2: confirms and writes theme.ts + theme.html',
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
  const draft = await readDraft();
  return [ntClarificationPromptReady(context, parentStep, hookSequential, {
    planId: PLAN_ID,
    stepArgs: args || step.prompt || JSON.stringify({ planId: PLAN_ID }),
    systemPrompt: buildEnvelopePrompt(draft.summary.displayName),
    humanPrompt: `Render Checkpoint 2 for the theme "${draft.summary.displayName}". Return only the clarification payload requested in the system prompt.`,
  })];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const error = ntCheckClarificationPayload(step.interaction?.payload?.[0], PLAN_ID);
  if (error) return [ntUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', error)];
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

  const draft = await readDraft();
  const labels = labelsFor((await readPlanLanguage()));
  await import('/_102020_/l2/aura/molecules/shared/widgetThemeConfirmation.js');
  const el = document.createElement('widget-theme-confirmation-102020');
  const value: ThemeConfirmationValue = { title: labels.title, summary: draft.summary };
  (el as unknown as { value: ThemeConfirmationValue }).value = value;
  el.addEventListener('clarification-finish', (event: Event) => {
    const detail = (event as CustomEvent<{ value: { confirmed: boolean }; action: 'continue' | 'cancel' }>).detail;
    void applyConfirmation(context, parentStep, step, hookSequential, draft, labels, detail.action === 'continue' && detail.value?.confirmed !== false)
      .catch(error => console.error(`[${AGENT_NAME}] ${error instanceof Error ? error.message : String(error)}`));
  });
  return el;
}

async function applyConfirmation(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  draft: NtDraft,
  labels: { title: string; created: string; discarded: string },
  confirmed: boolean,
): Promise<void> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const mutationParent = ntFindMutableParent(context, parentStep);

  if (!confirmed) {
    // Exit: the draft stays in l4 as a record, nothing lands in l2/skills.
    await ntApplyIntentsAndRefresh(context, [
      ntUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', labels.discarded, 'input_output'),
    ], false);
    return;
  }

  const tsInfo = themeFile('.ts');
  const htmlInfo = themeFile('.html');
  const parsed = parseThemeSource(draft.themeTs);
  const info = (parsed.module?.themeInfo || {}) as Record<string, unknown>;
  await writeStorTextAtomic(tsInfo, draft.themeTs, true);
  await writeStorTextAtomic(htmlInfo, renderThemeHtml({
    summary: draft.summary,
    description: typeof info.description === 'string' ? info.description : '',
    suffix: typeof info.suffix === 'string' ? info.suffix : '',
  }), true);
  // The molecule agents import('/_<dest>_/l2/skills/theme.js'), so the .ts must be
  // compiled. Best-effort (same stance as the Variant's group index): a failure is
  // reported in the result, the file stays for the user to fix.
  const compiled = await compileTheme(tsInfo);

  await ntApplyIntentsAndRefresh(context, [
    ntResultStepIntent(context, mutationParent, {
      planId: ntDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: labels.created,
      result: {
        theme: draft.summary.name,
        files: [toDisplayPath(tsInfo), toDisplayPath(htmlInfo)],
        compiled,
      },
    }),
    ntUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
  ], true);
}

async function compileTheme(fileInfo: NtFileInfo): Promise<boolean> {
  try {
    const storFile = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    if (!storFile) return false;
    const model = await storFile.getOrCreateModel();
    if (!model?.model) return false;
    return await mls.l2.typescript.compileAndPostProcess(model, true, false);
  } catch {
    return false;
  }
}

async function readDraft(): Promise<NtDraft> {
  const draft = await readJsonArtifact<NtDraft>(ntDraftFile(), true);
  if (!draft?.themeTs || !draft.summary) throw new Error(`[${AGENT_NAME}] draft.json missing or invalid`);
  return draft;
}

async function readPlanLanguage(): Promise<string> {
  const plan = await readJsonArtifact<NtPlan>(ntPlanFile(), false);
  return plan?.userLanguage || 'pt';
}

function labelsFor(userLanguage: string): { title: string; created: string; discarded: string } {
  return LABELS[(userLanguage || '').slice(0, 2).toLowerCase()] || LABELS.en;
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

function buildEnvelopePrompt(displayName: string): string {
  return `<!-- modelType: general -->

Return JSON only. Do not call tools. Do not explain.

Required payload:
{
  "type": "clarification",
  "json": {
    "planId": "${PLAN_ID}",
    "title": ${JSON.stringify(displayName)}
  }
}`;
}
