/// <mls fileReference="_102020_/l2/aura/agentImplementGenome/agentFoldAdjustments.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Fase E.5 — fold the page's recorded `pageAdjustments` INTO the `definition`, then DROP the log,
// so the generated .defs.ts is self-contained (everything lives in `definition`, no pageAdjustments
// export). Future variations then inherit the edits for free through the origin clone (page22 is
// built from page21, whose definition already carries them) — no log needs to persist.
//
// Runs per page, AFTER agentGenDefs (which re-emits the prior log into the fresh defs). No-op when a
// page has no adjustments: the step completes WITHOUT an LLM call (the common case stays cheap).
//
//   - structural adjustments (hide/move/reorder/re-present an existing element) → edit the
//     definition.layout tree directly;
//   - cosmetic adjustments (alignment/spacing/emphasis with no structural attribute) → attach a
//     concise `visualStyle` hint on the target node. It is NOT stored as `layoutRules` on purpose:
//     agentGenDefs' hygiene step wipes molecule/layoutRules from the origin clone, so a layoutRule
//     would not survive to the next variation — `visualStyle` does (hygiene never touches it).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { pageRef } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { parseStepArgs, mkCompleted, mkFail, saveFile, readRawSource, type StepArgs } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseExportValue, replaceExportConst, parsePageAdjustments, removeExportConst,
} from '/_102020_/l2/aura/helpers/dsMatch/pageAdjustments.js';
import { buildPageDsStamp, renderDsVersionExport } from '/_102020_/l2/aura/helpers/dsMatch/dsVersion.js';
import { validateEditedDefinition } from '/_102020_/l2/aura/agentManagePage/editCore.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentFoldAdjustments',
    agentProject: 102020,
    agentFolder: 'aura/agentImplementGenome',
    agentDescription: 'Fold recorded pageAdjustments into the definition and drop the log (self-contained defs)',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

function defsRefOf(a: StepArgs): string {
  const project = mls.actualProject || 0;
  return pageRef(project, a.module, a.layout, a.ds, a.page!, '.defs.ts', a.device);
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const a = parseStepArgs(args ?? step.prompt);
    if (!a.page) throw new Error('fold needs a page');
    const defsRef = defsRefOf(a);
    const src = await readRawSource(defsRef);
    if (!src) throw new Error(`defs not found: ${defsRef}`);

    const adjustments = parsePageAdjustments(src);
    // No recorded edits → nothing to fold; the defs is already self-contained. No LLM.
    if (!adjustments.length) {
      console.info(`[agentFoldAdjustments] ▷ ${a.page}: sem ajustes — nada a dobrar`);
      return [mkCompleted(context, parentStep, step, hookSequential)];
    }

    const definition = parseExportValue(src, 'definition');
    if (!definition) throw new Error(`could not read definition from ${defsRef}`);
    console.info(`[agentFoldAdjustments] ▶ ${a.page}: dobrando ${adjustments.length} ajuste(s) na definition`);

    const human = JSON.stringify({ definition, adjustments });
    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      humanPrompt: human,
      systemPrompt: foldPrompt,
    };
    return [continueParallel];
  } catch (error) {
    const msg = `[agentFoldAdjustments] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const a = parseStepArgs(step.prompt);
    const payload = step.interaction?.payload?.[0] as any;
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid payload: ${JSON.stringify(payload)}`);

    const defsRef = defsRefOf(a);
    let src = await readRawSource(defsRef);
    if (!src) throw new Error(`defs not found: ${defsRef}`);

    // Guard the folded definition: identity fields intact + genome layout still parseable.
    const original = parseExportValue(src, 'definition');
    const guard = validateEditedDefinition(original, payload.result.definition);
    if (!guard.ok) return [mkFail(context, parentStep, step, hookSequential, `fold rejected: ${guard.reason}`)];

    // Splice the folded definition and DROP the now-redundant pageAdjustments log.
    const replaced = replaceExportConst(src, 'definition', `export const definition = ${JSON.stringify(guard.value, null, 2)};`);
    if (replaced == null) throw new Error('could not splice the definition export');
    src = removeExportConst(replaced, 'pageAdjustments');

    // Restamp pageVersion honestly (definition changed; genome pages only — mode pages have none).
    if (/export\s+const\s+pageVersion\s*=/.test(src)) {
      const project = mls.actualProject || 0;
      const stamp = await buildPageDsStamp(project, a.module, a.layout, a.ds, a.page!, new Date().toISOString(), src);
      const restamped = replaceExportConst(src, 'pageVersion', renderDsVersionExport(stamp));
      if (restamped != null) src = restamped;
    }

    if (!context.isTest) {
      await saveFile(defsRef, src);
      console.info(`[agentFoldAdjustments] ✓ ${a.page}: ajustes dobrados na definition; log removido (${defsRef})`);
    }
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentFoldAdjustments] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

const foldPrompt = `
<!-- modelType: design -->

You PERMANENTLY fold a page's recorded visual adjustments into its structural definition. The human
message is a JSON object { definition, adjustments }.

- \`definition\` is the page's current \`definition\` object (the structure the render uses).
- \`adjustments\` is the consolidated list of visual edits the user asked for: each is
  { id, request, kind, notes? }. This list is going away — its intent must live entirely in the
  definition you return, so the page renders exactly as the user asked WITHOUT any external log.

Apply EVERY adjustment to the definition:
- \`structural\` (hide/move/reorder/re-present an EXISTING element) → edit the \`definition.layout\`
  tree directly (remove/reorder/relocate the node).
- \`cosmetic\` (alignment, spacing, emphasis, sizing feel — no structural attribute exists) → attach
  a concise \`visualStyle\` field to the MOST SPECIFIC node it applies to (a field/filter/action, an
  intention, or a section). \`visualStyle\` is a short imperative string (or string[]) the render
  reads from the definition, e.g. \`"visualStyle": "align the action buttons to the left"\`. Do NOT
  use \`layoutRules\` for this — that bucket is regenerated from the design-system config and would be
  discarded.

Reference image: if an adjustment carries an \`imageUrl\` (a reference image the user provided), keep
it in the definition next to where you fold that adjustment — add a \`styleReference\` field (the URL)
on the SAME node that received the structural change or the \`visualStyle\`. This lets the renderer
consult the image and match it precisely. Preserve any \`styleReference\` already present unless a
newer adjustment supersedes it.

Supersede contradictions: if the definition ALREADY carries a representation of a prior adjustment
(e.g. a \`visualStyle\` or \`styleReference\`) that a newer adjustment contradicts, UPDATE/replace it —
newer wins. Never stack contradictory hints.

Hard rules:
- NEVER change identity fields (pageId, moduleName, genome, baseClassName, routePattern).
- NEVER rename or invent element ids; only touch elements that already exist.
- NEVER add data, states or actions that are not already in the definition.
- Preserve the definition's schema exactly (same shape the render expects) apart from the folds above.

Return ONLY the full folded definition:
{"type":"flexible","result":{"definition":<the FULL definition object with every adjustment folded in>}}

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = { type: 'flexible'; result: { definition: Record<string, unknown> } };
//#endregion
