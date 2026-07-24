/// <mls fileReference="_102020_/l2/aura/agentManagePage/agentManagePage.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Orchestrator + GATE for pointed VISUAL page edits (TASK-102020-agent-manage-page).
//
// Entry: { module, page, layout, ds, device?, request, imageUrl? } (JSON, from the Studio UI).
//
// beforePromptImplicit → the GATE (root LLM): receives the request + the page's current defs and
//   its shared surface (states/actions/i18n/contracts) and decides whether the request is a purely
//   VISUAL change realizable with the EXISTING surface. It returns either a rejection (out of scope
//   → needs backend / new data / new state / another screen) or a typed list of edit operations.
// afterPromptStep → rejection ⇒ mkFail (flow ends, defs untouched). Approval ⇒ create ONE child
//   step (agentEditDefs) carrying the operations; that step applies them to the defs.
//
// The re-materialization (.defs.ts → .ts) is triggered by the CALLER afterwards (agentMaterializeL2,
// exactly like selectPage._onRegenerate), which picks up the now-stale defs + the pageAdjustments.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { pageRef, DEFAULT_DEVICE } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { mkAgentStep, mkFail, makePlanId, readRawSource } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { normalizeOperations, type EditStepArgs } from '/_102020_/l2/aura/agentManagePage/editCore.js';

interface EntryArgs {
  module: string;
  page: string;
  layout: number | string;
  ds: number | string;
  device?: string;
  request: string;
  imageUrl?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentManagePage',
    agentProject: 102020,
    agentFolder: 'aura/agentManagePage',
    agentDescription: 'Edit a generated page from a pointed VISUAL request: gate the scope, then edit the defs',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

/** shared runtime base of a page: <module>/web/shared/<page>.ts (states/actions/i18n surface). */
function sharedRef(project: number, module: string, page: string): string {
  return `_${project}_/l2/${module}/web/shared/${page}.ts`;
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  const entry = JSON.parse(userPrompt) as EntryArgs;
  const { module, page, layout, ds, request } = entry;
  if (!module || !page || layout == null || ds == null || !request?.trim()) {
    throw new Error(`(${agent.agentName}) entry needs { module, page, layout, ds, request }`);
  }
  const device = entry.device || DEFAULT_DEVICE;
  const imageUrl = typeof entry.imageUrl === 'string' ? entry.imageUrl : '';
  const project = mls.actualProject || 0;

  const defsRef = pageRef(project, module, layout, ds, page, '.defs.ts', device);
  const defsSource = await readRawSource(defsRef);
  const sharedSource = await readRawSource(sharedRef(project, module, page));
  if (!defsSource) throw new Error(`(${agent.agentName}) page defs not found: ${defsRef}`);
  console.info(`[agentManagePage] ▶ gate request "${request}" on ${module}/${page} (${defsRef})${imageUrl ? ' [+image]' : ''}`);

  const human = JSON.stringify({
    request,
    imageUrl: imageUrl || undefined,
    page,
    module,
    defsSource,
    sharedSource: sharedSource || '(shared runtime not found)',
  });

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: gatePrompt },
        { type: 'human', content: human },
      ],
      taskTitle: `Edit ${page}: ${request.slice(0, 60)}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        module, page, layout: String(layout), ds: String(ds), device, request,
        imageUrl,
      },
    },
  };
  return [addMessageAI];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const payload = step.interaction?.payload?.[0] as any;
    if (!payload) throw new Error('missing gate payload');

    // Rejection — out of scope. Surface the reason; the defs is never touched.
    if (payload.type === 'result') {
      return [mkFail(context, parentStep, step, hookSequential, String(payload.result || 'edit request rejected by the scope gate'))];
    }
    if (payload.type !== 'flexible' || !payload.result) {
      return [mkFail(context, parentStep, step, hookSequential, 'gate returned an unexpected payload')];
    }

    const operations = normalizeOperations(payload.result.operations);
    if (!operations.length) {
      return [mkFail(context, parentStep, step, hookSequential, 'no actionable visual operations were produced from the request')];
    }

    const lm = (context.task?.iaCompressed?.longMemory || {}) as Record<string, string>;
    const module = lm['module'];
    const page = lm['page'];
    const layout = lm['layout'];
    const ds = lm['ds'];
    const device = lm['device'] || DEFAULT_DEVICE;
    const request = lm['request'] || '';
    const imageUrl = lm['imageUrl'] || '';
    if (!module || !page || layout == null || ds == null) throw new Error('missing run params in longMemory');

    const editArgs: EditStepArgs = { module, page, layout, ds, device, request, imageUrl: imageUrl || undefined, operations };
    console.info(`[agentManagePage] ✓ gate approved — ${operations.length} operation(s): ${operations.map(o => o.kind).join(', ')}`);

    // Two steps: edit the defs (LLM/deterministic), then render the page .ts from the edited defs
    // (delta-aware). Render waits on the edit — if the edit fails, render is blocked (onFailure:'fail').
    const editPlan = makePlanId('edit-defs', page);
    // The render receives the CURRENT edit too, so its delta preserves the rest of the code and
    // applies only this change (the change is already folded into the definition by agentEditDefs).
    const renderArgs = { module, page, layout, ds, device, request, operations, imageUrl: imageUrl || undefined };
    return [
      mkAgentStep(context, step, editPlan, `Edit defs: ${page}`,
        'agentEditDefs', editArgs as any, [], 'waiting_human_input', 'sequential'),
      mkAgentStep(context, step, makePlanId('render', page), `Render: ${page}`,
        'agentRenderEdit', renderArgs as any, [editPlan], 'waiting_dependency', 'sequential'),
    ];
  } catch (error) {
    const msg = `[${agent.agentName}] ${error instanceof Error ? error.message : String(error)}`;
    console.error('[agentManagePage] ✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

const gatePrompt = `
<!-- modelType: reasoning -->

You are the SCOPE GATE for pointed VISUAL edits to an already-generated page. The human message is
a JSON object { request, imageUrl?, page, module, defsSource, sharedSource }.

- \`request\` is what the user wants changed.
- \`defsSource\` is the page's current .defs.ts (its \`definition\` is the structure the render uses).
- \`sharedSource\` is the page's runtime base (web/shared/<page>.ts): the ONLY states, actions,
  message keys (i18n) and data contracts the page has.

Decide if the request is a purely VISUAL/layout change realizable with the EXISTING surface
(the states/actions/fields/contracts already present). Examples in scope: hide/move/reorder a field
or section, change a control's presentation, emphasize an action, align/justify/reposition elements,
tweak spacing/grouping/sizing, relabel using an EXISTING message key.

The scope test is ONLY about DATA/BEHAVIOR, never about the presentation itself. REJECT (out of
scope) ONLY when the request would require ANY of:
- a new data source, query or command (not present in the contracts / dataNeeds);
- a new state or action, or a change to how data behaves;
- a backend change or a business-rule change;
- something that is not about THIS page (another screen, new navigation, a new module).

CRITICAL — a pure presentation change is ALWAYS in scope, even if the \`definition\` has no dedicated
attribute for it. The ABSENCE of a structural attribute is NOT a reason to reject — it is exactly
what \`cosmetic\` is for (the render applies it via CSS). Alignment, justification, spacing, sizing,
emphasis and ordering of EXISTING elements NEVER require a new state/action/contract, so they are
never out of scope. Do NOT invent a hypothetical config field (e.g. "actionAlign") and then reject
for its absence — just emit a cosmetic operation.

The page's applied \`pageAdjustments\` are visible in \`defsSource\`. Reversing or changing a prior
adjustment (e.g. previously "align right", now "align left") is a normal in-scope edit — emit the
operation directly; NEVER ask the user to confirm.

If out of scope, return ONLY:
{"type":"result","result":"a short, specific reason in the user's language explaining what is not possible and why"}

If in scope, return ONLY a list of typed visual operations:
{"type":"flexible","result":{"operations":[{"kind":"structural"|"cosmetic","target":"<element id or region, '' if n/a>","description":"<precise change>"}]}}

- \`structural\` = representable in \`definition\` (hide/move/reorder/re-present an existing element).
- \`cosmetic\` = a visual nuance NOT representable in the structure (alignment, shadow, emphasis,
  spacing/sizing feel). When in doubt between the two, prefer \`cosmetic\` over rejecting.
- Never invent data/states/actions. One request may yield multiple operations.

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output =
  | { type: 'flexible'; result: { operations: Array<{ kind: 'structural' | 'cosmetic'; target: string; description: string }> } }
  | { type: 'result'; result: string };
//#endregion
