/// <mls fileReference="_102020_/l2/agentImplementGenome/agentImplementGenome.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Orchestrator (barrier-group model, à la agentNewSolution).
// Entry: { module, layout, ds, device?, pages? }. `pages` (optional) restricts the run to a
// subset (e.g. one page for "Refazer página"); omitted/empty → all pages of the module.
//
// beforePromptImplicit → minimal LLM confirmation (validates the request).
// afterPromptStep      → builds the planned tree of child steps with barriers:
//
//   select:<page>  agentSelectGroups   waiting_human_input   dependsOn []           (Agent1, LLM)
//   gen:<page>     agentGenDefs         waiting_dependency    dependsOn [select:<page>]  (deterministic)
//   register       agentRegisterGenome  waiting_dependency    dependsOn [gen:<page> ...all]
//
// The `register` step's barrier (dependsOn every gen step) is how we "know all pages
// finished" — native to the framework, no in-memory tracker needed.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { listWorkItems, DEFAULT_DEVICE } from '/_102020_/l2/dsMatch/derivePaths.js';
import { mkAgentStep, mkFail, makePlanId, type StepArgs } from '/_102020_/l2/agentImplementGenome/planning.js';

// `materialize` (default true) is a contract flag for the CALLER: after this flow writes the
// page defs, the caller runs agentMaterializeL2 to generate the .ts (false → skip). This
// orchestrator only produces defs; agentMaterializeL2 is a top-level, project-wide flow.
interface EntryArgs { module: string; layout: number | string; ds: number | string; device?: string; pages?: string[]; materialize?: boolean; }

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentImplementGenome',
    agentProject: 102020,
    agentFolder: 'agentImplementGenome',
    agentDescription: 'Apply a design system to a module: derive page{layout}{ds} from page11',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  const { module, layout, ds, device, pages } = JSON.parse(userPrompt) as EntryArgs;
  if (!module || layout == null || ds == null) throw new Error(`(${agent.agentName}) entry needs { module, layout, ds }`);
  const dev = device || DEFAULT_DEVICE;
  // Optional subset: keep only non-empty strings; empty → all pages.
  const targetPages = Array.isArray(pages) ? pages.filter(p => typeof p === 'string' && p) : [];
  console.info('[agentImplementGenome] ▶ request received', { module, layout, ds, device: dev, pages: targetPages.length ? targetPages : 'ALL' });

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: system1 },
        { type: 'human', content: JSON.stringify({ module, layout, ds, device: dev, pages: targetPages }) },
      ],
      taskTitle: targetPages.length
        ? `Regenerate ${targetPages.length} page(s) · DS ${ds} on ${module}`
        : `Implement DS ${ds} (layout ${layout}) on ${module}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      // longMemory is string-only → the subset is JSON-encoded and parsed back in afterPromptStep.
      longTermMemory: { module, layout: String(layout), ds: String(ds), device: dev, pages: JSON.stringify(targetPages) },
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

  if (!agent || !context || !step) throw new Error(`(${agent.agentName}) [afterPromptStep] invalid params`);

  try {
    const payload = step.interaction?.payload?.[0] as any;
    if (!payload) throw new Error('missing payload');
    if (payload.type === 'result') {
      return [mkFail(context, parentStep, step, hookSequential, String(payload.result || 'confirmation returned an error'))];
    }
    if (payload.type !== 'flexible' || payload.result?.status !== 'ok') {
      return [mkFail(context, parentStep, step, hookSequential, 'design-system request not confirmed')];
    }

    const lm = (context.task?.iaCompressed?.longMemory || {}) as Record<string, string>;
    const module = lm['module'];
    const layout = lm['layout'];
    const ds = lm['ds'];
    const device = lm['device'] || DEFAULT_DEVICE;
    if (!module || layout == null || ds == null) throw new Error('missing run params in longMemory');

    const project = mls.actualProject || 0;
    let requested: string[] = [];
    try { requested = JSON.parse(lm['pages'] || '[]'); } catch { requested = []; }
    // Callers may pass a full file ref / pageId (e.g. "_102050_/l2/.../page11/foo.ts");
    // the orchestrator matches on page shortNames, so normalize to the basename (no extension).
    const toShortName = (p: string) => (p.split('/').pop() ?? '').replace(/\.defs\.ts$/, '').replace(/\.ts$/, '');
    const requestedShort = requested.map(toShortName).filter(Boolean);

    const allPages = listWorkItems(project, module, layout, ds, device).map(i => i.page);
    // `pages` subset (validated against the page11 folder) → that subset; empty → all.
    const pages = requestedShort.length ? allPages.filter(p => requestedShort.includes(p)) : allPages;
    console.info(`[agentImplementGenome] confirmed. project=${project} module=${module} layout=${layout} ds=${ds} device=${device}`);
    console.info(`[agentImplementGenome] ${pages.length}/${allPages.length} page(s) to process:`, pages, requestedShort.length ? `(requested: ${requestedShort.join(', ')})` : '(all)');
    if (pages.length === 0) {
      throw new Error(requestedShort.length
        ? `none of the requested pages [${requestedShort.join(', ')}] exist in ${module}/web/${device}/page11 (available: ${allPages.join(', ') || 'none'})`
        : `no pages found in ${module}/web/${device}/page11`);
    }

    const baseArgs = (page?: string): StepArgs => ({ module, layout, ds, device, page });
    const genIds = pages.map(p => makePlanId('gen', p));

    const intents: mls.msg.AgentIntentAddStep[] = [];

    // Group A — Agent1 (LLM): pick the molecule GROUP per layout element (writes groupSelections).
    for (const page of pages) {
      intents.push(mkAgentStep(context, step, makePlanId('select', page), `Select groups: ${page}`,
        'agentSelectGroups', baseArgs(page), [], 'waiting_human_input', 'parallel_static'));
    }

    // Group B — assemble the final defs DETERMINISTICALLY: resolve the variant (matchVariant)
    // and place a molecule per element. Each waits on its own select.
    for (const page of pages) {
      intents.push(mkAgentStep(context, step, makePlanId('gen', page), `Gen defs: ${page}`,
        'agentGenDefs', baseArgs(page), [makePlanId('select', page)], 'waiting_dependency', 'parallel_static'));
    }

    // Terminal — register the variation in module.ts ONCE, after EVERY gen completes.
    intents.push(mkAgentStep(context, step, 'register', 'Register module genome',
      'agentRegisterGenome', baseArgs(), genIds, 'waiting_dependency', 'sequential'));

    console.info(`[agentImplementGenome] ✓ planned ${pages.length} select(Agent1) + ${pages.length} gen(deterministic) + 1 register steps`);
    return intents;
  } catch (error) {
    const msg = `[${agent.agentName}] ${error instanceof Error ? error.message : String(error)}`;
    console.error('[agentImplementGenome] ✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

const system1 = `
<!-- modelType: codeinstruct -->

You validate a design-system derivation request. The human message is a JSON object
{ module, layout, ds, device, pages } (pages is an optional subset; empty = all pages).
If it is a well-formed request to apply a design system to a module, return ONLY:
{"type":"flexible","result":{"status":"ok"}}

If it is clearly invalid, return ONLY:
{"type":"result","result":"a short reason in the user's language"}

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output =
  | { type: 'flexible'; result: { status: 'ok' } }
  | { type: 'result'; result: string };
//#endregion
