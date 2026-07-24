/// <mls fileReference="_102020_/l2/aura/agentManagePage/agentEditDefs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Child of agentManagePage. Folds the gated VISUAL edit request PERMANENTLY into the page's
// `definition` (TASK-102020-edit-1 — unified representation):
//   - structural (hide/move/reorder/re-present an existing element) → edits the definition.layout tree;
//   - cosmetic (alignment/spacing/emphasis) → a `visualStyle` (+ `styleReference` for a reference
//     image) field on the target node.
// There is NO pageAdjustments log anymore: the definition is the single source of truth, so a future
// genome regeneration inherits every edit for free via the origin clone. A legacy log found on an
// old defs is folded in on this edit and then dropped (in-place migration). The LLM's definition is
// validated (identity + schema) before writing; pageVersion is restamped.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { pageRef } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { readRawSource, mkCompleted, mkFail, saveFile } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { parseExportValue, replaceExportConst, removeExportConst, parsePageAdjustments } from '/_102020_/l2/aura/helpers/dsMatch/pageAdjustments.js';
import { buildPageDsStamp, renderDsVersionExport } from '/_102020_/l2/aura/helpers/dsMatch/dsVersion.js';
import { validateEditedDefinition, DEFINITION_EDIT_RULES, type EditStepArgs } from '/_102020_/l2/aura/agentManagePage/editCore.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentEditDefs',
    agentProject: 102020,
    agentFolder: 'aura/agentManagePage',
    agentDescription: 'Fold a gated visual edit permanently into the page definition (structural tree + cosmetic visualStyle)',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

function parseArgs(prompt: string | undefined): EditStepArgs {
  if (!prompt) throw new Error('[agentEditDefs] empty step prompt');
  const a = JSON.parse(prompt) as EditStepArgs;
  if (!a.module || !a.page || a.layout == null || a.ds == null) throw new Error(`[agentEditDefs] invalid args: ${prompt}`);
  if (!a.device) a.device = 'desktop';
  if (!Array.isArray(a.operations)) a.operations = [];
  return a;
}

function defsRefOf(a: EditStepArgs): string {
  const project = mls.actualProject || 0;
  return pageRef(project, a.module, a.layout, a.ds, a.page, '.defs.ts', a.device);
}

/**
 * Write the folded `definition` into the defs source, DROP any legacy pageAdjustments export
 * (in-place migration — its intent is now baked into the definition), and restamp `pageVersion`
 * when present. Skipped in test.
 */
async function applyEdit(a: EditStepArgs, editedDefinition: Record<string, unknown>, isTest: boolean): Promise<string> {
  const defsRef = defsRefOf(a);
  let src = await readRawSource(defsRef);
  if (!src) throw new Error(`defs not found: ${defsRef}`);

  const replaced = replaceExportConst(src, 'definition', `export const definition = ${JSON.stringify(editedDefinition, null, 2)};`);
  if (replaced == null) throw new Error('could not splice the definition export');
  src = removeExportConst(replaced, 'pageAdjustments');

  // Restamp pageVersion honestly (genome pages only; mode pages have none → no-op).
  if (/export\s+const\s+pageVersion\s*=/.test(src)) {
    const project = mls.actualProject || 0;
    const stamp = await buildPageDsStamp(project, a.module, a.layout, a.ds, a.page, new Date().toISOString(), src);
    const restamped = replaceExportConst(src, 'pageVersion', renderDsVersionExport(stamp));
    if (restamped != null) src = restamped;
  }

  if (!isTest) {
    await saveFile(defsRef, src);
    console.info(`[agentEditDefs] ✓ ${a.page}: edit dobrado na definition em ${defsRef}`);
  }
  return src;
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
    const a = parseArgs(args ?? step.prompt);
    console.info(`[agentEditDefs] ▶ ${a.page}: ${a.operations.length} op(s)`);

    const defsRef = defsRefOf(a);
    const src = await readRawSource(defsRef);
    if (!src) throw new Error(`defs not found: ${defsRef}`);
    const definition = parseExportValue(src, 'definition');
    if (!definition) throw new Error(`could not read definition from ${defsRef}`);
    // Legacy migration: an old defs may still carry a pageAdjustments log — fold it in too.
    const legacyAdjustments = parsePageAdjustments(src);

    const human = JSON.stringify({
      request: a.request,
      imageUrl: a.imageUrl || undefined,
      operations: a.operations,
      currentDefinition: definition,
      ...(legacyAdjustments.length ? { legacyAdjustments } : {}),
    });

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      humanPrompt: human,
      systemPrompt: editPrompt,
    };
    return [continueParallel];
  } catch (error) {
    const msg = `[agentEditDefs] ${error instanceof Error ? error.message : String(error)}`;
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
    const a = parseArgs(step.prompt);
    const payload = step.interaction?.payload?.[0] as any;
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid payload: ${JSON.stringify(payload)}`);

    const defsRef = defsRefOf(a);
    const original = parseExportValue(await readRawSource(defsRef), 'definition');
    const guard = validateEditedDefinition(original, payload.result.definition);
    if (!guard.ok) return [mkFail(context, parentStep, step, hookSequential, `edit rejected: ${guard.reason}`)];

    await applyEdit(a, guard.value, !!context.isTest);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentEditDefs] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

const editPrompt = `
<!-- modelType: design -->

You fold a pointed VISUAL edit permanently into a page's structural definition. The human message is
a JSON object { request, imageUrl?, operations, currentDefinition, legacyAdjustments? }.

- \`currentDefinition\` is the page's current \`definition\` object (the structure the render uses).
- \`operations\` are the approved changes to apply (hide/move/reorder/re-present an existing element,
  or a cosmetic presentation tweak).
- \`legacyAdjustments\` (optional) are previously recorded edits not yet folded — fold each of them
  into the definition too (same rules), so nothing is lost; they are then discarded.
${DEFINITION_EDIT_RULES}

Return ONLY the full edited definition plus a short note:
{"type":"flexible","result":{"definition":<the FULL edited definition object>,"notes":"<one line: what you changed>"}}

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = { type: 'flexible'; result: { definition: Record<string, unknown>; notes: string } };
//#endregion
