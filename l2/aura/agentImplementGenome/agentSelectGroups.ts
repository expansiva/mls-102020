/// <mls fileReference="_102020_/l2/aura/agentImplementGenome/agentSelectGroups.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Fase B — Agent1: per-ELEMENT molecule GROUP selection (LLM). One per page.
// Reads the origin page's `definition.layout` (intentions → fields/filters/actions +
// collection/summary/status containers) and, for each element id, picks the molecule
// GROUP that best represents it (or omits it). It does NOT pick the variant — the concrete
// molecule is resolved deterministically later (agentGenDefs via matchVariant).
// Writes `groupSelections` ([{ id, group }]) to page{layout}{ds}/<page>.defs.ts.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildWorkItem } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { buildGroupList } from '/_102020_/l2/aura/helpers/dsMatch/groupCatalog.js';
import { listLayoutElements } from '/_102020_/l2/aura/helpers/dsMatch/layoutElements.js';
import { loadPageLayout, buildAgent1HumanPrompt, validateAgent1Output, layoutElementIds } from '/_102020_/l2/aura/helpers/dsMatch/agent1.js';
import { parseStepArgs, mkCompleted, mkFail, saveFile } from '/_102020_/l2/aura/agentImplementGenome/planning.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentSelectGroups',
    agentProject: 102020,
    agentFolder: 'aura/agentImplementGenome',
    agentDescription: 'Pick the molecule group per layout element of a page (Agent1)',
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

  const a = parseStepArgs(args ?? step.prompt);
  const project = mls.actualProject || 0;
  const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);
  console.info(`[agentSelectGroups] ▶ ${a.page} — beforePrompt (Agent1, group por elemento)`);

  const layout = await loadPageLayout(item.defsOrigem);
  if (!layout) console.warn(`[agentSelectGroups] ${a.page}: definition.layout não carregou de ${item.defsOrigem}`);
  const elements = listLayoutElements(layout);
  const groups = await buildGroupList();
  console.info(`[agentSelectGroups] ${a.page}: ${elements.length} elemento(s), ${groups.length} grupo(s) disponíveis → enviando ao LLM`);
  const humanPrompt = buildAgent1HumanPrompt(item.defsOrigem, elements, groups);

  const continueParallel: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args: args ?? step.prompt ?? '',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt,
    systemPrompt: system1,
  };

  return [continueParallel];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const payload = step.interaction?.payload?.[0];
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid payload: ${JSON.stringify(payload)}`);

    const a = parseStepArgs(step.prompt);
    const project = mls.actualProject || 0;
    const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);

    const rawCount = Array.isArray((payload.result as any)?.assignments) ? (payload.result as any).assignments.length : 0;
    const layout = await loadPageLayout(item.defsOrigem);
    const validIds = layoutElementIds(layout);
    const groups = await buildGroupList();
    const validGroups = new Set(groups.map(g => g.group));
    const validated = validateAgent1Output(payload.result, validIds, validGroups, item.defsDestino);
    console.info(`[agentSelectGroups] ${a.page}: LLM retornou ${rawCount} → ${validated.assignments.length} válida(s) (id∈layout & group∈catálogo)`);
    for (const as of validated.assignments) console.info(`[agentSelectGroups]   · ${as.id} → ${as.group}`);

    if (!context.isTest) {
      await saveFile(item.defsDestino, buildGroupSelectionsDefs(item.defsDestino, validated.assignments));
      console.info(`[agentSelectGroups] ✓ ${a.page}: groupSelections gravado em ${item.defsDestino}`);
    }

    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentSelectGroups] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

/** The intermediate handoff: which group each element needs (consumed by agentGenDefs). */
function buildGroupSelectionsDefs(defsRef: string, assignments: unknown): string {
  const cleanRef = defsRef.startsWith('/') ? defsRef.slice(1) : defsRef;
  return [
    `/// <mls fileReference="${cleanRef}" enhancement="_blank"/>`,
    '',
    '// Generated by agentSelectGroups (Agent1). Group chosen per layout element id.',
    '// Consumed by agentGenDefs, which resolves the concrete variant (matchVariant) and places it.',
    '',
    `export const groupSelections = ${JSON.stringify(assignments, null, 2)} as const;`,
    '',
  ].join('\n');
}

const system1 = `
<!-- modelType: codeinstruct -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

## Task
You are given a page's LAYOUT elements (each with a stable id, kind, intent and — for inputs —
an inputType) and the list of molecule GROUPS. For each element that a molecule should render,
choose the ONE group that best represents it. Decide by what the element actually IS, not by a
rigid table: e.g. a status "select" may be a segmented selection, a numeric "rating" field may be
a rating group, a "queryList" container may be a table/grid/calendar collection group.

## Rules
- Answer per element id. Use the id EXACTLY as given. Never invent an id.
- Choose group names EXACTLY as listed (camelCase). Never invent a group.
- Map an element only when a group DIRECTLY and OBVIOUSLY fits. Omit elements with no good fit.
- One group per id. Decide GROUPS only — the concrete variant is chosen later.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    path: string;
    assignments: Array<{ id: string; group: string }>;
  };
};
//#endregion
