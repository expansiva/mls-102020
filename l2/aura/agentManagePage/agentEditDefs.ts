/// <mls fileReference="_102020_/l2/aura/agentManagePage/agentEditDefs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Child of agentManagePage. Applies the gated VISUAL edit operations to a page's .defs.ts.
//
// BOTH paths call the LLM (Opção C — consolidação):
//   - structural: the LLM returns the edited `definition` (validated: identity + schema preserved)
//     AND the CONSOLIDATED pageAdjustments list;
//   - cosmetic-only: not representable in `definition`, so the LLM returns ONLY the consolidated
//     pageAdjustments list (no definition edit).
// We then reconcile the consolidated list DETERMINISTICALLY (reconcileAdjustments — stable ids +
// audit `at`), replace the whole pageAdjustments block, restamp pageVersion (genome pages), and save.
//
// The consolidated list (existing + new request, contradictions superseded — newer wins) replaces
// the old append-only log, so a future regeneration (DS/layout change or genome "refazer página")
// can REPLAY a coherent, non-contradictory set instead of an ever-growing contradictory history.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { pageRef } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { readRawSource, mkCompleted, mkFail, saveFile } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseExportValue, replaceExportConst, parsePageAdjustments, upsertPageAdjustments,
  nextAdjustmentId, type PageAdjustment,
} from '/_102020_/l2/aura/helpers/dsMatch/pageAdjustments.js';
import { buildPageDsStamp, renderDsVersionExport } from '/_102020_/l2/aura/helpers/dsMatch/dsVersion.js';
import {
  validateEditedDefinition, reconcileAdjustments, normalizeConsolidatedAdjustments,
  type EditStepArgs, type EditOperation,
} from '/_102020_/l2/aura/agentManagePage/editCore.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentEditDefs',
    agentProject: 102020,
    agentFolder: 'aura/agentManagePage',
    agentDescription: 'Apply gated visual edit operations to a page defs (structural via LLM, cosmetic deterministic)',
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

function opsSummary(ops: EditOperation[]): string {
  return ops.map(o => `- (${o.kind}${o.target ? ` @${o.target}` : ''}) ${o.description}`).join('\n');
}

/** Deterministic fallback when the LLM returns no usable consolidated list: append a single new
 *  adjustment for the current request onto the existing ones (old behavior) so the edit is never
 *  lost. Rare — guards against a misbehaving model, not the happy path. */
function fallbackAppend(a: EditStepArgs, existing: PageAdjustment[], notes: string): PageAdjustment[] {
  const kind = a.operations.some(o => o.kind === 'structural') ? 'structural' : 'cosmetic';
  return [...existing, {
    id: nextAdjustmentId(existing),
    at: new Date().toISOString(),
    request: a.request,
    kind,
    notes: notes || undefined,
    imageUrl: a.imageUrl || undefined,
  }];
}

/**
 * Write the edit into the defs source: optionally splice a new `definition`, replace the whole
 * `pageAdjustments` block with the CONSOLIDATED list, and restamp `pageVersion` when present.
 * Skipped in test.
 */
async function applyEdit(a: EditStepArgs, editedDefinition: Record<string, unknown> | null, adjustments: PageAdjustment[], isTest: boolean): Promise<string> {
  const defsRef = defsRefOf(a);
  let src = await readRawSource(defsRef);
  if (!src) throw new Error(`defs not found: ${defsRef}`);

  if (editedDefinition) {
    const replaced = replaceExportConst(src, 'definition', `export const definition = ${JSON.stringify(editedDefinition, null, 2)};`);
    if (replaced == null) throw new Error('could not splice the definition export');
    src = replaced;
  }

  src = upsertPageAdjustments(src, adjustments);

  // Restamp pageVersion honestly (genome pages only; mode pages have none → no-op).
  if (/export\s+const\s+pageVersion\s*=/.test(src)) {
    const project = mls.actualProject || 0;
    const stamp = await buildPageDsStamp(project, a.module, a.layout, a.ds, a.page, new Date().toISOString(), src);
    const restamped = replaceExportConst(src, 'pageVersion', renderDsVersionExport(stamp));
    if (restamped != null) src = restamped;
  }

  if (!isTest) {
    await saveFile(defsRef, src);
    console.info(`[agentEditDefs] ✓ ${a.page}: defs atualizado (${adjustments.length} ajuste(s) consolidado(s)${editedDefinition ? ', definition editado' : ', só ajustes'}) em ${defsRef}`);
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
    const hasStructural = a.operations.some(o => o.kind === 'structural');
    console.info(`[agentEditDefs] ▶ ${a.page}: ${a.operations.length} op(s), structural=${hasStructural}`);

    const defsRef = defsRefOf(a);
    const src = await readRawSource(defsRef);
    if (!src) throw new Error(`defs not found: ${defsRef}`);
    // Both paths consolidate against the page's existing adjustments.
    const existingAdjustments = parsePageAdjustments(src);

    // Cosmetic-only → LLM consolidates the adjustments list (no definition edit).
    // Structural → LLM edits the `definition` AND returns the consolidated list.
    const definition = hasStructural ? parseExportValue(src, 'definition') : undefined;
    if (hasStructural && !definition) throw new Error(`could not read definition from ${defsRef}`);

    const human = JSON.stringify({
      request: a.request,
      imageUrl: a.imageUrl || undefined,
      operations: a.operations,
      existingAdjustments,
      ...(hasStructural ? { currentDefinition: definition } : {}),
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
      systemPrompt: hasStructural ? editPrompt : consolidatePrompt,
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
    const hasStructural = a.operations.some(o => o.kind === 'structural');
    const payload = step.interaction?.payload?.[0] as any;
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid payload: ${JSON.stringify(payload)}`);

    const defsRef = defsRefOf(a);
    const src = await readRawSource(defsRef);
    const existing = parsePageAdjustments(src);

    // Structural: validate the edited definition (identity + schema) before writing.
    let editedDefinition: Record<string, unknown> | null = null;
    if (hasStructural) {
      const original = parseExportValue(src, 'definition');
      const guard = validateEditedDefinition(original, payload.result.definition);
      if (!guard.ok) return [mkFail(context, parentStep, step, hookSequential, `edit rejected: ${guard.reason}`)];
      editedDefinition = guard.value;
    }

    // Reconcile the consolidated adjustments (stable ids + audit `at`). If the model returned
    // nothing usable, fall back to a deterministic append so the current edit is never lost.
    const notes = typeof payload.result.notes === 'string' ? payload.result.notes : opsSummary(a.operations);
    const consolidated = normalizeConsolidatedAdjustments(payload.result.adjustments);
    const adjustments = consolidated.length
      ? reconcileAdjustments(existing, consolidated, new Date().toISOString())
      : fallbackAppend(a, existing, notes);
    if (!consolidated.length) console.warn(`[agentEditDefs] ${a.page}: LLM returned no consolidated adjustments → deterministic append fallback`);

    await applyEdit(a, editedDefinition, adjustments, !!context.isTest);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentEditDefs] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

// Shared consolidation rules (both prompts). The LLM owns the semantic supersession; the code
// reattaches ids/timestamps deterministically (surviving ids are kept, unknown ids are minted).
const CONSOLIDATION_RULES = `
The \`adjustments\` you return is the page's CONSOLIDATED list of visual adjustments — the single
source of truth a future regeneration replays. Build it like this:
- START from \`existingAdjustments\` and INCORPORATE the new \`request\`.
- SUPERSEDE (drop) any prior adjustment that CONTRADICTS a newer one on the SAME element/aspect —
  newer wins (e.g. "align buttons right" then "align buttons left" ⇒ keep only "left").
- KEEP unrelated adjustments untouched, WITH their original \`id\`.
- A surviving/edited prior adjustment MUST reuse its existing \`id\`. A brand-new adjustment MUST
  OMIT \`id\` (the system mints it). NEVER rename or invent ids.
- The result MUST represent the new request (as a new entry, or merged into a superseding one).
- Each item: { "id"?: "<existing id, only when reused>", "request": "<verbatim/merged>", "kind":
  "structural"|"cosmetic", "notes"?: "<what/where it applies>" }.`;

const editPrompt = `
<!-- modelType: design -->

You apply pointed VISUAL edits to a page's structural definition. The human message is a JSON object
{ request, imageUrl?, operations, existingAdjustments, currentDefinition }.

- \`currentDefinition\` is the page's current \`definition\` object (the structure the render uses).
- \`operations\` are the approved structural changes to apply (hide/move/reorder/re-present an
  existing element).
- \`existingAdjustments\` is the page's current consolidated adjustments list.

Return ONLY the edited definition, a short note, and the consolidated adjustments list:
{"type":"flexible","result":{"definition":<the FULL edited definition object>,"notes":"<one line: what you changed>","adjustments":[<the consolidated list>]}}

Hard rules (definition):
- Apply ONLY the requested operations. Keep EVERYTHING else byte-for-byte structurally identical.
- NEVER change identity fields (pageId, moduleName, genome, baseClassName, routePattern).
- NEVER rename or invent element ids; only remove/hide/move/re-present elements that already exist.
- NEVER add data, states or actions that are not already in the definition.
- Preserve the definition's schema exactly (same shape the render expects).
${CONSOLIDATION_RULES}

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

const consolidatePrompt = `
<!-- modelType: reasoning -->

You consolidate a page's VISUAL adjustments log. The change is COSMETIC (a visual nuance not
representable in the page structure), so there is NO definition to edit. The human message is a JSON
object { request, imageUrl?, operations, existingAdjustments }.

- \`request\` is the new cosmetic change the user asked for.
- \`operations\` are the approved cosmetic operations for it.
- \`existingAdjustments\` is the page's current consolidated adjustments list.

Return ONLY a short note and the consolidated adjustments list:
{"type":"flexible","result":{"notes":"<one line: what you changed>","adjustments":[<the consolidated list>]}}
${CONSOLIDATION_RULES}

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
type ConsolidatedAdjustmentOut = { id?: string; request: string; kind: 'structural' | 'cosmetic'; notes?: string };
export type Output =
  | { type: 'flexible'; result: { definition: Record<string, unknown>; notes: string; adjustments: ConsolidatedAdjustmentOut[] } }
  | { type: 'flexible'; result: { notes: string; adjustments: ConsolidatedAdjustmentOut[] } };
//#endregion
