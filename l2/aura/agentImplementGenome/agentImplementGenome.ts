/// <mls fileReference="_102020_/l2/aura/agentImplementGenome/agentImplementGenome.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Orchestrator (barrier-group model, à la agentNewSolution).
// Entry: { module, layout, ds, device?, pages? }. `pages` (optional) restricts the run to a
// subset (e.g. one page for "Refazer página"); omitted/empty → all pages of the module.
//
// beforePromptImplicit → minimal LLM confirmation (validates the request).
// afterPromptStep      → builds the planned tree of child steps with barriers:
//
//   select:<page>    agentSelectGroups    waiting_human_input   dependsOn []                 (Agent1, LLM: grupo/elemento)
//   variant:<page>   agentSelectVariant   waiting_dependency    dependsOn [select:<page>]    (Agent2, LLM: variante semântica/elemento, ou none)
//   gen:<page>       agentGenDefs         waiting_dependency    dependsOn [variant:<page>]   (determinístico: coloca a molécula)
//   reconcile-tokens agentReconcileTokens waiting_dependency    dependsOn [gen:<page> ...all] (LLM, 1x/DS)
//   register         agentRegisterGenome  waiting_dependency    dependsOn [reconcile-tokens]
//
// The `register` step's barrier (dependsOn every gen step) is how we "know all pages
// finished" — native to the framework, no in-memory tracker needed.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { listWorkItems, DEFAULT_DEVICE } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { mkAgentStep, mkFail, makePlanId, type StepArgs } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';

// `materialize` (default true) is a contract flag for the CALLER: after this flow writes the
// page defs, the caller runs agentMaterializeL2 to generate the .ts (false → skip). This
// orchestrator only produces defs; agentMaterializeL2 is a top-level, project-wide flow.
// The `useMolecules` mode (default true) is NOT a UI input — it is a property of the layout,
// read from config.layouts[layout].useMolecules in afterPromptStep. When false the molecule
// catalog is empty — Agent2 (variant) is skipped and agentGenDefs applies only the configured
// layout rules (no web components).
interface EntryArgs { module: string; layout: number | string; ds: number | string; device?: string; pages?: string[]; materialize?: boolean; forceReconcile?: boolean; }

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentImplementGenome',
    agentProject: 102020,
    agentFolder: 'aura/agentImplementGenome',
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

  const { module, layout, ds, device, pages, forceReconcile } = JSON.parse(userPrompt) as EntryArgs;
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
      longTermMemory: { module, layout: String(layout), ds: String(ds), device: dev, pages: JSON.stringify(targetPages), forceReconcile: String(!!forceReconcile) },
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
    const forceReconcile = lm['forceReconcile'] === 'true';
    if (!module || layout == null || ds == null) throw new Error('missing run params in longMemory');

    const project = mls.actualProject || 0;
    // useMolecules is a property of the LAYOUT (config.layouts[layout].useMolecules), not a UI
    // input. Default true (absent key = molecules on); false → skip Agent2, gen applies only
    // the layout rules.
    const config: any = await getConfigProject(project);
    const useMolecules = config?.layouts?.[String(layout)]?.useMolecules !== false;
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

    const baseArgs = (page?: string): StepArgs => ({ module, layout, ds, device, page, useMolecules });
    const genIds = pages.map(p => makePlanId('gen', p));

    const intents: mls.msg.AgentIntentAddStep[] = [];

    // Group A — Agent1 (LLM): pick the molecule GROUP per layout element (writes groupSelections).
    // Runs in BOTH modes: the group drives the layout rules (group-scoped axes), even when no
    // molecule is placed.
    for (const page of pages) {
      intents.push(mkAgentStep(context, step, makePlanId('select', page), `Select groups: ${page}`,
        'agentSelectGroups', baseArgs(page), [], 'waiting_human_input', 'parallel_static'));
    }

    // Group B — Agent2 (LLM): pick the VARIANT per element by semantic fit among the
    // style-compatible candidates, or reject (writes variantSelections). Waits on its own select.
    // SKIPPED when useMolecules=false (empty molecule catalog → nothing to pick); gen then waits
    // on the `select` step instead.
    if (useMolecules) {
      for (const page of pages) {
        intents.push(mkAgentStep(context, step, makePlanId('variant', page), `Pick variant: ${page}`,
          'agentSelectVariant', baseArgs(page), [makePlanId('select', page)], 'waiting_dependency', 'parallel_static'));
      }
    }

    // Group C — assemble the final defs DETERMINISTICALLY. With molecules: place the chosen molecule
    // per element (waits on variant). Without: apply only layoutRules from Agent1's groups (waits on select).
    const genDep = (page: string) => useMolecules ? makePlanId('variant', page) : makePlanId('select', page);
    for (const page of pages) {
      intents.push(mkAgentStep(context, step, makePlanId('gen', page), `Gen defs: ${page}`,
        'agentGenDefs', baseArgs(page), [genDep(page)], 'waiting_dependency', 'parallel_static'));
    }

    // Reconcile molecule tokens (--ml-*) to the DS tokens (--ds-*) — ONCE per DS, barrier over
    // every gen (so all pages' molecule assignments are known). Feeds buildGlobalCss in register.
    const reconcileArgs: StepArgs = { module, layout, ds, device, pages, forceReconcile, useMolecules };
    intents.push(mkAgentStep(context, step, 'reconcile-tokens', 'Reconciliar tokens (molécula→DS)',
      'agentReconcileTokens', reconcileArgs, genIds, 'waiting_dependency', 'sequential'));

    // Terminal — register the variation ONCE, after reconciliation (so global.css carries --ml-*).
    intents.push(mkAgentStep(context, step, 'register', 'Register module genome',
      'agentRegisterGenome', baseArgs(), ['reconcile-tokens'], 'waiting_dependency', 'sequential'));

    console.info(`[agentImplementGenome] ✓ planned ${pages.length} select(Agent1) + ${useMolecules ? pages.length : 0} variant(Agent2) + ${pages.length} gen(deterministic) + 1 reconcile-tokens + 1 register steps (useMolecules=${useMolecules})`);
    return intents;
  } catch (error) {
    const msg = `[${agent.agentName}] ${error instanceof Error ? error.message : String(error)}`;
    console.error('[agentImplementGenome] ✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

const system1 = `
<!-- modelType: classifier -->

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
