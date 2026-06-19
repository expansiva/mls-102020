/// <mls fileReference="_102020_/l2/agentImplementsDesignSystem2/agentSelectVariant2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Fase B — Agent2: per-organism VARIANT selection (LLM). One per page; runs after
// agentSelectGroups2 (which wrote `groupSelections`).
//
// beforePromptStep → DS-filters each group's variants (filterCompatibleVariants) and
//   prompts the LLM with the candidates' `.defs` descriptions + the rendered page, so it
//   picks the best variant for THIS page.
// afterPromptStep  → validates the picks against the candidate set, resolves each tag to
//   { project, purpose, import } and writes `moleculeAssignments` (+ usagePaths) to the defs.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildWorkItem } from '/_102020_/l2/dsMatch/derivePaths.js';
import { readDsRules, readConfiguredAxisKeys } from '/_102020_/l2/dsMatch/readDsRules.js';
import { buildMoleculeCatalog } from '/_102020_/l2/dsMatch/buildMoleculeCatalog.js';
import { loadPageSource, loadPageDefinitionText } from '/_102020_/l2/dsMatch/agent1.js';
import { loadGroupSelections, computeOrganismCandidates, buildVariantHumanPrompt, validateVariantPicks } from '/_102020_/l2/dsMatch/agent2.js';
import { resolveTagToFile } from '/_102020_/l2/utils.js';
import { parseStepArgs, mkCompleted, mkFail, saveFile } from '/_102020_/l2/agentImplementsDesignSystem2/planning.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentSelectVariant2',
    agentProject: 102020,
    agentFolder: 'agentImplementsDesignSystem2',
    agentDescription: 'Pick the best molecule variant per organism from the DS-compatible candidates (Agent2)',
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

  const selections = await loadGroupSelections(item.defsDestino);
  const dsRules = await readDsRules(project, a.ds);
  const configuredAxes = await readConfiguredAxisKeys(project, a.ds);
  const catalog = await buildMoleculeCatalog();
  const candidates = computeOrganismCandidates(selections, dsRules, configuredAxes, catalog);

  const pageSource = await loadPageSource(item.tsOrigem);
  const definitionText = await loadPageDefinitionText(item.tsOrigem);
  const humanPrompt = buildVariantHumanPrompt(item.tsOrigem, pageSource, definitionText, candidates);

  const continueParallel: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args: args ?? step.prompt,
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

    // Recompute the candidate set to validate the LLM picks against it.
    const selections = await loadGroupSelections(item.defsDestino);
    const dsRules = await readDsRules(project, a.ds);
    const configuredAxes = await readConfiguredAxisKeys(project, a.ds);
    const catalog = await buildMoleculeCatalog();
    const candidates = computeOrganismCandidates(selections, dsRules, configuredAxes, catalog);

    const validated = validateVariantPicks(payload.result, candidates, item.defsDestino);

    // Resolve each chosen tag to a full molecule assignment entry.
    const byTag = new Map(catalog.map(m => [m.tag, m]));
    const usagePaths = new Set<string>();
    const organisms = validated.perOrganism.map(o => ({
      organismName: o.organismName,
      molecules: o.molecules.map(p => {
        const entry = byTag.get(p.tag);
        const f = resolveTagToFile(p.tag);
        if (entry?.usagePath) usagePaths.add(entry.usagePath);
        return {
          project: entry?.project ?? 0,
          group: p.group,
          tag: p.tag,
          purpose: entry?.objective ?? '',
          import: f ? `/_${f.project}_/l2/${f.folder}/${f.shortName}.js` : '',
        };
      }),
    }));

    if (!context.isTest) await saveFile(item.defsDestino, buildAssignmentsDefs(item.defsDestino, organisms, [...usagePaths].sort()));

    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentSelectVariant2] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

/** The "new defs": resolved molecule assignments (LLM-picked) for agentGenDefs2 to weave. */
function buildAssignmentsDefs(defsRef: string, organisms: unknown, usagePaths: string[]): string {
  const cleanRef = defsRef.startsWith('/') ? defsRef.slice(1) : defsRef;
  return [
    `/// <mls fileReference="${cleanRef}" enhancement="_blank"/>`,
    '',
    '// Generated by agentSelectVariant2 (Agent2). Variant chosen by the LLM from the',
    '// DS-compatible candidates, using the page context. Consumed by agentGenDefs2.',
    '',
    `export const moleculeAssignments = ${JSON.stringify(organisms, null, 2)} as const;`,
    '',
    `export const usagePaths = ${JSON.stringify(usagePaths, null, 2)} as const;`,
    '',
  ].join('\n');
}

const system1 = `
<!-- modelType: codeinstruct -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

## Task
You are given the rendered page and, per organism, the GROUPS it needs with the CANDIDATE
molecules for each group (each candidate has a tag and a description). For each
(organism, group), pick the ONE candidate whose description best matches the ACTUAL UI
element in the rendered page (e.g. a data grid → the grid candidate, a table → the table
candidate).

## Rules
- Choose the \`tag\` EXACTLY as listed in the candidates for that organism+group. Never invent a tag.
- One molecule per group per organism. If NO candidate fits the real UI element, omit that group.
- Base the choice on the rendered page's actual element, not on generic preference.

## Output format

[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    path: string;
    perOrganism: Array<{
      organismName: string;
      molecules: Array<{ group: string; tag: string }>;
    }>;
  };
};
//#endregion
